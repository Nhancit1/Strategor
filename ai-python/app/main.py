"""
Strategor AI/export microservice (FastAPI).

Endpoints (all called by the Node backend, guarded by the internal token):
  POST /analyze            -> kick off the 12-agent pipeline (background)
  POST /parse              -> extract text from an uploaded document (background)
  POST /export/{format}    -> render docx|pdf|pptx|xlsx, return the file bytes
  GET  /health             -> healthcheck
"""
import io
import hmac
import logging
import asyncio

from fastapi import FastAPI, BackgroundTasks, Header, HTTPException, Response

from .config import settings
from .models import AnalyzeRequest, ParseRequest, ExportRequest, CancelRequest
from .orchestrator import run_analysis
from .parsing.parser import extract_text
from .exporters import get_exporter
from . import callbacks

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
log = logging.getLogger("strategor.ai")

app = FastAPI(
    title="Strategor AI Service",
    version="2.0.0",
    # Hide the API schema by default (internal service). Enable only via AI_DOCS_ENABLED=true.
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

# Optional Host header allow-list (defence against Host-header attacks / direct access).
if settings.allowed_hosts:
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

_MIME = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _check_internal(token: str | None):
    # Constant-time comparison: avoids leaking the token byte-by-byte via response timing.
    if not token or not hmac.compare_digest(token, settings.internal_token):
        raise HTTPException(status_code=401, detail="Internal auth failed")


@app.get("/health")
async def health():
    return {"status": "UP", "service": "ai"}


ACTIVE_TASKS: dict[str, asyncio.Task] = {}


@app.post("/analyze", status_code=202)
async def analyze(req: AnalyzeRequest, x_internal_token: str | None = Header(default=None)):
    _check_internal(x_internal_token)
    # Run the pipeline in the background; progress streams back to Node.
    task = asyncio.create_task(run_analysis(req))
    ACTIVE_TASKS[req.projectId] = task

    def _cleanup(t):
        ACTIVE_TASKS.pop(req.projectId, None)

    task.add_done_callback(_cleanup)
    return {"accepted": True, "projectId": req.projectId}


@app.post("/analyze/cancel", status_code=200)
async def cancel_analyze(req: CancelRequest, x_internal_token: str | None = Header(default=None)):
    _check_internal(x_internal_token)
    task = ACTIVE_TASKS.get(req.projectId)
    if task:
        task.cancel()
        log.info("Requested cancellation for project task: %s", req.projectId)
        return {"cancelled": True, "projectId": req.projectId}
    log.warning("No active task found for project to cancel: %s", req.projectId)
    return {"cancelled": False, "projectId": req.projectId, "message": "No active task found"}


@app.post("/parse", status_code=202)
async def parse(req: ParseRequest, background: BackgroundTasks,
                x_internal_token: str | None = Header(default=None)):
    _check_internal(x_internal_token)
    background.add_task(_parse_and_callback, req)
    return {"accepted": True, "documentId": req.documentId}


async def _parse_and_callback(req: ParseRequest):
    try:
        text = extract_text(req.storagePath, req.filename, req.mimeType)
        log.info("Parsed %s (%d chars)", req.filename, len(text))
        await callbacks.post_document_parsed(req.documentId, text, "DONE")
    except Exception as e:
        log.exception("Parse failed for %s: %s", req.filename, e)
        await callbacks.post_document_parsed(req.documentId, None, "ERROR", str(e))


@app.post("/export/{fmt}")
async def export(fmt: str, req: ExportRequest,
                 x_internal_token: str | None = Header(default=None)):
    _check_internal(x_internal_token)
    try:
        exporter = get_exporter(fmt)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        data = exporter(req.project, req.executions, req.language)
    except Exception as e:
        log.exception("Export %s failed: %s", fmt, e)
        raise HTTPException(status_code=500, detail=f"Export {fmt} échoué : {e}")
    filename = f"strategie-{req.project.id}.{fmt}"
    return Response(
        content=data,
        media_type=_MIME[fmt.lower()],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
