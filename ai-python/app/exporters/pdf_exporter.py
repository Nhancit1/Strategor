"""
PDF export — renders the SAME branded HTML document as the .html export
(html_exporter.build_document), so PDF and HTML never diverge and PDF text is
selectable by construction. Engine selectable via PDF_ENGINE: 'weasyprint'
(default, pure python) or 'chromium' (headless subprocess).
"""
import os
import subprocess
import tempfile
import uuid
from .html_exporter import build_document
from ..config import settings


def export(project, executions, lang: str = "fr") -> bytes:
    doc_html = build_document(project, executions, lang)
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
