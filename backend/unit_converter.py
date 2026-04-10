"""Unit conversion helpers for the calculator converter panel."""

from __future__ import annotations

import math
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation


@dataclass(frozen=True)
class UnitOption:
    id: str
    label: str


@dataclass(frozen=True)
class UnitCategory:
    id: str
    label: str
    units: tuple[UnitOption, ...]


CATEGORIES: tuple[UnitCategory, ...] = (
    UnitCategory(
        id="length",
        label="Length / Distance",
        units=(
            UnitOption("m", "meter (m)"),
            UnitOption("km", "kilometer (km)"),
            UnitOption("cm", "centimeter (cm)"),
            UnitOption("mm", "millimeter (mm)"),
            UnitOption("in", "inch (in)"),
            UnitOption("ft", "foot (ft)"),
            UnitOption("yd", "yard (yd)"),
            UnitOption("mi", "mile (mi)"),
            UnitOption("nmi", "nautical mile (nmi)"),
        ),
    ),
    UnitCategory(
        id="mass",
        label="Mass / Weight",
        units=(
            UnitOption("g", "gram (g)"),
            UnitOption("kg", "kilogram (kg)"),
            UnitOption("mg", "milligram (mg)"),
            UnitOption("lb", "pound (lb)"),
            UnitOption("oz", "ounce (oz)"),
            UnitOption("t", "metric ton (t)"),
            UnitOption("ust", "US ton (ust)"),
            UnitOption("st", "stone (st)"),
        ),
    ),
    UnitCategory(
        id="volume",
        label="Volume / Capacity",
        units=(
            UnitOption("l", "liter (L)"),
            UnitOption("ml", "milliliter (mL)"),
            UnitOption("m3", "cubic meter (m³)"),
            UnitOption("cm3", "cubic centimeter (cm³)"),
            UnitOption("gal_us", "gallon (US)"),
            UnitOption("gal_uk", "gallon (UK)"),
            UnitOption("qt_us", "quart (US)"),
            UnitOption("pt_us", "pint (US)"),
            UnitOption("cup_us", "cup (US)"),
            UnitOption("floz_us", "fluid ounce (US)"),
        ),
    ),
    UnitCategory(
        id="area",
        label="Area",
        units=(
            UnitOption("m2", "square meter (m²)"),
            UnitOption("km2", "square kilometer (km²)"),
            UnitOption("cm2", "square centimeter (cm²)"),
            UnitOption("ha", "hectare (ha)"),
            UnitOption("acre", "acre"),
            UnitOption("ft2", "square foot (ft²)"),
            UnitOption("yd2", "square yard (yd²)"),
            UnitOption("mi2", "square mile (mi²)"),
        ),
    ),
    UnitCategory(
        id="temperature",
        label="Temperature",
        units=(
            UnitOption("c", "Celsius (°C)"),
            UnitOption("f", "Fahrenheit (°F)"),
            UnitOption("k", "Kelvin (K)"),
        ),
    ),
    UnitCategory(
        id="time",
        label="Time",
        units=(
            UnitOption("s", "second (s)"),
            UnitOption("min", "minute (min)"),
            UnitOption("h", "hour (h)"),
            UnitOption("day", "day"),
            UnitOption("week", "week"),
            UnitOption("month", "month (approx.)"),
            UnitOption("year", "year"),
            UnitOption("decade", "decade"),
            UnitOption("century", "century"),
            UnitOption("millennium", "millennium"),
        ),
    ),
    UnitCategory(
        id="speed",
        label="Speed / Velocity",
        units=(
            UnitOption("mps", "meters per second (m/s)"),
            UnitOption("kmph", "kilometers per hour (km/h)"),
            UnitOption("mph", "miles per hour (mph)"),
            UnitOption("kn", "knots"),
            UnitOption("fps", "feet per second (ft/s)"),
        ),
    ),
    UnitCategory(
        id="energy",
        label="Energy / Work",
        units=(
            UnitOption("j", "joule (J)"),
            UnitOption("kj", "kilojoule (kJ)"),
            UnitOption("cal", "calorie (cal)"),
            UnitOption("kcal", "kilocalorie (kcal)"),
            UnitOption("wh", "watt-hour (Wh)"),
            UnitOption("ev", "electronvolt (eV)"),
            UnitOption("btu", "British Thermal Unit (BTU)"),
        ),
    ),
    UnitCategory(
        id="power",
        label="Power",
        units=(
            UnitOption("w", "watt (W)"),
            UnitOption("kw", "kilowatt (kW)"),
            UnitOption("hp", "horsepower (hp)"),
            UnitOption("btu_h", "BTU per hour"),
        ),
    ),
    UnitCategory(
        id="pressure",
        label="Pressure",
        units=(
            UnitOption("pa", "pascal (Pa)"),
            UnitOption("kpa", "kilopascal (kPa)"),
            UnitOption("bar", "bar"),
            UnitOption("atm", "atmosphere (atm)"),
            UnitOption("mmhg", "millimeters of mercury (mmHg)"),
            UnitOption("psi", "pounds per square inch (psi)"),
        ),
    ),
    UnitCategory(
        id="density",
        label="Density",
        units=(
            UnitOption("kgm3", "kilogram per cubic meter (kg/m³)"),
            UnitOption("gcm3", "gram per cubic centimeter (g/cm³)"),
            UnitOption("lbft3", "pound per cubic foot (lb/ft³)"),
        ),
    ),
    UnitCategory(
        id="angle",
        label="Angle",
        units=(
            UnitOption("deg", "degrees (°)"),
            UnitOption("rad", "radians (rad)"),
            UnitOption("gon", "gradians (gon)"),
        ),
    ),
    UnitCategory(
        id="data",
        label="Data / Digital Information",
        units=(
            UnitOption("bit", "bit"),
            UnitOption("byte", "byte"),
            UnitOption("kb", "kilobyte (KB)"),
            UnitOption("mb", "megabyte (MB)"),
            UnitOption("gb", "gigabyte (GB)"),
            UnitOption("tb", "terabyte (TB)"),
        ),
    ),
)

