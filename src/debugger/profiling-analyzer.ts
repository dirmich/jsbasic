/**
 * Profiling Analyzer
 *
 * BASIC 프로그램 성능 프로파일링 데이터 분석
 */

import type { ProfilingInfo } from './types.js';

/**
 * 성능 핫스팟
 */
export interface PerformanceHotspot {
  lineNumber: number;
  totalTime: number;
  executionCount: number;
  averageTime: number;
  percentageOfTotal: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * 최적화 제안
 */
export interface OptimizationSuggestion {
  lineNumber: number;
  issue: string;
  suggestion: string;
  potentialImprovement: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 성능 통계
 */
export interface PerformanceStats {
  totalExecutionTime: number;
  totalExecutionCount: number;
  averageExecutionTime: number;
  slowestLine: ProfilingInfo | null;
  fastestLine: ProfilingInfo | null;
  mostExecutedLine: ProfilingInfo | null;
}

/**
 * 성능 보고서
 */
export interface PerformanceReport {
  stats: PerformanceStats;
  hotspots: PerformanceHotspot[];
  suggestions: OptimizationSuggestion[];
  timestamp: number;
}

/**
 * ProfilingAnalyzer 클래스
 *
 * 프로파일링 데이터를 분석하고 최적화 제안 생성
 */
export class ProfilingAnalyzer {
  /**
   * 성능 통계 계산
   */
  calculateStats(profilingData: ProfilingInfo[]): PerformanceStats {
    if (profilingData.length === 0) {
      return {
        totalExecutionTime: 0,
        totalExecutionCount: 0,
        averageExecutionTime: 0,
        slowestLine: null,
        fastestLine: null,
        mostExecutedLine: null
      };
    }

    let totalTime = 0;
    let totalCount = 0;
    let slowest = profilingData[0];
    let fastest = profilingData[0];
    let mostExecuted = profilingData[0];

    for (const data of profilingData) {
      totalTime += data.totalTime;
      totalCount += data.executionCount;

      if (slowest && data.averageTime > slowest.averageTime) {
        slowest = data;
      }
      if (fastest && data.averageTime < fastest.averageTime) {
        fastest = data;
      }
      if (mostExecuted && data.executionCount > mostExecuted.executionCount) {
        mostExecuted = data;
      }
    }

    return {
      totalExecutionTime: totalTime,
      totalExecutionCount: totalCount,
      averageExecutionTime: totalTime / totalCount,
      slowestLine: slowest ?? null,
      fastestLine: fastest ?? null,
      mostExecutedLine: mostExecuted ?? null
    };
  }

