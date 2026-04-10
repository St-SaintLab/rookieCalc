"""Flask application bootstrap and API routes."""

from __future__ import annotations

import os
from decimal import Decimal, InvalidOperation
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, session

from calculator_engine import evaluate_expression
from memory_store import add_to_value, default_memory, reset_memory, store_value
from settings import DEFAULT_SETTINGS
from unit_converter import UnitConversionError, convert_value, infer_category

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
MAX_HISTORY = 5


def _ensure_session_state() -> None:
    session.setdefault("expression", "")
    session.setdefault("answer", "")
    session.setdefault("mode", DEFAULT_SETTINGS.default_mode)
    session.setdefault("memory", default_memory())
    session.setdefault("shift", False)
    session.setdefault("alpha", False)
    session.setdefault("answer_history", [])


def _memory_dict() -> dict[str, str]:
    memory = session.get("memory")
    if not isinstance(memory, dict):
        memory = default_memory()
    for slot in DEFAULT_SETTINGS.allowed_slots:
        memory.setdefault(slot, "")
    return memory


def _validated_mode(mode: str | None) -> str:
    candidate = str(mode or DEFAULT_SETTINGS.default_mode).upper()
    if candidate not in DEFAULT_SETTINGS.allowed_modes:
        return DEFAULT_SETTINGS.default_mode
    return candidate


def _answer_history() -> list[str]:
    history = session.get("answer_history")
    if not isinstance(history, list):
        history = []
    return [str(item) for item in history if item is not None]


def _latest_answer() -> str | None:
    history = _answer_history()
    if history:
        return history[-1]
    answer = session.get("answer", "")
    if answer not in ("", None):
        return str(answer)
    return None


def _append_answer_history(answer: str) -> None:
    history = _answer_history()
    history.append(str(answer))
    session["answer_history"] = history[-MAX_HISTORY:]


def _session_state() -> dict[str, object]:
    return {
        "ok": True,
        "expression": session.get("expression", ""),
        "answer": session.get("answer", ""),
        "mode": session.get("mode", DEFAULT_SETTINGS.default_mode),
        "memory": _memory_dict(),
        "answer_history": _answer_history(),
    }


