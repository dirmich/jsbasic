/**
 * 객체 풀링 시스템 테스트
 * 메모리 최적화 및 객체 재사용 기능을 검증합니다.
 */

import '../setup.js';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// Bun 테스트를 위한 jest 호환 레이어
const jest = {
  fn: (impl?: any) => {
    const fn: any = impl || (() => {});
    let mockImpl = impl;
    let returnValue: any;
    let returnValueOnce: any;
    const calls: any[] = [];

    const wrapper = (...args: any[]) => {
      calls.push(args);
      if (returnValueOnce !== undefined) {
        const val = returnValueOnce;
        returnValueOnce = undefined;
        return val;
      }
      if (returnValue !== undefined) return returnValue;
      return mockImpl ? mockImpl(...args) : undefined;
    };

    wrapper.mock = { calls };
    wrapper.mockImplementation = (newImpl: any) => {
      mockImpl = newImpl;
      return wrapper;
    };
    wrapper.mockReturnValue = (value: any) => {
      returnValue = value;
      return wrapper;
    };
    wrapper.mockReturnValueOnce = (value: any) => {
      returnValueOnce = value;
      return wrapper;
    };
    wrapper.mockClear = () => {
      calls.length = 0;
      return wrapper;
    };
    return wrapper;
  },
  spyOn: (obj: any, method: string) => {
    const original = obj[method];
    const spy = jest.fn(original);
    spy.mockRestore = () => {
      obj[method] = original;
    };
    obj[method] = spy;
    return spy;
  },
  useFakeTimers: () => {},
  useRealTimers: () => {},
  advanceTimersByTime: (time: number) => {}
};
import { 
  ObjectPool, 
  MemoryOptimizer, 
  memoryOptimizer,
  ASTNodePool,
  MemoryBlockPool,
  TerminalLinePool,
  PerformanceUtils
} from '../../performance/object-pool.js';

// Poolable 인터페이스를 구현하는 테스트 클래스
class TestPoolable {
  public value: number = 0;
  public name: string = '';

  reset(): void {
    this.value = 0;
    this.name = '';
  }

  static create(): TestPoolable {
    return new TestPoolable();
  }
}