  /**
   * 핫스팟 식별
   */
  identifyHotspots(profilingData: ProfilingInfo[], threshold: number = 0.1): PerformanceHotspot[] {
    if (profilingData.length === 0) {
      return [];
    }

    const stats = this.calculateStats(profilingData);
    const hotspots: PerformanceHotspot[] = [];

    for (const data of profilingData) {
      const percentage = data.totalTime / stats.totalExecutionTime;

      // threshold 이상인 라인만 핫스팟으로 간주 (기본 10%)
      if (percentage >= threshold) {
        const severity = this.calculateSeverity(percentage);

        hotspots.push({
          lineNumber: data.lineNumber,
          totalTime: data.totalTime,
          executionCount: data.executionCount,
          averageTime: data.averageTime,
          percentageOfTotal: percentage * 100,
          severity
        });
      }
    }

    // 총 실행 시간 기준 정렬
    return hotspots.sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * 심각도 계산
   */
  private calculateSeverity(percentage: number): 'critical' | 'high' | 'medium' | 'low' {
    if (percentage >= 0.5) return 'critical';  // 50% 이상
    if (percentage >= 0.3) return 'high';      // 30% 이상
    if (percentage >= 0.1) return 'medium';    // 10% 이상
    return 'low';
  }

  /**
   * 최적화 제안 생성
   */
  generateSuggestions(profilingData: ProfilingInfo[], hotspots: PerformanceHotspot[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    for (const hotspot of hotspots) {
      const data = profilingData.find(d => d.lineNumber === hotspot.lineNumber);
      if (!data) continue;

      // 높은 실행 횟수 + 느린 평균 시간
      if (data.executionCount > 1000 && data.averageTime > 1) {
        suggestions.push({
          lineNumber: hotspot.lineNumber,
          issue: '루프 내부에서 자주 실행되는 느린 연산',
          suggestion: '연산을 루프 밖으로 이동하거나 결과를 캐싱하세요',
          potentialImprovement: `${(hotspot.totalTime * 0.5).toFixed(2)}ms 절약 가능`,
          priority: 'high'
        });
      }

      // 매우 느린 평균 실행 시간
      if (data.averageTime > 10) {
        suggestions.push({
          lineNumber: hotspot.lineNumber,
          issue: '매우 느린 명령문 실행',
          suggestion: '알고리즘을 더 효율적인 방식으로 재작성하세요',
          potentialImprovement: `${(hotspot.totalTime * 0.7).toFixed(2)}ms 절약 가능`,
          priority: 'high'
        });
      }

      // Critical severity 핫스팟
      if (hotspot.severity === 'critical') {
        suggestions.push({
          lineNumber: hotspot.lineNumber,
          issue: `전체 실행 시간의 ${hotspot.percentageOfTotal.toFixed(1)}% 차지`,
          suggestion: '이 라인을 최우선으로 최적화해야 합니다',
          potentialImprovement: '전체 성능에 큰 영향',
          priority: 'high'
        });
      }

      // 매우 많은 실행 횟수
      if (data.executionCount > 10000) {
        suggestions.push({
          lineNumber: hotspot.lineNumber,
          issue: `${data.executionCount}회 실행됨`,
          suggestion: '루프 횟수를 줄이거나 조기 종료 조건을 추가하세요',
          potentialImprovement: '실행 횟수 감소로 성능 개선',
          priority: 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * 성능 보고서 생성
   */
  generateReport(profilingData: ProfilingInfo[]): PerformanceReport {
    const stats = this.calculateStats(profilingData);
    const hotspots = this.identifyHotspots(profilingData);
    const suggestions = this.generateSuggestions(profilingData, hotspots);

    return {
      stats,
      hotspots,
      suggestions,
      timestamp: Date.now()
    };
  }

  /**
   * 보고서를 텍스트로 변환
   */
  reportToText(report: PerformanceReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('성능 프로파일링 보고서');
    lines.push('='.repeat(60));
    lines.push('');

    // 전체 통계
    lines.push('📊 전체 통계');
    lines.push('-'.repeat(60));
    lines.push(`총 실행 시간: ${report.stats.totalExecutionTime.toFixed(2)}ms`);
    lines.push(`총 실행 횟수: ${report.stats.totalExecutionCount}회`);
    lines.push(`평균 실행 시간: ${report.stats.averageExecutionTime.toFixed(2)}ms`);

    if (report.stats.slowestLine) {
      lines.push(`가장 느린 라인: ${report.stats.slowestLine.lineNumber} (${report.stats.slowestLine.averageTime.toFixed(2)}ms)`);
    }
    if (report.stats.mostExecutedLine) {
      lines.push(`가장 많이 실행된 라인: ${report.stats.mostExecutedLine.lineNumber} (${report.stats.mostExecutedLine.executionCount}회)`);
    }
    lines.push('');

    // 핫스팟
    if (report.hotspots.length > 0) {
      lines.push('🔥 성능 핫스팟');
      lines.push('-'.repeat(60));

      for (const hotspot of report.hotspots) {
        const severityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[hotspot.severity];

        lines.push(`${severityIcon} 라인 ${hotspot.lineNumber}`);
        lines.push(`   전체 시간의 ${hotspot.percentageOfTotal.toFixed(1)}% (${hotspot.totalTime.toFixed(2)}ms)`);
        lines.push(`   ${hotspot.executionCount}회 실행, 평균 ${hotspot.averageTime.toFixed(2)}ms`);
        lines.push('');
      }
    }

    // 최적화 제안
    if (report.suggestions.length > 0) {
      lines.push('💡 최적화 제안');
      lines.push('-'.repeat(60));

      for (const suggestion of report.suggestions) {
        const priorityIcon = {
          high: '🔴',
          medium: '🟡',
          low: '🟢'
        }[suggestion.priority];

        lines.push(`${priorityIcon} 라인 ${suggestion.lineNumber}`);
        lines.push(`   문제: ${suggestion.issue}`);
        lines.push(`   제안: ${suggestion.suggestion}`);
        lines.push(`   효과: ${suggestion.potentialImprovement}`);
        lines.push('');
      }
    }

    lines.push('='.repeat(60));
    lines.push(`보고서 생성 시간: ${new Date(report.timestamp).toLocaleString()}`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}
