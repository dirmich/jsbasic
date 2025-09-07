import { describe, test, expect, beforeEach } from 'bun:test';
import { MemoryManager } from '../../memory/manager';
import { MemoryError } from '../../utils/errors';

/**
 * 메모리 관리자 종합 테스트
 * 
 * 메모리 관리자의 모든 기능을 검증합니다:
 * - 기본 메모리 접근 (읽기/쓰기)
 * - 메모리 뱅킹 시스템
 * - 메모리 보호 시스템
 * - 메모리 맵핑 시스템
 * - 접근 추적 및 로깅
 * - DMA 및 고속 메모리 연산
 * - 에러 처리
 */

describe('MemoryManager', () => {
  let memory: MemoryManager;

  beforeEach(() => {
    memory = new MemoryManager(65536, { 
      trackAccess: false, 
      enforceProtection: true,
      protectInterruptVectors: false  // 테스트에서는 인터럽트 벡터 보호 비활성화
    });
  });

  describe('기본 메모리 접근', () => {
    test('바이트 읽기/쓰기', () => {
      memory.writeByte(0x1234, 0x42);
      expect(memory.readByte(0x1234)).toBe(0x42);
      
      memory.writeByte(0x0000, 0xFF);
      expect(memory.readByte(0x0000)).toBe(0xFF);
    });

    test('워드 읽기/쓰기 (리틀 엔디언)', () => {
      memory.writeWord(0x1000, 0x1234);
      expect(memory.readByte(0x1000)).toBe(0x34); // 하위 바이트
      expect(memory.readByte(0x1001)).toBe(0x12); // 상위 바이트
      expect(memory.readWord(0x1000)).toBe(0x1234);
      
      memory.writeWord(0x2000, 0xABCD);
      expect(memory.readWord(0x2000)).toBe(0xABCD);
    });

    test('메모리 경계 처리', () => {
      // 최대 주소 테스트
      memory.writeByte(0xFFFF, 0x99);
      expect(memory.readByte(0xFFFF)).toBe(0x99);
      
      // 워드 읽기 시 경계 래핑
      memory.writeByte(0xFFFF, 0x34);
      memory.writeByte(0x0000, 0x12);
      expect(memory.readWord(0xFFFF)).toBe(0x1234);
    });

    test('메모리 블록 읽기/쓰기', () => {
      const testData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
      memory.setBytes(0x8000, testData);
      
      const readData = memory.getBytes(0x8000, 5);
      expect(readData).toEqual(testData);
    });

    test('메모리 초기화', () => {
      memory.writeByte(0x1000, 0xFF);
      memory.writeByte(0x1001, 0xAA);
      
      memory.clear(0x00);
      
      expect(memory.readByte(0x1000)).toBe(0x00);
      expect(memory.readByte(0x1001)).toBe(0x00);
    });
  });

  describe('메모리 뱅킹 시스템', () => {
    test('뱅크 생성 및 전환', () => {
      memory.createBank('test', 32768);
      
      const bankInfo = memory.getBankInfo();
      expect(bankInfo.length).toBe(2); // main + test
      expect(bankInfo.find(b => b.name === 'test')).toBeDefined();
      
      memory.switchBank('test');
      expect(memory.getCurrentBank()).toBe('test');
    });

    test('뱅크별 독립적인 메모리 공간', () => {
      memory.createBank('bank1', 65536);
      memory.createBank('bank2', 65536);
      
      // 메인 뱅크에 데이터 쓰기
      memory.writeByte(0x1000, 0xAA);
      
      // bank1으로 전환
      memory.switchBank('bank1');
      expect(memory.readByte(0x1000)).toBe(0x00); // 초기화 상태
      memory.writeByte(0x1000, 0xBB);
      
      // bank2로 전환
      memory.switchBank('bank2');
      expect(memory.readByte(0x1000)).toBe(0x00); // 초기화 상태
      memory.writeByte(0x1000, 0xCC);
      
      // 메인 뱅크로 복귀
      memory.switchBank('main');
      expect(memory.readByte(0x1000)).toBe(0xAA);
      
      // 각 뱅크 확인
      memory.switchBank('bank1');
      expect(memory.readByte(0x1000)).toBe(0xBB);
      
      memory.switchBank('bank2');
      expect(memory.readByte(0x1000)).toBe(0xCC);
    });

    test('뱅크 삭제', () => {
      memory.createBank('temp', 1024);
      expect(memory.getBankInfo().length).toBe(2);
      
      memory.deleteBank('temp');
      expect(memory.getBankInfo().length).toBe(1);
    });

    test('메인 뱅크 삭제 방지', () => {
      expect(() => memory.deleteBank('main')).toThrow(MemoryError);
    });

    test('현재 뱅크 삭제 방지', () => {
      memory.createBank('current', 1024);
      memory.switchBank('current');
      
      expect(() => memory.deleteBank('current')).toThrow(MemoryError);
    });

    test('존재하지 않는 뱅크 전환 시도', () => {
      expect(() => memory.switchBank('nonexistent')).toThrow(MemoryError);
    });
  });

  describe('메모리 보호 시스템', () => {
    test('읽기 전용 보호', () => {
      // 먼저 데이터를 쓴 후 보호 설정
      memory.writeByte(0x8000, 0x42);
      
      memory.setProtection(0x8000, 0x80FF, {
        readable: true,
        writable: false,
        description: 'ROM area'
      });
      
      // 읽기는 허용
      expect(memory.readByte(0x8000)).toBe(0x42);
      
      // 쓰기는 차단
      expect(() => memory.writeByte(0x8000, 0x99)).toThrow(MemoryError);
    });

    test('쓰기 전용 보호 (특수한 경우)', () => {
      memory.setProtection(0x9000, 0x90FF, {
        readable: false,
        writable: true,
        description: 'Write-only register'
      });
      
      // 쓰기는 허용
      memory.writeByte(0x9000, 0x42);
      
      // 읽기는 차단
      expect(() => memory.readByte(0x9000)).toThrow(MemoryError);
    });

    test('보호 해제', () => {
      memory.setProtection(0xA000, 0xA0FF, {
        readable: true,
        writable: false,
        description: 'Temporary ROM'
      });
      
      expect(() => memory.writeByte(0xA000, 0x42)).toThrow(MemoryError);
      
      memory.clearProtection(0xA000, 0xA0FF);
      memory.writeByte(0xA000, 0x42); // 이제 허용됨
      expect(memory.readByte(0xA000)).toBe(0x42);
    });

    test('보호 강제 비활성화', () => {
      memory.setProtection(0xB000, 0xB0FF, {
        readable: true,
        writable: false,
        description: 'Protected area'
      });
      
      expect(() => memory.writeByte(0xB000, 0x42)).toThrow(MemoryError);
      
      memory.setEnforceProtection(false);
      memory.writeByte(0xB000, 0x42); // 이제 허용됨
      expect(memory.readByte(0xB000)).toBe(0x42);
    });

    test('보호 영역 확인', () => {
      const protection = {
        readable: true,
        writable: false,
        description: 'Test area'
      };
      
      memory.setProtection(0xC000, 0xC0FF, protection);
      
      expect(memory.isProtected(0xC000)).toEqual(protection);
      expect(memory.isProtected(0xC080)).toEqual(protection);
      expect(memory.isProtected(0xC100)).toBeUndefined();
    });
  });

  describe('메모리 맵핑 시스템', () => {
    test('I/O 포트 시뮬레이션', () => {
      let ioValue = 0x00;
      
      memory.addMemoryMap(0xD000, 0xD000, {
        name: 'Test I/O Port',
        description: 'Virtual I/O register',
        type: 'io',
        readHandler: (address) => {
          return ioValue;
        },
        writeHandler: (address, value) => {
          ioValue = value;
        }
      });
      
      // I/O 포트 쓰기
      memory.writeByte(0xD000, 0x42);
      
      // I/O 포트 읽기
      expect(memory.readByte(0xD000)).toBe(0x42);
      expect(ioValue).toBe(0x42);
    });

    test('메모리 매핑된 디바이스', () => {
      const device = new Uint8Array(256);
      
      memory.addMemoryMap(0xE000, 0xE0FF, {
        name: 'Mapped Device',
        description: 'Memory-mapped device',
        type: 'device',
        readHandler: (address) => device[address & 0xFF],
        writeHandler: (address, value) => {
          device[address & 0xFF] = value;
        }
      });
      
      // 디바이스에 데이터 쓰기
      memory.writeByte(0xE010, 0x99);
      memory.writeByte(0xE020, 0xAA);
      
      // 디바이스에서 데이터 읽기
      expect(memory.readByte(0xE010)).toBe(0x99);
      expect(memory.readByte(0xE020)).toBe(0xAA);
      
      // 직접 디바이스 배열 확인
      expect(device[0x10]).toBe(0x99);
      expect(device[0x20]).toBe(0xAA);
    });

    test('메모리 맵 제거', () => {
      memory.addMemoryMap(0xF000, 0xF0FF, {
        name: 'Temporary Map',
        description: 'Test mapping',
        type: 'ram'
      });
      
      memory.removeMemoryMap(0xF000, 0xF0FF);
      
      // 일반 메모리로 동작해야 함
      memory.writeByte(0xF000, 0x77);
      expect(memory.readByte(0xF000)).toBe(0x77);
    });
  });

  describe('접근 추적 및 로깅', () => {
    beforeEach(() => {
      memory.setAccessTracking(true);
    });

    test('메모리 접근 로그 기록', () => {
      memory.clearAccessLog();
      
      memory.writeByte(0x1000, 0x42);
      memory.readByte(0x1000);
      memory.writeByte(0x1001, 0x99);
      
      const log = memory.getAccessLog();
      expect(log.length).toBe(3);
      
      expect(log[0].operation).toBe('write');
      expect(log[0].address).toBe(0x1000);
      expect(log[0].value).toBe(0x42);
      
      expect(log[1].operation).toBe('read');
      expect(log[1].address).toBe(0x1000);
      expect(log[1].value).toBe(0x42);
      
      expect(log[2].operation).toBe('write');
      expect(log[2].address).toBe(0x1001);
      expect(log[2].value).toBe(0x99);
    });

    test('로그 크기 제한', () => {
      memory.setMaxLogSize(5);
      
      // 6개의 접근 실행
      for (let i = 0; i < 6; i++) {
        memory.writeByte(0x1000 + i, i);
      }
      
      const log = memory.getAccessLog();
      expect(log.length).toBe(5); // 최대 5개만 유지
      expect(log[0].value).toBe(1); // 첫 번째는 제거됨
    });

    test('접근 추적 비활성화', () => {
      memory.clearAccessLog();
      memory.setAccessTracking(false);
      
      memory.writeByte(0x1000, 0x42);
      memory.readByte(0x1000);
      
      const log = memory.getAccessLog();
      expect(log.length).toBe(0);
    });
  });

  describe('DMA 및 고속 메모리 연산', () => {
    test('메모리 블록 복사', () => {
      // 원본 데이터 설정
      const sourceData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
      memory.setBytes(0x8000, sourceData);
      
      // 메모리 복사
      memory.copyMemory(0x8000, 0x9000, 5);
      
      // 복사 결과 확인
      const copiedData = memory.getBytes(0x9000, 5);
      expect(copiedData).toEqual(sourceData);
    });

    test('겹치는 영역 복사 (정방향)', () => {
      const testData = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD, 0xEE]);
      memory.setBytes(0x1000, testData);
      
      // 겹치는 영역으로 복사 (앞에서 뒤로)
      memory.copyMemory(0x1000, 0x1002, 3);
      
      expect(memory.readByte(0x1002)).toBe(0xAA);
      expect(memory.readByte(0x1003)).toBe(0xBB);
      expect(memory.readByte(0x1004)).toBe(0xCC);
    });

    test('겹치는 영역 복사 (역방향)', () => {
      const testData = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD, 0xEE]);
      memory.setBytes(0x1000, testData);
      
      // 겹치는 영역으로 복사 (뒤에서 앞으로)
      memory.copyMemory(0x1002, 0x1000, 3);
      
      expect(memory.readByte(0x1000)).toBe(0xCC);
      expect(memory.readByte(0x1001)).toBe(0xDD);
      expect(memory.readByte(0x1002)).toBe(0xEE);
    });

    test('메모리 블록 채우기', () => {
      memory.fillMemory(0x2000, 100, 0x55);
      
      for (let i = 0; i < 100; i++) {
        expect(memory.readByte(0x2000 + i)).toBe(0x55);
      }
    });

    test('메모리 패턴 검색', () => {
      // 테스트 패턴 설정
      memory.writeByte(0x3000, 0xDE);
      memory.writeByte(0x3001, 0xAD);
      memory.writeByte(0x3002, 0xBE);
      memory.writeByte(0x3003, 0xEF);
      
      memory.writeByte(0x3010, 0xDE);
      memory.writeByte(0x3011, 0xAD);
      memory.writeByte(0x3012, 0xBE);
      memory.writeByte(0x3013, 0xEF);
      
      // 패턴 검색
      const pattern = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
      const results = memory.searchPattern(pattern, 0x3000, 0x3020);
      
      expect(results).toEqual([0x3000, 0x3010]);
    });
  });

  describe('에러 처리', () => {
    test('유효하지 않은 주소', () => {
      expect(() => memory.readByte(-1)).toThrow(MemoryError);
      expect(() => memory.readByte(0x10000)).toThrow(MemoryError);
      expect(() => memory.writeByte(0x10000, 0x42)).toThrow(MemoryError);
    });

    test('유효하지 않은 값', () => {
      expect(() => memory.writeByte(0x1000, -1)).toThrow(MemoryError);
      expect(() => memory.writeByte(0x1000, 0x100)).toThrow(MemoryError);
      expect(() => memory.writeWord(0x1000, -1)).toThrow(MemoryError);
      expect(() => memory.writeWord(0x1000, 0x10000)).toThrow(MemoryError);
    });

    test('유효하지 않은 메모리 크기', () => {
      expect(() => new MemoryManager(0)).toThrow(MemoryError);
      expect(() => new MemoryManager(0x10001)).toThrow(MemoryError);
    });

    test('존재하지 않는 뱅크', () => {
      expect(() => memory.switchBank('nonexistent')).toThrow(MemoryError);
      expect(() => memory.deleteBank('nonexistent')).toThrow(MemoryError);
    });

    test('중복 뱅크 생성', () => {
      memory.createBank('test', 1024);
      expect(() => memory.createBank('test', 1024)).toThrow(MemoryError);
    });
  });

  describe('메모리 통계 및 디버깅', () => {
    test('메모리 통계 조회', () => {
      memory.createBank('test', 2048);
      
      // 초기 보호된 영역 수 확인 (인터럽트 벡터 보호는 비활성화됨)
      const initialStats = memory.getMemoryStats();
      const initialProtectedRegions = initialStats.protectedRegions;
      
      memory.setProtection(0x8000, 0x80FF, {
        readable: true,
        writable: false,
        description: 'ROM'
      });
      
      const stats = memory.getMemoryStats();
      expect(stats.totalSize).toBe(65536);
      expect(stats.bankCount).toBe(2); // main + test
      expect(stats.protectedRegions).toBe(initialProtectedRegions + 256); // 0x8000-0x80FF (256 바이트)
      expect(stats.currentBank).toBe('main');
    });

    test('메모리 덤프', () => {
      // 테스트 데이터 설정
      for (let i = 0; i < 32; i++) {
        memory.writeByte(0x1000 + i, i);
      }
      
      const dump = memory.dump(0x1000, 32, 16);
      const lines = dump.split('\n');
      
      expect(lines.length).toBe(2); // 32바이트 = 2줄
      expect(lines[0]).toContain('1000:');
      expect(lines[1]).toContain('1010:');
    });

    test('메모리 리셋', () => {
      // 데이터 설정
      memory.writeByte(0x1000, 0xFF);
      memory.createBank('temp', 1024);
      memory.switchBank('temp');
      memory.setAccessTracking(true);
      memory.writeByte(0x2000, 0xAA);
      
      // 리셋 실행
      memory.reset();
      
      // 리셋 확인
      expect(memory.readByte(0x1000)).toBe(0x00);
      expect(memory.getCurrentBank()).toBe('main');
      expect(memory.getAccessLog().length).toBe(0);
    });
  });

  describe('이벤트 시스템', () => {
    test('읽기/쓰기 이벤트', (done) => {
      let readEventFired = false;
      let writeEventFired = false;
      
      memory.on('read', (address, value, bank) => {
        expect(address).toBe(0x1000);
        expect(value).toBe(0x42);
        expect(bank).toBe('main');
        readEventFired = true;
      });
      
      memory.on('write', (address, value, oldValue, bank) => {
        expect(address).toBe(0x1000);
        expect(value).toBe(0x42);
        expect(oldValue).toBe(0x00);
        expect(bank).toBe('main');
        writeEventFired = true;
      });
      
      memory.writeByte(0x1000, 0x42);
      memory.readByte(0x1000);
      
      setTimeout(() => {
        expect(readEventFired).toBe(true);
        expect(writeEventFired).toBe(true);
        done();
      }, 10);
    });

    test('뱅크 전환 이벤트', (done) => {
      memory.createBank('test', 1024);
      
      memory.on('bankSwitch', (oldBank, newBank) => {
        expect(oldBank).toBe('main');
        expect(newBank).toBe('test');
        done();
      });
      
      memory.switchBank('test');
    });

    test('보호 위반 이벤트', (done) => {
      memory.setProtection(0x8000, 0x8000, {
        readable: false,
        writable: true,
        description: 'Write-only'
      });
      
      memory.on('protection', (address, operation, protection) => {
        expect(address).toBe(0x8000);
        expect(operation).toBe('read');
        expect(protection.readable).toBe(false);
        done();
      });
      
      try {
        memory.readByte(0x8000);
      } catch (error) {
        // 에러 발생 예상
      }
    });
  });
});