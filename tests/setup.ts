/**
 * 테스트 환경 설정
 */

import { Window } from 'happy-dom';

// DOM 환경 설정
const window = new Window({
  url: 'http://localhost:3000',
  width: 375,
  height: 667
});
const document = window.document;

// window 객체의 screen을 직접 설정
Object.defineProperty(window, 'screen', {
  value: {
    width: 375,
    height: 667,
    availWidth: 375,
    availHeight: 667,
    colorDepth: 24,
    pixelDepth: 24
  },
  writable: true,
  configurable: true
});

// 전역 객체에 DOM API 설정
Object.defineProperty(globalThis, 'window', {
  value: window,
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis, 'document', {
  value: document,
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis, 'location', {
  value: window.location,
  writable: true,
  configurable: true
});

// screen 객체 mock 설정
Object.defineProperty(globalThis, 'screen', {
  value: {
    width: 375,
    height: 667,
    availWidth: 375,
    availHeight: 667,
    colorDepth: 24,
    pixelDepth: 24
  },
  writable: true,
  configurable: true
});

// 모바일 API mocks
Object.defineProperty(globalThis.navigator, 'connection', {
  value: {
    effectiveType: '3g',
    downlink: 1.5,
    rtt: 300
  },
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis.navigator, 'deviceMemory', {
  value: 4,
  writable: true,
  configurable: true
});

// 터치 이벤트 지원
Object.defineProperty(globalThis, 'ontouchstart', {
  value: null,
  writable: true,
  configurable: true
});

// localStorage mock 설정
if (typeof globalThis.localStorage === 'undefined') {
  const localStorageMock = {
    store: {} as Record<string, string>,
    getItem(key: string) {
      return this.store[key] || null;
    },
    setItem(key: string, value: string) {
      this.store[key] = value;
    },
    removeItem(key: string) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    },
    get length() {
      return Object.keys(this.store).length;
    },
    key(index: number) {
      const keys = Object.keys(this.store);
      return keys[index] || null;
    }
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
  });
}

// sessionStorage mock 설정
if (typeof globalThis.sessionStorage === 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: globalThis.localStorage, // localStorage와 동일한 mock 사용
    writable: true,
    configurable: true
  });
}

// requestAnimationFrame mock 설정
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16); // ~60fps
  };
}

// cancelAnimationFrame mock 설정
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// performance API mock 설정
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
    getEntries: () => [],
    getEntriesByName: () => [],
    getEntriesByType: () => []
  } as any;
}

console.log('🧪 테스트 환경 설정 완료 - DOM, localStorage, performance API 모킹 적용');