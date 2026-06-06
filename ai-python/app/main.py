"""
Strategor AI/export microservice (FastAPI).

Endpoints (all called by the Node backend, guarded by the internal token):
  POST /analyze            -> kick off the 12-agent pipeline (background)
  POST /parse              -> extract text from an uploaded document (background)
  POST /export/{format}    -> render docx|pdf|pptx|xlsx, return the file bytes
  GET  /health             -> healthcheck
"""
import io
import logging

from fastapi import FastAPI, BackgroundTasks, Header, HTTPException, Response

from .config import settings
from .models import AnalyzeRequest, ParseRequest, ExportRequest
from .orchestrator import run_analysis
from .parsing.parser import extract_text
from .exporters import get_exporter
from . import callbacks

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
log = logging.getLogger("strategor.ai")

app = FastAPI(title="Strategor AI Service", version="2.0.0")

_MIME = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _check_internal(token: str | None):
    if token != settings.internal_token:
        raise HTTPException(status_code=401, detail="Internal auth failed")


@app.get("/health")
async def health():
    return {"status": "UP", "service": "ai"}


@app.post("/analyze", status_code=202)
async def analyze(req: AnalyzeRequest, background: BackgroundTasks,
                  x_internal_token: str | None = Header(default=None)):
    _check_internal(x_internal_token)
    # Run the pipeline in the background; progress streams back to Node.
    background.add_task(run_analysis, req)
    return {"accepted": True, "projectId": req.projectId}


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
        data = exporter(req.project, req.executions)
    except Exception as e:
        log.exception("Export %s failed: %s", fmt, e)
        raise HTTPException(status_code=500, detail=f"Export {fmt} échoué : {e}")
    filename = f"strategie-{req.project.id}.{fmt}"
    return Response(
        content=data,
        media_type=_MIME[fmt.lower()],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