describe('객체 풀링 시스템 테스트', () => {
  describe('ObjectPool', () => {
    let pool: ObjectPool<TestPoolable>;

    beforeEach(() => {
      pool = new ObjectPool(() => new TestPoolable(), 5);
    });

    test('객체 풀 생성', () => {
      expect(pool).toBeDefined();
      expect(pool.size()).toBe(0);
    });

    test('객체 획득 - 새로운 객체', () => {
      const obj = pool.acquire();
      
      expect(obj).toBeInstanceOf(TestPoolable);
      expect(obj.value).toBe(0);
      expect(obj.name).toBe('');
    });

    test('객체 반환 및 재사용', () => {
      const obj1 = pool.acquire();
      obj1.value = 42;
      obj1.name = 'test';
      
      pool.release(obj1);
      expect(pool.size()).toBe(1);
      
      const obj2 = pool.acquire();
      expect(obj2).toBe(obj1); // 같은 객체 재사용
      expect(obj2.value).toBe(0); // 리셋됨
      expect(obj2.name).toBe(''); // 리셋됨
    });

    test('최대 크기 제한', () => {
      const objects: TestPoolable[] = [];
      
      // 최대 크기(5)보다 많은 객체 생성 및 반환
      for (let i = 0; i < 10; i++) {
        objects.push(pool.acquire());
      }
      
      objects.forEach(obj => pool.release(obj));
      
      // 풀 크기는 최대 크기로 제한되어야 함
      expect(pool.size()).toBe(5);
    });

    test('사용자 정의 리셋 함수', () => {
      const customResetFn = jest.fn();
      const customPool = new ObjectPool(
        () => new TestPoolable(), 
        5, 
        customResetFn
      );
      
      const obj = customPool.acquire();
      customPool.release(obj);
      
      const obj2 = customPool.acquire();
      
      expect(customResetFn).toHaveBeenCalledWith(obj2);
    });

    test('풀 비우기', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      
      pool.release(obj1);
      pool.release(obj2);
      expect(pool.size()).toBe(2);
      
      pool.clear();
      expect(pool.size()).toBe(0);
    });
  });

  describe('MemoryOptimizer', () => {
    let optimizer: MemoryOptimizer;

    beforeEach(() => {
      optimizer = new MemoryOptimizer();
    });

    test('풀 등록', () => {
      const pool = new ObjectPool(() => new TestPoolable(), 10);
      optimizer.registerPool('test', pool);
      
      const obj = optimizer.acquire('test');
      expect(obj).toBeInstanceOf(TestPoolable);
    });

    test('존재하지 않는 풀에서 객체 요청', () => {
      const obj = optimizer.acquire('nonexistent');
      expect(obj).toBeNull();
    });

    test('객체 획득 및 반환 통계', () => {
      const pool = new ObjectPool(() => new TestPoolable(), 10);
      optimizer.registerPool('test', pool);
      
      // 첫 번째 획득 (풀 미스)
      const obj1 = optimizer.acquire('test');
      
      let stats = optimizer.getStats();
      expect(stats.poolMisses).toBe(1);
      expect(stats.allocations).toBe(1);
      
      // 반환
      optimizer.release('test', obj1!);
      
      stats = optimizer.getStats();
      expect(stats.deallocations).toBe(1);
      
      // 두 번째 획득 (풀 히트)
      const obj2 = optimizer.acquire('test');
      
      stats = optimizer.getStats();
      expect(stats.poolHits).toBe(1);
    });

    test('히트율 계산', () => {
      const pool = new ObjectPool(() => new TestPoolable(), 10);
      optimizer.registerPool('test', pool);
      
      // 풀 미스 2회
      const obj1 = optimizer.acquire('test');
      const obj2 = optimizer.acquire('test');
      
      optimizer.release('test', obj1!);
      optimizer.release('test', obj2!);
      
      // 풀 히트 1회
      const obj3 = optimizer.acquire('test');
      
      const stats = optimizer.getStats();
      expect(stats.hitRate).toBeCloseTo(1/3, 2); // 1히트 / 3획득
    });

    test('풀 크기 정보', () => {
      const pool1 = new ObjectPool(() => new TestPoolable(), 5);
      const pool2 = new ObjectPool(() => new TestPoolable(), 10);
      
      optimizer.registerPool('pool1', pool1);
      optimizer.registerPool('pool2', pool2);
      
      const obj1 = optimizer.acquire('pool1');
      const obj2 = optimizer.acquire('pool2');
      
      optimizer.release('pool1', obj1!);
      optimizer.release('pool2', obj2!);
      
      const stats = optimizer.getStats();
      const poolSizes = stats.poolSizes;
      
      expect(poolSizes).toHaveLength(2);
      expect(poolSizes.find(p => p.name === 'pool1')?.size).toBe(1);
      expect(poolSizes.find(p => p.name === 'pool2')?.size).toBe(1);
    });

    test('정리 기능', () => {
      const pool = new ObjectPool(() => new TestPoolable(), 10);
      optimizer.registerPool('test', pool);
      
      const obj = optimizer.acquire('test');
      optimizer.release('test', obj!);
      
      optimizer.cleanup();
      
      const stats = optimizer.getStats();
      expect(stats.allocations).toBe(0);
      expect(stats.deallocations).toBe(0);
      expect(stats.poolHits).toBe(0);
      expect(stats.poolMisses).toBe(0);
      expect(pool.size()).toBe(0);
    });
  });

  describe('전역 메모리 최적화 인스턴스', () => {
    test('전역 인스턴스 사용 가능', () => {
      expect(memoryOptimizer).toBeDefined();
      expect(memoryOptimizer).toBeInstanceOf(MemoryOptimizer);
    });

    test('기본 풀들 등록 확인', () => {
      const astNode = memoryOptimizer.acquire('astNode');
      const memoryBlock = memoryOptimizer.acquire('memoryBlock');
      const terminalLine = memoryOptimizer.acquire('terminalLine');
      
      expect(astNode).toBeInstanceOf(ASTNodePool);
      expect(memoryBlock).toBeInstanceOf(MemoryBlockPool);
      expect(terminalLine).toBeInstanceOf(TerminalLinePool);
      
      // 정리
      if (astNode) memoryOptimizer.release('astNode', astNode);
      if (memoryBlock) memoryOptimizer.release('memoryBlock', memoryBlock);
      if (terminalLine) memoryOptimizer.release('terminalLine', terminalLine);
    });
  });

  describe('ASTNodePool', () => {
    test('AST 노드 생성 및 리셋', () => {
      const node = new ASTNodePool();
      
      node.type = 'NumberLiteral';
      node.data = { value: 42 };
      
      node.reset();
      
      expect(node.type).toBe('');
      expect(node.data).toBeNull();
    });

    test('정적 팩토리 메서드', () => {
      const node = ASTNodePool.create();
      expect(node).toBeInstanceOf(ASTNodePool);
    });
  });

  describe('MemoryBlockPool', () => {
    test('메모리 블록 생성 및 리셋', () => {
      const block = new MemoryBlockPool(128);
      
      // 데이터 설정
      block.data[0] = 255;
      block.data[1] = 128;
      
      block.reset();
      
      // 리셋 후 모든 바이트가 0이어야 함
      expect(block.data[0]).toBe(0);
      expect(block.data[1]).toBe(0);
      expect(block.size).toBe(128);
    });

    test('기본 크기로 생성', () => {
      const block = new MemoryBlockPool();
      expect(block.size).toBe(256);
      expect(block.data.length).toBe(256);
    });

    test('정적 팩토리 메서드', () => {
      const block = MemoryBlockPool.create(512);
      expect(block).toBeInstanceOf(MemoryBlockPool);
      expect(block.size).toBe(512);
    });
  });

  describe('TerminalLinePool', () => {
    test('터미널 라인 생성 및 리셋', () => {
      const line = new TerminalLinePool();
      
      line.content = 'Hello World';
      line.type = 'input';
      line.timestamp = Date.now();
      
      line.reset();
      
      expect(line.content).toBe('');
      expect(line.type).toBe('output');
      expect(line.timestamp).toBe(0);
    });

    test('정적 팩토리 메서드', () => {
      const line = TerminalLinePool.create();
      expect(line).toBeInstanceOf(TerminalLinePool);
    });
  });

  describe('PerformanceUtils', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('디바운스 함수', () => {
      const mockFn = jest.fn();
      const debouncedFn = PerformanceUtils.debounce(mockFn, 100);
      
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');
      
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    test('스로틀 함수', () => {
      const mockFn = jest.fn();
      const throttledFn = PerformanceUtils.throttle(mockFn, 100);
      
      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');
      
      jest.advanceTimersByTime(100);
      
      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
    });

    test('배치 업데이트', () => {
      const mockCallback = jest.fn();
      const mockRAF = jest.fn((cb) => cb());
      
      // requestAnimationFrame 모킹
      Object.defineProperty(window, 'requestAnimationFrame', {
        value: mockRAF,
        configurable: true
      });
      
      PerformanceUtils.batchUpdate(mockCallback);
      
      expect(mockRAF).toHaveBeenCalledWith(mockCallback);
    });

    test('메모리 사용량 측정', () => {
      // performance.memory가 있는 경우
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 1024 * 1024 * 25 // 25MB
        },
        configurable: true
      });
      
      const memoryUsage = PerformanceUtils.measureMemory();
      expect(memoryUsage).toBe(25);
      
      // performance.memory가 없는 경우
      delete (window.performance as any).memory;
      
      const memoryUsage2 = PerformanceUtils.measureMemory();
      expect(memoryUsage2).toBe(0);
    });

    test('실행 시간 측정', () => {
      const mockPerformanceNow = jest.fn()
        .mockReturnValueOnce(100) // 시작 시간
        .mockReturnValueOnce(150); // 종료 시간
      
      Object.defineProperty(window.performance, 'now', {
        value: mockPerformanceNow,
        configurable: true
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = PerformanceUtils.measureTime('test', () => {
        return 'result';
      });
      
      expect(result).toBe('result');
      expect(consoleSpy).toHaveBeenCalledWith('⏱️ test: 50.00ms');
      
      consoleSpy.mockRestore();
    });

    test('비동기 실행 시간 측정', async () => {
      const mockPerformanceNow = jest.fn()
        .mockReturnValueOnce(200) // 시작 시간
        .mockReturnValueOnce(300); // 종료 시간
      
      Object.defineProperty(window.performance, 'now', {
        value: mockPerformanceNow,
        configurable: true
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await PerformanceUtils.measureTimeAsync('async test', async () => {
        return Promise.resolve('async result');
      });
      
      expect(result).toBe('async result');
      expect(consoleSpy).toHaveBeenCalledWith('⏱️ async test: 100.00ms');
      
      consoleSpy.mockRestore();
    });
  });

  describe('통합 테스트', () => {
    test('실제 사용 시나리오 - AST 노드 풀링', () => {
      // AST 노드를 여러 번 획득하고 반환
      const nodes: ASTNodePool[] = [];
      
      for (let i = 0; i < 10; i++) {
        const node = memoryOptimizer.acquire('astNode') as ASTNodePool;
        node.type = `Type${i}`;
        node.data = { value: i };
        nodes.push(node);
      }
      
      // 모든 노드 반환
      nodes.forEach(node => {
        memoryOptimizer.release('astNode', node);
      });
      
      // 다시 획득했을 때 재사용되는지 확인
      const reusedNode = memoryOptimizer.acquire('astNode') as ASTNodePool;
      expect(reusedNode.type).toBe(''); // 리셋됨
      expect(reusedNode.data).toBeNull(); // 리셋됨
      
      // 통계 확인
      const stats = memoryOptimizer.getStats();
      expect(stats.poolHits).toBeGreaterThan(0);
      
      // 정리
      memoryOptimizer.release('astNode', reusedNode);
    });

    test('메모리 블록 풀링 성능 비교', () => {
      const blockSize = 1024;
      const iterations = 100;
      
      // 풀링 없이 직접 생성
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const block = new MemoryBlockPool(blockSize);
        block.data.fill(i % 256);
      }
      const end1 = performance.now();
      const directTime = end1 - start1;
      
      // 풀링 사용
      const start2 = performance.now();
      const blocks: MemoryBlockPool[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const block = memoryOptimizer.acquire('memoryBlock') as MemoryBlockPool;
        block.data.fill(i % 256);
        blocks.push(block);
      }
      
      blocks.forEach(block => {
        memoryOptimizer.release('memoryBlock', block);
      });
      
      const end2 = performance.now();
      const pooledTime = end2 - start2;
      
      // 풀링이 더 빠르거나 비슷해야 함 (테스트 환경에 따라 다를 수 있음)
      console.log(`직접 생성: ${directTime.toFixed(2)}ms, 풀링 사용: ${pooledTime.toFixed(2)}ms`);
      
      // 최소한 오류 없이 실행되어야 함
      expect(directTime).toBeGreaterThan(0);
      expect(pooledTime).toBeGreaterThan(0);
    });
  });
});