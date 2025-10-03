/**
 * 저장소 관리 모듈
 * 브라우저 localStorage 및 메모리 내 저장 지원
 */

import { EventEmitter } from '../utils/events.js';

export interface StorageConfig {
  prefix?: string;
  useLocalStorage?: boolean;
  maxEntries?: number;
}

export interface StorageEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  size: number;
}

export interface StorageStats {
  totalEntries: number;
  totalSize: number;
  availableSpace?: number;
  isLocalStorageAvailable: boolean;
}

/**
 * 저장소 관리 클래스
 * localStorage 사용 가능 시 영구 저장, 아니면 메모리 저장
 */
export class Storage extends EventEmitter {
  private config: Required<StorageConfig>;
  private memoryStore = new Map<string, any>();
  private isLocalStorageAvailable = false;

  constructor(config: StorageConfig = {}) {
    super();

    this.config = {
      prefix: config.prefix ?? 'jsbasic_',
      useLocalStorage: config.useLocalStorage ?? true,
      maxEntries: config.maxEntries ?? 1000
    };

    // localStorage 사용 가능 여부 체크
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();

    if (!this.isLocalStorageAvailable && this.config.useLocalStorage) {
      console.warn('⚠️ localStorage를 사용할 수 없습니다. 메모리 저장소를 사용합니다.');
    }
  }

  /**
   * localStorage 사용 가능 여부 확인
   */
  private checkLocalStorageAvailability(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 키에 prefix 추가
   */
  private getPrefixedKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * 데이터 저장
   */
  public set<T = any>(key: string, value: T): boolean {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      const serialized = JSON.stringify(value);

      if (this.isLocalStorageAvailable && this.config.useLocalStorage) {
        window.localStorage.setItem(prefixedKey, serialized);
      } else {
        // 메모리 저장소 크기 제한 체크
        if (this.memoryStore.size >= this.config.maxEntries) {
          console.warn(`⚠️ 메모리 저장소 용량 초과 (${this.config.maxEntries} 항목)`);
          return false;
        }
        this.memoryStore.set(prefixedKey, serialized);
      }

      this.emit('set', { key, value, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error(`❌ 저장 실패 (${key}):`, error);
      this.emit('error', { operation: 'set', key, error });
      return false;
    }
  }

  /**
   * 데이터 조회
   */
  public get<T = any>(key: string, defaultValue?: T): T | undefined {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      let serialized: string | null = null;

      if (this.isLocalStorageAvailable && this.config.useLocalStorage) {
        serialized = window.localStorage.getItem(prefixedKey);
      } else {
        serialized = this.memoryStore.get(prefixedKey) ?? null;
      }

      if (serialized === null) {
        return defaultValue;
      }

      const value = JSON.parse(serialized) as T;
      this.emit('get', { key, value, timestamp: Date.now() });
      return value;
    } catch (error) {
      console.error(`❌ 조회 실패 (${key}):`, error);
      this.emit('error', { operation: 'get', key, error });
      return defaultValue;
    }
  }

  /**
   * 데이터 존재 여부 확인
   */
  public has(key: string): boolean {
    const prefixedKey = this.getPrefixedKey(key);

    if (this.isLocalStorageAvailable && this.config.useLocalStorage) {
      return window.localStorage.getItem(prefixedKey) !== null;
    } else {
      return this.memoryStore.has(prefixedKey);
    }
  }

  /**
   * 데이터 삭제
   */
  public remove(key: string): boolean {
    try {
      const prefixedKey = this.getPrefixedKey(key);

      if (this.isLocalStorageAvailable && this.config.useLocalStorage) {
        window.localStorage.removeItem(prefixedKey);
      } else {
        this.memoryStore.delete(prefixedKey);
      }

      this.emit('remove', { key, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error(`❌ 삭제 실패 (${key}):`, error);
      this.emit('error', { operation: 'remove', key, error });
      return false;
    }
  }

  /**
   * 모든 데이터 삭제
   */
  public clear(): boolean {
    try {
      if (this.isLocalStorageAvailable && this.config.useLocalStorage) {
        // prefix가 있는 키만 삭제
        const keys = Object.keys(window.localStorage);
        for (const key of keys) {
          if (key.startsWith(this.config.prefix)) {
            window.localStorage.removeItem(key);
          }
        }
      } else {
        this.memoryStore.clear();
      }

      this.emit('clear', { timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('❌ 전체 삭제 실패:', error);
      this.emit('error', { operation: 'clear', error });
      return false;
    }
  }

  /**
   * 모든 키 목록 조회
   */
  public keys(): string[] {
    const keys: string[] = [];
    const prefixLength = this.config.prefix.length;

    if (this.isLocalStorageAvailable && this.config.useLocalStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          keys.push(key.substring(prefixLength));
        }
      }
    } else {
      for (const key of this.memoryStore.keys()) {
        if (key.startsWith(this.config.prefix)) {
          keys.push(key.substring(prefixLength));
        }
      }
    }

    return keys;
  }

  /**
   * 저장소 통계 조회
   */
  public getStats(): StorageStats {
    const keys = this.keys();
    let totalSize = 0;

    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        totalSize += JSON.stringify(value).length;
      }
    }

    const stats: StorageStats = {
      totalEntries: keys.length,
      totalSize,
      isLocalStorageAvailable: this.isLocalStorageAvailable
    };

    // localStorage 사용 시 남은 용량 추정
    if (this.isLocalStorageAvailable && this.config.useLocalStorage) {
      try {
        // 대부분의 브라우저에서 localStorage는 5-10MB 제한
        const maxSize = 5 * 1024 * 1024; // 5MB
        stats.availableSpace = Math.max(0, maxSize - totalSize);
      } catch (e) {
        // 용량 계산 실패 시 무시
      }
    }

    return stats;
  }

  /**
   * 특정 패턴의 키 검색
   */
  public search(pattern: string | RegExp): string[] {
    const keys = this.keys();
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;

    return keys.filter(key => regex.test(key));
  }

  /**
   * 일괄 저장
   */
  public setMultiple(entries: Record<string, any>): boolean {
    try {
      for (const [key, value] of Object.entries(entries)) {
        if (!this.set(key, value)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('❌ 일괄 저장 실패:', error);
      return false;
    }
  }

  /**
   * 일괄 조회
   */
  public getMultiple<T = any>(keys: string[]): Record<string, T | undefined> {
    const result: Record<string, T | undefined> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  /**
   * 정리 (리소스 해제)
   */
  public dispose(): void {
    this.memoryStore.clear();
    this.removeAllListeners();
  }
}
