/**
 * 가상 키보드 컴포넌트
 * BASIC 프로그래밍에 최적화된 모바일 키보드
 */

import { EventEmitter } from '../utils/events.js';

/**
 * 키보드 레이아웃 타입
 */
export type KeyboardLayout = 'default' | 'basic' | 'numeric' | 'symbols';

/**
 * 키 정의
 */
export interface KeyDefinition {
  key: string;
  label: string;
  width?: number; // 1 = 기본 크기, 2 = 2배 크기
  action?: 'backspace' | 'enter' | 'shift' | 'layout';
  layoutTarget?: KeyboardLayout;
}

/**
 * 키보드 설정
 */
export interface VirtualKeyboardConfig {
  layout: KeyboardLayout;
  theme: 'light' | 'dark';
  hapticFeedback: boolean;
  soundFeedback: boolean;
  keyHeight: number; // px
  keySpacing: number; // px
}

/**
 * 가상 키보드 이벤트
 */
interface VirtualKeyboardEvents extends Record<string, (...args: any[]) => void> {
  keypress: (key: string) => void;
  layoutchange: (layout: KeyboardLayout) => void;
  show: () => void;
  hide: () => void;
}

/**
 * 가상 키보드 클래스
 */
export class VirtualKeyboard extends EventEmitter<VirtualKeyboardEvents> {
  private container: HTMLElement;
  private keyboardElement: HTMLElement | null = null;
  private config: VirtualKeyboardConfig;
  private currentLayout: KeyboardLayout;
  private isShiftActive = false;
  private isVisible = false;

