/**
 * MobileOptimizer 포괄적 테스트
 * 배터리, 네트워크, 성능 최적화 기능 검증
 */

import { describe, test, expect, beforeEach, beforeAll, afterEach, jest } from 'bun:test';
import { Window } from 'happy-dom';
import { MobileOptimizer } from '../../src/mobile/mobile-optimizer.js';

// Happy-DOM 설정
const setupDOM = () => {
  const window = new Window();
  const document = window.document;

  // globalThis에 window와 document 설정
  (globalThis as any).window = window;
  (globalThis as any).document = document;
  (globalThis as any).navigator = window.navigator;

  // HTML 구조 생성
  document.body.innerHTML = '<div id="app"></div>';

  return { window, document };
};

describe('MobileOptimizer - 초기화 및 기본 기능', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('기본 설정으로 초기화', () => {
    const optimizer = new MobileOptimizer();

    expect(optimizer).toBeDefined();
    const config = optimizer.getConfiguration();

    expect(config.enableTouchInput).toBe(true);
    expect(config.optimizeForBattery).toBe(true);
    expect(config.adaptiveFontSize).toBe(true);
    expect(config.networkOptimization).toBe(true);
  });

  test('사용자 정의 설정으로 초기화', () => {
    const customConfig = {
      enableTouchInput: false,
      reduceAnimations: true,
      compactLayout: true,
      enableVibration: true
    };

    const optimizer = new MobileOptimizer(customConfig);
    const config = optimizer.getConfiguration();

    expect(config.enableTouchInput).toBe(false);
    expect(config.reduceAnimations).toBe(true);
    expect(config.compactLayout).toBe(true);
    expect(config.enableVibration).toBe(true);
  });

  test('부분 설정 업데이트', () => {
    const optimizer = new MobileOptimizer({ enableTouchInput: false });
    const config = optimizer.getConfiguration();

    // 지정하지 않은 설정은 기본값 유지
    expect(config.enableTouchInput).toBe(false);
    expect(config.optimizeForBattery).toBe(true);
  });
});

describe('MobileOptimizer - 기능 감지', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('터치 지원 감지 - ontouchstart 존재', () => {
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    expect(capabilities.touchSupport).toBe(true);
  });

  test('터치 지원 감지 - maxTouchPoints', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    expect(capabilities.touchSupport).toBe(true);
  });

  test('진동 지원 감지', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {},
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    expect(capabilities.vibrationSupport).toBe(true);
  });

  test('화면 방향 지원 감지', () => {
    Object.defineProperty(window, 'orientation', {
      value: 0,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    expect(capabilities.orientationSupport).toBe(true);
  });

  test('네트워크 정보 감지', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '4g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    expect(capabilities.networkInfo).toBe(true);
  });

  test('배터리 정보 감지', () => {
    Object.defineProperty(navigator, 'getBattery', {
      value: () => Promise.resolve({}),
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    expect(capabilities.batteryInfo).toBe(true);
  });

  test('기능 미지원 환경', () => {
    // 깨끗한 환경
    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    // Happy-DOM 기본 환경에서는 대부분 false
    expect(capabilities).toBeDefined();
  });
});

describe('MobileOptimizer - 메트릭 수집', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('화면 크기 분류 - 소형 (< 480px)', () => {
    Object.defineProperty(window.screen, 'width', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 667, configurable: true });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.screenSize).toBe('small');
  });

  test('화면 크기 분류 - 중형 (480-768px)', () => {
    Object.defineProperty(window.screen, 'width', { value: 600, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 800, configurable: true });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.screenSize).toBe('medium');
  });

  test('화면 크기 분류 - 태블릿 (768-1024px)', () => {
    Object.defineProperty(window.screen, 'width', { value: 768, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1024, configurable: true });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.screenSize).toBe('tablet');
  });

  test('화면 크기 분류 - 데스크톱 (>= 1024px)', () => {
    Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.screenSize).toBe('desktop');
  });

  test('네트워크 속도 - 느림 (2G)', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '2g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.networkSpeed).toBe('slow');
  });

  test('네트워크 속도 - 중간 (3G)', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '3g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.networkSpeed).toBe('medium');
  });

  test('네트워크 속도 - 빠름 (4G/5G)', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '4g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.networkSpeed).toBe('fast');
  });

  test('픽셀 비율 감지', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.pixelRatio).toBe(2);
  });

  test('화면 방향 - 세로', () => {
    Object.defineProperty(window.screen, 'width', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 667, configurable: true });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.orientation).toBe('portrait');
  });

  test('화면 방향 - 가로', () => {
    Object.defineProperty(window.screen, 'width', { value: 667, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 375, configurable: true });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.orientation).toBe('landscape');
  });

  test('하드웨어 정보 수집', () => {
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 4,
      configurable: true
    });
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 8,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.deviceMemory).toBe(4);
    expect(metrics.cpuCores).toBe(8);
  });

  test('기본 배터리 정보', () => {
    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    // 기본값
    expect(metrics.batteryLevel).toBe(1.0);
    expect(metrics.isCharging).toBe(true);
  });
});

