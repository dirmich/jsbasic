/**
 * 표현식 평가기 테스트
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { ExpressionEvaluator, BuiltinFunctions } from '../../basic/evaluator.js';
import { VariableManager } from '../../basic/variables.js';
import { Parser } from '../../basic/parser.js';
import { LetStatement, Expression } from '../../basic/ast.js';
import { BasicError } from '../../utils/errors.js';

describe('표현식 평가기', () => {
  let variables: VariableManager;
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    variables = new VariableManager();
    evaluator = new ExpressionEvaluator(variables);
  });

  function evaluateExpression(code: string): any {
    const parser = new Parser(`X = ${code}`);
    const program = parser.parseProgram();
    const stmt = program.statements[0] as LetStatement;
    return evaluator.evaluate(stmt.expression);
  }

  describe('기본 리터럴', () => {
    test('숫자 리터럴', () => {
      expect(evaluateExpression('42')).toBe(42);
      expect(evaluateExpression('3.14')).toBe(3.14);
      expect(evaluateExpression('0')).toBe(0);
      expect(evaluateExpression('-5')).toBe(-5);
    });

    test('문자열 리터럴', () => {
      expect(evaluateExpression('"HELLO"')).toBe('HELLO');
      expect(evaluateExpression('""')).toBe('');
      expect(evaluateExpression('"123"')).toBe('123');
    });
  });

  describe('변수 참조', () => {
    test('숫자 변수', () => {
      variables.setVariable('X', 42);
      expect(evaluateExpression('X')).toBe(42);
    });

    test('문자열 변수', () => {
      variables.setVariable('NAME$', 'JOHN');
      expect(evaluateExpression('NAME$')).toBe('JOHN');
    });

    test('초기화되지 않은 변수', () => {
      expect(evaluateExpression('UNDEFINED')).toBe(0);
      expect(evaluateExpression('UNDEFINED$')).toBe('');
    });
  });

  describe('산술 연산', () => {
    test('기본 산술 연산', () => {
      expect(evaluateExpression('2 + 3')).toBe(5);
      expect(evaluateExpression('7 - 4')).toBe(3);
      expect(evaluateExpression('6 * 7')).toBe(42);
      expect(evaluateExpression('15 / 3')).toBe(5);
    });

    test('연산자 우선순위', () => {
      expect(evaluateExpression('2 + 3 * 4')).toBe(14);
      expect(evaluateExpression('(2 + 3) * 4')).toBe(20);
      expect(evaluateExpression('2 * 3 + 4')).toBe(10);
    });

    test('지수 연산', () => {
      expect(evaluateExpression('2 ^ 3')).toBe(8);
      expect(evaluateExpression('3 ^ 2')).toBe(9);
      expect(evaluateExpression('2 ^ 3 ^ 2')).toBe(512); // 우결합: 2^(3^2)
    });

    test('MOD 연산', () => {
      expect(evaluateExpression('7 MOD 3')).toBe(1);
      expect(evaluateExpression('10 MOD 4')).toBe(2);
      expect(evaluateExpression('8 MOD 2')).toBe(0);
    });

    test('0으로 나누기', () => {
      expect(() => evaluateExpression('5 / 0')).toThrow(BasicError);
      expect(() => evaluateExpression('7 MOD 0')).toThrow(BasicError);
    });
  });

  describe('단항 연산', () => {
    test('단항 플러스/마이너스', () => {
      expect(evaluateExpression('+42')).toBe(42);
      expect(evaluateExpression('-42')).toBe(-42);
      expect(evaluateExpression('-(3 + 4)')).toBe(-7);
    });

    test('NOT 연산', () => {
      expect(evaluateExpression('NOT 0')).toBe(-1);
      expect(evaluateExpression('NOT -1')).toBe(0);
      expect(evaluateExpression('NOT 5')).toBe(-6); // 비트 반전
    });
  });

  describe('문자열 연결', () => {
    test('문자열 + 연산', () => {
      expect(evaluateExpression('"HELLO" + " WORLD"')).toBe('HELLO WORLD');
      expect(evaluateExpression('"A" + "B" + "C"')).toBe('ABC');
    });

    test('숫자와 문자열 연결', () => {
      expect(evaluateExpression('"VALUE: " + 42')).toBe('VALUE: 42');
      expect(evaluateExpression('123 + " ITEMS"')).toBe('123 ITEMS');
    });
  });

  describe('비교 연산', () => {
    test('숫자 비교', () => {
      expect(evaluateExpression('5 = 5')).toBe(1);
      expect(evaluateExpression('5 = 3')).toBe(0);
      expect(evaluateExpression('5 <> 3')).toBe(1);
      expect(evaluateExpression('5 < 7')).toBe(1);
      expect(evaluateExpression('5 <= 5')).toBe(1);
      expect(evaluateExpression('7 > 5')).toBe(1);
      expect(evaluateExpression('5 >= 5')).toBe(1);
    });

    test('문자열 비교', () => {
      expect(evaluateExpression('"ABC" = "ABC"')).toBe(1);
      expect(evaluateExpression('"ABC" <> "XYZ"')).toBe(1);
      expect(evaluateExpression('"ABC" < "XYZ"')).toBe(1);
      expect(evaluateExpression('"XYZ" > "ABC"')).toBe(1);
    });
  });

  describe('논리 연산', () => {
    test('AND 연산', () => {
      expect(evaluateExpression('1 AND 1')).toBe(1);
      expect(evaluateExpression('1 AND 0')).toBe(0);
      expect(evaluateExpression('3 AND 5')).toBe(1); // 비트 AND: 011 & 101 = 001
    });

    test('OR 연산', () => {
      expect(evaluateExpression('1 OR 0')).toBe(1);
      expect(evaluateExpression('0 OR 0')).toBe(0);
      expect(evaluateExpression('3 OR 5')).toBe(7); // 비트 OR: 011 | 101 = 111
    });
  });

  describe('배열 접근', () => {
    beforeEach(() => {
      variables.declareArray('ARR', [10]);
      variables.setArrayElement('ARR', [5], 99);
    });

    test('배열 요소 읽기', () => {
      expect(evaluateExpression('ARR(5)')).toBe(99);
      expect(evaluateExpression('ARR(0)')).toBe(0);
    });

    test('계산된 인덱스', () => {
      variables.setVariable('I', 5);
      expect(evaluateExpression('ARR(I)')).toBe(99);
      expect(evaluateExpression('ARR(2 + 3)')).toBe(99);
    });
  });

  describe('내장 함수', () => {
    describe('수학 함수', () => {
      test('ABS 함수', () => {
        expect(evaluateExpression('ABS(5)')).toBe(5);
        expect(evaluateExpression('ABS(-5)')).toBe(5);
        expect(evaluateExpression('ABS(0)')).toBe(0);
      });

      test('INT 함수', () => {
        expect(evaluateExpression('INT(3.7)')).toBe(3);
        expect(evaluateExpression('INT(-3.7)')).toBe(-4);
        expect(evaluateExpression('INT(5)')).toBe(5);
      });

      test('SIN, COS, TAN 함수', () => {
        expect(evaluateExpression('SIN(0)')).toBeCloseTo(0, 10);
        expect(evaluateExpression('COS(0)')).toBeCloseTo(1, 10);
        expect(evaluateExpression('TAN(0)')).toBeCloseTo(0, 10);
      });

      test('SQR 함수', () => {
        expect(evaluateExpression('SQR(9)')).toBe(3);
        expect(evaluateExpression('SQR(16)')).toBe(4);
        expect(() => evaluateExpression('SQR(-1)')).toThrow(BasicError);
      });

      test('LOG 함수', () => {
        expect(evaluateExpression('LOG(1)')).toBe(0);
        expect(() => evaluateExpression('LOG(0)')).toThrow(BasicError);
        expect(() => evaluateExpression('LOG(-1)')).toThrow(BasicError);
      });

      test('RND 함수', () => {
        const result = evaluateExpression('RND(1)');
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1);
      });
    });

    describe('문자열 함수', () => {
      test('LEN 함수', () => {
        expect(evaluateExpression('LEN("HELLO")')).toBe(5);
        expect(evaluateExpression('LEN("")')).toBe(0);
        expect(evaluateExpression('LEN("A")')).toBe(1);
      });

      test('VAL 함수', () => {
        expect(evaluateExpression('VAL("123")')).toBe(123);
        expect(evaluateExpression('VAL("3.14")')).toBe(3.14);
        expect(evaluateExpression('VAL("ABC")')).toBe(0);
        expect(evaluateExpression('VAL(" 42 ")')).toBe(42);
      });

      test('STR$ 함수', () => {
        expect(evaluateExpression('STR$(123)')).toBe('123');
        expect(evaluateExpression('STR$(3.14)')).toBe('3.14');
        expect(evaluateExpression('STR$(0)')).toBe('0');
      });

      test('CHR$ 함수', () => {
        expect(evaluateExpression('CHR$(65)')).toBe('A');
        expect(evaluateExpression('CHR$(97)')).toBe('a');
        expect(evaluateExpression('CHR$(32)')).toBe(' ');
        expect(() => evaluateExpression('CHR$(256)')).toThrow(BasicError);
      });

      test('ASC 함수', () => {
        expect(evaluateExpression('ASC("A")')).toBe(65);
        expect(evaluateExpression('ASC("a")')).toBe(97);
        expect(evaluateExpression('ASC(" ")')).toBe(32);
        expect(() => evaluateExpression('ASC("")')).toThrow(BasicError);
      });

      test('LEFT$ 함수', () => {
        expect(evaluateExpression('LEFT$("HELLO", 3)')).toBe('HEL');
        expect(evaluateExpression('LEFT$("HELLO", 0)')).toBe('');
        expect(evaluateExpression('LEFT$("HELLO", 10)')).toBe('HELLO');
      });

      test('RIGHT$ 함수', () => {
        expect(evaluateExpression('RIGHT$("HELLO", 3)')).toBe('LLO');
        expect(evaluateExpression('RIGHT$("HELLO", 0)')).toBe('');
        expect(evaluateExpression('RIGHT$("HELLO", 10)')).toBe('HELLO');
      });

      test('MID$ 함수', () => {
        expect(evaluateExpression('MID$("HELLO", 2, 3)')).toBe('ELL');
        expect(evaluateExpression('MID$("HELLO", 3)')).toBe('LLO');
        expect(evaluateExpression('MID$("HELLO", 1, 2)')).toBe('HE');
        expect(evaluateExpression('MID$("HELLO", 10, 2)')).toBe('');
      });
    });
  });

  describe('복잡한 표현식', () => {
    beforeEach(() => {
      variables.setVariable('X', 10);
      variables.setVariable('Y', 5);
      variables.setVariable('NAME$', 'JOHN');
    });

    test('변수와 연산자 조합', () => {
      expect(evaluateExpression('X + Y * 2')).toBe(20);
      expect(evaluateExpression('(X + Y) * 2')).toBe(30);
      expect(evaluateExpression('X ^ 2 + Y')).toBe(105);
    });

    test('함수와 변수 조합', () => {
      expect(evaluateExpression('ABS(X - Y * 3)')).toBe(5);
      expect(evaluateExpression('SQR(X + Y + 1)')).toBe(4);
      expect(evaluateExpression('LEN(NAME$) + X')).toBe(14);
    });

    test('중첩된 함수 호출', () => {
      expect(evaluateExpression('INT(SQR(X + Y + 1))')).toBe(4);
      expect(evaluateExpression('VAL(STR$(X + Y))')).toBe(15);
      expect(evaluateExpression('ASC(LEFT$(NAME$, 1))')).toBe(74); // 'J'
    });
  });

  describe('에러 상황', () => {
    test('타입 불일치', () => {
      expect(() => evaluateExpression('"HELLO" - 5')).toThrow(BasicError);
      expect(() => evaluateExpression('"ABC" * 2')).toThrow(BasicError);
    });

    test('잘못된 함수 인수', () => {
      expect(() => evaluateExpression('SIN("HELLO")')).toThrow(BasicError);
      expect(() => evaluateExpression('LEFT$(123, 2)')).toThrow(BasicError);
    });

    test('존재하지 않는 함수', () => {
      expect(() => evaluateExpression('UNKNOWN(5)')).toThrow(BasicError);
    });
  });

  describe('유틸리티 함수', () => {
    test('불린값 변환', () => {
      expect(evaluator.toBooleanValue(0)).toBe(false);
      expect(evaluator.toBooleanValue(1)).toBe(true);
      expect(evaluator.toBooleanValue(-1)).toBe(true);
      expect(evaluator.toBooleanValue('')).toBe(false);
      expect(evaluator.toBooleanValue('HELLO')).toBe(true);
    });

    test('BASIC 불린값 변환', () => {
      expect(evaluator.fromBooleanValue(true)).toBe(-1);
      expect(evaluator.fromBooleanValue(false)).toBe(0);
    });
  });
});