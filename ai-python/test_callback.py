import asyncio
import httpx
import os

async def test():
    url = "http://localhost:4000/internal/projects/test/agent-events"
    headers = {"X-Internal-Token": os.environ.get("INTERNAL_TOKEN", "")}
    payload = {"agentId": 1, "agentName": "Test", "status": "RUNNING", "progress": 10}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            print(resp.status_code, resp.text)
    except Exception as e:
        print(e)

asyncio.run(test())
