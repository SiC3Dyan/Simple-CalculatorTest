(function () {
  "use strict";

  const displayEl = document.getElementById("display");

  let tokens = [];
  let currentInput = "0";
  let errorMode = false;
  let justEvaluated = false;

  function opToSymbol(op) {
    switch (op) {
      case "*":
        return "\u00d7";
      case "/":
        return "\u00f7";
      case "+":
        return "+";
      case "-":
        return "-";
      default:
        return op;
    }
  }

  function formatResult(n) {
    const s = String(n);
    if (s.length > 14) {
      return String(parseFloat(n.toPrecision(12)));
    }
    return s;
  }

  function getExpressionText() {
    if (errorMode) {
      return "Error";
    }
    let out = "";
    for (const t of tokens) {
      if (t.kind === "num") {
        out += t.s;
      } else {
        out += opToSymbol(t.op);
      }
    }
    if (currentInput !== "") {
      out += currentInput;
    }
    return out === "" ? "0" : out;
  }

  function updateDisplay() {
    displayEl.textContent = getExpressionText();
  }

  function reset() {
    tokens = [];
    currentInput = "0";
    errorMode = false;
    justEvaluated = false;
    updateDisplay();
  }

  function clearErrorIfTyping() {
    if (errorMode) {
      reset();
    }
  }

  function buildFlat() {
    const flat = [];
    for (const t of tokens) {
      if (t.kind === "num") {
        flat.push(parseFloat(t.s));
      } else {
        flat.push(t.op);
      }
    }
    if (currentInput !== "") {
      const n = parseFloat(currentInput);
      if (!Number.isNaN(n)) {
        flat.push(n);
      }
    }
    return flat;
  }

  function evaluateFlat(flat) {
    if (flat.length === 0) {
      return NaN;
    }
    if (flat.length === 1) {
      return typeof flat[0] === "number" ? flat[0] : NaN;
    }

    let i = 0;

    function parseFactor() {
      if (i >= flat.length) {
        return NaN;
      }
      const v = flat[i++];
      return typeof v === "number" ? v : NaN;
    }

    function parseTerm() {
      let left = parseFactor();
      if (Number.isNaN(left)) {
        return NaN;
      }
      while (i < flat.length && (flat[i] === "*" || flat[i] === "/")) {
        const op = flat[i++];
        const right = parseFactor();
        if (Number.isNaN(right)) {
          return NaN;
        }
        if (op === "*") {
          left *= right;
        } else {
          left = right === 0 ? NaN : left / right;
        }
      }
      return left;
    }

    function parseExpr() {
      let left = parseTerm();
      if (Number.isNaN(left)) {
        return NaN;
      }
      while (i < flat.length && (flat[i] === "+" || flat[i] === "-")) {
        const op = flat[i++];
        const right = parseTerm();
        if (Number.isNaN(right)) {
          return NaN;
        }
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }

    const result = parseExpr();
    if (i !== flat.length) {
      return NaN;
    }
    return result;
  }

  function expressionIsIncomplete() {
    if (tokens.length === 0) {
      return false;
    }
    const last = tokens[tokens.length - 1];
    return last.kind === "op" && currentInput === "";
  }

  function appendDigit(digit) {
    clearErrorIfTyping();
    if (justEvaluated) {
      tokens = [];
      currentInput = digit;
      justEvaluated = false;
      updateDisplay();
      return;
    }
    if (currentInput === "0" && digit !== ".") {
      currentInput = digit;
    } else {
      currentInput += digit;
    }
    updateDisplay();
  }

  function appendDecimal() {
    clearErrorIfTyping();
    if (justEvaluated) {
      tokens = [];
      currentInput = "0.";
      justEvaluated = false;
      updateDisplay();
      return;
    }
    if (currentInput === "") {
      currentInput = "0.";
      updateDisplay();
      return;
    }
    if (!currentInput.includes(".")) {
      currentInput += ".";
      updateDisplay();
    }
  }

  function deleteLast() {
    if (errorMode) {
      reset();
      return;
    }
    if (currentInput.length > 1) {
      currentInput = currentInput.slice(0, -1);
      updateDisplay();
      return;
    }
    if (currentInput.length === 1 && currentInput !== "0") {
      currentInput = "";
      updateDisplay();
      return;
    }
    if (
      currentInput === "0" &&
      tokens.length > 0 &&
      tokens[tokens.length - 1].kind === "op"
    ) {
      currentInput = "";
      updateDisplay();
      return;
    }
    if (currentInput === "" && tokens.length >= 2) {
      tokens.pop();
      const num = tokens.pop();
      if (num && num.kind === "num") {
        currentInput = num.s;
      }
      updateDisplay();
      return;
    }
    currentInput = "0";
    updateDisplay();
  }

  function applyPercent() {
    if (errorMode) {
      return;
    }
    if (currentInput === "") {
      return;
    }
    const n = parseFloat(currentInput);
    if (Number.isNaN(n)) {
      return;
    }
    currentInput = formatResult(n / 100);
    justEvaluated = false;
    updateDisplay();
  }

  function inputOperator(nextOp) {
    if (errorMode) {
      return;
    }

    if (justEvaluated) {
      justEvaluated = false;
      const n = parseFloat(currentInput);
      if (Number.isNaN(n)) {
        return;
      }
      tokens = [{ kind: "num", s: currentInput }];
      currentInput = "";
      tokens.push({ kind: "op", op: nextOp });
      updateDisplay();
      return;
    }

    if (currentInput === "" && tokens.length > 0 && tokens[tokens.length - 1].kind === "op") {
      tokens[tokens.length - 1].op = nextOp;
      updateDisplay();
      return;
    }

    const numStr = currentInput;
    if (numStr === "" || Number.isNaN(parseFloat(numStr))) {
      return;
    }

    tokens.push({ kind: "num", s: numStr });
    tokens.push({ kind: "op", op: nextOp });
    currentInput = "";
    updateDisplay();
  }

  function equals() {
    if (errorMode) {
      return;
    }
    if (expressionIsIncomplete()) {
      return;
    }

    const flat = buildFlat();
    if (flat.length === 0) {
      return;
    }

    const result = evaluateFlat(flat);
    if (Number.isNaN(result)) {
      errorMode = true;
      tokens = [];
      currentInput = "0";
      updateDisplay();
      return;
    }

    tokens = [];
    currentInput = formatResult(result);
    justEvaluated = true;
    updateDisplay();
  }

  document.querySelector(".keys").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) {
      return;
    }

    const digit = btn.getAttribute("data-digit");
    if (digit !== null) {
      appendDigit(digit);
      return;
    }

    const op = btn.getAttribute("data-operator");
    if (op !== null) {
      inputOperator(op);
      return;
    }

    const action = btn.getAttribute("data-action");
    switch (action) {
      case "clear":
        reset();
        break;
      case "delete":
        deleteLast();
        break;
      case "percent":
        applyPercent();
        break;
      case "decimal":
        appendDecimal();
        break;
      case "equals":
        equals();
        break;
      default:
        break;
    }
  });
})();
