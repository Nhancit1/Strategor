"""
Canonical fact-sheet — the single source of NUMERIC truth shared with every agent.

The existing rigor block in build_system_prompt already handles facts-vs-hypotheses
and source citation. This module is deliberately *numeric-specific*: it locks the few
hard anchors (from the profile + finance inputs) and adds the arithmetic / share-sum /
BCG-definition rules that stop the cross-agent contradictions and false precision the
audit surfaced (market growth quoted 3 ways, "+30%" that was +17%, revenue buckets
pasted as targets, BCG relative-share misused).

Additive and defensive: blank inputs degrade to a short sheet, never an error. The
companion deterministic validator (numeric_integrity.py) catches whatever still slips.
"""
from __future__ import annotations
from typing import Any, Optional

from .sanitize import clean_field


def _clean(v: Any) -> Optional[str]:
    if v is None:
        return None
    # Canonical facts are user-controlled and presented to the model as "truth":
    # neutralize any embedded prompt-injection before they become authoritative.
    s = clean_field(v).strip()
    return s or None


def _canonical_facts(profile: Optional[dict], finance: Optional[dict]) -> list[str]:
    facts: list[str] = []
    p = profile or {}

    if (name := _clean(p.get("companyName"))):
        facts.append(f"Entreprise : {name}")
    if (rev := _clean(p.get("revenueRange"))):
        facts.append(f"CA annuel (FOURCHETTE, non précise) : {rev}")
    if (team := _clean(p.get("teamSize"))):
        facts.append(f"Effectif (FOURCHETTE/approx.) : {team}")
    if (cust := _clean(p.get("customerDescription"))):
        facts.append(f"Clients (déclaré) : {cust}")

    portfolio = p.get("portfolio")
    if isinstance(portfolio, list) and portfolio:
        total, seen = 0.0, False
        for item in portfolio:
            if not isinstance(item, dict):
                continue
            pname = _clean(item.get("name")) or "(segment sans nom)"
            bits = []
            if item.get("revenueShare") is not None:
                bits.append(f"part CA {clean_field(str(item['revenueShare']))}%")
                try:
                    total += float(item["revenueShare"]); seen = True
                except (TypeError, ValueError):
                    pass
            if item.get("growth") is not None:
                bits.append(f"croissance {clean_field(str(item['growth']))}%")
            if item.get("marketShare") is not None:
                bits.append(f"part de marché relative {clean_field(str(item['marketShare']))}")
            facts.append(f"Segment « {pname} » : " + (", ".join(bits) if bits else "pas de chiffres"))
        if seen:
            facts.append(f"Somme des parts de CA du portefeuille fournies = {round(total)}% "
                         "(toute décomposition que tu produis doit rester cohérente avec ce total)")

    if isinstance(finance, dict) and finance:
        fin_bits = [f"{clean_field(str(k))} = {clean_field(str(v))}" for k, v in finance.items()
                    if isinstance(v, (str, int, float)) and _clean(v)]
        if fin_bits:
            facts.append("Indicateurs financiers fournis : " + " ; ".join(fin_bits))

    return facts


_RULES = (
    "Tu DOIS respecter ces règles de cohérence numérique, sans exception :\n"
    "1. N'utilise QUE les faits canoniques ci-dessus pour les données de référence "
    "(CA, effectif, marges, nombre de clients, parts de portefeuille). Ne les contredis "
    "jamais, ni d'une section à l'autre, ni d'un agent à l'autre.\n"
    "2. Le CA et l'effectif sont des FOURCHETTES : ne présente JAMAIS une borne de "
    "fourchette (ex. « 10-50M€ ») comme un objectif chiffré ou un réalisé précis.\n"
    "3. Toute valeur dérivée (croissance %, objectif, ratio) doit être arithmétiquement "
    "EXACTE : un objectif « +X% » à partir d'une base B vaut B × (1 + X/100). Vérifie ton "
    "calcul AVANT de l'écrire (ex. +30% de 10M€ = 13M€, et non 11,7M€).\n"
    "4. Toute décomposition en parts (% du CA, parts de portefeuille, mix d'activités) doit "
    "totaliser ~100%.\n"
    "5. Matrice BCG — définition stricte (Henderson/BCG) : la part de marché RELATIVE = ta "
    "part de marché ÷ part du plus gros concurrent (PAS ta part de ta propre base installée). "
    "RMS ≥ 1,0 ⇒ moitié « part forte » (Star/Vache à lait) ; RMS < 1,0 ⇒ « part faible » "
    "(Dilemme/Poids mort). Croissance élevée ⇒ haut ; faible ⇒ bas. Le quadrant DOIT être "
    "cohérent avec ces deux coordonnées."
)


def build_factsheet(profile: Optional[dict], finance: Optional[dict]) -> str:
    facts = _canonical_facts(profile, finance)
    if facts:
        block = "=== FAITS CANONIQUES (source de vérité — ne pas contredire) ===\n" + \
            "\n".join(f"- {f}" for f in facts) + "\n\n"
    else:
        block = ("=== FAITS CANONIQUES ===\n- Aucune donnée chiffrée fiable fournie : reste "
                 "prudent et qualitatif.\n\n")
    return block + "=== RÈGLES DE COHÉRENCE NUMÉRIQUE ===\n" + _RULES + "\n\n"
