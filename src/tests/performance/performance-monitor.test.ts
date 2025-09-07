/**
 * 성능 모니터링 테스트
 * 성능 추적 및 최적화 제안 기능을 검증합니다.
 */

import '../setup.js';
import { PerformanceMonitor } from '../../performance/performance-monitor.js';

// performance.now 모킹
const mockPerformanceNow = jest.fn();
const mockRAF = jest.fn();

describe('성능 모니터링 테스트', () => {
  let monitor: PerformanceMonitor;
  let mockTime = 0;

  beforeEach(() => {
    mockTime = 0;
    mockPerformanceNow.mockImplementation(() => mockTime);
    mockRAF.mockClear();
    
    monitor = new PerformanceMonitor({
      targetFPS: 60,
      maxMemoryMB: 50,
      maxBundleKB: 500,
      maxLoadTimeMs: 2000
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('기본 초기화', () => {
    test('기본 설정으로 초기화되어야 함', () => {
      const defaultMonitor = new PerformanceMonitor();
      const metrics = defaultMonitor.getMetrics();
      
      expect(metrics.cpuCycles).toBe(0);
      expect(metrics.frameRate).toBe(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    test('사용자 정의 타겟으로 초기화되어야 함', () => {
      const customMonitor = new PerformanceMonitor({
        targetFPS: 30,
        maxMemoryMB: 100
      });
      
      expect(customMonitor).toBeDefined();
      // 내부 타겟 설정은 private이므로 getPerformanceReport를 통해 간접 확인
    });
  });

  describe('성능 메트릭 수집', () => {
    test('CPU 사이클 추가', () => {
      monitor.addCPUCycles(1000);
      monitor.addCPUCycles(500);
      
      // CPU 사이클은 내부적으로 누적되고 초당 명령어로 계산됨
      const metrics = monitor.getMetrics();
      expect(metrics.cpuCycles).toBe(0); // 아직 시작되지 않음
    });

    test('프레임 렌더링 추적', () => {
      monitor.start();
      
      // 첫 번째 프레임 (시간: 0ms)
      mockTime = 0;
      monitor.frameRendered();
      
      // 두 번째 프레임 (시간: 16ms, ~60FPS)
      mockTime = 16;
      monitor.frameRendered();
      
      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).toBe(16);
    });

    test('메모리 사용량 추적', () => {
      monitor.start();
      
      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBe(20); // 20MB 모킹 값
    });

    test('번들 크기 설정', () => {
      monitor.setBundleSize(350);
      
      const metrics = monitor.getMetrics();
      expect(metrics.bundleSize).toBe(350);
    });

    test('로드 시간 설정', () => {
      monitor.setLoadTime(1500);
      
      const metrics = monitor.getMetrics();
      expect(metrics.loadTime).toBe(1500);
    });
  });

  describe('성능 보고서 생성', () => {
    beforeEach(() => {
      monitor.setBundleSize(400); // 타겟 500KB 이하
      monitor.setLoadTime(1800); // 타겟 2000ms 이하
      monitor.start();
    });

    test('성능 보고서 구조 확인', () => {
      const report = monitor.getPerformanceReport();
      
      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('details');
      expect(['excellent', 'good', 'poor']).toContain(report.overall);
      expect(Array.isArray(report.details)).toBe(true);
    });

    test('개별 메트릭 평가', () => {
      const report = monitor.getPerformanceReport();
      
      report.details.forEach(detail => {
        expect(detail).toHaveProperty('metric');
        expect(detail).toHaveProperty('current');
        expect(detail).toHaveProperty('target');
        expect(detail).toHaveProperty('status');
        expect(detail).toHaveProperty('unit');
        expect(['pass', 'warn', 'fail']).toContain(detail.status);
      });
    });

    test('프레임 레이트 평가', () => {
      // 높은 FPS 시뮬레이션 (60FPS)
      mockTime = 0;
      monitor.frameRendered();
      
      for (let i = 1; i <= 60; i++) {
        mockTime = i * 16.67; // ~60FPS
        monitor.frameRendered();
      }
      
      // 1초 경과 후
      mockTime = 1000;
      monitor.frameRendered();
      
      const report = monitor.getPerformanceReport();
      const fpsDetail = report.details.find(d => d.metric === 'Frame Rate');
      
      expect(fpsDetail).toBeDefined();
      expect(fpsDetail!.status).toBe('pass');
    });

    test('메모리 사용량 평가', () => {
      const report = monitor.getPerformanceReport();
      const memoryDetail = report.details.find(d => d.metric === 'Memory Usage');
      
      expect(memoryDetail).toBeDefined();
      expect(memoryDetail!.current).toBe(20); // 20MB
      expect(memoryDetail!.target).toBe(50); // 50MB 타겟
      expect(memoryDetail!.status).toBe('pass'); // 20MB < 50MB
    });
  });

  describe('최적화 제안', () => {
    test('성능 문제 시 제안 생성', () => {
      // 성능 문제 상황 설정
      monitor.setBundleSize(600); // 타겟 500KB 초과
      monitor.setLoadTime(3500); // 타겟 2000ms 초과
      
      const suggestions = monitor.getOptimizationSuggestions();
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });

    test('성능 양호 시 제안 없음', () => {
      // 모든 메트릭이 타겟 이내
      monitor.setBundleSize(300);
      monitor.setLoadTime(1000);
      monitor.start();
      
      // 60FPS 시뮬레이션
      for (let i = 0; i < 60; i++) {
        mockTime = i * 16.67;
        monitor.frameRendered();
      }
      
      const suggestions = monitor.getOptimizationSuggestions();
      expect(suggestions.length).toBe(0);
    });

    test('특정 문제별 제안 내용 확인', () => {
      monitor.setBundleSize(700); // 번들 크기 초과
      
      const suggestions = monitor.getOptimizationSuggestions();
      const bundleSuggestion = suggestions.find(s => s.includes('번들 크기'));
      
      expect(bundleSuggestion).toBeDefined();
      expect(bundleSuggestion).toContain('최적화');
    });
  });

  describe('성능 로깅', () => {
    test('성능 로그 출력', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const groupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      
      monitor.setBundleSize(400);
      monitor.setLoadTime(1500);
      monitor.start();
      
      monitor.logPerformance();
      
      expect(consoleSpy).toHaveBeenCalledWith('🚀 Performance Report');
      expect(logSpy).toHaveBeenCalled();
      expect(groupEndSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      logSpy.mockRestore();
      groupEndSpy.mockRestore();
    });
  });

  describe('성능 데이터 내보내기', () => {
    test('JSON 형태로 성능 데이터 내보내기', () => {
      monitor.setBundleSize(450);
      monitor.setLoadTime(1200);
      monitor.start();
      
      const exportData = monitor.exportPerformanceData();
      const data = JSON.parse(exportData);
      
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('targets');
      expect(data).toHaveProperty('report');
      expect(data).toHaveProperty('suggestions');
      
      expect(data.metrics.bundleSize).toBe(450);
      expect(data.metrics.loadTime).toBe(1200);
    });

    test('내보낸 데이터가 유효한 JSON인지 확인', () => {
      const exportData = monitor.exportPerformanceData();
      
      expect(() => JSON.parse(exportData)).not.toThrow();
      
      const data = JSON.parse(exportData);
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('모니터링 생명주기', () => {
    test('모니터링 시작과 중지', () => {
      expect(monitor['isMonitoring']).toBe(false);
      
      monitor.start();
      expect(monitor['isMonitoring']).toBe(true);
      
      monitor.stop();
      expect(monitor['isMonitoring']).toBe(false);
    });

    test('중지된 모니터에서 프레임 렌더링 무시', () => {
      monitor.stop();
      
      const initialMetrics = monitor.getMetrics();
      monitor.frameRendered();
      const afterMetrics = monitor.getMetrics();
      
      expect(afterMetrics).toEqual(initialMetrics);
    });

    test('CPU 사이클은 모니터링 상태와 관계없이 추가 가능', () => {
      monitor.stop();
      monitor.addCPUCycles(1000);
      
      // CPU 사이클 추가 자체는 상태와 관계없이 수행됨
      expect(() => monitor.addCPUCycles(500)).not.toThrow();
    });
  });

  describe('에지 케이스', () => {
    test('메모리 정보가 없는 브라우저에서의 처리', () => {
      // memory 속성 제거
      const originalPerformance = window.performance;
      Object.defineProperty(window, 'performance', {
        value: { now: mockPerformanceNow },
        configurable: true
      });
      
      const monitor = new PerformanceMonitor();
      monitor.start();
      
      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      
      // 원복
      Object.defineProperty(window, 'performance', {
        value: originalPerformance,
        configurable: true
      });
    });

    test('매우 긴 시간 간격에서의 FPS 계산', () => {
      monitor.start();
      
      mockTime = 0;
      monitor.frameRendered();
      
      // 5초 후 프레임
      mockTime = 5000;
      monitor.frameRendered();
      
      const metrics = monitor.getMetrics();
      expect(metrics.frameRate).toBeLessThan(1);
    });

    test('동일한 시간에서의 프레임 렌더링', () => {
      monitor.start();
      
      mockTime = 100;
      monitor.frameRendered();
      monitor.frameRendered(); // 같은 시간에 다시 호출
      
      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).toBe(0);
    });
  });
});