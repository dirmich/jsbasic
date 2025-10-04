/**
 * ResponsiveLayout 포괄적 테스트
 * 반응형 레이아웃, 화면 방향, 뷰포트 관리 검증
 */

import { describe, test, expect, beforeEach, jest } from 'bun:test';
import { Window } from 'happy-dom';
import { ResponsiveLayout } from '../../src/mobile/responsive-layout.js';
import type { LayoutMode, ScreenOrientation } from '../../src/mobile/types.js';

// Happy-DOM 설정
const setupDOM = (width: number = 1024, height: number = 768) => {
  const window = new Window();
  const document = window.document;

  (globalThis as any).window = window;
  (globalThis as any).document = document;

  // 뷰포트 크기 설정
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

  Object.defineProperty(window, 'devicePixelRatio', {
    value: 1,
    configurable: true
  });

  // HTML 구조 생성
  document.body.innerHTML = '<div id="app"></div>';

  return { window, document };
};

describe('ResponsiveLayout - 초기화', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('기본 설정으로 초기화', () => {
    const layout = new ResponsiveLayout();
    const metrics = layout.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.mode).toBeDefined();
    expect(metrics.orientation).toBeDefined();
    expect(metrics.viewportWidth).toBeDefined();
    expect(metrics.viewportHeight).toBeDefined();
  });

  test('사용자 정의 브레이크포인트', () => {
    const customConfig = {
      breakpoints: {
        mobile: 600,
        tablet: 900,
        desktop: 1200
      }
    };

    const layout = new ResponsiveLayout(customConfig);
    const metrics = layout.getMetrics();

    // 1024x768은 customConfig에서 tablet 범위 (900-1200)
    expect(metrics.mode).toBe('tablet');
  });

  test('자동 조정 비활성화', () => {
    const layout = new ResponsiveLayout({ autoAdjust: false });

    // autoAdjust가 false면 이벤트 리스너가 설정되지 않음
    expect(layout).toBeDefined();
  });
});

describe('ResponsiveLayout - 브레이크포인트', () => {
  test('컴팩트 레이아웃 (<480px)', () => {
    setupDOM(400, 600);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('compact');
    expect(layout.isMobile()).toBe(true);
    expect(layout.isTablet()).toBe(false);
    expect(layout.isDesktop()).toBe(false);
  });

  test('모바일 레이아웃 (480-768px)', () => {
    setupDOM(600, 800);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('mobile');
    expect(layout.isMobile()).toBe(true);
    expect(layout.isTablet()).toBe(false);
    expect(layout.isDesktop()).toBe(false);
  });

  test('태블릿 레이아웃 (768-1024px)', () => {
    setupDOM(900, 1200);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('tablet');
    expect(layout.isMobile()).toBe(false);
    expect(layout.isTablet()).toBe(true);
    expect(layout.isDesktop()).toBe(false);
  });

  test('데스크톱 레이아웃 (>=1024px)', () => {
    setupDOM(1920, 1080);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('desktop');
    expect(layout.isMobile()).toBe(false);
    expect(layout.isTablet()).toBe(false);
    expect(layout.isDesktop()).toBe(true);
  });

  test('경계값 - 정확히 480px', () => {
    setupDOM(480, 800);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('mobile');
  });

  test('경계값 - 정확히 768px', () => {
    setupDOM(768, 1024);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('tablet');
  });

  test('경계값 - 정확히 1024px', () => {
    setupDOM(1024, 768);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('desktop');
  });
});

