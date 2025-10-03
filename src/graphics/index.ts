/**
 * Graphics Module Exports
 *
 * 그래픽 시스템 통합 export
 */

export { GraphicsEngine } from './graphics-engine';
export { DisplayManager } from './display-manager';
export { PixelBuffer } from './pixel-buffer';
export { ColorManager } from './color-manager';
export { DirtyRectTracker } from './dirty-rect-tracker';

// 타입 re-export
export type {
  GraphicsEngineInterface,
  DisplayManagerInterface,
  PixelBufferInterface,
  ColorManagerInterface,
  DirtyRectTrackerInterface,
  GraphicsState,
  ScreenMode,
  LineOptions,
  CircleOptions,
  PaintOptions,
  RGB,
  Point,
  Rectangle,
  DirtyRect
} from '@/types/graphics';

// 상수 re-export
export { SCREEN_MODES, CGA_PALETTE } from '@/types/graphics';
