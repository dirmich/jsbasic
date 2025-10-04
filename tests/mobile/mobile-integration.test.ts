/**
 * 모바일 모듈 통합 테스트
 * MobileOptimizer, GestureHandler, ResponsiveLayout 통합 검증
 */

import { describe, test, expect, beforeEach, jest } from 'bun:test';
import { Window } from 'happy-dom';
import { MobileOptimizer } from '../../src/mobile/mobile-optimizer.js';
import { GestureHandler } from '../../src/mobile/gesture-handler.js';
import { ResponsiveLayout } from '../../src/mobile/responsive-layout.js';
import type { GestureEvent, LayoutMode } from '../../src/mobile/types.js';

// Happy-DOM 설정
const setupDOM = (width: number = 375, height: number = 667) => {
  const window = new Window();
  const document = window.document;

  (globalThis as any).window = window;
  (globalThis as any).document = document;
  (globalThis as any).navigator = window.navigator;

  // 모바일 환경 시뮬레이션
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
    writable: true
  });

  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true,
    writable: true
  });

  Object.defineProperty(window, 'ontouchstart', {
    value: () => {},
    configurable: true
  });

  Object.defineProperty(window.screen, 'width', {
    value: width,
    configurable: true
  });

  Object.defineProperty(window.screen, 'height', {
    value: height,
    configurable: true
  });

  document.body.innerHTML = '<div id="app"><div id="gesture-target"></div></div>';

  return {
    window,
    document,
    app: document.getElementById('app') as HTMLElement,
    target: document.getElementById('gesture-target') as HTMLElement
  };
};

// 터치 이벤트 생성 헬퍼
const createTouch = (id: number, x: number, y: number): Touch => {
  return {
    identifier: id,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
    target: document.getElementById('gesture-target')!
  } as Touch;
};

const createTouchEvent = (
  type: string,
  touches: Touch[],
  changedTouches: Touch[] = touches
): TouchEvent => {
  const event = new Event(type) as any;
  event.touches = touches;
  event.changedTouches = changedTouches;
  event.targetTouches = touches;
  event.preventDefault = jest.fn();
  return event as TouchEvent;
};

describe('통합 테스트 - MobileOptimizer + ResponsiveLayout', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('모바일 환경에서 자동 최적화 + 레이아웃 조정', () => {
    setupDOM(375, 667); // 소형 모바일

    const optimizer = new MobileOptimizer({
      enableTouchInput: true,
      compactLayout: true,
      adaptiveFontSize: true
    });

    const layout = new ResponsiveLayout();

    // 최적화 적용
    optimizer.optimize();

    // 레이아웃 모드 확인
    expect(layout.getCurrentMode()).toBe('compact');
    expect(layout.isPortrait()).toBe(true);

    // 최적화 적용 확인
    expect(optimizer.isOptimizationEnabled()).toBe(true);
    expect(document.body.className).toContain('compact-layout');
    expect(document.body.className).toContain('adaptive-fonts');
  });

  test('화면 크기 변경 시 최적화 및 레이아웃 동시 업데이트', (done) => {
    const { window } = setupDOM(375, 667);

    const optimizer = new MobileOptimizer({ compactLayout: true, adaptiveFontSize: true });
    const layout = new ResponsiveLayout();

    optimizer.optimize();

    expect(layout.getCurrentMode()).toBe('compact');

    let layoutChanged = false;
    let optimizerUpdated = false;

    layout.on('layoutModeChange', (mode: LayoutMode) => {
      layoutChanged = true;
      expect(mode).toBe('tablet');
    });

    optimizer.on('screenResize', () => {
      optimizerUpdated = true;
    });

    // 태블릿 크기로 변경
    Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1200, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 900, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1200, configurable: true });

    window.dispatchEvent(new Event('resize'));

    setTimeout(() => {
      expect(layoutChanged).toBe(true);
      expect(layout.getCurrentMode()).toBe('tablet');
      done();
    }, 100);
  });

  test('저배터리 상태에서 자동 최적화 + 레이아웃 컴팩트 모드', () => {
    setupDOM(375, 667);

    const optimizer = new MobileOptimizer({
      optimizeForBattery: true,
      compactLayout: true
    });

    const layout = new ResponsiveLayout();

    // 저배터리 상태 시뮬레이션
    (optimizer as any).metrics.batteryLevel = 0.15;

    optimizer.optimize();

    // 배터리 최적화 및 컴팩트 레이아웃 모두 적용
    expect(document.body.className).toContain('battery-optimized');
    expect(document.body.className).toContain('compact-layout');
    expect(layout.getCurrentMode()).toBe('compact');
  });

  test('화면 방향 변경 시 양쪽 모듈 이벤트 발생', (done) => {
    const { window } = setupDOM(375, 667);

    const optimizer = new MobileOptimizer();
    const layout = new ResponsiveLayout();

    let optimizerEvent = false;
    let layoutEvent = false;

    optimizer.on('orientationChange', (orientation) => {
      optimizerEvent = true;
      expect(orientation).toBe('landscape');
    });

    layout.on('orientationChange', (orientation) => {
      layoutEvent = true;
      expect(orientation).toBe('landscape');
    });

    // 가로로 회전
    Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 667, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 375, configurable: true });

    window.dispatchEvent(new Event('resize'));

    setTimeout(() => {
      expect(layoutEvent).toBe(true);
      done();
    }, 100);
  });
});