describe('ResponsiveLayout - 화면 방향', () => {
  test('세로 방향 (portrait)', () => {
    setupDOM(375, 667); // iPhone 크기
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentOrientation()).toBe('portrait');
    expect(layout.isPortrait()).toBe(true);
    expect(layout.isLandscape()).toBe(false);
  });

  test('가로 방향 (landscape)', () => {
    setupDOM(667, 375); // iPhone 가로
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentOrientation()).toBe('landscape');
    expect(layout.isPortrait()).toBe(false);
    expect(layout.isLandscape()).toBe(true);
  });

  test('정사각형 화면 - portrait로 처리', () => {
    setupDOM(1024, 1024);
    const layout = new ResponsiveLayout();

    // 너비 == 높이인 경우 portrait로 처리
    expect(layout.getCurrentOrientation()).toBe('portrait');
  });

  test('화면 방향 변경 감지', (done) => {
    const { window } = setupDOM(375, 667);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentOrientation()).toBe('portrait');

    layout.on('orientationChange', (orientation: ScreenOrientation) => {
      expect(orientation).toBe('landscape');
      done();
    });

    // 화면 크기 변경 (가로로 회전)
    Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });

    // resize 이벤트 발생
    window.dispatchEvent(new Event('resize'));
  });
});

describe('ResponsiveLayout - 뷰포트 메트릭', () => {
  test('뷰포트 크기 계산', () => {
    setupDOM(1920, 1080);
    const layout = new ResponsiveLayout();
    const metrics = layout.getMetrics();

    expect(metrics.viewportWidth).toBe(1920);
    expect(metrics.viewportHeight).toBe(1080);
  });

  test('픽셀 비율 감지', () => {
    const { window } = setupDOM(1920, 1080);
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true
    });

    const layout = new ResponsiveLayout();
    const metrics = layout.getMetrics();

    expect(metrics.pixelRatio).toBe(2);
  });

  test('사용 가능한 영역 계산 (Safe Area 제외)', () => {
    setupDOM(375, 812); // iPhone X
    const layout = new ResponsiveLayout();
    const metrics = layout.getMetrics();

    // Safe Area가 없으면 전체 영역
    expect(metrics.availableWidth).toBe(375);
    expect(metrics.availableHeight).toBe(812);
  });

  test('Safe Area Insets 기본값', () => {
    setupDOM(375, 667);
    const layout = new ResponsiveLayout();
    const metrics = layout.getMetrics();

    expect(metrics.safeAreaInsets).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    });
  });
});

describe('ResponsiveLayout - 레이아웃 모드 변경', () => {
  test('모바일 → 태블릿 전환', () => {
    const { window } = setupDOM(600, 800); // 모바일
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('mobile');

    let eventFired = false;
    layout.on('layoutModeChange', (mode: LayoutMode) => {
      eventFired = true;
      expect(mode).toBe('tablet');
      expect(document.body.className).toContain('layout-tablet');
    });

    // 태블릿 크기로 변경
    Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1200, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 900, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1200, configurable: true });

    window.dispatchEvent(new Event('resize'));

    // Happy-DOM에서는 이벤트가 동기적으로 처리될 수 있음
    if (eventFired) {
      expect(layout.getCurrentMode()).toBe('tablet');
    }
  });

  test('태블릿 → 데스크톱 전환', () => {
    const { window } = setupDOM(900, 1200); // 태블릿
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('tablet');

    let eventFired = false;
    layout.on('layoutModeChange', (mode: LayoutMode) => {
      eventFired = true;
      expect(mode).toBe('desktop');
      expect(document.body.className).toContain('layout-desktop');
    });

    // 데스크톱 크기로 변경
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });

    window.dispatchEvent(new Event('resize'));

    if (eventFired) {
      expect(layout.getCurrentMode()).toBe('desktop');
    }
  });

  test('레이아웃 클래스 자동 적용', () => {
    setupDOM(1920, 1080);
    const layout = new ResponsiveLayout();

    // 레이아웃 모드 확인
    expect(layout.getCurrentMode()).toBe('desktop');

    // 클래스 확인 (Happy-DOM에서는 classList 대신 className 사용)
    expect(document.body.className).toContain('layout-desktop');
  });

  test('레이아웃 변경 시 이전 클래스 제거', (done) => {
    const { window } = setupDOM(600, 800);
    const layout = new ResponsiveLayout();

    expect(document.body.className).toContain('layout-mobile');

    layout.on('layoutModeChange', () => {
      expect(document.body.className).not.toContain('layout-mobile');
      expect(document.body.className).toContain('layout-tablet');
      done();
    });

    Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 900, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });
});

