/**
 * 모바일 최적화 모듈
 * 터치 제스처, 반응형 레이아웃, 성능 최적화를 제공합니다.
 */

export { MobileOptimizer, mobileOptimizer } from './mobile-optimizer.js';
export { GestureHandler } from './gesture-handler.js';
export { ResponsiveLayout } from './responsive-layout.js';

export type {
  MobileConfiguration,
  MobileCapabilities,
  MobileMetrics
} from './mobile-optimizer.js';

export type {
  GestureType,
  SwipeDirection,
  TouchPoint,
  GestureEvent,
  GestureConfig,
  LayoutMode,
  ScreenOrientation,
  ResponsiveLayoutConfig,
  LayoutMetrics,
  PerformanceMode,
  PerformanceConfig
} from './types.js';