CATEGORY_MAP = {category.id: category for category in CATEGORIES}
UNIT_TO_CATEGORY: dict[str, str] = {}
UNIT_LABELS: dict[str, str] = {}
for category in CATEGORIES:
    for unit in category.units:
        UNIT_TO_CATEGORY[unit.id] = category.id
        UNIT_LABELS[unit.id] = unit.label


_LENGTH_TO_M = {
    "m": Decimal("1"),
    "km": Decimal("1000"),
    "cm": Decimal("0.01"),
    "mm": Decimal("0.001"),
    "in": Decimal("0.0254"),
    "ft": Decimal("0.3048"),
    "yd": Decimal("0.9144"),
    "mi": Decimal("1609.344"),
    "nmi": Decimal("1852"),
}

_MASS_TO_KG = {
    "g": Decimal("0.001"),
    "kg": Decimal("1"),
    "mg": Decimal("0.000001"),
    "lb": Decimal("0.45359237"),
    "oz": Decimal("0.028349523125"),
    "t": Decimal("1000"),
    "ust": Decimal("907.18474"),
    "st": Decimal("6.35029318"),
}

_VOLUME_TO_L = {
    "l": Decimal("1"),
    "ml": Decimal("0.001"),
    "m3": Decimal("1000"),
    "cm3": Decimal("0.001"),
    "gal_us": Decimal("3.785411784"),
    "gal_uk": Decimal("4.54609"),
    "qt_us": Decimal("0.946352946"),
    "pt_us": Decimal("0.473176473"),
    "cup_us": Decimal("0.2365882365"),
    "floz_us": Decimal("0.0295735295625"),
}

_AREA_TO_M2 = {
    "m2": Decimal("1"),
    "km2": Decimal("1000000"),
    "cm2": Decimal("0.0001"),
    "ha": Decimal("10000"),
    "acre": Decimal("4046.8564224"),
    "ft2": Decimal("0.09290304"),
    "yd2": Decimal("0.83612736"),
    "mi2": Decimal("2589988.110336"),
}

_TIME_TO_S = {
    "s": Decimal("1"),
    "min": Decimal("60"),
    "h": Decimal("3600"),
    "day": Decimal("86400"),
    "week": Decimal("604800"),
    "month": Decimal("2629746"),      # 30.436875 days
    "year": Decimal("31556952"),      # 365.2425 days
    "decade": Decimal("315569520"),
    "century": Decimal("3155695200"),
    "millennium": Decimal("31556952000"),
}

