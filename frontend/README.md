# Stratège IA v2 — Frontend

React 18 + Vite + Tailwind + Zustand + WebSocket STOMP.

## Démarrage local

```bash
npm install
cp .env.example .env  # optionnel : laisser vide pour utiliser le proxy Vite
npm run dev
```

→ Frontend accessible sur http://localhost:5173 (proxie /api et /ws vers backend localhost:8080)

## Build production

```bash
npm run build  # → dossier dist/
```

## Structure

- `src/api/` — client axios + intercepteurs JWT
- `src/store/` — stores Zustand (auth, project)
- `src/hooks/useWebSocket.js` — hook STOMP
- `src/components/` — UI (layout, onboarding, ...)
- `src/pages/` — routes
- `src/locales/` — i18n (fr, en)

## Pages livrées

- ✅ Auth complète (login, register, forgot, reset, verify)
- ✅ Dashboard (liste projets + création + quota Free)
- ✅ Onboarding (8 étapes + autosave)
- ✅ Agents page (WebSocket temps réel + fallback polling)
- ✅ Validation (10 onglets agents)
- ✅ Deliverables (exports PDF/Word/PPT/Excel)
- ✅ Settings (profil, mdp, plan, RGPD)

## ⚠️ Intégration des viz Track E

Le code des visualisations (PestelHeatmap, SwotMatrix, etc.) est dans `stratege-v2-tracks-BEGH.tar.gz`.

➡️ À copier dans `src/components/viz/` et à utiliser dans `ValidationPage.jsx` à la place du `<pre>{JSON}</pre>` actuel.
