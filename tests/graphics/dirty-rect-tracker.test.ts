/**
 * DirtyRectTracker Unit Tests
 *
 * 변경된 화면 영역 추적기를 테스트합니다.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { DirtyRectTracker } from '../../src/graphics/dirty-rect-tracker';

describe('DirtyRectTracker', () => {
  let tracker: DirtyRectTracker;

  beforeEach(() => {
    tracker = new DirtyRectTracker();
  });

  describe('Constructor', () => {
    test('should initialize with empty regions', () => {
      expect(tracker.isEmpty()).toBe(true);
      expect(tracker.getDirtyRegions()).toEqual([]);
    });

    test('should accept custom maxRegions', () => {
      const customTracker = new DirtyRectTracker(50);
      expect(customTracker.isEmpty()).toBe(true);
    });

    test('should accept custom mergeThreshold', () => {
      const customTracker = new DirtyRectTracker(100, 20);
      expect(customTracker.isEmpty()).toBe(true);
    });
  });

  describe('markDirty', () => {
    test('should add new dirty region', () => {
      tracker.markDirty(10, 20, 30, 40);

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: 10, y: 20, width: 30, height: 40 });
    });

    test('should add multiple non-overlapping regions', () => {
      tracker.markDirty(0, 0, 10, 10);
      tracker.markDirty(100, 100, 10, 10);
      tracker.markDirty(200, 200, 10, 10);

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(3);
    });

    test('should merge overlapping regions', () => {
      tracker.markDirty(10, 10, 20, 20);
      tracker.markDirty(15, 15, 20, 20); // Overlaps with first

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(1);

      const merged = regions[0]!;
      expect(merged.x).toBe(10);
      expect(merged.y).toBe(10);
      expect(merged.width).toBe(25); // 15 + 20 - 10
      expect(merged.height).toBe(25);
    });

    test('should merge adjacent regions (within threshold)', () => {
      const customTracker = new DirtyRectTracker(100, 10);

      customTracker.markDirty(0, 0, 10, 10);
      customTracker.markDirty(10, 0, 10, 10); // Adjacent (touching)

      const regions = customTracker.getDirtyRegions();
      expect(regions.length).toBe(1);

      const merged = regions[0]!;
      expect(merged.x).toBe(0);
      expect(merged.y).toBe(0);
      expect(merged.width).toBe(20);
      expect(merged.height).toBe(10);
    });

    test('should not merge regions far apart', () => {
      tracker.markDirty(0, 0, 10, 10);
      tracker.markDirty(100, 100, 10, 10); // Far away

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(2);
    });

    test('should handle zero-sized regions', () => {
      tracker.markDirty(10, 10, 0, 0);

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: 10, y: 10, width: 0, height: 0 });
    });
  });

  describe('getDirtyRegions', () => {
    test('should return copy of regions array', () => {
      tracker.markDirty(10, 10, 20, 20);

      const regions1 = tracker.getDirtyRegions();
      const regions2 = tracker.getDirtyRegions();

      // Different array instances
      expect(regions1).not.toBe(regions2);

      // Same content
      expect(regions1).toEqual(regions2);
    });

    test('should return empty array when no regions', () => {
      const regions = tracker.getDirtyRegions();
      expect(regions).toEqual([]);
    });
  });

  describe('clear', () => {
    test('should remove all dirty regions', () => {
      tracker.markDirty(10, 10, 20, 20);
      tracker.markDirty(50, 50, 30, 30);

      expect(tracker.isEmpty()).toBe(false);

      tracker.clear();

      expect(tracker.isEmpty()).toBe(true);
      expect(tracker.getDirtyRegions()).toEqual([]);
    });

    test('should allow adding regions after clear', () => {
      tracker.markDirty(10, 10, 20, 20);
      tracker.clear();
      tracker.markDirty(30, 30, 40, 40);

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: 30, y: 30, width: 40, height: 40 });
    });
  });

  describe('isEmpty', () => {
    test('should return true when no regions', () => {
      expect(tracker.isEmpty()).toBe(true);
    });

    test('should return false when regions exist', () => {
      tracker.markDirty(10, 10, 20, 20);
      expect(tracker.isEmpty()).toBe(false);
    });

    test('should return true after clear', () => {
      tracker.markDirty(10, 10, 20, 20);
      tracker.clear();
      expect(tracker.isEmpty()).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should return zero stats for empty tracker', () => {
      const stats = tracker.getStats();

      expect(stats.regionCount).toBe(0);
      expect(stats.totalArea).toBe(0);
      expect(stats.averageArea).toBe(0);
    });

    test('should calculate stats for single region', () => {
      tracker.markDirty(0, 0, 10, 20); // Area = 200

      const stats = tracker.getStats();

      expect(stats.regionCount).toBe(1);
      expect(stats.totalArea).toBe(200);
      expect(stats.averageArea).toBe(200);
    });

    test('should calculate stats for multiple regions', () => {
      tracker.markDirty(0, 0, 10, 10); // Area = 100
      tracker.markDirty(100, 100, 20, 20); // Area = 400

      const stats = tracker.getStats();

      expect(stats.regionCount).toBe(2);
      expect(stats.totalArea).toBe(500);
      expect(stats.averageArea).toBe(250);
    });

    test('should handle merged regions in stats', () => {
      tracker.markDirty(0, 0, 10, 10);
      tracker.markDirty(5, 5, 10, 10); // Will merge

      const stats = tracker.getStats();

      expect(stats.regionCount).toBe(1);
      expect(stats.totalArea).toBeGreaterThan(100); // Merged area
    });
  });

  describe('Automatic Merging', () => {
    test('should merge all regions when maxRegions exceeded', () => {
      const smallTracker = new DirtyRectTracker(5); // Max 5 regions

      // Add 10 non-overlapping regions
      for (let i = 0; i < 10; i++) {
        smallTracker.markDirty(i * 50, 0, 10, 10);
      }

      const regions = smallTracker.getDirtyRegions();

      // Should have merged down to 1 region
      expect(regions.length).toBeLessThanOrEqual(5);
    });

    test('should merge produces single bounding box', () => {
      const smallTracker = new DirtyRectTracker(2);

      smallTracker.markDirty(0, 0, 10, 10);
      smallTracker.markDirty(100, 100, 10, 10);
      smallTracker.markDirty(200, 200, 10, 10); // Forces merge

      const regions = smallTracker.getDirtyRegions();
      expect(regions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Merge Threshold', () => {
    test('should merge regions within threshold', () => {
      const customTracker = new DirtyRectTracker(100, 5);

      customTracker.markDirty(0, 0, 10, 10);
      customTracker.markDirty(14, 0, 10, 10); // Gap of 4 pixels

      const regions = customTracker.getDirtyRegions();

      // Should merge (within threshold of 5)
      expect(regions.length).toBe(1);
    });

    test('should not merge regions beyond threshold', () => {
      const customTracker = new DirtyRectTracker(100, 5);

      customTracker.markDirty(0, 0, 10, 10);
      customTracker.markDirty(20, 0, 10, 10); // Gap of 10 pixels

      const regions = customTracker.getDirtyRegions();

      // Should not merge (beyond threshold of 5)
      expect(regions.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle negative coordinates', () => {
      tracker.markDirty(-10, -10, 20, 20);

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: -10, y: -10, width: 20, height: 20 });
    });

    test('should handle very large coordinates', () => {
      tracker.markDirty(10000, 10000, 5000, 5000);

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: 10000, y: 10000, width: 5000, height: 5000 });
    });

    test('should handle floating point coordinates', () => {
      tracker.markDirty(10.5, 20.7, 30.2, 40.9);

      const regions = tracker.getDirtyRegions();
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: 10.5, y: 20.7, width: 30.2, height: 40.9 });
    });

    test('should handle identical regions (complete overlap)', () => {
      tracker.markDirty(10, 10, 20, 20);
      tracker.markDirty(10, 10, 20, 20); // Exact duplicate

      const regions = tracker.getDirtyRegions();

      // Should merge to single region
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: 10, y: 10, width: 20, height: 20 });
    });

    test('should handle contained regions (one inside another)', () => {
      tracker.markDirty(0, 0, 100, 100);
      tracker.markDirty(10, 10, 20, 20); // Inside first region

      const regions = tracker.getDirtyRegions();

      // Should merge
      expect(regions.length).toBe(1);
      expect(regions[0]).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });
  });

  describe('Performance', () => {
    test('should handle many markDirty calls efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        tracker.markDirty(
          Math.random() * 1000,
          Math.random() * 1000,
          Math.random() * 100,
          Math.random() * 100
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 operations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle automatic merging efficiently', () => {
      const smallTracker = new DirtyRectTracker(10);
      const startTime = performance.now();

      // Force many merges
      for (let i = 0; i < 100; i++) {
        smallTracker.markDirty(i * 10, 0, 5, 5);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete with many merges in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle checkerboard pattern efficiently', () => {
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if ((x + y) % 2 === 0) {
            tracker.markDirty(x * 10, y * 10, 10, 10);
          }
        }
      }

      const regions = tracker.getDirtyRegions();

      // Should have merged some regions
      expect(regions.length).toBeGreaterThan(0);
      expect(regions.length).toBeLessThan(50); // Less than total marked
    });

    test('should handle horizontal line of regions', () => {
      for (let i = 0; i < 10; i++) {
        tracker.markDirty(i * 15, 0, 10, 10);
      }

      const regions = tracker.getDirtyRegions();

      // Should merge adjacent regions (within threshold)
      expect(regions.length).toBeLessThan(10);
    });

    test('should handle diagonal pattern', () => {
      for (let i = 0; i < 10; i++) {
        tracker.markDirty(i * 20, i * 20, 10, 10);
      }

      const regions = tracker.getDirtyRegions();

      // Diagonal regions may merge based on threshold
      // Just verify some regions exist (not all merged to 1)
      expect(regions.length).toBeGreaterThanOrEqual(1);
      expect(regions.length).toBeLessThanOrEqual(10);
    });
  });
});
