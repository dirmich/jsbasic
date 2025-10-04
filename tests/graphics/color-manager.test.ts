/**
 * ColorManager Unit Tests
 *
 * 색상 관리자의 기능을 테스트합니다.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ColorManager } from '../../src/graphics/color-manager';
import { CGA_PALETTE } from '../../src/types/graphics';

describe('ColorManager', () => {
  let colorManager: ColorManager;

  beforeEach(() => {
    colorManager = new ColorManager();
  });

  describe('Constructor', () => {
    test('should initialize with CGA palette by default', () => {
      const palette = colorManager.getPalette();
      expect(palette.length).toBe(16);
      expect(palette).toEqual(CGA_PALETTE);
    });

    test('should accept custom palette', () => {
      const customPalette = ['#FF0000', '#00FF00', '#0000FF'];
      const cm = new ColorManager(customPalette);

      const palette = cm.getPalette();
      expect(palette).toEqual(customPalette);
    });
  });

  describe('getColorString', () => {
    test('should return CSS color string for valid index', () => {
      const color = colorManager.getColorString(0);
      expect(color).toBe('#000000'); // Black
    });

    test('should return white for color index 15', () => {
      const color = colorManager.getColorString(15);
      expect(color).toBe('#FFFFFF'); // White
    });

    test('should clamp negative indices to 0', () => {
      const color = colorManager.getColorString(-5);
      expect(color).toBe('#000000'); // Black (index 0)
    });

    test('should clamp large indices to max', () => {
      const color = colorManager.getColorString(100);
      expect(color).toBe('#FFFFFF'); // White (index 15)
    });

    test('should handle floating point indices (floor)', () => {
      const color = colorManager.getColorString(7.9);
      expect(color).toBe(CGA_PALETTE[7]);
    });
  });

  describe('getRGB', () => {
    test('should return RGB object for valid index', () => {
      const rgb = colorManager.getRGB(0);
      expect(rgb).toEqual({ r: 0, g: 0, b: 0 }); // Black
    });

    test('should return white RGB for index 15', () => {
      const rgb = colorManager.getRGB(15);
      expect(rgb).toEqual({ r: 255, g: 255, b: 255 }); // White
    });

    test('should cache RGB values', () => {
      const rgb1 = colorManager.getRGB(5);
      const rgb2 = colorManager.getRGB(5);

      // Should return same object instance from cache
      expect(rgb1).toBe(rgb2);
    });

    test('should handle all CGA palette colors', () => {
      for (let i = 0; i < 16; i++) {
        const rgb = colorManager.getRGB(i);
        expect(rgb).toHaveProperty('r');
        expect(rgb).toHaveProperty('g');
        expect(rgb).toHaveProperty('b');
        expect(rgb.r).toBeGreaterThanOrEqual(0);
        expect(rgb.r).toBeLessThanOrEqual(255);
        expect(rgb.g).toBeGreaterThanOrEqual(0);
        expect(rgb.g).toBeLessThanOrEqual(255);
        expect(rgb.b).toBeGreaterThanOrEqual(0);
        expect(rgb.b).toBeLessThanOrEqual(255);
      }
    });
  });

  describe('setPalette', () => {
    test('should update palette', () => {
      const newPalette = ['#FF0000', '#00FF00', '#0000FF'];
      colorManager.setPalette(newPalette);

      const palette = colorManager.getPalette();
      expect(palette).toEqual(newPalette);
    });

    test('should clear RGB cache when palette changes', () => {
      const rgb1 = colorManager.getRGB(0);

      const newPalette = ['#FF0000', '#00FF00', '#0000FF'];
      colorManager.setPalette(newPalette);

      const rgb2 = colorManager.getRGB(0);

      expect(rgb1).not.toBe(rgb2); // Different instances
      expect(rgb2).toEqual({ r: 255, g: 0, b: 0 }); // New color
    });

    test('should throw error for empty palette', () => {
      expect(() => {
        colorManager.setPalette([]);
      }).toThrow('Palette must have at least one color');
    });

    test('should rebuild RGB cache after palette change', () => {
      const newPalette = ['#112233', '#445566'];
      colorManager.setPalette(newPalette);

      const rgb0 = colorManager.getRGB(0);
      const rgb1 = colorManager.getRGB(1);

      expect(rgb0).toEqual({ r: 0x11, g: 0x22, b: 0x33 });
      expect(rgb1).toEqual({ r: 0x44, g: 0x55, b: 0x66 });
    });
  });

  describe('validateColor', () => {
    test('should return valid color index unchanged', () => {
      expect(colorManager.validateColor(7)).toBe(7);
    });

    test('should clamp negative values to 0', () => {
      expect(colorManager.validateColor(-1)).toBe(0);
      expect(colorManager.validateColor(-100)).toBe(0);
    });

    test('should clamp values above palette size to max index', () => {
      expect(colorManager.validateColor(16)).toBe(15);
      expect(colorManager.validateColor(1000)).toBe(15);
    });

    test('should floor floating point values', () => {
      expect(colorManager.validateColor(7.9)).toBe(7);
      expect(colorManager.validateColor(0.1)).toBe(0);
    });
  });

  describe('rgbToHex', () => {
    test('should convert RGB to hex string', () => {
      const hex = colorManager.rgbToHex(255, 0, 0);
      expect(hex).toBe('#ff0000');
    });

    test('should handle black (0, 0, 0)', () => {
      const hex = colorManager.rgbToHex(0, 0, 0);
      expect(hex).toBe('#000000');
    });

    test('should handle white (255, 255, 255)', () => {
      const hex = colorManager.rgbToHex(255, 255, 255);
      expect(hex).toBe('#ffffff');
    });

    test('should pad single digit hex values', () => {
      const hex = colorManager.rgbToHex(1, 2, 3);
      expect(hex).toBe('#010203');
    });

    test('should floor floating point RGB values', () => {
      const hex = colorManager.rgbToHex(127.9, 63.5, 191.2);
      expect(hex).toBe('#7f3fbf');
    });
  });

  describe('findClosestColor', () => {
    test('should find exact match', () => {
      // White = #FFFFFF = (255, 255, 255)
      const index = colorManager.findClosestColor(255, 255, 255);
      expect(index).toBe(15); // White is index 15 in CGA palette
    });

    test('should find black for (0, 0, 0)', () => {
      const index = colorManager.findClosestColor(0, 0, 0);
      expect(index).toBe(0); // Black is index 0
    });

    test('should find closest color for arbitrary RGB', () => {
      // Test with a color close to red
      const index = colorManager.findClosestColor(200, 0, 0);

      // Should find a red-ish color in CGA palette
      const rgb = colorManager.getRGB(index);
      expect(rgb.r).toBeGreaterThan(rgb.g);
      expect(rgb.r).toBeGreaterThan(rgb.b);
    });

    test('should be deterministic', () => {
      const index1 = colorManager.findClosestColor(123, 45, 67);
      const index2 = colorManager.findClosestColor(123, 45, 67);
      expect(index1).toBe(index2);
    });
  });

  describe('setColor', () => {
    test('should update specific palette index', () => {
      colorManager.setColor(0, '#FF0000');

      const color = colorManager.getColorString(0);
      expect(color).toBe('#FF0000');
    });

    test('should update RGB cache for modified index', () => {
      colorManager.setColor(5, '#112233');

      const rgb = colorManager.getRGB(5);
      expect(rgb).toEqual({ r: 0x11, g: 0x22, b: 0x33 });
    });

    test('should ignore invalid indices', () => {
      const originalPalette = colorManager.getPalette();

      colorManager.setColor(-1, '#FF0000');
      colorManager.setColor(100, '#00FF00');

      const newPalette = colorManager.getPalette();
      expect(newPalette).toEqual(originalPalette);
    });
  });

  describe('getPaletteSize', () => {
    test('should return CGA palette size (16)', () => {
      expect(colorManager.getPaletteSize()).toBe(16);
    });

    test('should return custom palette size', () => {
      const customPalette = ['#FF0000', '#00FF00', '#0000FF'];
      const cm = new ColorManager(customPalette);

      expect(cm.getPaletteSize()).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle palette with single color', () => {
      const cm = new ColorManager(['#123456']);

      expect(cm.getPaletteSize()).toBe(1);
      expect(cm.validateColor(0)).toBe(0);
      expect(cm.validateColor(100)).toBe(0); // Clamp to max (0)
    });

    test('should handle palette with many colors', () => {
      const largePalette = Array.from({ length: 256 }, (_, i) => {
        const hex = i.toString(16).padStart(2, '0');
        return `#${hex}${hex}${hex}`;
      });

      const cm = new ColorManager(largePalette);
      expect(cm.getPaletteSize()).toBe(256);
      expect(cm.validateColor(255)).toBe(255);
    });

    test('should handle malformed hex colors gracefully', () => {
      const cm = new ColorManager(['#XYZ']);
      const rgb = cm.getRGB(0);

      // Should parse as NaN -> 0
      expect(rgb.r).toBeNaN();
      expect(rgb.g).toBeNaN();
      expect(rgb.b).toBeNaN();
    });
  });

  describe('Performance', () => {
    test('should handle many getRGB calls efficiently (caching)', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        colorManager.getRGB(i % 16);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 10ms (cache hits)
      expect(duration).toBeLessThan(10);
    });

    test('should handle findClosestColor efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        colorManager.findClosestColor(
          Math.random() * 255,
          Math.random() * 255,
          Math.random() * 255
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 searches in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