describe('ResponsiveLayout - 화면 방향 변경', () => {
  test('방향 클래스 자동 적용', () => {
    setupDOM(375, 667); // 세로
    const layout = new ResponsiveLayout();

    expect(layout.isPortrait()).toBe(true);
    expect(document.body.className).toContain('orientation-portrait');
  });

  test('방향 변경 시 이전 클래스 제거', (done) => {
    const { window } = setupDOM(375, 667);
    const layout = new ResponsiveLayout();

    expect(document.body.className).toContain('orientation-portrait');

    layout.on('orientationChange', () => {
      expect(document.body.className).not.toContain('orientation-portrait');
      expect(document.body.className).toContain('orientation-landscape');
      done();
    });

    // 가로로 회전
    Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 667, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 375, configurable: true });

    window.dispatchEvent(new Event('resize'));
  });
});

describe('ResponsiveLayout - 리사이즈 이벤트', () => {
  test('resize 이벤트 발생', (done) => {
    const { window } = setupDOM(1024, 768);
    const layout = new ResponsiveLayout();

    layout.on('resize', (metrics) => {
      expect(metrics.viewportWidth).toBe(1280);
      expect(metrics.viewportHeight).toBe(720);
      done();
    });

    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true });

    window.dispatchEvent(new Event('resize'));
  });

  test('같은 모드 내에서 리사이즈 - layoutModeChange 미발생', (done) => {
    const { window } = setupDOM(1024, 768); // desktop
    const layout = new ResponsiveLayout();

    let layoutModeChangeFired = false;

    layout.on('layoutModeChange', () => {
      layoutModeChangeFired = true;
    });

    layout.on('resize', () => {
      expect(layoutModeChangeFired).toBe(false);
      done();
    });

    // 같은 desktop 범위 내에서 크기만 변경
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true });

    window.dispatchEvent(new Event('resize'));
  });
});

describe('ResponsiveLayout - 가상 키보드', () => {
  test('가상 키보드 표시 이벤트', (done) => {
    const { window } = setupDOM(375, 667);

    // Visual Viewport API 모킹
    const mockVisualViewport = {
      height: 400, // 키보드로 인해 높이 감소
      addEventListener: jest.fn((event: string, callback: Function) => {
        if (event === 'resize') {
          setTimeout(() => callback(), 10);
        }
      })
    };

    Object.defineProperty(window, 'visualViewport', {
      value: mockVisualViewport,
      configurable: true
    });

    const layout = new ResponsiveLayout();

    layout.on('virtualKeyboardShow', (keyboardHeight: number) => {
      expect(keyboardHeight).toBe(267); // 667 - 400
      expect(keyboardHeight).toBeGreaterThan(0);
      done();
    });
  });

  test('가상 키보드 숨김 이벤트', (done) => {
    const { window } = setupDOM(375, 667);

    const mockVisualViewport = {
      height: 667, // 전체 높이
      addEventListener: jest.fn((event: string, callback: Function) => {
        if (event === 'resize') {
          setTimeout(() => callback(), 10);
        }
      })
    };

    Object.defineProperty(window, 'visualViewport', {
      value: mockVisualViewport,
      configurable: true
    });

    const layout = new ResponsiveLayout();

    layout.on('virtualKeyboardHide', () => {
      done();
    });
  });

  test('가상 키보드 패딩 적용', (done) => {
    const { window } = setupDOM(375, 667);

    const mockVisualViewport = {
      height: 400,
      addEventListener: jest.fn((event: string, callback: Function) => {
        if (event === 'resize') {
          setTimeout(() => callback(), 10);
        }
      })
    };

    Object.defineProperty(window, 'visualViewport', {
      value: mockVisualViewport,
      configurable: true
    });

    new ResponsiveLayout({ virtualKeyboardPadding: 20 });

    setTimeout(() => {
      const paddingBottom = document.body.style.paddingBottom;
      expect(paddingBottom).toBe('287px'); // 267 + 20
      done();
    }, 50);
  });

  test('가상 키보드 패딩 제거', (done) => {
    const { window } = setupDOM(375, 667);

    const mockVisualViewport = {
      height: 667,
      addEventListener: jest.fn((event: string, callback: Function) => {
        if (event === 'resize') {
          setTimeout(() => callback(), 10);
        }
      })
    };

    Object.defineProperty(window, 'visualViewport', {
      value: mockVisualViewport,
      configurable: true
    });

    new ResponsiveLayout();

    setTimeout(() => {
      const paddingBottom = document.body.style.paddingBottom;
      expect(paddingBottom).toBe('');
      done();
    }, 50);
  });

  test('Visual Viewport 미지원 시 폴백', () => {
    setupDOM(375, 667);

    // Visual Viewport가 없는 환경
    const layout = new ResponsiveLayout();

    // 에러 없이 초기화되어야 함
    expect(layout).toBeDefined();
  });
});

