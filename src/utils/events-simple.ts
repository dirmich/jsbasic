/**
 * 단순하고 타입 안전한 이벤트 시스템
 * 
 * EventEmitter의 복잡한 제네릭 문제를 해결한 단순화된 버전
 */

/**
 * 이벤트 리스너 타입
 */
export type EventListener = (...args: any[]) => void;

/**
 * 이벤트 맵 타입 - string 키에 EventListener 값
 */
export type EventMap = Record<string, EventListener>;

/**
 * 간단한 EventEmitter 구현
 */
export class EventEmitter<T extends EventMap = EventMap> {
  private readonly eventListeners = new Map<keyof T, Set<EventListener>>();
  private readonly maxListeners = 10;

  /**
   * 이벤트 리스너 추가
   */
  public on<K extends keyof T>(eventName: K, listener: T[K]): this {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }

    const eventListeners = this.eventListeners.get(eventName)!;
    eventListeners.add(listener as EventListener);

    // 최대 리스너 수 경고
    if (eventListeners.size > this.maxListeners) {
      console.warn(`Warning: Possible EventEmitter memory leak detected. ${eventListeners.size} listeners added for event '${String(eventName)}'`);
    }

    return this;
  }

  /**
   * 일회성 이벤트 리스너 추가
   */
  public once<K extends keyof T>(eventName: K, listener: T[K]): this {
    const onceWrapper = ((...args: any[]) => {
      this.off(eventName, onceWrapper as T[K]);
      (listener as EventListener)(...args);
    }) as T[K];

    return this.on(eventName, onceWrapper);
  }

  /**
   * 이벤트 리스너 제거
   */
  public off<K extends keyof T>(eventName: K, listener: T[K]): this {
    const eventListeners = this.eventListeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener);
      if (eventListeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    }
    return this;
  }

  /**
   * 특정 이벤트의 모든 리스너 제거
   */
  public removeAllListeners<K extends keyof T>(eventName?: K): this {
    if (eventName) {
      this.eventListeners.delete(eventName);
    } else {
      this.eventListeners.clear();
    }
    return this;
  }

  /**
   * 이벤트 발생
   */
  public emit<K extends keyof T>(eventName: K, ...args: Parameters<T[K]>): boolean {
    const eventListeners = this.eventListeners.get(eventName);
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }

    // 리스너 복사본을 만들어서 실행 중 변경을 방지
    const listenersCopy = Array.from(eventListeners);
    
    for (const listener of listenersCopy) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for '${String(eventName)}':`, error);
      }
    }

    return true;
  }

  /**
   * 특정 이벤트의 리스너 수 반환
   */
  public listenerCount<K extends keyof T>(eventName: K): number {
    const eventListeners = this.eventListeners.get(eventName);
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * 모든 이벤트 이름 반환
   */
  public eventNames(): (keyof T)[] {
    return Array.from(this.eventListeners.keys());
  }

  /**
   * 특정 이벤트의 모든 리스너 반환
   */
  public listeners<K extends keyof T>(eventName: K): T[K][] {
    const eventListeners = this.eventListeners.get(eventName);
    return eventListeners ? Array.from(eventListeners) as T[K][] : [];
  }
}