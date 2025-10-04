/**
 * 반응형 레이아웃 관리자
 * 화면 크기와 방향에 따라 레이아웃을 동적으로 조정합니다.
 */

import { EventEmitter } from '../utils/events.js';
import type {
  LayoutMode,
  ScreenOrientation,
  ResponsiveLayoutConfig,
  LayoutMetrics
} from './types.js';

/**
 * 반응형 레이아웃 클래스
 */
export class ResponsiveLayout extends EventEmitter {
  private config: ResponsiveLayoutConfig;
  private metrics: LayoutMetrics;
  private resizeObserver: ResizeObserver | null = null;
  private orientationMediaQuery: MediaQueryList | null = null;

  constructor(config?: Partial<ResponsiveLayoutConfig>) {
    super();

    this.config = {
      breakpoints: {
        mobile: 480,
        tablet: 768,
        desktop: 1024
      },
      autoAdjust: true,
      preserveAspectRatio: true,
      virtualKeyboardPadding: 0,
      ...config
    };

    this.metrics = this.calculateMetrics();

    if (this.config.autoAdjust) {
      this.setupResponsive();
    }
  }

  /**
   * 반응형 설정
   */
  private setupResponsive(): void {
    if (typeof window === 'undefined') return;

    // ResizeObserver로 뷰포트 크기 변화 감지
    if ('ResizeObserver' in window && window.ResizeObserver) {
      this.resizeObserver = new window.ResizeObserver(() => {
        this.handleResize();
      });

      const body = typeof document !== 'undefined' ? document.body : null;
      if (body) {
        this.resizeObserver.observe(body);
      }
    }

    // resize 이벤트 리스너 추가 (폴백 또는 추가 지원)
    window.addEventListener('resize', this.handleResize.bind(this));

    // 화면 방향 변화 감지
    const orientationQuery = window.matchMedia('(orientation: portrait)');
    const handleOrientationChange = this.handleOrientationChange.bind(this);

    if ('addEventListener' in orientationQuery) {
      orientationQuery.addEventListener('change', handleOrientationChange);
    } else {
      // 구형 브라우저 폴백
      window.addEventListener('orientationchange', handleOrientationChange);
    }
    this.orientationMediaQuery = orientationQuery;

    // 가상 키보드 대응
    this.setupVirtualKeyboardHandling();
  }

  /**
   * 레이아웃 메트릭 계산
   */
  private calculateMetrics(): LayoutMetrics {
    const win = typeof window !== 'undefined' ? window : null;

    const viewportWidth = win?.innerWidth || 1024;
    const viewportHeight = win?.innerHeight || 768;
    const pixelRatio = win?.devicePixelRatio || 1;

    // 레이아웃 모드 결정
    let mode: LayoutMode;
    if (viewportWidth < this.config.breakpoints.mobile) {
      mode = 'compact';
    } else if (viewportWidth < this.config.breakpoints.tablet) {
      mode = 'mobile';
    } else if (viewportWidth < this.config.breakpoints.desktop) {
      mode = 'tablet';
    } else {
      mode = 'desktop';
    }

    // 화면 방향
    const orientation: ScreenOrientation =
      viewportWidth > viewportHeight ? 'landscape' : 'portrait';

    // Safe Area 계산 (iOS notch 등)
    const safeAreaInsets = this.getSafeAreaInsets();

    return {
      mode,
      orientation,
      viewportWidth,
      viewportHeight,
      availableWidth: viewportWidth - safeAreaInsets.left - safeAreaInsets.right,
      availableHeight: viewportHeight - safeAreaInsets.top - safeAreaInsets.bottom,
      pixelRatio,
      safeAreaInsets
    };
  }

  /**
   * Safe Area Insets 가져오기
   */
  private getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    if (typeof window === 'undefined' || !window.getComputedStyle) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const style = window.getComputedStyle(document.documentElement);

