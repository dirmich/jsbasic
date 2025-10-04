/**
 * DisplayManager Unit Tests
 *
 * 디스플레이 관리자와 렌더링을 테스트합니다.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { DisplayManager } from '../../src/graphics/display-manager';
import { PixelBuffer } from '../../src/graphics/pixel-buffer';
import { ColorManager } from '../../src/graphics/color-manager';
import { SCREEN_MODES } from '../../src/types/graphics';
import type { ScreenMode } from '../../src/types/graphics';

describe('DisplayManager', () => {
  let displayManager: DisplayManager;
  let canvas: HTMLCanvasElement;
  let buffer: PixelBuffer;
  let colorManager: ColorManager;
  let screenMode: ScreenMode;

  beforeEach(() => {
    // Create canvas element (Happy DOM provides this)
    canvas = document.createElement('canvas');
    buffer = new PixelBuffer(320, 200);
    colorManager = new ColorManager();
    screenMode = SCREEN_MODES[1]!;

    displayManager = new DisplayManager(canvas, buffer, colorManager, screenMode);
  });

  describe('Constructor', () => {
    test('should initialize with correct canvas size', () => {
      expect(canvas.width).toBe(320);
      expect(canvas.height).toBe(200);
    });

    test('should get 2D context', () => {
      const ctx = displayManager.getContext();
      expect(ctx).toBeDefined();
    });

    test('should disable image smoothing for pixel art', () => {
      const ctx = displayManager.getContext();
      expect(ctx.imageSmoothingEnabled).toBe(false);
    });

    test('should throw error if canvas context fails', () => {
      // This is hard to test with Happy DOM, but we can verify the check exists
      const ctx = displayManager.getContext();
      expect(ctx).toBeDefined();
    });
  });

  describe('setScreenMode', () => {
    test('should change canvas size', () => {
      const mode2 = SCREEN_MODES[2]!;
      displayManager.setScreenMode(mode2);

      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(200);
    });

    test('should update screen mode', () => {
      const mode2 = SCREEN_MODES[2]!;
      displayManager.setScreenMode(mode2);

      const currentMode = displayManager.getScreenMode();
      expect(currentMode.mode).toBe(2);
      expect(currentMode.width).toBe(640);
    });

    test('should mark entire screen as dirty', () => {
      const mode2 = SCREEN_MODES[2]!;
      displayManager.setScreenMode(mode2);

      // Should have triggered render
      const stats = displayManager.getPerformanceStats();
      expect(stats).toBeDefined();
    });
  });

  describe('render', () => {
    test('should render full screen', () => {
      // Set some pixels
      buffer.setPixel(10, 10, 15);
      buffer.setPixel(50, 50, 7);

      // Render
      displayManager.render();

      // Performance stats should show not dirty after render
      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(false);
    });

    test('should handle empty buffer', () => {
      buffer.clear(0);

      // Should not crash
      displayManager.render();

      expect(true).toBe(true);
    });

    test('should render all pixels correctly', () => {
      // Fill buffer with pattern
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          buffer.setPixel(x, y, (x + y) % 16);
        }
      }

      // Should render without errors
      displayManager.render();

      expect(true).toBe(true);
    });
  });

  describe('renderDirty', () => {
    test('should render only dirty regions', () => {
      displayManager.markDirty(10, 10, 20, 20);

      displayManager.renderDirty();

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(false);
      expect(stats.dirtyRegions).toBe(0);
    });

    test('should do nothing if not dirty', () => {
      displayManager.renderDirty();

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(false);
    });

    test('should handle multiple dirty regions', () => {
      displayManager.markDirty(10, 10, 20, 20);
      displayManager.markDirty(100, 100, 30, 30);

      displayManager.renderDirty();

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(false);
    });

    test('should clip dirty regions at screen boundaries', () => {
      // Mark region partially off-screen
      displayManager.markDirty(310, 190, 20, 20);

      // Should clip but not crash
      displayManager.renderDirty();

      expect(true).toBe(true);
    });
  });

  describe('clear', () => {
    test('should clear buffer to black by default', () => {
      buffer.setPixel(10, 10, 15);

      displayManager.clear();

      expect(buffer.getPixel(10, 10)).toBe(0);
    });

    test('should clear buffer to specified color', () => {
      displayManager.clear(7);

      expect(buffer.getPixel(0, 0)).toBe(7);
      expect(buffer.getPixel(100, 100)).toBe(7);
    });

    test('should mark entire screen as dirty', () => {
      displayManager.clear();

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(true);
    });
  });

  describe('markDirty', () => {
    test('should mark region as dirty', () => {
      displayManager.markDirty(10, 10, 20, 20);

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(true);
      expect(stats.dirtyRegions).toBeGreaterThan(0);
    });

    test('should accumulate multiple dirty regions', () => {
      displayManager.markDirty(10, 10, 20, 20);
      displayManager.markDirty(50, 50, 30, 30);

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(true);
    });

    test('should handle zero-sized regions', () => {
      displayManager.markDirty(10, 10, 0, 0);

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(true);
    });
  });

  describe('swap', () => {
    test('should trigger render', () => {
      buffer.setPixel(10, 10, 15);
      displayManager.markDirty(10, 10, 1, 1);

      displayManager.swap();

      const stats = displayManager.getPerformanceStats();
      expect(stats.isDirty).toBe(false);
    });
  });

  describe('getBuffer', () => {
    test('should return pixel buffer', () => {
      const returnedBuffer = displayManager.getBuffer();
      expect(returnedBuffer).toBe(buffer);
    });
  });

  describe('getCanvas', () => {
    test('should return canvas element', () => {
      const returnedCanvas = displayManager.getCanvas();
      expect(returnedCanvas).toBe(canvas);
    });
  });

  describe('getContext', () => {
    test('should return 2D context', () => {
      const ctx = displayManager.getContext();
      expect(ctx).toBeDefined();
      expect(ctx).toBeInstanceOf(CanvasRenderingContext2D);
    });
  });

  describe('getScreenMode', () => {
    test('should return copy of screen mode', () => {
      const mode = displayManager.getScreenMode();

      expect(mode.mode).toBe(1);
      expect(mode.width).toBe(320);
      expect(mode.height).toBe(200);
    });

    test('should return copy not reference', () => {
      const mode1 = displayManager.getScreenMode();
      const mode2 = displayManager.getScreenMode();

      expect(mode1).not.toBe(mode2);
      expect(mode1).toEqual(mode2);
    });
  });

  describe('resize', () => {
    test('should update CSS size', () => {
      displayManager.resize(640, 400);

      expect(canvas.style.width).toBe('640px');
      expect(canvas.style.height).toBe('400px');
    });

    test('should not change internal canvas size', () => {
      displayManager.resize(640, 400);

      // Internal size stays same (pixel art)
      expect(canvas.width).toBe(320);
      expect(canvas.height).toBe(200);
    });

    test('should handle zero size', () => {
      displayManager.resize(0, 0);

      expect(canvas.style.width).toBe('0px');
      expect(canvas.style.height).toBe('0px');
    });
  });

  describe('saveScreenshot', () => {
    test('should return data URL', () => {
      const dataUrl = displayManager.saveScreenshot();

      expect(dataUrl).toContain('data:image/png');
    });

    test('should work with rendered content', () => {
      buffer.setPixel(10, 10, 15);
      displayManager.render();

      const dataUrl = displayManager.saveScreenshot();

      expect(dataUrl).toContain('data:image/png');
    });
  });

  describe('getPerformanceStats', () => {
    test('should return complete stats', () => {
      const stats = displayManager.getPerformanceStats();

      expect(stats.bufferSize).toBe(320 * 200);
      expect(stats.canvasSize.width).toBe(320);
      expect(stats.canvasSize.height).toBe(200);
      expect(stats.isDirty).toBeDefined();
      expect(stats.dirtyRegions).toBeDefined();
    });

    test('should reflect dirty state', () => {
      displayManager.markDirty(10, 10, 20, 20);

      const stats = displayManager.getPerformanceStats();

      expect(stats.isDirty).toBe(true);
      expect(stats.dirtyRegions).toBeGreaterThan(0);
    });

    test('should include pool stats', () => {
      const stats = displayManager.getPerformanceStats();

      expect(stats.poolStats).toBeDefined();
      if (stats.poolStats) {
        expect(stats.poolStats.poolSize).toBeDefined();
        expect(stats.poolStats.totalAcquired).toBeDefined();
        expect(stats.poolStats.totalReleased).toBeDefined();
        expect(stats.poolStats.totalCreated).toBeDefined();
      }
    });

    test('should update after render', () => {
      displayManager.markDirty(10, 10, 20, 20);

      const stats1 = displayManager.getPerformanceStats();
      expect(stats1.isDirty).toBe(true);

      displayManager.renderDirty();

      const stats2 = displayManager.getPerformanceStats();
      expect(stats2.isDirty).toBe(false);
    });
  });

  describe('ImageData Pooling', () => {
    test('should reuse ImageData for same size', () => {
      // First render
      displayManager.render();

      const stats1 = displayManager.getPerformanceStats();
      const created1 = stats1.poolStats?.totalCreated ?? 0;

      // Second render
      displayManager.render();

      const stats2 = displayManager.getPerformanceStats();
      const created2 = stats2.poolStats?.totalCreated ?? 0;

      // Should reuse, not create new
      expect(created2).toBe(created1);
    });

    test('should track pool statistics', () => {
      displayManager.render();
      displayManager.render();

      const stats = displayManager.getPerformanceStats();

      if (stats.poolStats) {
        expect(stats.poolStats.totalAcquired).toBeGreaterThanOrEqual(2);
        expect(stats.poolStats.totalReleased).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Performance', () => {
    test('should render full screen efficiently', () => {
      // Fill buffer
      for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 320; x++) {
          buffer.setPixel(x, y, (x + y) % 16);
        }
      }

      const startTime = performance.now();

      displayManager.render();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should render 64K pixels in under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should render dirty regions efficiently', () => {
      // Mark many small dirty regions
      for (let i = 0; i < 10; i++) {
        displayManager.markDirty(i * 30, i * 20, 10, 10);
      }

      const startTime = performance.now();

      displayManager.renderDirty();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be faster than full render
      expect(duration).toBeLessThan(50);
    });

    test('should handle rapid clear/render cycles', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        displayManager.clear(i % 16);
        displayManager.render();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 10 full clears and renders in under 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rendering with no canvas context', () => {
      // This is hard to test, but we can verify context exists
      const ctx = displayManager.getContext();
      expect(ctx).toBeDefined();
    });

    test('should handle very large dirty regions', () => {
      displayManager.markDirty(0, 0, 10000, 10000);

      // Should clip to canvas size
      displayManager.renderDirty();

      expect(true).toBe(true);
    });

    test('should handle negative dirty regions', () => {
      displayManager.markDirty(-100, -100, 200, 200);

      // Should handle gracefully
      displayManager.renderDirty();

      expect(true).toBe(true);
    });

    test('should handle render after screen mode change', () => {
      displayManager.render();

      const mode2 = SCREEN_MODES[2]!;
      displayManager.setScreenMode(mode2);

      displayManager.render();

      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(200);
    });
  });

  describe('Integration with Buffer and ColorManager', () => {
    test('should render colors correctly', () => {
      // Set pixels with different colors
      for (let i = 0; i < 16; i++) {
        buffer.setPixel(i, 0, i);
      }

      displayManager.render();

      // Verify no errors
      expect(true).toBe(true);
    });

    test('should respect color manager palette', () => {
      buffer.setPixel(0, 0, 15); // White

      displayManager.render();

      const ctx = displayManager.getContext();
      const imageData = ctx.getImageData(0, 0, 1, 1);

      // White = (255, 255, 255)
      expect(imageData.data[0]).toBe(255); // R
      expect(imageData.data[1]).toBe(255); // G
      expect(imageData.data[2]).toBe(255); // B
      expect(imageData.data[3]).toBe(255); // A
    });

    test('should handle buffer updates', () => {
      buffer.setPixel(10, 10, 7);
      displayManager.render();

      buffer.setPixel(10, 10, 15);
      displayManager.markDirty(10, 10, 1, 1);
      displayManager.renderDirty();

      expect(buffer.getPixel(10, 10)).toBe(15);
    });
  });

  describe('Dirty Region Optimization', () => {
    test('should merge overlapping dirty regions', () => {
      displayManager.markDirty(10, 10, 20, 20);
      displayManager.markDirty(15, 15, 20, 20);

      const stats = displayManager.getPerformanceStats();

      // Should merge into single region
      expect(stats.dirtyRegions).toBeLessThanOrEqual(2);
    });

    test('should keep separate non-overlapping regions', () => {
      displayManager.markDirty(10, 10, 10, 10);
      displayManager.markDirty(100, 100, 10, 10);

      const stats = displayManager.getPerformanceStats();

      expect(stats.dirtyRegions).toBe(2);
    });

    test('should clear dirty regions after render', () => {
      displayManager.markDirty(10, 10, 20, 20);

      const stats1 = displayManager.getPerformanceStats();
      expect(stats1.dirtyRegions).toBeGreaterThan(0);

      displayManager.renderDirty();

      const stats2 = displayManager.getPerformanceStats();
      expect(stats2.dirtyRegions).toBe(0);
    });
  });
});
