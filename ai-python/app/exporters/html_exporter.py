"""
HTML export — the canonical text-first deliverable.

Everything is real, selectable, copyable text (no rasterized captures): structured
sections for every DONE agent, an executive summary, a Sources section, and the BCG
portfolio as an inline vector SVG (its labels are <text> nodes — selectable too).

This module owns build_document(); the PDF exporter renders the SAME document with
WeasyPrint, so PDF text is selectable by construction and both formats stay in sync.
"""
import html as _html
from .common import (today, done, flatten_output, executive_summary, collect_sources,
                     translate, ORANGE, ORANGE_DARK, INK, INK3, PAPER, PAPER2)

_CSS = f"""
  body{{font-family:'DM Sans','Helvetica',sans-serif;margin:40px auto;max-width:860px;
       color:#{INK};line-height:1.6;background:#fff}}
  h1{{color:#{ORANGE};font-size:28px;margin-bottom:8px}}
  h2{{color:#{ORANGE_DARK};font-size:20px;margin-top:24px;border-bottom:2px solid #F07830;padding-bottom:4px}}
  h3{{color:#{INK};font-size:14px;margin:12px 0 4px}}
  p{{margin:4px 0;font-size:13px}}
  ul{{margin:4px 0 8px 18px}}
  li{{margin:2px 0;font-size:13px}}
  .meta{{color:#{INK3};font-size:13px;margin-bottom:24px}}
  .agent{{margin:16px 0;padding:12px 16px;background:#{PAPER};border-radius:8px}}
  .summary{{margin:16px 0;padding:14px;background:#{PAPER2};border-left:4px solid #{ORANGE};border-radius:6px}}
  .chart{{margin:12px 0;text-align:center}}
  .footer{{margin-top:40px;color:#{INK3};font-size:11px;text-align:center}}
  @media print{{body{{margin:20px}}}}
"""

_QUAD_LABELS = {
    "fr": {"STAR": "Étoiles", "QUESTION_MARK": "Dilemmes", "CASH_COW": "Vaches à lait", "DOG": "Poids morts",
           "x": "Part de marché relative", "y": "Croissance du marché (%)"},
    "en": {"STAR": "Stars", "QUESTION_MARK": "Question marks", "CASH_COW": "Cash cows", "DOG": "Dogs",
           "x": "Relative market share", "y": "Market growth (%)"},
}
_QUAD_COLORS = {"STAR": "#1E5C38", "QUESTION_MARK": "#8A6D1A", "CASH_COW": "#1B3E6A", "DOG": "#6E6A62"}