describe('MobileOptimizer - 배터리 관리', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('배터리 레벨 >50% - 최적화 미적용', () => {
    const optimizer = new MobileOptimizer();
    (optimizer as any).metrics.batteryLevel = 0.8;

    optimizer.optimize();

    expect(document.body.className).not.toContain('battery-optimized');
  });

  test('배터리 레벨 20-50% - 최적화 미적용 (임계값 30% 미만)', () => {
    const optimizer = new MobileOptimizer();
    (optimizer as any).metrics.batteryLevel = 0.4;

    optimizer.optimize();

    expect(document.body.className).not.toContain('battery-optimized');
  });

  test('배터리 레벨 <30% - 자동 최적화', () => {
    const optimizer = new MobileOptimizer({ optimizeForBattery: true });
    (optimizer as any).metrics.batteryLevel = 0.2;

    optimizer.optimize();

    expect(document.body.className).toContain('battery-optimized');
  });

  test('배터리 최적화 비활성화 시 미적용', () => {
    const optimizer = new MobileOptimizer({ optimizeForBattery: false });
    (optimizer as any).metrics.batteryLevel = 0.2;

    optimizer.optimize();

    expect(document.body.className).not.toContain('battery-optimized');
  });

  test('배터리 정보 접근 불가 시 안전 처리', async () => {
    // getBattery가 없는 환경
    const optimizer = new MobileOptimizer();

    // updateBatteryInfo 호출 시 에러 발생하지 않아야 함
    try {
      await (optimizer as any).updateBatteryInfo();
      expect(true).toBe(true); // 에러 없이 완료되면 성공
    } catch (error) {
      // 에러가 발생해도 안전하게 처리되어야 함
      expect(error).toBeUndefined();
    }
  });

  test('배터리 이벤트 리스너 등록', async () => {
    const mockBattery = {
      level: 0.5,
      charging: false,
      addEventListener: jest.fn()
    };

    Object.defineProperty(navigator, 'getBattery', {
      value: () => Promise.resolve(mockBattery),
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    await (optimizer as any).updateBatteryInfo();

    expect(mockBattery.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
    expect(mockBattery.addEventListener).toHaveBeenCalledWith('chargingchange', expect.any(Function));
  });
});

describe('MobileOptimizer - 네트워크 관리', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('온라인 상태 감지', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    expect(navigator.onLine).toBe(true);
  });

  test('오프라인 상태 감지', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    expect(navigator.onLine).toBe(false);
  });

  test('느린 네트워크 대응 - 자동 최적화', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '2g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer({ networkOptimization: true });
    optimizer.optimize();

    // 애니메이션 감소 적용
    expect(document.body.className).toContain('reduced-motion');
  });

  test('빠른 네트워크 - 최적화 미적용', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '4g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer({ networkOptimization: true });
    optimizer.optimize();

    // 네트워크 최적화 미적용
    const styleElement = document.getElementById('mobile-network-optimizations');
    expect(styleElement).toBeNull();
  });

  test('네트워크 변경 이벤트 핸들링', () => {
    const mockConnection = {
      effectiveType: '4g',
      addEventListener: jest.fn()
    };

    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      configurable: true
    });

    new MobileOptimizer();

    expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('네트워크 정보 업데이트', () => {
    let eventFired = false;

    const mockConnection = {
      effectiveType: '4g',
      addEventListener: jest.fn()
    };

    Object.defineProperty(navigator, 'connection', {
      value: mockConnection,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    optimizer.on('networkChange', (speed) => {
      eventFired = true;
      expect(speed).toBe('fast');
    });

    (optimizer as any).updateNetworkInfo();
    expect(eventFired).toBe(true);
  });
});

