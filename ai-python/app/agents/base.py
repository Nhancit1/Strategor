"""
Agent base class — Python port of AbstractAgent + AgentDefinition.

Each concrete agent declares its metadata and a mission; the shared helpers
reproduce the exact preamble / finance / dependency / documents context blocks
from the original Spring implementation.

Dependencies are passed as a dict {agentId: payload}. The sentinel key -1 holds
the user-documents text (same convention as the Java orchestrator).
"""
from __future__ import annotations
import json
from datetime import datetime
from typing import Any, Optional
from ..model_tiers import ModelTier
from .factsheet import build_factsheet
from .sanitize import neutralize, clean_field, wrap_untrusted, MAX_DEP_CHARS
from ..config import CACHE_SENTINEL


def _date_context(is_en: bool = False) -> str:
    """Anchor every agent to the server's real current date (and current quarter), so
    roadmaps, milestones and projections are dated forward from *today* instead of from a
    stale year baked into the model's weights. Without this the pipeline silently emitted
    past-dated quarters (e.g. a roadmap starting "T1 2025" when we are already past it)."""
    now = datetime.now()
    q = (now.month - 1) // 3 + 1
    d = now.strftime("%Y-%m-%d")
    if is_en:
        return (
            "\n\n=== Current date (authoritative) ===\n"
            f"Today is {d} \u2014 current quarter Q{q} {now.year}.\n"
            f"All deadlines, roadmap quarters, milestones and projections MUST be dated at or "
            f"after Q{q} {now.year}. Never place a milestone in a past quarter, and never assume "
            "a different 'current year'.\n"
        )
    return (
        "\n\n=== Date du jour (référence) ===\n"
        f"Nous sommes le {d} \u2014 trimestre courant T{q} {now.year}.\n"
        f"Toutes les échéances, trimestres de la feuille de route, jalons et projections "
        f"DOIVENT être datés au trimestre courant ou après (T{q} {now.year}). Ne place "
        "jamais un jalon dans un trimestre passé, et ne suppose jamais une autre "
        "« année courante ».\n"
    )


def _rigor_rules(is_en: bool = False) -> str:
    """Shared analysis-rigor contract, identical for every agent of a run (lives in the
    cached prompt prefix). The market-figures rule is now conditional on web data being
    present: the old wording ordered ALL agents to source figures from "the web research
    above", including the 10 agents that receive none — a contradiction that pushed the
    model to either refuse figures or fake compliance."""
    if is_en:
        return (
            "\n\n=== Rigorous Analysis Rules (MUST be respected in your entire response) ===\n"
            "- Explicitly distinguish verified FACTS, HYPOTHESES, and INFERENCES; "
            "prefix any assumption with '[Hypothesis]'.\n"
            "- NEVER provide a precise figure or statistic that you cannot back up: "
            "give a qualitative range instead, or explicitly mark it as a hypothesis.\n"
            "- When an assertion is supported by web research sources, "
            "cite them in parentheses (source name, and URL if available).\n"
            "- Any MARKET figure (market size, growth rate, market share) must be backed by "
            "web-research data when such data is provided in this prompt; otherwise mark it "
            "'[Hypothesis]' or give a qualitative range. NEVER invent a source or a date "
            "(e.g. a fabricated 'IDC 2023') — an unverifiable citation is worse than none.\n"
        )
    return (
        "\n\n=== Règles de rigueur (à respecter dans TOUTE ta réponse) ===\n"
        "- Distingue explicitement les FAITS vérifiés, les HYPOTHÈSES et les INFÉRENCES ; "
        "préfixe toute supposition par « [Hypothèse] ».\n"
        "- Ne donne JAMAIS un chiffre ou une statistique précis que tu ne peux pas étayer : "
        "donne plutôt une fourchette qualitative, ou marque-le explicitement comme hypothèse.\n"
        "- Quand une affirmation s'appuie sur une source issue de la recherche web, "
        "cite-la entre parenthèses (nom de la source, et URL si disponible).\n"
        "- Tout chiffre de MARCHÉ (taille, croissance, part de marché) doit être étayé par les "
        "données de recherche web lorsqu'elles sont fournies dans ce prompt ; sinon, marque-le "
        "« [Hypothèse] » ou donne une fourchette qualitative. N'invente JAMAIS une source "
        "ni une date (ex. un « IDC 2023 » fabriqué) — une citation invérifiable est pire que pas de citation.\n"
    )


DOCUMENTS_KEY = -1  # sentinel: deps[-1] = parsed user documents text


def _compact(obj) -> str:
    """Token-lean serialization: compact JSON (no spaces, real quotes) instead of the
    Python dict repr str(obj) — same information, ~20-30% fewer tokens, and no
    single-quote/None/True artifacts for the model to mimic back."""
    try:
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    except (TypeError, ValueError):
        return str(obj)


def _null_safe(s: Optional[str], is_en: bool = False) -> str:
    # Profile fields are user-controlled -> neutralize before inlining into the prompt.
    if is_en:
        return clean_field(s) if (s and str(s).strip()) else "(not specified)"
    return clean_field(s) if (s and str(s).strip()) else "(non renseigné)"


def _join_list(lst: Optional[list], is_en: bool = False) -> str:
    if is_en:
        return ", ".join(clean_field(x) for x in lst) if lst else "(not specified)"
    return ", ".join(clean_field(x) for x in lst) if lst else "(non renseigné)"


