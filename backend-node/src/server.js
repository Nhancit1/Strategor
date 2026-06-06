import http from 'http';
import fs from 'fs';
import { config } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { initSocket } from './socket/index.js';
import { seedBenchmarks } from '../seed/seedBenchmarks.js';

async function main() {
  await connectDb();
  await seedBenchmarks(); // idempotent

  fs.mkdirSync(config.upload.dir, { recursive: true });

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    console.log(`[server] Strategor Node backend on :${config.port} (${config.nodeEnv})`);
    console.log(`[server] AI service: ${config.aiService.url}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal:', err);
  process.exit(1);
});
