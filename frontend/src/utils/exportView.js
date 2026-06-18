/**
 * Export a rendered view as a SINGLE, self-contained HTML file.
 *
 * Goals: works offline, and looks exactly like what the user sees on screen.
 * How: the live DOM is serialized (so text stays real & selectable), the app's
 * compiled CSS is inlined, the one ECharts <canvas> is baked into an <img> from its
 * on-screen pixels, and the Google web fonts are embedded as base64 (best-effort) so
 * the file needs no network. No external libraries are used.
 */

function arrayBufferToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Concatenate every same-origin stylesheet (the compiled Tailwind/app CSS).
// Cross-origin sheets (e.g. Google Fonts) throw on .cssRules and are skipped.
function collectAppCss() {
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const rule of Array.from(rules)) css += rule.cssText + '\n';
  }
  return css;
}

// Bake canvas charts into <img> using the on-screen pixels (exactly what's displayed).
// clone is a deep copy of original, so canvases line up by document order.
function bakeCanvases(original, clone) {
  const origCanvases = original.querySelectorAll('canvas');
  const cloneCanvases = clone.querySelectorAll('canvas');
  for (let i = 0; i < cloneCanvases.length; i++) {
    const oc = origCanvases[i];
    const cc = cloneCanvases[i];
    if (!oc || !cc || !cc.parentNode) continue;
    let dataUrl = null;
    try { dataUrl = oc.toDataURL('image/png'); } catch { /* tainted canvas — skip */ }
    if (!dataUrl) continue;
    const rect = oc.getBoundingClientRect();
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'graphique';
    img.style.cssText = `width:${Math.round(rect.width)}px;height:${Math.round(rect.height)}px;display:block;max-width:100%`;
    cc.parentNode.replaceChild(img, cc);
  }
}

// Fetch the Google Fonts stylesheet and inline its woff2 files as base64.
// Returns CSS text with data: URIs, or null on any failure (caller falls back).
async function embedWebFonts() {
  try {
    const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find((l) => /fonts\.googleapis\.com/.test(l.href));
    if (!link) return null;
    let cssText = await (await fetch(link.href)).text();
    const urls = Array.from(new Set([...cssText.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1])));
    for (const url of urls) {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        cssText = cssText.split(url).join(`data:font/woff2;base64,${arrayBufferToBase64(buf)}`);
      } catch { /* skip this file, keep the remote url as fallback */ }
    }
    return cssText;
  } catch {
    return null;
  }
}

/**
 * Capture `node` and download it as a standalone .html file.
 * @param {HTMLElement} node    the rendered view to export
 * @param {string} filename     without extension (.html appended)
 * @param {string} title        document + header title
 */
export async function downloadViewAsHtml(node, filename, title = 'Strategor') {
  if (!node) throw new Error('no node to export');
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch { /* ignore */ } }

  // Render at the same content width as on screen, so responsive layout reflows identically.
  const innerW = Math.round(node.getBoundingClientRect().width) || 900;
  const cardW = innerW + 48; // card has p-6 (24px) padding each side

  const clone = node.cloneNode(true);
  bakeCanvases(node, clone);

  const appCss = collectAppCss();
  const fontCss = await embedWebFonts();
  const googleLink = (Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find((l) => /fonts\.googleapis\.com/.test(l.href)) || {}).href || '';
  const fontBlock = fontCss
    ? `<style>${fontCss}</style>`
    : (googleLink ? `<link rel="stylesheet" href="${googleLink}" />` : '');

  const date = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
${fontBlock}
<style>${appCss}</style>
<style>
  html, body { margin: 0; background: #F7F4EF; }
  .export-wrap { width: ${cardW}px; max-width: 94vw; margin: 0 auto; padding: 28px 0 56px;
    font-family: 'DM Sans', system-ui, sans-serif; color: #1C1A17; }
  .export-header { margin-bottom: 18px; }
  .export-title { font-family: 'Comfortaa', system-ui, sans-serif; font-weight: 700; font-size: 26px; color: #1C1A17; }
  .export-sub { color: #6E6A62; font-size: 13px; margin-top: 3px; }
  .export-foot { margin-top: 28px; text-align: center; color: #6E6A62; font-size: 12px; }
</style>
</head>
<body>
  <div class="export-wrap">
    <div class="export-header">
      <div class="export-title">${escapeHtml(title)}</div>
      <div class="export-sub">Généré le ${escapeHtml(date)} · Strategor</div>
    </div>
    <div class="bg-white p-6 rounded-xl border border-paper3 shadow-card">
${clone.outerHTML}
    </div>
    <div class="export-foot">Document généré avec Strategor — consultable hors-ligne</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
