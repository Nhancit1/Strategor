"""Exporter factory — port of ExporterFactory."""
from . import docx_exporter, pdf_exporter, pptx_exporter, xlsx_exporter

_EXPORTERS = {
    "docx": docx_exporter.export,
    "pdf": pdf_exporter.export,
    "pptx": pptx_exporter.export,
    "xlsx": xlsx_exporter.export,
}


def get_exporter(fmt: str):
    fmt = fmt.lower()
    if fmt not in _EXPORTERS:
        raise KeyError(f"Format non supporté : {fmt}")
    return _EXPORTERS[fmt]
