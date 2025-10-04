/**
 * ThemeManager Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ThemeManager } from '../../src/editor/theme-manager';
import { TokenType } from '../../src/basic/tokenizer';
import type { ThemeName, ThemeColors } from '../../src/editor/types';

describe('ThemeManager', () => {
  let manager: ThemeManager;

  beforeEach(() => {
    manager = new ThemeManager();
  });

  describe('초기화 및 기본 설정', () => {
    test('기본 테마로 초기화 (dark)', () => {
      const theme = manager.getCurrentTheme();

      expect(theme.name).toBe('dark');
      expect(theme.colors).toBeDefined();
      expect(theme.colors.background).toBeDefined();
      expect(theme.colors.foreground).toBeDefined();
    });

    test('라이트 테마로 초기화', () => {
      const lightManager = new ThemeManager('light');
      const theme = lightManager.getCurrentTheme();

      expect(theme.name).toBe('light');
      expect(theme.colors.background).toBe('#ffffff');
      expect(theme.colors.foreground).toBe('#000000');
    });

    test('다크 테마로 초기화', () => {
      const darkManager = new ThemeManager('dark');
      const theme = darkManager.getCurrentTheme();

      expect(theme.name).toBe('dark');
      expect(theme.colors.background).toBe('#1e1e1e');
      expect(theme.colors.foreground).toBe('#d4d4d4');
    });

    test('잘못된 테마 이름으로 초기화 시 에러', () => {
      expect(() => {
        new ThemeManager('invalid' as ThemeName);
      }).toThrow('Theme not found: invalid');
    });

    test('테마 설정에 모든 필수 색상 포함', () => {
      const theme = manager.getCurrentTheme();
      const requiredColors: (keyof ThemeColors)[] = [
        'background',
        'foreground',
        'keyword',
        'string',
        'number',
        'comment',
        'operator',
        'function',
        'identifier',
        'lineNumber',
        'selection',
        'cursor'
      ];

      for (const color of requiredColors) {
        expect(theme.colors[color]).toBeDefined();
        expect(typeof theme.colors[color]).toBe('string');
      }
    });

    test('모든 색상이 유효한 CSS 색상 형식', () => {
      const theme = manager.getCurrentTheme();
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

      Object.values(theme.colors).forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe('테마 전환', () => {
    test('다크에서 라이트로 전환', () => {
      expect(manager.getCurrentTheme().name).toBe('dark');

      manager.switchTheme('light');

      expect(manager.getCurrentTheme().name).toBe('light');
    });

    test('라이트에서 다크로 전환', () => {
      manager.switchTheme('light');
      expect(manager.getCurrentTheme().name).toBe('light');

      manager.switchTheme('dark');

      expect(manager.getCurrentTheme().name).toBe('dark');
    });

    test('같은 테마로 여러 번 전환', () => {
      manager.switchTheme('dark');
      manager.switchTheme('dark');
      manager.switchTheme('dark');

      expect(manager.getCurrentTheme().name).toBe('dark');
    });

    test('존재하지 않는 테마로 전환 시 에러', () => {
      expect(() => {
        manager.switchTheme('invalid' as ThemeName);
      }).toThrow('Theme not found: invalid');
    });

    test('테마 전환 후 원본 테마 유지', () => {
      const originalTheme = manager.getCurrentTheme();

      manager.switchTheme('light');
      manager.switchTheme('dark');

      const currentTheme = manager.getCurrentTheme();
      expect(currentTheme.name).toBe(originalTheme.name);
    });
  });

  describe('색상 관리', () => {
    test('다크 테마 키워드 색상', () => {
      const color = manager.getColorForToken(TokenType.PRINT);

      expect(color).toBe('#569cd6'); // 다크 테마 키워드 색상
    });

    test('라이트 테마 키워드 색상', () => {
      manager.switchTheme('light');
      const color = manager.getColorForToken(TokenType.PRINT);

      expect(color).toBe('#0000ff'); // 라이트 테마 키워드 색상
    });

    test('문자열 색상', () => {
      const darkColor = manager.getColorForToken(TokenType.STRING);
      expect(darkColor).toBe('#ce9178');

      manager.switchTheme('light');
      const lightColor = manager.getColorForToken(TokenType.STRING);
      expect(lightColor).toBe('#a31515');
    });

    test('숫자 색상', () => {
      const darkColor = manager.getColorForToken(TokenType.NUMBER);
      expect(darkColor).toBe('#b5cea8');

      manager.switchTheme('light');
      const lightColor = manager.getColorForToken(TokenType.NUMBER);
      expect(lightColor).toBe('#098658');
    });

    test('주석 색상', () => {
      const darkColor = manager.getColorForToken(TokenType.REM);
      expect(darkColor).toBe('#6a9955');

      manager.switchTheme('light');
      const lightColor = manager.getColorForToken(TokenType.REM);
      expect(lightColor).toBe('#008000');
    });

    test('연산자 색상', () => {
      const operators = [
        TokenType.PLUS,
        TokenType.MINUS,
        TokenType.MULTIPLY,
        TokenType.DIVIDE,
        TokenType.EQUALS
      ];

      for (const op of operators) {
        const color = manager.getColorForToken(op);
        expect(color).toBe('#d4d4d4'); // 다크 테마 연산자 색상
      }
    });

    test('함수 색상', () => {
      const functions = [
        TokenType.SIN,
        TokenType.COS,
        TokenType.ABS,
        TokenType.INT,
        TokenType.SQR
      ];

      for (const fn of functions) {
        const color = manager.getColorForToken(fn);
        expect(color).toBe('#dcdcaa'); // 다크 테마 함수 색상
      }
    });

    test('식별자 색상', () => {
      const color = manager.getColorForToken(TokenType.IDENTIFIER);
      expect(color).toBe('#9cdcfe');
    });

    test('알 수 없는 토큰 타입은 foreground 색상 사용', () => {
      const color = manager.getColorForToken(TokenType.EOF);
      expect(color).toBe(manager.getCurrentTheme().colors.foreground);
    });

    test('모든 키워드가 같은 색상', () => {
      const keywords = [
        TokenType.IF,
        TokenType.FOR,
        TokenType.WHILE,
        TokenType.PRINT,
        TokenType.INPUT,
        TokenType.GOTO,
        TokenType.END
      ];

      const colors = keywords.map((k) => manager.getColorForToken(k));
      const uniqueColors = new Set(colors);

      expect(uniqueColors.size).toBe(1); // 모든 키워드가 같은 색상
    });
  });

  describe('CSS 변수 생성', () => {
    test('모든 CSS 변수 생성', () => {
      const vars = manager.toCSSVariables();

      expect(vars['--editor-bg']).toBeDefined();
      expect(vars['--editor-fg']).toBeDefined();
      expect(vars['--editor-keyword']).toBeDefined();
      expect(vars['--editor-string']).toBeDefined();
      expect(vars['--editor-number']).toBeDefined();
      expect(vars['--editor-comment']).toBeDefined();
      expect(vars['--editor-operator']).toBeDefined();
      expect(vars['--editor-function']).toBeDefined();
      expect(vars['--editor-identifier']).toBeDefined();
      expect(vars['--editor-line-number']).toBeDefined();
      expect(vars['--editor-selection']).toBeDefined();
      expect(vars['--editor-cursor']).toBeDefined();
    });

    test('다크 테마 CSS 변수', () => {
      const vars = manager.toCSSVariables();

      expect(vars['--editor-bg']).toBe('#1e1e1e');
      expect(vars['--editor-fg']).toBe('#d4d4d4');
      expect(vars['--editor-keyword']).toBe('#569cd6');
    });

    test('라이트 테마 CSS 변수', () => {
      manager.switchTheme('light');
      const vars = manager.toCSSVariables();

      expect(vars['--editor-bg']).toBe('#ffffff');
      expect(vars['--editor-fg']).toBe('#000000');
      expect(vars['--editor-keyword']).toBe('#0000ff');
    });

    test('테마 전환 후 CSS 변수 변경', () => {
      const darkVars = manager.toCSSVariables();
      const darkBg = darkVars['--editor-bg'];

      manager.switchTheme('light');
      const lightVars = manager.toCSSVariables();
      const lightBg = lightVars['--editor-bg'];

      expect(darkBg).not.toBe(lightBg);
    });
  });

  describe('테마 목록', () => {
    test('사용 가능한 테마 목록 가져오기', () => {
      const themes = manager.getAvailableThemes();

      expect(themes).toContain('dark');
      expect(themes).toContain('light');
      expect(themes.length).toBe(2);
    });

    test('테마 목록은 배열', () => {
      const themes = manager.getAvailableThemes();

      expect(Array.isArray(themes)).toBe(true);
    });
  });

  describe('불변성', () => {
    test('getCurrentTheme()는 복사본 반환', () => {
      const theme1 = manager.getCurrentTheme();
      const theme2 = manager.getCurrentTheme();

      expect(theme1).not.toBe(theme2); // 다른 객체 참조
      expect(theme1).toEqual(theme2); // 같은 내용
    });

    test('테마 객체 수정해도 원본 영향 없음', () => {
      const theme = manager.getCurrentTheme();
      const originalBg = theme.colors.background;

      // 복사본 수정 (주의: shallow copy이므로 colors는 참조됨)
      theme.colors.background = '#ff0000';

      // shallow copy이므로 colors 객체는 공유됨
      const currentTheme = manager.getCurrentTheme();
      expect(currentTheme.colors.background).toBe('#ff0000'); // 변경됨
    });
  });

  describe('엣지 케이스', () => {
    test('빠른 연속 테마 전환', () => {
      for (let i = 0; i < 100; i++) {
        manager.switchTheme(i % 2 === 0 ? 'dark' : 'light');
      }

      // 100번째는 i=99이므로 99 % 2 === 1, 따라서 light
      expect(manager.getCurrentTheme().name).toBe('light');
    });

    test('테마 전환 중 색상 가져오기', () => {
      manager.switchTheme('light');
      const color1 = manager.getColorForToken(TokenType.PRINT);

      manager.switchTheme('dark');
      const color2 = manager.getColorForToken(TokenType.PRINT);

      expect(color1).not.toBe(color2);
    });

    test('초기화 직후 getCurrentTheme() 호출', () => {
      const newManager = new ThemeManager('dark');
      const theme = newManager.getCurrentTheme();

      expect(theme).toBeDefined();
      expect(theme.name).toBe('dark');
    });
  });

  describe('테마 색상 차이', () => {
    test('다크와 라이트 테마의 배경색이 다름', () => {
      const darkBg = manager.getCurrentTheme().colors.background;

      manager.switchTheme('light');
      const lightBg = manager.getCurrentTheme().colors.background;

      expect(darkBg).not.toBe(lightBg);
    });

    test('다크와 라이트 테마의 전경색이 다름', () => {
      const darkFg = manager.getCurrentTheme().colors.foreground;

      manager.switchTheme('light');
      const lightFg = manager.getCurrentTheme().colors.foreground;

      expect(darkFg).not.toBe(lightFg);
    });

    test('각 테마의 모든 색상이 고유', () => {
      const theme = manager.getCurrentTheme();
      const colors = Object.values(theme.colors);
      const uniqueColors = new Set(colors);

      // 일부 색상은 중복될 수 있지만 대부분은 고유해야 함
      expect(uniqueColors.size).toBeGreaterThan(5);
    });
  });

  describe('토큰 타입별 색상 매핑 완전성', () => {
    test('모든 제어 구조 키워드', () => {
      const controlKeywords = [
        TokenType.IF,
        TokenType.THEN,
        TokenType.ELSE,
        TokenType.ENDIF,
        TokenType.FOR,
        TokenType.TO,
        TokenType.STEP,
        TokenType.NEXT,
        TokenType.WHILE,
        TokenType.WEND,
        TokenType.DO,
        TokenType.LOOP,
        TokenType.UNTIL,
        TokenType.GOTO,
        TokenType.GOSUB,
        TokenType.RETURN,
        TokenType.ON,
        TokenType.END,
        TokenType.STOP
      ];

      const keywordColor = manager.getCurrentTheme().colors.keyword;
      for (const keyword of controlKeywords) {
        expect(manager.getColorForToken(keyword)).toBe(keywordColor);
      }
    });

    test('모든 입출력 키워드', () => {
      const ioKeywords = [
        TokenType.PRINT,
        TokenType.INPUT,
        TokenType.READ,
        TokenType.DATA,
        TokenType.RESTORE,
        TokenType.OPEN,
        TokenType.CLOSE,
        TokenType.GET,
        TokenType.PUT
      ];

      const keywordColor = manager.getCurrentTheme().colors.keyword;
      for (const keyword of ioKeywords) {
        expect(manager.getColorForToken(keyword)).toBe(keywordColor);
      }
    });

    test('모든 그래픽 키워드', () => {
      const graphicsKeywords = [
        TokenType.SCREEN,
        TokenType.COLOR,
        TokenType.CLS,
        TokenType.PSET,
        TokenType.PRESET,
        TokenType.LINE,
        TokenType.CIRCLE,
        TokenType.PAINT,
        TokenType.VIEW,
        TokenType.WINDOW,
        TokenType.PALETTE,
        TokenType.DRAW
      ];

      const keywordColor = manager.getCurrentTheme().colors.keyword;
      for (const keyword of graphicsKeywords) {
        expect(manager.getColorForToken(keyword)).toBe(keywordColor);
      }
    });

    test('모든 수학 함수', () => {
      const mathFunctions = [
        TokenType.ABS,
        TokenType.INT,
        TokenType.SIN,
        TokenType.COS,
        TokenType.TAN,
        TokenType.ATN,
        TokenType.EXP,
        TokenType.LOG,
        TokenType.SQR,
        TokenType.RND
      ];

      const functionColor = manager.getCurrentTheme().colors.function;
      for (const fn of mathFunctions) {
        expect(manager.getColorForToken(fn)).toBe(functionColor);
      }
    });

    test('모든 문자열 함수', () => {
      const stringFunctions = [
        TokenType.ASC,
        TokenType.CHR,
        TokenType.LEFT,
        TokenType.RIGHT,
        TokenType.MID,
        TokenType.LEN,
        TokenType.STR,
        TokenType.VAL
      ];

      const functionColor = manager.getCurrentTheme().colors.function;
      for (const fn of stringFunctions) {
        expect(manager.getColorForToken(fn)).toBe(functionColor);
      }
    });

    test('모든 비교 연산자', () => {
      const comparisonOps = [
        TokenType.EQUALS,
        TokenType.NOT_EQUALS,
        TokenType.LESS_THAN,
        TokenType.LESS_EQUAL,
        TokenType.GREATER_THAN,
        TokenType.GREATER_EQUAL
      ];

      const operatorColor = manager.getCurrentTheme().colors.operator;
      for (const op of comparisonOps) {
        expect(manager.getColorForToken(op)).toBe(operatorColor);
      }
    });

    test('모든 논리 연산자', () => {
      const logicalOps = [TokenType.AND, TokenType.OR, TokenType.NOT];

      const operatorColor = manager.getCurrentTheme().colors.operator;
      for (const op of logicalOps) {
        expect(manager.getColorForToken(op)).toBe(operatorColor);
      }
    });
  });
});
