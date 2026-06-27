# 🛡️ Plan de Remédiation Sécurité — Strategor

> Suivi des corrections de sécurité issues de l'audit du **2026-06-27**.
> Contexte cible : déploiement en **banque internationale** (FinTech / PCI-DSS / DORA).
> Méthode : correction **étape par étape**, chaque étape expliquée + scénario d'attaque + confirmation utilisateur avant exécution.

**Légende statut :** ⬜ à faire · 🔄 en cours · ✅ fait · ⏭️ reporté

> **🗂️ STRATÉGIE EN 2 PHASES (décidée le 2026-06-27)**
> - **PHASE A — APPLICATION (maintenant)** : tous les correctifs au niveau du code (Node / Python / React), indépendants du déploiement.
> - **PHASE B — PRÉ-PROD / PROD (VPS, plus tard)** : tout ce qui touche l'infrastructure (auth Mongo, TLS, firewall UFW, durcissement Docker, CI/CD, headers Nginx).

---

## 🟢 PHASE A — CORRECTIFS APPLICATION (code) — EN COURS

| # | Correctif | Fichiers | Statut |
|---|---|---|---|
| A-1 | Socket.IO : ownership des rooms + rejet refresh token (ex-P0-4) | `backend-node/src/socket/index.js` | ✅ |
| A-2 | Valider/whitelister `/internal` (`isValidObjectId`, bornes agentId) (ex-P0-5) | `backend-node/src/routes/internal.js` | ✅ |
| A-3 | Fail-fast secrets par défaut tout env + comparaisons timing-safe (ex-P0-3) | `config/env.js`, `middleware/internalAuth.js`, `ai-python/app/main.py`, `config.py` | ✅ |
| A-4 | `fileFilter` + magic-number sur uploads (ex-P1-11) | `backend-node/src/routes/documents.js` | ✅ |
| A-5 | Neutraliser prompt injection (contenu non fiable en rôle `user`) (ex-P1-9) | `ai-python/app/agents/sanitize.py` (nouveau), `base.py`, `factsheet.py` | ✅ |
| A-6 | Confiner `storagePath` + `agent_name` (path traversal) (ex-P1-10) | `ai-python/app/parsing/parser.py`, `claude_client.py`, `config.py` | ✅ |
| A-7 | DTO Zod whitelistés (fin du mass-assignment) (ex-P2-14) | `routes/finance.js`, `documents.js`, `users.js`, `agents.js`, `projects.js` | ✅ |
| A-8 | Frontend : valider `href` (SourcesPanel) + XSS export HTML + blocage F12 (ex-H-5/H-8) | `SourcesPanel.jsx`, `utils/exportView.js`, `App.jsx` | ✅ |
| A-9 | Transactions Mongo + `tokenVersion` (invalidation immédiate) (ex-P2-16) | `services/authService.js`, `models/User.js` | ⬜ |
| A-10 | Hasher reset/verification tokens + `saltRounds≥12` (ex-P2-17) | `models/User.js`, `utils/hash.js` | ⬜ |
| A-11 | Limites parsing (taille/timeout) anti zip-bomb (ex-P2-18) | `ai-python/app/parsing/parser.py` | ✅ |
| A-12 | Désactiver `/docs` FastAPI prod + TrustedHostMiddleware (ex-P2-19) | `ai-python/app/main.py`, `config.py` | ✅ |
| A-13 | Tokens JWT hors `localStorage` → cookies HttpOnly/mémoire (ex-CRIT-10) — gros changement front+back | `frontend/src/store/authStore.js`, `api/index.js`, backend auth/cookies | ⛔ EXCLU (gros, session dédiée) |

---

## 🏦 PARITÉ SÉCURITÉ « CIH » (modèle banque) — à répliquer dans Strategor

> Source : analyse du projet `C:\Users\addia\OneDrive\Desktop\Projet_CIH` (Spring Boot + React).
> Strategor est Node/Express + Python : on **adapte les patterns**, on ne copie pas le code Java.

