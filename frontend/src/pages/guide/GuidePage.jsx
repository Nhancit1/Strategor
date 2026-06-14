import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Compass, Map, BarChart3, Lightbulb, Sparkles, ArrowRight, ChevronDown,
  Rocket, ClipboardList, Coins, Sparkles as SparklesIcon, ListChecks, Eye, Download, CheckCircle2,
  Target, TrendingUp, Users, ShieldAlert, Network, Gauge, Grid2x2, Building2,
  LineChart, Workflow, Search,
} from 'lucide-react';

/* ── Section nav ───────────────────────────────────────────── */
const NAV = [
  { id: 'methodo', key: 'methodo', icon: Compass },
  { id: 'parcours', key: 'parcours', icon: Map },
  { id: 'resultats', key: 'resultats', icon: BarChart3 },
  { id: 'conseils', key: 'conseils', icon: Lightbulb },
];

/* ── The journey, step by step ─────────────────────────────── */
const STEPS = [
  { icon: Rocket, key: 'step1' },
  { icon: ClipboardList, key: 'step2', hasTip: true },
  { icon: Coins, key: 'step3' },
  { icon: Sparkles, key: 'step4' },
  { icon: Eye, key: 'step5', highlight: true, hasTip: true },
  { icon: CheckCircle2, key: 'step6', highlight: true },
  { icon: ListChecks, key: 'step7', hasTip: true },
  { icon: Download, key: 'step8' },
];

/* ── Understanding each result ─────────────────────────────── */
const PHASES = [
  {
    key: 'cadrage',
    items: [
      { icon: Building2, key: 'profile' },
    ],
  },
  {
    key: 'externe',
    items: [
      { icon: TrendingUp, key: 'pestel' },
      { icon: Target, key: 'competitive' },
      { icon: Network, key: 'porter' },
    ],
  },
  {
    key: 'interne',
    items: [
      { icon: Grid2x2, key: 'swot' },
      { icon: Workflow, key: 'value_chain' },
    ],
  },
  {
    key: 'diagnostic',
    items: [
      { icon: Compass, key: 'diagnostic', star: true },
    ],
  },
  {
    key: 'strategie',
    items: [
      { icon: Map, key: 'roadmap' },
      { icon: Grid2x2, key: 'bcg' },
      { icon: Gauge, key: 'kpi' },
    ],
  },
  {
    key: 'execution',
    items: [
      { icon: Users, key: 'change' },
      { icon: ShieldAlert, key: 'risk' },
      { icon: LineChart, key: 'finance' },
      { icon: Search, key: 'consistency' },
    ],
  },
];