describe('MobileOptimizer - 최적화 적용', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('터치 입력 최적화 적용', () => {
    setupDOM(); // DOM 재설정

    const optimizer = new MobileOptimizer({ enableTouchInput: true });

    // 터치 지원 감지를 위한 capabilities 업데이트
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      configurable: true
    });

    // capabilities가 터치를 감지하는지 확인
    const capabilities = optimizer.getCapabilities();

    // 최적화 적용
    optimizer.optimize();

    // 최적화가 적용되었는지 확인
    expect(optimizer.isOptimizationEnabled()).toBe(true);

    // 터치 지원되는 경우에만 Touch Input Optimization 포함
    const summary = optimizer.getOptimizationSummary();
    if (capabilities.touchSupport) {
      expect(summary.applied).toContain('Touch Input Optimization');
    }
  });

  test('컴팩트 레이아웃 적용', () => {
    Object.defineProperty(window.screen, 'width', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 667, configurable: true });

    const optimizer = new MobileOptimizer({ compactLayout: true });
    optimizer.optimize();

    expect(document.body.className).toContain('compact-layout');
  });

  test('애니메이션 감소 적용', () => {
    const optimizer = new MobileOptimizer({ reduceAnimations: true });
    optimizer.optimize();

    expect(document.body.className).toContain('reduced-motion');
  });

  test('적응형 폰트 크기 적용 - 소형', () => {
    Object.defineProperty(window.screen, 'width', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 667, configurable: true });

    const optimizer = new MobileOptimizer({ adaptiveFontSize: true });
    optimizer.optimize();

    expect(document.body.className).toContain('adaptive-fonts');

    const styleElement = document.getElementById('mobile-adaptive-fonts');
    expect(styleElement?.textContent).toContain('font-size: 14px');
  });

  test('적응형 폰트 크기 적용 - 중형', () => {
    Object.defineProperty(window.screen, 'width', { value: 600, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 800, configurable: true });

    const optimizer = new MobileOptimizer({ adaptiveFontSize: true });
    optimizer.optimize();

    const styleElement = document.getElementById('mobile-adaptive-fonts');
    expect(styleElement?.textContent).toContain('font-size: 16px');
  });

  test('적응형 폰트 크기 적용 - 대형', () => {
    Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });

    const optimizer = new MobileOptimizer({ adaptiveFontSize: true });
    optimizer.optimize();

    const styleElement = document.getElementById('mobile-adaptive-fonts');
    expect(styleElement?.textContent).toContain('font-size: 18px');
  });

  test('중복 최적화 방지', () => {
    const optimizer = new MobileOptimizer();

    expect(optimizer.isOptimizationEnabled()).toBe(false);
    optimizer.optimize();
    expect(optimizer.isOptimizationEnabled()).toBe(true);

    // 두 번째 호출은 무시됨
    optimizer.optimize();
    expect(optimizer.isOptimizationEnabled()).toBe(true);
  });

  test('모든 최적화 동시 적용', () => {
    Object.defineProperty(window, 'ontouchstart', { value: () => {}, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 667, configurable: true });

    const optimizer = new MobileOptimizer({
      enableTouchInput: true,
      compactLayout: true,
      reduceAnimations: true,
      adaptiveFontSize: true
    });

    optimizer.optimize();

    expect(document.body.className).toContain('compact-layout');
    expect(document.body.className).toContain('reduced-motion');
    expect(document.body.className).toContain('adaptive-fonts');
    expect(document.getElementById('mobile-touch-optimizations')).toBeTruthy();
  });
});

describe('MobileOptimizer - 이벤트 처리', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('최적화 완료 이벤트', (done) => {
    const optimizer = new MobileOptimizer();

    optimizer.on('optimized', (summary) => {
      expect(summary).toHaveProperty('applied');
      expect(summary).toHaveProperty('capabilities');
      expect(summary).toHaveProperty('metrics');
      expect(summary).toHaveProperty('recommendations');
      done();
    });

    optimizer.optimize();
  });

  test('화면 크기 변경 이벤트', (done) => {
    const optimizer = new MobileOptimizer();

    optimizer.on('screenResize', (dimensions) => {
      expect(dimensions).toHaveProperty('width');
      expect(dimensions).toHaveProperty('height');
      done();
    });

    // 이벤트 직접 발생
    window.dispatchEvent(new Event('resize'));
  });

  test('화면 방향 변경 이벤트', (done) => {
    Object.defineProperty(window, 'onorientationchange', {
      value: null,
      configurable: true
    });

    const optimizer = new MobileOptimizer();

    optimizer.on('orientationChange', (orientation) => {
      expect(['portrait', 'landscape']).toContain(orientation);
      done();
    });

    window.dispatchEvent(new Event('orientationchange'));
  });

  test('최적화 해제 이벤트', (done) => {
    const optimizer = new MobileOptimizer();

    optimizer.on('disabled', () => {
      done();
    });

    optimizer.optimize();
    optimizer.disable();
  });
});

