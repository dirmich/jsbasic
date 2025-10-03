/**
 * BASIC 표현식 평가기
 * 
 * AST 노드를 순회하며 표현식을 계산하고 값을 반환합니다.
 */

import type {
  Expression,
  BinaryExpression,
  UnaryExpression,
  FunctionCall,
  ArrayAccess,
  Identifier,
  NumberLiteral,
  StringLiteral,
  ParenthesizedExpression,
  BinaryOperator,
  UnaryOperator
} from './ast.js';

import { VariableManager, type VariableValue } from './variables.js';
import { BasicError, ERROR_CODES } from '../utils/errors.js';

/**
 * 내장 함수 구현
 */
export class BuiltinFunctions {
  /**
   * 수학 함수들
   */
  static math = {
    ABS: (x: number) => Math.abs(x),
    INT: (x: number) => Math.floor(x),
    RND: (x?: number) => {
      if (x === undefined || x === 1) {
        return Math.random();
      } else if (x > 0) {
        return Math.random();
      } else if (x < 0) {
        // 음수면 시드로 사용 (실제로는 시드 설정 불가능하지만 호환성 위해)
        return Math.random();
      } else {
        return Math.random();
      }
    },
    SIN: (x: number) => Math.sin(x),
    COS: (x: number) => Math.cos(x),
    TAN: (x: number) => Math.tan(x),
    ATN: (x: number) => Math.atan(x),
    EXP: (x: number) => Math.exp(x),
    LOG: (x: number) => {
      if (x <= 0) {
        throw new BasicError('LOG function requires positive argument', ERROR_CODES.INVALID_OPERATION);
      }
      return Math.log(x);
    },
    SQR: (x: number) => {
      if (x < 0) {
        throw new BasicError('SQR function requires non-negative argument', ERROR_CODES.INVALID_OPERATION);
      }
      return Math.sqrt(x);
    }
  };

  /**
   * 문자열 함수들
   */
  static string = {
    LEN: (s: string) => s.length,
    VAL: (s: string) => {
      const num = parseFloat(s.trim());
      return isNaN(num) ? 0 : num;
    },
    STR: (x: number) => x.toString(),
    CHR: (x: number) => {
      if (x < 0 || x > 255) {
        throw new BasicError('CHR$ function requires argument between 0 and 255', ERROR_CODES.INVALID_OPERATION);
      }
      return String.fromCharCode(x);
    },
    ASC: (s: string) => {
      if (s.length === 0) {
        throw new BasicError('ASC function requires non-empty string', ERROR_CODES.INVALID_OPERATION);
      }
      return s.charCodeAt(0);
    },
    LEFT: (s: string, n: number) => {
      if (n < 0) return '';
      return s.substring(0, n);
    },
    RIGHT: (s: string, n: number) => {
      if (n < 0) return '';
      return s.substring(Math.max(0, s.length - n));
    },
    MID: (s: string, start: number, length?: number) => {
      if (start < 1) start = 1;
      const startIndex = start - 1; // BASIC uses 1-based indexing
      if (length === undefined) {
        return s.substring(startIndex);
      } else {
        if (length < 0) return '';
        return s.substring(startIndex, startIndex + length);
      }
    }
  };
}

/**
 * 사용자 정의 함수 정보
 */
export interface UserDefinedFunction {
  parameter: string;
  expression: Expression;
}

/**
 * 표현식 평가기
 */
export class ExpressionEvaluator {
  private variables: VariableManager;
  private graphicsEngine: any = null;
  private userFunctions: Map<string, UserDefinedFunction>;

  constructor(variableManager: VariableManager, userFunctions?: Map<string, UserDefinedFunction>) {
    this.variables = variableManager;
    this.userFunctions = userFunctions ?? new Map();
  }

  /**
   * GraphicsEngine 설정 (POINT 함수용)
   */
  setGraphicsEngine(engine: any): void {
    this.graphicsEngine = engine;
  }

