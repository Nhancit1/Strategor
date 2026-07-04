"""
HTTP callbacks back into the Node backend (guarded by the shared internal token).
Python is stateless: it never touches Mongo. It streams results to Node, which
persists them and broadcasts over Socket.IO.
"""
import logging
import httpx
from .config import settings

log = logging.getLogger("strategor.callbacks")

_headers = {"X-Internal-Token": settings.internal_token}


async def _post(url: str, payload: dict, label: str, key: str) -> None:
    """POST to Node; log (never raise) on network errors AND on non-2xx responses.
    httpx does not raise on 4xx/5xx by itself — without raise_for_status a Node-side
    500 was silently treated as success, so persistence failures were invisible."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=_headers)
            resp.raise_for_status()
    except Exception as e:  # never let a callback failure kill the pipeline
        log.warning("%s callback failed (%s): %s", label, key, e)


async def post_agent_event(project_id: str, event: dict) -> None:
    url = f"{settings.node_url}/internal/projects/{project_id}/agent-events"
    await _post(url, event, "agent-event", project_id)


async def post_analysis_complete(project_id: str, failed: bool = False, phase: str = "full") -> None:
    url = f"{settings.node_url}/internal/projects/{project_id}/analysis-complete"
    await _post(url, {"failed": failed, "phase": phase}, "analysis-complete", project_id)


async def post_consistency_report(project_id: str, report: dict) -> None:
    """Persist the deterministic numeric-integrity report on the project."""
    url = f"{settings.node_url}/internal/projects/{project_id}/consistency-report"
    await _post(url, {"report": report}, "consistency-report", project_id)


async def post_document_parsed(document_id: str, parsed_content: str | None,
                               status: str, parse_error: str | None = None) -> None:
    url = f"{settings.node_url}/internal/documents/{document_id}/parsed"
    payload = {"parsedContent": parsed_content, "status": status, "parseError": parse_error}
    await _post(url, payload, "document-parsed", document_id)
