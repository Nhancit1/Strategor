import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '/Users/khalidabourkia/Desktop/strategor-mern 2/backend-node/.env' });

import { AgentExecution } from './models/AgentExecution.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const execs = await AgentExecution.find({ project: '6a3356661b47df0139a7d7d3' })
    .select('agentId agentName status errorMessage message updatedAt')
    .sort({ agentId: 1 })
    .lean();
  console.log(JSON.stringify(execs, null, 2));
  process.exit(0);
}
run();