_SPEED_TO_MPS = {
    "mps": Decimal("1"),
    "kmph": Decimal("0.2777777777777778"),
    "mph": Decimal("0.44704"),
    "kn": Decimal("0.5144444444444445"),
    "fps": Decimal("0.3048"),
}

_ENERGY_TO_J = {
    "j": Decimal("1"),
    "kj": Decimal("1000"),
    "cal": Decimal("4.184"),
    "kcal": Decimal("4184"),
    "wh": Decimal("3600"),
    "ev": Decimal("1.602176634e-19"),
    "btu": Decimal("1055.05585262"),
}

_POWER_TO_W = {
    "w": Decimal("1"),
    "kw": Decimal("1000"),
    "hp": Decimal("745.6998715822702"),
    "btu_h": Decimal("0.2930710701722222"),
}

_PRESSURE_TO_PA = {
    "pa": Decimal("1"),
    "kpa": Decimal("1000"),
    "bar": Decimal("100000"),
    "atm": Decimal("101325"),
    "mmhg": Decimal("133.322387415"),
    "psi": Decimal("6894.757293168"),
}

_DENSITY_TO_KGM3 = {
    "kgm3": Decimal("1"),
    "gcm3": Decimal("1000"),
    "lbft3": Decimal("16.01846337396014"),
}

_ANGLE_TO_RAD = {
    "deg": math.pi / 180.0,
    "rad": 1.0,
    "gon": math.pi / 200.0,
}

_DATA_TO_BIT = {
    "bit": Decimal("1"),
    "byte": Decimal("8"),
    "kb": Decimal("8192"),   # 1024 bytes
    "mb": Decimal("8388608"),
    "gb": Decimal("8589934592"),
    "tb": Decimal("8796093022208"),
}


class UnitConversionError(ValueError):
    """Raised when a unit conversion cannot be completed."""


def get_category(category_id: str | None) -> UnitCategory | None:
    if not category_id:
        return None
    return CATEGORY_MAP.get(str(category_id).strip().lower())


def infer_category(source: str, target: str, category_id: str | None = None) -> str | None:
    if category_id and category_id in CATEGORY_MAP:
        return category_id

    source = str(source or "").strip().lower()
    target = str(target or "").strip().lower()

    source_cat = UNIT_TO_CATEGORY.get(source)
    target_cat = UNIT_TO_CATEGORY.get(target)

    if source_cat and source_cat == target_cat:
        return source_cat
    if source_cat and not target_cat:
        return source_cat
    if target_cat and not source_cat:
        return target_cat
    if source_cat and target_cat and source_cat != target_cat:
        raise UnitConversionError("Selected units belong to different categories.")
    return None


def list_category_units(category_id: str) -> tuple[UnitOption, ...]:
    category = get_category(category_id)
    if category is None:
        raise UnitConversionError("Unsupported unit category.")
    return category.units


def convert_value(
    value,
    source: str,
    target: str,
    category_id: str | None = None,
    precision: int = 10,
) -> str:
    source = str(source or "").strip().lower()
    target = str(target or "").strip().lower()
    category_id = infer_category(source, target, category_id)

    if not source or not target:
        raise UnitConversionError("Source and target units are required.")

    if source == target:
        return _format_number(value, precision=precision)

    if category_id == "temperature":
        result = _convert_temperature(value, source, target)
        return _format_number(result, precision=precision)

    if category_id == "length":
        return _convert_linear(value, source, target, _LENGTH_TO_M, precision)
    if category_id == "mass":
        return _convert_linear(value, source, target, _MASS_TO_KG, precision)
    if category_id == "volume":
        return _convert_linear(value, source, target, _VOLUME_TO_L, precision)
    if category_id == "area":
        return _convert_linear(value, source, target, _AREA_TO_M2, precision)
    if category_id == "time":
        return _convert_linear(value, source, target, _TIME_TO_S, precision)
    if category_id == "speed":
        return _convert_linear(value, source, target, _SPEED_TO_MPS, precision)
    if category_id == "energy":
        return _convert_linear(value, source, target, _ENERGY_TO_J, precision)
    if category_id == "power":
        return _convert_linear(value, source, target, _POWER_TO_W, precision)
    if category_id == "pressure":
        return _convert_linear(value, source, target, _PRESSURE_TO_PA, precision)
    if category_id == "density":
        return _convert_linear(value, source, target, _DENSITY_TO_KGM3, precision)
    if category_id == "angle":
        return _convert_angle(value, source, target, precision)
    if category_id == "data":
        return _convert_linear(value, source, target, _DATA_TO_BIT, precision)

    raise UnitConversionError("Unsupported unit conversion.")


