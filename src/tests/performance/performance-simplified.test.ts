/**
 * 성능 모니터링 간단 테스트
 * 핵심 기능만 검증합니다.
 */

import '../setup.js';
import { PerformanceMonitor } from '../../performance/performance-monitor.js';
import { ObjectPool, MemoryOptimizer, ASTNodePool, PerformanceUtils } from '../../performance/object-pool.js';

// 간단한 Poolable 테스트 객체
class TestObject {
  value: number = 0;
  
  reset(): void {
    this.value = 0;
  }
}

describe('성능 시스템 핵심 테스트', () => {
  describe('PerformanceMonitor', () => {
    test('모니터 생성 및 기본 설정', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeDefined();
      
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveProperty('cpuCycles');
      expect(metrics).toHaveProperty('frameRate');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    test('CPU 사이클 추가', () => {
      const monitor = new PerformanceMonitor();
      monitor.addCPUCycles(1000);
      
      expect(() => monitor.addCPUCycles(500)).not.toThrow();
    });

    test('메트릭 설정', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.setBundleSize(400);
      monitor.setLoadTime(1500);
      
      const metrics = monitor.getMetrics();
      expect(metrics.bundleSize).toBe(400);
      expect(metrics.loadTime).toBe(1500);
    });

    test('성능 리포트 생성', () => {
      const monitor = new PerformanceMonitor();
      const report = monitor.getPerformanceReport();
      
      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('details');
      expect(['excellent', 'good', 'poor']).toContain(report.overall);
    });
  });

  describe('ObjectPool', () => {
    test('객체 풀 기본 동작', () => {
      const pool = new ObjectPool(() => new TestObject(), 5);
      
      expect(pool.size()).toBe(0);
      
      const obj = pool.acquire();
      expect(obj).toBeInstanceOf(TestObject);
      
      obj.value = 42;
      pool.release(obj);
      expect(pool.size()).toBe(1);
      
      const obj2 = pool.acquire();
      expect(obj2).toBe(obj);
      expect(obj2.value).toBe(0); // 리셋됨
    });

    test('최대 크기 제한', () => {
      const pool = new ObjectPool(() => new TestObject(), 3);
      const objects = [];
      
      for (let i = 0; i < 5; i++) {
        objects.push(pool.acquire());
      }
      
      objects.forEach(obj => pool.release(obj));
      
      expect(pool.size()).toBe(3); // 최대 크기로 제한
    });
  });

  describe('MemoryOptimizer', () => {
    test('풀 등록 및 사용', () => {
      const optimizer = new MemoryOptimizer();
      const pool = new ObjectPool(() => new TestObject(), 5);
      
      optimizer.registerPool('test', pool);
      
      const obj = optimizer.acquire('test');
      expect(obj).toBeInstanceOf(TestObject);
      
      optimizer.release('test', obj);
      
      const stats = optimizer.getStats();
      expect(stats).toHaveProperty('allocations');
      expect(stats).toHaveProperty('deallocations');
      expect(stats).toHaveProperty('poolHits');
      expect(stats).toHaveProperty('poolMisses');
    });

    test('히트율 계산', () => {
      const optimizer = new MemoryOptimizer();
      const pool = new ObjectPool(() => new TestObject(), 5);
      
      optimizer.registerPool('test', pool);
      
      const obj1 = optimizer.acquire('test'); // 미스
      optimizer.release('test', obj1);
      const obj2 = optimizer.acquire('test'); // 히트
      
      const stats = optimizer.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('ASTNodePool', () => {
    test('AST 노드 풀링', () => {
      const node = new ASTNodePool();
      
      node.type = 'Number';
      node.data = { value: 42 };
      
      node.reset();
      
      expect(node.type).toBe('');
      expect(node.data).toBeNull();
    });

    test('팩토리 메서드', () => {
      const node = ASTNodePool.create();
      expect(node).toBeInstanceOf(ASTNodePool);
    });
  });

  describe('PerformanceUtils', () => {
    test('메모리 측정', () => {
      const memory = PerformanceUtils.measureMemory();
      expect(typeof memory).toBe('number');
      expect(memory).toBeGreaterThanOrEqual(0);
    });

    test('실행 시간 측정', () => {
      const result = PerformanceUtils.measureTime('test', () => {
        return 'success';
      });
      
      expect(result).toBe('success');
    });

    test('비동기 시간 측정', async () => {
      const result = await PerformanceUtils.measureTimeAsync('async test', async () => {
        return Promise.resolve('async success');
      });
      
      expect(result).toBe('async success');
    });
  });
});