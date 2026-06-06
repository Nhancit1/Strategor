from typing import Any, Optional
from pydantic import BaseModel

# ── /analyze request ────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    projectId: str
    mode: str = "standard"            # quick | standard | comprehensive
    language: str = "fr"
    profile: Optional[dict[str, Any]] = None      # OnboardingProfile JSON
    financeLite: Optional[dict[str, Any]] = None  # FinanceLite JSON
    documentsContext: Optional[str] = None        # pre-assembled doc text
    # ── Two-phase flow (Agent 1 hypotheses review) ──
    phase: str = "full"               # "profile" | "full" | "single" | "all"
    seedOutputs: Optional[dict[str, Any]] = None  # precomputed agent outputs, e.g. {"1": {...}}
    targetAgentId: Optional[int] = None           # for phase="single": which agent to (re)run


# ── /parse request ──────────────────────────────────────────────────
class ParseRequest(BaseModel):
    documentId: str
    storagePath: str
    filename: str
    mimeType: Optional[str] = None

# ── /export request ─────────────────────────────────────────────────
class ExportProject(BaseModel):
    id: str
    name: str
    analysisMode: Optional[str] = "standard"

class ExportExecution(BaseModel):
    agentId: int
    agentName: Optional[str] = None
    status: str
    output: Optional[Any] = None
    modelUsed: Optional[str] = None
    tokensInput: Optional[int] = None
    tokensOutput: Optional[int] = None
    costEstimateCents: Optional[int] = None

class ExportRequest(BaseModel):
    project: ExportProject
    executions: list[ExportExecution] = []