def bcg_svg(output: dict, lang: str = "fr") -> str:
    """Inline vector BCG scatter from Agent 11's structured output. Pure SVG with
    <text> labels (selectable/copyable). Returns "" when the data is unusable —
    the caller then simply omits the chart and keeps the textual section."""
    lines = (output or {}).get("lines") or []
    pts = []
    for ln in lines:
        if not isinstance(ln, dict):
            continue
        name = str(ln.get("name") or "").strip()
        try:
            x = float(ln.get("relative_market_share"))
            y = float(ln.get("market_growth_percent"))
        except (TypeError, ValueError):
            continue
        share = ln.get("revenue_share_percent")
        try:
            r = 8 + min(22.0, max(0.0, float(share)) * 0.35) if share is not None else 12
        except (TypeError, ValueError):
            r = 12
        pts.append((name, x, y, r, str(ln.get("quadrant") or "")))
    if len(pts) < 2:
        return ""

    L = _QUAD_LABELS["en" if str(lang).lower().startswith("en") else "fr"]
    W, H, PAD = 640, 420, 56
    xs = [p[1] for p in pts]
    ys = [p[2] for p in pts]
    x_max = max(2.0, max(xs) * 1.15)
    y_min = min(0.0, min(ys) * 1.15)
    y_max = max(10.0, max(ys) * 1.15)
    x_mid, y_mid = 1.0, 10.0  # canonical BCG thresholds

    def X(v):  # BCG x-axis is conventionally inverted (high share on the left)
        return PAD + (1 - v / x_max) * (W - 2 * PAD)

    def Y(v):
        return H - PAD - (v - y_min) / (y_max - y_min) * (H - 2 * PAD)

    e = _html.escape
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
         f'font-family="DM Sans, Helvetica, sans-serif" role="img" aria-label="Matrice BCG">']
    # quadrant background + frame + median lines
    s.append(f'<rect x="{PAD}" y="{PAD}" width="{W-2*PAD}" height="{H-2*PAD}" fill="#F7F4EF" stroke="#E2DDD4"/>')
    s.append(f'<line x1="{X(x_mid):.1f}" y1="{PAD}" x2="{X(x_mid):.1f}" y2="{H-PAD}" stroke="#E2DDD4" stroke-dasharray="4 4"/>')
    if y_min < y_mid < y_max:
        s.append(f'<line x1="{PAD}" y1="{Y(y_mid):.1f}" x2="{W-PAD}" y2="{Y(y_mid):.1f}" stroke="#E2DDD4" stroke-dasharray="4 4"/>')
    # quadrant captions (corners)
    cap = 'font-size="11" fill="#6E6A62"'
    s.append(f'<text x="{PAD+8}" y="{PAD+16}" {cap}>{e(L["STAR"])}</text>')
    s.append(f'<text x="{W-PAD-8}" y="{PAD+16}" text-anchor="end" {cap}>{e(L["QUESTION_MARK"])}</text>')
    s.append(f'<text x="{PAD+8}" y="{H-PAD-8}" {cap}>{e(L["CASH_COW"])}</text>')
    s.append(f'<text x="{W-PAD-8}" y="{H-PAD-8}" text-anchor="end" {cap}>{e(L["DOG"])}</text>')
    # axes labels
    s.append(f'<text x="{W/2:.0f}" y="{H-14}" text-anchor="middle" font-size="12" fill="#3A3630">{e(L["x"])}</text>')
    s.append(f'<text x="16" y="{H/2:.0f}" text-anchor="middle" font-size="12" fill="#3A3630" '
             f'transform="rotate(-90 16 {H/2:.0f})">{e(L["y"])}</text>')
    # bubbles + labels
    for name, x, y, r, quad in pts:
        cx, cy = X(max(0.0, min(x, x_max))), Y(max(y_min, min(y, y_max)))
        color = _QUAD_COLORS.get(quad, "#E8621A")
        s.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{color}" fill-opacity="0.75" stroke="#fff"/>')
        s.append(f'<text x="{cx:.1f}" y="{cy - r - 4:.1f}" text-anchor="middle" font-size="11" '
                 f'fill="#1C1A17">{e(name)}</text>')
    s.append("</svg>")
    return "".join(s)


def _render_block(parts, heading, lines):
    parts.append(f"<h3>{_html.escape(heading)}</h3>")
    if len(lines) == 1 and not lines[0].startswith("• "):
        parts.append(f"<p>{_html.escape(lines[0])}</p>")
    else:
        parts.append("<ul>")
        for ln in lines:
            parts.append(f"<li>{_html.escape(ln.lstrip('• '))}</li>")
        parts.append("</ul>")


def build_document(project, executions, lang: str = "fr") -> str:
    """The one branded, self-contained HTML document (used verbatim for the .html
    download and rendered by WeasyPrint for the PDF)."""
    html_lang = "en" if str(lang).lower().startswith("en") else "fr"
    parts = [
        f'<!DOCTYPE html><html lang="{html_lang}"><head><meta charset="UTF-8">',
        f"<title>Stratégie — {_html.escape(project.name)}</title>",
        f"<style>{_CSS}</style></head><body>",
        f"<h1>Stratégie — {_html.escape(project.name)}</h1>",
        f'<div class="meta">{translate("date", lang)} {today()} — Strategor</div>',
    ]

    summary = executive_summary(executions)
    if summary:
        parts.append('<div class="summary">')
        parts.append(f"<h2 style='margin-top:0;border:0'>{translate('executive_summary', lang)}</h2>")
        parts.append(f"<p>{_html.escape(summary)}</p>")
        parts.append("</div>")

    for e in done(executions):
        parts.append('<div class="agent">')
        parts.append(f"<h2>{translate('heading_agent', lang)} {e.agentId} — {_html.escape(e.agentName or '')}</h2>")
        if e.agentId == 11:
            svg = bcg_svg(e.output, lang)
            if svg:
                parts.append(f'<div class="chart">{svg}</div>')
        blocks = flatten_output(e.output)
        if not blocks:
            parts.append(f"<p><em>{translate('no_data', lang)}</em></p>")
        for heading, lines in blocks:
            _render_block(parts, heading, lines)
        parts.append("</div>")

    sources = collect_sources(executions)
    if sources:
        parts.append(f'<div class="agent"><h2>{translate("sources", lang)}</h2><ul>')
        for s in sources:
            parts.append(f"<li>{_html.escape(s)}</li>")
        parts.append("</ul></div>")

    parts.append(f'<div class="footer">{translate("generated_on", lang)} {today()}</div>')
    parts.append("</body></html>")
    return "".join(parts)


def export(project, executions, lang: str = "fr") -> bytes:
    return build_document(project, executions, lang).encode("utf-8")
