/**
 * 테스트 환경 설정
 * 브라우저 API 모킹 및 전역 설정
 */

// Jest 또는 Bun 테스트 환경용 모킹 헬퍼
declare global {
  const jest: any;
}

// jest가 없는 경우 (Bun 테스트 환경) 대체 모킹 함수 제공
const createMockFn = (defaultImpl?: Function) => {
  if (typeof jest !== 'undefined') {
    return jest.fn(defaultImpl);
  }
  // Bun 테스트를 위한 간단한 모킹 함수
  const fn: any = defaultImpl || (() => {});
  fn.mock = { calls: [] };
  fn.mockImplementation = (impl: Function) => Object.assign(fn, impl);
  fn.mockReturnValue = (value: any) => Object.assign(fn, () => value);
  fn.mockReturnValueOnce = (value: any) => {
    const original = fn.bind({});
    Object.assign(fn, () => {
      Object.assign(fn, original);
      return value;
    });
  };
  return fn;
};

// DOM 및 브라우저 API 모킹
global.window = {
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout,
  requestAnimationFrame: (callback: FrameRequestCallback) => {
    return global.setTimeout(callback, 16);
  },
  cancelAnimationFrame: (id: number) => {
    global.clearTimeout(id);
  },
  addEventListener: createMockFn(),
  removeEventListener: createMockFn(),
  dispatchEvent: createMockFn((event: any) => {
    // 이벤트 핸들러 시뮬레이션
    if (event.type === 'resize' && (global.window as any).__resizeHandlers) {
      (global.window as any).__resizeHandlers.forEach((handler: Function) => handler(event));
    }
    return true;
  }),
  innerWidth: 1024,
  innerHeight: 768,
  screen: {
    width: 1024,
    height: 768,
    orientation: {
      addEventListener: createMockFn()
    }
  },
  localStorage: {
    data: {} as Record<string, string>,
    getItem(key: string) { return this.data[key] || null; },
    setItem(key: string, value: string) { this.data[key] = value; },
    removeItem(key: string) { delete this.data[key]; },
    clear() { this.data = {}; },
    get length() { return Object.keys(this.data).length; },
    key(index: number) { return Object.keys(this.data)[index] || null; }
  },
  confirm: createMockFn(() => true),
  performance: {
    now: createMockFn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 20,
      totalJSHeapSize: 1024 * 1024 * 50,
      jsHeapSizeLimit: 1024 * 1024 * 100
    }
  },
  indexedDB: {},
  navigator: {
    userAgent: 'Mozilla/5.0 (Node.js Test Environment)',
    platform: 'NodeJS'
  }
} as any;

global.document = {
  createElement: createMockFn((tagName: string) => {
    if (tagName === 'canvas') {
      return {
        getContext: createMockFn(() => ({ /* WebGL 컨텍스트 모킹 */ }))
      };
    }
    if (tagName === 'script') {
      return { noModule: true };
    }
    if (tagName === 'style') {
      return {
        textContent: '',
        id: ''
      };
    }
    return {};
  }),
  querySelectorAll: createMockFn(() => []),
  getElementById: createMockFn(() => null),
  body: {
    classList: {
      add: createMockFn(),
      remove: createMockFn(),
      contains: createMockFn(() => false),
      toggle: createMockFn()
    },
    className: ''
  },
  head: {
    appendChild: createMockFn()
  }
} as any;

global.navigator = {
  userAgent: 'Mozilla/5.0 (Node.js Test Environment)',
  platform: 'NodeJS',
  serviceWorker: undefined
} as any;

// localStorage를 전역으로도 설정
global.localStorage = (global.window as any).localStorage;

global.WebAssembly = {} as any;
global.Worker = class MockWorker {} as any;
global.AudioContext = class MockAudioContext {} as any;

// Jest 타이머 헬퍼 함수들
if (typeof jest !== 'undefined') {
  // Bun의 jest 구현에 없는 함수들을 추가
  if (!jest.advanceTimersByTime) {
    (jest as any).advanceTimersByTime = (ms: number) => {
      // 간단한 구현 - 실제로는 타이머를 진행시키지 않고 모킹만
      console.log(`Timer advanced by ${ms}ms`);
    };
  }
}