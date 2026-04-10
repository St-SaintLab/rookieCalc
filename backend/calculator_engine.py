"""Safe calculator engine built on a constrained AST evaluator."""

from __future__ import annotations

import ast
import math
from dataclasses import dataclass
from fractions import Fraction
from typing import Any

from expression_parser import normalize_expression

class CalculatorError(Exception):
    """Base class for calculator errors."""

class SyntaxCalculatorError(CalculatorError):
    """Raised when the expression is malformed."""

class MathCalculatorError(CalculatorError):
    """Raised when the expression is mathematically invalid."""

class InfiniteCalculatorError(CalculatorError):
    """Raised when the expression overflows to infinity."""

@dataclass(frozen=True)
class EvaluationResult:
    ok: bool
    result: str = ""
    display: str = ""
    error: str = ""

def evaluate_expression(
    expr: str,
    mode: str = "DEG",
    precision: int = 10,
    use_fractions: bool = False,
    ans: str | None = None,
) -> dict[str, Any]:
    """Safely evaluate a calculator expression."""
    try:
        normalized = normalize_expression(expr)
        if len(normalized) > 512:
            raise SyntaxCalculatorError("Syntax ERROR")

        tree = ast.parse(normalized, mode="eval")
        value = _SafeEvaluator(mode=mode, use_fractions=use_fractions).visit(tree.body)
        result_text = format_result(value, precision=precision, use_fractions=use_fractions)
        return {
            "ok": True,
            "result": result_text,
            "display": result_text,
            "error": "",
        }
    except InfiniteCalculatorError:
        return {
            "ok": False,
            "result": "",
            "display": "Infinite Value Error",
            "error": "Infinite Value Error",
        }
    except SyntaxCalculatorError:
        return {
            "ok": False,
            "result": "",
            "display": "Syntax ERROR",
            "error": "Syntax ERROR",
        }
    except MathCalculatorError:
        return {
            "ok": False,
            "result": "",
            "display": "Math ERROR",
            "error": "Math ERROR",
        }
    except Exception:
        return {
            "ok": False,
            "result": "",
            "display": "SYSTEM ERROR",
            "error": "SYSTEM ERROR",
        }

def format_result(value: Any, precision: int = 10, use_fractions: bool = False) -> str:
    """Format a numeric result for display."""
    if isinstance(value, Fraction):
        if value.denominator == 1:
            return _group_digits(str(value.numerator))
        if use_fractions:
            return f"{_group_digits(str(value.numerator))}/{_group_digits(str(value.denominator))}"
        value = float(value)

    if isinstance(value, bool):
        value = int(value)

    if isinstance(value, int):
        return _group_digits(str(value))

    if isinstance(value, float):
        if math.isnan(value):
            raise MathCalculatorError("Math ERROR")
        if math.isinf(value):
            raise InfiniteCalculatorError("Infinite Value Error")
        if value.is_integer():
            return _group_digits(str(int(value)))
        return _group_number_text(f"{value:.{precision}g}")

    if isinstance(value, complex):
        if math.isinf(value.real) or math.isinf(value.imag):
            raise InfiniteCalculatorError("Infinite Value Error")
        if abs(value.imag) > 1e-12:
            raise MathCalculatorError("Math ERROR")
        real = value.real
        if float(real).is_integer():
            return _group_digits(str(int(real)))
        return _group_number_text(f"{real:.{precision}g}")

    return str(value)

def _group_number_text(text: str) -> str:
    if "e" in text or "E" in text:
        mantissa, exponent = text.split("e") if "e" in text else text.split("E")
        return f"{_group_decimal_part(mantissa)}e{int(exponent)}"
    return _group_decimal_part(text)

def _group_decimal_part(text: str) -> str:
    sign = ""
    if text.startswith("-"):
        sign = "-"
        text = text[1:]
    if "." in text:
        integer, fraction = text.split(".", 1)
        return f"{sign}{_group_digits(integer)}.{fraction.rstrip('0').rstrip('.')}"
    return f"{sign}{_group_digits(text)}"

def _group_digits(text: str) -> str:
    text = str(text)
    if len(text) <= 3:
        return text
    sign = ""
    if text.startswith("-"):
        sign = "-"
        text = text[1:]
    if not text.isdigit():
        return f"{sign}{text}"
    parts = []
    while text:
        parts.append(text[-3:])
        text = text[:-3]
    return sign + ",".join(reversed(parts))