| # | Mesure CIH | Strategor — statut | Action |
|---|---|---|---|
| CIH-1 | JWT en **cookies HttpOnly + Secure + SameSite=Strict** (pas localStorage) | 🔴 localStorage | **A-13** (front+back) |
| CIH-2 | **Headers sécurité** (CSP, HSTS, X-Frame, nosniff, Referrer, Permissions) | 🟡 partiel | A-8 (export) + B (nginx) + helmet CSP back |
| CIH-3 | **Magic bytes** sur uploads | 🟢 FAIT | ✅ A-4 |
| CIH-4 | **Secrets en env + fail-fast** (jamais en dur) | 🟢 FAIT | ✅ A-3 |
| CIH-5 | **Rate limiting** par IP | 🟢 déjà présent (express-rate-limit) | vérifier/renforcer |
| CIH-6 | **Anti-NoSQL injection** (équivalent SqlInjectionFilter) | 🟢 déjà (mongo-sanitize) + Zod A-7 | ✅ renforcé |
| CIH-7 | **404 au lieu de 401/403** (anti-énumération de routes) | 🔴 absent | CIH-PARITY-1 |
| CIH-8 | **AntiScan** (bloque Gobuster/Hydra/Nikto, chemins suspects) | 🔴 absent | CIH-PARITY-2 |
| CIH-9 | **Journal d'audit persistant** (login/échec/lock + IP/UA) | 🔴 absent | CIH-PARITY-3 (conformité) |
| CIH-10 | **2FA / OTP email** au login | ⛔ **EXCLU** (décision user — garder login simple) | — |
| CIH-11 | **Verrouillage de compte** après N échecs | ⛔ **EXCLU** (décision user) | — |
| CIH-12 | **Détection de réutilisation** du refresh token | 🟡 rotation oui, détection non | A-9 (déjà prévu) |
| CIH-13 | **security-check.sh** pré-déploiement (secrets, npm audit high, lockfile SHA-512, npm ci) | 🔴 absent | CIH-PARITY-6 |
| CIH-14 | **BCrypt** mots de passe | 🟢 déjà (bcryptjs) | vérifier coût ≥12 (A-10) |
| CIH-15 | **CI/CD GitHub Actions** (adapté stack Node/Mongo/Python/Docker) | 🔴 absent | CIH-PARITY-7 |

**Ordre conseillé :** A-13 (cookies) → A-8 (headers) → CIH-PARITY-1 (404 anti-énum) → CIH-PARITY-2 (anti-scan) → CIH-PARITY-3 (audit log) → CIH-PARITY-6 (security-check.sh) → CIH-PARITY-7 (CI/CD).
**EXCLUS sur décision utilisateur :** 2FA OTP, verrouillage de compte.

---

## 🔵 PHASE B — INFRASTRUCTURE PRÉ-PROD / PROD (VPS) — PLUS TARD

## 🚨 P0 — BLOQUANTS ABSOLUS (avant tout commit / déploiement)

| # | Correctif | Fichiers | Statut |
|---|---|---|---|
| P0-1 | Dé-stager `.env.example`, retirer tests à token, révoquer+roter les 3 secrets, gitignore + gitleaks | `.env.example`, `ai-python/test_callback.py`, `test_http.py`, `.gitignore` | ⬜ |
| P0-2 | Activer l'auth MongoDB + user applicatif + réseau isolé | `docker-compose.yml`, `.env.example` | ⬜ |
| P0-3 | Fail-fast secrets par défaut **tout env** + comparaisons timing-safe | `backend-node/src/config/env.js`, `middleware/internalAuth.js`, `ai-python/app/main.py`, `config.py` | ⬜ |
| P0-4 | Socket.IO : ownership des rooms + rejet refresh token | `backend-node/src/socket/index.js` | ⬜ |
| P0-5 | Valider/whitelister `/internal` (`isValidObjectId`, bornes agentId) | `backend-node/src/routes/internal.js` | ⬜ |

## 🔴 P1 — AVANT EXPOSITION RÉSEAU

| # | Correctif | Fichiers | Statut |
|---|---|---|---|
| P1-6 | TLS + redirection HTTP→HTTPS + HSTS | `nginx/nginx.conf`, `docker-compose.yml` | ⬜ |
| P1-7 | Headers de sécurité Nginx (CSP/X-Frame-Options/nosniff) | `nginx/nginx.conf`, `frontend/nginx-frontend.conf` | ⬜ |
| P1-8 | Conteneurs non-root + no-new-privileges/cap_drop/read_only/limits | 3 `Dockerfile`, `docker-compose.yml` | ⬜ |
| P1-9 | Neutraliser prompt injection (contenu non fiable en rôle `user`, délimité, borné) | `ai-python/app/agents/base.py`, `orchestrator.py` | ⬜ |
| P1-10 | Confiner `storagePath` + `agent_name` (path traversal) | `ai-python/app/parsing/parser.py`, `claude_client.py`, `main.py` | ⬜ |
| P1-11 | `fileFilter` + magic-number sur uploads | `backend-node/src/routes/documents.js` | ⬜ |
| P1-12 | Tokens front → cookie HttpOnly / mémoire | `frontend/src/store/authStore.js`, `api/index.js`, backend auth | ⬜ |