  // 레이아웃 정의
  private layouts: Record<KeyboardLayout, KeyDefinition[][]> = {
    default: [
      [
        { key: '1', label: '1' },
        { key: '2', label: '2' },
        { key: '3', label: '3' },
        { key: '4', label: '4' },
        { key: '5', label: '5' },
        { key: '6', label: '6' },
        { key: '7', label: '7' },
        { key: '8', label: '8' },
        { key: '9', label: '9' },
        { key: '0', label: '0' }
      ],
      [
        { key: 'Q', label: 'Q' },
        { key: 'W', label: 'W' },
        { key: 'E', label: 'E' },
        { key: 'R', label: 'R' },
        { key: 'T', label: 'T' },
        { key: 'Y', label: 'Y' },
        { key: 'U', label: 'U' },
        { key: 'I', label: 'I' },
        { key: 'O', label: 'O' },
        { key: 'P', label: 'P' }
      ],
      [
        { key: 'A', label: 'A' },
        { key: 'S', label: 'S' },
        { key: 'D', label: 'D' },
        { key: 'F', label: 'F' },
        { key: 'G', label: 'G' },
        { key: 'H', label: 'H' },
        { key: 'J', label: 'J' },
        { key: 'K', label: 'K' },
        { key: 'L', label: 'L' },
        { key: 'Backspace', label: '⌫', width: 1.5, action: 'backspace' }
      ],
      [
        { key: 'Z', label: 'Z' },
        { key: 'X', label: 'X' },
        { key: 'C', label: 'C' },
        { key: 'V', label: 'V' },
        { key: 'B', label: 'B' },
        { key: 'N', label: 'N' },
        { key: 'M', label: 'M' },
        { key: ' ', label: 'Space', width: 2 },
        { key: 'Enter', label: '↵', width: 1.5, action: 'enter' }
      ],
      [
        { key: 'BASIC', label: 'BASIC', width: 1.5, action: 'layout', layoutTarget: 'basic' },
        { key: '123', label: '123', width: 1.5, action: 'layout', layoutTarget: 'numeric' },
        { key: '#+=', label: '#+=', width: 1.5, action: 'layout', layoutTarget: 'symbols' },
        { key: ',', label: ',' },
        { key: ':', label: ':' },
        { key: ';', label: ';' },
        { key: '"', label: '"' }
      ]
    ],
    basic: [
      [
        { key: 'PRINT ', label: 'PRINT' },
        { key: 'INPUT ', label: 'INPUT' },
        { key: 'LET ', label: 'LET' },
        { key: 'GOTO ', label: 'GOTO' }
      ],
      [
        { key: 'IF ', label: 'IF' },
        { key: 'THEN ', label: 'THEN' },
        { key: 'ELSE ', label: 'ELSE' },
        { key: 'END', label: 'END' }
      ],
      [
        { key: 'FOR ', label: 'FOR' },
        { key: 'TO ', label: 'TO' },
        { key: 'STEP ', label: 'STEP' },
        { key: 'NEXT ', label: 'NEXT' }
      ],
      [
        { key: 'WHILE ', label: 'WHILE' },
        { key: 'WEND', label: 'WEND' },
        { key: 'DIM ', label: 'DIM' },
        { key: 'REM ', label: 'REM' }
      ],
      [
        { key: 'GOSUB ', label: 'GOSUB' },
        { key: 'RETURN', label: 'RETURN' },
        { key: 'DATA ', label: 'DATA' },
        { key: 'READ ', label: 'READ' }
      ],
      [
        { key: 'ABC', label: 'ABC', width: 2, action: 'layout', layoutTarget: 'default' },
        { key: 'Backspace', label: '⌫', width: 1.5, action: 'backspace' },
        { key: 'Enter', label: '↵', width: 1.5, action: 'enter' }
      ]
    ],
    numeric: [
      [
        { key: '7', label: '7' },
        { key: '8', label: '8' },
        { key: '9', label: '9' },
        { key: '+', label: '+' },
        { key: '-', label: '-' }
      ],
      [
        { key: '4', label: '4' },
        { key: '5', label: '5' },
        { key: '6', label: '6' },
        { key: '*', label: '*' },
        { key: '/', label: '/' }
      ],
      [
        { key: '1', label: '1' },
        { key: '2', label: '2' },
        { key: '3', label: '3' },
        { key: '(', label: '(' },
        { key: ')', label: ')' }
      ],
      [
        { key: '0', label: '0', width: 2 },
        { key: '.', label: '.' },
        { key: '=', label: '=' },
        { key: ',', label: ',' }
      ],
      [
        { key: 'ABC', label: 'ABC', width: 2, action: 'layout', layoutTarget: 'default' },
        { key: 'Backspace', label: '⌫', width: 1.5, action: 'backspace' },
        { key: 'Enter', label: '↵', width: 1.5, action: 'enter' }
      ]
    ],
    symbols: [
      [
        { key: '!', label: '!' },
        { key: '@', label: '@' },
        { key: '#', label: '#' },
        { key: '$', label: '$' },
        { key: '%', label: '%' },
        { key: '^', label: '^' },
        { key: '&', label: '&' }
      ],
      [
        { key: '<', label: '<' },
        { key: '>', label: '>' },
        { key: '=', label: '=' },
        { key: '[', label: '[' },
        { key: ']', label: ']' },
        { key: '{', label: '{' },
        { key: '}', label: '}' }
      ],
      [
        { key: '|', label: '|' },
        { key: '\\', label: '\\' },
        { key: '/', label: '/' },
        { key: '?', label: '?' },
        { key: '~', label: '~' },
        { key: '`', label: '`' },
        { key: '_', label: '_' }
      ],
      [
        { key: 'ABC', label: 'ABC', width: 2, action: 'layout', layoutTarget: 'default' },
        { key: 'Backspace', label: '⌫', width: 1.5, action: 'backspace' },
        { key: 'Enter', label: '↵', width: 1.5, action: 'enter' }
      ]
    ]
  };

  constructor(container: HTMLElement, config?: Partial<VirtualKeyboardConfig>) {
    super();

    this.container = container;
    this.config = {
      layout: 'default',
      theme: 'dark',
      hapticFeedback: true,
      soundFeedback: false,
      keyHeight: 44,
      keySpacing: 4,
      ...config
    };

    this.currentLayout = this.config.layout;
    this.render();
  }

