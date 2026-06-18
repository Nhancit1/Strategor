// Mirror of ai-python/app/agents/definitions.py `depends_on`, used to propagate staleness
// when a validation-page edit changes an upstream module. Keep in sync with the Python graph.
export const DEPENDS_ON = {
  1: [], 2: [1], 3: [1], 4: [1], 5: [2, 3, 4, 9, 10], 6: [5, 11, 17], 7: [5, 6],
  8: [5, 6, 7, 11, 12, 13, 14], 9: [1, 4], 10: [1], 11: [5], 12: [6],
  13: [5, 6], 14: [5, 6], 15: [5, 6, 7, 8, 11, 12, 13, 14], 16: [5, 6, 7, 8, 11, 12, 13, 14],
  17: [5, 11],
};

// Reverse adjacency: agent -> agents that directly depend on it.
const DEPENDENTS = {};
for (const [id, deps] of Object.entries(DEPENDS_ON)) {
  for (const d of deps) {
    if (!DEPENDENTS[d]) DEPENDENTS[d] = [];
    DEPENDENTS[d].push(Number(id));
  }
}

// All agents (transitively) downstream of `agentId`, excluding itself.
export function transitiveDependents(agentId) {
  const out = new Set();
  const queue = [Number(agentId)];
  while (queue.length) {
    const cur = queue.pop();
    for (const dep of DEPENDENTS[cur] || []) {
      if (!out.has(dep)) { out.add(dep); queue.push(dep); }
    }
  }
  return [...out];
}
