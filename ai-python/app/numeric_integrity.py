"""
Deterministic numeric-integrity checker.

Runs over the collected agent outputs and produces a structured, auditable report.
PURE PYTHON on purpose: arithmetic and cross-section consistency are exactly what an
LLM (the generators OR the Agent-15 reviewer) cannot be trusted to verify, so we check
them with code. This is complementary to Agent 15 (semantic/strategic coherence), not a
replacement — the report carries a `semantic` summary of Agent 15's findings so the two
appear together.

Principles:
  * Never raise — each check is individually guarded; a checker failure is skipped.
  * High precision over recall. Structured-field violations (BCG) are `error`; free-text
    heuristics are `warning` ("à vérifier") and only when unambiguous, to avoid false alarms.

Report:
  {
    "generatedAt": <iso8601>,
    "status": "ok" | "warnings" | "errors",
    "summary": {"errors","warnings","info","checks"},
    "checks": [ {"id","severity","title","detail","agents":[int...],"values":{...}} ],
    "semantic": {"count": int, "high": int, "medium": int, "low": int}  # from Agent 15
  }
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

log = logging.getLogger("strategor.numeric_integrity")

_RMS_HIGH = 1.0       # BCG relative market share boundary (your share / largest rival's)
_GROWTH_HIGH = 10.0   # BCG "high growth" boundary, in %

AGENT15_ID = 15       # the LLM coherence reviewer


# ── extraction helpers ───────────────────────────────────────────────────────
def _walk_strings(obj: Any, _path: str = "") -> Iterable[tuple[str, str]]:
    if isinstance(obj, str):
        if obj.strip():
            yield _path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk_strings(v, f"{_path}.{k}" if _path else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _walk_strings(v, f"{_path}[{i}]")


def _to_float(num: str) -> Optional[float]:
    try:
        return float(num.replace("\u202f", "").replace(" ", "").replace(",", "."))
    except (TypeError, ValueError):
        return None


_MEUR_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*M€", re.IGNORECASE)
_PCT_RE = re.compile(r"(?<![\d.,\-–])([+-]?\d+(?:[.,]\d+)?)\s*%")
_CLIENTS_RE = re.compile(r"\b(\d{1,4})\s+clients?\b", re.IGNORECASE)
_HEADCOUNT_RE = re.compile(r"\b(\d{1,5})\s+(?:collaborateur|salari|personne|ETP|employ)", re.IGNORECASE)
_RANGE_RE = re.compile(r"\d+(?:[.,]\d+)?\s*(?:-|–|à)\s*\d+(?:[.,]\d+)?\s*%")


def _meur(s: str) -> list[float]:
    return [v for v in (_to_float(m.group(1)) for m in _MEUR_RE.finditer(s)) if v is not None]


def _pcts(s: str) -> list[float]:
    return [v for v in (_to_float(m.group(1)) for m in _PCT_RE.finditer(s)) if v is not None]


# ── checks ───────────────────────────────────────────────────────────────────
def _check_bcg(outputs: dict, checks: list) -> None:
    bcg = outputs.get(11)
    if not isinstance(bcg, dict):
        return
    lines = bcg.get("lines")
    if not isinstance(lines, list) or not lines:
        return

    shares = [l.get("revenue_share_percent") for l in lines
              if isinstance(l, dict) and isinstance(l.get("revenue_share_percent"), (int, float))]
    if shares:
        total = round(sum(shares), 1)
        if abs(total - 100) > 2:
            checks.append({
                "id": "bcg_revenue_share_sum", "severity": "error",
                "title": "Parts de CA de la matrice BCG incohérentes",
                "detail": f"La somme des parts de CA des lignes BCG = {total}% (attendu ~100%).",
                "agents": [11], "values": {"sum_percent": total},
            })

    quad_share = {"STAR": "high", "CASH_COW": "high", "QUESTION_MARK": "low", "DOG": "low"}
    quad_growth = {"STAR": "high", "QUESTION_MARK": "high", "CASH_COW": "low", "DOG": "low"}
    for l in lines:
        if not isinstance(l, dict):
            continue
        q, rms, g = l.get("quadrant"), l.get("relative_market_share"), l.get("market_growth_percent")
        name = l.get("name") or "(ligne sans nom)"
        if q not in quad_share:
            continue
        if isinstance(rms, (int, float)):
            if rms <= 0:
                checks.append({
                    "id": "bcg_rms_nonpositive", "severity": "error",
                    "title": f"Part de marché relative invalide — « {name} »",
                    "detail": f"relative_market_share = {rms} (doit être > 0).",
                    "agents": [11], "values": {"line": name, "rms": rms},
                })
            elif ("high" if rms >= _RMS_HIGH else "low") != quad_share[q]:
                checks.append({
                    "id": "bcg_quadrant_share_mismatch", "severity": "error",
                    "title": f"Quadrant BCG incohérent (axe part) — « {name} »",
                    "detail": f"Quadrant {q} mais part relative {rms} "
                              f"({'≥' if rms >= _RMS_HIGH else '<'} 1,0) ; par définition {q} exige "
                              f"une part {'forte (≥1)' if quad_share[q]=='high' else 'faible (<1)'}.",
                    "agents": [11], "values": {"line": name, "quadrant": q, "rms": rms},
                })
        if isinstance(g, (int, float)) and ("high" if g >= _GROWTH_HIGH else "low") != quad_growth[q]:
            checks.append({
                "id": "bcg_quadrant_growth_mismatch", "severity": "warning",
                "title": f"Quadrant BCG à vérifier (axe croissance) — « {name} »",
                "detail": f"Quadrant {q} mais croissance {g}% (seuil usuel {int(_GROWTH_HIGH)}%).",
                "agents": [11], "values": {"line": name, "quadrant": q, "growth": g},
            })


def _check_growth_math(outputs: dict, checks: list) -> None:
    for aid, payload in outputs.items():
        if aid < 0 or not isinstance(payload, (dict, list)):
            continue
        for path, s in _walk_strings(payload):
            if _RANGE_RE.search(s):
                continue
            amounts, pcts = _meur(s), _pcts(s)
            if len(amounts) != 2 or len(pcts) != 1:
                continue
            base, target, pct = amounts[0], amounts[1], pcts[0]
            if base <= 0:
                continue
            expected = base * (1 + pct / 100.0)
            if abs(expected - target) / max(abs(target), 1e-9) > 0.05:
                implied = round((target / base - 1) * 100, 1)
                checks.append({
                    "id": "growth_math_inconsistent", "severity": "warning",
                    "title": "Calcul de croissance incohérent (à vérifier)",
                    "detail": (f"« …{s.strip()[:140]}… » : {base:g}M€ → {target:g}M€ "
                               f"correspond à {implied:+g}%, pas {pct:+g}%."),
                    "agents": [aid], "values": {"base": base, "target": target,
                                                "stated_pct": pct, "implied_pct": implied},
                })


def _check_anchor_drift(outputs: dict, checks: list) -> None:
    for label, rx, key in (("nombre de clients", _CLIENTS_RE, "clients"),
                            ("effectif", _HEADCOUNT_RE, "headcount")):
        values: dict[int, set[int]] = {}
        for aid, payload in outputs.items():
            if aid < 0 or not isinstance(payload, (dict, list)):
                continue
            found: set[int] = set()
            for _path, s in _walk_strings(payload):
                for m in rx.finditer(s):
                    n = int(m.group(1))
                    if 0 < n < 100000:
                        found.add(n)
            if found:
                values[aid] = found
        distinct = sorted({n for s in values.values() for n in s})
        if len(distinct) > 1:
            checks.append({
                "id": f"anchor_drift_{key}", "severity": "warning",
                "title": f"Incohérence potentielle — {label}",
                "detail": f"Valeurs divergentes pour « {label} » entre agents : {distinct}. "
                          "Une valeur de référence unique est attendue.",
                "agents": sorted(values.keys()),
                "values": {"distinct": distinct,
                           "per_agent": {str(a): sorted(s) for a, s in sorted(values.items())}},
            })


def _semantic_summary(outputs: dict) -> dict:
    """Summarise Agent 15's LLM inconsistencies so the report unifies both layers."""
    out = {"count": 0, "high": 0, "medium": 0, "low": 0}
    a15 = outputs.get(AGENT15_ID)
    if not isinstance(a15, dict):
        return out
    items = a15.get("inconsistencies")
    if not isinstance(items, list):
        return out
    out["count"] = len(items)
    for it in items:
        if isinstance(it, dict):
            sev = str(it.get("severity", "")).lower()
            if sev in out:
                out[sev] += 1
    return out


# ── entry point ──────────────────────────────────────────────────────────────
def check_numeric_integrity(outputs: dict, profile: Optional[dict] = None,
                            finance: Optional[dict] = None) -> dict:
    checks: list[dict] = []
    for fn in (_check_bcg, _check_growth_math, _check_anchor_drift):
        try:
            fn(outputs, checks)
        except Exception as e:  # pragma: no cover
            log.warning("numeric check %s failed: %s", getattr(fn, "__name__", fn), e)

    errors = sum(1 for c in checks if c["severity"] == "error")
    warnings = sum(1 for c in checks if c["severity"] == "warning")
    info = sum(1 for c in checks if c["severity"] == "info")
    status = "errors" if errors else ("warnings" if warnings else "ok")

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "summary": {"errors": errors, "warnings": warnings, "info": info, "checks": len(checks)},
        "checks": checks,
        "semantic": _semantic_summary(outputs),
    }
