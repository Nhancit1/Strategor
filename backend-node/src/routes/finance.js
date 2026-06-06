import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { FinanceLite } from '../models/FinanceLite.js';
import { SectorBenchmark } from '../models/SectorBenchmark.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const CORE_FIELDS = [
  'revenue', 'revenue_growth', 'gross_margin_percent',
  'ebitda_margin_percent', 'team_size', 'customer_count', 'average_deal_size',
];

function completeness(data) {
  if (!data) return 0;
  let filled = 0;
  for (const f of CORE_FIELDS) {
    const v = data[f];
    if (v != null && String(v).trim() !== '') filled += 1;
  }
  return Math.round((filled * 100) / CORE_FIELDS.length);
}

router.get('/finance', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const finance = await FinanceLite.findOne({ project: req.params.projectId });
  if (!finance) return res.status(204).end();
  res.json(finance.toJSON());
}));

router.put('/finance', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const data = req.body;
  const finance = await FinanceLite.findOneAndUpdate(
    { project: req.params.projectId },
    { $set: { data, completenessScore: completeness(data) } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(finance.toJSON());
}));

router.get('/finance/benchmark', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const { sector, companySize, geography = 'FR', metric } = req.query;

  // Try the most specific match, then fall back to sector+metric (any size).
  const filter = { sector, metricKey: metric, geography };
  if (companySize) filter.companySize = companySize;
  let best = await SectorBenchmark.findOne(filter);
  if (!best) best = await SectorBenchmark.findOne({ sector, metricKey: metric });
  if (!best) return res.status(204).end();

  res.json({
    metricKey: best.metricKey,
    value: best.metricValue,
    source: best.source,
    confidence: best.confidence,
    sector: best.sector,
    companySize: best.companySize,
    geography: best.geography,
  });
}));

export default router;
