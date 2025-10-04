/**
 * Editor Integration Tests
 *
 * SyntaxHighlighter와 ThemeManager의 통합 테스트
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { SyntaxHighlighter } from '../../src/editor/syntax-highlighter';
import { ThemeManager } from '../../src/editor/theme-manager';

describe('Editor Integration', () => {
  let highlighter: SyntaxHighlighter;

  beforeEach(() => {
    highlighter = new SyntaxHighlighter();
  });

  describe('기본 워크플로우', () => {
    test('에디터 초기화 → 테마 적용 → 코드 입력 → 하이라이팅', () => {
      // 1. 에디터 초기화 (기본 다크 테마)
      expect(highlighter.getTheme()).toBe('dark');

      // 2. 테마 적용
      highlighter.setTheme('light');
      expect(highlighter.getTheme()).toBe('light');

      // 3. BASIC 코드 입력 및 하이라이팅
      const code = '10 PRINT "HELLO WORLD"';
      const result = highlighter.highlight(code);

      expect(result.lines.length).toBe(1);
      expect(result.theme).toBe('light');
      expect(result.lines[0]?.tokens.length).toBeGreaterThan(0);

      // 4. HTML 출력 생성
      const html = highlighter.toHTML(code);
      expect(html).toContain('PRINT');
      expect(html).toContain('HELLO WORLD');
    });

    test('실시간 하이라이팅 시뮬레이션', () => {
      const lines = [
        '10 PRINT "A"',
        '20 FOR I = 1 TO 10',
        '30 PRINT I',
        '40 NEXT I',
        '50 END'
      ];

      // 라인별로 순차적으로 하이라이팅
      const results = lines.map((line, index) => highlighter.highlightLine(line, index + 1));

      expect(results.length).toBe(5);
      results.forEach((result, index) => {
        expect(result.lineNumber).toBe(index + 1);
        expect(result.tokens.length).toBeGreaterThan(0);
      });
    });

    test('테마 전환 → 하이라이팅 재적용', () => {
      const code = 'PRINT 42';

      // 다크 테마로 하이라이팅
      const darkResult = highlighter.highlight(code);
      const darkColor = darkResult.lines[0]?.tokens[0]?.color;

      // 라이트 테마로 전환
      highlighter.setTheme('light');
      const lightResult = highlighter.highlight(code);
      const lightColor = lightResult.lines[0]?.tokens[0]?.color;

      // 색상이 다름
      expect(darkColor).not.toBe(lightColor);

      // 다시 다크 테마로 전환
      highlighter.setTheme('dark');
      const darkResult2 = highlighter.highlight(code);
      const darkColor2 = darkResult2.lines[0]?.tokens[0]?.color;

      // 원래 다크 테마 색상과 동일
      expect(darkColor).toBe(darkColor2);
    });
  });

  describe('사용자 시나리오', () => {
    test('프로그램 작성 시뮬레이션', () => {
      const program = `10 REM Simple Calculator
20 INPUT "Enter first number: ", A
30 INPUT "Enter second number: ", B
40 PRINT "Sum = "; A + B
50 PRINT "Product = "; A * B
60 END`;

      const result = highlighter.highlight(program);

      expect(result.lines.length).toBe(6);
      expect(result.lines[0]?.tokens.some((t) => t.text === 'REM')).toBe(true);
      expect(result.lines[1]?.tokens.some((t) => t.text === 'INPUT')).toBe(true);
      expect(result.lines[3]?.tokens.some((t) => t.text === 'PRINT')).toBe(true);
      expect(result.lines[5]?.tokens.some((t) => t.text === 'END')).toBe(true);
    });

    test('줄 단위 편집 시뮬레이션', () => {
      const originalLine = '10 PRINT "HELLO"';
      const editedLine = '10 PRINT "WORLD"';

      const result1 = highlighter.highlightLine(originalLine, 1);
      expect(result1.rawText).toBe(originalLine);

      const result2 = highlighter.highlightLine(editedLine, 1);
      expect(result2.rawText).toBe(editedLine);

      // 토큰 구조는 동일
      expect(result1.tokens.length).toBe(result2.tokens.length);
    });

    test('복사/붙여넣기 시뮬레이션', () => {
      const clipboard = `FOR I = 1 TO 10
PRINT I
NEXT I`;

      const result = highlighter.highlight(clipboard);

      expect(result.lines.length).toBe(3);
      expect(result.lines[0]?.tokens.some((t) => t.text === 'FOR')).toBe(true);
      expect(result.lines[1]?.tokens.some((t) => t.text === 'PRINT')).toBe(true);
      expect(result.lines[2]?.tokens.some((t) => t.text === 'NEXT')).toBe(true);
    });

    test('대량 코드 붙여넣기', () => {
      const lines: string[] = [];
      for (let i = 1; i <= 100; i++) {
        lines.push(`${i * 10} PRINT "Line ${i}"`);
      }
      const largeProgram = lines.join('\n');

      const start = performance.now();
      const result = highlighter.highlight(largeProgram);
      const duration = performance.now() - start;

      expect(result.lines.length).toBe(100);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('테마 매니저와 하이라이터 상호작용', () => {
    test('테마 매니저 직접 접근', () => {
      const manager = highlighter.getThemeManager();

      expect(manager).toBeDefined();
      expect(manager.getCurrentTheme().name).toBe('dark');

      manager.switchTheme('light');
      expect(highlighter.getTheme()).toBe('light');
    });

    test('CSS 변수 생성 및 적용', () => {
      const vars = highlighter.getCSSVariables();

      expect(vars['--editor-bg']).toBeDefined();
      expect(vars['--editor-keyword']).toBeDefined();

      // 라이트 테마로 전환
      highlighter.setTheme('light');
      const lightVars = highlighter.getCSSVariables();

      expect(lightVars['--editor-bg']).not.toBe(vars['--editor-bg']);
    });

    test('테마 색상이 하이라이팅에 반영', () => {
      const code = 'PRINT "TEST"';

      // 다크 테마
      const darkResult = highlighter.highlightLine(code, 1);
      const darkKeywordColor = darkResult.tokens[0]?.color;

      // 라이트 테마
      highlighter.setTheme('light');
      const lightResult = highlighter.highlightLine(code, 1);
      const lightKeywordColor = lightResult.tokens[0]?.color;

      // 테마 매니저의 색상과 일치
      const darkTheme = new ThemeManager('dark');
      const lightTheme = new ThemeManager('light');

      expect(darkKeywordColor).toBe(darkTheme.getCurrentTheme().colors.keyword);
      expect(lightKeywordColor).toBe(lightTheme.getCurrentTheme().colors.keyword);
    });
  });

  describe('에러 처리 및 복구', () => {
    test('잘못된 BASIC 문법도 하이라이팅', () => {
      const invalidCode = 'INVALID SYNTAX *** %%%';
      const result = highlighter.highlightLine(invalidCode, 1);

      expect(result.rawText).toBe(invalidCode);
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    test('빈 입력 처리', () => {
      const result1 = highlighter.highlight('');
      const result2 = highlighter.highlightLine('', 1);

      expect(result1.lines.length).toBe(1);
      expect(result2.tokens.length).toBe(0);
    });

    test('매우 긴 라인 처리', () => {
      const veryLongLine = 'PRINT "' + 'A'.repeat(10000) + '"';

      expect(() => {
        const result = highlighter.highlightLine(veryLongLine, 1);
        expect(result.rawText.length).toBeGreaterThan(10000);
      }).not.toThrow();
    });

    test('특수 문자 및 유니코드', () => {
      const specialChars = 'PRINT "한글 テスト 🎨 <>&"';
      const html = highlighter.toHTML(specialChars);

      expect(html).toContain('한글');
      expect(html).toContain('テスト');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&amp;');
    });
  });

  describe('성능 통합 테스트', () => {
    test('연속 하이라이팅 성능', () => {
      const code = 'FOR I = 1 TO 10: PRINT I: NEXT I';

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        highlighter.highlight(code);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    test('테마 전환 성능', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        highlighter.setTheme(i % 2 === 0 ? 'dark' : 'light');
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    test('HTML 생성 성능', () => {
      const lines: string[] = [];
      for (let i = 1; i <= 50; i++) {
        lines.push(`${i * 10} PRINT "Line ${i}"`);
      }
      const code = lines.join('\n');

      const start = performance.now();
      const html = highlighter.toHTML(code);
      const duration = performance.now() - start;

      expect(html.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('실제 BASIC 프로그램 예제', () => {
    test('피보나치 수열 프로그램', () => {
      const fibonacci = `10 REM Fibonacci Sequence
20 LET A = 0
30 LET B = 1
40 FOR I = 1 TO 10
50 PRINT A;
60 LET C = A + B
70 LET A = B
80 LET B = C
90 NEXT I
100 END`;

      const result = highlighter.highlight(fibonacci);

      expect(result.lines.length).toBe(10);
      expect(result.lines[0]?.tokens.some((t) => t.text === 'REM')).toBe(true);
      expect(result.lines[3]?.tokens.some((t) => t.text === 'FOR')).toBe(true);
      expect(result.lines[8]?.tokens.some((t) => t.text === 'NEXT')).toBe(true);

      const html = highlighter.toHTML(fibonacci);
      expect(html).toContain('Fibonacci');
      expect(html.split('\n').length).toBe(10);
    });

    test('원 그리기 프로그램', () => {
      const circleProgram = `10 SCREEN 1
20 COLOR 15
30 CLS
40 CIRCLE (160, 100), 50
50 PAINT (160, 100), 2
60 END`;

      const result = highlighter.highlight(circleProgram);

      expect(result.lines[0]?.tokens.some((t) => t.text === 'SCREEN')).toBe(true);
      expect(result.lines[1]?.tokens.some((t) => t.text === 'COLOR')).toBe(true);
      expect(result.lines[2]?.tokens.some((t) => t.text === 'CLS')).toBe(true);
      expect(result.lines[3]?.tokens.some((t) => t.text === 'CIRCLE')).toBe(true);
      expect(result.lines[4]?.tokens.some((t) => t.text === 'PAINT')).toBe(true);
    });

    test('구구단 프로그램', () => {
      const multiplicationTable = `10 FOR I = 1 TO 9
20 FOR J = 1 TO 9
30 PRINT I; "x"; J; "="; I * J
40 NEXT J
50 PRINT
60 NEXT I`;

      const result = highlighter.highlight(multiplicationTable);

      expect(result.lines.length).toBe(6);
      expect(result.lines[0]?.tokens.some((t) => t.text === 'FOR')).toBe(true);
      expect(result.lines[2]?.tokens.some((t) => t.text === 'PRINT')).toBe(true);
    });
  });

  describe('HTML 출력 검증', () => {
    test('HTML 구조 완전성', () => {
      const code = `10 PRINT "A"
20 PRINT "B"`;

      const html = highlighter.toHTML(code);

      // 각 라인이 div로 감싸짐
      const divMatches = html.match(/<div class="code-line">/g);
      expect(divMatches?.length).toBe(2);

      // 라인 번호 존재
      expect(html).toContain('class="line-number"');

      // 라인 내용 존재
      expect(html).toContain('class="line-content"');

      // 모든 div가 닫힘
      const openDivs = (html.match(/<div/g) || []).length;
      const closeDivs = (html.match(/<\/div>/g) || []).length;
      expect(openDivs).toBe(closeDivs);
    });

    test('색상 스타일 적용', () => {
      const code = 'PRINT "TEST"';
      const html = highlighter.toHTML(code);

      // 인라인 스타일로 색상 적용
      expect(html).toMatch(/style="color:\s*#[0-9a-fA-F]{6}"/);
    });

    test('HTML 이스케이프 완전성', () => {
      const malicious = 'PRINT "<script>alert(1)</script>"';
      const html = highlighter.toHTML(malicious);

      // 모든 HTML 특수 문자가 이스케이프됨
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('상태 관리', () => {
    test('하이라이터 인스턴스 간 독립성', () => {
      const highlighter1 = new SyntaxHighlighter('dark');
      const highlighter2 = new SyntaxHighlighter('light');

      expect(highlighter1.getTheme()).toBe('dark');
      expect(highlighter2.getTheme()).toBe('light');

      highlighter1.setTheme('light');
      expect(highlighter1.getTheme()).toBe('light');
      expect(highlighter2.getTheme()).toBe('light');
    });

    test('하이라이팅 결과 불변성', () => {
      const code = 'PRINT "TEST"';
      const result1 = highlighter.highlight(code);
      const result2 = highlighter.highlight(code);

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // 다른 객체 참조
    });
  });

  describe('다중 테마 전환 시나리오', () => {
    test('반복적인 테마 전환', () => {
      const code = 'PRINT 42';

      for (let i = 0; i < 10; i++) {
        highlighter.setTheme('dark');
        const darkResult = highlighter.highlight(code);

        highlighter.setTheme('light');
        const lightResult = highlighter.highlight(code);

        expect(darkResult.theme).toBe('dark');
        expect(lightResult.theme).toBe('light');
      }
    });

    test('테마 전환 중 하이라이팅 일관성', () => {
      const code = 'FOR I = 1 TO 10: PRINT I: NEXT I';

      highlighter.setTheme('dark');
      const result1 = highlighter.highlight(code);

      highlighter.setTheme('light');
      highlighter.setTheme('dark');
      const result2 = highlighter.highlight(code);

      // 색상은 동일해야 함
      expect(result1.lines[0]?.tokens[0]?.color).toBe(result2.lines[0]?.tokens[0]?.color);
    });
  });

  describe('메모리 및 리소스 관리', () => {
    test('대량 하이라이팅 후 메모리 정리', () => {
      const largeCode = Array(100)
        .fill(0)
        .map((_, i) => `${(i + 1) * 10} PRINT "Line ${i + 1}"`)
        .join('\n');

      // 여러 번 하이라이팅
      for (let i = 0; i < 10; i++) {
        const result = highlighter.highlight(largeCode);
        expect(result.lines.length).toBe(100);
      }

      // 메모리 누수 없이 계속 동작해야 함
      const finalResult = highlighter.highlight('PRINT "OK"');
      expect(finalResult.lines.length).toBe(1);
    });

    test('HTML 생성 시 메모리 효율성', () => {
      const code = Array(50)
        .fill(0)
        .map((_, i) => `PRINT "${i}"`)
        .join('\n');

      const start = performance.now();
      const html = highlighter.toHTML(code);
      const duration = performance.now() - start;

      expect(html.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });
  });
});