describe('통합 테스트 - GestureHandler + ResponsiveLayout', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('모바일 레이아웃에서 스와이프 제스처', (done) => {
    const { target } = setupDOM(375, 667);

    const layout = new ResponsiveLayout();
    const handler = new GestureHandler(target);

    expect(layout.isMobile()).toBe(true);

    handler.on('swipe', (event: GestureEvent) => {
      expect(event.direction).toBe('left');
      done();
    });

    // 스와이프 제스처
    const touch = createTouch(1, 300, 300);
    target.dispatchEvent(createTouchEvent('touchstart', [touch]));

    setTimeout(() => {
      const endTouch = createTouch(1, 100, 300);
      target.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
    }, 150);
  });

  test('태블릿 레이아웃에서 핀치 제스처', (done) => {
    const { target } = setupDOM(900, 1200);

    const layout = new ResponsiveLayout();
    const handler = new GestureHandler(target);

    expect(layout.isTablet()).toBe(true);

    handler.on('pinch', (event: GestureEvent) => {
      expect(event.scale).toBeGreaterThan(1);
      done();
    });

    // 핀치 줌 인
    const touch1 = createTouch(1, 400, 600);
    const touch2 = createTouch(2, 500, 600);
    target.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));

    setTimeout(() => {
      const moved1 = createTouch(1, 350, 600);
      const moved2 = createTouch(2, 550, 600);
      target.dispatchEvent(createTouchEvent('touchmove', [moved1, moved2]));
    }, 50);
  });

  test('화면 방향 변경 시 제스처 설정 조정', (done) => {
    const { window, target } = setupDOM(375, 667);

    const layout = new ResponsiveLayout();
    const handler = new GestureHandler(target);

    expect(layout.isPortrait()).toBe(true);

    layout.on('orientationChange', (orientation) => {
      expect(orientation).toBe('landscape');

      // 가로 모드에서도 제스처 정상 작동
      handler.on('tap', () => {
        done();
      });

      const touch = createTouch(1, 300, 150);
      target.dispatchEvent(createTouchEvent('touchstart', [touch]));

      setTimeout(() => {
        target.dispatchEvent(createTouchEvent('touchend', [], [touch]));
      }, 50);
    });

    // 가로로 회전
    Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });

    window.dispatchEvent(new Event('resize'));
  });
});

