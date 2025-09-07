/**
 * 향상된 이벤트 시스템
 * 
 * TypeScript 타입 안전성을 제공하는 이벤트 에미터와 관련 유틸리티를 제공합니다.
 */

/**
 * 이벤트 리스너 타입 정의
 */
export type EventListener<T = any> = (...args: T[]) => void;

/**
 * 이벤트 맵 타입 정의
 */
export type EventMap = Record<string, any>;

/**
 * 이벤트 에미터 옵션
 */
export interface EventEmitterOptions {
  /** 최대 리스너 수 (기본값: 10) */
  maxListeners?: number;
  /** 리스너 추가 시 경고 표시 여부 */
  warnOnMaxListeners?: boolean;
  /** 자동으로 리스너 제거 여부 */
  autoRemoveListeners?: boolean;
}

/**
 * TypeScript 타입 안전성을 제공하는 EventEmitter
 * 
 * @template T 이벤트 맵 타입
 */
export class EventEmitter<T extends EventMap = EventMap> {
  private readonly listeners = new Map<keyof T, Set<EventListener>>();
  private readonly onceListeners = new Map<keyof T, Set<EventListener>>();
  private readonly options: Required<EventEmitterOptions>;
  private readonly listenerCounts = new Map<keyof T, number>();

  constructor(options: EventEmitterOptions = {}) {
    this.options = {
      maxListeners: options.maxListeners ?? 10,
      warnOnMaxListeners: options.warnOnMaxListeners ?? true,
      autoRemoveListeners: options.autoRemoveListeners ?? false
    };
  }

  /**
   * 이벤트 리스너 추가
   * 
   * @param event 이벤트 이름
   * @param listener 리스너 함수
   */
  public on<K extends keyof T>(event: K, listener: T[K]): this {
    return this.addListener(event, listener, false);
  }

  /**
   * 일회성 이벤트 리스너 추가
   * 
   * @param event 이벤트 이름
   * @param listener 리스너 함수
   */
  public once<K extends keyof T>(event: K, listener: T[K]): this {
    return this.addListener(event, listener, true);
  }

  /**
   * 이벤트 리스너 제거
   * 
   * @param event 이벤트 이름
   * @param listener 제거할 리스너 함수
   */
  public off<K extends keyof T>(event: K, listener: T[K]): this {
    return this.removeListener(event, listener);
  }

  /**
   * 이벤트 발생
   * 
   * @param event 이벤트 이름
   * @param args 이벤트 인자들
   */
  public emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean {
    const eventListeners = this.listeners.get(event);
    const onceListeners = this.onceListeners.get(event);
    
    let hasListeners = false;

    // 일반 리스너들 실행
    if (eventListeners && eventListeners.size > 0) {
      hasListeners = true;
      // 리스너를 배열로 복사하여 실행 중 수정으로 인한 문제 방지
      const listenersArray = Array.from(eventListeners);
      for (const listener of listenersArray) {
        try {
          listener(...args);
        } catch (error) {
          this.handleListenerError(event, error, listener);
        }
      }
    }

    // 일회성 리스너들 실행 후 제거
    if (onceListeners && onceListeners.size > 0) {
      hasListeners = true;
      const onceListenersArray = Array.from(onceListeners);
      onceListeners.clear(); // 먼저 모두 제거
      
      for (const listener of onceListenersArray) {
        try {
          listener(...args);
        } catch (error) {
          this.handleListenerError(event, error, listener);
        }
      }
    }

    return hasListeners;
  }

  /**
   * 특정 이벤트의 모든 리스너 제거
   * 
   * @param event 이벤트 이름 (없으면 모든 이벤트)
   */
  public removeAllListeners<K extends keyof T>(event?: K): this {
    if (event !== undefined) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
      this.listenerCounts.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      this.listenerCounts.clear();
    }
    
