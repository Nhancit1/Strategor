import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`[db] connected: ${config.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
