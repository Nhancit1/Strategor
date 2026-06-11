import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Target, RefreshCw, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { agentApi } from '../../api';
import { useProjectStore } from '../../store/projectStore';

const linesToArr = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const arrToLines = (a) => (Array.isArray(a) ? a.join('\n') : a || '');

const URGENCY = [
  { value: 'GREEN', label: '🟢 Vert — sous contrôle' },
  { value: 'AMBER', label: '🟠 Orange — vigilance' },
  { value: 'RED', label: '🔴 Rouge — urgent' },
];

function Field({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <textarea className="form-textarea" rows={rows} value={value} onChange={onChange} />
    </div>
  );
}

export default function DiagnosticReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const continueFromDiagnostic = useProjectStore((s) => s.continueFromDiagnostic);

  const [agent5, setAgent5] = useState(null);
  const [form, setForm] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);
  const initedRef = useRef(false);
  const fullRef = useRef({}); // full Agent 5 output, to merge edits back into
  const pollRef = useRef(null);

  // Poll Agent 5 until DONE / ERROR (the diagnostic runs after PESTEL/SWOT/etc.).
  const startPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    let stopped = false;
    const tick = async () => {
      try {
        const { data } = await agentApi.list(id);
        const a5 = Array.isArray(data) ? data.find((a) => a.agentId === 5) : null;
        if (stopped) return;
        setAgent5(a5 || null);
        if (a5 && (a5.status === 'DONE' || a5.status === 'ERROR')) return; // stop
      } catch {
        /* keep trying */
      }
      if (!stopped) pollRef.current = setTimeout(tick, 2500);
    };
    tick();
    return () => { stopped = true; };
  };

  useEffect(() => {
    const stop = startPolling();
    return () => { stop(); if (pollRef.current) clearTimeout(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Initialize the editable form once Agent 5 is done.
  useEffect(() => {
    if (initedRef.current || agent5?.status !== 'DONE') return;
    const out = agent5.editedOutput ?? agent5.output ?? {};
    fullRef.current = out;
    setForm({
      position: out.position || '',
      ceo_verdict: out.ceo_verdict || '',
      urgency_level: out.urgency_level || 'AMBER',
      core_strengths: arrToLines(out.core_strengths),
    });
    initedRef.current = true;
  }, [agent5]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const launchRest = async () => {
    setLaunching(true);
    setError(null);
    try {
      // Merge edits back into the full diagnostic (fault_lines / opportunity_windows preserved).
      const merged = {
        ...fullRef.current,
        position: form.position,
        ceo_verdict: form.ceo_verdict,
        urgency_level: form.urgency_level,
        core_strengths: linesToArr(form.core_strengths),
      };
      await agentApi.updateOutput(id, 5, merged); // persist reviewed diagnostic
      await continueFromDiagnostic(id); // launch the remaining agents
      navigate(`/projects/${id}/agents`);
    } catch (err) {
      setError(err.response?.data?.message || 'Le lancement a échoué.');
      setLaunching(false);
    }
  };

  const retryAgent5 = async () => {
    setRetrying(true);
    setError(null);
    try {
      await agentApi.retry(id, 5);
      initedRef.current = false;
      setAgent5(null);
      startPolling();
    } catch (err) {
      setError(err.response?.data?.message || 'La relance a échoué.');
    } finally {
      setRetrying(false);
    }
  };

  const status = agent5?.status;
  const faultLines = fullRef.current.fault_lines;
  const opportunities = fullRef.current.opportunity_windows;

  return (
    <div className="container-narrow py-8">
      <div className="mb-6">
        <h1 className="font-title text-2xl font-semibold flex items-center gap-2">
          <Target size={22} className="text-orange" /> Validez le diagnostic
        </h1>
        <p className="text-ink3 text-sm mt-1">
          C'est le pivot de l'analyse : les axes, KPIs et livrables en découlent. Ajustez-le avant
          de lancer la suite.
        </p>
      </div>

      {(!status || status === 'PENDING' || status === 'RUNNING') && (
        <div className="card p-10 text-center">
          <Loader2 size={28} className="text-orange animate-spin mx-auto mb-3" />
          <p className="font-medium">Consolidation du diagnostic en cours…</p>
          <p className="text-ink3 text-sm mt-1">PESTEL, SWOT, concurrence, Porter et chaîne de valeur sont en cours de synthèse.</p>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="card p-8 text-center">
          <AlertTriangle size={26} className="text-red-600 mx-auto mb-3" />
          <p className="font-medium">L'agent Diagnostic a rencontré une erreur.</p>
          {agent5?.errorMessage && <p className="text-ink3 text-sm mt-1">{agent5.errorMessage}</p>}
          {error && <div className="form-error mt-3">{error}</div>}
          <button onClick={retryAgent5} disabled={retrying} className="btn-primary mt-4">
            <RefreshCw size={16} className="inline mr-1.5" /> {retrying ? 'Relance…' : "Relancer l'agent"}
          </button>
        </div>
      )}

      {status === 'DONE' && form && (
        <div className="card p-6 md:p-8 space-y-4">
          <div>
            <label className="form-label">Niveau d'urgence</label>
            <select className="form-input" value={form.urgency_level} onChange={setField('urgency_level')}>
              {URGENCY.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <Field label="Verdict dirigeant" value={form.ceo_verdict} onChange={setField('ceo_verdict')} rows={3} />
          <Field label="Position stratégique actuelle" value={form.position} onChange={setField('position')} rows={3} />
          <Field label="Forces qui tiennent l'entreprise (une par ligne)" value={form.core_strengths} onChange={setField('core_strengths')} rows={4} />

          {(faultLines?.length > 0 || opportunities?.length > 0) && (
            <p className="text-ink3 text-xs">
              Les lignes de faille ({faultLines?.length || 0}) et fenêtres d'opportunité ({opportunities?.length || 0})
              détaillées sont conservées telles quelles.
            </p>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="flex justify-end pt-2">
            <button onClick={launchRest} disabled={launching} className="btn-primary">
              {launching ? 'Lancement…' : 'Valider & lancer la suite'}
              <ArrowRight size={16} className="inline ml-1.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
