/**
 * 성능 모니터링 시스템
 * 에뮬레이터의 성능을 측정하고 최적화 포인트를 제공합니다.
 */

export interface PerformanceMetrics {
  cpuCycles: number;
  instructionsPerSecond: number;
  memoryUsage: number;
  renderTime: number;
  frameRate: number;
  bundleSize: number;
  loadTime: number;
}

export interface PerformanceTarget {
  targetFPS: number;
  maxMemoryMB: number;
  maxBundleKB: number;
  maxLoadTimeMs: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private targets: PerformanceTarget;
  private startTime: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private cpuCycleCount: number = 0;
  private isMonitoring: boolean = false;

  constructor(targets?: Partial<PerformanceTarget>) {
    this.targets = {
      targetFPS: 60,
      maxMemoryMB: 50,
      maxBundleKB: 500,
      maxLoadTimeMs: 3000,
      ...targets
    };

    this.metrics = {
      cpuCycles: 0,
      instructionsPerSecond: 0,
      memoryUsage: 0,
      renderTime: 0,
      frameRate: 0,
      bundleSize: 0,
      loadTime: 0
    };
  }

  /**
   * 성능 모니터링 시작
   */
  start(): void {
    this.isMonitoring = true;
    const perf = globalThis.performance || (globalThis.window as any)?.performance;
    const now = perf?.now ? () => perf.now() : () => Date.now();
    
    this.startTime = now();
    this.lastFrameTime = this.startTime;
    this.frameCount = 0;
    this.cpuCycleCount = 0;

    // 초기 메모리 사용량 측정
    this.updateMemoryUsage();
    
    // 주기적 업데이트
    this.scheduleUpdate();
  }

  /**
   * 성능 모니터링 중지
   */
  stop(): void {
    this.isMonitoring = false;
  }

  /**
   * CPU 사이클 증가
   */
  addCPUCycles(cycles: number): void {
    this.cpuCycleCount += cycles;
  }

  /**
   * 프레임 렌더링 완료 알림
   */
  frameRendered(): void {
    if (!this.isMonitoring) return;

    const perf = globalThis.performance || (globalThis.window as any)?.performance;
    const now = perf?.now ? perf.now() : Date.now();
    
    const frameTime = now - this.lastFrameTime;
    
    this.frameCount++;
    this.lastFrameTime = now;
    
    // 렌더링 시간 업데이트
    this.metrics.renderTime = frameTime;
    
    // FPS 계산 (1초마다)
    const elapsed = now - this.startTime;
    if (elapsed >= 1000) {
      this.metrics.frameRate = (this.frameCount / elapsed) * 1000;
      this.metrics.instructionsPerSecond = (this.cpuCycleCount / elapsed) * 1000;
      
      // 리셋
      this.frameCount = 0;
      this.cpuCycleCount = 0;
      this.startTime = now;
    }
  }