def _format_portfolio(portfolio: Optional[list], is_en: bool = False) -> str:
    if is_en:
        if not portfolio:
            return "(not specified)"
        lines = []
        for p in portfolio:
            if not isinstance(p, dict):
                continue
            name = clean_field((p.get("name") or "").strip()) or "(no name)"
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
            name = clean_field((p.get("name") or "").strip()) or "(sans nom)"
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
    max_output_tokens: int = 16000  # per-agent output cap — generous default to avoid truncation
    mission: str = ""
    framework_note: str = ""  # canonical framework definition (set on framework agents)

    # ── conditional skip (only Agent 11 overrides) ──
    def skip_reason(self, profile: Optional[dict]) -> Optional[str]:
        """Human-readable reason this agent should be skipped for this profile,
        or None to run. Surfaced verbatim to the user (pipeline + module tab) so a
        blank output is always explained."""
        return None

    def is_conditional(self, profile: Optional[dict]) -> bool:
        return self.skip_reason(profile) is not None

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
                f"- Sub-sectors (NACE): {_join_list(profile.get('subSectors'), True)}\n"
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
                f"- Sous-secteurs (NACE) : {_join_list(profile.get('subSectors'))}\n"
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
            return f"Available financial data:\n{neutralize(_compact(finance))}\n\n"
        return f"Données financières disponibles :\n{neutralize(_compact(finance))}\n\n"

    def documents_context(self, deps: Optional[dict], is_en: bool = False) -> str:
        if not deps:
            return ""
        docs = deps.get(DOCUMENTS_KEY)
        if not docs:
            return ""
        # User-uploaded document text is the prime INDIRECT prompt-injection vector:
        # wrap it as sealed, data-only content (never trusted as instructions).
        return wrap_untrusted(docs, "DOCUMENTS UTILISATEUR", "USER DOCUMENTS", is_en) + "\n"

    def dependency_context(self, deps: Optional[dict], is_en: bool = False) -> str:
        if not deps:
            return ""
        out = self.documents_context(deps, is_en)
        agent_deps = {k: v for k, v in deps.items() if k >= 0}
        if agent_deps:
            # Previous agents' outputs can carry a propagated injection from a poisoned
            # document, so they are wrapped as data-only too (used for synthesis, not obeyed).
            body = "".join(f"Agent {aid}: {_compact(agent_deps[aid])}\n\n" for aid in sorted(agent_deps))
            out += wrap_untrusted(
                body, "SORTIES DES AGENTS PRECEDENTS", "PREVIOUS AGENT OUTPUTS",
                is_en, max_chars=MAX_DEP_CHARS,
            )
        return out

    def build_system_prompt(
        self,
        profile: Optional[dict],
        finance: Optional[dict],
        deps: Optional[dict],
        language: str = "fr",
        correction_notes: Optional[str] = None,
    ) -> str:
        is_en = language.lower().startswith("en")
        parts = [self.preamble(profile, is_en)]
        # Anchor the whole analysis to the server's real "today" (current quarter) so
        # roadmaps/milestones are dated forward, not from a stale year (see _date_context).
        parts.append(_date_context(is_en))
        # Canonical fact-sheet + numeric-discipline contract — shared by EVERY agent
        # so figures stay consistent across the whole analysis (see factsheet.py).
        parts.append(build_factsheet(profile, finance))
        # Run-stable shared rules also live in the cached prefix: they are identical for
        # every agent of a run (language is per-run), so caching them saves ~600 tokens
        # per agent instead of billing them 17 times.
        parts.append(_rigor_rules(is_en))
        # Cache breakpoint: everything above (company context + date + fact-sheet + shared
        # rules) is identical for every agent in a run, so it is cached and billed once.
        parts.append(CACHE_SENTINEL)
        if self.uses_finance:
            parts.append(self.finance_context(finance, is_en))
        parts.append(self.dependency_context(deps, is_en))
        parts.append(self.mission)
        if self.framework_note:
            parts.append(self.framework_note)
        if is_en:
            parts.append("\n\nIMPORTANT: Write your entire response (all field values) in English.\n")
            parts.append(
                "\n\n=== OUTPUT CONTRACT ===\n"
                "Fill every required field of the tool schema (never an empty object). If data is "
                "missing, provide a relevant default (e.g. 'To define') rather than omitting the key. "
                "Never dump lists as markdown inside a free-text field: use the arrays/objects provided."
            )
        else:
            pass  # shared rules are in the cached prefix (see _rigor_rules)
            parts.append(
                "\n\n=== CONTRAT DE SORTIE ===\n"
                "Remplis chaque champ obligatoire du schéma de l'outil (jamais d'objet vide). Si une "
                "donnée manque, fournis une valeur par défaut pertinente (ex. « À définir ») plutôt que "
                "d'omettre la clé. Ne mets jamais de listes en markdown dans un champ texte libre : "
                "utilise les tableaux/objets prévus."
            )
        if correction_notes:
            parts.append(
                "\n\n=== CORRECTIONS DEMANDÉES (régénération ciblée) ===\n"
                "Une passe de contrôle de cohérence a détecté des incohérences impliquant ta sortie "
                "précédente. Régénère ta réponse COMPLÈTE en corrigeant SPÉCIFIQUEMENT les points "
                "suivants, tout en respectant les faits canoniques et les règles de cohérence numérique :\n"
                f"{correction_notes}\n"
            )
        return "".join(parts)