/* ── UI ────────────────────────────────────────────────────── */
function ResultCard({ item, open, onToggle }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const name = t(`guide.resultats.items.${item.key}.name`);
  const what = t(`guide.resultats.items.${item.key}.what`);
  const read = t(`guide.resultats.items.${item.key}.read`);
  const use = t(`guide.resultats.items.${item.key}.use`);

  return (
    <div className={`rounded-xl border bg-white transition-shadow ${open ? 'border-orange/40 shadow-card' : 'border-paper3'}`}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.star ? 'bg-orange text-white' : 'bg-orange/10 text-orangeDark'}`}>
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-title font-semibold text-ink">{name}</span>
          {!open && <span className="block truncate text-sm text-ink3">{what}</span>}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-ink3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 pl-16">
          <Detail label={t('guide.resultats.labels.what')} text={what} />
          <Detail label={t('guide.resultats.labels.read')} text={read} />
          <Detail label={t('guide.resultats.labels.use')} text={use} />
        </div>
      )}
    </div>
  );
}

function Detail({ label, text }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-orange">{label}</div>
      <p className="text-sm text-ink2">{text}</p>
    </div>
  );
}

export default function GuidePage() {
  const { t } = useTranslation();
  const [openKey, setOpenKey] = useState('diagnostic'); // default open keystone

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="container-wide py-8">
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-paper3 bg-gradient-to-br from-orange/10 to-paper2 p-8">
        <div className="flex items-center gap-2 text-orangeDark">
          <Sparkles size={18} />
          <span className="text-sm font-semibold uppercase tracking-wide">{t('guide.badge')}</span>
        </div>
        <h1 className="mt-2 font-title text-3xl font-bold text-ink md:text-4xl">{t('guide.title')}</h1>
        <p className="mt-3 max-w-2xl text-ink2">{t('guide.subtitle')}</p>
        <Link to="/dashboard" className="btn-primary mt-5 inline-flex items-center gap-2">
          {t('guide.startBtn')} <ArrowRight size={16} />
        </Link>
      </div>

      {/* 3-step summary */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          { n: '1', key: 'step1' },
          { n: '2', key: 'step2' },
          { n: '3', key: 'step3' },
        ].map((c) => (
          <div key={c.n} className="card p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange font-title font-bold text-white">{c.n}</div>
            <div className="mt-3 font-title font-semibold text-ink">{t(`guide.stepsSummary.${c.key}.title`)}</div>
            <p className="mt-1 text-sm text-ink3">{t(`guide.stepsSummary.${c.key}.desc`)}</p>
          </div>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
        {/* Sticky nav */}
        <aside className="mb-8 lg:mb-0">
          <nav className="lg:sticky lg:top-20 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {NAV.map(({ id, key, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink2 hover:bg-paper2 hover:text-ink"
              >
                <Icon size={16} className="text-orange" /> {t(`guide.nav.${key}`)}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-14">
          {/* Méthodologie */}
          <section id="methodo" className="scroll-mt-20">
            <SectionTitle icon={Compass} title={t('guide.methodo.title')} />
            <p className="text-ink2">{t('guide.methodo.intro')}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Pillar icon={Workflow} title={t('guide.methodo.pillars.experts.title')}
                text={t('guide.methodo.pillars.experts.desc')} />
              <Pillar icon={Search} title={t('guide.methodo.pillars.data.title')}
                text={t('guide.methodo.pillars.data.desc')} />
              <Pillar icon={Eye} title={t('guide.methodo.pillars.control.title')}
                text={t('guide.methodo.pillars.control.desc')} />
            </div>
            <p className="mt-4 text-sm text-ink3">{t('guide.methodo.outro')}</p>
          </section>

          {/* Parcours */}
          <section id="parcours" className="scroll-mt-20">
            <SectionTitle icon={Map} title={t('guide.parcours.title')} />
            <ol className="relative space-y-4 border-l-2 border-paper3 pl-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[33px] flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-paper ${s.highlight ? 'bg-orange text-white' : 'bg-white text-orangeDark border border-paper3'}`}>
                      <Icon size={15} />
                    </span>
                    <div className={`rounded-xl border p-4 ${s.highlight ? 'border-orange/40 bg-orange/5' : 'border-paper3 bg-white'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-title font-semibold text-ink">{i + 1}. {t(`guide.parcours.steps.${s.key}.title`)}</span>
                        {s.highlight && <span className="badge-running">{t('guide.parcours.checkpoint')}</span>}
                      </div>
                      <p className="mt-1 text-sm text-ink2">{t(`guide.parcours.steps.${s.key}.todo`)}</p>
                      {s.hasTip && (
                        <p className="mt-2 flex items-start gap-1.5 text-sm text-orangeDark">
                          <Lightbulb size={14} className="mt-0.5 shrink-0" /> {t(`guide.parcours.steps.${s.key}.tip`)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Résultats */}
          <section id="resultats" className="scroll-mt-20">
            <SectionTitle icon={BarChart3} title={t('guide.resultats.title')} />
            <p className="mb-4 text-ink2">{t('guide.resultats.intro')}</p>
            <div className="space-y-6">
              {PHASES.map((group) => (
                <div key={group.key}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">{t(`guide.resultats.phases.${group.key}`)}</h3>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <ResultCard
                        key={item.key}
                        item={item}
                        open={openKey === item.key}
                        onToggle={() => setOpenKey(openKey === item.key ? null : item.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Conseils */}
          <section id="conseils" className="scroll-mt-20">
            <SectionTitle icon={Lightbulb} title={t('guide.conseils.title')} />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'tip1', 'tip2', 'tip3', 'tip4', 'tip5', 'tip6'
              ].map((key) => (
                <div key={key} className="flex items-start gap-3 rounded-xl border border-paper3 bg-white p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green" />
                  <div>
                    <div className="font-title font-semibold text-ink">{t(`guide.conseils.items.${key}.title`)}</div>
                    <p className="mt-0.5 text-sm text-ink3">{t(`guide.conseils.items.${key}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-orange/30 bg-orange/5 p-6 text-center">
              <h3 className="font-title text-lg font-semibold text-ink">{t('guide.conseils.cta.title')}</h3>
              <p className="mt-1 text-sm text-ink2">{t('guide.conseils.cta.desc')}</p>
              <Link to="/dashboard" className="btn-primary mt-4 inline-flex items-center gap-2">
                {t('guide.conseils.cta.btn')} <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-paper3 pb-2">
      <Icon size={20} className="text-orange" />
      <h2 className="font-title text-2xl font-bold text-ink">{title}</h2>
    </div>
  );
}

function Pillar({ icon: Icon, title, text }) {
  return (
    <div className="card p-4">
      <Icon size={20} className="text-orange" />
      <div className="mt-2 font-title font-semibold text-ink">{title}</div>
      <p className="mt-1 text-sm text-ink3">{text}</p>
    </div>
  );
}
