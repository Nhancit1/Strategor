"""
Agent registry + execution-level computation.
Port of AgentRegistry + AgentOrchestrator.buildExecutionLevels / computeLevel.
"""
from .base import Agent
from .definitions import ALL_AGENTS

_BY_ID: dict[int, Agent] = {}
for _a in ALL_AGENTS:
    if _a.agent_id in _BY_ID:
        raise RuntimeError(f"Duplicate agent id: {_a.agent_id}")
    _BY_ID[_a.agent_id] = _a


def get_or_raise(agent_id: int) -> Agent:
    if agent_id not in _BY_ID:
        raise KeyError(f"Agent inconnu : {agent_id}")
    return _BY_ID[agent_id]


def active_for_mode(mode: str) -> list[Agent]:
    """Agents enabled for a mode, sorted by id (matches AgentRegistry.activeForMode)."""
    return sorted(
        (a for a in ALL_AGENTS if mode in a.active_in_modes),
        key=lambda a: a.agent_id,
    )


def _compute_level(agent: Agent, by_id: dict[int, Agent], levels: dict[int, int]) -> int:
    if agent.agent_id in levels:
        return levels[agent.agent_id]
    max_level = 0
    for dep_id in agent.depends_on:
        dep = by_id.get(dep_id)
        if dep is not None:
            max_level = max(max_level, _compute_level(dep, by_id, levels) + 1)
    levels[agent.agent_id] = max_level
    return max_level


def build_execution_levels(agents: list[Agent]) -> list[list[Agent]]:
    """Group agents into topological levels; agents in the same level run in parallel."""
    by_id = {a.agent_id: a for a in agents}
    levels: dict[int, int] = {}
    for a in agents:
        _compute_level(a, by_id, levels)

    grouped: dict[int, list[Agent]] = {}
    for aid, lvl in levels.items():
        grouped.setdefault(lvl, []).append(by_id[aid])

    return [
        sorted(grouped[lvl], key=lambda a: a.agent_id)
        for lvl in sorted(grouped)
    ]
