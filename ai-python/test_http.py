import http.client
import json
import os

# Read payload
with open("payload.json", "r") as f:
    payload_data = json.load(f)

# Use 127.0.0.1 instead of localhost to avoid DNS resolution (/etc/resolv.conf etc.)
conn = http.client.HTTPConnection("127.0.0.1", 8000, timeout=120)
headers = {
    "Content-Type": "application/json",
    "X-Internal-Token": os.environ.get("INTERNAL_TOKEN", "")
}

try:
    print("Sending POST request to 127.0.0.1:8000/analyze...")
    conn.request("POST", "/analyze", body=json.dumps(payload_data), headers=headers)
    response = conn.getresponse()
    print("Status:", response.status)
    print("Response data:", response.read().decode("utf-8"))
except Exception as e:
    print("Request failed:", e)
finally:
    conn.close()
