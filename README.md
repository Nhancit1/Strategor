# 🎯 Strategor — MERN + Python

Strategy-generation app where **12 Claude agents** collaborate to produce a full business strategy (PESTEL, SWOT, Porter, value chain, BCG, diagnostic, roadmap, KPIs, change management, final deliverables) with **DOCX / PDF / PPTX / XLSX** export.

This is the **MERN + Python** port of the original Java/Spring + React app. Same product, same UX, same agent prompts — re-platformed so your MERN and Python teams can own it.

---

## 🔁 What changed vs. the original

| Concern | Original | This port |
|---|---|---|
| Web/API/auth | Spring Boot (Java) | **Node + Express** |
| Database | PostgreSQL + JPA | **MongoDB + Mongoose** |
| Real-time | Spring WebSocket (STOMP) | **Socket.IO** |
| AI agents + exports + parsing | Java (POI, Chromium) | **Python** (FastAPI, anthropic SDK, python-docx/pptx, openpyxl, WeasyPrint, pdfplumber) |
| Frontend | React 18 + Vite | **unchanged** (only the socket hook swapped STOMP→Socket.IO) |

The **agent prompts and JSON schemas are byte-for-byte the same** — extracted verbatim from the original agent definitions.

---

## 🏗️ Architecture

```
                      ┌─────────────┐
  Browser ── HTTP ───▶│    nginx    │
            WS  ──────│ (reverse    │
                      │   proxy)    │
                      └──┬───────┬──┘
              /api,/socket.io    │  /
                         ▼       ▼
                  ┌────────────┐   ┌──────────┐
                  │ Node /     │   │ Frontend │
                  │ Express    │   │  (SPA)   │
                  └──┬──────┬──┘   └──────────┘
              Mongoose│      │ HTTP (internal token)
                      ▼      ▼
                ┌─────────┐  ┌──────────────────┐
                │ MongoDB │  │ Python / FastAPI │
                └─────────┘  │  • 12 AI agents  │
                             │  • exports       │
                             │  • doc parsing   │
                             └──────────────────┘
```

**Separation of concerns**
- **Node owns the database and the web layer** (auth, projects, onboarding, finance, documents, REST, Socket.IO).
- **Python is stateless compute** (AI agents, file generation, document text extraction). It never touches Mongo.

**The contract (Node ⇄ Python)**
1. `POST /api/projects/:id/analyze` → Node gathers profile + finance + parsed-document context, then `POST {AI}/analyze`.
2. Python runs the 12-agent DAG and **streams each transition back** to Node: `POST {NODE}/internal/projects/:id/agent-events`.
3. Node persists each event to Mongo **and** broadcasts it over Socket.IO (same event shape the React store already parses).
4. Exports: Node `POST {AI}/export/{format}` → Python returns the file bytes → Node streams them to the browser.
5. Doc parsing: Node stores the upload on a **shared volume**, calls `POST {AI}/parse`; Python reads the file by path and calls back `POST {NODE}/internal/documents/:id/parsed`.

All `/internal/*` calls are guarded by a shared `INTERNAL_TOKEN`.

---

## 🚀 Quickstart (Docker)

```bash
cp .env.example .env
# Fill the 3 REQUIRED values in .env:
#   ANTHROPIC_API_KEY, JWT_SECRET (openssl rand -hex 32), INTERNAL_TOKEN (openssl rand -hex 32)

docker compose up -d --build
```

Then open **http://localhost** → Register → create a project → onboarding → launch the analysis and watch the 12 agents run live → export.

| URL | What |
|---|---|
| http://localhost | App |
| http://localhost/api/health | Node health |
| http://localhost/socket.io | Socket.IO (WS) |

> First build pulls the WeasyPrint native libs into the Python image (~1–2 min).

---

## 🧑‍💻 Local dev (without Docker)

You need: Node 20+, Python 3.12+, a running MongoDB.

