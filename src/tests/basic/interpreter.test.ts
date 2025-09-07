/**
 * BASIC 인터프리터 테스트
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { BasicInterpreter, ExecutionState } from '../../basic/interpreter.js';
import { Parser } from '../../basic/parser.js';
import { BasicError } from '../../utils/errors.js';

describe('BASIC 인터프리터', () => {
  let interpreter: BasicInterpreter;

  beforeEach(() => {
    interpreter = new BasicInterpreter();
  });

  function parseAndRun(code: string): Promise<void> {
    const parser = new Parser(code);
    const program = parser.parseProgram();
    return interpreter.run(program);
  }

  describe('기본 명령문 실행', () => {
    test('LET 명령문', async () => {
      await parseAndRun('LET X = 42');
      expect(interpreter.getVariables().getVariable('X')).toBe(42);
    });

    test('암시적 LET', async () => {
      await parseAndRun('Y$ = "HELLO"');
      expect(interpreter.getVariables().getVariable('Y$')).toBe('HELLO');
    });

    test('PRINT 명령문 - 숫자', async () => {
      await parseAndRun('PRINT 42');
      const output = interpreter.getOutput();
      expect(output[0]).toBe('42\n');
    });

    test('PRINT 명령문 - 문자열', async () => {
      await parseAndRun('PRINT "HELLO WORLD"');
      const output = interpreter.getOutput();
      expect(output[0]).toBe('HELLO WORLD\n');
    });

    test('PRINT 명령문 - 여러 값 (콤마)', async () => {
      await parseAndRun('PRINT "X =", 42, "Y =", 24');
      const output = interpreter.getOutput();
      expect(output[0]).toBe('X =\t42\tY =\t24\n');
    });

    test('PRINT 명령문 - 여러 값 (세미콜론)', async () => {
      await parseAndRun('PRINT "A"; "B"; "C"');
      const output = interpreter.getOutput();
      expect(output[0]).toBe('ABC');
    });

    test('빈 PRINT', async () => {
      await parseAndRun('PRINT');
      const output = interpreter.getOutput();
      expect(output[0]).toBe('\n');
    });
  });

  describe('변수와 표현식', () => {
    test('변수 할당과 참조', async () => {
      await parseAndRun(`
        X = 10
        Y = 20
        Z = X + Y
        PRINT Z
      `);
      
      expect(interpreter.getVariables().getVariable('Z')).toBe(30);
      const output = interpreter.getOutput();
      expect(output[0]).toBe('30\n');
    });

    test('문자열 변수', async () => {
      await parseAndRun(`
        NAME$ = "JOHN"
        GREETING$ = "HELLO " + NAME$
        PRINT GREETING$
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('HELLO JOHN\n');
    });

    test('복잡한 수식', async () => {
      await parseAndRun(`
        A = 2
        B = 3
        C = 4
        RESULT = A * B + C ^ 2
        PRINT RESULT
      `);
      
      expect(interpreter.getVariables().getVariable('RESULT')).toBe(22); // 2*3 + 4^2 = 6 + 16
    });
  });

  describe('제어 구조', () => {
    test('IF-THEN 단일 라인', async () => {
      await parseAndRun(`
        X = 5
        IF X > 0 THEN PRINT "POSITIVE"
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('POSITIVE\n');
    });

    test('IF-THEN-ELSE', async () => {
      await parseAndRun(`
        X = -5
        IF X > 0 THEN
          PRINT "POSITIVE"
        ELSE
          PRINT "NOT POSITIVE"
        ENDIF
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('NOT POSITIVE\n');
    });

    test('FOR 루프', async () => {
      await parseAndRun(`
        FOR I = 1 TO 5
          PRINT I
        NEXT I
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(5);
      expect(output[0]).toBe('1\n');
      expect(output[4]).toBe('5\n');
    });

    test('FOR 루프 with STEP', async () => {
      await parseAndRun(`
        FOR I = 2 TO 10 STEP 2
          PRINT I
        NEXT I
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(5);
      expect(output[0]).toBe('2\n');
      expect(output[1]).toBe('4\n');
      expect(output[4]).toBe('10\n');
    });

    test('WHILE 루프', async () => {
      await parseAndRun(`
        I = 1
        WHILE I <= 3
          PRINT I
          I = I + 1
        WEND
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(3);
      expect(output[0]).toBe('1\n');
      expect(output[2]).toBe('3\n');
    });
  });

  describe('점프 명령문', () => {
    test('GOTO', async () => {
      await parseAndRun(`
        PRINT "START"
        GOTO 30
        PRINT "SKIPPED"
        30 PRINT "END"
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(2);
      expect(output[0]).toBe('START\n');
      expect(output[1]).toBe('END\n');
    });

    test('GOSUB and RETURN', async () => {
      await parseAndRun(`
        PRINT "MAIN"
        GOSUB 100
        PRINT "BACK"
        END
        100 PRINT "SUB"
        RETURN
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(3);
      expect(output[0]).toBe('MAIN\n');
      expect(output[1]).toBe('SUB\n');
      expect(output[2]).toBe('BACK\n');
    });

    test('ON-GOTO', async () => {
      await parseAndRun(`
        X = 2
        ON X GOTO 10, 20, 30
        10 PRINT "ONE"
        END
        20 PRINT "TWO"
        END
        30 PRINT "THREE"
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('TWO\n');
    });

    test('ON-GOSUB', async () => {
      await parseAndRun(`
        X = 1
        ON X GOSUB 100, 200
        PRINT "MAIN"
        END
        100 PRINT "SUB1"
        RETURN
        200 PRINT "SUB2"
        RETURN
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(2);
      expect(output[0]).toBe('SUB1\n');
      expect(output[1]).toBe('MAIN\n');
    });
  });

  describe('배열', () => {
    test('DIM과 배열 사용', async () => {
      await parseAndRun(`
        DIM A(10)
        A(5) = 99
        PRINT A(5)
        PRINT A(0)
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('99\n');
      expect(output[1]).toBe('0\n');
    });

    test('2차원 배열', async () => {
      await parseAndRun(`
        DIM MATRIX(3, 4)
        MATRIX(2, 3) = 42
        PRINT MATRIX(2, 3)
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('42\n');
    });

    test('문자열 배열', async () => {
      await parseAndRun(`
        DIM NAMES$(5)
        NAMES$(1) = "ALICE"
        NAMES$(2) = "BOB"
        PRINT NAMES$(1)
        PRINT NAMES$(2)
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('ALICE\n');
      expect(output[1]).toBe('BOB\n');
    });
  });

  describe('DATA와 READ', () => {
    test('기본 DATA/READ', async () => {
      await parseAndRun(`
        DATA 10, 20, 30
        READ X, Y, Z
        PRINT X
        PRINT Y
        PRINT Z
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('10\n');
      expect(output[1]).toBe('20\n');
      expect(output[2]).toBe('30\n');
    });

    test('문자열 DATA', async () => {
      await parseAndRun(`
        DATA "HELLO", "WORLD", 42
        READ A$, B$, C
        PRINT A$
        PRINT B$
        PRINT C
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('HELLO\n');
      expect(output[1]).toBe('WORLD\n');
      expect(output[2]).toBe('42\n');
    });

    test('RESTORE', async () => {
      await parseAndRun(`
        DATA 1, 2, 3
        READ X
        PRINT X
        RESTORE
        READ Y
        PRINT Y
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('1\n');
      expect(output[1]).toBe('1\n');
    });
  });

  describe('내장 함수', () => {
    test('수학 함수', async () => {
      await parseAndRun(`
        PRINT ABS(-5)
        PRINT INT(3.7)
        PRINT SQR(9)
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('5\n');
      expect(output[1]).toBe('3\n');
      expect(output[2]).toBe('3\n');
    });

    test('문자열 함수', async () => {
      await parseAndRun(`
        S$ = "HELLO"
        PRINT LEN(S$)
        PRINT LEFT$(S$, 3)
        PRINT RIGHT$(S$, 2)
        PRINT MID$(S$, 2, 3)
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('5\n');
      expect(output[1]).toBe('HEL\n');
      expect(output[2]).toBe('LO\n');
      expect(output[3]).toBe('ELL\n');
    });

    test('타입 변환 함수', async () => {
      await parseAndRun(`
        PRINT VAL("123")
        PRINT STR$(456)
        PRINT ASC("A")
        PRINT CHR$(65)
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('123\n');
      expect(output[1]).toBe('456\n');
      expect(output[2]).toBe('65\n');
      expect(output[3]).toBe('A\n');
    });
  });

  describe('프로그램 제어', () => {
    test('END 명령문', async () => {
      await parseAndRun(`
        PRINT "START"
        END
        PRINT "NEVER PRINTED"
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(1);
      expect(output[0]).toBe('START\n');
      expect(interpreter.getState()).toBe(ExecutionState.STOPPED);
    });

    test('STOP 명령문', async () => {
      await parseAndRun(`
        PRINT "BEFORE STOP"
        STOP
        PRINT "AFTER STOP"
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(1);
      expect(output[0]).toBe('BEFORE STOP\n');
      expect(interpreter.getState()).toBe(ExecutionState.STOPPED);
    });
  });

  describe('복잡한 프로그램', () => {
    test('피보나치 수열', async () => {
      await parseAndRun(`
        A = 0
        B = 1
        PRINT A
        PRINT B
        
        FOR I = 3 TO 10
          C = A + B
          PRINT C
          A = B
          B = C
        NEXT I
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(10);
      expect(output[0]).toBe('0\n');
      expect(output[1]).toBe('1\n');
      expect(output[2]).toBe('1\n');
      expect(output[3]).toBe('2\n');
      expect(output[9]).toBe('34\n');
    });

    test('구구단', async () => {
      await parseAndRun(`
        FOR I = 2 TO 3
          FOR J = 1 TO 3
            RESULT = I * J
            PRINT I; " * "; J; " = "; RESULT
          NEXT J
        NEXT I
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(6);
      expect(output[0]).toBe('2 * 1 = 2');
      expect(output[2]).toBe('2 * 3 = 6');
    });

    test('배열 정렬 (버블 정렬)', async () => {
      await parseAndRun(`
        DIM A(4)
        A(0) = 64
        A(1) = 34
        A(2) = 25
        A(3) = 12
        A(4) = 22
        
        FOR I = 0 TO 4
          FOR J = 0 TO 3
            IF A(J) > A(J + 1) THEN
              TEMP = A(J)
              A(J) = A(J + 1)
              A(J + 1) = TEMP
            ENDIF
          NEXT J
        NEXT I
        
        FOR I = 0 TO 4
          PRINT A(I)
        NEXT I
      `);
      
      const output = interpreter.getOutput();
      expect(output).toHaveLength(5);
      expect(output[0]).toBe('12\n');
      expect(output[1]).toBe('22\n');
      expect(output[4]).toBe('64\n');
    });
  });

  describe('에러 처리', () => {
    test('존재하지 않는 라인으로 GOTO', async () => {
      expect(async () => {
        await parseAndRun('GOTO 999');
      }).toThrow(BasicError);
    });

    test('RETURN without GOSUB', async () => {
      expect(async () => {
        await parseAndRun('RETURN');
      }).toThrow(BasicError);
    });

    test('Out of DATA', async () => {
      expect(async () => {
        await parseAndRun(`
          DATA 1, 2
          READ X, Y, Z
        `);
      }).toThrow(BasicError);
    });

    test('배열 인덱스 범위 초과', async () => {
      expect(async () => {
        await parseAndRun(`
          DIM A(5)
          PRINT A(10)
        `);
      }).toThrow(BasicError);
    });
  });

  describe('상태 관리', () => {
    test('초기 상태', () => {
      expect(interpreter.getState()).toBe(ExecutionState.READY);
    });

    test('실행 후 상태', async () => {
      await parseAndRun('PRINT "TEST"');
      expect(interpreter.getState()).toBe(ExecutionState.STOPPED);
    });

    test('디버깅 정보', async () => {
      await parseAndRun(`
        X = 42
        Y = 24
      `);
      
      const debugInfo = interpreter.getDebugInfo();
      expect(debugInfo.state).toBe(ExecutionState.STOPPED);
      expect(debugInfo.variableCount).toBe(2);
    });
  });

  describe('입력 시뮬레이션', () => {
    test('INPUT 명령문 (모킹)', async () => {
      // INPUT을 시뮬레이션하기 위해 입력 미리 제공
      interpreter.provideInput(['42', 'HELLO']);
      
      await parseAndRun(`
        INPUT X
        INPUT NAME$
        PRINT "X ="; X
        PRINT "NAME ="; NAME$
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('X =42');
      expect(output[1]).toBe('NAME =HELLO');
    });

    test('프롬프트가 있는 INPUT', async () => {
      interpreter.provideInput(['123']);
      
      await parseAndRun(`
        INPUT "Enter a number: "; N
        PRINT "You entered:"; N
      `);
      
      const output = interpreter.getOutput();
      expect(output[0]).toBe('Enter a number: ');
      expect(output[1]).toBe('You entered:123');
    });
  });
});