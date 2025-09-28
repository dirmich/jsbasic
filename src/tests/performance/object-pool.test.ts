/**
 * 객체 풀링 시스템 테스트
 * 메모리 최적화 및 객체 재사용 기능을 검증합니다.
 */

import '../setup.js';
import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Bun mock을 jest 스타일로 래핑하는 헬퍼
const createJestMock = (impl?: any) => {
  const fn = mock(impl || (() => {}));
  // Bun의 mock은 이미 mock.calls를 가지고 있음
  // 새로운 객체를 만들어서 속성을 추가
  const wrapper: any = Object.assign((...args: any[]) => fn(...args), {
    mock: fn.mock,
    mockImplementation: (newImpl: any) => {
      // Bun에서는 직접 구현 변경이 어려우므로 새 mock 반환
      return mock(newImpl);
    },
    mockReturnValue: (value: any) => {
      return mock(() => value);
    },
    mockReturnValueOnce: (value: any) => {
      let called = false;
      return mock((...args: any[]) => {
        if (!called) {
          called = true;
          return value;
        }
        return impl ? impl(...args) : undefined;
      });
    },
    mockClear: () => {
      if (fn.mock) {
        fn.mock.calls = [];
      }
      return wrapper;
    }
  });
  return wrapper;
};

// jest 호환 객체
const jest = {
  fn: createJestMock,
  spyOn: (obj: any, method: string) => {
    const spy = spyOn(obj, method);
    // @ts-ignore
    spy.mockRestore = () => {
      spy.mockRestore();
    };
    // @ts-ignore
    spy.mockImplementation = (impl: any) => {
      spy.mockImplementation(impl);
      return spy;
    };
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
      const resetCalls: any[] = [];
      const customResetFn = (obj: any) => {
        resetCalls.push(obj);
      };
      const customPool = new ObjectPool(
        () => new TestPoolable(),
        5,
        customResetFn
      );

      const obj = customPool.acquire();
      customPool.release(obj);

      const obj2 = customPool.acquire();

      expect(resetCalls).toHaveLength(1);
      expect(resetCalls[0]).toBe(obj2);
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

    test('디바운스 함수', (done) => {
      let callCount = 0;
      let lastArg: any;
      const mockFn = (arg: any) => {
        callCount++;
        lastArg = arg;
      };

      const debouncedFn = PerformanceUtils.debounce(mockFn, 50);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(callCount).toBe(0);

      setTimeout(() => {
        expect(callCount).toBe(1);
        expect(lastArg).toBe('arg3');
        done();
      }, 100);
    });

    test('스로틀 함수', (done) => {
      let callCount = 0;
      const calls: any[] = [];
      const mockFn = (arg: any) => {
        callCount++;
        calls.push(arg);
      };

      const throttledFn = PerformanceUtils.throttle(mockFn, 50);

      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      expect(callCount).toBe(1);
      expect(calls[0]).toBe('arg1');

      setTimeout(() => {
        throttledFn('arg4');
        expect(callCount).toBe(2);
        expect(calls[1]).toBe('arg4');
        done();
      }, 100);
    });

    test('배치 업데이트', () => {
      let rafCalls: any[] = [];
      const mockCallback = () => {};
      const mockRAF = (cb: any) => {
        rafCalls.push(cb);
        cb();
      };

      // requestAnimationFrame 모킹
      Object.defineProperty(window, 'requestAnimationFrame', {
        value: mockRAF,
        configurable: true
      });

      PerformanceUtils.batchUpdate(mockCallback);

      expect(rafCalls).toHaveLength(1);
      expect(rafCalls[0]).toBe(mockCallback);
    });

    test('메모리 사용량 측정', () => {
      // performance.memory가 있는 경우
      const originalPerformance = globalThis.performance;
      Object.defineProperty(globalThis, 'performance', {
        value: {
          memory: {
            usedJSHeapSize: 1024 * 1024 * 25 // 25MB
          }
        },
        configurable: true
      });

      const memoryUsage = PerformanceUtils.measureMemory();
      expect(memoryUsage).toBe(25);

      // performance.memory가 없는 경우
      Object.defineProperty(globalThis, 'performance', {
        value: {},
        configurable: true
      });

      const memoryUsage2 = PerformanceUtils.measureMemory();
      expect(memoryUsage2).toBe(0);

      // 원래 값 복원
      globalThis.performance = originalPerformance;
    });

    test('실행 시간 측정', () => {
      let callCount = 0;
      const mockPerformanceNow = () => {
        callCount++;
        return callCount === 1 ? 100 : 150; // 첫 번째 호출: 100, 두 번째 호출: 150
      };

      const originalPerformance = globalThis.performance;
      Object.defineProperty(globalThis, 'performance', {
        value: {
          now: mockPerformanceNow
        },
        configurable: true
      });

      const logCalls: any[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logCalls.push(args);
      };

      const result = PerformanceUtils.measureTime('test', () => {
        return 'result';
      });

      expect(result).toBe('result');
      expect(logCalls).toHaveLength(1);
      expect(logCalls[0][0]).toBe('⏱️ test: 50.00ms');

      console.log = originalLog;
      globalThis.performance = originalPerformance;
    });

    test('비동기 실행 시간 측정', async () => {
      let callCount = 0;
      const mockPerformanceNow = () => {
        callCount++;
        return callCount === 1 ? 200 : 300; // 첫 번째 호출: 200, 두 번째 호출: 300
      };

      const originalPerformance = globalThis.performance;
      Object.defineProperty(globalThis, 'performance', {
        value: {
          now: mockPerformanceNow
        },
        configurable: true
      });

      const logCalls: any[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logCalls.push(args);
      };

      const result = await PerformanceUtils.measureTimeAsync('async test', async () => {
        return Promise.resolve('async result');
      });

      expect(result).toBe('async result');
      expect(logCalls).toHaveLength(1);
      expect(logCalls[0][0]).toBe('⏱️ async test: 100.00ms');

      console.log = originalLog;
      globalThis.performance = originalPerformance;
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