"""Normalize user-facing calculator syntax into a safe internal expression."""

from __future__ import annotations

import re

_UI_REPLACEMENTS = (
    ("×", "*"),
    ("÷", "/"),
    ("−", "-"),
    ("–", "-"),
    ("—", "-"),
    ("√", "sqrt"),
    ("∛", "cbrt"),
    ("^", "**"),
)

def normalize_expression(expression: str) -> str:
    """Translate calculator symbols into a parser-friendly expression."""
    if expression is None:
        return ""
    text = str(expression).strip()
    if not text:
        return ""

    text = re.sub(r"\s+", "", text)
    text = text.replace(",", "")

    for src, dst in _UI_REPLACEMENTS:
        text = text.replace(src, dst)

    return text
