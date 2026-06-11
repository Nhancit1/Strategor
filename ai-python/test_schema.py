import json
import asyncio
import sys

from app.agents.definitions import Agent8Deliverables
from app.claude_client import generate_structured, ModelTier

async def main():
    agent = Agent8Deliverables()
    
    # We provide a very short fake context
    deps = {
        5: {"urgency_level": "RED", "ceo_verdict": "Situation critique"},
        6: {"strategic_axes": [{"title": "Croissance"}]},
        7: {"kpis": [{"name": "CA"}]},
        12: {"change_strategy": "Urgence"}
    }
    
    prompt = agent.build_system_prompt(None, None, deps, "fr")
    
    res = await generate_structured(
        agent_name=agent.agent_name,
        system_prompt=prompt,
        output_schema=agent.output_schema,
        tier=ModelTier.HAIKU, # fast for test
        user_prompt="Lance ton analyse maintenant.",
        max_tokens=4096
    )
    
    print("OUTPUT:", json.dumps(res.payload, indent=2))

asyncio.run(main())