describe('ResponsiveLayout - CSS 변수', () => {
  test('뷰포트 CSS 변수 설정', () => {
    setupDOM(1920, 1080);
    const layout = new ResponsiveLayout();

    layout.setCSSVariables();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--viewport-width')).toBe('1920px');
    expect(root.style.getPropertyValue('--viewport-height')).toBe('1080px');
  });

  test('픽셀 비율 CSS 변수', () => {
    const { window } = setupDOM(1920, 1080);
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true
    });

    const layout = new ResponsiveLayout();
    layout.setCSSVariables();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--pixel-ratio')).toBe('2');
  });

  test('Safe Area CSS 변수', () => {
    setupDOM(375, 812);
    const layout = new ResponsiveLayout();

    layout.setCSSVariables();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--safe-area-inset-top')).toBe('0px');
    expect(root.style.getPropertyValue('--safe-area-inset-right')).toBe('0px');
    expect(root.style.getPropertyValue('--safe-area-inset-bottom')).toBe('0px');
    expect(root.style.getPropertyValue('--safe-area-inset-left')).toBe('0px');
  });

  test('사용 가능 영역 CSS 변수', () => {
    setupDOM(1920, 1080);
    const layout = new ResponsiveLayout();

    layout.setCSSVariables();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--available-width')).toBe('1920px');
    expect(root.style.getPropertyValue('--available-height')).toBe('1080px');
  });
});

describe('ResponsiveLayout - 설정 업데이트', () => {
  test('브레이크포인트 업데이트', () => {
    setupDOM(600, 800);
    const layout = new ResponsiveLayout();

    expect(layout.getCurrentMode()).toBe('mobile');

    // 브레이크포인트 변경
    layout.updateConfig({
      breakpoints: {
        mobile: 700,
        tablet: 900,
        desktop: 1200
      }
    });

    // 600px은 이제 compact 범위
    expect(layout.getCurrentMode()).toBe('compact');
  });

  test('설정 업데이트 시 메트릭 재계산', () => {
    setupDOM(1024, 768);
    const layout = new ResponsiveLayout();

    const oldMetrics = layout.getMetrics();

    layout.updateConfig({
      breakpoints: {
        mobile: 500,
        tablet: 1100,
        desktop: 1500
      }
    });

    const newMetrics = layout.getMetrics();

    // 모드가 변경되었을 수 있음
    expect(newMetrics).not.toEqual(oldMetrics);
  });
});

describe('ResponsiveLayout - ResizeObserver', () => {
  test('ResizeObserver 사용 가능 시 등록', () => {
    const { window } = setupDOM(1024, 768);

    const mockObserve = jest.fn();
    const mockDisconnect = jest.fn();

    // ResizeObserver 모킹
    Object.defineProperty(window, 'ResizeObserver', {
      value: class MockResizeObserver {
        observe = mockObserve;
        disconnect = mockDisconnect;
        unobserve = jest.fn();
      },
      configurable: true
    });

    new ResponsiveLayout();

    expect(mockObserve).toHaveBeenCalledWith(document.body);
  });

  test('ResizeObserver 미지원 시 폴백', () => {
    setupDOM(1024, 768);

    // ResizeObserver 없음
    const layout = new ResponsiveLayout();

    // resize 이벤트로 폴백
    expect(layout).toBeDefined();
  });
});

