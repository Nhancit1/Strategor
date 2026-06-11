"""
The 12 Strategor agents. Metadata mirrors the Spring AgentDefinition beans;
missions and JSON Schemas come verbatim from prompts.py.

Execution DAG (computed from depends_on by the orchestrator):
  L0: 1
  L1: 2, 3, 4, 10
  L2: 9            (depends on 4)
  L3: 5            (depends on 2,3,4,9,10)
  L4: 6, 11        (depend on 5)
  L5: 7, 12        (depend on 6 / 5,6)
  L6: 8            (depends on 5,6,7,12)
"""
from typing import Optional
from .base import Agent
from .prompts import MISSIONS, SCHEMAS
from ..deepseek_client import ModelTier


class Agent1Profile(Agent):
    agent_id = 1
    agent_name = "Profil & Contexte"
    category = "PROFILE"
    tier = ModelTier.HAIKU
    depends_on = []
    active_in_modes = ["quick", "standard", "comprehensive"]
    uses_finance = True
    mission = MISSIONS[1]
    output_schema = SCHEMAS[1]


class Agent2Pestel(Agent):
    agent_id = 2
    agent_name = "Analyse PESTEL"
    category = "EXTERNAL_ANALYSIS"
    tier = ModelTier.SONNET
    depends_on = [1]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    uses_web_search = True
    mission = MISSIONS[2]
    output_schema = SCHEMAS[2]


class Agent3Swot(Agent):
    agent_id = 3
    agent_name = "Analyse SWOT"
    category = "INTERNAL_ANALYSIS"
    tier = ModelTier.SONNET
    depends_on = [1]
    active_in_modes = ["quick", "standard", "comprehensive"]
    uses_finance = True
    mission = MISSIONS[3]
    output_schema = SCHEMAS[3]


class Agent4Competition(Agent):
    agent_id = 4
    agent_name = "Intelligence compétitive"
    category = "EXTERNAL_ANALYSIS"
    tier = ModelTier.SONNET
    depends_on = [1]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    uses_web_search = True
    mission = MISSIONS[4]
    output_schema = SCHEMAS[4]


class Agent5Diagnostic(Agent):
    agent_id = 5
    agent_name = "Diagnostic consolidé"
    category = "SYNTHESIS"
    tier = ModelTier.OPUS
    depends_on = [2, 3, 4, 9, 10]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    uses_web_search = True
    mission = MISSIONS[5]
    output_schema = SCHEMAS[5]


class Agent6Strategy(Agent):
    agent_id = 6
    agent_name = "Axes stratégiques & roadmap"
    category = "STRATEGY"
    tier = ModelTier.SONNET
    depends_on = [5]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    mission = MISSIONS[6]
    output_schema = SCHEMAS[6]


class Agent7Kpis(Agent):
    agent_id = 7
    agent_name = "KPIs & tableau de bord"
    category = "MEASUREMENT"
    tier = ModelTier.SONNET
    depends_on = [5, 6]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = True
    mission = MISSIONS[7]
    output_schema = SCHEMAS[7]


class Agent8Deliverables(Agent):
    agent_id = 8
    agent_name = "Livrables finaux"
    category = "DELIVERABLES"
    tier = ModelTier.SONNET
    depends_on = [5, 6, 7, 12]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    mission = MISSIONS[8]
    output_schema = SCHEMAS[8]


class Agent9Porter(Agent):
    agent_id = 9
    agent_name = "5 Forces de Porter"
    category = "EXTERNAL_ANALYSIS"
    tier = ModelTier.SONNET
    depends_on = [1, 4]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    uses_web_search = True
    mission = MISSIONS[9]
    output_schema = SCHEMAS[9]


class Agent10ValueChain(Agent):
    agent_id = 10
    agent_name = "Chaîne de valeur"
    category = "INTERNAL_ANALYSIS"
    tier = ModelTier.SONNET
    depends_on = [1]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = True
    mission = MISSIONS[10]
    output_schema = SCHEMAS[10]


class Agent11Bcg(Agent):
    agent_id = 11
    agent_name = "Matrice BCG"
    category = "STRATEGY"
    tier = ModelTier.SONNET
    depends_on = [5]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    uses_web_search = True
    mission = MISSIONS[11]
    output_schema = SCHEMAS[11]

    # BCG is skipped for micro / very-early companies (mono-offer common).
    def is_conditional(self, profile: Optional[dict]) -> bool:
        if not profile:
            return False
        if profile.get("teamSize") == "1-10":
            return True
        if profile.get("stage") in ("idea", "early"):
            return True
        return False


class Agent12Change(Agent):
    agent_id = 12
    agent_name = "Conduite du changement"
    category = "CHANGE"
    tier = ModelTier.SONNET
    depends_on = [6]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    mission = MISSIONS[12]
    output_schema = SCHEMAS[12]



class Agent13RiskRegister(Agent):
    agent_id = 13
    agent_name = "Registre de risques"
    category = "RISK"
    tier = ModelTier.SONNET
    depends_on = [5, 6]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    mission = MISSIONS[13]
    output_schema = SCHEMAS[13]

class Agent14Finance(Agent):
    agent_id = 14
    agent_name = "Analyse financière & scénarios"
    category = "FINANCE"
    tier = ModelTier.SONNET
    depends_on = [5, 6]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = True
    mission = MISSIONS[14]
    output_schema = SCHEMAS[14]

class Agent15Consistency(Agent):
    agent_id = 15
    agent_name = "Contrôle de cohérence"
    category = "REVIEW"
    tier = ModelTier.SONNET
    depends_on = [5, 6, 7, 8, 12]
    active_in_modes = ["standard", "comprehensive"]
    uses_finance = False
    mission = MISSIONS[15]
    output_schema = SCHEMAS[15]

ALL_AGENTS = [
    Agent1Profile(), Agent2Pestel(), Agent3Swot(), Agent4Competition(),
    Agent5Diagnostic(), Agent6Strategy(), Agent7Kpis(), Agent8Deliverables(),
    Agent9Porter(), Agent10ValueChain(), Agent11Bcg(), Agent12Change(),
    Agent13RiskRegister(),
    Agent14Finance(),
    Agent15Consistency(),
]
