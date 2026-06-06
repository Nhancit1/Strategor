import json
from datetime import date

# Brand palette (from the design system / original exporters)
ORANGE = "E8621A"
ORANGE_DARK = "C04E10"
INK = "1C1A17"
INK3 = "6E6A62"
PAPER = "F7F4EF"
PAPER2 = "EDE9E1"


def pretty(output) -> str:
    try:
        return json.dumps(output, ensure_ascii=False, indent=2)
    except Exception:
        return "[Output indisponible]"


def today() -> str:
    return date.today().isoformat()


def done(executions) -> list:
    return [e for e in executions if e.status == "DONE"]


def humanize(key: str) -> str:
    """snake_case -> 'Readable label'."""
    return str(key).replace("_", " ").strip().capitalize()


def _stringify(v) -> str:
    if isinstance(v, dict):
        return "; ".join(f"{humanize(k)}: {_stringify(val)}" for k, val in v.items())
    if isinstance(v, list):
        return ", ".join(_stringify(x) for x in v)
    return str(v)


def flatten_output(output):
    """Turn a structured agent output into [(heading, [lines]), ...] for readable
    rendering across all formats (replaces dumping raw JSON). Sources/citations
    are skipped here — they are aggregated separately."""
    if not isinstance(output, dict):
        return [("Sortie", [str(output)])] if output else []
    blocks = []
    for key, val in output.items():
        if key in ("sources", "citations"):
            continue
        heading = humanize(key)
        lines = []
        if isinstance(val, str):
            if val.strip():
                lines = [val.strip()]
        elif isinstance(val, list):
            for item in val:
                if isinstance(item, (dict, list)):
                    lines.append("• " + _stringify(item))
                elif item is not None and str(item).strip():
                    lines.append("• " + str(item).strip())
        elif isinstance(val, dict):
            for k, v in val.items():
                lines.append(f"{humanize(k)} : {_stringify(v)}")
        elif val is not None:
            lines = [str(val)]
        if lines:
            blocks.append((heading, lines))
    return blocks


def executive_summary(executions) -> str:
    """Best-effort executive summary, pulled from the most relevant agents
    (Livrables -> Diagnostic -> Profil)."""
    by_id = {e.agentId: e for e in executions if e.status == "DONE"}
    candidates = [
        (8, ("executive_summary", "synthesis", "summary", "report", "recommendation")),
        (5, ("synthesis", "summary", "diagnostic", "conclusion")),
        (1, ("synthesis", "summary")),
    ]
    for aid, keys in candidates:
        e = by_id.get(aid)
        out = getattr(e, "output", None) if e else None
        if isinstance(out, dict):
            for k in keys:
                v = out.get(k)
                if isinstance(v, str) and v.strip():
                    return v.strip()
    return ""


def collect_sources(executions) -> list:
    """Aggregate any sources/citations embedded in agent outputs (forward-compatible
    with grounded runs). Returns a de-duplicated list of display strings."""
    seen, out = set(), []
    for e in executions:
        o = getattr(e, "output", None)
        if not isinstance(o, dict):
            continue
        for key in ("sources", "citations"):
            arr = o.get(key)
            if isinstance(arr, list):
                for item in arr:
                    if isinstance(item, dict):
                        label = item.get("title") or item.get("name") or item.get("text") or ""
                        url = item.get("url") or item.get("link") or ""
                        s = f"{label} — {url}".strip(" —") if (label or url) else ""
                    else:
                        s = str(item).strip()
                    if s and s not in seen:
                        seen.add(s)
                        out.append(s)
    return out