  /**
   * 키보드 렌더링
   */
  private render(): void {
    // 기존 키보드 제거
    if (this.keyboardElement) {
      this.keyboardElement.remove();
    }

    // 키보드 컨테이너 생성
    this.keyboardElement = document.createElement('div');
    this.keyboardElement.className = `virtual-keyboard theme-${this.config.theme}`;
    this.keyboardElement.setAttribute('role', 'toolbar');
    this.keyboardElement.setAttribute('aria-label', 'Virtual Keyboard');

    if (!this.isVisible) {
      this.keyboardElement.style.display = 'none';
    }

    // 현재 레이아웃의 키들 렌더링
    const layout = this.layouts[this.currentLayout];
    if (!layout) return;

    layout.forEach(row => {
      const rowElement = document.createElement('div');
      rowElement.className = 'keyboard-row';

      row.forEach(keyDef => {
        const keyElement = this.createKeyElement(keyDef);
        rowElement.appendChild(keyElement);
      });

      if (this.keyboardElement) {
        this.keyboardElement.appendChild(rowElement);
      }
    });

    if (this.keyboardElement) {
      this.container.appendChild(this.keyboardElement);
    }
  }

  /**
   * 키 엘리먼트 생성
   */
  private createKeyElement(keyDef: KeyDefinition): HTMLElement {
    const button = document.createElement('button');
    button.className = 'keyboard-key';
    button.textContent = keyDef.label;
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', keyDef.label);

    // 키 너비 설정
    if (keyDef.width) {
      button.style.flex = `${keyDef.width}`;
    }

    // 최소 터치 타깃 크기 보장 (44x44px)
    button.style.minHeight = `${this.config.keyHeight}px`;

    // 터치 이벤트 핸들러
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleKeyPress(keyDef);
      button.classList.add('active');
    }, { passive: false });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      button.classList.remove('active');
    }, { passive: false });

    button.addEventListener('touchcancel', () => {
      button.classList.remove('active');
    });

    // 마우스 이벤트 (데스크톱 테스트용)
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.handleKeyPress(keyDef);
      button.classList.add('active');
    });

    button.addEventListener('mouseup', () => {
      button.classList.remove('active');
    });

    return button;
  }

  /**
   * 키 입력 처리
   */
  private handleKeyPress(keyDef: KeyDefinition): void {
    // 햅틱 피드백
    if (this.config.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // 특수 키 처리
    if (keyDef.action) {
      switch (keyDef.action) {
        case 'backspace':
          this.emit('keypress', '\b');
          break;

        case 'enter':
          this.emit('keypress', '\n');
          break;

        case 'shift':
          this.isShiftActive = !this.isShiftActive;
          break;

        case 'layout':
          if (keyDef.layoutTarget) {
            this.setLayout(keyDef.layoutTarget);
          }
          break;
      }
    } else {
      // 일반 키 입력
      const key = this.isShiftActive ? keyDef.key.toUpperCase() : keyDef.key;
      this.emit('keypress', key);

      // Shift는 한 번만 적용
      if (this.isShiftActive) {
        this.isShiftActive = false;
      }
    }
  }

  /**
   * 레이아웃 변경
   */
  setLayout(layout: KeyboardLayout): void {
    if (this.currentLayout === layout) return;

    this.currentLayout = layout;
    this.render();
    this.emit('layoutchange', layout);
  }

  /**
   * 키보드 표시
   */
  show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    if (this.keyboardElement) {
      this.keyboardElement.style.display = 'flex';
      this.keyboardElement.style.flexDirection = 'column';
    }
    this.emit('show');
  }

  /**
   * 키보드 숨김
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    if (this.keyboardElement) {
      this.keyboardElement.style.display = 'none';
    }
    this.emit('hide');
  }

  /**
   * 키보드 토글
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 커스텀 키 추가
   */
  addCustomKey(layoutName: KeyboardLayout, rowIndex: number, keyDef: KeyDefinition): void {
    const layout = this.layouts[layoutName];
    if (!layout || !layout[rowIndex]) return;

    layout[rowIndex]!.push(keyDef);

    if (this.currentLayout === layoutName) {
      this.render();
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<VirtualKeyboardConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.layout && config.layout !== this.currentLayout) {
      this.setLayout(config.layout);
    } else {
      this.render();
    }
  }

  /**
   * 현재 레이아웃 가져오기
   */
  getCurrentLayout(): KeyboardLayout {
    return this.currentLayout;
  }

  /**
   * 표시 상태 확인
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * 정리
   */
  destroy(): void {
    if (this.keyboardElement) {
      this.keyboardElement.remove();
      this.keyboardElement = null;
    }
    this.removeAllListeners();
  }
}
