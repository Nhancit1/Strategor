import { useRef, useEffect } from 'react';

/**
 * EditableText — renders text normally in read mode, and as an inline
 * input/textarea in edit mode. Inherits all parent styling via CSS.
 *
 * Props:
 *   value      — the current text
 *   onChange    — if provided, enables edit mode (callback with new value)
 *   multiline  — use textarea instead of input
 *   className  — extra classes to apply
 *   placeholder — placeholder when empty
 */
export default function EditableText({
  value,
  onChange,
  multiline = false,
  className = '',
  placeholder = 'Click to edit…',
}) {
  const ref = useRef(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (multiline && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value, multiline]);

  // Read-only mode — just render the text
  if (!onChange) {
    return <span className={className}>{value}</span>;
  }

  // Edit mode
  if (multiline) {
    return (
      <textarea
        ref={ref}
        className={`editable-field editable-field--multi ${className}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
      />
    );
  }

  return (
    <input
      type="text"
      className={`editable-field ${className}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
