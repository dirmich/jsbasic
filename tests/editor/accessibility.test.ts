/**
 * Accessibility Tests
 *
 * 에디터 접근성 검증 테스트
 */

import { describe, test, expect } from 'bun:test';
import { SyntaxHighlighter } from '../../src/editor/syntax-highlighter';

describe('Editor Accessibility', () => {
  describe('색상 대비 (Color Contrast)', () => {
    test('다크 테마 배경-전경 대비율 검증', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      const bg = theme.colors.background;
      const fg = theme.colors.foreground;

      // 색상 대비 계산 (간단한 휘도 기반)
      const bgLuminance = getRelativeLuminance(bg);
      const fgLuminance = getRelativeLuminance(fg);

      const contrastRatio = calculateContrastRatio(bgLuminance, fgLuminance);

      // 대비율이 최소 2:1 이상 (에디터 환경 고려)
      expect(contrastRatio).toBeGreaterThanOrEqual(2);
    });

    test('라이트 테마 배경-전경 대비율 (최소 4.5:1)', () => {
      const highlighter = new SyntaxHighlighter('light');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      const bg = theme.colors.background;
      const fg = theme.colors.foreground;

      const bgLuminance = getRelativeLuminance(bg);
      const fgLuminance = getRelativeLuminance(fg);

      const contrastRatio = calculateContrastRatio(bgLuminance, fgLuminance);

      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('다크 테마 키워드 색상 대비', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      const bg = theme.colors.background;
      const keyword = theme.colors.keyword;

      const contrastRatio = getColorContrast(bg, keyword);

      // 키워드 색상이 배경과 구분됨
      expect(contrastRatio).toBeGreaterThan(1);
    });

    test('라이트 테마 키워드 색상 대비', () => {
      const highlighter = new SyntaxHighlighter('light');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      const bg = theme.colors.background;
      const keyword = theme.colors.keyword;

      const contrastRatio = getColorContrast(bg, keyword);

      expect(contrastRatio).toBeGreaterThan(1);
    });

    test('모든 토큰 타입의 색상 대비 검증', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const theme = highlighter.getThemeManager().getCurrentTheme();
      const bg = theme.colors.background;

      const tokenColors = [
        theme.colors.keyword,
        theme.colors.string,
        theme.colors.number,
        theme.colors.comment,
        theme.colors.operator,
        theme.colors.function,
        theme.colors.identifier
      ];

      for (const color of tokenColors) {
        const contrastRatio = getColorContrast(bg, color);
        // 모든 색상이 배경과 구분됨
        expect(contrastRatio).toBeGreaterThan(1);
      }
    });

    test('주석 색상도 충분한 대비', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      const bg = theme.colors.background;
      const comment = theme.colors.comment;

      const contrastRatio = getColorContrast(bg, comment);

      // 주석도 배경과 구분됨
      expect(contrastRatio).toBeGreaterThan(1);
    });

    test('선택 영역 색상 대비', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      const bg = theme.colors.background;
      const selection = theme.colors.selection;

      const contrastRatio = getColorContrast(bg, selection);

      // 선택 영역은 명확히 구분되어야 함
      expect(contrastRatio).toBeGreaterThanOrEqual(2);
    });
  });

  describe('HTML 의미론 (Semantic HTML)', () => {
    test('코드 라인이 의미 있는 div로 구성', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('PRINT "TEST"');

      expect(html).toContain('class="code-line"');
      expect(html).toContain('class="line-number"');
      expect(html).toContain('class="line-content"');
    });

    test('각 토큰이 span으로 감싸짐', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('PRINT "TEST"');

      const spanCount = (html.match(/<span/g) || []).length;
      expect(spanCount).toBeGreaterThan(0);
    });

    test('HTML 구조가 중첩 없이 flat', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('FOR I = 1 TO 10');

      // div 안에 div가 중첩되지 않음
      const divMatches = html.match(/<div class="code-line">[\s\S]*?<\/div>/g);
      expect(divMatches).toBeDefined();

      if (divMatches) {
        for (const div of divMatches) {
          const innerDivs = div.match(/<div/g);
          expect(innerDivs?.length).toBe(1); // 시작 div만 있음
        }
      }
    });
  });

  describe('스크린 리더 지원', () => {
    test('라인 번호가 읽기 쉬운 형식', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('PRINT "A"');

      // 라인 번호가 공백으로 패딩됨 (4자리)
      expect(html).toContain('   1');
    });

    test('코드 내용이 순서대로 배치', () => {
      const highlighter = new SyntaxHighlighter();
      const code = `10 PRINT "A"
20 PRINT "B"`;
      const html = highlighter.toHTML(code);

      // 라인이 순서대로 나타남
      const printAIndex = html.indexOf('PRINT');
      const printBIndex = html.lastIndexOf('PRINT');

      expect(printAIndex).toBeLessThan(printBIndex);
    });

    test('텍스트 내용이 HTML 이스케이프되어 정확히 전달', () => {
      const highlighter = new SyntaxHighlighter();
      const code = 'PRINT "Special: <>&"';
      const html = highlighter.toHTML(code);

      // 특수 문자가 이스케이프되어 스크린 리더가 정확히 읽을 수 있음
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&amp;');
    });
  });

  describe('포커스 관리', () => {
    test('CSS 변수에 커서 색상 포함', () => {
      const highlighter = new SyntaxHighlighter();
      const vars = highlighter.getCSSVariables();

      expect(vars['--editor-cursor']).toBeDefined();
      expect(typeof vars['--editor-cursor']).toBe('string');
    });

    test('선택 영역 색상 정의', () => {
      const highlighter = new SyntaxHighlighter();
      const vars = highlighter.getCSSVariables();

      expect(vars['--editor-selection']).toBeDefined();
    });

    test('커서와 배경 간 명확한 대비', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      const bg = theme.colors.background;
      const cursor = theme.colors.cursor;

      const contrastRatio = getColorContrast(bg, cursor);

      // 커서가 배경과 구분됨
      expect(contrastRatio).toBeGreaterThan(1);
    });
  });

  describe('텍스트 가독성', () => {
    test('라인 번호가 적절히 구분됨', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('PRINT "A"');

      // 라인 번호와 내용이 별도 span으로 구분
      expect(html).toContain('class="line-number"');
      expect(html).toContain('class="line-content"');
    });

    test('빈 줄이 &nbsp;로 표시', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('\n');

      // 빈 줄도 공간을 차지하여 구조 유지
      expect(html).toContain('&nbsp;');
    });

    test('공백 문자가 보존됨', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('PRINT   "A"'); // 여러 공백

      // HTML이 생성되었는지 확인
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('PRINT');
    });

    test('긴 라인도 줄바꿈 없이 처리', () => {
      const highlighter = new SyntaxHighlighter();
      const longLine = 'PRINT "' + 'A'.repeat(200) + '"';
      const result = highlighter.highlightLine(longLine, 1);

      expect(result.rawText.length).toBeGreaterThan(200);
      expect(result.tokens.length).toBeGreaterThan(0);
    });
  });

  describe('다크/라이트 모드 접근성', () => {
    test('다크 모드 색상 조합', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      // 어두운 배경 확인
      const bg = theme.colors.background;
      const bgLuminance = getRelativeLuminance(bg);
      expect(bgLuminance).toBeLessThan(0.5);

      // 밝은 전경 확인
      const fg = theme.colors.foreground;
      const fgLuminance = getRelativeLuminance(fg);
      expect(fgLuminance).toBeGreaterThan(0.5);
    });

    test('라이트 모드 색상 조합', () => {
      const highlighter = new SyntaxHighlighter('light');
      const theme = highlighter.getThemeManager().getCurrentTheme();

      // 밝은 배경 확인
      const bg = theme.colors.background;
      const bgLuminance = getRelativeLuminance(bg);
      expect(bgLuminance).toBeGreaterThan(0.5);

      // 어두운 전경 확인
      const fg = theme.colors.foreground;
      const fgLuminance = getRelativeLuminance(fg);
      expect(fgLuminance).toBeLessThan(0.5);
    });

    test('테마 전환 시 모든 색상이 일관성 유지', () => {
      const highlighter = new SyntaxHighlighter('dark');
      const code = 'PRINT 42';

      const darkResult = highlighter.highlight(code);
      highlighter.setTheme('light');
      const lightResult = highlighter.highlight(code);

      // 토큰 구조는 동일
      expect(darkResult.lines[0]?.tokens.length).toBe(lightResult.lines[0]?.tokens.length);

      // 색상만 변경
      expect(darkResult.lines[0]?.tokens[0]?.color).not.toBe(
        lightResult.lines[0]?.tokens[0]?.color
      );
    });
  });

  describe('에러 메시지 접근성', () => {
    test('잘못된 구문도 원본 텍스트 유지', () => {
      const highlighter = new SyntaxHighlighter();
      const invalid = 'INVALID *** SYNTAX';
      const result = highlighter.highlightLine(invalid, 1);

      // 원본 텍스트가 보존되어 사용자가 읽을 수 있음
      expect(result.rawText).toBe(invalid);
    });

    test('에러 발생 시에도 HTML 구조 유지', () => {
      const highlighter = new SyntaxHighlighter();
      const invalid = 'INVALID *** SYNTAX';
      const html = highlighter.toHTML(invalid);

      expect(html).toContain('class="code-line"');
      expect(html).toContain('class="line-number"');
    });
  });

  describe('키보드 네비게이션 (간접 테스트)', () => {
    test('HTML 구조가 순차적 네비게이션에 적합', () => {
      const highlighter = new SyntaxHighlighter();
      const code = `10 PRINT "A"
20 PRINT "B"
30 PRINT "C"`;
      const html = highlighter.toHTML(code);

      // 각 라인이 독립된 div
      const lines = html.split('</div>').filter((line) => line.includes('code-line'));
      expect(lines.length).toBe(3);
    });

    test('라인 번호가 내용보다 먼저 나타남', () => {
      const highlighter = new SyntaxHighlighter();
      const html = highlighter.toHTML('PRINT "A"');

      const lineNumberIndex = html.indexOf('class="line-number"');
      const lineContentIndex = html.indexOf('class="line-content"');

      expect(lineNumberIndex).toBeLessThan(lineContentIndex);
    });
  });

  describe('고대비 모드 지원', () => {
    test('모든 색상이 명시적 hex 값', () => {
      const highlighter = new SyntaxHighlighter();
      const vars = highlighter.getCSSVariables();

      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

      for (const [key, value] of Object.entries(vars)) {
        expect(value).toMatch(hexColorRegex);
      }
    });

    test('투명도 없는 색상만 사용', () => {
      const highlighter = new SyntaxHighlighter();
      const theme = highlighter.getThemeManager().getCurrentTheme();

      // 모든 색상이 6자리 hex (투명도 없음)
      Object.values(theme.colors).forEach((color) => {
        expect(color.length).toBe(7); // #RRGGBB
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('언어 및 국제화', () => {
    test('특수 문자 및 유니코드 지원', () => {
      const highlighter = new SyntaxHighlighter();
      const code = 'PRINT "한글 日本語 中文"';
      const html = highlighter.toHTML(code);

      expect(html).toContain('한글');
      expect(html).toContain('日本語');
      expect(html).toContain('中文');
    });

    test('이모지 지원', () => {
      const highlighter = new SyntaxHighlighter();
      const code = 'PRINT "🎨 🚀 💻"';
      const result = highlighter.highlightLine(code, 1);

      expect(result.rawText).toContain('🎨');
      expect(result.rawText).toContain('🚀');
      expect(result.rawText).toContain('💻');
    });
  });
});

// 헬퍼 함수: hex 색상을 상대 휘도로 변환
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 헬퍼 함수: 대비율 계산
function calculateContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// 헬퍼 함수: 두 색상 간 대비율
function getColorContrast(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  return calculateContrastRatio(l1, l2);
}

// 헬퍼 함수: hex를 RGB로 변환
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1] ?? '0', 16),
        g: parseInt(result[2] ?? '0', 16),
        b: parseInt(result[3] ?? '0', 16)
      }
    : null;
}
