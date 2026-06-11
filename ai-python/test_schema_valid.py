import json
import sys
sys.path.append("/Users/khalidabourkia/Desktop/strategor-mern 2/ai-python")
from app.agents.definitions import Agent8Deliverables
from jsonschema import Draft7Validator

agent = Agent8Deliverables()
schema = agent.output_schema

try:
    Draft7Validator.check_schema(schema)
    print("Schema is VALID.")
except Exception as e:
    print("Schema is INVALID:", e)
