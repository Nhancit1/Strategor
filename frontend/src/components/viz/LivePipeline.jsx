import { useMemo, useState, useEffect } from 'react';

/**
 * Live agent pipeline — the at-a-glance view of a running analysis.
 *
 *  • Status is the primary encoding: waiting (grey) · running (orange + pulse + progress bar)
 *    · done (green ✓) · error (red, click to relaunch) · skipped (dashed).
 *  • 7 phase columns mirror the real DAG (Cadrage → Analyse → Diagnostic → Stratégie → Plan →
 *    Livrables → Revue). Only the agents actually present in `agents` are drawn, so the picture
 *    is correct whether the run has 16 or 17 agents.
 *  • Hovering a node reveals its impact: solid blue arrows to what it feeds (downstream),
 *    faint dashed lines from what feeds it, everything else dims. Default view stays clean.
 *
 * Fed by the same `agents` array the page already streams over WebSocket — no extra wiring.
 */

const PHASES = [
  { key: 'cadrage', label: 'Cadrage', ids: [1] },
  { key: 'analyse', label: 'Analyse', ids: [2, 3, 4, 9, 10] },
  { key: 'diagnostic', label: 'Diagnostic', ids: [5] },
  { key: 'strategie', label: 'Stratégie', ids: [11, 17, 6] },
  { key: 'plan', label: 'Plan', ids: [7, 12, 13, 14] },
  { key: 'livrables', label: 'Livrables', ids: [8] },
  { key: 'revue', label: 'Revue', ids: [15, 16] },
];

const SHORT = {
  1: 'Profil', 2: 'PESTEL', 3: 'SWOT', 4: 'Intel.comp', 5: 'Diagnostic',
  6: 'Axes strat', 7: 'KPIs', 8: 'Livrables', 9: 'Porter', 10: 'Ch.valeur',
  11: 'BCG', 12: 'Change', 13: 'Risques', 14: 'Finance', 15: 'Cohérence',
  16: 'Revue', 17: 'Options',
};

const FULL = {
  1: 'Profil & Contexte', 2: 'Analyse PESTEL', 3: 'Analyse SWOT',
  4: 'Intelligence compétitive', 5: 'Diagnostic consolidé', 6: 'Axes stratégiques & roadmap',
  7: 'KPIs & tableau de bord', 8: 'Livrables finaux', 9: 'Forces de Porter',
  10: 'Chaîne de valeur', 11: 'Matrice BCG', 12: 'Conduite du changement',
  13: 'Registre de risques', 14: 'Analyse financière', 15: 'Contrôle de cohérence',
  16: 'Revue stratégique', 17: 'Options stratégiques',
};

// Dependency graph (mirror of the agents' declared depends_on). Includes Agent 17;
// if it isn't part of the run, edges to/from it simply aren't drawn.
const DEPS = {
  1: [], 2: [1], 3: [1], 4: [1], 5: [2, 3, 4, 9, 10], 6: [5, 11, 17], 7: [5, 6],
  8: [5, 6, 7, 11, 12, 13, 14], 9: [1, 4], 10: [1], 11: [5], 12: [6],
  13: [5, 6], 14: [5, 6], 15: [5, 6, 7, 8, 11, 12, 13, 14], 16: [5, 6, 7, 8, 11, 12, 13, 14], 17: [5, 11],
};

const C = {
  PENDING: { fill: '#FFFFFF', stroke: '#E2DDD4', text: '#6E6A62', sub: '#9A958C' },
  RUNNING: { fill: '#FDF1E8', stroke: '#E8621A', text: '#1C1A17', sub: '#C04E10' },
  DONE: { fill: '#EAF3EE', stroke: '#1E5C38', text: '#1E5C38', sub: '#1E5C38' },
  ERROR: { fill: '#FBEAEA', stroke: '#C0392B', text: '#C0392B', sub: '#C0392B' },
  SKIPPED: { fill: '#F2F0EC', stroke: '#D8D3CA', text: '#9A958C', sub: '#9A958C' },
};

const COLW = 152, NW = 124, NH = 48, PADX = 14, HEADER = 30, ROWH = 64, TOPGAP = 12;
const FEED = '#1B3E6A';