    return this;
  }

  /**
   * 특정 이벤트의 리스너 개수 반환
   * 
   * @param event 이벤트 이름
   */
  public listenerCount<K extends keyof T>(event: K): number {
    const regularCount = this.listeners.get(event)?.size || 0;
    const onceCount = this.onceListeners.get(event)?.size || 0;
    return regularCount + onceCount;
  }

  /**
   * 특정 이벤트의 모든 리스너 반환
   * 
   * @param event 이벤트 이름
   */
  public listeners<K extends keyof T>(event: K): T[K][] {
    const regularListeners = Array.from(this.listeners.get(event) || []);
    const onceListeners = Array.from(this.onceListeners.get(event) || []);
    return [...regularListeners, ...onceListeners] as T[K][];
  }

  /**
   * 등록된 모든 이벤트 이름 반환
   */
  public eventNames(): (keyof T)[] {
    const allEvents = new Set<keyof T>();
    
    for (const event of this.listeners.keys()) {
      allEvents.add(event);
    }
    
    for (const event of this.onceListeners.keys()) {
      allEvents.add(event);
    }
    
    return Array.from(allEvents);
  }

  /**
   * 최대 리스너 수 설정
   * 
   * @param n 최대 리스너 수
   */
  public setMaxListeners(n: number): this {
    if (n < 0 || !Number.isInteger(n)) {
      throw new TypeError('Max listeners must be a non-negative integer');
    }
    this.options.maxListeners = n;
    return this;
  }

  /**
   * 현재 최대 리스너 수 반환
   */
  public getMaxListeners(): number {
    return this.options.maxListeners;
  }

  /**
   * 이벤트 리스너 추가 (내부 메서드)
   */
  private addListener<K extends keyof T>(event: K, listener: T[K], once: boolean): this {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function');
    }

    const targetMap = once ? this.onceListeners : this.listeners;
    
    if (!targetMap.has(event)) {
      targetMap.set(event, new Set());
    }
    
    const eventListeners = targetMap.get(event)!;
    eventListeners.add(listener as EventListener);

    // 리스너 수 확인 및 경고
    this.checkMaxListeners(event);

    return this;
  }

  /**
   * 이벤트 리스너 제거 (내부 메서드)
   */
  private removeListener<K extends keyof T>(event: K, listener: T[K]): this {
    // 일반 리스너에서 제거
    const regularListeners = this.listeners.get(event);
    if (regularListeners) {
      regularListeners.delete(listener as EventListener);
      if (regularListeners.size === 0) {
        this.listeners.delete(event);
      }
    }

    // 일회성 리스너에서 제거
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      onceListeners.delete(listener as EventListener);
      if (onceListeners.size === 0) {
        this.onceListeners.delete(event);
      }
    }

    return this;
  }

  /**
   * 최대 리스너 수 확인
   */
  private checkMaxListeners<K extends keyof T>(event: K): void {
    const currentCount = this.listenerCount(event);
    const maxListeners = this.options.maxListeners;

    if (maxListeners > 0 && currentCount > maxListeners && this.options.warnOnMaxListeners) {
      console.warn(
        `EventEmitter: Possible memory leak detected. ` +
        `Event "${String(event)}" has ${currentCount} listeners. ` +
        `Maximum is ${maxListeners}.`
      );
    }
  }

  /**
   * 리스너 에러 처리
   */
  private handleListenerError<K extends keyof T>(
    event: K, 
    error: unknown, 
    listener: EventListener
  ): void {
    console.error(`EventEmitter: Error in listener for event "${String(event)}":`, error);
    
    // 자동 제거 옵션이 활성화된 경우 에러가 발생한 리스너 제거
    if (this.options.autoRemoveListeners) {
      this.removeListener(event, listener as T[K]);
      console.warn(`EventEmitter: Removed error-causing listener for event "${String(event)}"`);
    }
  }
}

/**
 * 이벤트 에미터를 위한 유틸리티 함수들
 */
