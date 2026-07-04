import { ProjectDocument } from '../models/ProjectDocument.js';

// Assemble parsed-document context (sentinel for the AI), capped at 8000 chars.
// Shared by the full-analysis routes AND every re-run path (retry / regenerate /
// rederive-stale / resume) so a regenerated agent sees the same user documents
// the original run saw — previously re-runs sent documentsContext: null and
// could silently diverge from the initial analysis.
export async function buildDocumentsContext(projectId) {
  const docs = await ProjectDocument.find({ project: projectId }).sort({ uploadedAt: -1 });
  let ctx = '';
  const MAX = 8000;
  for (const doc of docs) {
    if (doc.parseStatus !== 'DONE' || !doc.parsedContent) continue;
    if (ctx.length >= MAX) break;
    const remaining = MAX - ctx.length;
    let content = doc.parsedContent;
    if (content.length > remaining) content = content.slice(0, remaining) + '\n[…tronqué]';
    ctx += `─── ${doc.filename} (${doc.docType}) ───\n${content}\n\n`;
  }
  return ctx;
}