    return {
      top: parseInt(style.getPropertyValue('--sat') || '0', 10),
      right: parseInt(style.getPropertyValue('--sar') || '0', 10),
      bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
      left: parseInt(style.getPropertyValue('--sal') || '0', 10)
    };
  }

  /**
   * 리사이즈 핸들러
   */
  private handleResize(): void {
    const oldMode = this.metrics.mode;
    const oldOrientation = this.metrics.orientation;

    this.metrics = this.calculateMetrics();

    // 레이아웃 모드 변경 감지
    if (oldMode !== this.metrics.mode) {
      this.emit('layoutModeChange', this.metrics.mode);
      this.applyLayoutMode(this.metrics.mode);
    }

    // 방향 변경 감지
    if (oldOrientation !== this.metrics.orientation) {
      this.emit('orientationChange', this.metrics.orientation);
    }

    this.emit('resize', this.metrics);
  }

  /**
   * 화면 방향 변경 핸들러
   */
  private handleOrientationChange(): void {
    const oldOrientation = this.metrics.orientation;
    this.metrics = this.calculateMetrics();

    if (oldOrientation !== this.metrics.orientation) {
      this.emit('orientationChange', this.metrics.orientation);
      this.applyOrientation(this.metrics.orientation);
    }
  }

  /**
   * 가상 키보드 처리 설정
   */
  private setupVirtualKeyboardHandling(): void {
    if (typeof window === 'undefined') return;

    // Visual Viewport API 사용 (최신 브라우저)
    if ('visualViewport' in window && window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this.handleVirtualKeyboard();
      });
    } else {
      // 폴백: focusin/focusout 이벤트 사용
      window.addEventListener('focusin', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          setTimeout(() => this.handleVirtualKeyboard(), 300);
        }
      });

      window.addEventListener('focusout', () => {
        setTimeout(() => this.handleVirtualKeyboard(), 300);
      });
    }
  }

  /**
   * 가상 키보드 핸들러
   */
  private handleVirtualKeyboard(): void {
    if (typeof window === 'undefined') return;

    const visualViewport = window.visualViewport;
    const windowHeight = window.innerHeight;

    if (visualViewport) {
      const keyboardHeight = windowHeight - visualViewport.height;

      if (keyboardHeight > 0) {
        this.emit('virtualKeyboardShow', keyboardHeight);
        this.applyKeyboardPadding(keyboardHeight);
      } else {
        this.emit('virtualKeyboardHide');
        this.removeKeyboardPadding();
      }
    }
  }

  /**
   * 레이아웃 모드 적용
   */
  private applyLayoutMode(mode: LayoutMode): void {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!body) return;

    // 기존 레이아웃 클래스 제거
    body.classList.remove('layout-desktop', 'layout-tablet', 'layout-mobile', 'layout-compact');

    // 새 레이아웃 클래스 추가
    body.classList.add(`layout-${mode}`);

    console.log(`📱 Layout mode changed to: ${mode}`);
  }

  /**
   * 화면 방향 적용
   */
  private applyOrientation(orientation: ScreenOrientation): void {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!body) return;

    // 기존 방향 클래스 제거
    body.classList.remove('orientation-portrait', 'orientation-landscape');

    // 새 방향 클래스 추가
    body.classList.add(`orientation-${orientation}`);

    console.log(`📱 Orientation changed to: ${orientation}`);
  }

  /**
   * 키보드 패딩 적용
   */
  private applyKeyboardPadding(keyboardHeight: number): void {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!body) return;

    const padding = keyboardHeight + this.config.virtualKeyboardPadding;
    body.style.paddingBottom = `${padding}px`;

    console.log(`⌨️ Virtual keyboard padding applied: ${padding}px`);
  }

  /**
   * 키보드 패딩 제거
   */
  private removeKeyboardPadding(): void {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!body) return;

    body.style.paddingBottom = '';

    console.log('⌨️ Virtual keyboard padding removed');
  }

  /**
   * 레이아웃 메트릭 가져오기
   */
  getMetrics(): LayoutMetrics {
    return { ...this.metrics };
  }

  /**
   * 현재 레이아웃 모드
   */
  getCurrentMode(): LayoutMode {
    return this.metrics.mode;
  }

  /**
   * 현재 화면 방향
   */
  getCurrentOrientation(): ScreenOrientation {
    return this.metrics.orientation;
  }

  /**
   * 레이아웃 모드 확인
   */
  isMobile(): boolean {
    return this.metrics.mode === 'mobile' || this.metrics.mode === 'compact';
  }

  isTablet(): boolean {
    return this.metrics.mode === 'tablet';
  }

  isDesktop(): boolean {
    return this.metrics.mode === 'desktop';
  }

  /**
   * 화면 방향 확인
   */
  isPortrait(): boolean {
    return this.metrics.orientation === 'portrait';
  }

  isLandscape(): boolean {
    return this.metrics.orientation === 'landscape';
  }

  /**
   * CSS 변수 설정
   */
  setCSSVariables(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (!root) return;

    root.style.setProperty('--viewport-width', `${this.metrics.viewportWidth}px`);
    root.style.setProperty('--viewport-height', `${this.metrics.viewportHeight}px`);
    root.style.setProperty('--available-width', `${this.metrics.availableWidth}px`);
    root.style.setProperty('--available-height', `${this.metrics.availableHeight}px`);
    root.style.setProperty('--pixel-ratio', `${this.metrics.pixelRatio}`);
    root.style.setProperty('--safe-area-inset-top', `${this.metrics.safeAreaInsets.top}px`);
    root.style.setProperty('--safe-area-inset-right', `${this.metrics.safeAreaInsets.right}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${this.metrics.safeAreaInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${this.metrics.safeAreaInsets.left}px`);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<ResponsiveLayoutConfig>): void {
    this.config = { ...this.config, ...config };
    this.metrics = this.calculateMetrics();
  }

  /**
   * 정리
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.removeAllListeners();
  }
}
