import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { agentApi } from '../../api';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';

const linesToArr = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const arrToLines = (a) => (Array.isArray(a) ? a.join('\n') : a || '');

function Field({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <textarea className="form-textarea" rows={rows} value={value} onChange={onChange} />
    </div>
  );
}

export default function HypothesesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const continueAnalysis = useProjectStore((s) => s.continueAnalysis);
  const agentsLoading = useProjectStore((s) => s.agentsLoading);
  const user = useAuthStore((s) => s.user);
  const userLang = user?.lang;

  const [agent1, setAgent1] = useState(null);
  const [form, setForm] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);
  const initedRef = useRef(false);
  const pollRef = useRef(null);

  // Poll Agent 1 until DONE / ERROR (Haiku — fast).
  const startPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    let stopped = false;
    const tick = async () => {
      try {
        const { data } = await agentApi.list(id);
        const a1 = Array.isArray(data) ? data.find((a) => a.agentId === 1) : null;
        if (stopped) return;
        setAgent1(a1 || null);
        if (a1 && (a1.status === 'DONE' || a1.status === 'ERROR')) return; // stop
      } catch {
        /* keep trying */
      }
      if (!stopped) pollRef.current = setTimeout(tick, 2500);
    };
    tick();
    return () => { stopped = true; };
  };

  useEffect(() => {
    initedRef.current = false;
    const stop = startPolling();
    return () => { stop(); if (pollRef.current) clearTimeout(pollRef.current); };
  }, [id, userLang]);

  // Initialize the editable form once Agent 1 is done.
  useEffect(() => {
    if (initedRef.current || agent1?.status !== 'DONE') return;
    const out = agent1.editedOutput ?? agent1.output ?? {};
    setForm({
      activity: out.activity || '',
      clientele: out.clientele || '',
      positioning: out.positioning || '',
      initial_strengths: arrToLines(out.initial_strengths),
      key_challenges: arrToLines(out.key_challenges),
      synthesis: out.synthesis || '',
    });
    initedRef.current = true;
  }, [agent1]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const launchFull = async () => {
    setLaunching(true);
    setError(null);
    try {
      const payload = {
        activity: form.activity,
        clientele: form.clientele,
        positioning: form.positioning,
        initial_strengths: linesToArr(form.initial_strengths),
        key_challenges: linesToArr(form.key_challenges),
        synthesis: form.synthesis,
      };
      await agentApi.updateOutput(id, 1, payload); // persist reviewed hypotheses
      await continueAnalysis(id); // launch agents up to the diagnostic
      navigate(`/projects/${id}/diagnostic-review`);
    } catch (err) {
      setError(err.response?.data?.message || 'Le lancement a échoué.');
      setLaunching(false);
    }
  };

  const retryAgent1 = async () => {
    setRetrying(true);
    setError(null);
    try {
      await agentApi.retry(id, 1);
      initedRef.current = false;
      setAgent1(null);
      startPolling();
    } catch (err) {
      setError(err.response?.data?.message || 'La relance a échoué.');
    } finally {
      setRetrying(false);
    }
  };

  const status = agent1?.status;

  return (
    <div className="container-narrow py-8">
      <div className="mb-6">
        <h1 className="font-title text-2xl font-semibold flex items-center gap-2">
          <Sparkles size={22} className="text-orange" /> Ce que l'IA a compris
        </h1>
        <p className="text-ink3 text-sm mt-1">
          Vérifiez et corrigez les hypothèses ci-dessous. Les 11 autres agents s'appuieront dessus —
          autant partir sur des bases justes.
        </p>
      </div>

      {agentsLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={28} className="text-orange animate-spin mx-auto mb-3" />
          <p className="font-medium">
            {userLang === 'en' ? 'Translating Hypotheses...' : 'Traduction en cours…'}
          </p>
          <p className="text-ink3 text-sm mt-1">
            {userLang === 'en'
              ? 'DeepSeek is translating the context profile. Please wait.'
              : "DeepSeek traduit le profil de contexte. Veuillez patienter."}
          </p>
        </div>
      ) : (!status || status === 'PENDING' || status === 'RUNNING') ? (
        <div className="card p-10 text-center">
          <Loader2 size={28} className="text-orange animate-spin mx-auto mb-3" />
          <p className="font-medium">Analyse du brief en cours…</p>
          <p className="text-ink3 text-sm mt-1">L'agent Profil normalise vos informations (quelques secondes).</p>
        </div>
      ) : null}

      {status === 'ERROR' && (
        <div className="card p-8 text-center">
          <AlertTriangle size={26} className="text-red-600 mx-auto mb-3" />
          <p className="font-medium">L'agent Profil a rencontré une erreur.</p>
          {agent1?.errorMessage && <p className="text-ink3 text-sm mt-1">{agent1.errorMessage}</p>}
          {error && <div className="form-error mt-3">{error}</div>}
          <button onClick={retryAgent1} disabled={retrying} className="btn-primary mt-4">
            <RefreshCw size={16} className="inline mr-1.5" /> {retrying ? 'Relance…' : "Relancer l'agent"}
          </button>
        </div>
      )}

      {status === 'DONE' && form && !agentsLoading && (
        <div className="card p-6 md:p-8 space-y-4">
          <Field label="Activité" value={form.activity} onChange={setField('activity')} rows={2} />
          <Field label="Clientèle" value={form.clientele} onChange={setField('clientele')} rows={2} />
          <Field label="Positionnement" value={form.positioning} onChange={setField('positioning')} rows={2} />
          <Field label="Forces initiales (une par ligne)" value={form.initial_strengths} onChange={setField('initial_strengths')} rows={4} />
          <Field label="Enjeux clés (un par ligne)" value={form.key_challenges} onChange={setField('key_challenges')} rows={4} />
          <Field label="Synthèse" value={form.synthesis} onChange={setField('synthesis')} rows={4} />

          {error && <div className="form-error">{error}</div>}

          <div className="flex justify-end pt-2">
            <button onClick={launchFull} disabled={launching} className="btn-primary">
              {launching ? 'Lancement…' : "Valider & lancer l'analyse complète"}
              <ArrowRight size={16} className="inline ml-1.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
