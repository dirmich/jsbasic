/**
 * PixelBuffer Unit Tests
 *
 * 픽셀 버퍼의 기본 기능을 테스트합니다.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { PixelBuffer } from '../../src/graphics/pixel-buffer';

describe('PixelBuffer', () => {
  let buffer: PixelBuffer;

  beforeEach(() => {
    buffer = new PixelBuffer(320, 200);
  });

  describe('Constructor', () => {
    test('should create buffer with correct dimensions', () => {
      expect(buffer.getWidth()).toBe(320);
      expect(buffer.getHeight()).toBe(200);
    });

    test('should initialize all pixels to 0', () => {
      const data = buffer.getData();
      expect(data.length).toBe(320 * 200);
      expect(data.every(pixel => pixel === 0)).toBe(true);
    });
  });

  describe('setPixel', () => {
    test('should set pixel at valid coordinates', () => {
      buffer.setPixel(10, 20, 15);
      expect(buffer.getPixel(10, 20)).toBe(15);
    });

    test('should set pixel at boundary (0, 0)', () => {
      buffer.setPixel(0, 0, 7);
      expect(buffer.getPixel(0, 0)).toBe(7);
    });

    test('should set pixel at boundary (width-1, height-1)', () => {
      buffer.setPixel(319, 199, 14);
      expect(buffer.getPixel(319, 199)).toBe(14);
    });

    test('should mask color to 8-bit (0xFF)', () => {
      buffer.setPixel(10, 10, 256);
      expect(buffer.getPixel(10, 10)).toBe(0); // 256 & 0xFF = 0

      buffer.setPixel(10, 10, 511);
      expect(buffer.getPixel(10, 10)).toBe(255); // 511 & 0xFF = 255
    });

    test('should handle negative coordinates (ignore)', () => {
      buffer.setPixel(-1, 10, 15);
      buffer.setPixel(10, -1, 15);

      // Should not crash, but won't set any pixels
      expect(buffer.getPixel(0, 10)).toBe(0);
      expect(buffer.getPixel(10, 0)).toBe(0);
    });

    test('should handle out-of-bounds coordinates (ignore)', () => {
      buffer.setPixel(320, 10, 15);
      buffer.setPixel(10, 200, 15);

      // Should not crash
      expect(buffer.getPixel(319, 10)).toBe(0);
      expect(buffer.getPixel(10, 199)).toBe(0);
    });

    test('should handle floating point coordinates (floor)', () => {
      buffer.setPixel(10.7, 20.3, 15);
      expect(buffer.getPixel(10, 20)).toBe(15);
      expect(buffer.getPixel(11, 20)).toBe(0);
    });
  });

  describe('getPixel', () => {
    test('should return pixel color at valid coordinates', () => {
      buffer.setPixel(50, 75, 12);
      expect(buffer.getPixel(50, 75)).toBe(12);
    });

    test('should return 0 for out-of-bounds coordinates', () => {
      expect(buffer.getPixel(-1, 0)).toBe(0);
      expect(buffer.getPixel(0, -1)).toBe(0);
      expect(buffer.getPixel(320, 0)).toBe(0);
      expect(buffer.getPixel(0, 200)).toBe(0);
    });

    test('should handle floating point coordinates (floor)', () => {
      buffer.setPixel(10, 20, 15);
      expect(buffer.getPixel(10.9, 20.9)).toBe(15);
    });
  });

  describe('clear', () => {
    test('should clear buffer to default color (0)', () => {
      buffer.setPixel(10, 10, 15);
      buffer.setPixel(50, 50, 7);

      buffer.clear();

      expect(buffer.getPixel(10, 10)).toBe(0);
      expect(buffer.getPixel(50, 50)).toBe(0);
    });

    test('should clear buffer to specified color', () => {
      buffer.clear(5);

      const data = buffer.getData();
      expect(data.every(pixel => pixel === 5)).toBe(true);
    });

    test('should mask clear color to 8-bit', () => {
      buffer.clear(256);
      expect(buffer.getPixel(0, 0)).toBe(0); // 256 & 0xFF = 0

      buffer.clear(511);
      expect(buffer.getPixel(0, 0)).toBe(255); // 511 & 0xFF = 255
    });
  });

  describe('getData', () => {
    test('should return underlying Uint8Array', () => {
      const data = buffer.getData();
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(320 * 200);
    });

    test('should return same array instance', () => {
      const data1 = buffer.getData();
      const data2 = buffer.getData();
      expect(data1).toBe(data2);
    });
  });

  describe('copyFrom', () => {
    test('should copy from source buffer', () => {
      const source = new PixelBuffer(320, 200);
      source.setPixel(10, 20, 15);
      source.setPixel(50, 75, 7);

      buffer.copyFrom(source);

      expect(buffer.getPixel(10, 20)).toBe(15);
      expect(buffer.getPixel(50, 75)).toBe(7);
    });

    test('should throw error for size mismatch', () => {
      const source = new PixelBuffer(640, 200);

      expect(() => {
        buffer.copyFrom(source);
      }).toThrow('Buffer size mismatch');
    });
  });

  describe('copyRegion', () => {
    test('should copy rectangular region', () => {
      const source = new PixelBuffer(320, 200);

      // Fill 5x5 region with color 15
      for (let y = 10; y < 15; y++) {
        for (let x = 10; x < 15; x++) {
          source.setPixel(x, y, 15);
        }
      }

      // Copy to different location
      buffer.copyRegion(source, 10, 10, 50, 50, 5, 5);

      // Verify copied region
      for (let y = 50; y < 55; y++) {
        for (let x = 50; x < 55; x++) {
          expect(buffer.getPixel(x, y)).toBe(15);
        }
      }

      // Verify original location in destination is still 0
      expect(buffer.getPixel(10, 10)).toBe(0);
    });

    test('should handle partial out-of-bounds copy gracefully', () => {
      const source = new PixelBuffer(320, 200);
      source.setPixel(5, 5, 15);

      // Try to copy region that extends beyond buffer
      buffer.copyRegion(source, 0, 0, 315, 195, 10, 10);

      // Should copy what fits
      expect(buffer.getPixel(315, 195)).toBe(0); // Source (0,0) is 0
    });

    test('should copy 1x1 region (single pixel)', () => {
      const source = new PixelBuffer(320, 200);
      source.setPixel(10, 20, 15);

      buffer.copyRegion(source, 10, 20, 100, 100, 1, 1);

      expect(buffer.getPixel(100, 100)).toBe(15);
    });
  });

  describe('Performance', () => {
    test('should handle large number of setPixel operations', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        buffer.setPixel(i % 320, Math.floor(i / 320), i % 16);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 10k operations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle clear operation efficiently', () => {
      const startTime = performance.now();

      buffer.clear(15);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 10ms (Uint8Array.fill is very fast)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero-sized region copy', () => {
      const source = new PixelBuffer(320, 200);

      // Should not crash
      buffer.copyRegion(source, 0, 0, 0, 0, 0, 0);
    });

    test('should handle maximum coordinates', () => {
      buffer.setPixel(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 15);

      // Should not crash, but won't set pixel (out of bounds)
      expect(buffer.getPixel(0, 0)).toBe(0);
    });

    test('should handle minimum coordinates', () => {
      buffer.setPixel(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 15);

      // Should not crash, but won't set pixel (out of bounds)
      expect(buffer.getPixel(0, 0)).toBe(0);
    });
  });
});
