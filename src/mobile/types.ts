/**
 * 모바일 최적화 타입 정의
 */

/**
 * 터치 제스처 타입
 */
export type GestureType =
  | 'tap'
  | 'doubletap'
  | 'longpress'
  | 'swipe'
  | 'pinch'
  | 'drag';

/**
 * 스와이프 방향
 */
export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * 터치 포인트
 */
export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  identifier: number;
}

/**
 * 제스처 이벤트 데이터
 */
export interface GestureEvent {
  type: GestureType;
  startPoint: TouchPoint;
  endPoint: TouchPoint;
  deltaX: number;
  deltaY: number;
  distance: number;
  duration: number;
  velocity: number;
  direction?: SwipeDirection | undefined;
  scale?: number | undefined;
}

/**
 * 제스처 설정
 */
export interface GestureConfig {
  tapMaxDuration: number;
  doubleTapMaxInterval: number;
  longPressMinDuration: number;
  swipeMinDistance: number;
  swipeMaxDuration: number;
  pinchMinScale: number;
  dragMinDistance: number;
}

/**
 * 레이아웃 모드
 */
export type LayoutMode = 'desktop' | 'tablet' | 'mobile' | 'compact';

/**
 * 화면 방향
 */
export type ScreenOrientation = 'portrait' | 'landscape';

/**
 * 반응형 레이아웃 설정
 */
export interface ResponsiveLayoutConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  autoAdjust: boolean;
  preserveAspectRatio: boolean;
  virtualKeyboardPadding: number;
}

/**
 * 레이아웃 메트릭
 */
export interface LayoutMetrics {
  mode: LayoutMode;
  orientation: ScreenOrientation;
  viewportWidth: number;
  viewportHeight: number;
  availableWidth: number;
  availableHeight: number;
  pixelRatio: number;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * 성능 모드
 */
export type PerformanceMode = 'high' | 'balanced' | 'battery-saver';

/**
 * 모바일 성능 설정
 */
export interface PerformanceConfig {
  mode: PerformanceMode;
  maxFPS: number;
  enableGPU: boolean;
  enableOffscreenCanvas: boolean;
  throttleInterval: number;
}
