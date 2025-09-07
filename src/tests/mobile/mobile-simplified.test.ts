/**
 * 모바일 최적화 간단 테스트
 * 핵심 기능만 검증합니다.
 */

import '../setup.js';
import { MobileOptimizer, mobileOptimizer } from '../../mobile/mobile-optimizer.js';

describe('모바일 최적화 핵심 테스트', () => {
  test('MobileOptimizer 클래스 생성', () => {
    const optimizer = new MobileOptimizer();
    expect(optimizer).toBeDefined();
  });

  test('기본 설정 확인', () => {
    const optimizer = new MobileOptimizer();
    const config = optimizer.getConfiguration();
    
    expect(config).toHaveProperty('enableTouchInput');
    expect(config).toHaveProperty('optimizeForBattery');
    expect(config).toHaveProperty('adaptiveFontSize');
  });

  test('사용자 정의 설정', () => {
    const customConfig = {
      enableTouchInput: false,
      compactLayout: true
    };

    const optimizer = new MobileOptimizer(customConfig);
    const config = optimizer.getConfiguration();
    
    expect(config.enableTouchInput).toBe(false);
    expect(config.compactLayout).toBe(true);
  });

  test('기기 성능 감지', () => {
    const optimizer = new MobileOptimizer();
    const capabilities = optimizer.getCapabilities();
    
    expect(capabilities).toHaveProperty('touchSupport');
    expect(capabilities).toHaveProperty('vibrationSupport');
    expect(capabilities).toHaveProperty('networkInfo');
    expect(typeof capabilities.touchSupport).toBe('boolean');
  });

  test('메트릭 수집', () => {
    const optimizer = new MobileOptimizer();
    const metrics = optimizer.getMetrics();
    
    expect(metrics).toHaveProperty('screenSize');
    expect(metrics).toHaveProperty('pixelRatio');
    expect(metrics).toHaveProperty('networkSpeed');
    expect(metrics).toHaveProperty('deviceMemory');
  });

  test('최적화 적용 및 해제', () => {
    const optimizer = new MobileOptimizer();
    
    expect(optimizer.isOptimizationEnabled()).toBe(false);
    
    optimizer.optimize();
    expect(optimizer.isOptimizationEnabled()).toBe(true);
    
    optimizer.disable();
    expect(optimizer.isOptimizationEnabled()).toBe(false);
  });

  test('진동 피드백 (지원하지 않는 환경)', () => {
    const optimizer = new MobileOptimizer({
      enableVibration: true
    });
    
    // navigator.vibrate가 없는 환경
    const result = optimizer.vibrate(100);
    expect(result).toBe(false);
  });

  test('최적화 요약 정보', () => {
    const optimizer = new MobileOptimizer({
      enableTouchInput: true,
      adaptiveFontSize: true
    });
    
    const summary = optimizer.getOptimizationSummary();
    
    expect(summary).toHaveProperty('applied');
    expect(summary).toHaveProperty('capabilities');
    expect(summary).toHaveProperty('metrics');
    expect(summary).toHaveProperty('recommendations');
    expect(Array.isArray(summary.applied)).toBe(true);
  });

  test('전역 인스턴스 사용 가능', () => {
    expect(mobileOptimizer).toBeDefined();
    expect(mobileOptimizer).toBeInstanceOf(MobileOptimizer);
  });

  test('이벤트 에미터 기능', () => {
    const optimizer = new MobileOptimizer();
    let eventFired = false;
    
    optimizer.on('optimized', () => {
      eventFired = true;
    });
    
    optimizer.optimize();
    expect(eventFired).toBe(true);
  });

  test('DOM 없는 환경에서 안전한 동작', () => {
    const originalDocument = globalThis.document;
    
    // @ts-ignore
    delete globalThis.document;
    
    const optimizer = new MobileOptimizer();
    
    expect(() => optimizer.optimize()).not.toThrow();
    expect(() => optimizer.disable()).not.toThrow();
    
    // 원복
    globalThis.document = originalDocument;
  });
});