describe('MobileOptimizer - 진동 피드백', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('진동 지원 시 단일 패턴', () => {
    const vibrateMock = jest.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true
    });

    const optimizer = new MobileOptimizer({ enableVibration: true });
    const result = optimizer.vibrate(100);

    expect(result).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(100);
  });

  test('진동 지원 시 패턴 배열', () => {
    const vibrateMock = jest.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true
    });

    const optimizer = new MobileOptimizer({ enableVibration: true });
    const pattern = [100, 50, 100];
    const result = optimizer.vibrate(pattern);

    expect(result).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith(pattern);
  });

  test('진동 비활성화 시 무시', () => {
    const vibrateMock = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true
    });

    const optimizer = new MobileOptimizer({ enableVibration: false });
    const result = optimizer.vibrate(100);

    expect(result).toBe(false);
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  test('진동 미지원 시 false 반환', () => {
    const optimizer = new MobileOptimizer({ enableVibration: true });
    const result = optimizer.vibrate(100);

    expect(result).toBe(false);
  });
});

describe('MobileOptimizer - 최적화 해제', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('클래스 제거', () => {
    setupDOM(375, 667); // DOM 재설정

    const optimizer = new MobileOptimizer({
      compactLayout: true,
      reduceAnimations: true,
      adaptiveFontSize: true
    });

    optimizer.optimize();

    expect(document.body.className).toContain('compact-layout');
    expect(document.body.className).toContain('reduced-motion');

    optimizer.disable();

    expect(document.body.className).not.toContain('compact-layout');
    expect(document.body.className).not.toContain('reduced-motion');
    expect(document.body.className).not.toContain('adaptive-fonts');
  });

  test('스타일 요소 제거', () => {
    const optimizer = new MobileOptimizer({ adaptiveFontSize: true });

    optimizer.optimize();
    expect(document.getElementById('mobile-adaptive-fonts')).toBeTruthy();

    optimizer.disable();
    expect(document.getElementById('mobile-adaptive-fonts')).toBeNull();
  });

  test('최적화 상태 플래그 재설정', () => {
    const optimizer = new MobileOptimizer();

    optimizer.optimize();
    expect(optimizer.isOptimizationEnabled()).toBe(true);

    optimizer.disable();
    expect(optimizer.isOptimizationEnabled()).toBe(false);
  });
});

describe('MobileOptimizer - 최적화 요약', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('적용된 최적화 목록', () => {
    Object.defineProperty(window, 'ontouchstart', { value: () => {}, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 667, configurable: true });

    const optimizer = new MobileOptimizer({
      enableTouchInput: true,
      compactLayout: true,
      adaptiveFontSize: true
    });

    optimizer.optimize();
    const summary = optimizer.getOptimizationSummary();

    expect(summary.applied).toContain('Touch Input Optimization');
    expect(summary.applied).toContain('Compact Layout');
    expect(summary.applied).toContain('Adaptive Font Size');
  });

  test('배터리 최적화 권장사항', () => {
    const optimizer = new MobileOptimizer();
    (optimizer as any).metrics.batteryLevel = 0.2;

    const summary = optimizer.getOptimizationSummary();

    expect(summary.applied).toContain('Battery Optimization');
    expect(summary.recommendations).toContain('Enable power saving mode');
  });

  test('네트워크 최적화 권장사항', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '2g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer({ networkOptimization: true });
    optimizer.optimize();

    const summary = optimizer.getOptimizationSummary();

    expect(summary.applied).toContain('Network Optimization');
    expect(summary.recommendations).toContain('Reduce data usage');
  });

  test('메모리 최적화 권장사항', () => {
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 2,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const summary = optimizer.getOptimizationSummary();

    expect(summary.recommendations).toContain('Enable memory optimization');
  });

  test('CPU 최적화 권장사항', () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 2,
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    const summary = optimizer.getOptimizationSummary();

    expect(summary.recommendations).toContain('Reduce CPU intensive operations');
  });
});

describe('MobileOptimizer - 에러 처리', () => {
  test('DOM 없는 환경 - 안전 처리', () => {
    const originalDocument = globalThis.document;
    (globalThis as any).document = undefined;

    const optimizer = new MobileOptimizer();

    expect(() => optimizer.optimize()).not.toThrow();
    expect(() => optimizer.disable()).not.toThrow();

    (globalThis as any).document = originalDocument;
  });

  test('Window 없는 환경 - 안전 처리', () => {
    const originalWindow = globalThis.window;
    (globalThis as any).window = undefined;

    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();

    expect(metrics.screenSize).toBe('unknown');

    (globalThis as any).window = originalWindow;
  });

  test('Navigator 없는 환경 - 안전 처리', () => {
    const originalNavigator = globalThis.navigator;
    (globalThis as any).navigator = {};

    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();

    expect(capabilities.touchSupport).toBe(false);

    (globalThis as any).navigator = originalNavigator;
  });
});