class _SafeEvaluator(ast.NodeVisitor):
    """AST visitor that evaluates only a tiny safe subset of Python."""

    def __init__(self, mode: str, use_fractions: bool):
        self.mode = mode.upper() if isinstance(mode, str) else "DEG"
        self.use_fractions = use_fractions
        self.allowed_functions = {
            "sin",
            "cos",
            "tan",
            "asin",
            "acos",
            "atan",
            "sqrt",
            "cbrt",
            "log",
        }

    def visit_Constant(self, node):
        if isinstance(node.value, (int, float)):
            if isinstance(node.value, float):
                if math.isinf(node.value):
                    raise InfiniteCalculatorError("Infinite Value Error")
                if math.isnan(node.value):
                    raise MathCalculatorError("Math ERROR")
            return Fraction(str(node.value)) if self.use_fractions else node.value
        raise SyntaxCalculatorError("Syntax ERROR")

    def visit_Name(self, node):
        raise SyntaxCalculatorError("Syntax ERROR")

    def visit_UnaryOp(self, node):
        operand = self.visit(node.operand)
        if isinstance(node.op, ast.UAdd):
            return operand
        if isinstance(node.op, ast.USub):
            return -operand
        raise SyntaxCalculatorError("Syntax ERROR")

    def visit_BinOp(self, node):
        left = self.visit(node.left)
        right = self.visit(node.right)

        if isinstance(node.op, ast.Add):
            return _ensure_finite(left + right)
        if isinstance(node.op, ast.Sub):
            return _ensure_finite(left - right)
        if isinstance(node.op, ast.Mult):
            return _ensure_finite(left * right)
        if isinstance(node.op, ast.Div):
            if right == 0:
                raise MathCalculatorError("Math ERROR")
            return _ensure_finite(left / right)
        if isinstance(node.op, ast.Pow):
            return _ensure_finite(left**right)

        raise SyntaxCalculatorError("Syntax ERROR")

    def visit_Call(self, node):
        if not isinstance(node.func, ast.Name):
            raise SyntaxCalculatorError("Syntax ERROR")
        func = node.func.id
        if func not in self.allowed_functions:
            raise SyntaxCalculatorError("Syntax ERROR")
        if len(node.args) != 1 or node.keywords:
            raise SyntaxCalculatorError("Syntax ERROR")

        arg = self.visit(node.args[0])

        if func == "sin":
            return _ensure_finite(math.sin(_to_radians(arg, self.mode)))
        if func == "cos":
            return _ensure_finite(math.cos(_to_radians(arg, self.mode)))
        if func == "tan":
            return _ensure_finite(math.tan(_to_radians(arg, self.mode)))
        if func == "asin":
            value = _as_real(arg)
            if value < -1 or value > 1:
                raise MathCalculatorError("Math ERROR")
            return _ensure_finite(_from_radians(math.asin(value), self.mode))
        if func == "acos":
            value = _as_real(arg)
            if value < -1 or value > 1:
                raise MathCalculatorError("Math ERROR")
            return _ensure_finite(_from_radians(math.acos(value), self.mode))
        if func == "atan":
            return _ensure_finite(_from_radians(math.atan(_as_real(arg)), self.mode))
        if func == "sqrt":
            value = _as_real(arg)
            if value < 0:
                raise MathCalculatorError("Math ERROR")
            return _ensure_finite(math.sqrt(value))
        if func == "cbrt":
            value = _as_real(arg)
            return _ensure_finite(math.copysign(abs(value) ** (1 / 3), value))
        if func == "log":
            value = _as_real(arg)
            if value <= 0:
                raise MathCalculatorError("Math ERROR")
            return _ensure_finite(math.log10(value))

        raise SyntaxCalculatorError("Syntax ERROR")

    def generic_visit(self, node):
        raise SyntaxCalculatorError("Syntax ERROR")

def _ensure_finite(value):
    if isinstance(value, float):
        if math.isnan(value):
            raise MathCalculatorError("Math ERROR")
        if math.isinf(value):
            raise InfiniteCalculatorError("Infinite Value Error")
        return value
    if isinstance(value, complex):
        if math.isinf(value.real) or math.isinf(value.imag):
            raise InfiniteCalculatorError("Infinite Value Error")
        return value
    return value

def _as_real(value):
    if isinstance(value, Fraction):
        return float(value)
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            if math.isinf(value):
                raise InfiniteCalculatorError("Infinite Value Error")
            if math.isnan(value):
                raise MathCalculatorError("Math ERROR")
        return value
    if isinstance(value, complex):
        if math.isinf(value.real) or math.isinf(value.imag):
            raise InfiniteCalculatorError("Infinite Value Error")
        if abs(value.imag) > 1e-12:
            raise MathCalculatorError("Math ERROR")
        return value.real
    return float(value)

def _to_radians(value, mode: str):
    val = float(_as_real(value))
    mode = mode.upper()
    if mode == "DEG":
        return math.radians(val)
    if mode == "GRD":
        return val * math.pi / 200.0
    return val

def _from_radians(value: float, mode: str):
    if mode == "DEG":
        return math.degrees(value)
    if mode == "GRD":
        return value * 200.0 / math.pi
    return value