```bash
# 1) MongoDB (e.g. docker run -d -p 27017:27017 mongo:7)

# 2) Node backend
cd backend-node && cp .env.example .env   # set JWT_SECRET, INTERNAL_TOKEN
npm install && npm run dev                 # :4000  (seeds benchmarks on boot)

# 3) Python AI service
cd ai-python && cp .env.example .env       # set ANTHROPIC_API_KEY, INTERNAL_TOKEN (same as Node)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000  # :8000

# 4) Frontend
cd frontend && npm install && npm run dev   # :5173 (proxies /api + /socket.io -> :4000)
```

Open http://localhost:5173.

---

## 🤖 The 12 agents & execution DAG

Modes: `quick` (2 agents), `standard` (11), `comprehensive` (12).

```
L0: 1 Profil
L1: 2 PESTEL · 3 SWOT · 4 Concurrence · 10 Chaîne de valeur
L2: 9 Porter            (← needs 4)
L3: 5 Diagnostic        (← needs 2,3,4,9,10)
L4: 6 Stratégie · 11 BCG (← need 5; BCG only in comprehensive, skipped for micro/early)
L5: 7 KPIs · 12 Changement
L6: 8 Livrables finaux  (← needs 5,6,7,12)
```

Agents in the same level run **in parallel** (asyncio, capped by `MAX_PARALLEL_AGENTS`). Model tiers: Profil=Haiku, Diagnostic & Livrables=Opus, the rest=Sonnet. Each agent uses forced `tool_use` so Claude returns JSON conforming to that agent's schema.

> Note: the original QUICKSTART prose says "standard = 10 agents"; the **code** yields **11** (everything except BCG). This port follows the code.

---

## 🔌 API (unchanged from the original)

```
POST   /api/auth/register | login | refresh | logout | verify-email
POST   /api/auth/forgot-password | reset-password
PUT    /api/auth/change-password           DELETE /api/auth/account
GET/PUT /api/users/me

GET/POST        /api/projects
GET/DELETE      /api/projects/:id
GET/PUT         /api/projects/:id/onboarding
POST            /api/projects/:id/analyze

GET             /api/projects/:id/agents
GET             /api/projects/:id/agents/:agentId
PUT             /api/projects/:id/agents/:agentId/output
POST            /api/projects/:id/agents/:agentId/retry | regenerate
GET             /api/projects/:id/agents/:agentId/versions

GET/PUT         /api/projects/:id/finance
GET             /api/projects/:id/finance/benchmark
GET/POST/DELETE /api/projects/:id/documents[/:docId]
GET/POST        /api/projects/:id/citations
POST            /api/projects/:id/export/:format        # pdf|docx|pptx|xlsx

# Socket.IO: connect with auth {token}; emit 'subscribe:project' <id>; receive 'agent_event'
# Internal (Python only, X-Internal-Token):
#   POST /internal/projects/:id/agent-events
#   POST /internal/projects/:id/analysis-complete
#   POST /internal/documents/:id/parsed
```

---

## 📁 Layout

```
strategor-mern/
├─ docker-compose.yml      # mongo + node + ai + frontend + nginx
├─ .env.example            # root env (REQUIRED: ANTHROPIC_API_KEY, JWT_SECRET, INTERNAL_TOKEN)
├─ nginx/nginx.conf        # reverse proxy
├─ backend-node/           # Express + Mongoose + Socket.IO  (the MERN backend)
│  ├─ src/{models,routes,services,middleware,socket,utils,config}
│  └─ seed/seedBenchmarks.js
├─ ai-python/              # FastAPI AI/export/parsing service
│  └─ app/{agents,exporters,parsing}, claude_client.py, orchestrator.py
└─ frontend/               # React SPA (unchanged except the Socket.IO hook)
```

---

## 🔐 Security notes
- Passwords: bcrypt. JWT: HS256, access + rotating refresh (refresh hashes stored as sessions).
- `JWT_SECRET` must be ≥ 32 chars. `INTERNAL_TOKEN` must match between Node and Python.
- Free plan: 1 project. RGPD account deletion soft-deletes + revokes sessions.
# strategor2