## 🟠 P2 — AVANT AUDIT CONFORMITÉ

| # | Correctif | Fichiers | Statut |
|---|---|---|---|
| P2-13 | Pipeline CI/CD (gitleaks + npm/pip-audit + trivy + hadolint) | `.github/workflows/` | ⬜ |
| P2-14 | DTO Zod whitelistés sur toutes les routes (fin du mass-assignment) | `routes/finance.js`, `documents.js`, `users.js`, `agents.js`, `projects.js` | ⬜ |
| P2-15 | Pinner `axios`, migrer `multer` 2.x, geler `requirements.txt` + hashs | `package.json` x2, `requirements.txt` | ⬜ |
| P2-16 | Transactions Mongo + `tokenVersion` (invalidation immédiate) | `services/authService.js`, `models/User.js` | ⬜ |
| P2-17 | Hasher reset/verification tokens + `saltRounds≥12` | `models/User.js`, `utils/hash.js` | ⬜ |
| P2-18 | Limites parsing (taille/timeout/mémoire) anti zip-bomb | `ai-python/app/parsing/parser.py` | ⬜ |
| P2-19 | Désactiver `/docs` FastAPI prod + TrustedHostMiddleware | `ai-python/app/main.py` | ⬜ |
| P2-20 | Rate-limit edge Nginx + `server_tokens off` + timeouts Slowloris | `nginx/nginx.conf` | ⬜ |

## 🟡 P3 — DURCISSEMENT & HYGIÈNE

- Healthchecks + `depends_on: service_healthy` · segmentation réseau Docker · volume upload `:ro` côté Python · images pinnées par digest · `.dockerignore` incluant `.git` · CSP backend réactivée · messages d'erreur génériques · logs centralisés + SIEM · backups Mongo chiffrés + test restauration · suppression code mort/scripts debug · `npm ci` + multi-stage backend · index Mongo dédupliqués · politique mot de passe · drop `console.*` prod · issuer/audience JWT · bornes `Mixed` · validation `analysisMode` · gzip ciblé · anti-spoof XFF · tests automatisés.

---

## 📓 Journal des modifications

