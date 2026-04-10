"""Application settings for the scientific calculator."""

from dataclasses import dataclass, field

@dataclass(frozen=True)
class CalculatorSettings:
    precision: int = 10
    max_memory_slots: int = 5
    default_mode: str = "DEG"
    allowed_modes: tuple[str, ...] = ("DEG", "RAD", "GRD")
    allowed_slots: tuple[str, ...] = ("M1", "M2", "M3", "M4", "M5")
    max_expression_length: int = 512
    enable_fraction_display: bool = True
    default_memory: dict = field(
        default_factory=lambda: {slot: "" for slot in ("M1", "M2", "M3", "M4", "M5")}
    )

DEFAULT_SETTINGS = CalculatorSettings()
