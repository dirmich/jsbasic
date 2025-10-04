/**
 * 모바일 성능 메트릭 모니터링
 * 실시간 성능 추적 및 분석
 */

import { EventEmitter } from '../utils/events.js';

/**
 * 성능 메트릭 데이터
 */
export interface MobilePerformanceMetrics {
  fps: number;
  memoryUsage: number; // MB
  batteryLevel?: number; // 0-1
  batteryCharging?: boolean;
  networkSpeed?: number; // Mbps
  networkType?: string;
  touchLatency: number; // ms
  renderTime: number; // ms
  timestamp: number;
}

/**
 * 성능 통계
 */
export interface PerformanceStats {
  avgFPS: number;
  minFPS: number;
  maxFPS: number;
  avgMemory: number;
  maxMemory: number;
  avgTouchLatency: number;
  maxTouchLatency: number;
  avgRenderTime: number;
  maxRenderTime: number;
  sampleCount: number;
}

/**
 * 성능 임계값
 */
export interface PerformanceThresholds {
  minFPS: number;
  maxMemory: number;
  maxTouchLatency: number;
  maxRenderTime: number;
}

/**
 * 성능 경고
 */
export interface PerformanceWarning {
  type: 'fps' | 'memory' | 'latency' | 'render';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * 모바일 성능 모니터 이벤트
 */
interface PerformanceMonitorEvents extends Record<string, (...args: any[]) => void> {
  metrics: (metrics: MobilePerformanceMetrics) => void;
  warning: (warning: PerformanceWarning) => void;
  statsUpdate: (stats: PerformanceStats) => void;
}

/**
 * 모바일 성능 모니터 클래스
 */
export class MobilePerformanceMonitor extends EventEmitter<PerformanceMonitorEvents> {
  private isMonitoring = false;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsHistory: number[] = [];
  private touchStartTime = 0;
  private touchLatencies: number[] = [];
  private renderTimes: number[] = [];
  private memoryReadings: number[] = [];
  private metricsHistory: MobilePerformanceMetrics[] = [];
  private maxHistorySize = 100;
  private updateInterval = 1000; // ms
  private lastUpdateTime = 0;

  private thresholds: PerformanceThresholds = {
    minFPS: 30,
    maxMemory: 500, // MB
    maxTouchLatency: 100, // ms
    maxRenderTime: 16.67 // ms (60 FPS)
  };

  // Battery API 타입
  private battery: any = null;

  // Network Information API 타입
  private connection: any = null;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super();

    if (thresholds) {
      this.thresholds = { ...this.thresholds, ...thresholds };
    }

    this.initializeBatteryAPI();
    this.initializeNetworkAPI();
  }

  /**
   * Battery API 초기화
   */
  private async initializeBatteryAPI(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        this.battery = await (navigator as any).getBattery();
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  /**
   * Network Information API 초기화
   */
  private initializeNetworkAPI(): void {
    this.connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;
  }

  /**
   * 모니터링 시작
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.lastUpdateTime = Date.now();
    this.frameCount = 0;

    // 터치 이벤트 리스너 등록
    this.setupTouchListeners();

    // FPS 모니터링 시작
    this.measureFrame();

    console.log('📊 Performance monitoring started');
  }

  /**
   * 모니터링 중지
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.removeTouchListeners();

    console.log('📊 Performance monitoring stopped');
  }

  /**
   * 프레임 측정
   */
  private measureFrame = (): void => {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;

    // FPS 계산
    this.frameCount++;
    const fps = 1000 / delta;
    this.fpsHistory.push(fps);

    // 렌더링 시간 측정
    const renderStart = performance.now();
    // 실제 렌더링 작업 (여기서는 시뮬레이션)
    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;
    this.renderTimes.push(renderTime);

    // 히스토리 크기 제한
    if (this.fpsHistory.length > this.maxHistorySize) {
      this.fpsHistory.shift();
    }
    if (this.renderTimes.length > this.maxHistorySize) {
      this.renderTimes.shift();
    }

    this.lastFrameTime = now;

    // 주기적 메트릭 업데이트
    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.updateMetrics();
      this.lastUpdateTime = currentTime;
    }

    this.animationFrameId = requestAnimationFrame(this.measureFrame);
  };