  /**
   * 메모리 사용량 업데이트
   */
  private updateMemoryUsage(): void {
    const perf = globalThis.performance || (globalThis.window as any)?.performance;
    if (perf && 'memory' in perf) {
      // Chrome에서만 사용 가능
      const memory = (perf as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    } else {
      // 다른 브라우저에서는 추정값 사용
      this.metrics.memoryUsage = this.estimateMemoryUsage();
    }
  }

  /**
   * 메모리 사용량 추정
   */
  private estimateMemoryUsage(): number {
    // 간단한 추정: DOM 요소 수 + 객체 수
    const doc = globalThis.document || (globalThis.window as any)?.document;
    const domElements = doc ? doc.querySelectorAll('*').length : 100; // 기본값 100
    const estimatedMB = (domElements * 0.001) + 10; // 기본 10MB + DOM 기반 추정
    return Math.min(estimatedMB, 100); // 최대 100MB로 제한
  }

  /**
   * 번들 크기 설정
   */
  setBundleSize(sizeKB: number): void {
    this.metrics.bundleSize = sizeKB;
  }

  /**
   * 로드 시간 설정
   */
  setLoadTime(timeMs: number): void {
    this.metrics.loadTime = timeMs;
  }

  /**
   * 주기적 업데이트 스케줄링
   */
  private scheduleUpdate(): void {
    if (!this.isMonitoring) return;

    this.updateMemoryUsage();
    
    const raf = globalThis.requestAnimationFrame || 
                (globalThis.window as any)?.requestAnimationFrame ||
                ((cb: FrameRequestCallback) => (globalThis.setTimeout || (globalThis.window as any)?.setTimeout)(cb, 16));
    
    raf(() => {
      this.frameRendered();
      this.scheduleUpdate();
    });
  }

  /**
   * 현재 메트릭스 반환
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 타겟 대비 성능 평가
   */
  getPerformanceReport(): {
    overall: 'excellent' | 'good' | 'poor';
    details: Array<{
      metric: string;
      current: number;
      target: number;
      status: 'pass' | 'warn' | 'fail';
      unit: string;
    }>;
  } {
    const details = [
      {
        metric: 'Frame Rate',
        current: this.metrics.frameRate,
        target: this.targets.targetFPS,
        status: (this.metrics.frameRate >= this.targets.targetFPS * 0.9 ? 'pass' : 
                this.metrics.frameRate >= this.targets.targetFPS * 0.7 ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail',
        unit: 'FPS'
      },
      {
        metric: 'Memory Usage',
        current: this.metrics.memoryUsage,
        target: this.targets.maxMemoryMB,
        status: (this.metrics.memoryUsage <= this.targets.maxMemoryMB ? 'pass' :
                this.metrics.memoryUsage <= this.targets.maxMemoryMB * 1.2 ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail',
        unit: 'MB'
      },
      {
        metric: 'Bundle Size',
        current: this.metrics.bundleSize,
        target: this.targets.maxBundleKB,
        status: (this.metrics.bundleSize <= this.targets.maxBundleKB ? 'pass' :
                this.metrics.bundleSize <= this.targets.maxBundleKB * 1.2 ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail',
        unit: 'KB'
      },
      {
        metric: 'Load Time',
        current: this.metrics.loadTime,
        target: this.targets.maxLoadTimeMs,
        status: (this.metrics.loadTime <= this.targets.maxLoadTimeMs ? 'pass' :
                this.metrics.loadTime <= this.targets.maxLoadTimeMs * 1.5 ? 'warn' : 'fail') as 'pass' | 'warn' | 'fail',
        unit: 'ms'
      }
    ];

    const passCount = details.filter(d => d.status === 'pass').length;
    const overall = passCount >= 3 ? 'excellent' : passCount >= 2 ? 'good' : 'poor';

    return { overall, details };
  }

  /**
   * 최적화 제안 생성
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const report = this.getPerformanceReport();

    for (const detail of report.details) {
      if (detail.status === 'fail') {
        switch (detail.metric) {
          case 'Frame Rate':
            suggestions.push('프레임율 개선: DOM 업데이트 최적화, requestAnimationFrame 사용');
            break;
          case 'Memory Usage':
            suggestions.push('메모리 사용량 최적화: 메모리 풀 사용, 가비지 컬렉션 최적화');
            break;
          case 'Bundle Size':
            suggestions.push('번들 크기 최적화: 코드 분할, Tree shaking, 압축');
            break;
          case 'Load Time':
            suggestions.push('로딩 시간 개선: 지연 로딩, CDN 사용, 캐싱 전략');
            break;
        }
      }
    }

    return suggestions;
  }

  /**
   * 성능 로그 출력
   */
  logPerformance(): void {
    const report = this.getPerformanceReport();
    const metrics = this.getMetrics();

    console.group('🚀 Performance Report');
    console.log(`Overall: ${report.overall.toUpperCase()}`);
    console.log(`FPS: ${metrics.frameRate.toFixed(1)} (target: ${this.targets.targetFPS})`);
    console.log(`Memory: ${metrics.memoryUsage.toFixed(1)}MB (max: ${this.targets.maxMemoryMB}MB)`);
    console.log(`Bundle: ${metrics.bundleSize.toFixed(0)}KB (max: ${this.targets.maxBundleKB}KB)`);
    console.log(`Load: ${metrics.loadTime.toFixed(0)}ms (max: ${this.targets.maxLoadTimeMs}ms)`);
    console.log(`IPS: ${metrics.instructionsPerSecond.toFixed(0)}`);
    
    const suggestions = this.getOptimizationSuggestions();
    if (suggestions.length > 0) {
      console.group('💡 Optimization Suggestions');
      suggestions.forEach(suggestion => console.log(`- ${suggestion}`));
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * 성능 데이터 내보내기
   */
  exportPerformanceData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      targets: this.targets,
      report: this.getPerformanceReport(),
      suggestions: this.getOptimizationSuggestions()
    };

    return JSON.stringify(data, null, 2);
  }
}