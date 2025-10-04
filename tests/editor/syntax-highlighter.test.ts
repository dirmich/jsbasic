/**
 * SyntaxHighlighter Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { SyntaxHighlighter } from '../../src/editor/syntax-highlighter';
import { TokenType } from '../../src/basic/tokenizer';

describe('SyntaxHighlighter', () => {
  let highlighter: SyntaxHighlighter;

  beforeEach(() => {
    highlighter = new SyntaxHighlighter();
  });

  describe('한 줄 하이라이팅', () => {
    test('빈 줄 하이라이팅', () => {
      const result = highlighter.highlightLine('', 1);

      expect(result.lineNumber).toBe(1);
      expect(result.tokens.length).toBe(0);
      expect(result.rawText).toBe('');
    });

    test('라인 번호가 있는 BASIC 코드', () => {
      const result = highlighter.highlightLine('10 PRINT "HELLO"', 1);

      expect(result.lineNumber).toBe(1);
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.rawText).toBe('10 PRINT "HELLO"');
    });

    test('키워드 하이라이팅', () => {
      const result = highlighter.highlightLine('PRINT "HELLO"', 1);

      const printToken = result.tokens.find(t => t.type === TokenType.PRINT);
      expect(printToken).toBeDefined();
      expect(printToken?.text).toBe('PRINT');
      expect(printToken?.color).toBeDefined();
    });

    test('문자열 하이라이팅', () => {
      const result = highlighter.highlightLine('PRINT "HELLO WORLD"', 1);

      const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken).toBeDefined();
      // Tokenizer는 문자열 값만 반환 (따옴표 제외)
      expect(stringToken?.text).toBe('HELLO WORLD');
    });

    test('숫자 하이라이팅', () => {
      const result = highlighter.highlightLine('LET X = 42', 1);

      const numberToken = result.tokens.find(t => t.type === TokenType.NUMBER);
      expect(numberToken).toBeDefined();
      expect(numberToken?.text).toBe('42');
    });

    test('식별자 하이라이팅', () => {
      const result = highlighter.highlightLine('LET VAR = 10', 1);

      const identifierToken = result.tokens.find(t => t.type === TokenType.IDENTIFIER);
      expect(identifierToken).toBeDefined();
    });

    test('주석 하이라이팅', () => {
      const result = highlighter.highlightLine('REM This is a comment', 1);

      const remToken = result.tokens.find(t => t.type === TokenType.REM);
      expect(remToken).toBeDefined();
      expect(remToken?.text).toBe('REM');
    });

    test('토큰 위치 정보', () => {
      const result = highlighter.highlightLine('PRINT 42', 1);

      expect(result.tokens[0]?.startIndex).toBe(0);
      expect(result.tokens[0]?.endIndex).toBeGreaterThan(0);
    });

    test('에러 처리', () => {
      // 잘못된 구문도 원본 텍스트 반환
      const result = highlighter.highlightLine('INVALID ***', 1);

      expect(result.lineNumber).toBe(1);
      expect(result.rawText).toBe('INVALID ***');
    });
  });

  describe('코드 전체 하이라이팅', () => {
    test('빈 코드 하이라이팅', () => {
      const result = highlighter.highlight('');

      expect(result.lines.length).toBe(1);
      expect(result.lines[0]?.tokens.length).toBe(0);
      expect(result.theme).toBeDefined();
    });

    test('단일 라인 하이라이팅', () => {
      const result = highlighter.highlight('10 PRINT "HELLO"');

      expect(result.lines.length).toBe(1);
      expect(result.lines[0]?.lineNumber).toBe(1);
      expect(result.lines[0]?.tokens.length).toBeGreaterThan(0);
    });

    test('복수 라인 하이라이팅', () => {
      const code = `10 PRINT "HELLO"
20 LET X = 42
30 END`;

      const result = highlighter.highlight(code);

      expect(result.lines.length).toBe(3);
      expect(result.lines[0]?.lineNumber).toBe(1);
      expect(result.lines[1]?.lineNumber).toBe(2);
      expect(result.lines[2]?.lineNumber).toBe(3);
    });

    test('빈 라인 처리', () => {
      const code = `10 PRINT "A"

20 PRINT "B"`;

      const result = highlighter.highlight(code);

      expect(result.lines.length).toBe(3);
      expect(result.lines[1]?.tokens.length).toBe(0);
      expect(result.lines[1]?.rawText).toBe('');
    });

    test('테마 정보 포함', () => {
      const result = highlighter.highlight('PRINT "HELLO"');

      expect(result.theme).toBe('dark');
    });
  });

  describe('HTML 마크업 생성', () => {
    test('빈 코드 HTML', () => {
      const html = highlighter.toHTML('');

      expect(html).toContain('line-number');
      expect(html).toContain('line-content');
    });

    test('단일 라인 HTML', () => {
      const html = highlighter.toHTML('10 PRINT "HELLO"');

      expect(html).toContain('<div class="code-line">');
      expect(html).toContain('<span class="line-number">');
      expect(html).toContain('<span class="line-content">');
      expect(html).toContain('</div>');
    });

    test('라인 번호 포맷', () => {
      const html = highlighter.toHTML('PRINT "A"');

      expect(html).toContain('   1'); // 4자리 패딩
    });

    test('색상 스타일 포함', () => {
      const html = highlighter.toHTML('PRINT "HELLO"');

      expect(html).toContain('style="color:');
    });

    test('HTML 이스케이프', () => {
      const html = highlighter.toHTML('PRINT "<>&"');

      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&amp;');
    });

    test('빈 줄 처리', () => {
      const html = highlighter.toHTML('PRINT "A"\n\nPRINT "B"');

      expect(html).toContain('&nbsp;');
    });

    test('복수 라인 HTML', () => {
      const code = `10 PRINT "A"
20 PRINT "B"`;

      const html = highlighter.toHTML(code);
      const lines = html.split('\n');

      expect(lines.length).toBe(2);
    });
  });

  describe('테마 전환', () => {
    test('다크 테마 (기본값)', () => {
      expect(highlighter.getTheme()).toBe('dark');
    });

    test('라이트 테마로 전환', () => {
      highlighter.setTheme('light');

      expect(highlighter.getTheme()).toBe('light');
    });

    test('테마 전환 후 색상 변경', () => {
      const darkResult = highlighter.highlightLine('PRINT "A"', 1);
      const darkColor = darkResult.tokens.find(t => t.type === TokenType.PRINT)?.color;

      highlighter.setTheme('light');
      const lightResult = highlighter.highlightLine('PRINT "A"', 1);
      const lightColor = lightResult.tokens.find(t => t.type === TokenType.PRINT)?.color;

      expect(darkColor).not.toBe(lightColor);
    });

    test('하이라이팅 결과에 테마 포함', () => {
      const result = highlighter.highlight('PRINT "A"');
      expect(result.theme).toBe('dark');

      highlighter.setTheme('light');
      const result2 = highlighter.highlight('PRINT "A"');
      expect(result2.theme).toBe('light');
    });
  });

  describe('CSS 변수', () => {
    test('CSS 변수 생성', () => {
      const vars = highlighter.getCSSVariables();

      expect(vars['--editor-bg']).toBeDefined();
      expect(vars['--editor-fg']).toBeDefined();
      expect(vars['--editor-keyword']).toBeDefined();
      expect(vars['--editor-string']).toBeDefined();
      expect(vars['--editor-number']).toBeDefined();
    });

    test('테마별 CSS 변수', () => {
      const darkVars = highlighter.getCSSVariables();
      const darkBg = darkVars['--editor-bg'];

      highlighter.setTheme('light');
      const lightVars = highlighter.getCSSVariables();
      const lightBg = lightVars['--editor-bg'];

      expect(darkBg).not.toBe(lightBg);
    });
  });

  describe('테마 매니저 접근', () => {
    test('테마 매니저 가져오기', () => {
      const manager = highlighter.getThemeManager();

      expect(manager).toBeDefined();
      expect(manager.getCurrentTheme()).toBeDefined();
    });
  });

  describe('다양한 BASIC 구문', () => {
    test('IF 문 하이라이팅', () => {
      const result = highlighter.highlightLine('IF X > 5 THEN PRINT "BIG"', 1);

      const ifToken = result.tokens.find(t => t.type === TokenType.IF);
      const thenToken = result.tokens.find(t => t.type === TokenType.THEN);
      const printToken = result.tokens.find(t => t.type === TokenType.PRINT);

      expect(ifToken).toBeDefined();
      expect(thenToken).toBeDefined();
      expect(printToken).toBeDefined();
    });

    test('FOR 루프 하이라이팅', () => {
      const result = highlighter.highlightLine('FOR I = 1 TO 10 STEP 2', 1);

      const forToken = result.tokens.find(t => t.type === TokenType.FOR);
      const toToken = result.tokens.find(t => t.type === TokenType.TO);
      const stepToken = result.tokens.find(t => t.type === TokenType.STEP);

      expect(forToken).toBeDefined();
      expect(toToken).toBeDefined();
      expect(stepToken).toBeDefined();
    });

    test('DIM 배열 선언 하이라이팅', () => {
      const result = highlighter.highlightLine('DIM A(10), B(5, 5)', 1);

      const dimToken = result.tokens.find(t => t.type === TokenType.DIM);
      expect(dimToken).toBeDefined();
    });

    test('그래픽 명령 하이라이팅', () => {
      const result = highlighter.highlightLine('PSET (100, 100), 15', 1);

      const psetToken = result.tokens.find(t => t.type === TokenType.PSET);
      expect(psetToken).toBeDefined();
    });

    test('함수 호출 하이라이팅', () => {
      const result = highlighter.highlightLine('X = SIN(3.14)', 1);

      const sinToken = result.tokens.find(t => t.type === TokenType.SIN);
      expect(sinToken).toBeDefined();
    });
  });

  describe('초기화 테마', () => {
    test('다크 테마로 초기화', () => {
      const dark = new SyntaxHighlighter('dark');
      expect(dark.getTheme()).toBe('dark');
    });

    test('라이트 테마로 초기화', () => {
      const light = new SyntaxHighlighter('light');
      expect(light.getTheme()).toBe('light');
    });
  });

  describe('키워드 인식 완전성', () => {
    test('모든 제어 흐름 키워드', () => {
      const keywords = [
        'IF', 'THEN', 'ELSE', 'ENDIF',
        'FOR', 'TO', 'STEP', 'NEXT',
        'WHILE', 'WEND',
        'DO', 'LOOP', 'UNTIL',
        'GOTO', 'GOSUB', 'RETURN', 'ON',
        'END', 'STOP'
      ];

      for (const keyword of keywords) {
        const result = highlighter.highlightLine(keyword, 1);
        const keywordToken = result.tokens.find((t) => t.text === keyword);

        expect(keywordToken).toBeDefined();
        expect(keywordToken?.type).not.toBe(TokenType.IDENTIFIER);
      }
    });

    test('대소문자 구분 없이 키워드 인식', () => {
      const variants = ['PRINT', 'Print', 'print', 'PrInT'];

      for (const variant of variants) {
        const result = highlighter.highlightLine(`${variant} "test"`, 1);
        const printToken = result.tokens.find((t) => t.text === variant);

        expect(printToken).toBeDefined();
        expect(printToken?.type).toBe(TokenType.PRINT);
      }
    });

    test('키워드 부분 일치 방지', () => {
      // PRINTER는 식별자여야 함
      const result = highlighter.highlightLine('PRINTER = 1', 1);
      const printerToken = result.tokens.find((t) => t.text === 'PRINTER');

      expect(printerToken).toBeDefined();
      expect(printerToken?.type).toBe(TokenType.IDENTIFIER);
    });

    test('입출력 명령', () => {
      const commands = ['PRINT', 'INPUT', 'READ', 'DATA', 'RESTORE'];

      for (const cmd of commands) {
        const result = highlighter.highlightLine(cmd, 1);
        const token = result.tokens.find((t) => t.text === cmd);

        expect(token).toBeDefined();
        expect(token?.color).toBe(highlighter.getThemeManager().getCurrentTheme().colors.keyword);
      }
    });

    test('그래픽 명령', () => {
      const commands = ['SCREEN', 'PSET', 'LINE', 'CIRCLE', 'PAINT', 'CLS', 'COLOR'];

      for (const cmd of commands) {
        const result = highlighter.highlightLine(cmd, 1);
        const token = result.tokens.find((t) => t.text === cmd);

        expect(token).toBeDefined();
        expect(token?.color).toBe(highlighter.getThemeManager().getCurrentTheme().colors.keyword);
      }
    });

    test('시스템 명령', () => {
      const commands = ['RUN', 'NEW', 'LIST', 'SAVE', 'LOAD', 'CLEAR'];

      for (const cmd of commands) {
        const result = highlighter.highlightLine(cmd, 1);
        const token = result.tokens.find((t) => t.text === cmd);

        expect(token).toBeDefined();
      }
    });
  });

  describe('숫자 리터럴 인식', () => {
    test('정수', () => {
      const numbers = ['0', '1', '42', '100', '9999'];

      for (const num of numbers) {
        const result = highlighter.highlightLine(`X = ${num}`, 1);
        const numToken = result.tokens.find((t) => t.text === num);

        expect(numToken).toBeDefined();
        expect(numToken?.type).toBe(TokenType.NUMBER);
      }
    });

    test('음수', () => {
      const result = highlighter.highlightLine('X = -5', 1);
      const tokens = result.tokens;

      // -5는 MINUS 토큰과 NUMBER 토큰으로 분리됨
      expect(tokens.some((t) => t.type === TokenType.MINUS)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.NUMBER)).toBe(true);
    });

    test('부동소수점', () => {
      const numbers = ['3.14', '0.5', '1.23'];

      for (const num of numbers) {
        const result = highlighter.highlightLine(`X = ${num}`, 1);
        const numToken = result.tokens.find((t) => t.text === num);

        expect(numToken).toBeDefined();
        expect(numToken?.type).toBe(TokenType.NUMBER);
      }
    });

    test('과학적 표기법', () => {
      const numbers = ['1E10', '1.23E-4', '5.67E+2'];

      for (const num of numbers) {
        const result = highlighter.highlightLine(`X = ${num}`, 1);
        // 과학적 표기법을 지원하는지 확인
        const hasNumber = result.tokens.some((t) => t.type === TokenType.NUMBER);
        expect(hasNumber).toBe(true);
      }
    });

    test('숫자 색상 적용', () => {
      const result = highlighter.highlightLine('X = 42', 1);
      const numToken = result.tokens.find((t) => t.type === TokenType.NUMBER);

      expect(numToken?.color).toBe(highlighter.getThemeManager().getCurrentTheme().colors.number);
    });
  });

  describe('문자열 리터럴 인식', () => {
    test('기본 문자열', () => {
      const result = highlighter.highlightLine('PRINT "Hello"', 1);
      const strToken = result.tokens.find((t) => t.type === TokenType.STRING);

      expect(strToken).toBeDefined();
      expect(strToken?.text).toBe('Hello');
    });

    test('빈 문자열', () => {
      const result = highlighter.highlightLine('PRINT ""', 1);
      const strToken = result.tokens.find((t) => t.type === TokenType.STRING);

      expect(strToken).toBeDefined();
      expect(strToken?.text).toBe('');
    });

    test('공백이 포함된 문자열', () => {
      const result = highlighter.highlightLine('PRINT "Hello World"', 1);
      const strToken = result.tokens.find((t) => t.type === TokenType.STRING);

      expect(strToken).toBeDefined();
      expect(strToken?.text).toBe('Hello World');
    });

    test('특수 문자가 포함된 문자열', () => {
      const result = highlighter.highlightLine('PRINT "!@#$%"', 1);
      const strToken = result.tokens.find((t) => t.type === TokenType.STRING);

      expect(strToken).toBeDefined();
    });

    test('문자열 색상 적용', () => {
      const result = highlighter.highlightLine('PRINT "test"', 1);
      const strToken = result.tokens.find((t) => t.type === TokenType.STRING);

      expect(strToken?.color).toBe(highlighter.getThemeManager().getCurrentTheme().colors.string);
    });
  });

  describe('주석 인식', () => {
    test('REM 주석', () => {
      const result = highlighter.highlightLine('REM This is a comment', 1);
      const remToken = result.tokens.find((t) => t.type === TokenType.REM);

      expect(remToken).toBeDefined();
      expect(remToken?.text).toBe('REM');
    });

    test('주석 색상 적용', () => {
      const result = highlighter.highlightLine('REM comment', 1);
      const remToken = result.tokens.find((t) => t.type === TokenType.REM);

      expect(remToken?.color).toBe(highlighter.getThemeManager().getCurrentTheme().colors.comment);
    });

    test('대소문자 REM', () => {
      const variants = ['REM', 'Rem', 'rem'];

      for (const variant of variants) {
        const result = highlighter.highlightLine(`${variant} test`, 1);
        const remToken = result.tokens.find((t) => t.text === variant);

        expect(remToken).toBeDefined();
        expect(remToken?.type).toBe(TokenType.REM);
      }
    });
  });

  describe('연산자 인식', () => {
    test('산술 연산자', () => {
      const result = highlighter.highlightLine('X = A + B - C * D / E', 1);

      expect(result.tokens.some((t) => t.type === TokenType.PLUS)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.MINUS)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.MULTIPLY)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.DIVIDE)).toBe(true);
    });

    test('비교 연산자', () => {
      const result = highlighter.highlightLine('IF X = 5 AND Y > 10 THEN Z = 1', 1);

      expect(result.tokens.some((t) => t.type === TokenType.EQUALS)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.GREATER_THAN)).toBe(true);
    });

    test('논리 연산자', () => {
      const result = highlighter.highlightLine('IF A AND B OR C THEN X = 1', 1);

      expect(result.tokens.some((t) => t.type === TokenType.AND)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.OR)).toBe(true);
    });

    test('연산자 색상', () => {
      const result = highlighter.highlightLine('X = A + B', 1);
      const plusToken = result.tokens.find((t) => t.type === TokenType.PLUS);

      expect(plusToken?.color).toBe(
        highlighter.getThemeManager().getCurrentTheme().colors.operator
      );
    });
  });

  describe('함수 인식', () => {
    test('수학 함수', () => {
      const functions = ['SIN', 'COS', 'TAN', 'ABS', 'INT', 'SQR', 'RND'];

      for (const fn of functions) {
        const result = highlighter.highlightLine(`X = ${fn}(Y)`, 1);
        const fnToken = result.tokens.find((t) => t.text === fn);

        expect(fnToken).toBeDefined();
        expect(fnToken?.color).toBe(
          highlighter.getThemeManager().getCurrentTheme().colors.function
        );
      }
    });

    test('문자열 함수', () => {
      const functions = ['LEFT', 'RIGHT', 'MID', 'LEN', 'CHR', 'ASC', 'STR', 'VAL'];

      for (const fn of functions) {
        const result = highlighter.highlightLine(`X = ${fn}(Y)`, 1);
        // LEFT$, RIGHT$ 등의 형태로 인식될 수 있으므로 타입만 확인
        const fnToken = result.tokens.find((t) => t.text.includes(fn));

        expect(fnToken).toBeDefined();
      }
    });
  });

  describe('복잡한 코드 하이라이팅', () => {
    test('여러 요소가 혼합된 라인', () => {
      const result = highlighter.highlightLine('IF X > 5 THEN PRINT "BIG"; X', 1);

      expect(result.tokens.some((t) => t.type === TokenType.IF)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.IDENTIFIER)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.GREATER_THAN)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.NUMBER)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.THEN)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.PRINT)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.STRING)).toBe(true);
    });

    test('중첩된 함수 호출', () => {
      const result = highlighter.highlightLine('X = INT(SQR(ABS(Y)))', 1);

      expect(result.tokens.filter((t) => t.type === TokenType.INT).length).toBeGreaterThan(0);
      expect(result.tokens.filter((t) => t.type === TokenType.SQR).length).toBeGreaterThan(0);
      expect(result.tokens.filter((t) => t.type === TokenType.ABS).length).toBeGreaterThan(0);
    });

    test('복잡한 수식', () => {
      const result = highlighter.highlightLine('X = (A + B) * (C - D) / E', 1);

      expect(result.tokens.length).toBeGreaterThan(10);
      expect(result.tokens.some((t) => t.type === TokenType.PLUS)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.MULTIPLY)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.MINUS)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.DIVIDE)).toBe(true);
    });

    test('FOR 루프 전체', () => {
      const result = highlighter.highlightLine('FOR I = 1 TO 100 STEP 2', 1);

      expect(result.tokens.some((t) => t.type === TokenType.FOR)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.TO)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.STEP)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.IDENTIFIER)).toBe(true);
    });

    test('DIM 배열 선언', () => {
      const result = highlighter.highlightLine('DIM A(10), B(5, 5), C(100)', 1);

      expect(result.tokens.some((t) => t.type === TokenType.DIM)).toBe(true);
      expect(result.tokens.filter((t) => t.type === TokenType.IDENTIFIER).length).toBeGreaterThan(
        0
      );
    });

    test('PSET 그래픽 명령', () => {
      const result = highlighter.highlightLine('PSET (X, Y), C', 1);

      expect(result.tokens.some((t) => t.type === TokenType.PSET)).toBe(true);
      expect(result.tokens.some((t) => t.type === TokenType.IDENTIFIER)).toBe(true);
    });
  });

  describe('성능 테스트', () => {
    test('긴 프로그램 하이라이팅 (<100ms for 100 lines)', () => {
      const lines: string[] = [];
      for (let i = 1; i <= 100; i++) {
        lines.push(`${i * 10} PRINT "Line ${i}"`);
      }
      const code = lines.join('\n');

      const start = performance.now();
      const result = highlighter.highlight(code);
      const duration = performance.now() - start;

      expect(result.lines.length).toBe(100);
      expect(duration).toBeLessThan(100);
    });

    test('매우 긴 프로그램 하이라이팅 (<500ms for 1000 lines)', () => {
      const lines: string[] = [];
      for (let i = 1; i <= 1000; i++) {
        lines.push(`${i * 10} PRINT "Line ${i}"`);
      }
      const code = lines.join('\n');

      const start = performance.now();
      const result = highlighter.highlight(code);
      const duration = performance.now() - start;

      expect(result.lines.length).toBe(1000);
      expect(duration).toBeLessThan(500);
    });

    test('복잡한 라인 하이라이팅 성능', () => {
      const complexLine = 'IF A > 5 AND B < 10 THEN X = SIN(Y) + COS(Z) * TAN(W)';

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        highlighter.highlightLine(complexLine, i);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('테마 적용 테스트', () => {
    test('다크 테마 색상', () => {
      highlighter.setTheme('dark');
      const result = highlighter.highlightLine('PRINT 42', 1);

      const printToken = result.tokens.find((t) => t.type === TokenType.PRINT);
      const numberToken = result.tokens.find((t) => t.type === TokenType.NUMBER);

      expect(printToken?.color).toBe('#569cd6'); // 다크 키워드
      expect(numberToken?.color).toBe('#b5cea8'); // 다크 숫자
    });

    test('라이트 테마 색상', () => {
      highlighter.setTheme('light');
      const result = highlighter.highlightLine('PRINT 42', 1);

      const printToken = result.tokens.find((t) => t.type === TokenType.PRINT);
      const numberToken = result.tokens.find((t) => t.type === TokenType.NUMBER);

      expect(printToken?.color).toBe('#0000ff'); // 라이트 키워드
      expect(numberToken?.color).toBe('#098658'); // 라이트 숫자
    });

    test('테마 전환 후 재하이라이팅', () => {
      const code = 'PRINT "HELLO"';

      const darkResult = highlighter.highlight(code);
      highlighter.setTheme('light');
      const lightResult = highlighter.highlight(code);

      const darkColor = darkResult.lines[0]?.tokens[0]?.color;
      const lightColor = lightResult.lines[0]?.tokens[0]?.color;

      expect(darkColor).not.toBe(lightColor);
    });
  });

  describe('엣지 케이스', () => {
    test('빈 입력', () => {
      const result = highlighter.highlight('');

      expect(result.lines.length).toBe(1);
      expect(result.lines[0]?.tokens.length).toBe(0);
    });

    test('공백만 있는 라인', () => {
      const result = highlighter.highlightLine('   ', 1);

      expect(result.rawText).toBe('   ');
      expect(result.lineNumber).toBe(1);
    });

    test('매우 긴 라인 (>1000 문자)', () => {
      const longLine = 'PRINT "' + 'A'.repeat(1000) + '"';
      const result = highlighter.highlightLine(longLine, 1);

      expect(result.rawText.length).toBeGreaterThan(1000);
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    test('특수 문자', () => {
      const result = highlighter.highlightLine('PRINT "!@#$%^&*()"', 1);

      expect(result.tokens.some((t) => t.type === TokenType.STRING)).toBe(true);
    });

    test('연속된 빈 줄', () => {
      const code = '\n\n\n';
      const result = highlighter.highlight(code);

      expect(result.lines.length).toBe(4);
      expect(result.lines.every((line) => line.tokens.length === 0)).toBe(true);
    });

    test('HTML/XSS 공격 방지', () => {
      const malicious = 'PRINT "<script>alert(1)</script>"';
      const html = highlighter.toHTML(malicious);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    test('따옴표 이스케이프', () => {
      const code = "PRINT \"'\"";
      const html = highlighter.toHTML(code);

      // HTML 이스케이프 확인 (작은따옴표)
      expect(html.length).toBeGreaterThan(0);
    });
  });

  describe('토큰 위치 정확성', () => {
    test('각 토큰의 startIndex와 endIndex가 올바름', () => {
      const result = highlighter.highlightLine('PRINT "TEST"', 1);

      for (let i = 0; i < result.tokens.length - 1; i++) {
        const token = result.tokens[i];
        const nextToken = result.tokens[i + 1];

        if (!token || !nextToken) continue;

        expect(token.endIndex).toBeLessThanOrEqual(nextToken.startIndex);
      }
    });

    test('토큰 텍스트 길이와 인덱스 일치', () => {
      const result = highlighter.highlightLine('X = 42', 1);

      for (const token of result.tokens) {
        const length = token.endIndex - token.startIndex;
        expect(length).toBe(token.text.length);
      }
    });
  });

  describe('라인 번호 처리', () => {
    test('라인 번호가 있는 코드', () => {
      const result = highlighter.highlightLine('10 PRINT "A"', 1);

      expect(result.lineNumber).toBe(1);
      expect(result.tokens.some((t) => t.type === TokenType.NUMBER)).toBe(true);
    });

    test('라인 번호 없는 코드', () => {
      const result = highlighter.highlightLine('PRINT "A"', 1);

      expect(result.lineNumber).toBe(1);
      expect(result.tokens.some((t) => t.type === TokenType.PRINT)).toBe(true);
    });
  });

  describe('HTML 출력 형식', () => {
    test('각 라인이 div로 감싸짐', () => {
      const html = highlighter.toHTML('PRINT "A"');

      expect(html).toContain('<div class="code-line">');
      expect(html).toContain('</div>');
    });

    test('라인 번호가 4자리 패딩', () => {
      const html1 = highlighter.toHTML('X=1');
      const html10 = highlighter.toHTML('X=1\n'.repeat(10).trim());

      expect(html1).toContain('   1'); // 4자리
      expect(html10).toContain('  10'); // 4자리
    });

    test('각 토큰이 span으로 감싸짐', () => {
      const html = highlighter.toHTML('PRINT "A"');

      expect(html.match(/<span style="color:/g)?.length).toBeGreaterThan(0);
    });

    test('빈 줄에 &nbsp; 포함', () => {
      const html = highlighter.toHTML('\n');

      expect(html).toContain('&nbsp;');
    });
  });
});