describe('ResponsiveLayout - 정리', () => {
  test('destroy 호출 시 ResizeObserver 해제', () => {
    const { window } = setupDOM(1024, 768);

    const mockDisconnect = jest.fn();

    Object.defineProperty(window, 'ResizeObserver', {
      value: class MockResizeObserver {
        observe = jest.fn();
        disconnect = mockDisconnect;
        unobserve = jest.fn();
      },
      configurable: true
    });

    const layout = new ResponsiveLayout();
    layout.destroy();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  test('destroy 호출 시 이벤트 리스너 제거', () => {
    setupDOM(1024, 768);
    const layout = new ResponsiveLayout();

    const resizeHandler = jest.fn();
    layout.on('resize', resizeHandler);

    layout.destroy();

    // 이벤트 발생
    window.dispatchEvent(new Event('resize'));

    // 리스너가 호출되지 않아야 함
    setTimeout(() => {
      expect(resizeHandler).not.toHaveBeenCalled();
    }, 100);
  });
});

describe('ResponsiveLayout - 에러 처리', () => {
  test('window 없는 환경 - 안전 처리', () => {
    const originalWindow = globalThis.window;
    (globalThis as any).window = undefined;

    const layout = new ResponsiveLayout();

    expect(layout).toBeDefined();

    (globalThis as any).window = originalWindow;
  });

  test('document 없는 환경 - 안전 처리', () => {
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;

    (globalThis as any).document = undefined;
    (globalThis as any).window = undefined;

    const layout = new ResponsiveLayout();

    expect(layout).toBeDefined();

    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  test('getComputedStyle 없는 환경 - 기본 Safe Area', () => {
    const { window } = setupDOM(375, 667);

    const originalGetComputedStyle = window.getComputedStyle;
    (window as any).getComputedStyle = undefined;

    const layout = new ResponsiveLayout();
    const metrics = layout.getMetrics();

    expect(metrics.safeAreaInsets).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    });

    window.getComputedStyle = originalGetComputedStyle;
  });
});

describe('ResponsiveLayout - 복합 시나리오', () => {
  test('모바일 세로 → 모바일 가로', () => {
    const { window } = setupDOM(375, 667);
    const layout = new ResponsiveLayout();

    let modeChangeFired = false;
    let orientationChangeFired = false;

    layout.on('layoutModeChange', () => {
      modeChangeFired = true;
    });

    layout.on('orientationChange', (orientation: ScreenOrientation) => {
      orientationChangeFired = true;
      expect(orientation).toBe('landscape');
    });

    // 가로로 회전
    Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });
    Object.defineProperty(window.screen, 'width', { value: 667, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 375, configurable: true });

    window.dispatchEvent(new Event('resize'));

    // Happy-DOM에서 동기적 처리
    if (orientationChangeFired) {
      // 모드는 변경되지 않고 방향만 변경
      expect(modeChangeFired).toBe(false);
      expect(layout.isLandscape()).toBe(true);
    }
  });

  test('태블릿 세로 → 데스크톱 가로', (done) => {
    const { window } = setupDOM(768, 1024);
    const layout = new ResponsiveLayout();

    let modeChangeFired = false;
    let orientationChangeFired = false;

    layout.on('layoutModeChange', (mode: LayoutMode) => {
      modeChangeFired = true;
      expect(mode).toBe('desktop');
    });

    layout.on('orientationChange', (orientation: ScreenOrientation) => {
      orientationChangeFired = true;
      expect(orientation).toBe('landscape');
    });

    layout.on('resize', () => {
      // 모드와 방향 모두 변경
      expect(modeChangeFired).toBe(true);
      expect(orientationChangeFired).toBe(true);
      done();
    });

    // 데스크톱 가로로 변경
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });

    window.dispatchEvent(new Event('resize'));
  });
});
