/**
 * 가상 키보드 테스트
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { VirtualKeyboard } from '../../src/mobile/virtual-keyboard.js';

describe('VirtualKeyboard', () => {
  let container: HTMLElement;
  let keyboard: VirtualKeyboard;

  beforeEach(() => {
    // DOM 컨테이너 생성
    container = document.createElement('div');
    container.id = 'keyboard-container';
    document.body.appendChild(container);

    keyboard = new VirtualKeyboard(container, {
      layout: 'default',
      theme: 'dark',
      hapticFeedback: false,
      soundFeedback: false
    });
  });

  test('should initialize with default layout', () => {
    expect(keyboard.getCurrentLayout()).toBe('default');
  });

  test('should be hidden by default', () => {
    expect(keyboard.getIsVisible()).toBe(false);
  });

  test('should show and hide keyboard', () => {
    keyboard.show();
    expect(keyboard.getIsVisible()).toBe(true);

    keyboard.hide();
    expect(keyboard.getIsVisible()).toBe(false);
  });

  test('should toggle visibility', () => {
    const initialState = keyboard.getIsVisible();
    keyboard.toggle();
    expect(keyboard.getIsVisible()).toBe(!initialState);

    keyboard.toggle();
    expect(keyboard.getIsVisible()).toBe(initialState);
  });

  test('should change layout', () => {
    keyboard.setLayout('basic');
    expect(keyboard.getCurrentLayout()).toBe('basic');

    keyboard.setLayout('numeric');
    expect(keyboard.getCurrentLayout()).toBe('numeric');

    keyboard.setLayout('symbols');
    expect(keyboard.getCurrentLayout()).toBe('symbols');
  });

  test('should emit keypress event', (done) => {
    keyboard.show();

    keyboard.on('keypress', (key) => {
      expect(typeof key).toBe('string');
      done();
    });

    // 키 버튼 찾기
    const keyButton = container.querySelector('.keyboard-key') as HTMLButtonElement;
    if (keyButton) {
      keyButton.dispatchEvent(new MouseEvent('mousedown'));
    }
  });

  test('should emit layoutchange event', (done) => {
    keyboard.on('layoutchange', (layout) => {
      expect(layout).toBe('basic');
      done();
    });

    keyboard.setLayout('basic');
  });

  test('should render keyboard element', () => {
    keyboard.show();
    const keyboardElement = container.querySelector('.virtual-keyboard');
    expect(keyboardElement).not.toBeNull();
  });

  test('should render keyboard rows', () => {
    keyboard.show();
    const rows = container.querySelectorAll('.keyboard-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should render keyboard keys', () => {
    keyboard.show();
    const keys = container.querySelectorAll('.keyboard-key');
    expect(keys.length).toBeGreaterThan(0);
  });

  test('should have minimum touch target size', () => {
    keyboard.show();
    const keys = container.querySelectorAll('.keyboard-key') as NodeListOf<HTMLElement>;

    keys.forEach(key => {
      const height = parseInt(getComputedStyle(key).minHeight);
      expect(height).toBeGreaterThanOrEqual(44); // 최소 44px
    });
  });

  test('should support BASIC keywords layout', () => {
    keyboard.setLayout('basic');

    const keyboardElement = container.querySelector('.virtual-keyboard');
    const textContent = keyboardElement?.textContent || '';

    // BASIC 키워드 확인
    expect(textContent).toContain('PRINT');
    expect(textContent).toContain('INPUT');
    expect(textContent).toContain('FOR');
    expect(textContent).toContain('NEXT');
  });

  test('should support numeric layout', () => {
    keyboard.setLayout('numeric');

    const keyboardElement = container.querySelector('.virtual-keyboard');
    const textContent = keyboardElement?.textContent || '';

    // 숫자 및 연산자 확인
    expect(textContent).toContain('0');
    expect(textContent).toContain('9');
    expect(textContent).toContain('+');
    expect(textContent).toContain('-');
  });

  test('should clean up on destroy', () => {
    keyboard.show();
    keyboard.destroy();

    const keyboardElement = container.querySelector('.virtual-keyboard');
    expect(keyboardElement).toBeNull();
  });

  test('should update config', () => {
    keyboard.updateConfig({
      theme: 'light',
      hapticFeedback: true
    });

    // 설정이 업데이트되었는지 확인
    keyboard.show();
    const keyboardElement = container.querySelector('.virtual-keyboard');
    expect(keyboardElement?.classList.contains('theme-light')).toBe(true);
  });

  test('should handle backspace key', (done) => {
    keyboard.show();

    keyboard.on('keypress', (key) => {
      if (key === '\b') {
        expect(key).toBe('\b');
        done();
      }
    });

    // Backspace 버튼 찾기
    const buttons = Array.from(container.querySelectorAll('.keyboard-key')) as HTMLButtonElement[];
    const backspaceButton = buttons.find(btn => btn.textContent === '⌫');

    if (backspaceButton) {
      backspaceButton.dispatchEvent(new MouseEvent('mousedown'));
    }
  });

  test('should handle enter key', (done) => {
    keyboard.show();

    keyboard.on('keypress', (key) => {
      if (key === '\n') {
        expect(key).toBe('\n');
        done();
      }
    });

    // Enter 버튼 찾기
    const buttons = Array.from(container.querySelectorAll('.keyboard-key')) as HTMLButtonElement[];
    const enterButton = buttons.find(btn => btn.textContent === '↵');

    if (enterButton) {
      enterButton.dispatchEvent(new MouseEvent('mousedown'));
    }
  });
});
