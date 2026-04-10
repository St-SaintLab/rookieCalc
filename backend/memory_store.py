"""Session memory helpers for the calculator."""

from __future__ import annotations

from copy import deepcopy
from typing import Dict

from settings import DEFAULT_SETTINGS

def default_memory() -> dict[str, str]:
    """Return an empty five-slot memory map."""
    return {slot: "" for slot in DEFAULT_SETTINGS.allowed_slots}

def _normalize_slot(slot: str) -> str:
    if not isinstance(slot, str):
        raise ValueError("Invalid slot")
    slot = slot.strip().upper()
    if slot not in DEFAULT_SETTINGS.allowed_slots:
        raise ValueError("Invalid slot")
    return slot

def _normalize_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()

def _copy_memory(memory: dict[str, str] | None) -> dict[str, str]:
    current = default_memory() if memory is None else deepcopy(memory)
    for slot in DEFAULT_SETTINGS.allowed_slots:
        current.setdefault(slot, "")
    return current

def store_value(slot: str, value, memory: dict[str, str] | None = None) -> dict[str, str]:
    """Store a value in a slot, overwriting the previous value."""
    slot = _normalize_slot(slot)
    current = _copy_memory(memory)
    current[slot] = _normalize_value(value)
    return current

def recall_value(slot: str, memory: dict[str, str] | None = None) -> str:
    """Recall a value from a memory slot."""
    slot = _normalize_slot(slot)
    current = _copy_memory(memory)
    return current.get(slot, "")

def add_to_value(slot: str, value, memory: dict[str, str] | None = None) -> dict[str, str]:
    """Add a numeric value to a slot. Empty slots behave like zero."""
    slot = _normalize_slot(slot)
    current = _copy_memory(memory)

    existing = current.get(slot, "")
    existing_num = _to_number(existing)
    incoming_num = _to_number(value)
    current[slot] = _number_to_string(existing_num + incoming_num)
    return current

def reset_memory() -> dict[str, str]:
    """Reset all memory slots to blank strings."""
    return default_memory()

def _to_number(value) -> float:
    if value in ("", None):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return 0.0
    try:
        from fractions import Fraction
        if "/" in text and not any(ch.isalpha() for ch in text):
            return float(Fraction(text))
        return float(text)
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise ValueError("Memory values must be numeric") from exc

def _number_to_string(value: float) -> str:
    if value.is_integer():
        return str(int(value))
    return format(value, ".12g")
