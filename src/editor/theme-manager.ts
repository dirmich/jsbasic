/**
 * Theme Manager
 *
 * 에디터 테마 관리
 */

import type { Theme, ThemeName, ThemeColors } from './types';
import { TokenType } from '@/basic/tokenizer';

/**
 * 다크 테마 색상
 */
const DARK_THEME: ThemeColors = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  keyword: '#569cd6',      // 파란색 (IF, FOR, PRINT, etc.)
  string: '#ce9178',       // 주황색-갈색 (문자열)
  number: '#b5cea8',       // 연두색 (숫자)
  comment: '#6a9955',      // 녹색 (주석)
  operator: '#d4d4d4',     // 회색 (연산자)
  function: '#dcdcaa',     // 노란색 (함수명)
  identifier: '#9cdcfe',   // 밝은 파란색 (변수명)
  lineNumber: '#858585',   // 회색 (줄번호)
  selection: '#264f78',    // 어두운 파란색 (선택 영역)
  cursor: '#aeafad'        // 밝은 회색 (커서)
};

/**
 * 라이트 테마 색상
 */
const LIGHT_THEME: ThemeColors = {
  background: '#ffffff',
  foreground: '#000000',
  keyword: '#0000ff',      // 파란색 (IF, FOR, PRINT, etc.)
  string: '#a31515',       // 빨간색 (문자열)
  number: '#098658',       // 녹색 (숫자)
  comment: '#008000',      // 녹색 (주석)
  operator: '#000000',     // 검정색 (연산자)
  function: '#795e26',     // 갈색 (함수명)
  identifier: '#001080',   // 어두운 파란색 (변수명)
  lineNumber: '#237893',   // 파란색 (줄번호)
  selection: '#add6ff',    // 밝은 파란색 (선택 영역)
  cursor: '#000000'        // 검정색 (커서)
};

/**
 * ThemeManager 클래스
 *
 * 에디터 테마 관리 및 토큰 색상 매핑
 */
export class ThemeManager {
  private currentTheme: Theme;
  private readonly themes: Map<ThemeName, Theme>;

  constructor(initialTheme: ThemeName = 'dark') {
    // 테마 등록
    this.themes = new Map();
    this.themes.set('dark', { name: 'dark', colors: DARK_THEME });
    this.themes.set('light', { name: 'light', colors: LIGHT_THEME });

    // 초기 테마 설정
    const theme = this.themes.get(initialTheme);
    if (!theme) {
      throw new Error(`Theme not found: ${initialTheme}`);
    }
    this.currentTheme = theme;
  }

  /**
   * 현재 테마 가져오기
   */
  getCurrentTheme(): Theme {
    return { ...this.currentTheme };
  }

  /**
   * 테마 전환
   */
  switchTheme(themeName: ThemeName): void {
    const theme = this.themes.get(themeName);
    if (!theme) {
      throw new Error(`Theme not found: ${themeName}`);
    }
    this.currentTheme = theme;
  }

  /**
   * 토큰 타입별 색상 가져오기
   */
  getColorForToken(tokenType: TokenType): string {
    const colors = this.currentTheme.colors;

    switch (tokenType) {
      // 키워드
      case TokenType.IF:
      case TokenType.THEN:
      case TokenType.ELSE:
      case TokenType.ENDIF:
      case TokenType.FOR:
      case TokenType.TO:
      case TokenType.STEP:
      case TokenType.NEXT:
      case TokenType.WHILE:
      case TokenType.WEND:
      case TokenType.DO:
      case TokenType.LOOP:
      case TokenType.UNTIL:
      case TokenType.GOTO:
      case TokenType.GOSUB:
      case TokenType.RETURN:
      case TokenType.ON:
      case TokenType.END:
      case TokenType.STOP:
      case TokenType.PRINT:
      case TokenType.INPUT:
      case TokenType.LET:
      case TokenType.DIM:
      case TokenType.READ:
      case TokenType.DATA:
      case TokenType.RESTORE:
      case TokenType.DEF:
      case TokenType.FN:
      case TokenType.SCREEN:
      case TokenType.COLOR:
      case TokenType.CLS:
      case TokenType.PSET:
      case TokenType.PRESET:
      case TokenType.LINE:
      case TokenType.CIRCLE:
      case TokenType.PAINT:
      case TokenType.GET:
      case TokenType.PUT:
      case TokenType.SOUND:
      case TokenType.PLAY:
      case TokenType.VIEW:
      case TokenType.WINDOW:
      case TokenType.PALETTE:
      case TokenType.DRAW:
      case TokenType.OPEN:
      case TokenType.CLOSE:
      case TokenType.RUN:
      case TokenType.NEW:
      case TokenType.LIST:
      case TokenType.SAVE:
      case TokenType.LOAD:
      case TokenType.CLEAR:
        return colors.keyword;

      // 문자열
      case TokenType.STRING:
        return colors.string;

      // 숫자
      case TokenType.NUMBER:
        return colors.number;

      // 주석
      case TokenType.REM:
        return colors.comment;

      // 연산자
      case TokenType.PLUS:
      case TokenType.MINUS:
      case TokenType.MULTIPLY:
      case TokenType.DIVIDE:
      case TokenType.POWER:
      case TokenType.MOD:
      case TokenType.EQUALS:
      case TokenType.NOT_EQUALS:
      case TokenType.LESS_THAN:
      case TokenType.LESS_EQUAL:
      case TokenType.GREATER_THAN:
      case TokenType.GREATER_EQUAL:
      case TokenType.AND:
      case TokenType.OR:
      case TokenType.NOT:
        return colors.operator;

      // 함수
      case TokenType.ABS:
      case TokenType.INT:
      case TokenType.RND:
      case TokenType.SIN:
      case TokenType.COS:
      case TokenType.TAN:
      case TokenType.ATN:
      case TokenType.EXP:
      case TokenType.LOG:
      case TokenType.SQR:
      case TokenType.ASC:
      case TokenType.CHR:
      case TokenType.LEFT:
      case TokenType.RIGHT:
      case TokenType.MID:
      case TokenType.LEN:
      case TokenType.STR:
      case TokenType.VAL:
      case TokenType.POINT:
        return colors.function;

      // 식별자
      case TokenType.IDENTIFIER:
        return colors.identifier;

      // 기본값
      default:
        return colors.foreground;
    }
  }

  /**
   * CSS 변수 생성
   */
  toCSSVariables(): Record<string, string> {
    const colors = this.currentTheme.colors;
    return {
      '--editor-bg': colors.background,
      '--editor-fg': colors.foreground,
      '--editor-keyword': colors.keyword,
      '--editor-string': colors.string,
      '--editor-number': colors.number,
      '--editor-comment': colors.comment,
      '--editor-operator': colors.operator,
      '--editor-function': colors.function,
      '--editor-identifier': colors.identifier,
      '--editor-line-number': colors.lineNumber,
      '--editor-selection': colors.selection,
      '--editor-cursor': colors.cursor
    };
  }

  /**
   * 테마 목록 가져오기
   */
  getAvailableThemes(): ThemeName[] {
    return Array.from(this.themes.keys());
  }
}
