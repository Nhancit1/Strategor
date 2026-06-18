import json
import re

log_path = "debug_resp_Intelligence compétitive.log"

with open(log_path, "r") as f:
    text = f.read()

# Extract JSON from the markdown response (mimicking claude_client.py)
match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
if match:
    json_str = match.group(1)
else:
    json_str = text.strip()
    start = json_str.find('{')
    end = json_str.rfind('}')
    if start != -1 and end != -1:
        json_str = json_str[start:end+1]

print(f"Total characters: {len(json_str)}")
try:
    json.loads(json_str)
    print("Parsed successfully!")
except Exception as e:
    print(f"Parsing failed: {e}")
    # Print the lines around the error
    lines = json_str.splitlines()
    err_str = str(e)
    m = re.search(r"line (\d+) column (\d+)", err_str)
    if m:
        line_num = int(m.group(1))
        col_num = int(m.group(2))
        print(f"\nLines around error (line {line_num}):")
        start_l = max(0, line_num - 5)
        end_l = min(len(lines), line_num + 5)
        for i in range(start_l, end_l):
            prefix = "--> " if i + 1 == line_num else "    "
            print(f"{prefix}{i+1}: {lines[i]}")
            if i + 1 == line_num:
                print(" " * (col_num + 3) + "^")
