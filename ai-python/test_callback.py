import asyncio
import httpx

async def test():
    url = "http://localhost:4000/internal/projects/test/agent-events"
    headers = {"X-Internal-Token": "3986516956408f16ee57293d7cfa920a04e5c0e8693ee24e1c86c5bebabce90d"}
    payload = {"agentId": 1, "agentName": "Test", "status": "RUNNING", "progress": 10}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            print(resp.status_code, resp.text)
    except Exception as e:
        print(e)

asyncio.run(test())