  /**
   * 터치 이벤트 리스너 설정
   */
  private setupTouchListeners(): void {
    document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  /**
   * 터치 이벤트 리스너 제거
   */
  private removeTouchListeners(): void {
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  /**
   * 터치 시작 핸들러
   */
  private handleTouchStart = (): void => {
    this.touchStartTime = performance.now();
  };

  /**
   * 터치 종료 핸들러
   */
  private handleTouchEnd = (): void => {
    if (this.touchStartTime > 0) {
      const latency = performance.now() - this.touchStartTime;
      this.touchLatencies.push(latency);

      if (this.touchLatencies.length > this.maxHistorySize) {
        this.touchLatencies.shift();
      }

      this.touchStartTime = 0;
    }
  };

  /**
   * 메트릭 업데이트
   */
  private updateMetrics(): void {
    const metrics = this.getMetrics();

    // 메트릭 이벤트 발생
    this.emit('metrics', metrics);

    // 히스토리에 추가
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // 임계값 체크
    this.checkThresholds(metrics);

    // 통계 업데이트
    const stats = this.getStats();
    this.emit('statsUpdate', stats);
  }

  /**
   * 현재 메트릭 가져오기
   */
  getMetrics(): MobilePerformanceMetrics {
    const avgFPS = this.calculateAverage(this.fpsHistory);
    const avgTouchLatency = this.calculateAverage(this.touchLatencies);
    const avgRenderTime = this.calculateAverage(this.renderTimes);
    const memoryUsage = this.getMemoryUsage();

    const metrics: MobilePerformanceMetrics = {
      fps: avgFPS,
      memoryUsage,
      touchLatency: avgTouchLatency,
      renderTime: avgRenderTime,
      timestamp: Date.now()
    };

    // Battery 정보 추가
    if (this.battery) {
      metrics.batteryLevel = this.battery.level;
      metrics.batteryCharging = this.battery.charging;
    }

    // Network 정보 추가
    if (this.connection) {
      metrics.networkType = this.connection.effectiveType;
      metrics.networkSpeed = this.connection.downlink;
    }

    return metrics;
  }

  /**
   * 메모리 사용량 측정
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      this.memoryReadings.push(usedMB);

      if (this.memoryReadings.length > this.maxHistorySize) {
        this.memoryReadings.shift();
      }

      return usedMB;
    }

    return 0;
  }

  /**
   * 통계 계산
   */
  getStats(): PerformanceStats {
    return {
      avgFPS: this.calculateAverage(this.fpsHistory),
      minFPS: Math.min(...this.fpsHistory),
      maxFPS: Math.max(...this.fpsHistory),
      avgMemory: this.calculateAverage(this.memoryReadings),
      maxMemory: Math.max(...this.memoryReadings),
      avgTouchLatency: this.calculateAverage(this.touchLatencies),
      maxTouchLatency: Math.max(...this.touchLatencies),
      avgRenderTime: this.calculateAverage(this.renderTimes),
      maxRenderTime: Math.max(...this.renderTimes),
      sampleCount: this.metricsHistory.length
    };
  }

  /**
   * 임계값 체크
   */
  private checkThresholds(metrics: MobilePerformanceMetrics): void {
    // FPS 체크
    if (metrics.fps < this.thresholds.minFPS) {
      this.emitWarning({
        type: 'fps',
        message: `Low FPS detected: ${metrics.fps.toFixed(1)} FPS`,
        value: metrics.fps,
        threshold: this.thresholds.minFPS,
        timestamp: Date.now()
      });
    }

    // 메모리 체크
    if (metrics.memoryUsage > this.thresholds.maxMemory) {
      this.emitWarning({
        type: 'memory',
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)} MB`,
        value: metrics.memoryUsage,
        threshold: this.thresholds.maxMemory,
        timestamp: Date.now()
      });
    }

    // 터치 레이턴시 체크
    if (metrics.touchLatency > this.thresholds.maxTouchLatency) {
      this.emitWarning({
        type: 'latency',
        message: `High touch latency: ${metrics.touchLatency.toFixed(1)} ms`,
        value: metrics.touchLatency,
        threshold: this.thresholds.maxTouchLatency,
        timestamp: Date.now()
      });
    }

    // 렌더링 시간 체크
    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      this.emitWarning({
        type: 'render',
        message: `Slow rendering: ${metrics.renderTime.toFixed(1)} ms`,
        value: metrics.renderTime,
        threshold: this.thresholds.maxRenderTime,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 경고 이벤트 발생
   */
  private emitWarning(warning: PerformanceWarning): void {
    this.emit('warning', warning);
  }

  /**
   * 평균 계산
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * 임계값 업데이트
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 메트릭 히스토리 가져오기
   */
  getMetricsHistory(): MobilePerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * 히스토리 지우기
   */
  clearHistory(): void {
    this.fpsHistory = [];
    this.touchLatencies = [];
    this.renderTimes = [];
    this.memoryReadings = [];
    this.metricsHistory = [];
  }

  /**
   * 모니터링 상태 확인
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.stopMonitoring();
    this.clearHistory();
    this.removeAllListeners();
  }
}
