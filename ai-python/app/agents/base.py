"""
Agent base class — Python port of AbstractAgent + AgentDefinition.

Each concrete agent declares its metadata and a mission; the shared helpers
reproduce the exact preamble / finance / dependency / documents context blocks
from the original Spring implementation.

Dependencies are passed as a dict {agentId: payload}. The sentinel key -1 holds
the user-documents text (same convention as the Java orchestrator).
"""
from __future__ import annotations
from typing import Any, Optional
from ..deepseek_client import ModelTier

DOCUMENTS_KEY = -1  # sentinel: deps[-1] = parsed user documents text


def _null_safe(s: Optional[str]) -> str:
    return s if (s and str(s).strip()) else "(non renseigné)"


def _join_list(lst: Optional[list]) -> str:
    return ", ".join(lst) if lst else "(non renseigné)"


def _format_portfolio(portfolio: Optional[list]) -> str:
    if not portfolio:
        return "(non renseigné)"
    lines = []
    for p in portfolio:
        if not isinstance(p, dict):
            continue
        name = (p.get("name") or "").strip() or "(sans nom)"
        parts = []
        if p.get("revenueShare") is not None:
            parts.append(f"part CA {p['revenueShare']}%")
        if p.get("growth") is not None:
            parts.append(f"croissance {p['growth']}%")
        if p.get("marketShare") is not None:
            parts.append(f"part de marché {p['marketShare']}")
        detail = ", ".join(parts) if parts else "données chiffrées non précisées"
        lines.append(f"{name} ({detail})")
    return "; ".join(lines) if lines else "(non renseigné)"


class Agent:
    # ── metadata (overridden per agent) ──
    agent_id: int = 0
    agent_name: str = ""
    category: str = ""
    tier: ModelTier = ModelTier.SONNET
    depends_on: list[int] = []
    active_in_modes: list[str] = ["standard", "comprehensive"]
    uses_finance: bool = False  # whether financeContext is injected
    uses_web_search: bool = False  # whether this agent grounds its analysis via web search
    mission: str = ""

    # ── conditional skip (only Agent 11 overrides) ──
    def is_conditional(self, profile: Optional[dict]) -> bool:
        return False

    # ── prompt fragments (ported verbatim from AbstractAgent) ──
    def preamble(self, profile: Optional[dict]) -> str:
        if not profile:
            return ("Tu es un expert en stratégie d'entreprise. "
                    "Tu analyses une entreprise dont le profil n'est pas encore complet.")
        return (
            "Tu es un consultant senior en stratégie d'entreprise (style McKinsey/BCG mais accessible). "
            "Tu analyses l'entreprise suivante :\n\n"
            f"- Nom : {_null_safe(profile.get('companyName'))}\n"
            f"- Secteurs : {_join_list(profile.get('sectors'))}\n"
            f"- Territoires : {_join_list(profile.get('territories'))}\n"
            f"- Stade : {_null_safe(profile.get('stage'))}\n"
            f"- CA annuel : {_null_safe(profile.get('revenueRange'))}\n"
            f"- Effectif : {_null_safe(profile.get('teamSize'))}\n"
            f"- Marchés cibles : {_join_list(profile.get('marketTypes'))}\n"
            f"- Clients : {_null_safe(profile.get('customerDescription'))}\n"
            f"- Objectifs : {_join_list(profile.get('objectives'))}\n"
            f"- Enjeux : {_null_safe(profile.get('objectiveDetail'))}\n"
            f"- Activité précise : {_null_safe(profile.get('activityPrecise'))}\n"
            f"- Positionnement : {_null_safe(profile.get('positioning'))}\n"
            f"- Périmètre d'activité : {_null_safe(profile.get('valueScope'))}\n"
            f"- Forces déclarées : {_null_safe(profile.get('strengths'))}\n"
            f"- Difficultés déclarées : {_null_safe(profile.get('weaknesses'))}\n"
            f"- Portefeuille produits/segments : {_format_portfolio(profile.get('portfolio'))}\n\n"
            "Ton style : direct, concret, chiffré, avec une touche pédagogique. "
            "Tu utilises des exemples sectoriels précis. "
            "Tu privilégies les insights actionnables aux généralités.\n\n"
        )

    def finance_context(self, finance: Optional[dict]) -> str:
        # `finance` is the FinanceLite.data dict (the indicators).
        if not finance:
            return ("Données financières : non renseignées "
                    "(s'appuyer sur des estimations sectorielles).\n\n")
        return f"Données financières disponibles :\n{finance}\n\n"

    def documents_context(self, deps: Optional[dict]) -> str:
        if not deps:
            return ""
        docs = deps.get(DOCUMENTS_KEY)
        if not docs:
            return ""
        return ("Documents fournis par l'utilisateur (à intégrer dans ton analyse) :\n"
                f"{docs}\n\n")

    def dependency_context(self, deps: Optional[dict]) -> str:
        if not deps:
            return ""
        out = self.documents_context(deps)
        agent_deps = {k: v for k, v in deps.items() if k >= 0}
        if agent_deps:
            out += "Sorties des agents précédents (à utiliser pour ta synthèse) :\n"
            for aid in sorted(agent_deps):
                out += f"Agent {aid} : {agent_deps[aid]}\n\n"
        return out

    def build_system_prompt(
        self,
        profile: Optional[dict],
        finance: Optional[dict],
        deps: Optional[dict],
        language: str = "fr",
    ) -> str:
        parts = [self.preamble(profile)]
        if self.uses_finance:
            parts.append(self.finance_context(finance))
        parts.append(self.dependency_context(deps))
        parts.append(self.mission)
        if language and language.lower().startswith("en"):
            parts.append("\n\nIMPORTANT: Write your entire response (all field values) in English.\n")
        return "".join(parts)
