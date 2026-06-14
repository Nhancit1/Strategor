import { forwardRef } from 'react';
import ProfileView from './ProfileView';
import PestelHeatmap from './PestelHeatmap';
import SwotMatrix from './SwotMatrix';
import CompetitiveMap from './CompetitiveMap';
import PorterPentagon from './PorterPentagon';
import ValueChainDiagram from './ValueChainDiagram';
import DiagnosticView from './DiagnosticView';
import StrategyView from './StrategyView';
import KpiDashboard from './KpiDashboard';
import BcgMatrix from './BcgMatrix';
import ChangeView from './ChangeView';
import RiskMatrix from './RiskMatrix';
import FinanceScenarios from './FinanceScenarios';
import ConsistencyView from './ConsistencyView';

// Report order (matches the validation tabs / analytical flow).
const SECTIONS = [
  { agentId: 1, label: 'Profil & Contexte', Component: ProfileView },
  { agentId: 2, label: 'Analyse PESTEL', Component: PestelHeatmap },
  { agentId: 3, label: 'Analyse SWOT', Component: SwotMatrix },
  { agentId: 4, label: 'Intelligence compétitive', Component: CompetitiveMap },
  { agentId: 9, label: '5 Forces de Porter', Component: PorterPentagon },
  { agentId: 10, label: 'Chaîne de valeur', Component: ValueChainDiagram },
  { agentId: 5, label: 'Diagnostic consolidé', Component: DiagnosticView },
  { agentId: 6, label: 'Axes stratégiques & roadmap', Component: StrategyView },
  { agentId: 7, label: 'KPIs & tableau de bord', Component: KpiDashboard },
  { agentId: 11, label: 'Matrice BCG', Component: BcgMatrix },
  { agentId: 12, label: 'Conduite du changement', Component: ChangeView },
  { agentId: 13, label: 'Registre de risques', Component: RiskMatrix },
  { agentId: 14, label: 'Analyse financière & scénarios', Component: FinanceScenarios },
  { agentId: 15, label: 'Contrôle de cohérence', Component: ConsistencyView },
];

const WIDTH = 820; // fixed render width → consistent, page-like captures

/**
 * Off-screen renderer: mounts every DONE agent's visualisation in a titled section
 * at a fixed width so they can be captured (html2canvas) for the full-report export.
 * Mounted only while exporting. Each section carries data-title for the assembler.
 */
const ReportCanvas = forwardRef(function ReportCanvas({ agents = [] }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', left: '-10000px', top: 0, width: `${WIDTH}px`, background: '#fff', zIndex: -1 }}
    >
      {SECTIONS.map(({ agentId, label, Component }) => {
        const agent = agents.find((a) => a.agentId === agentId);
        const output = agent?.editedOutput || agent?.output;
        if (!agent || agent.status !== 'DONE' || !output) return null;
        return (
          <div
            key={agentId}
            data-report-section
            data-title={label}
            style={{ width: `${WIDTH}px`, background: '#fff', padding: '32px', boxSizing: 'border-box' }}
          >
            <h2 className="font-title text-2xl font-bold text-ink mb-4">{label}</h2>
            <Component output={output} />
          </div>
        );
      })}
    </div>
  );
});

export default ReportCanvas;
