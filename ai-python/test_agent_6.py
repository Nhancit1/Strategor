import urllib.request
import json
import urllib.error
from pprint import pprint

url = "http://localhost:8000/analyze"
data = {
    "projectId": "6a2aeb23bd9ec8ad75c11cd0",
    "mode": "standard",
    "language": "fr",
    "phase": "single",
    "targetAgentId": 6,
    "seedOutputs": {
        "5": {"test": "data for agent 5"}
    },
    "profile": {"companyName": "Test"},
    "financeLite": None,
    "documentsContext": None
}
data_encoded = json.dumps(data).encode('utf-8')
req = urllib.request.Request(url, data=data_encoded, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req, timeout=30)
    print("Status:", response.status)
    print("Response:")
    pprint(json.loads(response.read().decode('utf-8')))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
