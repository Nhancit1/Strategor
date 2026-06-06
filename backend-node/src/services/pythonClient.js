import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from '../config/env.js';

// Thin client for the Python AI/export microservice.
// Node owns the DB; Python is stateless compute (AI agents, parsing, file generation).
const client = axios.create({
  baseURL: config.aiService.url,
  headers: { 'X-Internal-Token': config.aiService.internalToken },
  timeout: 120000,
});

// Fire-and-forget: kick off the 12-agent pipeline. Python streams progress
// back via POST /internal/projects/:id/agent-events (see routes/internal.js).
export async function startAnalysis(payload) {
  // payload: { projectId, mode, language, profile, financeLite, documentsContext }
  return client.post('/analyze', payload);
}

// Fire-and-forget: parse an uploaded document. Python reads it from the shared
// uploads volume and calls back POST /internal/documents/:id/parsed.
export async function startParse(payload) {
  // payload: { documentId, storagePath, filename, mimeType }
  return client.post('/parse', payload);
}

// Synchronous: generate an export file. Returns a Buffer.
export async function generateExport(format, payload) {
  // payload: { project, executions }
  const resp = await client.post(`/export/${format}`, payload, {
    responseType: 'arraybuffer',
  });
  return Buffer.from(resp.data);
}

export default client;
