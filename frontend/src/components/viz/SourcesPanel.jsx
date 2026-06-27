import { ExternalLink, BookOpen } from 'lucide-react';

// Sources come from the AI's web research and are untrusted: only allow real web links.
// A `javascript:`/`data:` URL here would run on click and could steal the session.
const safeHref = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);

/** Web-research sources attached to a grounded agent's output (agents 2, 4, 5, 9, 11). */
export default function SourcesPanel({ sources }) {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  return (
    <div className="mt-6 border-t border-paper3 pt-4">
      <h3 className="font-title text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
        <BookOpen size={15} className="text-ink3" /> Sources ({sources.length})
      </h3>
      <ul className="space-y-1.5">
        {sources.map((s, i) => {
          const title = (s && (s.title || s.url)) || 'Source';
          const url = safeHref(s && s.url);
          return (
            <li key={i} className="text-sm">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 text-blue-700 hover:underline break-all"
                >
                  <ExternalLink size={13} className="mt-0.5 shrink-0" />
                  <span>{title}</span>
                </a>
              ) : (
                <span className="text-ink2">{title}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
