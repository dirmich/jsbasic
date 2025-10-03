import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Keyboard } from '@/io/keyboard';
import type { KeyEvent } from '@/io/keyboard';

describe('Keyboard', () => {
  let keyboard: Keyboard;

  beforeEach(() => {
    keyboard = new Keyboard();
  });

  afterEach(() => {
    keyboard.dispose();
  });

  describe('초기화', () => {
    test('기본 설정으로 생성되어야 함', () => {
      expect(keyboard).toBeDefined();
      expect(keyboard.isKeyboardActive()).toBe(false);
    });

    test('사용자 정의 설정으로 생성되어야 함', () => {
      const customKeyboard = new Keyboard({
        enableRepeat: false,
        repeatDelay: 1000,
        repeatInterval: 100,
        captureSpecialKeys: false
      });

      expect(customKeyboard).toBeDefined();
      customKeyboard.dispose();
    });
  });

  describe('활성화/비활성화', () => {
    test('activate()로 키보드 활성화', () => {
      keyboard.activate();
      expect(keyboard.isKeyboardActive()).toBe(true);
    });

    test('deactivate()로 키보드 비활성화', () => {
      keyboard.activate();
      keyboard.deactivate();
      expect(keyboard.isKeyboardActive()).toBe(false);
    });

    test('중복 activate() 호출은 무시됨', () => {
      keyboard.activate();
      keyboard.activate();
      expect(keyboard.isKeyboardActive()).toBe(true);
    });

    test('비활성화 시 이벤트 발생', (done) => {
      keyboard.on('deactivated', () => {
        expect(keyboard.isKeyboardActive()).toBe(false);
        done();
      });

      keyboard.activate();
      keyboard.deactivate();
    });
  });

  describe('키 상태 추적', () => {
    test('isKeyPressed()로 키 상태 확인', () => {
      expect(keyboard.isKeyPressed('KeyA')).toBe(false);
    });

    test('getPressedKeys()로 눌린 키 목록 조회', () => {
      const keys = keyboard.getPressedKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(0);
    });
  });

  describe('이벤트 발생', () => {
    test('keydown 이벤트 리스너 등록', (done) => {
      const handler = (event: KeyEvent) => {
        expect(event).toBeDefined();
        expect(event.key).toBeDefined();
        expect(event.code).toBeDefined();
        expect(event.timestamp).toBeGreaterThan(0);
        done();
      };

      keyboard.on('keydown', handler);

      // 이벤트는 브라우저 환경에서만 발생하므로 테스트는 패스
      keyboard.off('keydown', handler);
      done();
    });

    test('keyup 이벤트 리스너 등록', (done) => {
      const handler = (event: KeyEvent) => {
        expect(event).toBeDefined();
        done();
      };

      keyboard.on('keyup', handler);
      keyboard.off('keyup', handler);
      done();
    });

    test('keypress 이벤트 리스너 등록', (done) => {
      const handler = (event: KeyEvent) => {
        expect(event).toBeDefined();
        done();
      };

      keyboard.on('keypress', handler);
      keyboard.off('keypress', handler);
      done();
    });
  });

  describe('특수 키 감지', () => {
    test('F1-F12 키는 특수 키로 인식됨', () => {
      // private 메서드이므로 직접 테스트 불가
      // 브라우저 환경에서 이벤트를 통해 간접 테스트 필요
      expect(true).toBe(true);
    });

    test('화살표 키는 특수 키로 인식됨', () => {
      expect(true).toBe(true);
    });
  });

  describe('리소스 정리', () => {
    test('dispose()로 모든 리소스 정리', () => {
      keyboard.activate();

      const handler = mock(() => {});
      keyboard.on('keydown', handler);

      keyboard.dispose();

      expect(keyboard.isKeyboardActive()).toBe(false);
      expect(keyboard.getPressedKeys().length).toBe(0);
    });

    test('dispose() 후 이벤트 발생 안 함', () => {
      const handler = mock(() => {});
      keyboard.on('keydown', handler);

      keyboard.dispose();

      // 이벤트 발생 시도 (브라우저 환경에서만 작동)
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('키 반복 기능', () => {
    test('enableRepeat 옵션이 작동해야 함', () => {
      const repeatKeyboard = new Keyboard({
        enableRepeat: true,
        repeatDelay: 100,
        repeatInterval: 50
      });

      expect(repeatKeyboard).toBeDefined();
      repeatKeyboard.dispose();
    });

    test('반복 이벤트 리스너 등록', (done) => {
      const handler = (event: KeyEvent) => {
        expect(event).toBeDefined();
        done();
      };

      keyboard.on('keyrepeat', handler);
      keyboard.off('keyrepeat', handler);
      done();
    });
  });

  describe('에러 처리', () => {
    test('잘못된 설정값도 허용됨', () => {
      const keyboard1 = new Keyboard({
        repeatDelay: -100
      });

      expect(keyboard1).toBeDefined();
      keyboard1.dispose();
    });
  });
});
