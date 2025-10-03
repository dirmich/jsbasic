/**
 * BASIC 파서 테스트
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { Parser } from '../../basic/parser.js';
import { TokenType } from '../../basic/tokenizer.js';
import {
  Program,
  LetStatement,
  PrintStatement,
  InputStatement,
  IfStatement,
  ForStatement,
  WhileStatement,
  BinaryExpression,
  NumberLiteral,
  StringLiteral,
  Identifier
} from '../../basic/ast.js';

describe('BASIC Parser', () => {
  describe('기본 파싱', () => {
    test('빈 프로그램 파싱', () => {
      const parser = new Parser('');
      const program = parser.parseProgram();
      
      expect(program.type).toBe('Program');
      expect(program.statements).toHaveLength(0);
    });

    test('라인 넘버가 있는 명령문 파싱', () => {
      const parser = new Parser('10 PRINT "HELLO"');
      const program = parser.parseProgram();
      
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as PrintStatement;
      expect(stmt.lineNumber).toBe(10);
      expect(stmt.type).toBe('PrintStatement');
    });

    test('여러 명령문 파싱', () => {
      const source = `
        10 LET A = 5
        20 PRINT A
        30 END
      `;
      
      const parser = new Parser(source);
      const program = parser.parseProgram();
      
      expect(program.statements).toHaveLength(3);
      expect(program.statements[0].lineNumber).toBe(10);
      expect(program.statements[1].lineNumber).toBe(20);
      expect(program.statements[2].lineNumber).toBe(30);
    });
  });

  describe('LET 명령문', () => {
    test('기본 LET 명령문', () => {
      const parser = new Parser('LET A = 42');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      expect(stmt.type).toBe('LetStatement');
      expect(stmt.variable.name).toBe('A');
      expect((stmt.expression as NumberLiteral).value).toBe(42);
    });

    test('암시적 LET 명령문', () => {
      const parser = new Parser('X = 10');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      expect(stmt.type).toBe('LetStatement');
      expect(stmt.variable.name).toBe('X');
      expect((stmt.expression as NumberLiteral).value).toBe(10);
    });

    test('문자열 변수 할당', () => {
      const parser = new Parser('NAME$ = "JOHN"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      expect(stmt.type).toBe('LetStatement');
      expect(stmt.variable.name).toBe('NAME$');
      expect(stmt.variable.dataType).toBe('string');
      expect((stmt.expression as StringLiteral).value).toBe('JOHN');
    });

    test('복합 표현식 할당', () => {
      const parser = new Parser('Y = X * 2 + 1');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      expect(stmt.type).toBe('LetStatement');
      
      const expr = stmt.expression as BinaryExpression;
      expect(expr.type).toBe('BinaryExpression');
      expect(expr.operator).toBe('+');
    });
  });

  describe('PRINT 명령문', () => {
    test('기본 PRINT 명령문', () => {
      const parser = new Parser('PRINT "HELLO WORLD"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as PrintStatement;
      expect(stmt.type).toBe('PrintStatement');
      expect(stmt.expressions).toHaveLength(1);
      expect((stmt.expressions[0] as StringLiteral).value).toBe('HELLO WORLD');
    });

    test('변수 출력', () => {
      const parser = new Parser('PRINT A');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as PrintStatement;
      expect(stmt.type).toBe('PrintStatement');
      expect((stmt.expressions[0] as Identifier).name).toBe('A');
    });

    test('여러 값 출력 (콤마 구분)', () => {
      const parser = new Parser('PRINT A, B, "TEST"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as PrintStatement;
      expect(stmt.type).toBe('PrintStatement');
      expect(stmt.expressions).toHaveLength(3);
      expect(stmt.separator).toBe('comma');
    });

    test('여러 값 출력 (세미콜론 구분)', () => {
      const parser = new Parser('PRINT A; B; "TEST"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as PrintStatement;
      expect(stmt.expressions).toHaveLength(3);
      expect(stmt.separator).toBe('semicolon');
    });

    test('빈 PRINT 명령문', () => {
      const parser = new Parser('PRINT');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as PrintStatement;
      expect(stmt.expressions).toHaveLength(0);
    });
  });

  describe('INPUT 명령문', () => {
    test('기본 INPUT 명령문', () => {
      const parser = new Parser('INPUT A');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as InputStatement;
      expect(stmt.type).toBe('InputStatement');
      expect(stmt.variables).toHaveLength(1);
      expect(stmt.variables[0].name).toBe('A');
    });

    test('프롬프트가 있는 INPUT', () => {
      const parser = new Parser('INPUT "Enter name: "; NAME$');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as InputStatement;
      expect(stmt.prompt?.value).toBe('Enter name: ');
      expect(stmt.variables[0].name).toBe('NAME$');
    });

    test('여러 변수 입력', () => {
      const parser = new Parser('INPUT A, B, C');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as InputStatement;
      expect(stmt.variables).toHaveLength(3);
      expect(stmt.variables[0].name).toBe('A');
      expect(stmt.variables[1].name).toBe('B');
      expect(stmt.variables[2].name).toBe('C');
    });
  });

  describe('IF 명령문', () => {
    test('단일 라인 IF-THEN', () => {
      const parser = new Parser('IF X > 0 THEN PRINT "POSITIVE"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as IfStatement;
      expect(stmt.type).toBe('IfStatement');
      expect(stmt.thenStatement).toHaveLength(1);
      expect(stmt.elseStatement).toBeUndefined();
      
      const condition = stmt.condition as BinaryExpression;
      expect(condition.operator).toBe('>');
    });

    test('멀티라인 IF-THEN-ELSE', () => {
      const source = `
        IF X > 0 THEN
          PRINT "POSITIVE"
          Y = 1
        ELSE
          PRINT "NOT POSITIVE"
          Y = 0
        ENDIF
      `;
      
      const parser = new Parser(source);
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as IfStatement;
      expect(stmt.thenStatement).toHaveLength(2);
      expect(stmt.elseStatement).toHaveLength(2);
    });
  });

  describe('FOR 반복문', () => {
    test('기본 FOR 반복문', () => {
      const source = `
        FOR I = 1 TO 10
          PRINT I
        NEXT I
      `;

      const parser = new Parser(source);
      const program = parser.parseProgram();

      // FOR, PRINT, NEXT가 개별 명령문으로 파싱됨
      expect(program.statements).toHaveLength(3);

      const forStmt = program.statements[0] as ForStatement;
      expect(forStmt.type).toBe('ForStatement');
      expect(forStmt.variable.name).toBe('I');
      expect((forStmt.start as NumberLiteral).value).toBe(1);
      expect((forStmt.end as NumberLiteral).value).toBe(10);
      expect(forStmt.step).toBeUndefined();
      // 전통적인 BASIC 방식: body는 빈 배열 (런타임에 NEXT 찾음)
      expect(forStmt.body).toHaveLength(0);
    });

    test('STEP이 있는 FOR 반복문', () => {
      const source = `
        FOR I = 1 TO 10 STEP 2
          PRINT I
        NEXT I
      `;
      
      const parser = new Parser(source);
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as ForStatement;
      expect(stmt.step).toBeDefined();
      expect((stmt.step as NumberLiteral).value).toBe(2);
    });
  });

  describe('WHILE 반복문', () => {
    test('기본 WHILE 반복문', () => {
      const source = `
        WHILE X < 10
          X = X + 1
          PRINT X
        WEND
      `;
      
      const parser = new Parser(source);
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as WhileStatement;
      expect(stmt.type).toBe('WhileStatement');
      expect(stmt.body).toHaveLength(2);
      
      const condition = stmt.condition as BinaryExpression;
      expect(condition.operator).toBe('<');
    });
  });

  describe('표현식 파싱', () => {
    test('산술 연산자 우선순위', () => {
      const parser = new Parser('Y = 2 + 3 * 4');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      const expr = stmt.expression as BinaryExpression;
      
      expect(expr.operator).toBe('+');
      expect((expr.left as NumberLiteral).value).toBe(2);
      
      const rightExpr = expr.right as BinaryExpression;
      expect(rightExpr.operator).toBe('*');
      expect((rightExpr.left as NumberLiteral).value).toBe(3);
      expect((rightExpr.right as NumberLiteral).value).toBe(4);
    });

    test('괄호 우선순위', () => {
      const parser = new Parser('Y = (2 + 3) * 4');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      const expr = stmt.expression as BinaryExpression;
      
      expect(expr.operator).toBe('*');
      expect((expr.right as NumberLiteral).value).toBe(4);
      
      // 왼쪽은 ParenthesizedExpression이어야 함
      expect(expr.left.type).toBe('ParenthesizedExpression');
    });

    test('비교 연산자', () => {
      const parser = new Parser('IF A = B THEN PRINT "EQUAL"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as IfStatement;
      const condition = stmt.condition as BinaryExpression;
      
      expect(condition.operator).toBe('=');
      expect((condition.left as Identifier).name).toBe('A');
      expect((condition.right as Identifier).name).toBe('B');
    });

    test('논리 연산자', () => {
      const parser = new Parser('IF A > 0 AND B < 10 THEN PRINT "OK"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as IfStatement;
      const condition = stmt.condition as BinaryExpression;
      
      expect(condition.operator).toBe('AND');
      expect((condition.left as BinaryExpression).operator).toBe('>');
      expect((condition.right as BinaryExpression).operator).toBe('<');
    });
  });

  describe('데이터 타입', () => {
    test('변수 타입 추론', () => {
      const parser = new Parser('NAME$ = "TEST"');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      expect(stmt.variable.dataType).toBe('string');
    });

    test('정수 변수 타입', () => {
      const parser = new Parser('COUNT% = 42');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      expect(stmt.variable.dataType).toBe('integer');
    });

    test('기본 숫자 타입', () => {
      const parser = new Parser('VALUE = 3.14');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      expect(stmt.variable.dataType).toBe('numeric');
    });
  });

  describe('내장 함수', () => {
    test('수학 함수', () => {
      const parser = new Parser('Y = SIN(X)');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      const expr = stmt.expression;
      
      expect(expr.type).toBe('FunctionCall');
    });

    test('문자열 함수', () => {
      const parser = new Parser('S$ = LEFT$(NAME$, 3)');
      const program = parser.parseProgram();
      
      const stmt = program.statements[0] as LetStatement;
      const expr = stmt.expression;
      
      expect(expr.type).toBe('FunctionCall');
    });
  });

  describe('주석 처리', () => {
    test('REM 주석', () => {
      const parser = new Parser('10 REM THIS IS A COMMENT\n20 PRINT "HELLO"');
      const program = parser.parseProgram();

      // REM도 명령문으로 파싱됨 (실행 시 인터프리터가 무시)
      expect(program.statements).toHaveLength(2);
      expect(program.statements[0]?.type).toBe('RemStatement');
      expect(program.statements[0]?.lineNumber).toBe(10);
      expect(program.statements[1]?.type).toBe('PrintStatement');
      expect(program.statements[1]?.lineNumber).toBe(20);
    });

    test('작은따옴표 주석', () => {
      const parser = new Parser('10 \' THIS IS ALSO A COMMENT\n20 PRINT "HELLO"');
      const program = parser.parseProgram();

      // 작은따옴표는 주석 시작을 의미 (Tokenizer에서 skip)
      // 따라서 라인 10은 건너뛰어지고 라인 20만 파싱됨
      expect(program.statements).toHaveLength(1);
      expect(program.statements[0]?.type).toBe('PrintStatement');
      expect(program.statements[0]?.lineNumber).toBe(20);
    });
  });

  describe('에러 처리', () => {
    test('구문 오류 - 예상하지 못한 토큰', () => {
      expect(() => {
        const parser = new Parser('LET A = =');
        parser.parseProgram();
      }).toThrow();
    });

    test('구문 오류 - 닫히지 않은 문자열', () => {
      expect(() => {
        const parser = new Parser('PRINT "HELLO');
        parser.parseProgram();
      }).toThrow();
    });

    test('구문 오류 - 잘못된 숫자 형식', () => {
      expect(() => {
        const parser = new Parser('X = 1.2.3');
        parser.parseProgram();
      }).toThrow();
    });

    test('구문 오류 - 누락된 THEN', () => {
      expect(() => {
        const parser = new Parser('IF X > 0 PRINT "OK"');
        parser.parseProgram();
      }).toThrow();
    });

    test('구문 오류 - 누락된 TO', () => {
      expect(() => {
        const parser = new Parser('FOR I = 1 10');
        parser.parseProgram();
      }).toThrow();
    });
  });

  describe('복합 프로그램', () => {
    test('완전한 BASIC 프로그램', () => {
      const source = `
        10 REM SIMPLE BASIC PROGRAM
        20 PRINT "ENTER A NUMBER:"
        30 INPUT N
        40 IF N <= 0 THEN GOTO 80
        50 FOR I = 1 TO N
        60   PRINT I * I
        70 NEXT I
        80 PRINT "DONE"
        90 END
      `;

      const parser = new Parser(source);
      const program = parser.parseProgram();

      // 모든 라인이 명령문으로 파싱됨 (REM 포함)
      expect(program.statements).toHaveLength(9);

      // 각 명령문의 타입 검증
      expect(program.statements[0]?.type).toBe('RemStatement');     // 10
      expect(program.statements[1]?.type).toBe('PrintStatement');   // 20
      expect(program.statements[2]?.type).toBe('InputStatement');   // 30
      expect(program.statements[3]?.type).toBe('IfStatement');      // 40
      expect(program.statements[4]?.type).toBe('ForStatement');     // 50
      expect(program.statements[5]?.type).toBe('PrintStatement');   // 60
      expect(program.statements[6]?.type).toBe('NextStatement');    // 70
      expect(program.statements[7]?.type).toBe('PrintStatement');   // 80
      expect(program.statements[8]?.type).toBe('EndStatement');     // 90
    });
  });
});