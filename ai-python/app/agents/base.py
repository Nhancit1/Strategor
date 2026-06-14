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


def _null_safe(s: Optional[str], is_en: bool = False) -> str:
    if is_en:
        return s if (s and str(s).strip()) else "(not specified)"
    return s if (s and str(s).strip()) else "(non renseigné)"


def _join_list(lst: Optional[list], is_en: bool = False) -> str:
    if is_en:
        return ", ".join(lst) if lst else "(not specified)"
    return ", ".join(lst) if lst else "(non renseigné)"


def _format_portfolio(portfolio: Optional[list], is_en: bool = False) -> str:
    if is_en:
        if not portfolio:
            return "(not specified)"
        lines = []
        for p in portfolio:
            if not isinstance(p, dict):
                continue
            name = (p.get("name") or "").strip() or "(no name)"
            parts = []
            if p.get("revenueShare") is not None:
                parts.append(f"revenue share {p['revenueShare']}%")
            if p.get("growth") is not None:
                parts.append(f"growth {p['growth']}%")
            if p.get("marketShare") is not None:
                parts.append(f"market share {p['marketShare']}")
            detail = ", ".join(parts) if parts else "numerical data not specified"
            lines.append(f"{name} ({detail})")
        return "; ".join(lines) if lines else "(not specified)"
    else:
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
    def preamble(self, profile: Optional[dict], is_en: bool = False) -> str:
        if is_en:
            if not profile:
                return ("You are a business strategy expert. "
                        "You are analyzing a company whose profile is not yet complete.")
            return (
                "You are a senior business strategy consultant (McKinsey/BCG style but accessible). "
                "You are analyzing the following company:\n\n"
                f"- Name: {_null_safe(profile.get('companyName'), True)}\n"
                f"- Sectors: {_join_list(profile.get('sectors'), True)}\n"
                f"- Territories: {_join_list(profile.get('territories'), True)}\n"
                f"- Stage: {_null_safe(profile.get('stage'), True)}\n"
                f"- Annual revenue: {_null_safe(profile.get('revenueRange'), True)}\n"
                f"- Team size: {_null_safe(profile.get('teamSize'), True)}\n"
                f"- Target markets: {_join_list(profile.get('marketTypes'), True)}\n"
                f"- Customers: {_null_safe(profile.get('customerDescription'), True)}\n"
                f"- Objectives: {_join_list(profile.get('objectives'), True)}\n"
                f"- Key challenges: {_null_safe(profile.get('objectiveDetail'), True)}\n"
                f"- Precise activity: {_null_safe(profile.get('activityPrecise'), True)}\n"
                f"- Positioning: {_null_safe(profile.get('positioning'), True)}\n"
                f"- Value scope: {_null_safe(profile.get('valueScope'), True)}\n"
                f"- Declared strengths: {_null_safe(profile.get('strengths'), True)}\n"
                f"- Declared weaknesses: {_null_safe(profile.get('weaknesses'), True)}\n"
                f"- Product/segment portfolio: {_format_portfolio(profile.get('portfolio'), True)}\n\n"
                "Your style: direct, concrete, with numbers, and educational. "
                "Use precise industry examples. "
                "Prioritize actionable insights over generalities.\n\n"
            )
        else:
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

    def finance_context(self, finance: Optional[dict], is_en: bool = False) -> str:
        if not finance:
            if is_en:
                return ("Financial data: not specified "
                        "(rely on industry estimates).\n\n")
            return ("Données financières : non renseignées "
                    "(s'appuyer sur des estimations sectorielles).\n\n")
        if is_en:
            return f"Available financial data:\n{finance}\n\n"
        return f"Données financières disponibles :\n{finance}\n\n"

    def documents_context(self, deps: Optional[dict], is_en: bool = False) -> str:
        if not deps:
            return ""
        docs = deps.get(DOCUMENTS_KEY)
        if not docs:
            return ""
        if is_en:
            return ("User documents (integrate this context into your analysis):\n"
                    f"{docs}\n\n")
        return ("Documents fournis par l'utilisateur (à intégrer dans ton analyse) :\n"
                f"{docs}\n\n")

    def dependency_context(self, deps: Optional[dict], is_en: bool = False) -> str:
        if not deps:
            return ""
        out = self.documents_context(deps, is_en)
        agent_deps = {k: v for k, v in deps.items() if k >= 0}
        if agent_deps:
            if is_en:
                out += "Outputs from previous agents (use this context for your synthesis):\n"
                for aid in sorted(agent_deps):
                    out += f"Agent {aid}: {agent_deps[aid]}\n\n"
            else:
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
        is_en = language.lower().startswith("en")
        parts = [self.preamble(profile, is_en)]
        if self.uses_finance:
            parts.append(self.finance_context(finance, is_en))
        parts.append(self.dependency_context(deps, is_en))
        parts.append(self.mission)
        if is_en:
            parts.append(
                "\n\n=== Rigorous Analysis Rules (MUST be respected in your entire response) ===\n"
                "- Explicitly distinguish verified FACTS, HYPOTHESES, and INFERENCES; "
                "prefix any assumption with '[Hypothesis]'.\n"
                "- NEVER provide a precise figure or statistic that you cannot back up: "
                "give a qualitative range instead, or explicitly mark it as a hypothesis.\n"
                "- When an assertion is supported by web research sources, "
                "cite them in parentheses (source name, and URL if available).\n"
            )
            parts.append("\n\nIMPORTANT: Write your entire response (all field values) in English.\n")
            parts.append(
                "\n\n=== CRITICAL RULE (JSON GENERATION) ===\n"
                "You are an automated agent. You MUST imperatively use the provided tool structure to format your response.\n"
                "1. Use EXACTLY the English keys defined in the schema (e.g., 'strategic_axes', 'initiatives', etc.). Do not translate keys.\n"
                "2. Even if you lack data, you MUST NOT under any circumstances return an empty object {}.\n"
                "3. Invent relevant default values (e.g., 'To define', 'Axis 1') to satisfy the JSON schema if necessary, but guarantee that the final structure perfectly respects the expected schema and contains all required keys.\n"
                "4. NEVER place your main responses (such as axes or lists) in markdown format within a free-text field. You must use the arrays and JSON objects designed for this purpose."
            )
        else:
            parts.append(
                "\n\n=== Règles de rigueur (à respecter dans TOUTE ta réponse) ===\n"
                "- Distingue explicitement les FAITS vérifiés, les HYPOTHÈSES et les INFÉRENCES ; "
                "préfixe toute supposition par « [Hypothèse] ».\n"
                "- Ne donne JAMAIS un chiffre ou une statistique précis que tu ne peux pas étayer : "
                "donne plutôt une fourchette qualitative, ou marque-le explicitement comme hypothèse.\n"
                "- Quand une affirmation s'appuie sur une source issue de la recherche web, "
                "cite-la entre parenthèses (nom de la source, et URL si disponible).\n"
            )
            parts.append(
                "\n\n=== RÈGLE CRITIQUE (GÉNÉRATION JSON) ===\n"
                "Tu es un agent automatisé. Tu DOIS IMPÉRATIVEMENT utiliser l'outil fourni pour structurer ta réponse.\n"
                "1. Utilise EXACTEMENT les clés en anglais définies dans le schéma de l'outil (ex: 'strategic_axes', 'initiatives', etc.). Ne traduis pas les clés JSON en français.\n"
                "2. Même si tu manques de données, tu NE DOIS SOUS AUCUN PRÉTEXTE renvoyer un objet vide {}.\n"
                "3. Invente des valeurs par défaut pertinentes (ex: 'À définir', 'Axe 1') pour satisfaire le schéma JSON si nécessaire, mais garantis que la structure finale respecte parfaitement le schéma attendu et contienne toutes les clés obligatoires.\n"
                "4. NE PLACE JAMAIS tes réponses principales (comme les axes ou les listes) au format markdown dans un champ texte libre. Tu dois impérativement utiliser les tableaux et objets JSON prévus à cet effet."
            )
        return "".join(parts)
