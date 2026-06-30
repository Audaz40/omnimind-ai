/**
 * Safe mathematical expression evaluator
 * Does NOT use eval() or Function() - CSP compliant
 * Supports: +, -, *, /, %, parentheses, decimals
 */

interface Token {
  type: "number" | "operator" | "paren";
  value: string;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let current = "";

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if (char === " ") {
      continue; // Skip whitespace
    }

    if (/[\d.]/.test(char)) {
      current += char;
    } else if (/[+\-*\/%()]/.test(char)) {
      if (current) {
        tokens.push({ type: "number", value: current });
        current = "";
      }
      if (char === "(" || char === ")") {
        tokens.push({ type: "paren", value: char });
      } else {
        tokens.push({ type: "operator", value: char });
      }
    } else {
      throw new Error(`Invalid character: ${char}`);
    }
  }

  if (current) {
    tokens.push({ type: "number", value: current });
  }

  return tokens;
}

function parseExpression(
  tokens: Token[],
  index: number
): { result: number; index: number } {
  let { result, index: idx } = parseTerm(tokens, index);

  while (
    idx < tokens.length &&
    tokens[idx].type === "operator" &&
    (tokens[idx].value === "+" || tokens[idx].value === "-")
  ) {
    const op = tokens[idx].value;
    idx++;
    const { result: right, index: nextIdx } = parseTerm(tokens, idx);
    result = op === "+" ? result + right : result - right;
    idx = nextIdx;
  }

  return { result, index: idx };
}

function parseTerm(
  tokens: Token[],
  index: number
): { result: number; index: number } {
  let { result, index: idx } = parseFactor(tokens, index);

  while (
    idx < tokens.length &&
    tokens[idx].type === "operator" &&
    (tokens[idx].value === "*" || tokens[idx].value === "/" || tokens[idx].value === "%")
  ) {
    const op = tokens[idx].value;
    idx++;
    const { result: right, index: nextIdx } = parseFactor(tokens, idx);

    if (op === "*") {
      result = result * right;
    } else if (op === "/") {
      if (right === 0) throw new Error("Division by zero");
      result = result / right;
    } else if (op === "%") {
      if (right === 0) throw new Error("Modulo by zero");
      result = result % right;
    }
    idx = nextIdx;
  }

  return { result, index: idx };
}

function parseFactor(
  tokens: Token[],
  index: number
): { result: number; index: number } {
  if (index >= tokens.length) {
    throw new Error("Unexpected end of expression");
  }

  const token = tokens[index];

  if (token.type === "number") {
    const num = parseFloat(token.value);
    if (isNaN(num)) throw new Error(`Invalid number: ${token.value}`);
    return { result: num, index: index + 1 };
  }

  if (token.type === "paren" && token.value === "(") {
    const { result, index: idx } = parseExpression(tokens, index + 1);
    if (idx >= tokens.length || tokens[idx].value !== ")") {
      throw new Error("Missing closing parenthesis");
    }
    return { result, index: idx + 1 };
  }

  throw new Error(`Unexpected token: ${token.value}`);
}

/**
 * Safely evaluate a mathematical expression without using eval() or Function()
 * @param expression Math expression like "2 + 3 * 4" or "(10 - 5) / 2"
 * @returns Result of the calculation
 * @throws Error if expression is invalid
 */
export function safeEvaluateMath(expression: string): number {
  // Validate input - only allow safe characters
  if (!/^[\d+\-*/%().,\s]+$/.test(expression)) {
    throw new Error("Expression contains invalid characters");
  }

  try {
    const tokens = tokenize(expression);

    if (tokens.length === 0) {
      throw new Error("Empty expression");
    }

    const { result, index } = parseExpression(tokens, 0);

    if (index !== tokens.length) {
      throw new Error("Unexpected tokens after expression");
    }

    if (!isFinite(result)) {
      throw new Error("Result is not a finite number");
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to evaluate expression");
  }
}
