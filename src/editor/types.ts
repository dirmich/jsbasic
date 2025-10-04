/**
 * Editor Type Definitions
 *
 * 에디터 관련 타입 정의
 */

import { TokenType } from '@/basic/tokenizer';

/**
 * 테마 타입
 */
export type ThemeName = 'dark' | 'light';

/**
 * 색상 정의
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  keyword: string;
  string: string;
  number: string;
  comment: string;
  operator: string;
  function: string;
  identifier: string;
  lineNumber: string;
  selection: string;
  cursor: string;
}

/**
 * 테마 정의
 */
export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
}

/**
 * 하이라이팅된 토큰
 */
export interface HighlightedToken {
  text: string;
  type: TokenType;
  color: string;
  startIndex: number;
  endIndex: number;
}

/**
 * 하이라이팅된 라인
 */
export interface HighlightedLine {
  lineNumber: number;
  tokens: HighlightedToken[];
  rawText: string;
}

/**
 * 하이라이팅된 코드
 */
export interface HighlightedCode {
  lines: HighlightedLine[];
  theme: ThemeName;
}

/**
 * 에디터 설정
 */
export interface EditorConfig {
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
  autoIndent: boolean;
  syntaxHighlighting: boolean;
}