def _convert_decimal_standard(value, source: str, target: str, precision: int) -> str:
    text = str(value).replace(",", "").strip()
    if not text:
        return "0"

    try:
        if source == "standard" and target == "decimal":
            normalized = (
                text.replace("×10^", "e")
                .replace("x10^", "e")
                .replace("X10^", "e")
                .replace("×10", "e")
            )
            number = Decimal(normalized)
            plain = format(number, "f")
            if "." in plain:
                plain = plain.rstrip("0").rstrip(".")
            return plain or "0"

        if source == "decimal" and target == "standard":
            number = Decimal(text)
            if number == 0:
                return "0"
            normalized = number.normalize()
            sign, digits, exponent = normalized.as_tuple()
            digits_text = "".join(str(digit) for digit in digits)
            if not digits_text:
                return "0"
            sci_exponent = exponent + len(digits_text) - 1
            mantissa = digits_text[0]
            rest = digits_text[1:].rstrip("0")
            if rest:
                mantissa = f"{mantissa}.{rest}"
            prefix = "-" if sign else ""
            return f"{prefix}{mantissa}e{sci_exponent}"
    except (InvalidOperation, ValueError):
        raise

    raise InvalidOperation("Unsupported conversion")


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    app.secret_key = os.environ.get("CALCULATOR_SECRET_KEY", "dev-secret-key-change-me")
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    @app.before_request
    def _init_session():
        _ensure_session_state()

    @app.get("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.get("/frontend/<path:filename>")
    def frontend_files(filename: str):
        return send_from_directory(FRONTEND_DIR, filename)

    @app.get("/state")
    def state():
        return jsonify(_session_state())

    @app.post("/calculate")
    def calculate():
        payload = request.get_json(silent=True) or {}
        expr = str(payload.get("expr", ""))
        mode = _validated_mode(payload.get("mode", session.get("mode", DEFAULT_SETTINGS.default_mode)))
        precision = int(payload.get("precision", DEFAULT_SETTINGS.precision))
        use_fractions = bool(payload.get("useFractions", False))
        ans = payload.get("ans", session.get("answer", ""))

        if not expr.strip():
            latest = _latest_answer()
            if latest is not None:
                session["answer"] = latest
                return jsonify({"ok": True, "result": latest, "display": latest, "error": ""})
            return jsonify({"ok": False, "result": "", "display": "Syntax ERROR", "error": "Syntax ERROR"})

        result = evaluate_expression(
            expr=expr,
            mode=mode,
            precision=precision,
            use_fractions=use_fractions,
            ans=ans,
        )
        if result["ok"]:
            session["answer"] = result["result"]
            session["expression"] = expr
            session["mode"] = mode
            _append_answer_history(result["result"])
        return jsonify(result)

    @app.post("/convert")
    def convert():
        payload = request.get_json(silent=True) or {}
        value = payload.get("value", "")
        source = str(payload.get("from", "")).lower().strip()
        target = str(payload.get("to", "")).lower().strip()
        category = str(payload.get("category", "")).lower().strip() or None
        precision = int(payload.get("precision", DEFAULT_SETTINGS.precision))

        try:
            unit_category = infer_category(source, target, category)

            if unit_category is not None:
                result = convert_value(
                    value=value,
                    source=source,
                    target=target,
                    category_id=unit_category,
                    precision=precision,
                )
            elif source == target:
                result = str(value)
            elif {source, target} <= {"decimal", "standard"}:
                result = _convert_decimal_standard(value, source, target, precision)
            elif source == "decimal" and target == "fraction":
                from fractions import Fraction

                text = str(value).replace(",", "").strip()
                fraction = Fraction(text).limit_denominator(10 ** min(precision, 9))
                result = f"{fraction.numerator}/{fraction.denominator}" if fraction.denominator != 1 else str(fraction.numerator)
            elif source == "fraction" and target == "decimal":
                from fractions import Fraction

                text = str(value).replace(",", "").strip()
                fraction = Fraction(text)
                number = float(fraction)
                result = format(number, f".{precision}g")
            else:
                return jsonify({"ok": False, "result": "", "display": "Syntax ERROR", "error": "Syntax ERROR"})

            return jsonify({"ok": True, "result": result, "display": result, "error": ""})

        except UnitConversionError as exc:
            message = str(exc).lower()
            display = "Math ERROR" if "numeric" in message or "invalid" in message else "Syntax ERROR"
            return jsonify({"ok": False, "result": "", "display": display, "error": display})
        except Exception:
            return jsonify({"ok": False, "result": "", "display": "Math ERROR", "error": "Math ERROR"})

    @app.post("/memory/store")
    def memory_store_endpoint():
        payload = request.get_json(silent=True) or {}
        slot = payload.get("slot", "M1")
        value = payload.get("value", "")
        memory = store_value(slot, value, _memory_dict())
        session["memory"] = memory
        return jsonify({"ok": True, "memory": memory})

    @app.get("/memory/recall")
    def memory_recall_endpoint():
        memory = _memory_dict()
        return jsonify({"ok": True, "memory": memory})

    @app.post("/memory/add")
    def memory_add_endpoint():
        payload = request.get_json(silent=True) or {}
        slot = payload.get("slot", "M1")
        value = payload.get("value", 0)
        memory = add_to_value(slot, value, _memory_dict())
        session["memory"] = memory
        return jsonify({"ok": True, "memory": memory})

    @app.post("/reset")
    def reset_endpoint():
        session["expression"] = ""
        session["answer"] = ""
        session["mode"] = DEFAULT_SETTINGS.default_mode
        session["memory"] = reset_memory()
        session["shift"] = False
        session["alpha"] = False
        session["answer_history"] = []
        return jsonify(
            {
                "ok": True,
                "expression": "",
                "answer": "",
                "memory": session["memory"],
                "mode": session["mode"],
            }
        )

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)