| Date | Étape | Action | Résultat |
|---|---|---|---|
| 2026-06-27 | — | Création du plan de remédiation | ✅ |
| 2026-06-27 | P0-1 (partiel) | Ajout de `.claude/` au `.gitignore` racine (couvre tous les sous-dossiers). `.env` déjà ignoré. Aucun fichier supprimé, `.env` intact. | ✅ |
| 2026-06-27 | A-1 | Socket.IO : vérif ownership avant `subscribe:project` + rejet refresh token. Syntaxe vérifiée (`node --check`). | ✅ |
| 2026-06-27 | A-2 | `/internal` : validation ObjectId (projectId/documentId), agentId entier borné [1-100], statut whitelisté, coûts/tokens forcés numériques + plafonnés. Syntaxe OK. | ✅ |
| 2026-06-27 | A-3 | Fail-fast secrets par défaut (JWT_SECRET/INTERNAL_TOKEN) en TOUT env (Node `env.js` + Python `config.py`). Comparaison token interne à temps constant (`crypto.timingSafeEqual` Node, `hmac.compare_digest` Python). Syntaxe Node+Python OK. | ✅ |
| 2026-06-27 | A-4 | Upload : `fileFilter` (whitelist MIME+ext PDF/docx/xlsx/pptx/txt), vérif magic-number réelle (rejet `MZ`/.exe même renommé), suppression du fichier invalide, validation `projectId` (anti path-traversal). NB ClamAV → Phase B. Syntaxe OK. | ✅ |
| 2026-06-27 | A-5 | Prompt injection : nouveau module `sanitize.py` (neutralize: strip invisibles/bidi/TAG/null, retrait sentinel cache, defang fences, cap taille ; wrap_untrusted: bloc scellé aléatoire data-only avant+après). Appliqué à documents, sorties d'agents, profil (préambule), finance et FAITS CANONIQUES (factsheet). Couvre OWASP LLM01 direct+indirect, évasion délimiteur, smuggling unicode, context-stuffing, propagation inter-agents. Tests fonctionnels + intégration OK. | ✅ |
| 2026-06-27 | A-6 | Path traversal : `parser.py._safe_path` confine toute lecture sous `settings.storage_root` (= UPLOAD_PATH, défaut `/tmp/strategor-uploads`), résout les symlinks avant contrôle. `claude_client.py` debug log → nom sanitizé dans tempdir. Test : fichier autorisé OK, `/etc/passwd` + `..` refusés. | ✅ |
| 2026-06-27 | A-7 | Mass-assignment : schémas Zod (safeParse) sur citations (URL http(s) only → bloque javascript:), finance (record borné 200 clés), users PUT /me (max 80, lang fr/en), agents output (objet/array + cap 500 Ko), projects PATCH (name 200, mode whitelisté) + params benchmark forcés scalaires. Champs inconnus supprimés. Tests OK. Syntaxe 5 fichiers OK. | ✅ |
| 2026-06-27 | CIH (analyse) | Analyse sécurité Projet_CIH : JWT cookies HttpOnly, CSP/HSTS, AntiScan/SqlInjection/RateLimit filters, 404 anti-énum, audit log, magic bytes, security-check.sh. Plan de parité ajouté. 2FA + lockout EXCLUS (user). | ✅ |
| 2026-06-27 | A-8 (back) + PARITY-1 + PARITY-2 | Durcissement HTTP backend : helmet activé (CSP stricte `default-src none`, HSTS 1 an, X-Frame DENY, nosniff, no-referrer) ; nouveau middleware `antiScan.js` (bloque UA sqlmap/nikto/gobuster/hydra… + probes .env/.git/wp-* → 404) ; catch-all 404 anti-énumération sur routes inconnues. Tests : scanners bloqués, trafic légitime OK. | ✅ |
| 2026-06-27 | PARITY-3 | Journal d'audit : modèle `AuditLog.js` (append-only, index action/email/createdAt) + `auditService.js` (fire-and-forget, ne bloque jamais). Branché sur LOGIN_SUCCESS/LOGIN_FAILED/LOGOUT/PASSWORD_CHANGED avec IP+UA. Syntaxe OK. | ✅ |
| 2026-06-27 | PARITY-6 | `security-check.sh` (racine) : 8 contrôles pré-déploiement adaptés au stack (secrets, npm audit back+front, lockfiles SHA-512, deps Python + pip-audit, Dockerfiles non-root, env vars, MongoDB auth). Syntaxe bash OK. | ✅ |
| 2026-06-27 | PARITY-7 | CI/CD GitHub Actions séparé par composant : `ci-backend.yml` (+npm audit), `ci-frontend.yml` (+npm audit), `ci-ai-python.yml` (+pip-audit) avec filtres `paths:` ; `security.yml` transversal (gitleaks + hadolint + trivy fs) ; `deploy.yml` CD Docker Compose via SSH (git pull + compose up + health check + rollback log). 5 YAML validés. | ✅ |
| 2026-06-27 | A-8 (front) | SourcesPanel `safeHref` (http(s) only → bloque javascript:) ; export HTML : `<meta>` CSP `default-src none` + lien police échappé ; App.jsx blocage F12/clic-droit/Ctrl+U-S-P/Ctrl+Shift+I-J-C (friction UX, pas sécurité réelle, comme CIH). JS+JSX validés. | ✅ |
| 2026-06-27 | A-12 | FastAPI `/docs`/`/redoc`/`/openapi.json` désactivés par défaut (config `docs_enabled`, env `AI_DOCS_ENABLED`) + `TrustedHostMiddleware` optionnel (`AI_ALLOWED_HOSTS`). Compile OK. | ✅ |
| 2026-06-27 | A-11 | Anti zip-bomb : bornes parser (fichier 30 Mo, texte 2 M chars, PDF 500 pages, xlsx 500k cellules, pptx 500 slides) + troncature propre. Compile OK. | ✅ |
