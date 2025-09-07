/**
 * 객체 풀링 시스템
 * 메모리 할당/해제를 최소화하여 성능을 향상시킵니다.
 */

export interface Poolable {
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, maxSize: number = 100, resetFn?: (obj: T) => void) {
    this.createFn = createFn;
    this.maxSize = maxSize;
    this.resetFn = resetFn;
  }

  /**
   * 객체 가져오기
   */
  acquire(): T {
    let obj = this.pool.pop();
    
    if (!obj) {
      obj = this.createFn();
    } else {
      // 객체 리셋
      obj.reset();
      this.resetFn?.(obj);
    }
    
    return obj;
  }

  /**
   * 객체 반환
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      obj.reset();
      this.pool.push(obj);
    }
  }

  /**
   * 풀 크기 반환
   */
  size(): number {
    return this.pool.length;
  }

  /**
   * 풀 비우기
   */
  clear(): void {
    this.pool = [];
  }
}

/**
 * 메모리 관리자
 */
export class MemoryOptimizer {
  private pools = new Map<string, ObjectPool<any>>();
  private memoryStats = {
    allocations: 0,
    deallocations: 0,
    poolHits: 0,
    poolMisses: 0
  };

  /**
   * 풀 등록
   */
  registerPool<T extends Poolable>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool);
  }

  /**
   * 객체 가져오기
   */
  acquire<T extends Poolable>(poolName: string): T | null {
    const pool = this.pools.get(poolName);
    if (!pool) return null;

    const poolSizeBefore = pool.size();
    const obj = pool.acquire();
    
    if (poolSizeBefore > 0) {
      this.memoryStats.poolHits++;
    } else {
      this.memoryStats.poolMisses++;
      this.memoryStats.allocations++;
    }
    
    return obj;
  }

  /**
   * 객체 반환
   */
  release<T extends Poolable>(poolName: string, obj: T): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    pool.release(obj);
    this.memoryStats.deallocations++;
  }

  /**
   * 메모리 통계 반환
   */
  getStats() {
    const hitRate = this.memoryStats.poolHits / (this.memoryStats.poolHits + this.memoryStats.poolMisses);
    
    return {
      ...this.memoryStats,
      hitRate: isNaN(hitRate) ? 0 : hitRate,
      poolSizes: Array.from(this.pools.entries()).map(([name, pool]) => ({
        name,
        size: pool.size()
      }))
    };
  }

  /**
   * 모든 풀 정리
   */
  cleanup(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    
    this.memoryStats = {
      allocations: 0,
      deallocations: 0,
      poolHits: 0,
      poolMisses: 0
    };
  }
}

// 전역 메모리 최적화 인스턴스
export const memoryOptimizer = new MemoryOptimizer();

/**
 * AST 노드 풀링 (BASIC 인터프리터용)
 */
export class ASTNodePool implements Poolable {
  type: string = '';
  data: any = null;

  reset(): void {
    this.type = '';
    this.data = null;
  }

  static create(): ASTNodePool {
    return new ASTNodePool();
  }
}

/**
 * 메모리 블록 풀링 (메모리 매니저용)
 */
export class MemoryBlockPool implements Poolable {
  data: Uint8Array;
  size: number;

  constructor(size: number = 256) {
    this.size = size;
    this.data = new Uint8Array(size);
  }

  reset(): void {
    this.data.fill(0);
  }

  static create(size: number = 256): MemoryBlockPool {
    return new MemoryBlockPool(size);
  }
}

/**
 * 터미널 라인 풀링 (터미널용)
 */
export class TerminalLinePool implements Poolable {
  content: string = '';
  type: string = 'output';
  timestamp: number = 0;

  reset(): void {
    this.content = '';
    this.type = 'output';
    this.timestamp = 0;
  }

  static create(): TerminalLinePool {
    return new TerminalLinePool();
  }
}

// 기본 풀들 등록
memoryOptimizer.registerPool('astNode', new ObjectPool(() => ASTNodePool.create()));
memoryOptimizer.registerPool('memoryBlock', new ObjectPool(() => MemoryBlockPool.create()));
memoryOptimizer.registerPool('terminalLine', new ObjectPool(() => TerminalLinePool.create()));

/**
 * 성능 최적화 유틸리티
 */
export class PerformanceUtils {
  /**
   * 디바운스 함수
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T {
    let timeoutId: number | undefined;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = (globalThis.window?.setTimeout || globalThis.setTimeout)(() => func(...args), wait) as number;
    }) as T;
  }

  /**
   * 스로틀 함수
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T {
    let inThrottle: boolean;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        (globalThis.window?.setTimeout || globalThis.setTimeout)(() => (inThrottle = false), limit);
      }
    }) as T;
  }

  /**
   * requestAnimationFrame을 사용한 배치 업데이트
   */
  static batchUpdate(callback: () => void): void {
    const raf = globalThis.window?.requestAnimationFrame || globalThis.requestAnimationFrame || 
                ((cb: FrameRequestCallback) => (globalThis.window?.setTimeout || globalThis.setTimeout)(cb, 16));
    raf(callback);
  }

  /**
   * 메모리 사용량 측정
   */
  static measureMemory(): number {
    const perf = globalThis.performance || (globalThis.window as any)?.performance;
    if (perf && 'memory' in perf) {
      return (perf as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * 실행 시간 측정
   */
  static measureTime<T>(label: string, fn: () => T): T {
    const perf = globalThis.performance || (globalThis.window as any)?.performance;
    const now = perf?.now ? () => perf.now() : () => Date.now();
    
    const start = now();
    const result = fn();
    const end = now();
    
    console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  /**
   * 비동기 함수 실행 시간 측정
   */
  static async measureTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const perf = globalThis.performance || (globalThis.window as any)?.performance;
    const now = perf?.now ? () => perf.now() : () => Date.now();
    
    const start = now();
    const result = await fn();
    const end = now();
    
    console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
}