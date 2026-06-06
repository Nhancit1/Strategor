"""
Document text extraction — port of DocumentParserService.

docx / xlsx / pptx via python-docx / openpyxl / python-pptx.
txt / md / csv read directly. PDF via pdfplumber (the Java version only
stubbed PDFs; here we extract real text).
"""
import logging
import os

log = logging.getLogger("strategor.parser")


def extract_text(storage_path: str, filename: str, mime_type: str | None) -> str:
    name = (filename or "").lower()
    mime = mime_type or ""

    if name.endswith(".docx") or "wordprocessing" in mime:
        return _docx(storage_path)
    if name.endswith(".xlsx") or "spreadsheet" in mime:
        return _xlsx(storage_path)
    if name.endswith(".pptx") or "presentation" in mime:
        return _pptx(storage_path)
    if name.endswith((".txt", ".md", ".csv")) or mime.startswith("text/"):
        with open(storage_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    if name.endswith(".pdf") or "pdf" in mime:
        return _pdf(storage_path)

    return (f"[Document {filename} — type non supporté pour extraction. "
            "Contenu à exploiter manuellement.]")


def _docx(path: str) -> str:
    from docx import Document
    doc = Document(path)
    lines = [p.text for p in doc.paragraphs]
    # tables too
    for table in doc.tables:
        for row in table.rows:
            lines.append("\t".join(c.text for c in row.cells))
    return "\n".join(lines)


def _xlsx(path: str) -> str:
    from openpyxl import load_workbook
    wb = load_workbook(path, read_only=True, data_only=True)
    out = []
    for ws in wb.worksheets:
        out.append(f"== Feuille : {ws.title} ==")
        for row in ws.iter_rows(values_only=True):
            cells = ["" if v is None else str(v) for v in row]
            if any(cells):
                out.append("\t".join(cells))
    wb.close()
    return "\n".join(out)


def _pptx(path: str) -> str:
    from pptx import Presentation
    prs = Presentation(path)
    out = []
    for i, slide in enumerate(prs.slides, start=1):
        out.append(f"== Slide {i} ==")
        for shape in slide.shapes:
            if shape.has_text_frame:
                out.append(shape.text_frame.text)
    return "\n".join(out)


def _pdf(path: str) -> str:
    import pdfplumber
    out = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            out.append(f"== Page {i} ==\n{text}")
    return "\n".join(out)
