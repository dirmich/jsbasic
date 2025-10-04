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
      expect(stringToken?.text).toBe('"HELLO WORLD"');
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
});
