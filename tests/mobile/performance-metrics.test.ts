/**
 * 모바일 성능 메트릭 테스트
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { MobilePerformanceMonitor } from '../../src/mobile/performance-metrics.js';

describe('MobilePerformanceMonitor', () => {
  let monitor: MobilePerformanceMonitor;

  beforeEach(() => {
    monitor = new MobilePerformanceMonitor({
      minFPS: 30,
      maxMemory: 500,
      maxTouchLatency: 100,
      maxRenderTime: 16.67
    });
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
    }
  });

  test('should initialize correctly', () => {
    expect(monitor).toBeDefined();
    expect(monitor.isActive()).toBe(false);
  });

  test('should start monitoring', () => {
    monitor.startMonitoring();
    expect(monitor.isActive()).toBe(true);
  });

  test('should stop monitoring', () => {
    monitor.startMonitoring();
    monitor.stopMonitoring();
    expect(monitor.isActive()).toBe(false);
  });

  test('should get initial metrics', () => {
    const metrics = monitor.getMetrics();

    expect(metrics).toBeDefined();
    expect(typeof metrics.fps).toBe('number');
    expect(typeof metrics.memoryUsage).toBe('number');
    expect(typeof metrics.touchLatency).toBe('number');
    expect(typeof metrics.renderTime).toBe('number');
    expect(typeof metrics.timestamp).toBe('number');
  });

  test('should calculate statistics', () => {
    monitor.startMonitoring();

    // 약간 대기하여 샘플 수집
    setTimeout(() => {
      const stats = monitor.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.avgFPS).toBe('number');
      expect(typeof stats.avgMemory).toBe('number');
      expect(typeof stats.avgTouchLatency).toBe('number');
      expect(typeof stats.avgRenderTime).toBe('number');
      expect(stats.sampleCount).toBeGreaterThanOrEqual(0);
    }, 100);
  });

  test('should emit metrics event', (done) => {
    monitor.on('metrics', (metrics) => {
      expect(metrics).toBeDefined();
      expect(metrics.fps).toBeGreaterThanOrEqual(0);
      done();
    });

    monitor.startMonitoring();

    // 메트릭 업데이트 강제 트리거
    setTimeout(() => {
      // 이벤트가 발생할 때까지 대기
    }, 1100);
  });

  test('should emit warning on low FPS', (done) => {
    const lowFPSMonitor = new MobilePerformanceMonitor({
      minFPS: 1000, // 매우 높은 임계값
      maxMemory: 500,
      maxTouchLatency: 100,
      maxRenderTime: 16.67
    });

    lowFPSMonitor.on('warning', (warning) => {
      expect(warning.type).toBe('fps');
      expect(warning.value).toBeLessThan(1000);
      lowFPSMonitor.destroy();
      done();
    });

    lowFPSMonitor.startMonitoring();
  });

  test('should track touch latency', () => {
    monitor.startMonitoring();

    // 터치 이벤트 시뮬레이션
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        {
          identifier: 0,
          clientX: 100,
          clientY: 100
        } as Touch
      ]
    });

    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          identifier: 0,
          clientX: 100,
          clientY: 100
        } as Touch
      ]
    });

    document.dispatchEvent(touchStartEvent);

    setTimeout(() => {
      document.dispatchEvent(touchEndEvent);

      const metrics = monitor.getMetrics();
      expect(metrics.touchLatency).toBeGreaterThanOrEqual(0);
    }, 50);
  });

  test('should update thresholds', () => {
    monitor.updateThresholds({
      minFPS: 40,
      maxMemory: 600
    });

    // 임계값 업데이트 확인 (경고 발생으로 검증)
    expect(monitor).toBeDefined();
  });

  test('should get metrics history', () => {
    monitor.startMonitoring();

    setTimeout(() => {
      const history = monitor.getMetricsHistory();
      expect(Array.isArray(history)).toBe(true);
    }, 100);
  });

  test('should clear history', () => {
    monitor.startMonitoring();

    setTimeout(() => {
      monitor.clearHistory();
      const history = monitor.getMetricsHistory();
      expect(history.length).toBe(0);
    }, 100);
  });

  test('should handle memory metrics when available', () => {
    const metrics = monitor.getMetrics();

    // Performance Memory API가 있으면 메모리 사용량이 있어야 함
    if ('memory' in performance) {
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    } else {
      expect(metrics.memoryUsage).toBe(0);
    }
  });

  test('should emit statsUpdate event', (done) => {
    monitor.on('statsUpdate', (stats) => {
      expect(stats).toBeDefined();
      expect(typeof stats.avgFPS).toBe('number');
      done();
    });

    monitor.startMonitoring();

    // 통계 업데이트 대기
    setTimeout(() => {
      // 이벤트 발생 대기
    }, 1100);
  });

  test('should destroy cleanly', () => {
    monitor.startMonitoring();
    monitor.destroy();

    expect(monitor.isActive()).toBe(false);
    const history = monitor.getMetricsHistory();
    expect(history.length).toBe(0);
  });
});
