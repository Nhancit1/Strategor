import { SectorBenchmark } from '../src/models/SectorBenchmark.js';

// Ported from V2__seed_benchmarks.sql (France, 5 sectors). Idempotent.
const BENCHMARKS = [
  // INDUSTRIE
  ['Industrie', 'small', 'FR', 'gross_margin', { value: 28, unit: '%', range: [22, 34] }, 'INSEE 2024 — PME industrielles', 'MEDIUM'],
  ['Industrie', 'medium', 'FR', 'gross_margin', { value: 33, unit: '%', range: [28, 38] }, 'INSEE 2024 — ETI industrielles', 'MEDIUM'],
  ['Industrie', 'large', 'FR', 'gross_margin', { value: 38, unit: '%', range: [32, 44] }, 'INSEE 2024', 'MEDIUM'],
  ['Industrie', 'medium', 'FR', 'ebitda_margin', { value: 8, unit: '%', range: [5, 12] }, 'BPI Observatoire 2024', 'MEDIUM'],
  ['Industrie', 'medium', 'FR', 'revenue_growth', { value: 'stable', label: 'Stable -5% à +5%' }, 'INSEE 2024', 'MEDIUM'],
  ['Industrie', 'medium', 'FR', 'days_sales_outstanding', { value: 65, unit: 'days' }, 'AFDCC 2024', 'MEDIUM'],

  // BÂTIMENT
  ['Bâtiment & Construction', 'small', 'FR', 'gross_margin', { value: 22, unit: '%', range: [18, 28] }, 'FFB 2024', 'MEDIUM'],
  ['Bâtiment & Construction', 'medium', 'FR', 'gross_margin', { value: 26, unit: '%', range: [22, 32] }, 'FFB 2024', 'MEDIUM'],
  ['Bâtiment & Construction', 'medium', 'FR', 'ebitda_margin', { value: 6, unit: '%', range: [3, 9] }, 'BPI 2024', 'MEDIUM'],
  ['Bâtiment & Construction', 'medium', 'FR', 'revenue_growth', { value: 'decline_low', label: 'Décroissance -5% à -15%' }, 'FFB 2024 — contexte logements', 'HIGH'],
  ['Bâtiment & Construction', 'medium', 'FR', 'days_sales_outstanding', { value: 75, unit: 'days' }, 'AFDCC 2024', 'MEDIUM'],

  // TECH / SAAS
  ['Tech / SaaS', 'small', 'FR', 'gross_margin', { value: 75, unit: '%', range: [65, 85] }, 'France Digitale 2024', 'HIGH'],
  ['Tech / SaaS', 'medium', 'FR', 'gross_margin', { value: 80, unit: '%', range: [72, 88] }, 'France Digitale 2024', 'HIGH'],
  ['Tech / SaaS', 'small', 'FR', 'revenue_growth', { value: 'growth_strong', label: '+20% à +50%' }, 'EY French Tech Funding 2024', 'MEDIUM'],
  ['Tech / SaaS', 'small', 'FR', 'cac_in_months', { value: 12, unit: 'months', range: [8, 18] }, 'OpenView SaaS Benchmark 2024', 'MEDIUM'],
  ['Tech / SaaS', 'small', 'FR', 'churn_rate_annual', { value: 8, unit: '%', range: [5, 15] }, 'OpenView SaaS Benchmark 2024', 'MEDIUM'],
  ['Tech / SaaS', 'small', 'FR', 'nps_score', { value: 35, range: [25, 50] }, 'Benchmarks SaaS 2024', 'MEDIUM'],

  // RETAIL
  ['Retail', 'small', 'FR', 'gross_margin', { value: 35, unit: '%', range: [25, 50] }, 'FCD 2024', 'MEDIUM'],
  ['Retail', 'medium', 'FR', 'gross_margin', { value: 32, unit: '%', range: [25, 42] }, 'FCD 2024', 'MEDIUM'],
  ['Retail', 'medium', 'FR', 'ebitda_margin', { value: 5, unit: '%', range: [2, 8] }, 'INSEE 2024', 'MEDIUM'],
  ['Retail', 'medium', 'FR', 'revenue_growth', { value: 'stable', label: 'Stable -5% à +5%' }, 'FCD 2024', 'MEDIUM'],
  ['Retail', 'medium', 'FR', 'inventory_turnover_days', { value: 60, unit: 'days' }, 'INSEE 2024', 'MEDIUM'],

  // SERVICES B2B
  ['Services B2B', 'small', 'FR', 'gross_margin', { value: 55, unit: '%', range: [45, 65] }, 'Syntec Numérique 2024', 'MEDIUM'],
  ['Services B2B', 'medium', 'FR', 'gross_margin', { value: 50, unit: '%', range: [42, 58] }, 'Syntec Numérique 2024', 'MEDIUM'],
  ['Services B2B', 'medium', 'FR', 'ebitda_margin', { value: 10, unit: '%', range: [6, 15] }, 'BPI 2024', 'MEDIUM'],
  ['Services B2B', 'medium', 'FR', 'revenue_growth', { value: 'growth_moderate', label: '+5% à +15%' }, 'Syntec 2024', 'MEDIUM'],
  ['Services B2B', 'medium', 'FR', 'utilization_rate', { value: 75, unit: '%', range: [68, 82] }, 'Syntec Numérique 2024', 'HIGH'],
  ['Services B2B', 'medium', 'FR', 'days_sales_outstanding', { value: 55, unit: 'days' }, 'AFDCC 2024', 'MEDIUM'],
];

export async function seedBenchmarks() {
  const count = await SectorBenchmark.estimatedDocumentCount();
  if (count > 0) {
    console.log(`[seed] benchmarks already present (${count}) — skipping`);
    return;
  }
  const docs = BENCHMARKS.map(([sector, companySize, geography, metricKey, metricValue, source, confidence]) => ({
    sector, companySize, geography, metricKey, metricValue, source, confidence,
  }));
  await SectorBenchmark.insertMany(docs);
  console.log(`[seed] inserted ${docs.length} sector benchmarks`);
}

// Allow `npm run seed` standalone.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { connectDb, disconnectDb } = await import('../src/config/db.js');
  await connectDb();
  await seedBenchmarks();
  await disconnectDb();
  process.exit(0);
}
