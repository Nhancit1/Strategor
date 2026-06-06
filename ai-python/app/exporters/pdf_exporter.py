"""
PDF export — branded HTML template, then rendered. Engine selectable via
PDF_ENGINE: 'weasyprint' (default, pure python) or 'chromium' (headless
subprocess). Now renders an executive summary, readable structured sections
(not raw JSON), all DONE agents, and a Sources section. Cost is never included.
"""
import html
import os
import subprocess
import tempfile
import uuid
from .common import (today, done, flatten_output, executive_summary, collect_sources,
                     ORANGE, ORANGE_DARK, INK, INK3, PAPER, PAPER2)
from ..config import settings

_CSS = f"""
  body{{font-family:'Helvetica',sans-serif;margin:40px;color:#{INK};line-height:1.6}}
  h1{{color:#{ORANGE};font-size:28px;margin-bottom:8px}}
  h2{{color:#{ORANGE_DARK};font-size:20px;margin-top:24px;border-bottom:2px solid #F07830;padding-bottom:4px}}
  h3{{color:#{INK};font-size:14px;margin:12px 0 4px}}
  p{{margin:4px 0;font-size:13px}}
  ul{{margin:4px 0 8px 18px}}
  li{{margin:2px 0;font-size:13px}}
  .meta{{color:#{INK3};font-size:13px;margin-bottom:24px}}
  .agent{{margin:16px 0;padding:12px;background:#{PAPER};border-radius:8px}}
  .summary{{margin:16px 0;padding:14px;background:#{PAPER2};border-left:4px solid #{ORANGE};border-radius:6px}}
  .footer{{margin-top:40px;color:#{INK3};font-size:11px;text-align:center}}
"""


def _render_block(parts, heading, lines):
    parts.append(f"<h3>{html.escape(heading)}</h3>")
    if len(lines) == 1 and not lines[0].startswith("• "):
        parts.append(f"<p>{html.escape(lines[0])}</p>")
    else:
        parts.append("<ul>")
        for ln in lines:
            parts.append(f"<li>{html.escape(ln.lstrip('• '))}</li>")
        parts.append("</ul>")


def _build_html(project, executions) -> str:
    parts = [
        '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">',
        f"<style>{_CSS}</style></head><body>",
        f"<h1>Stratégie — {html.escape(project.name)}</h1>",
        f'<div class="meta">Date : {today()} — Strategor</div>',
    ]

    summary = executive_summary(executions)
    if summary:
        parts.append('<div class="summary">')
        parts.append("<h2 style='margin-top:0;border:0'>Synthèse exécutive</h2>")
        parts.append(f"<p>{html.escape(summary)}</p>")
        parts.append("</div>")

    for e in done(executions):
        parts.append('<div class="agent">')
        parts.append(f"<h2>Agent {e.agentId} — {html.escape(e.agentName or '')}</h2>")
        blocks = flatten_output(e.output)
        if not blocks:
            parts.append("<p><em>(Aucune donnée)</em></p>")
        for heading, lines in blocks:
            _render_block(parts, heading, lines)
        parts.append("</div>")

    sources = collect_sources(executions)
    if sources:
        parts.append('<div class="agent"><h2>Sources</h2><ul>')
        for s in sources:
            parts.append(f"<li>{html.escape(s)}</li>")
        parts.append("</ul></div>")

    parts.append(f'<div class="footer">Strategor — généré le {today()}</div>')
    parts.append("</body></html>")
    return "".join(parts)


def export(project, executions) -> bytes:
    doc_html = _build_html(project, executions)
    if settings.pdf_engine == "chromium":
        return _render_chromium(doc_html)
    return _render_weasyprint(doc_html)


def _render_weasyprint(doc_html: str) -> bytes:
    from weasyprint import HTML  # lazy import (heavy native deps)
    return HTML(string=doc_html).write_pdf()


def _render_chromium(doc_html: str) -> bytes:
    workdir = tempfile.mkdtemp(prefix="strategor-pdf-")
    html_file = os.path.join(workdir, f"{uuid.uuid4()}.html")
    pdf_file = html_file.replace(".html", ".pdf")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(doc_html)
    try:
        proc = subprocess.run(
            [settings.chromium_path, "--headless", "--disable-gpu", "--no-sandbox",
             f"--print-to-pdf={pdf_file}", "--print-to-pdf-no-header",
             f"file://{html_file}"],
            timeout=60, capture_output=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"Chromium exit={proc.returncode}: {proc.stderr.decode(errors='replace')}")
        with open(pdf_file, "rb") as f:
            return f.read()
    finally:
        for p in (html_file, pdf_file):
            try:
                os.path.exists(p) and os.remove(p)
            except OSError:
                pass
