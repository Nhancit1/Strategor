"""Exporter factory. Formats: pdf, docx, html (pptx/xlsx retired —
they were rarely useful and doubled the surface to keep coherent)."""
from . import docx_exporter, pdf_exporter, html_exporter

_EXPORTERS = {
    "docx": docx_exporter.export,
    "pdf": pdf_exporter.export,
    "html": html_exporter.export,
}


def get_exporter(fmt: str):
    fmt = fmt.lower()
    if fmt not in _EXPORTERS:
        raise KeyError(f"Format non supporté : {fmt}")
    return _EXPORTERS[fmt]
