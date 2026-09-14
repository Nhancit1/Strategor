"""
Project currency (chosen in onboarding, profile["currency"]).

Every amount the agents write must use this currency. Profiles saved before the field
existed have no currency: they were analysed in euros, so they fall back to EUR.
"""
from __future__ import annotations
from typing import Optional

_CURRENCIES = {
    # code: (French name, English name, "millions" unit written in the outputs)
    "MAD": ("dirham marocain", "Moroccan dirham", "M MAD"),
    "EUR": ("euro", "euro", "M€"),
    "USD": ("dollar américain", "US dollar", "M$"),
}
LEGACY_CURRENCY = "EUR"


def currency_code(profile: Optional[dict]) -> str:
    code = str((profile or {}).get("currency") or "").strip().upper()
    return code if code in _CURRENCIES else LEGACY_CURRENCY


def currency_label(profile: Optional[dict], is_en: bool = False) -> str:
    code = currency_code(profile)
    return f"{code} ({_CURRENCIES[code][1 if is_en else 0]})"


def million_unit(profile: Optional[dict]) -> str:
    return _CURRENCIES[currency_code(profile)][2]