  /**
   * 표현식 평가
   */
  public evaluate(expression: Expression): VariableValue {
    switch (expression.type) {
      case 'NumberLiteral':
        return this.evaluateNumberLiteral(expression as NumberLiteral);
      case 'StringLiteral':
        return this.evaluateStringLiteral(expression as StringLiteral);
      case 'Identifier':
        return this.evaluateIdentifier(expression as Identifier);
      case 'BinaryExpression':
        return this.evaluateBinaryExpression(expression as BinaryExpression);
      case 'UnaryExpression':
        return this.evaluateUnaryExpression(expression as UnaryExpression);
      case 'FunctionCall':
        return this.evaluateFunctionCall(expression as FunctionCall);
      case 'ArrayAccess':
        return this.evaluateArrayAccess(expression as ArrayAccess);
      case 'ParenthesizedExpression':
        return this.evaluateParenthesizedExpression(expression as ParenthesizedExpression);
      default:
        throw new BasicError(
          `Unknown expression type: ${expression.type}`,
          ERROR_CODES.RUNTIME_ERROR,
          expression.line
        );
    }
  }

  private evaluateNumberLiteral(node: NumberLiteral): number {
    return node.value;
  }

  private evaluateStringLiteral(node: StringLiteral): string {
    return node.value;
  }

  private evaluateIdentifier(node: Identifier): VariableValue {
    return this.variables.getVariable(node.name);
  }

  private evaluateBinaryExpression(node: BinaryExpression): VariableValue {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    switch (node.operator) {
      // 산술 연산자
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left) + String(right);
        }
        return (left as number) + (right as number);
      case '-':
        return this.ensureNumber(left, node.line) - this.ensureNumber(right, node.line);
      case '*':
        return this.ensureNumber(left, node.line) * this.ensureNumber(right, node.line);
      case '/':
        const divisor = this.ensureNumber(right, node.line);
        if (divisor === 0) {
          throw new BasicError('Division by zero', ERROR_CODES.DIVISION_BY_ZERO, node.line);
        }
        return this.ensureNumber(left, node.line) / divisor;
      case '^':
        return Math.pow(this.ensureNumber(left, node.line), this.ensureNumber(right, node.line));
      case 'MOD':
        const dividend = this.ensureNumber(left, node.line);
        const modDivisor = this.ensureNumber(right, node.line);
        if (modDivisor === 0) {
          throw new BasicError('Division by zero in MOD', ERROR_CODES.DIVISION_BY_ZERO, node.line);
        }
        return dividend % modDivisor;

      // 비교 연산자
      case '=':
        return this.compareValues(left, right) === 0 ? 1 : 0;
      case '<>':
        return this.compareValues(left, right) !== 0 ? 1 : 0;
      case '<':
        return this.compareValues(left, right) < 0 ? 1 : 0;
      case '<=':
        return this.compareValues(left, right) <= 0 ? 1 : 0;
      case '>':
        return this.compareValues(left, right) > 0 ? 1 : 0;
      case '>=':
        return this.compareValues(left, right) >= 0 ? 1 : 0;

      // 논리 연산자 (BASIC에서는 비트 연산으로 처리)
      case 'AND':
        const leftNum = this.ensureNumber(left, node.line);
        const rightNum = this.ensureNumber(right, node.line);
        return Math.floor(leftNum) & Math.floor(rightNum);
      case 'OR':
        const leftOr = this.ensureNumber(left, node.line);
        const rightOr = this.ensureNumber(right, node.line);
        return Math.floor(leftOr) | Math.floor(rightOr);