def _convert_linear(value, source: str, target: str, factors: dict[str, Decimal], precision: int) -> str:
    if source not in factors or target not in factors:
        raise UnitConversionError("Unsupported unit conversion.")
    numeric = _to_decimal(value)
    in_base = numeric * factors[source]
    result = in_base / factors[target]
    return _format_number(result, precision=precision)


def _convert_temperature(value, source: str, target: str) -> Decimal:
    numeric = _to_decimal(value)
    if source == target:
        return numeric

    if source == "c":
        celsius = numeric
    elif source == "f":
        celsius = (numeric - Decimal("32")) * Decimal("5") / Decimal("9")
    elif source == "k":
        celsius = numeric - Decimal("273.15")
    else:
        raise UnitConversionError("Unsupported temperature unit.")

    if target == "c":
        return celsius
    if target == "f":
        return celsius * Decimal("9") / Decimal("5") + Decimal("32")
    if target == "k":
        return celsius + Decimal("273.15")

    raise UnitConversionError("Unsupported temperature unit.")


def _convert_angle(value, source: str, target: str, precision: int) -> str:
    if source not in _ANGLE_TO_RAD or target not in _ANGLE_TO_RAD:
        raise UnitConversionError("Unsupported unit conversion.")
    numeric = float(_to_decimal(value))
    radians = numeric * _ANGLE_TO_RAD[source]
    result = radians / _ANGLE_TO_RAD[target]
    return _format_number(result, precision=precision)


def _to_decimal(value) -> Decimal:
    text = str(value).replace(",", "").strip()
    if not text:
        return Decimal("0")
    try:
        return Decimal(text)
    except InvalidOperation as exc:
        raise UnitConversionError("Invalid numeric value.") from exc


def _format_number(value, precision: int = 10) -> str:
    numeric = value if isinstance(value, Decimal) else Decimal(str(value))

    if numeric.is_nan() or numeric.is_infinite():
        raise UnitConversionError("Invalid conversion result.")

    sign = "-" if numeric < 0 else ""
    numeric = abs(numeric)

    if numeric == 0:
        return "0"

    text = format(numeric, f".{precision}g")
    if "e" in text or "E" in text:
        mantissa, exponent = text.lower().split("e", 1)
        mantissa = _group_mantissa(mantissa)
        return f"{sign}{mantissa}e{int(exponent)}"

    if "." in text:
        integer, fraction = text.split(".", 1)
        integer = _group_int(integer)
        fraction = fraction.rstrip("0")
        if fraction:
            return f"{sign}{integer}.{fraction}"
        return f"{sign}{integer}"

    return f"{sign}{_group_int(text)}"


def _group_int(text: str) -> str:
    raw = text.replace(",", "")
    if not raw.isdigit():
        return text
    parts = []
    while raw:
        parts.append(raw[-3:])
        raw = raw[:-3]
    return ",".join(reversed(parts))


def _group_mantissa(text: str) -> str:
    sign = ""
    if text.startswith("-"):
        sign = "-"
        text = text[1:]
    if "." in text:
        integer, fraction = text.split(".", 1)
        integer = _group_int(integer)
        fraction = fraction.rstrip("0")
        if fraction:
            return f"{sign}{integer}.{fraction}"
        return f"{sign}{integer}"
    return f"{sign}{_group_int(text)}"


def categories_payload() -> list[dict[str, object]]:
    return [
        {
            "id": category.id,
            "label": category.label,
            "units": [{"id": unit.id, "label": unit.label} for unit in category.units],
        }
        for category in CATEGORIES
    ]