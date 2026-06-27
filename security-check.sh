#!/bin/bash
# ============================================================
# SCRIPT DE VÉRIFICATION SÉCURITÉ — Strategor
# (adapté du modèle CIH au stack Node/Express + Python + Docker)
# Lancer avant chaque déploiement : bash security-check.sh
# ============================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  AUDIT SÉCURITÉ — Strategor                    ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

ERRORS=0

# ── 1. Aucun secret réel dans les fichiers versionnés (.env.example, etc.) ──
echo -e "${YELLOW}[1/8] Scan des secrets exposés...${NC}"
# Cherche des secrets qui ressemblent à de vraies valeurs (clé Anthropic, hex 32+, etc.)
if git grep -nE "(sk-ant-[a-zA-Z0-9_-]{20,}|JWT_SECRET=[a-f0-9]{32,}|INTERNAL_TOKEN=[a-f0-9]{32,})" -- ':!*.lock' 2>/dev/null | grep -v "xxxxx\|CHANGEME\|<.*>\|openssl"; then
  echo -e "${RED}  ❌ DANGER : secret réel détecté dans un fichier versionné${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✅ Aucun secret réel détecté dans le suivi git${NC}"
fi

# ── 2. Audit npm — backend-node ────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/8] npm audit (backend-node, niveau HIGH)...${NC}"
( cd backend-node && npm audit --audit-level=high ) && \
  echo -e "${GREEN}  ✅ Aucune vulnérabilité HIGH/CRITICAL (backend)${NC}" || \
  { echo -e "${RED}  ❌ Vulnérabilités HIGH/CRITICAL npm (backend) — bloquer le déploiement${NC}"; ERRORS=$((ERRORS + 1)); }

# ── 3. Audit npm — frontend ────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/8] npm audit (frontend, niveau HIGH)...${NC}"
( cd frontend && npm audit --audit-level=high ) && \
  echo -e "${GREEN}  ✅ Aucune vulnérabilité HIGH/CRITICAL (frontend)${NC}" || \
  { echo -e "${RED}  ❌ Vulnérabilités HIGH/CRITICAL npm (frontend) — bloquer le déploiement${NC}"; ERRORS=$((ERRORS + 1)); }

# ── 4. Lockfiles présents (npm ci en prod, pas npm install) ────────────────
echo ""
echo -e "${YELLOW}[4/8] Intégrité des lockfiles npm...${NC}"
for lf in backend-node/package-lock.json frontend/package-lock.json; do
  if [ -f "$lf" ]; then
    echo -e "${GREEN}  ✅ $lf présent${NC}"
    grep -q '"integrity": "sha512-' "$lf" 2>/dev/null && \
      echo -e "${GREEN}     → hashes SHA-512 présents${NC}" || \
      { echo -e "${RED}     ❌ hashes SHA-512 absents — risque substitution${NC}"; ERRORS=$((ERRORS + 1)); }
  else
    echo -e "${RED}  ❌ $lf manquant — risque supply chain${NC}"; ERRORS=$((ERRORS + 1))
  fi
done

# ── 5. Dépendances Python épinglées + pip-audit ────────────────────────────
echo ""
echo -e "${YELLOW}[5/8] Dépendances Python (ai-python)...${NC}"
if grep -qE "^[a-zA-Z0-9_.-]+>=|^[a-zA-Z0-9_.-]+$" ai-python/requirements.txt 2>/dev/null; then
  echo -e "${YELLOW}  ⚠️  Dépendances non épinglées (==) dans requirements.txt — builds non reproductibles${NC}"
fi
if command -v pip-audit >/dev/null 2>&1; then
  ( cd ai-python && pip-audit -r requirements.txt ) && \
    echo -e "${GREEN}  ✅ Aucune vulnérabilité pip connue${NC}" || \
    { echo -e "${RED}  ❌ Vulnérabilités pip détectées${NC}"; ERRORS=$((ERRORS + 1)); }
else
  echo -e "${YELLOW}  ⚠️  pip-audit non installé (pip install pip-audit) — audit Python ignoré${NC}"
fi

# ── 6. Dockerfiles : conteneurs non-root (USER présent) ────────────────────
echo ""
echo -e "${YELLOW}[6/8] Dockerfiles — utilisateur non-root...${NC}"
for df in backend-node/Dockerfile ai-python/Dockerfile frontend/Dockerfile; do
  if grep -qE "^\s*USER\s+" "$df" 2>/dev/null; then
    echo -e "${GREEN}  ✅ USER non-root défini dans $df${NC}"
  else
    echo -e "${RED}  ❌ $df tourne en root (ajouter une directive USER)${NC}"; ERRORS=$((ERRORS + 1))
  fi
done

# ── 7. Variables d'environnement critiques définies ────────────────────────
echo ""
echo -e "${YELLOW}[7/8] Variables d'environnement critiques...${NC}"
for var in JWT_SECRET INTERNAL_TOKEN ANTHROPIC_API_KEY MONGO_URI; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}  ⚠️  $var non défini (requis en production)${NC}"
  else
    echo -e "${GREEN}  ✅ $var défini${NC}"
  fi
done

# ── 8. MongoDB : authentification activée dans docker-compose ──────────────
echo ""
echo -e "${YELLOW}[8/8] MongoDB — authentification...${NC}"
if grep -qE "MONGO_INITDB_ROOT_USERNAME|--auth" docker-compose.yml 2>/dev/null; then
  echo -e "${GREEN}  ✅ Authentification MongoDB configurée${NC}"
else
  echo -e "${RED}  ❌ MongoDB sans authentification dans docker-compose.yml (Phase B)${NC}"; ERRORS=$((ERRORS + 1))
fi

# ── Rapport final ──────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}================================================${NC}"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}  RÉSULTAT : ✅ Audit passé — Prêt pour production${NC}"
else
  echo -e "${RED}  RÉSULTAT : ❌ $ERRORS problème(s) critique(s) à corriger${NC}"
fi
echo -e "${BLUE}================================================${NC}"
echo ""
exit $ERRORS
