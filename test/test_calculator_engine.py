import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from calculator_engine import evaluate_expression  # noqa: E402


def test_mixed_expression_with_trig_and_roots():
    result = evaluate_expression("2+sin(30)+sqrt(9)", mode="DEG", precision=10, use_fractions=False)
    assert result["ok"] is True
    assert abs(float(result["result"]) - 5.5) < 1e-8


def test_fraction_arithmetic_preserves_exact_result():
    result = evaluate_expression("1/3+1/6", mode="DEG", precision=10, use_fractions=True)
    assert result["ok"] is True
    assert result["result"] == "1/2"


def test_division_by_zero():
    result = evaluate_expression("1/0", mode="DEG", precision=10, use_fractions=False)
    assert result["ok"] is False
    assert result["error"] == "Math ERROR"


def test_invalid_syntax():
    result = evaluate_expression("2++", mode="DEG", precision=10, use_fractions=False)
    assert result["ok"] is False
    assert result["error"] == "Syntax ERROR"


def test_square_root_domain_error():
    result = evaluate_expression("sqrt(-1)", mode="DEG", precision=10, use_fractions=False)
    assert result["ok"] is False
    assert result["error"] == "Math ERROR"


def test_infinite_value_error():
    result = evaluate_expression("1e308*1e308", mode="DEG", precision=10, use_fractions=False)
    assert result["ok"] is False
    assert result["error"] == "Infinite Value Error"