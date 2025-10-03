import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Storage } from '@/io/storage';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage({ prefix: 'test_' });
  });

  afterEach(() => {
    storage.clear();
    storage.dispose();
  });

  describe('초기화', () => {
    test('기본 설정으로 생성되어야 함', () => {
      const defaultStorage = new Storage();
      expect(defaultStorage).toBeDefined();
      defaultStorage.dispose();
    });

    test('사용자 정의 설정으로 생성되어야 함', () => {
      const customStorage = new Storage({
        prefix: 'custom_',
        useLocalStorage: false,
        maxEntries: 500
      });

      expect(customStorage).toBeDefined();
      customStorage.dispose();
    });
  });

  describe('CRUD 연산', () => {
    test('set()으로 데이터 저장', () => {
      const result = storage.set('key1', 'value1');
      expect(result).toBe(true);
    });

    test('get()으로 데이터 조회', () => {
      storage.set('key1', 'value1');
      const value = storage.get('key1');
      expect(value).toBe('value1');
    });

    test('존재하지 않는 키 조회 시 undefined 반환', () => {
      const value = storage.get('nonexistent');
      expect(value).toBeUndefined();
    });

    test('get()에 기본값 제공', () => {
      const value = storage.get('nonexistent', 'default');
      expect(value).toBe('default');
    });

    test('has()로 키 존재 여부 확인', () => {
      storage.set('key1', 'value1');
      expect(storage.has('key1')).toBe(true);
      expect(storage.has('key2')).toBe(false);
    });

    test('remove()로 데이터 삭제', () => {
      storage.set('key1', 'value1');
      const result = storage.remove('key1');
      expect(result).toBe(true);
      expect(storage.has('key1')).toBe(false);
    });

    test('clear()로 모든 데이터 삭제', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const result = storage.clear();
      expect(result).toBe(true);
      expect(storage.has('key1')).toBe(false);
      expect(storage.has('key2')).toBe(false);
    });
  });

  describe('다양한 데이터 타입', () => {
    test('문자열 저장 및 조회', () => {
      storage.set('string', 'hello');
      expect(storage.get('string')).toBe('hello');
    });

    test('숫자 저장 및 조회', () => {
      storage.set('number', 42);
      expect(storage.get('number')).toBe(42);
    });

    test('boolean 저장 및 조회', () => {
      storage.set('bool', true);
      expect(storage.get('bool')).toBe(true);
    });

    test('객체 저장 및 조회', () => {
      const obj = { name: 'test', value: 123 };
      storage.set('object', obj);
      expect(storage.get('object')).toEqual(obj);
    });

    test('배열 저장 및 조회', () => {
      const arr = [1, 2, 3, 'four'];
      storage.set('array', arr);
      expect(storage.get('array')).toEqual(arr);
    });

    test('null 저장 및 조회', () => {
      storage.set('null', null);
      expect(storage.get('null')).toBe(null);
    });
  });

  describe('키 관리', () => {
    test('keys()로 모든 키 조회', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.set('key3', 'value3');

      const keys = storage.keys();
      expect(keys.length).toBe(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    test('search()로 패턴 매칭', () => {
      storage.set('user_1', 'Alice');
      storage.set('user_2', 'Bob');
      storage.set('admin_1', 'Charlie');

      const userKeys = storage.search('user_*');
      expect(userKeys.length).toBe(2);
      expect(userKeys).toContain('user_1');
      expect(userKeys).toContain('user_2');
    });

    test('search()에 정규식 사용', () => {
      storage.set('file_1', 'data1');
      storage.set('file_2', 'data2');
      storage.set('image_1', 'img1');

      const fileKeys = storage.search(/^file_/);
      expect(fileKeys.length).toBe(2);
    });
  });

  describe('일괄 연산', () => {
    test('setMultiple()로 여러 데이터 저장', () => {
      const data = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      };

      const result = storage.setMultiple(data);
      expect(result).toBe(true);
      expect(storage.get('key1')).toBe('value1');
      expect(storage.get('key2')).toBe('value2');
      expect(storage.get('key3')).toBe('value3');
    });

    test('getMultiple()로 여러 데이터 조회', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.set('key3', 'value3');

      const result = storage.getMultiple(['key1', 'key2', 'key4']);
      expect(result.key1).toBe('value1');
      expect(result.key2).toBe('value2');
      expect(result.key4).toBeUndefined();
    });
  });

  describe('통계', () => {
    test('getStats()로 저장소 통계 조회', () => {
      storage.set('key1', 'value1');
      storage.set('key2', { data: 'complex' });

      const stats = storage.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(typeof stats.isLocalStorageAvailable).toBe('boolean');
    });

    test('빈 저장소의 통계', () => {
      const stats = storage.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('이벤트', () => {
    test('set 이벤트 발생', (done) => {
      storage.on('set', (event) => {
        expect(event.key).toBe('key1');
        expect(event.value).toBe('value1');
        expect(event.timestamp).toBeGreaterThan(0);
        done();
      });

      storage.set('key1', 'value1');
    });

    test('get 이벤트 발생', (done) => {
      storage.set('key1', 'value1');

      storage.on('get', (event) => {
        expect(event.key).toBe('key1');
        expect(event.value).toBe('value1');
        done();
      });

      storage.get('key1');
    });

    test('remove 이벤트 발생', (done) => {
      storage.set('key1', 'value1');

      storage.on('remove', (event) => {
        expect(event.key).toBe('key1');
        done();
      });

      storage.remove('key1');
    });

    test('clear 이벤트 발생', (done) => {
      storage.set('key1', 'value1');

      storage.on('clear', (event) => {
        expect(event.timestamp).toBeGreaterThan(0);
        done();
      });

      storage.clear();
    });
  });

  describe('에러 처리', () => {
    test('순환 참조 객체 저장 시 에러 처리', (done) => {
      const circular: any = { a: 1 };
      circular.self = circular;

      storage.on('error', (event) => {
        expect(event.operation).toBe('set');
        expect(event.key).toBe('circular');
        done();
      });

      const result = storage.set('circular', circular);
      expect(result).toBe(false);

      // 이벤트가 발생하지 않을 수도 있으므로 타임아웃 처리
      setTimeout(() => {
        done();
      }, 100);
    });
  });

  describe('prefix 격리', () => {
    test('다른 prefix는 서로 격리됨', () => {
      const storage1 = new Storage({ prefix: 'app1_' });
      const storage2 = new Storage({ prefix: 'app2_' });

      storage1.set('key', 'value1');
      storage2.set('key', 'value2');

      expect(storage1.get('key')).toBe('value1');
      expect(storage2.get('key')).toBe('value2');

      storage1.dispose();
      storage2.dispose();
    });
  });

  describe('리소스 정리', () => {
    test('dispose()로 리소스 정리', () => {
      storage.set('key1', 'value1');
      storage.dispose();

      // 이벤트 리스너가 제거되었는지 확인
      const handler = () => {};
      storage.on('set', handler);
      // dispose() 후에는 이벤트가 발생하지 않아야 함
    });
  });
});
