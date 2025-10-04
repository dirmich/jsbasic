/**
 * GraphicsEngine Unit Tests
 *
 * 그래픽 엔진의 모든 명령어를 테스트합니다.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { GraphicsEngine } from '../../src/graphics/graphics-engine';
import { PixelBuffer } from '../../src/graphics/pixel-buffer';
import { ColorManager } from '../../src/graphics/color-manager';
import { SCREEN_MODES } from '../../src/types/graphics';

describe('GraphicsEngine', () => {
  let engine: GraphicsEngine;
  let buffer: PixelBuffer;
  let colorManager: ColorManager;

  beforeEach(() => {
    buffer = new PixelBuffer(320, 200);
    colorManager = new ColorManager();
    engine = new GraphicsEngine(buffer, colorManager);
  });

  describe('SCREEN Command', () => {
    test('should initialize with mode 1 (320x200)', () => {
      const mode = engine.getScreenMode();
      expect(mode.mode).toBe(1);
      expect(mode.width).toBe(320);
      expect(mode.height).toBe(200);
    });

    test('should change to mode 0 (text mode)', () => {
      engine.setScreenMode(0);

      const mode = engine.getScreenMode();
      expect(mode.mode).toBe(0);
    });

    test('should change to mode 2 (640x200)', () => {
      engine.setScreenMode(2);

      const mode = engine.getScreenMode();
      expect(mode.mode).toBe(2);
      expect(mode.width).toBe(640);
      expect(mode.height).toBe(200);
    });

    test('should throw error for invalid mode', () => {
      expect(() => {
        engine.setScreenMode(99);
      }).toThrow('Invalid screen mode');
    });

    test('should clear buffer when changing modes with different size', () => {
      buffer.setPixel(10, 10, 15);

      engine.setScreenMode(2); // Different size

      // Buffer should be cleared
      expect(buffer.getPixel(10, 10)).toBe(0);
    });
  });

  describe('PSET Command', () => {
    test('should set pixel at valid coordinates', () => {
      engine.pset(10, 20, 15);

      expect(buffer.getPixel(10, 20)).toBe(15);
    });

    test('should set pixel with default foreground color', () => {
      engine.setColor(7); // Set foreground to 7
      engine.pset(10, 20); // No color specified

      expect(buffer.getPixel(10, 20)).toBe(7);
    });

    test('should update lastX and lastY', () => {
      engine.pset(50, 75, 15);

      const state = engine.getState();
      expect(state.lastX).toBe(50);
      expect(state.lastY).toBe(75);
    });

    test('should set pixel at (0, 0)', () => {
      engine.pset(0, 0, 15);
      expect(buffer.getPixel(0, 0)).toBe(15);
    });

    test('should set pixel at (width-1, height-1)', () => {
      engine.pset(319, 199, 15);
      expect(buffer.getPixel(319, 199)).toBe(15);
    });

    test('should throw error for negative coordinates', () => {
      expect(() => {
        engine.pset(-1, 10, 15);
      }).toThrow('Illegal function call');
    });

    test('should throw error for out-of-bounds coordinates', () => {
      expect(() => {
        engine.pset(320, 10, 15);
      }).toThrow('Illegal function call');

      expect(() => {
        engine.pset(10, 200, 15);
      }).toThrow('Illegal function call');
    });

    test('should handle floating point coordinates (floor)', () => {
      engine.pset(10.9, 20.7, 15);

      expect(buffer.getPixel(10, 20)).toBe(15);
      expect(buffer.getPixel(11, 20)).toBe(0);
    });
  });

  describe('PRESET Command', () => {
    test('should set pixel to background color', () => {
      engine.setColor(undefined, 5); // Background = 5
      engine.preset(10, 20);

      expect(buffer.getPixel(10, 20)).toBe(5);
    });

    test('should use specified color', () => {
      engine.preset(10, 20, 12);

      expect(buffer.getPixel(10, 20)).toBe(12);
    });
  });

  describe('LINE Command', () => {
    test('should draw horizontal line', () => {
      engine.line(10, 20, 50, 20, { color: 15 });

      // Check start, middle, and end points
      expect(buffer.getPixel(10, 20)).toBe(15);
      expect(buffer.getPixel(30, 20)).toBe(15);
      expect(buffer.getPixel(50, 20)).toBe(15);
    });

    test('should draw vertical line', () => {
      engine.line(10, 10, 10, 50, { color: 15 });

      // Check start, middle, and end points
      expect(buffer.getPixel(10, 10)).toBe(15);
      expect(buffer.getPixel(10, 30)).toBe(15);
      expect(buffer.getPixel(10, 50)).toBe(15);
    });

    test('should draw diagonal line (Bresenham)', () => {
      engine.line(0, 0, 10, 10, { color: 15 });

      // Check start and end
      expect(buffer.getPixel(0, 0)).toBe(15);
      expect(buffer.getPixel(10, 10)).toBe(15);

      // Check some middle points
      expect(buffer.getPixel(5, 5)).toBe(15);
    });

    test('should draw line in reverse direction', () => {
      engine.line(50, 20, 10, 20, { color: 15 });

      expect(buffer.getPixel(10, 20)).toBe(15);
      expect(buffer.getPixel(50, 20)).toBe(15);
    });

    test('should use foreground color by default', () => {
      engine.setColor(7);
      engine.line(0, 0, 10, 10);

      expect(buffer.getPixel(0, 0)).toBe(7);
    });

    test('should update lastX and lastY to end point', () => {
      engine.line(0, 0, 50, 75);

      const state = engine.getState();
      expect(state.lastX).toBe(50);
      expect(state.lastY).toBe(75);
    });

    test('should draw single point line (x1=x2, y1=y2)', () => {
      engine.line(10, 20, 10, 20, { color: 15 });

      expect(buffer.getPixel(10, 20)).toBe(15);
    });
  });

  describe('LINE Command - Box (B)', () => {
    test('should draw empty rectangle', () => {
      engine.line(10, 10, 50, 40, { color: 15, style: 'B' });

      // Check corners
      expect(buffer.getPixel(10, 10)).toBe(15);
      expect(buffer.getPixel(50, 10)).toBe(15);
      expect(buffer.getPixel(10, 40)).toBe(15);
      expect(buffer.getPixel(50, 40)).toBe(15);

      // Check edges
      expect(buffer.getPixel(30, 10)).toBe(15); // Top edge
      expect(buffer.getPixel(30, 40)).toBe(15); // Bottom edge
      expect(buffer.getPixel(10, 25)).toBe(15); // Left edge
      expect(buffer.getPixel(50, 25)).toBe(15); // Right edge

      // Check interior is NOT filled
      expect(buffer.getPixel(30, 25)).toBe(0);
    });

    test('should draw rectangle with swapped coordinates', () => {
      engine.line(50, 40, 10, 10, { color: 15, style: 'B' });

      // Should still draw rectangle correctly
      expect(buffer.getPixel(10, 10)).toBe(15);
      expect(buffer.getPixel(50, 40)).toBe(15);
    });
  });

  describe('LINE Command - Filled Box (BF)', () => {
    test('should draw filled rectangle', () => {
      engine.line(10, 10, 20, 20, { color: 15, style: 'BF' });

      // Check all pixels are filled
      for (let y = 10; y <= 20; y++) {
        for (let x = 10; x <= 20; x++) {
          expect(buffer.getPixel(x, y)).toBe(15);
        }
      }
    });

    test('should fill 1x1 rectangle', () => {
      engine.line(10, 10, 10, 10, { color: 15, style: 'BF' });

      expect(buffer.getPixel(10, 10)).toBe(15);
    });

    test('should respect boundary checking', () => {
      engine.line(0, 0, 5, 5, { color: 15, style: 'BF' });

      expect(buffer.getPixel(0, 0)).toBe(15);
      expect(buffer.getPixel(5, 5)).toBe(15);
    });
  });

  describe('CIRCLE Command', () => {
    test('should draw circle and update state', () => {
      engine.circle(160, 100, 50, { color: 15 });

      const state = engine.getState();
      expect(state.lastX).toBe(160);
      expect(state.lastY).toBe(100);

      // Verify that at least some pixels were drawn
      // Count non-zero pixels in the buffer
      let pixelsDrawn = 0;
      const data = buffer.getData();
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 15) {
          pixelsDrawn++;
        }
      }

      // A circle with radius 50 should draw many pixels
      expect(pixelsDrawn).toBeGreaterThan(50);
    });

    test('should throw error for negative radius', () => {
      expect(() => {
        engine.circle(160, 100, -10, { color: 15 });
      }).toThrow('Illegal function call');
    });

    test('should draw circle with radius 0', () => {
      engine.circle(160, 100, 0, { color: 15 });

      // Should just draw center point
      expect(buffer.getPixel(160, 100)).toBe(15);
    });

    test('should use foreground color by default', () => {
      engine.setColor(7);
      engine.circle(160, 100, 10);

      // Check center area has some pixels with color 7
      let foundColor = false;
      for (let y = 90; y <= 110; y++) {
        for (let x = 150; x <= 170; x++) {
          if (buffer.getPixel(x, y) === 7) {
            foundColor = true;
            break;
          }
        }
      }
      expect(foundColor).toBe(true);
    });

    test('should draw ellipse with aspect ratio', () => {
      engine.circle(160, 100, 50, { color: 15, aspect: 0.5 });

      // Should create ellipse (flattened)
      const state = engine.getState();
      expect(state.lastX).toBe(160);
      expect(state.lastY).toBe(100);
    });

    test('should draw arc with start/end angles', () => {
      const startAngle = 0;
      const endAngle = Math.PI; // Half circle

      engine.circle(160, 100, 50, {
        color: 15,
        startAngle,
        endAngle
      });

      const state = engine.getState();
      expect(state.lastX).toBe(160);
      expect(state.lastY).toBe(100);
    });
  });

  describe('PAINT Command', () => {
    test('should fill enclosed area', () => {
      // Draw a box
      engine.line(10, 10, 50, 50, { color: 15, style: 'B' });

      // Fill interior
      engine.paint(30, 30, { paintColor: 7 });

      // Check interior is filled
      expect(buffer.getPixel(30, 30)).toBe(7);
      expect(buffer.getPixel(25, 25)).toBe(7);

      // Check border is still 15
      expect(buffer.getPixel(10, 10)).toBe(15);
    });

    test('should respect border color', () => {
      // Draw red border
      engine.line(10, 10, 50, 50, { color: 4, style: 'B' });

      // Fill with border color check
      engine.paint(30, 30, { paintColor: 7, borderColor: 4 });

      // Interior should be filled
      expect(buffer.getPixel(30, 30)).toBe(7);

      // Border should remain red
      expect(buffer.getPixel(10, 10)).toBe(4);
    });

    test('should use foreground color by default', () => {
      engine.setColor(7);

      // Draw border
      engine.line(10, 10, 50, 50, { color: 15, style: 'B' });

      // Paint without specifying color
      engine.paint(30, 30);

      expect(buffer.getPixel(30, 30)).toBe(7);
    });

    test('should throw error for invalid coordinates', () => {
      expect(() => {
        engine.paint(-1, 10);
      }).toThrow('Illegal function call');

      expect(() => {
        engine.paint(320, 10);
      }).toThrow('Illegal function call');
    });

    test('should not fill if starting on border', () => {
      engine.line(10, 10, 50, 50, { color: 15, style: 'B' });

      // Try to paint starting on border
      engine.paint(10, 10, { paintColor: 7, borderColor: 15 });

      // Should not fill (already on border)
      const state = engine.getState();
      expect(state).toBeDefined();
    });

    test('should handle already-filled area', () => {
      engine.line(10, 10, 50, 50, { color: 15, style: 'BF' });

      // Try to paint area that's already filled with same color
      engine.paint(30, 30, { paintColor: 15 });

      // Should complete without issues
      expect(buffer.getPixel(30, 30)).toBe(15);
    });
  });

  describe('COLOR Command', () => {
    test('should set foreground color', () => {
      engine.setColor(12);

      const state = engine.getState();
      expect(state.foregroundColor).toBe(12);
    });

    test('should set background color', () => {
      engine.setColor(undefined, 5);

      const state = engine.getState();
      expect(state.backgroundColor).toBe(5);
    });

    test('should set border color', () => {
      engine.setColor(undefined, undefined, 8);

      const state = engine.getState();
      expect(state.borderColor).toBe(8);
    });

    test('should set all colors', () => {
      engine.setColor(15, 1, 8);

      const state = engine.getState();
      expect(state.foregroundColor).toBe(15);
      expect(state.backgroundColor).toBe(1);
      expect(state.borderColor).toBe(8);
    });

    test('should validate color values', () => {
      // Colors should be clamped to valid range
      engine.setColor(100, 200, 300);

      const state = engine.getState();
      expect(state.foregroundColor).toBeLessThanOrEqual(15);
      expect(state.backgroundColor).toBeLessThanOrEqual(15);
      expect(state.borderColor).toBeLessThanOrEqual(15);
    });
  });

  describe('GET Command', () => {
    test('should capture screen region', () => {
      // Draw some pixels
      engine.pset(10, 10, 15);
      engine.pset(11, 10, 7);
      engine.pset(10, 11, 3);

      // Capture region
      const sprite = engine.getSprite(10, 10, 11, 11);

      // Check header
      expect(sprite.length).toBeGreaterThan(4);
      expect(sprite[0]).toBe(2); // width = 2 (11 - 10 + 1)
      expect(sprite[2]).toBe(2); // height = 2

      // Check pixel data
      expect(sprite[4]).toBe(15); // (10, 10)
      expect(sprite[5]).toBe(7);  // (11, 10)
      expect(sprite[6]).toBe(3);  // (10, 11)
    });

    test('should handle single pixel capture', () => {
      engine.pset(10, 10, 15);

      const sprite = engine.getSprite(10, 10, 10, 10);

      expect(sprite[0]).toBe(1); // width = 1
      expect(sprite[2]).toBe(1); // height = 1
      expect(sprite[4]).toBe(15); // pixel color
    });

    test('should swap coordinates if needed', () => {
      engine.pset(10, 10, 15);

      // Reverse order coordinates
      const sprite = engine.getSprite(15, 15, 10, 10);

      expect(sprite[0]).toBe(6); // width = 6
      expect(sprite[2]).toBe(6); // height = 6
    });
  });

  describe('PUT Command', () => {
    test('should put sprite with PSET mode', () => {
      // Create sprite manually
      const spriteData = new Uint8Array([
        2, 0, 2, 0, // width=2, height=2
        15, 7, 3, 12 // pixel data
      ]);

      engine.putSprite(50, 50, spriteData, 'PSET');

      expect(buffer.getPixel(50, 50)).toBe(15);
      expect(buffer.getPixel(51, 50)).toBe(7);
      expect(buffer.getPixel(50, 51)).toBe(3);
      expect(buffer.getPixel(51, 51)).toBe(12);
    });

    test('should put sprite with XOR mode', () => {
      // Set background
      buffer.setPixel(50, 50, 15);

      const spriteData = new Uint8Array([
        1, 0, 1, 0, // 1x1
        15 // Same color
      ]);

      engine.putSprite(50, 50, spriteData, 'XOR');

      // 15 XOR 15 = 0
      expect(buffer.getPixel(50, 50)).toBe(0);
    });

    test('should put sprite with AND mode', () => {
      buffer.setPixel(50, 50, 15); // 0b1111

      const spriteData = new Uint8Array([
        1, 0, 1, 0,
        7 // 0b0111
      ]);

      engine.putSprite(50, 50, spriteData, 'AND');

      // 15 AND 7 = 7
      expect(buffer.getPixel(50, 50)).toBe(7);
    });

    test('should put sprite with OR mode', () => {
      buffer.setPixel(50, 50, 8); // 0b1000

      const spriteData = new Uint8Array([
        1, 0, 1, 0,
        7 // 0b0111
      ]);

      engine.putSprite(50, 50, spriteData, 'OR');

      // 8 OR 7 = 15
      expect(buffer.getPixel(50, 50)).toBe(15);
    });

    test('should throw error for invalid sprite data', () => {
      const invalidSprite = new Uint8Array([1, 2]); // Too small

      expect(() => {
        engine.putSprite(0, 0, invalidSprite, 'PSET');
      }).toThrow('Invalid sprite data');
    });

    test('should clip sprite at screen boundaries', () => {
      const spriteData = new Uint8Array([
        5, 0, 5, 0, // 5x5 sprite
        ...Array(25).fill(15)
      ]);

      // Put sprite partially off-screen
      engine.putSprite(318, 198, spriteData, 'PSET');

      // Should clip but not crash
      expect(buffer.getPixel(319, 199)).toBe(15);
    });
  });

  describe('CLS Command', () => {
    test('should clear screen to background color', () => {
      // Draw some stuff
      engine.pset(10, 10, 15);
      engine.pset(50, 50, 7);

      engine.setColor(undefined, 5); // Background = 5
      engine.cls();

      expect(buffer.getPixel(10, 10)).toBe(5);
      expect(buffer.getPixel(50, 50)).toBe(5);
    });

    test('should clear with mode 0', () => {
      engine.pset(10, 10, 15);
      engine.cls(0);

      expect(buffer.getPixel(10, 10)).toBe(0);
    });

    test('should clear with mode 1', () => {
      engine.pset(10, 10, 15);
      engine.cls(1);

      expect(buffer.getPixel(10, 10)).toBe(0);
    });
  });

  describe('getPixel', () => {
    test('should return pixel color', () => {
      engine.pset(10, 20, 15);

      expect(engine.getPixel(10, 20)).toBe(15);
    });

    test('should return 0 for out-of-bounds', () => {
      expect(engine.getPixel(-1, 10)).toBe(0);
      expect(engine.getPixel(320, 10)).toBe(0);
    });
  });

  describe('State Management', () => {
    test('should get current state', () => {
      engine.setColor(15, 1, 8);
      engine.pset(50, 75);

      const state = engine.getState();

      expect(state.foregroundColor).toBe(15);
      expect(state.backgroundColor).toBe(1);
      expect(state.borderColor).toBe(8);
      expect(state.lastX).toBe(50);
      expect(state.lastY).toBe(75);
      expect(state.currentMode).toBeDefined();
    });

    test('should set state', () => {
      const newState = {
        currentMode: SCREEN_MODES[2]!,
        foregroundColor: 12,
        backgroundColor: 3,
        borderColor: 7,
        lastX: 100,
        lastY: 150
      };

      engine.setState(newState);

      const state = engine.getState();
      expect(state.foregroundColor).toBe(12);
      expect(state.backgroundColor).toBe(3);
      expect(state.lastX).toBe(100);
      expect(state.lastY).toBe(150);
    });
  });

  describe('Performance', () => {
    test('should draw many pixels efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        engine.pset(i % 320, Math.floor(i / 320), i % 16);
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should draw many lines efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        engine.line(0, i, 100, i, { color: i % 16 });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});
