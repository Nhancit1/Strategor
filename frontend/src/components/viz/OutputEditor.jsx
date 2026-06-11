import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Check, Copy, WrapText } from 'lucide-react';

/**
 * OutputEditor — A premium JSON editor for modifying agent outputs.
 *
 * Props:
 *   output       — the current agent output (object)
 *   onChange      — called with the new parsed object when the user edits valid JSON
 *   onValidation  — called with { valid: boolean } so the parent can disable "Save"
 */
export default function OutputEditor({ output, onChange, onValidation }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [fieldCount, setFieldCount] = useState(0);
  const textareaRef = useRef(null);

  // Initialise text from output prop
  useEffect(() => {
    const formatted = JSON.stringify(output, null, 2);
    setText(formatted);
    setError(null);
    setFieldCount(countFields(output));
    onValidation?.({ valid: true });
  }, [output]);

  // Count top-level keys for the indicator
  function countFields(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.keys(obj).length;
  }

  // Validate & propagate changes
  const handleChange = useCallback(
    (raw) => {
      setText(raw);
      try {
        const parsed = JSON.parse(raw);
        setError(null);
        setFieldCount(countFields(parsed));
        onChange?.(parsed);
        onValidation?.({ valid: true });
      } catch (e) {
        setError(e.message);
        onValidation?.({ valid: false });
      }
    },
    [onChange, onValidation]
  );

  // Auto-format button
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      setText(formatted);
      setError(null);
    } catch {
      // Can't format invalid JSON — leave as-is
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  // Count lines for the gutter
  const lineCount = text.split('\n').length;

  return (
    <div className="editor-container">
      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="editor-toolbar">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-ink2">
            JSON Editor
          </span>
          <span className="text-xs text-ink3">
            {fieldCount} top-level field{fieldCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFormat}
            className="editor-btn"
            title="Auto-format JSON"
          >
            <WrapText size={14} />
            <span>Format</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="editor-btn"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── Editor body ──────────────────────────────── */}
      <div className="editor-body">
        {/* Line numbers gutter */}
        <div className="editor-gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="editor-line-number">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className={`editor-textarea ${error ? 'editor-textarea--error' : ''}`}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* ── Error bar ────────────────────────────────── */}
      {error && (
        <div className="editor-error">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span className="truncate">Invalid JSON: {error}</span>
        </div>
      )}
    </div>
  );
}
