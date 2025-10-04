/**
 * ProfilingAnalyzer Tests
 */

import { describe, test, expect } from 'bun:test';
import { ProfilingAnalyzer, type PerformanceReport } from '../../src/debugger/profiling-analyzer';
import type { ProfilingInfo } from '../../src/debugger/types';

describe('ProfilingAnalyzer', () => {
  let analyzer: ProfilingAnalyzer;

  beforeEach(() => {
    analyzer = new ProfilingAnalyzer();
  });

  describe('성능 통계 계산', () => {
    test('빈 데이터 처리', () => {
      const stats = analyzer.calculateStats([]);

      expect(stats.totalExecutionTime).toBe(0);
      expect(stats.totalExecutionCount).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.slowestLine).toBeNull();
      expect(stats.fastestLine).toBeNull();
      expect(stats.mostExecutedLine).toBeNull();
    });

    test('단일 데이터 통계', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 5, totalTime: 25.0, averageTime: 5.0 }
      ];

      const stats = analyzer.calculateStats(data);

      expect(stats.totalExecutionTime).toBe(25.0);
      expect(stats.totalExecutionCount).toBe(5);
      expect(stats.averageExecutionTime).toBe(5.0);
      expect(stats.slowestLine?.lineNumber).toBe(10);
      expect(stats.fastestLine?.lineNumber).toBe(10);
      expect(stats.mostExecutedLine?.lineNumber).toBe(10);
    });

    test('복수 데이터 통계', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 50.0, averageTime: 0.5 },
        { lineNumber: 20, executionCount: 50, totalTime: 100.0, averageTime: 2.0 },
        { lineNumber: 30, executionCount: 200, totalTime: 20.0, averageTime: 0.1 }
      ];

      const stats = analyzer.calculateStats(data);

      expect(stats.totalExecutionTime).toBe(170.0);
      expect(stats.totalExecutionCount).toBe(350);
      expect(stats.averageExecutionTime).toBeCloseTo(0.486, 2);
      expect(stats.slowestLine?.lineNumber).toBe(20); // 평균 2.0ms
      expect(stats.fastestLine?.lineNumber).toBe(30); // 평균 0.1ms
      expect(stats.mostExecutedLine?.lineNumber).toBe(30); // 200회
    });
  });

  describe('핫스팟 식별', () => {
    test('빈 데이터 핫스팟', () => {
      const hotspots = analyzer.identifyHotspots([]);
      expect(hotspots.length).toBe(0);
    });

    test('기본 임계값 핫스팟 (10%)', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 15.0, averageTime: 0.15 },
        { lineNumber: 20, executionCount: 50, totalTime: 80.0, averageTime: 1.6 },
        { lineNumber: 30, executionCount: 200, totalTime: 5.0, averageTime: 0.025 }
      ];

      const hotspots = analyzer.identifyHotspots(data); // 기본 10%

      expect(hotspots.length).toBe(2); // 20 (80%), 10 (15%)
      expect(hotspots[0]?.lineNumber).toBe(20); // 가장 느린 라인
      expect(hotspots[0]?.percentageOfTotal).toBeCloseTo(80.0, 1);
      expect(hotspots[1]?.lineNumber).toBe(10);
      expect(hotspots[1]?.percentageOfTotal).toBeCloseTo(15.0, 1);
    });

    test('커스텀 임계값 핫스팟 (20%)', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 15.0, averageTime: 0.15 },
        { lineNumber: 20, executionCount: 50, totalTime: 80.0, averageTime: 1.6 },
        { lineNumber: 30, executionCount: 200, totalTime: 5.0, averageTime: 0.025 }
      ];

      const hotspots = analyzer.identifyHotspots(data, 0.2); // 20%

      expect(hotspots.length).toBe(1); // 20만 (80%)
      expect(hotspots[0]?.lineNumber).toBe(20);
    });

    test('심각도 계산', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 10.0, averageTime: 0.1 },
        { lineNumber: 20, executionCount: 100, totalTime: 50.0, averageTime: 0.5 },
        { lineNumber: 30, executionCount: 100, totalTime: 30.0, averageTime: 0.3 },
        { lineNumber: 40, executionCount: 100, totalTime: 5.0, averageTime: 0.05 },
        { lineNumber: 50, executionCount: 100, totalTime: 5.0, averageTime: 0.05 }
      ];

      const hotspots = analyzer.identifyHotspots(data, 0.05);

      const line20 = hotspots.find(h => h.lineNumber === 20);
      expect(line20?.severity).toBe('critical'); // 50% 이상

      const line30 = hotspots.find(h => h.lineNumber === 30);
      expect(line30?.severity).toBe('high'); // 30% 이상

      const line10 = hotspots.find(h => h.lineNumber === 10);
      expect(line10?.severity).toBe('medium'); // 10% 이상

      const line40 = hotspots.find(h => h.lineNumber === 40);
      expect(line40?.severity).toBe('low'); // 5% 이상
    });

    test('핫스팟 정렬', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 15.0, averageTime: 0.15 },
        { lineNumber: 20, executionCount: 50, totalTime: 80.0, averageTime: 1.6 },
        { lineNumber: 30, executionCount: 200, totalTime: 20.0, averageTime: 0.1 }
      ];

      const hotspots = analyzer.identifyHotspots(data);

      expect(hotspots[0]?.lineNumber).toBe(20); // 80.0ms
      expect(hotspots[1]?.lineNumber).toBe(30); // 20.0ms
      expect(hotspots[2]?.lineNumber).toBe(10); // 15.0ms
    });
  });

  describe('최적화 제안 생성', () => {
    test('빈 핫스팟 제안', () => {
      const suggestions = analyzer.generateSuggestions([], []);
      expect(suggestions.length).toBe(0);
    });

    test('높은 실행 횟수 + 느린 평균 시간', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 1500, totalTime: 3000.0, averageTime: 2.0 }
      ];
      const hotspots = analyzer.identifyHotspots(data);
      const suggestions = analyzer.generateSuggestions(data, hotspots);

      const suggestion = suggestions.find(s => s.issue.includes('루프 내부'));
      expect(suggestion).toBeDefined();
      expect(suggestion?.lineNumber).toBe(10);
      expect(suggestion?.priority).toBe('high');
      expect(suggestion?.suggestion).toContain('루프 밖으로');
    });

    test('매우 느린 평균 실행 시간', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 20, executionCount: 10, totalTime: 150.0, averageTime: 15.0 }
      ];
      const hotspots = analyzer.identifyHotspots(data);
      const suggestions = analyzer.generateSuggestions(data, hotspots);

      const suggestion = suggestions.find(s => s.issue.includes('매우 느린'));
      expect(suggestion).toBeDefined();
      expect(suggestion?.lineNumber).toBe(20);
      expect(suggestion?.priority).toBe('high');
      expect(suggestion?.suggestion).toContain('알고리즘');
    });

    test('Critical severity 핫스팟', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 30, executionCount: 100, totalTime: 60.0, averageTime: 0.6 },
        { lineNumber: 40, executionCount: 100, totalTime: 40.0, averageTime: 0.4 }
      ];
      const hotspots = analyzer.identifyHotspots(data);
      const suggestions = analyzer.generateSuggestions(data, hotspots);

      const suggestion = suggestions.find(s => s.issue.includes('전체 실행 시간'));
      expect(suggestion).toBeDefined();
      expect(suggestion?.priority).toBe('high');
    });

    test('매우 많은 실행 횟수', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 50, executionCount: 15000, totalTime: 150.0, averageTime: 0.01 }
      ];
      const hotspots = analyzer.identifyHotspots(data);
      const suggestions = analyzer.generateSuggestions(data, hotspots);

      const suggestion = suggestions.find(s => s.issue.includes('회 실행됨'));
      expect(suggestion).toBeDefined();
      expect(suggestion?.lineNumber).toBe(50);
      expect(suggestion?.priority).toBe('medium');
      expect(suggestion?.suggestion).toContain('루프 횟수');
    });

    test('복수 제안 생성', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 20000, totalTime: 4000.0, averageTime: 0.2 }
      ];
      const hotspots = analyzer.identifyHotspots(data);
      const suggestions = analyzer.generateSuggestions(data, hotspots);

      expect(suggestions.length).toBeGreaterThan(1);
    });
  });

  describe('성능 보고서 생성', () => {
    test('빈 데이터 보고서', () => {
      const report = analyzer.generateReport([]);

      expect(report.stats.totalExecutionTime).toBe(0);
      expect(report.hotspots.length).toBe(0);
      expect(report.suggestions.length).toBe(0);
      expect(report.timestamp).toBeGreaterThan(0);
    });

    test('완전한 보고서 생성', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 50.0, averageTime: 0.5 },
        { lineNumber: 20, executionCount: 1500, totalTime: 3000.0, averageTime: 2.0 },
        { lineNumber: 30, executionCount: 200, totalTime: 20.0, averageTime: 0.1 }
      ];

      const report = analyzer.generateReport(data);

      expect(report.stats.totalExecutionTime).toBe(3070.0);
      expect(report.stats.totalExecutionCount).toBe(1800);
      expect(report.hotspots.length).toBeGreaterThan(0);
      expect(report.suggestions.length).toBeGreaterThan(0);
      expect(report.timestamp).toBeGreaterThan(0);
    });

    test('보고서 타임스탬프', () => {
      const before = Date.now();
      const report = analyzer.generateReport([]);
      const after = Date.now();

      expect(report.timestamp).toBeGreaterThanOrEqual(before);
      expect(report.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('보고서 텍스트 변환', () => {
    test('빈 보고서 텍스트', () => {
      const report = analyzer.generateReport([]);
      const text = analyzer.reportToText(report);

      expect(text).toContain('성능 프로파일링 보고서');
      expect(text).toContain('전체 통계');
      expect(text).toContain('총 실행 시간: 0.00ms');
    });

    test('완전한 보고서 텍스트', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 50.0, averageTime: 0.5 },
        { lineNumber: 20, executionCount: 1500, totalTime: 3000.0, averageTime: 2.0 }
      ];

      const report = analyzer.generateReport(data);
      const text = analyzer.reportToText(report);

      expect(text).toContain('성능 프로파일링 보고서');
      expect(text).toContain('전체 통계');
      expect(text).toContain('총 실행 시간');
      expect(text).toContain('총 실행 횟수');
      expect(text).toContain('평균 실행 시간');
      expect(text).toContain('가장 느린 라인');
      expect(text).toContain('가장 많이 실행된 라인');
    });

    test('핫스팟 섹션 포함', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 50.0, averageTime: 0.5 },
        { lineNumber: 20, executionCount: 100, totalTime: 80.0, averageTime: 0.8 }
      ];

      const report = analyzer.generateReport(data);
      const text = analyzer.reportToText(report);

      expect(text).toContain('성능 핫스팟');
      expect(text).toContain('라인 20');
      expect(text).toContain('라인 10');
    });

    test('최적화 제안 섹션 포함', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 2000, totalTime: 4000.0, averageTime: 2.0 }
      ];

      const report = analyzer.generateReport(data);
      const text = analyzer.reportToText(report);

      expect(text).toContain('최적화 제안');
      expect(text).toContain('라인 10');
      expect(text).toContain('문제:');
      expect(text).toContain('제안:');
      expect(text).toContain('효과:');
    });

    test('심각도 아이콘 표시', () => {
      const data: ProfilingInfo[] = [
        { lineNumber: 10, executionCount: 100, totalTime: 10.0, averageTime: 0.1 },
        { lineNumber: 20, executionCount: 100, totalTime: 60.0, averageTime: 0.6 }
      ];

      const report = analyzer.generateReport(data);
      const text = analyzer.reportToText(report);

      expect(text).toMatch(/🔴|🟠|🟡|🟢/); // 심각도 아이콘
    });

    test('보고서 생성 시간 표시', () => {
      const report = analyzer.generateReport([]);
      const text = analyzer.reportToText(report);

      expect(text).toContain('보고서 생성 시간:');
    });

    test('구분선 포함', () => {
      const report = analyzer.generateReport([]);
      const text = analyzer.reportToText(report);

      expect(text).toContain('='.repeat(60));
      expect(text).toContain('-'.repeat(60));
    });
  });
});

function beforeEach(fn: () => void): void {
  // Bun test beforeEach 구현
  analyzer = new ProfilingAnalyzer();
}
