import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '/Users/khalidabourkia/Desktop/strategor-mern 2/backend-node/.env' });

import { AgentExecution } from './models/AgentExecution.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const execs = await AgentExecution.find({ agentId: 8 }).sort({ createdAt: -1 }).limit(1).lean();
  console.log(JSON.stringify(execs, null, 2));
  process.exit(0);
}
run();