function statusLabel(s) {
  return s === 'RUNNING' ? 'En cours'
    : s === 'DONE' ? 'Terminé'
    : s === 'ERROR' ? 'Erreur'
    : s === 'SKIPPED' ? 'Non applicable'
    : 'En attente';
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function PipelineNode({ n, a, hovered, setHovered, lit, onRegenerate, onOpenValidation }) {
  const status = a?.status || 'PENDING';
  const col = C[status] || C.PENDING;
  const dim = lit && !lit.has(n.id);
  const isRunning = status === 'RUNNING';
  const basePct = Math.max(0, Math.min(100, Math.round(a?.progressPercent || 0)));
  const clickable = status === 'ERROR' || status === 'DONE';

  const [displayPct, setDisplayPct] = useState(basePct);

  useEffect(() => {
    setDisplayPct(basePct);
  }, [basePct]);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setDisplayPct((prev) => {
          if (prev < 95) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const pct = isRunning ? displayPct : basePct;

  return (
    <g
      opacity={dim ? 0.3 : 1}
      style={{ cursor: clickable ? 'pointer' : 'default', transition: 'opacity .2s' }}
      onMouseEnter={() => setHovered(n.id)}
      onMouseLeave={() => setHovered((h) => (h === n.id ? null : h))}
      onClick={() => {
        if (status === 'ERROR') { if (onRegenerate) onRegenerate(n.id); }
        else if (status === 'DONE') { if (onOpenValidation) onOpenValidation(n.id); }
      }}
    >
      {isRunning && (
        <rect className="lpipe-halo" x={n.x - 3} y={n.y - 3} width={NW + 6} height={NH + 6} rx="12" fill="none" stroke="#E8621A" strokeWidth="3" />
      )}
      <rect
        x={n.x}
        y={n.y}
        width={NW}
        height={NH}
        rx="10"
        fill={col.fill}
        stroke={col.stroke}
        strokeWidth="1.5"
        strokeDasharray={status === 'SKIPPED' ? '5 4' : '0'}
      >
        {status === 'SKIPPED' && a?.statusMessage && <title>{a.statusMessage}</title>}
      </rect>
      <text x={n.x + 10} y={n.y + 18} fontFamily="DM Sans, sans-serif" fontSize="11" fill={col.sub}>#{n.id}</text>
      <text x={n.x + 10} y={n.y + 33} fontFamily="Comfortaa, sans-serif" fontSize="12" fontWeight="700" fill={col.text}>
        {SHORT[n.id] || `Agent ${n.id}`}
      </text>
      <text x={n.x + NW - 11} y={n.y + 18} textAnchor="middle" fontSize="13" fontWeight="700" fill={col.stroke}>
        {status === 'DONE' ? '\u2713' : status === 'ERROR' ? '!' : status === 'SKIPPED' ? '\u229d' : ''}
      </text>
      {isRunning && (
        <>
          <rect x={n.x + 10} y={n.y + NH - 11} width={NW - 20} height={4} rx="2" fill="#F2D9C8" />
          <rect x={n.x + 10} y={n.y + NH - 11} width={((NW - 20) * pct) / 100} height={4} rx="2" fill="#E8621A" />
          <text x={n.x + NW - 11} y={n.y + NH - 6} textAnchor="end" fontFamily="DM Sans, sans-serif" fontSize="9" fill="#C04E10">{pct}%</text>
        </>
      )}
    </g>
  );
}

export default function LivePipeline({ agents = [], onRegenerate, onOpenValidation }) {
  const [hovered, setHovered] = useState(null);

  const byId = useMemo(() => {
    const m = {};
    for (const a of agents) m[a.agentId] = a;
    return m;
  }, [agents]);

  const { nodes, width, height } = useMemo(() => {
    const present = (ids) => ids.filter((id) => byId[id]);
    const maxRows = Math.max(1, ...PHASES.map((p) => present(p.ids).length));
    const contentTop = HEADER + TOPGAP;
    const colHeight = maxRows * ROWH;
    const out = {};
    PHASES.forEach((p, c) => {
      const ids = present(p.ids);
      const startY = contentTop + (colHeight - ids.length * ROWH) / 2;
      ids.forEach((id, r) => {
        const x = PADX + c * COLW + (COLW - NW) / 2;
        const y = startY + r * ROWH;
        out[id] = { id, x, y, cy: y + NH / 2 };
      });
    });
    return {
      nodes: out,
      width: PADX * 2 + PHASES.length * COLW,
      height: contentTop + colHeight + TOPGAP,
    };
  }, [byId]);

  const { feeds, fedBy, lit } = useMemo(() => {
    if (hovered == null || !nodes[hovered]) return { feeds: [], fedBy: [], lit: null };
    const litSet = new Set([hovered]);
    const f = [];
    const fb = [];
    for (const [idStr, deps] of Object.entries(DEPS)) {
      const id = Number(idStr);
      if (deps.includes(hovered) && nodes[id]) { f.push([hovered, id]); litSet.add(id); }
    }
    for (const dep of DEPS[hovered] || []) {
      if (nodes[dep]) { fb.push([dep, hovered]); litSet.add(dep); }
    }
    return { feeds: f, fedBy: fb, lit: litSet };
  }, [hovered, nodes]);

  const path = (a, b) => {
    const s = nodes[a], t = nodes[b];
    if (!s || !t) return '';
    const sx = s.x + NW, sy = s.cy, tx = t.x, ty = t.cy;
    const dx = Math.max(34, Math.abs(tx - sx) * 0.5);
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  };

  const ha = hovered != null ? byId[hovered] : null;

  return (
    <div>
      <div className="mb-2 h-5 text-sm">
        {ha ? (
          <span className="text-ink2">
            <strong>#{hovered} {FULL[hovered] || SHORT[hovered]}</strong>
            {' — '}{statusLabel(ha.status)}
            {ha.status === 'RUNNING' ? ` (${Math.round(ha.progressPercent || 0)} %)` : ''}
            {ha.status === 'ERROR' ? ' · cliquer pour relancer' : ''}
            {ha.status === 'DONE' ? ' · cliquer pour ouvrir' : ''}
          </span>
        ) : (
          <span className="text-ink3">Survolez un agent pour voir son impact sur le reste du pipeline.</span>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} className="max-w-full" role="img" aria-label="Pipeline des agents">
          <style>{`@keyframes lpipe-pulse{0%,100%{opacity:.12}50%{opacity:.5}}.lpipe-halo{animation:lpipe-pulse 1.4s ease-in-out infinite}`}</style>
          <defs>
            <marker id="lpipe-arrow" markerWidth="8" markerHeight="8" refX="6.5" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={FEED} />
            </marker>
          </defs>

          {PHASES.map((p, c) => (
            <text
              key={p.key}
              x={PADX + c * COLW + COLW / 2}
              y={18}
              textAnchor="middle"
              fontFamily="Comfortaa, sans-serif"
              fontSize="12"
              fontWeight="700"
              fill="#6E6A62"
            >
              {p.label}
            </text>
          ))}

          {fedBy.map(([a, b], i) => (
            <path key={`fb${i}`} d={path(a, b)} fill="none" stroke="#9A958C" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
          ))}
          {feeds.map(([a, b], i) => (
            <path key={`fe${i}`} d={path(a, b)} fill="none" stroke={FEED} strokeWidth="2.5" opacity="0.92" markerEnd="url(#lpipe-arrow)" />
          ))}

          {Object.values(nodes).map((n) => (
            <PipelineNode
              key={n.id}
              n={n}
              a={byId[n.id]}
              hovered={hovered}
              setHovered={setHovered}
              lit={lit}
              onRegenerate={onRegenerate}
              onOpenValidation={onOpenValidation}
            />
          ))}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink3">
        <Legend color="#E8621A" label="En cours" />
        <Legend color="#1E5C38" label="Terminé" />
        <Legend color="#C0392B" label="Erreur (cliquer pour relancer)" />
        <Legend color="#D8D3CA" label="En attente / non applicable" />
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true"><path d="M1,4 H21" stroke={FEED} strokeWidth="2.5" markerEnd="" /></svg>
          impact (au survol)
        </span>
      </div>
    </div>
  );
}
