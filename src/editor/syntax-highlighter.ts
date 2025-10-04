/**
 * Syntax Highlighter
 *
 * BASIC 코드 문법 하이라이팅
 */

import { Tokenizer, TokenType } from '@/basic/tokenizer';
import { ThemeManager } from './theme-manager';
import type { HighlightedCode, HighlightedLine, HighlightedToken, ThemeName } from './types';

/**
 * SyntaxHighlighter 클래스
 *
 * BASIC 코드를 토큰화하고 색상을 적용합니다
 */
export class SyntaxHighlighter {
  private readonly themeManager: ThemeManager;
  private tokenizer: Tokenizer;

  constructor(theme: ThemeName = 'dark') {
    this.themeManager = new ThemeManager(theme);
    this.tokenizer = new Tokenizer('');
  }

  /**
   * 코드 전체 하이라이팅
   */
  highlight(code: string): HighlightedCode {
    const lines = code.split('\n');
    const highlightedLines: HighlightedLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        highlightedLines.push({
          lineNumber: i + 1,
          tokens: [],
          rawText: ''
        });
        continue;
      }

      const highlightedLine = this.highlightLine(line, i + 1);
      highlightedLines.push(highlightedLine);
    }

    return {
      lines: highlightedLines,
      theme: this.themeManager.getCurrentTheme().name
    };
  }

  /**
   * 한 줄 하이라이팅
   */
  highlightLine(line: string, lineNumber: number): HighlightedLine {
    // 토크나이저 초기화
    this.tokenizer = new Tokenizer(line);

    const tokens: HighlightedToken[] = [];
    let currentIndex = 0;

    try {
      while (true) {
        const token = this.tokenizer.nextToken();

        // null 체크
        if (!token) {
          break;
        }

        // EOF 도달
        if (token.type === TokenType.EOF) {
          break;
        }

        // 토큰 색상 가져오기
        const color = this.themeManager.getColorForToken(token.type);

        // 토큰 값 문자열로 변환
        const tokenText = token.value.toString();

        // 하이라이팅된 토큰 생성
        const highlightedToken: HighlightedToken = {
          text: tokenText,
          type: token.type,
          color,
          startIndex: currentIndex,
          endIndex: currentIndex + tokenText.length
        };

        tokens.push(highlightedToken);
        currentIndex = highlightedToken.endIndex;
      }
    } catch (error) {
      // 토큰화 실패 시 원본 텍스트 반환
      console.warn('Tokenization failed:', error);
      tokens.push({
        text: line,
        type: TokenType.IDENTIFIER,
        color: this.themeManager.getCurrentTheme().colors.foreground,
        startIndex: 0,
        endIndex: line.length
      });
    }

    return {
      lineNumber,
      tokens,
      rawText: line
    };
  }

  /**
   * HTML 마크업 생성
   */
  toHTML(code: string): string {
    const highlighted = this.highlight(code);
    const lines: string[] = [];

    for (const line of highlighted.lines) {
      const lineNumber = line.lineNumber;
      const lineHTML: string[] = [];

      // 라인 번호
      lineHTML.push(`<span class="line-number">${lineNumber.toString().padStart(4, ' ')}</span>`);
      lineHTML.push('<span class="line-content">');

      // 토큰들
      for (const token of line.tokens) {
        const escapedText = this.escapeHTML(token.text);
        lineHTML.push(`<span style="color: ${token.color}">${escapedText}</span>`);
      }

      // 빈 줄 처리
      if (line.tokens.length === 0) {
        lineHTML.push('&nbsp;');
      }

      lineHTML.push('</span>');
      lines.push(`<div class="code-line">${lineHTML.join('')}</div>`);
    }

    return lines.join('\n');
  }

  /**
   * 테마 전환
   */
  setTheme(theme: ThemeName): void {
    this.themeManager.switchTheme(theme);
  }

  /**
   * 현재 테마 가져오기
   */
  getTheme(): ThemeName {
    return this.themeManager.getCurrentTheme().name;
  }

  /**
   * CSS 변수 가져오기
   */
  getCSSVariables(): Record<string, string> {
    return this.themeManager.toCSSVariables();
  }

  /**
   * HTML 이스케이프
   */
  private escapeHTML(text: string): string {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.textContent = text;
      return div.innerHTML;
    }

    // Node.js 환경
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/ /g, '&nbsp;');
  }

  /**
   * 테마 매니저 가져오기
   */
  getThemeManager(): ThemeManager {
    return this.themeManager;
  }
}