      default:
        throw new BasicError(
          `Unknown binary operator: ${node.operator}`,
          ERROR_CODES.RUNTIME_ERROR,
          node.line
        );
    }
  }

  private evaluateUnaryExpression(node: UnaryExpression): VariableValue {
    const operand = this.evaluate(node.operand);

    switch (node.operator) {
      case '+':
        return this.ensureNumber(operand, node.line);
      case '-':
        return -this.ensureNumber(operand, node.line);
      case 'NOT':
        return ~Math.floor(this.ensureNumber(operand, node.line));
      default:
        throw new BasicError(
          `Unknown unary operator: ${node.operator}`,
          ERROR_CODES.RUNTIME_ERROR,
          node.line
        );
    }
  }

  private evaluateFunctionCall(node: FunctionCall): VariableValue {
    const functionName = node.name.name.toUpperCase();

    // 먼저 배열 접근 가능성 확인
    const varInfo = this.variables.getVariableInfo(functionName);
    if (varInfo && varInfo.isArray) {
      // 배열 접근으로 처리
      const indices = node.arguments.map(arg => {
        const value = this.evaluate(arg);
        const num = this.ensureNumber(value, node.line);
        return Math.floor(num);
      });
      return this.variables.getArrayElement(functionName, indices);
    }

    // 인자를 먼저 평가 (내장 함수와 사용자 정의 함수 모두에서 사용)
    const args = node.arguments.map(arg => this.evaluate(arg));

    // 수학 함수들
    if (functionName in BuiltinFunctions.math) {
      const func = BuiltinFunctions.math[functionName as keyof typeof BuiltinFunctions.math];
      if (args.length === 0 && functionName === 'RND') {
        return func(1);
      } else if (args.length === 1) {
        const arg = args[0];
        if (arg !== undefined) {
          return func(this.ensureNumber(arg, node.line));
        } else {
          throw new BasicError(`Function ${functionName} missing argument`, ERROR_CODES.RUNTIME_ERROR, node.line);
        }
      } else {
        throw new BasicError(
          `Function ${functionName} requires exactly one argument`,
          ERROR_CODES.RUNTIME_ERROR,
          node.line
        );
      }
    }

    // 문자열 함수들
    if (functionName === 'LEN') {
      if (args.length !== 1) {
        throw new BasicError('LEN function requires exactly one argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg = args[0];
      if (arg === undefined) {
        throw new BasicError('LEN function missing argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      return BuiltinFunctions.string.LEN(this.ensureString(arg, node.line));
    }

    if (functionName === 'VAL') {
      if (args.length !== 1) {
        throw new BasicError('VAL function requires exactly one argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg = args[0];
      if (arg === undefined) {
        throw new BasicError('VAL function missing argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      return BuiltinFunctions.string.VAL(this.ensureString(arg, node.line));
    }

    if (functionName === 'STR' || functionName === 'STR$') {
      if (args.length !== 1) {
        throw new BasicError('STR$ function requires exactly one argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg = args[0];
      if (arg === undefined) {
        throw new BasicError('STR$ function missing argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      return BuiltinFunctions.string.STR(this.ensureNumber(arg, node.line));
    }

    if (functionName === 'CHR' || functionName === 'CHR$') {
      if (args.length !== 1) {
        throw new BasicError('CHR$ function requires exactly one argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg = args[0];
      if (arg === undefined) {
        throw new BasicError('CHR$ function missing argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      return BuiltinFunctions.string.CHR(this.ensureNumber(arg, node.line));
    }

    if (functionName === 'ASC') {
      if (args.length !== 1) {
        throw new BasicError('ASC function requires exactly one argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg = args[0];
      if (arg === undefined) {
        throw new BasicError('ASC function missing argument', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      return BuiltinFunctions.string.ASC(this.ensureString(arg, node.line));
    }

    if (functionName === 'LEFT' || functionName === 'LEFT$') {
      if (args.length !== 2) {
        throw new BasicError('LEFT$ function requires exactly two arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg0 = args[0];
      const arg1 = args[1];
      if (arg0 === undefined || arg1 === undefined) {
        throw new BasicError('LEFT$ function missing arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      return BuiltinFunctions.string.LEFT(
        this.ensureString(arg0, node.line),
        this.ensureNumber(arg1, node.line)
      );
    }

    if (functionName === 'RIGHT' || functionName === 'RIGHT$') {
      if (args.length !== 2) {
        throw new BasicError('RIGHT$ function requires exactly two arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg0 = args[0];
      const arg1 = args[1];
      if (arg0 === undefined || arg1 === undefined) {
        throw new BasicError('RIGHT$ function missing arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      return BuiltinFunctions.string.RIGHT(
        this.ensureString(arg0, node.line),
        this.ensureNumber(arg1, node.line)
      );
    }

    if (functionName === 'MID' || functionName === 'MID$') {
      if (args.length < 2 || args.length > 3) {
        throw new BasicError('MID$ function requires 2 or 3 arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg0 = args[0];
      const arg1 = args[1];
      if (arg0 === undefined || arg1 === undefined) {
        throw new BasicError('MID$ function missing required arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const str = this.ensureString(arg0, node.line);
      const start = this.ensureNumber(arg1, node.line);
      const length = args.length > 2 && args[2] !== undefined ? this.ensureNumber(args[2], node.line) : undefined;

      return BuiltinFunctions.string.MID(str, start, length);
    }

    // 그래픽 함수들
    if (functionName === 'POINT') {
      if (!this.graphicsEngine) {
        throw new BasicError(
          'Graphics engine not initialized',
          ERROR_CODES.RUNTIME_ERROR,
          node.line
        );
      }
      if (args.length !== 2) {
        throw new BasicError('POINT function requires exactly two arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const arg0 = args[0];
      const arg1 = args[1];
      if (arg0 === undefined || arg1 === undefined) {
        throw new BasicError('POINT function missing arguments', ERROR_CODES.RUNTIME_ERROR, node.line);
      }
      const x = Math.floor(this.ensureNumber(arg0, node.line));
      const y = Math.floor(this.ensureNumber(arg1, node.line));

      return this.graphicsEngine.getPixel(x, y);
    }

    // 사용자 정의 함수 확인 (DEF FN) - 내장 함수 체크 후
    const userFunc = this.userFunctions.get(functionName);
    if (userFunc) {
      if (node.arguments.length !== 1) {
        throw new BasicError(
          `Function ${functionName} requires exactly one argument`,
          ERROR_CODES.RUNTIME_ERROR,
          node.line
        );
      }

      // 인자 평가 (이미 args에 평가되어 있음)
      const arg = args[0];
      if (arg === undefined) {
        throw new BasicError(
          `Function ${functionName} missing argument`,
          ERROR_CODES.RUNTIME_ERROR,
          node.line
        );
      }

      // 파라미터 이름
      const paramName = userFunc.parameter.toUpperCase();

      // 기존 변수 값 저장 (재귀 호출 대비)
      const oldValue = this.variables.hasVariable(paramName)
        ? this.variables.getVariable(paramName)
        : undefined;

      try {
        // 파라미터에 인자 값 할당
        this.variables.setVariable(paramName, arg);

        // 함수 표현식 평가
        const result = this.evaluate(userFunc.expression);

        return result;
      } finally {
        // 파라미터 원래 값으로 복원
        if (oldValue !== undefined) {
          this.variables.setVariable(paramName, oldValue);
        } else {
          // 원래 없었던 변수면 그냥 남겨두기
        }
      }
    }

    throw new BasicError(
      `Unknown function: ${functionName}`,
      ERROR_CODES.RUNTIME_ERROR,
      node.line
    );
  }

  private evaluateArrayAccess(node: ArrayAccess): VariableValue {
    const indices = node.indices.map(index => {
      const value = this.evaluate(index);
      const num = this.ensureNumber(value, node.line);
      return Math.floor(num);
    });

    return this.variables.getArrayElement(node.array.name, indices);
  }

  private evaluateParenthesizedExpression(node: ParenthesizedExpression): VariableValue {
    return this.evaluate(node.expression);
  }

  /**
   * 값이 숫자인지 확인하고 반환
   */
  private ensureNumber(value: VariableValue, line?: number): number {
    if (typeof value === 'number') {
      return value;
    }
    throw new BasicError(
      `Expected number, got ${typeof value}`,
      ERROR_CODES.TYPE_MISMATCH,
      line,
      { actualType: typeof value, expectedType: 'number', value }
    );
  }

  /**
   * 값이 문자열인지 확인하고 반환
   */
  private ensureString(value: VariableValue, line?: number): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new BasicError(
      `Expected string, got ${typeof value}`,
      ERROR_CODES.TYPE_MISMATCH,
      line,
      { actualType: typeof value, expectedType: 'string', value }
    );
  }

  /**
   * 두 값을 비교 (-1, 0, 1 반환)
   */
  private compareValues(left: VariableValue, right: VariableValue): number {
    // 둘 다 숫자인 경우
    if (typeof left === 'number' && typeof right === 'number') {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    }

    // 둘 다 문자열인 경우
    if (typeof left === 'string' && typeof right === 'string') {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    }

    // 타입이 다른 경우 문자열로 변환하여 비교
    const leftStr = String(left);
    const rightStr = String(right);
    if (leftStr < rightStr) return -1;
    if (leftStr > rightStr) return 1;
    return 0;
  }

  /**
   * 논리값을 BASIC 형식으로 변환 (0 = false, 0이 아님 = true)
   */
  public toBooleanValue(value: VariableValue): boolean {
    if (typeof value === 'number') {
      return value !== 0;
    } else {
      return value !== '';
    }
  }

  /**
   * 불린값을 BASIC 숫자로 변환 (false = 0, true = -1)
   */
  public fromBooleanValue(bool: boolean): number {
    return bool ? -1 : 0;
  }
}