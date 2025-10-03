/**
 * 키보드 입력 처리 모듈
 * 브라우저와 Node.js 환경 모두 지원
 */

import { EventEmitter } from '../utils/events.js';

export interface KeyboardConfig {
  enableRepeat?: boolean;
  repeatDelay?: number;
  repeatInterval?: number;
  captureSpecialKeys?: boolean;
}

export interface KeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  timestamp: number;
}

/**
 * 키보드 입력 관리 클래스
 */
export class Keyboard extends EventEmitter {
  private config: Required<KeyboardConfig>;
  private pressedKeys = new Set<string>();
  private repeatTimers = new Map<string, NodeJS.Timeout>();
  private isActive = false;

  constructor(config: KeyboardConfig = {}) {
    super();

    this.config = {
      enableRepeat: config.enableRepeat ?? true,
      repeatDelay: config.repeatDelay ?? 500,
      repeatInterval: config.repeatInterval ?? 50,
      captureSpecialKeys: config.captureSpecialKeys ?? true
    };
  }

  /**
   * 키보드 입력 활성화
   */
  public activate(): void {
    if (this.isActive) return;

    if (typeof window !== 'undefined') {
      this.attachBrowserEvents();
    }

    this.isActive = true;
    this.emit('activated');
  }

  /**
   * 키보드 입력 비활성화
   */
  public deactivate(): void {
    if (!this.isActive) return;

    if (typeof window !== 'undefined') {
      this.detachBrowserEvents();
    }

    this.clearAllRepeatTimers();
    this.pressedKeys.clear();
    this.isActive = false;
    this.emit('deactivated');
  }

  /**
   * 브라우저 이벤트 리스너 연결
   */
  private attachBrowserEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  /**
   * 브라우저 이벤트 리스너 해제
   */
  private detachBrowserEvents(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  /**
   * 키 다운 이벤트 처리
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const keyEvent = this.createKeyEvent(event);

    // 특수 키 캡처 설정에 따라 기본 동작 방지
    if (this.config.captureSpecialKeys && this.isSpecialKey(event.key)) {
      event.preventDefault();
    }

    // 이미 눌려있는 키인 경우 반복 처리
    if (this.pressedKeys.has(event.code)) {
      if (this.config.enableRepeat) {
        this.emit('keyrepeat', keyEvent);
      }
      return;
    }

    this.pressedKeys.add(event.code);
    this.emit('keydown', keyEvent);
    this.emit('keypress', keyEvent);

    // 키 반복 타이머 설정
    if (this.config.enableRepeat) {
      this.startRepeatTimer(event.code, keyEvent);
    }
  };

  /**
   * 키 업 이벤트 처리
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const keyEvent = this.createKeyEvent(event);

    this.pressedKeys.delete(event.code);
    this.clearRepeatTimer(event.code);

    this.emit('keyup', keyEvent);
  };

  /**
   * 포커스 잃을 때 처리
   */
  private handleBlur = (): void => {
    this.clearAllRepeatTimers();
    this.pressedKeys.clear();
    this.emit('blur');
  };

  /**
   * KeyEvent 객체 생성
   */
  private createKeyEvent(event: KeyboardEvent): KeyEvent {
    return {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    };
  }

  /**
   * 특수 키 판별
   */
  private isSpecialKey(key: string): boolean {
    return [
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
      'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete'
    ].includes(key);
  }

  /**
   * 키 반복 타이머 시작
   */
  private startRepeatTimer(code: string, keyEvent: KeyEvent): void {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (!this.pressedKeys.has(code)) {
          clearInterval(interval);
          return;
        }
        this.emit('keyrepeat', keyEvent);
      }, this.config.repeatInterval);

      this.repeatTimers.set(code, interval as unknown as NodeJS.Timeout);
    }, this.config.repeatDelay);

    this.repeatTimers.set(code, timer);
  }

  /**
   * 특정 키의 반복 타이머 정리
   */
  private clearRepeatTimer(code: string): void {
    const timer = this.repeatTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.repeatTimers.delete(code);
    }
  }

  /**
   * 모든 반복 타이머 정리
   */
  private clearAllRepeatTimers(): void {
    for (const timer of this.repeatTimers.values()) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.repeatTimers.clear();
  }

  /**
   * 특정 키가 눌려있는지 확인
   */
  public isKeyPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  /**
   * 현재 눌려있는 모든 키 반환
   */
  public getPressedKeys(): string[] {
    return Array.from(this.pressedKeys);
  }

  /**
   * 키보드 상태 조회
   */
  public isKeyboardActive(): boolean {
    return this.isActive;
  }

  /**
   * 정리 (리소스 해제)
   */
  public dispose(): void {
    this.deactivate();
    this.removeAllListeners();
  }
}