export class EventUtils {
  /**
   * 여러 이벤트 에미터에서 동일한 이벤트를 기다림
   * 
   * @param emitters 이벤트 에미터 배열
   * @param event 기다릴 이벤트 이름
   * @param timeout 타임아웃 (밀리초)
   */
  static async waitForAnyEvent<T extends EventMap, K extends keyof T>(
    emitters: EventEmitter<T>[],
    event: K,
    timeout?: number
  ): Promise<{ emitter: EventEmitter<T>; args: Parameters<T[K]> }> {
    return new Promise((resolve, reject) => {
      const cleanup = new Set<() => void>();
      let timeoutId: NodeJS.Timeout | undefined;

      // 타임아웃 설정
      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => {
          cleanup.forEach(fn => fn());
          reject(new Error(`Timeout waiting for event "${String(event)}" after ${timeout}ms`));
        }, timeout);
      }

      // 각 에미터에 리스너 추가
      for (const emitter of emitters) {
        const listener = (...args: Parameters<T[K]>) => {
          cleanup.forEach(fn => fn());
          if (timeoutId) clearTimeout(timeoutId);
          resolve({ emitter, args });
        };

        emitter.once(event, listener);
        cleanup.add(() => emitter.off(event, listener));
      }
    });
  }

  /**
   * 특정 조건을 만족하는 이벤트를 기다림
   * 
   * @param emitter 이벤트 에미터
   * @param event 기다릴 이벤트 이름
   * @param condition 조건 함수
   * @param timeout 타임아웃 (밀리초)
   */
  static async waitForCondition<T extends EventMap, K extends keyof T>(
    emitter: EventEmitter<T>,
    event: K,
    condition: (...args: Parameters<T[K]>) => boolean,
    timeout?: number
  ): Promise<Parameters<T[K]>> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      // 타임아웃 설정
      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => {
          emitter.off(event, listener);
          reject(new Error(`Timeout waiting for condition on event "${String(event)}" after ${timeout}ms`));
        }, timeout);
      }

      const listener = (...args: Parameters<T[K]>) => {
        if (condition(...args)) {
          emitter.off(event, listener);
          if (timeoutId) clearTimeout(timeoutId);
          resolve(args);
        }
      };

      emitter.on(event, listener);
    });
  }

  /**
   * 이벤트를 Promise로 변환
   * 
   * @param emitter 이벤트 에미터
   * @param event 기다릴 이벤트 이름
   * @param timeout 타임아웃 (밀리초)
   */
  static promiseFromEvent<T extends EventMap, K extends keyof T>(
    emitter: EventEmitter<T>,
    event: K,
    timeout?: number
  ): Promise<Parameters<T[K]>> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      // 타임아웃 설정
      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => {
          emitter.off(event, listener);
          reject(new Error(`Timeout waiting for event "${String(event)}" after ${timeout}ms`));
        }, timeout);
      }

      const listener = (...args: Parameters<T[K]>) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(args);
      };

      emitter.once(event, listener);
    });
  }

  /**
   * 이벤트 파이프라인 생성
   * 
   * @param source 소스 이벤트 에미터
   * @param target 타겟 이벤트 에미터  
   * @param eventMap 이벤트 매핑
   */
  static createEventPipeline<S extends EventMap, T extends EventMap>(
    source: EventEmitter<S>,
    target: EventEmitter<T>,
    eventMap: Partial<Record<keyof S, keyof T>>
  ): () => void {
    const cleanupFunctions: (() => void)[] = [];

    for (const [sourceEvent, targetEvent] of Object.entries(eventMap) as Array<[keyof S, keyof T]>) {
      const listener = (...args: any[]) => {
        target.emit(targetEvent, ...args);
      };

      source.on(sourceEvent, listener);
      cleanupFunctions.push(() => source.off(sourceEvent, listener));
    }

    // 정리 함수 반환
    return () => {
      cleanupFunctions.forEach(fn => fn());
    };
  }
}

/**
 * 기본 이벤트 에미터 (타입 제한 없음)
 */
export class SimpleEventEmitter extends EventEmitter<Record<string, any>> {
  constructor(options?: EventEmitterOptions) {
    super(options);
  }
}

/**
 * 전역 이벤트 버스
 */
export const globalEventBus = new SimpleEventEmitter({
  maxListeners: 50,
  warnOnMaxListeners: true
});

/**
 * 디버깅을 위한 이벤트 로거
 */
export class EventLogger {
  private logs: Array<{
    timestamp: number;
    emitter: string;
    event: string;
    args: any[];
  }> = [];

  private maxLogs: number;

  constructor(maxLogs: number = 1000) {
    this.maxLogs = maxLogs;
  }

  /**
   * 이벤트 에미터에 로깅 연결
   */
  public attachTo<T extends EventMap>(emitter: EventEmitter<T>, name: string): void {
    // 원본 emit 메서드를 오버라이드
    const originalEmit = emitter.emit.bind(emitter);
    
    emitter.emit = <K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean => {
      this.log(name, String(event), args);
      return originalEmit(event, ...args);
    };
  }

  /**
   * 로그 기록
   */
  private log(emitter: string, event: string, args: any[]): void {
    this.logs.push({
      timestamp: Date.now(),
      emitter,
      event,
      args: [...args]
    });

    // 로그 크기 제한
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * 로그 조회
   */
  public getLogs(filter?: {
    emitter?: string;
    event?: string;
    since?: number;
    limit?: number;
  }): typeof this.logs {
    let filtered = this.logs;

    if (filter) {
      if (filter.emitter) {
        filtered = filtered.filter(log => log.emitter === filter.emitter);
      }
      
      if (filter.event) {
        filtered = filtered.filter(log => log.event === filter.event);
      }
      
      if (filter.since) {
        filtered = filtered.filter(log => log.timestamp >= filter.since!);
      }
      
      if (filter.limit) {
        filtered = filtered.slice(-filter.limit);
      }
    }

    return filtered;
  }

  /**
   * 로그 초기화
   */
  public clearLogs(): void {
    this.logs.length = 0;
  }

  /**
   * 로그를 콘솔에 출력
   */
  public printLogs(filter?: Parameters<typeof this.getLogs>[0]): void {
    const logs = this.getLogs(filter);
    
    console.group('Event Logs');
    for (const log of logs) {
      const timestamp = new Date(log.timestamp).toISOString();
      console.log(`[${timestamp}] ${log.emitter}.${log.event}`, log.args);
    }
    console.groupEnd();
  }
}