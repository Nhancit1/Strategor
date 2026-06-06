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


async def post_agent_event(project_id: str, event: dict) -> None:
    url = f"{settings.node_url}/internal/projects/{project_id}/agent-events"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(url, json=event, headers=_headers)
    except Exception as e:  # never let a callback failure kill the pipeline
        log.warning("agent-event callback failed (%s): %s", project_id, e)


async def post_analysis_complete(project_id: str, failed: bool = False, phase: str = "full") -> None:
    url = f"{settings.node_url}/internal/projects/{project_id}/analysis-complete"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(url, json={"failed": failed, "phase": phase}, headers=_headers)
    except Exception as e:
        log.warning("analysis-complete callback failed (%s): %s", project_id, e)


async def post_document_parsed(document_id: str, parsed_content: str | None,
                               status: str, parse_error: str | None = None) -> None:
    url = f"{settings.node_url}/internal/documents/{document_id}/parsed"
    payload = {"parsedContent": parsed_content, "status": status, "parseError": parse_error}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(url, json=payload, headers=_headers)
    except Exception as e:
        log.warning("document-parsed callback failed (%s): %s", document_id, e)