describe('통합 테스트 - 전체 모듈 통합', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('모바일 환경 전체 시나리오 - 초기화부터 제스처까지', () => {
    const { target } = setupDOM(375, 667);

    // 1. 레이아웃 초기화
    const layout = new ResponsiveLayout();
    expect(layout.getCurrentMode()).toBe('compact');
    expect(layout.isPortrait()).toBe(true);

    // 2. 최적화 적용
    const optimizer = new MobileOptimizer({
      enableTouchInput: true,
      compactLayout: true,
      adaptiveFontSize: true
    });

    optimizer.optimize();
    expect(optimizer.isOptimizationEnabled()).toBe(true);

    // 3. 제스처 핸들러 설정
    const handler = new GestureHandler(target);

    let tapFired = false;
    handler.on('tap', (event: GestureEvent) => {
      tapFired = true;
      expect(event.type).toBe('tap');

      // 진동 피드백 (지원되는 경우)
      optimizer.vibrate(50);

      // 모든 모듈이 정상 작동
      expect(layout.isMobile()).toBe(true);
      expect(optimizer.isOptimizationEnabled()).toBe(true);
    });

    // 탭 제스처 발생
    const touch = createTouch(1, 200, 300);
    target.dispatchEvent(createTouchEvent('touchstart', [touch]));
    target.dispatchEvent(createTouchEvent('touchend', [], [touch]));

    // 이벤트가 발생했는지 확인
    expect(tapFired).toBe(true);
  });

  test('태블릿 가로 모드 - 복합 시나리오', (done) => {
    const { window, target } = setupDOM(1024, 768);

    const layout = new ResponsiveLayout();
    const optimizer = new MobileOptimizer({ adaptiveFontSize: true });
    const handler = new GestureHandler(target);

    expect(layout.getCurrentMode()).toBe('desktop');
    expect(layout.isLandscape()).toBe(true);

    optimizer.optimize();

    // 태블릿 세로 모드로 전환
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1024, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 768, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1024, configurable: true });

    layout.on('layoutModeChange', (mode: LayoutMode) => {
      expect(mode).toBe('tablet');
      expect(layout.isPortrait()).toBe(true);

      // 세로 모드에서 스와이프 제스처
      handler.on('swipe:down', () => {
        done();
      });

      const touch = createTouch(1, 400, 200);
      target.dispatchEvent(createTouchEvent('touchstart', [touch]));

      setTimeout(() => {
        const endTouch = createTouch(1, 400, 300);
        target.dispatchEvent(createTouchEvent('touchend', [], [endTouch]));
      }, 150);
    });

    window.dispatchEvent(new Event('resize'));
  });

  test('저사양 모바일 환경 - 전체 최적화', () => {
    setupDOM(375, 667);

    // 저사양 환경 시뮬레이션
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 2,
      configurable: true
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 2,
      configurable: true
    });

    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '2g' },
      configurable: true
    });

    const layout = new ResponsiveLayout();
    const optimizer = new MobileOptimizer({
      optimizeForBattery: true,
      reduceAnimations: true,
      compactLayout: true,
      networkOptimization: true
    });

    // 저배터리 상태
    (optimizer as any).metrics.batteryLevel = 0.2;

    optimizer.optimize();

    // 모든 최적화 적용 확인
    const summary = optimizer.getOptimizationSummary();

    expect(summary.applied).toContain('Battery Optimization');
    expect(summary.applied).toContain('Animation Reduction');
    expect(summary.applied).toContain('Compact Layout');
    expect(summary.applied).toContain('Network Optimization');

    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.recommendations).toContain('Enable memory optimization');
    expect(summary.recommendations).toContain('Reduce CPU intensive operations');

    // 레이아웃도 최소 모드
    expect(layout.getCurrentMode()).toBe('compact');
  });

  test('다양한 제스처 연속 실행', (done) => {
    const { target } = setupDOM(375, 667);

    const layout = new ResponsiveLayout();
    const optimizer = new MobileOptimizer({ enableVibration: true });
    const handler = new GestureHandler(target);

    optimizer.optimize();

    const gestures: string[] = [];

    handler.on('tap', () => {
      gestures.push('tap');
      optimizer.vibrate(50);
    });

    handler.on('swipe', () => {
      gestures.push('swipe');
      optimizer.vibrate(100);
    });

    handler.on('longpress', () => {
      gestures.push('longpress');
      optimizer.vibrate([100, 50, 100]);
    });

    // 1. 탭
    const touch1 = createTouch(1, 200, 300);
    target.dispatchEvent(createTouchEvent('touchstart', [touch1]));

    setTimeout(() => {
      target.dispatchEvent(createTouchEvent('touchend', [], [touch1]));

      // 2. 스와이프
      setTimeout(() => {
        const touch2 = createTouch(2, 300, 300);
        target.dispatchEvent(createTouchEvent('touchstart', [touch2]));

        setTimeout(() => {
          const endTouch2 = createTouch(2, 100, 300);
          target.dispatchEvent(createTouchEvent('touchend', [], [endTouch2]));

          setTimeout(() => {
            expect(gestures).toContain('tap');
            expect(gestures).toContain('swipe');
            expect(layout.isMobile()).toBe(true);
            done();
          }, 50);
        }, 150);
      }, 100);
    }, 50);
  });

  test('가상 키보드 표시 시 레이아웃 조정 + 최적화', () => {
    const { window } = setupDOM(375, 667);

    const mockVisualViewport = {
      height: 400,
      addEventListener: jest.fn()
    };

    Object.defineProperty(window, 'visualViewport', {
      value: mockVisualViewport,
      configurable: true
    });

    const layout = new ResponsiveLayout({ virtualKeyboardPadding: 20 });
    const optimizer = new MobileOptimizer({ compactLayout: true });

    optimizer.optimize();

    // 최적화 확인
    expect(optimizer.isOptimizationEnabled()).toBe(true);
    expect(layout.getCurrentMode()).toBe('compact');

    // addEventListener가 호출되었는지 확인
    expect(mockVisualViewport.addEventListener).toHaveBeenCalled();
  });

  test('모든 모듈 정리 (cleanup)', () => {
    const { target } = setupDOM(375, 667);

    const layout = new ResponsiveLayout();
    const optimizer = new MobileOptimizer({ compactLayout: true });
    const handler = new GestureHandler(target);

    optimizer.optimize();

    expect(optimizer.isOptimizationEnabled()).toBe(true);
    expect(layout.getCurrentMode()).toBe('compact');

    // 정리
    optimizer.disable();
    layout.destroy();
    handler.destroy();

    // 최적화 해제
    expect(optimizer.isOptimizationEnabled()).toBe(false);
    expect(document.body.className).not.toContain('compact-layout');

    // 제스처 비활성화
    expect(handler.isActive()).toBe(false);
  });
});

