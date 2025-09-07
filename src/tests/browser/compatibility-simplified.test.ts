/**
 * 브라우저 호환성 간단 테스트
 * 핵심 기능만 검증합니다.
 */

import '../setup.js';
import { BrowserSupport, browserSupport } from '../../compatibility/browser-support.js';

describe('브라우저 호환성 핵심 테스트', () => {
  test('BrowserSupport 클래스가 정상적으로 생성됨', () => {
    const support = new BrowserSupport();
    expect(support).toBeDefined();
  });

  test('브라우저 정보 감지 기능', () => {
    const support = new BrowserSupport();
    const info = support.getBrowserInfo();
    
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('engine');
    expect(info).toHaveProperty('os');
    expect(info).toHaveProperty('mobile');
  });

  test('기능 지원 확인', () => {
    const support = new BrowserSupport();
    const features = support.getFeatureSupport();
    
    expect(features).toHaveProperty('promises');
    expect(features).toHaveProperty('performance');
    expect(features).toHaveProperty('webWorkers');
    expect(features).toHaveProperty('es6Modules');
    expect(features).toHaveProperty('localStorage');
  });

  test('호환성 검사', () => {
    const support = new BrowserSupport();
    const isSupported = support.isSupported();
    
    expect(typeof isSupported).toBe('boolean');
  });

  test('호환성 리포트 생성', () => {
    const support = new BrowserSupport();
    const report = support.generateCompatibilityReport();
    const reportObj = JSON.parse(report);
    
    expect(reportObj).toHaveProperty('timestamp');
    expect(reportObj).toHaveProperty('browser');
    expect(reportObj).toHaveProperty('features');
    expect(reportObj).toHaveProperty('supported');
  });

  test('전역 인스턴스 사용 가능', () => {
    expect(browserSupport).toBeDefined();
    expect(browserSupport).toBeInstanceOf(BrowserSupport);
  });
});