describe('통합 테스트 - 성능 시나리오', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('고성능 기기 - 최소 최적화', () => {
    setupDOM(1920, 1080);

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 16,
      configurable: true
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 16,
      configurable: true
    });

    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '5g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer();
    (optimizer as any).metrics.batteryLevel = 0.9;

    optimizer.optimize();

    const summary = optimizer.getOptimizationSummary();

    // 고성능 기기는 권장사항이 적거나 없음
    expect(summary.recommendations.length).toBe(0);
  });

  test('저성능 기기 - 최대 최적화', () => {
    setupDOM(375, 667);

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 1,
      configurable: true
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 1,
      configurable: true
    });

    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: 'slow-2g' },
      configurable: true
    });

    const optimizer = new MobileOptimizer({
      optimizeForBattery: true,
      reduceAnimations: true,
      compactLayout: true,
      networkOptimization: true
    });

    (optimizer as any).metrics.batteryLevel = 0.1;

    optimizer.optimize();

    const summary = optimizer.getOptimizationSummary();

    // 많은 최적화 적용
    expect(summary.applied.length).toBeGreaterThanOrEqual(4);
    expect(summary.recommendations.length).toBeGreaterThan(0);
  });

  test('중간 성능 기기 - 균형 최적화', () => {
    setupDOM(768, 1024);

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 4,
      configurable: true
    });

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 4,
      configurable: true
    });

    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '4g' },
      configurable: true
    });

    const layout = new ResponsiveLayout();
    const optimizer = new MobileOptimizer({ adaptiveFontSize: true });

    (optimizer as any).metrics.batteryLevel = 0.5;

    optimizer.optimize();

    expect(layout.isTablet()).toBe(true);

    const summary = optimizer.getOptimizationSummary();
    expect(summary.applied).toContain('Adaptive Font Size');
  });
});
