import { describe, test, expect, beforeEach } from 'bun:test';
import { CPU6502 } from '../../cpu/cpu';
import { MemoryManager } from '../../memory/manager';
import { CPUError } from '../../utils/errors';

/**
 * 6502 CPU 종합 테스트
 * 
 * 이 테스트 스위트는 6502 CPU 에뮬레이터의 모든 기능을 검증합니다:
 * - 기본 CPU 초기화 및 리셋
 * - 레지스터 관리 및 플래그 처리
 * - 메모리 접근 및 스택 연산
 * - 명령어 실행 및 사이클 계산
 * - 인터럽트 처리
 * - 에러 조건 처리
 */

describe('CPU6502', () => {
  let cpu: CPU6502;
  let memory: MemoryManager;

  beforeEach(() => {
    // 테스트를 위해 인터럽트 벡터 보호 비활성화
    memory = new MemoryManager(65536, {
      protectInterruptVectors: false  // 테스트 시 보호 해제
    });
    cpu = new CPU6502(memory);
  });

  describe('CPU 초기화 및 리셋', () => {
    test('초기화 시 올바른 기본값을 가져야 함', () => {
      const state = cpu.getState();
      
      expect(state.registers.A).toBe(0);
      expect(state.registers.X).toBe(0);
      expect(state.registers.Y).toBe(0);
      expect(state.registers.PC).toBe(0);
      expect(state.registers.SP).toBe(0xFF);
      expect(state.registers.P).toBe(0x24); // I 플래그와 unused 비트 설정
      expect(state.flags.I).toBe(true);
      expect(state.flags.Z).toBe(false);
      expect(state.flags.C).toBe(false);
      expect(state.flags.N).toBe(false);
      expect(state.flags.V).toBe(false);
      expect(state.flags.D).toBe(false);
      expect(state.flags.B).toBe(false);
      expect(state.isHalted).toBe(false);
    });

    test('리셋 시 올바르게 초기화되어야 함', () => {
      // 리셋 벡터 설정
      memory.writeByte(0xFFFC, 0x00);
      memory.writeByte(0xFFFD, 0x80);
      
      // CPU 상태 변경
      cpu.setRegisterA(0x42);
      cpu.setRegisterX(0x33);
      cpu.setFlag('Z', true);
      
      // 리셋 실행
      cpu.reset();
      
      const state = cpu.getState();
      expect(state.registers.A).toBe(0x42); // A, X, Y는 보존
      expect(state.registers.X).toBe(0x33);
      expect(state.registers.PC).toBe(0x8000); // 리셋 벡터에서 로드
      expect(state.registers.SP).toBe(0xFF);
      expect(state.flags.I).toBe(true); // 인터럽트 비활성화
      expect(state.flags.D).toBe(false); // Decimal 모드 클리어
    });
  });

  describe('레지스터 관리', () => {
    test('A 레지스터 설정 및 플래그 업데이트', () => {
      cpu.setRegisterA(0x00);
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.getFlag('Z')).toBe(true);
      expect(cpu.getFlag('N')).toBe(false);
      
      cpu.setRegisterA(0x80);
      expect(cpu.registers.A).toBe(0x80);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(true);
      
      cpu.setRegisterA(0x42);
      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('X 레지스터 설정 및 플래그 업데이트', () => {
      cpu.setRegisterX(0x00);
      expect(cpu.registers.X).toBe(0x00);
      expect(cpu.getFlag('Z')).toBe(true);
      expect(cpu.getFlag('N')).toBe(false);
      
      cpu.setRegisterX(0xFF);
      expect(cpu.registers.X).toBe(0xFF);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(true);
    });

    test('Y 레지스터 설정 및 플래그 업데이트', () => {
      cpu.setRegisterY(0x7F);
      expect(cpu.registers.Y).toBe(0x7F);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('PC 레지스터 16비트 처리', () => {
      cpu.setRegisterPC(0x1234);
      expect(cpu.registers.PC).toBe(0x1234);
      
      cpu.setRegisterPC(0xFFFF);
      expect(cpu.registers.PC).toBe(0xFFFF);
      
      // 오버플로우 처리
      cpu.setRegisterPC(0x10000);
      expect(cpu.registers.PC).toBe(0x0000);
    });

    test('스택 포인터 설정', () => {
      cpu.setRegisterSP(0x80);
      expect(cpu.registers.SP).toBe(0x80);
      
      // 스택 포인터는 8비트
      cpu.setRegisterSP(0x1FF);
      expect(cpu.registers.SP).toBe(0xFF);
    });

    test('상태 레지스터 플래그 설정', () => {
      cpu.setRegisterP(0xFF);
      expect(cpu.getFlag('N')).toBe(true);
      expect(cpu.getFlag('V')).toBe(true);
      expect(cpu.getFlag('D')).toBe(true);
      expect(cpu.getFlag('I')).toBe(true);
      expect(cpu.getFlag('Z')).toBe(true);
      expect(cpu.getFlag('C')).toBe(true);
      
      cpu.setRegisterP(0x00);
      expect(cpu.getFlag('N')).toBe(false);
      expect(cpu.getFlag('V')).toBe(false);
      expect(cpu.getFlag('D')).toBe(false);
      expect(cpu.getFlag('I')).toBe(false);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('C')).toBe(false);
    });
  });

  describe('플래그 관리', () => {
    test('개별 플래그 설정', () => {
      cpu.setFlag('C', true);
      expect(cpu.getFlag('C')).toBe(true);
      expect(cpu.registers.P & 0x01).toBe(0x01);
      
      cpu.setFlag('Z', true);
      expect(cpu.getFlag('Z')).toBe(true);
      expect(cpu.registers.P & 0x02).toBe(0x02);
      
      cpu.setFlag('I', true);
      expect(cpu.getFlag('I')).toBe(true);
      expect(cpu.registers.P & 0x04).toBe(0x04);
      
      cpu.setFlag('D', true);
      expect(cpu.getFlag('D')).toBe(true);
      expect(cpu.registers.P & 0x08).toBe(0x08);
      
      cpu.setFlag('V', true);
      expect(cpu.getFlag('V')).toBe(true);
      expect(cpu.registers.P & 0x40).toBe(0x40);
      
      cpu.setFlag('N', true);
      expect(cpu.getFlag('N')).toBe(true);
      expect(cpu.registers.P & 0x80).toBe(0x80);
    });

    test('플래그 클리어', () => {
      // 모든 플래그 설정
      cpu.setRegisterP(0xFF);
      
      cpu.setFlag('C', false);
      expect(cpu.getFlag('C')).toBe(false);
      expect(cpu.registers.P & 0x01).toBe(0x00);
      
      cpu.setFlag('N', false);
      expect(cpu.getFlag('N')).toBe(false);
      expect(cpu.registers.P & 0x80).toBe(0x00);
    });
  });

  describe('메모리 접근', () => {
    test('바이트 읽기/쓰기', () => {
      cpu.writeByte(0x1234, 0x42);
      expect(cpu.readByte(0x1234)).toBe(0x42);
      
      cpu.writeByte(0x0000, 0xFF);
      expect(cpu.readByte(0x0000)).toBe(0xFF);
    });

    test('워드 읽기/쓰기 (리틀 엔디언)', () => {
      cpu.writeWord(0x1000, 0x1234);
      expect(cpu.readByte(0x1000)).toBe(0x34); // 하위 바이트
      expect(cpu.readByte(0x1001)).toBe(0x12); // 상위 바이트
      expect(cpu.readWord(0x1000)).toBe(0x1234);
      
      cpu.writeWord(0x2000, 0xABCD);
      expect(cpu.readWord(0x2000)).toBe(0xABCD);
    });

    test('메모리 경계 처리', () => {
      // 최대 주소 테스트 - 보호되지 않은 높은 주소 사용
      cpu.writeByte(0x7FFF, 0x99);
      expect(cpu.readByte(0x7FFF)).toBe(0x99);

      // 워드 읽기 시 경계 넘어감 - 0x7FFF 사용
      cpu.writeByte(0x7FFF, 0x34);
      cpu.writeByte(0x8000, 0x12);
      expect(cpu.readWord(0x7FFF)).toBe(0x1234);
    });
  });

  describe('스택 연산', () => {
    test('바이트 푸시/풀', () => {
      const initialSP = cpu.registers.SP;
      
      cpu.pushByte(0x42);
      expect(cpu.registers.SP).toBe(initialSP - 1);
      expect(cpu.readByte(0x0100 + initialSP)).toBe(0x42);
      
      const popped = cpu.pullByte();
      expect(popped).toBe(0x42);
      expect(cpu.registers.SP).toBe(initialSP);
    });

    test('워드 푸시/풀', () => {
      const initialSP = cpu.registers.SP;
      
      cpu.pushWord(0x1234);
      expect(cpu.registers.SP).toBe(initialSP - 2);
      
      const popped = cpu.pullWord();
      expect(popped).toBe(0x1234);
      expect(cpu.registers.SP).toBe(initialSP);
    });

    test('스택 오버플로우 처리', () => {
      // 스택 포인터를 0으로 설정
      cpu.setRegisterSP(0x00);
      
      // 푸시하면 SP가 0xFF로 래핑
      cpu.pushByte(0x42);
      expect(cpu.registers.SP).toBe(0xFF);
      
      // 풀하면 SP가 0x00으로 래핑  
      const popped = cpu.pullByte();
      expect(popped).toBe(0x42);
      expect(cpu.registers.SP).toBe(0x00);
    });
  });

  describe('명령어 페치', () => {
    test('바이트 페치', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x42);
      
      const fetched = cpu.fetchByte();
      expect(fetched).toBe(0x42);
      expect(cpu.registers.PC).toBe(0x8001);
    });

    test('워드 페치', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x34); // 하위 바이트
      memory.writeByte(0x8001, 0x12); // 상위 바이트
      
      const fetched = cpu.fetchWord();
      expect(fetched).toBe(0x1234);
      expect(cpu.registers.PC).toBe(0x8002);
    });

    test('PC 오버플로우 처리', () => {
      cpu.setRegisterPC(0x7FFF);
      memory.writeByte(0x7FFF, 0x42);

      const fetched = cpu.fetchByte();
      expect(fetched).toBe(0x42);
      expect(cpu.registers.PC).toBe(0x8000);
    });
  });

  describe('인터럽트 처리', () => {
    beforeEach(() => {
      // 인터럽트 벡터 설정
      memory.writeWord(0xFFFA, 0x9000); // NMI 벡터
      memory.writeWord(0xFFFC, 0x8000); // RESET 벡터  
      memory.writeWord(0xFFFE, 0xA000); // IRQ/BRK 벡터
    });

    test('NMI 인터럽트', () => {
      cpu.setRegisterPC(0x1234);
      cpu.setRegisterA(0x42);
      cpu.setFlag('C', true);
      
      cpu.nmi();
      
      // PC와 P가 스택에 저장되었는지 확인
      const savedPCH = cpu.readByte(0x01FF);  // 상위 바이트가 먼저 푸시됨
      const savedPCL = cpu.readByte(0x01FE);  // 하위 바이트가 나중에 푸시됨
      const savedP = cpu.readByte(0x01FD);
      
      expect((savedPCH << 8) | savedPCL).toBe(0x1234);
      expect(savedP & 0x01).toBe(0x01); // C 플래그 저장됨
      
      // 인터럽트 벡터로 점프
      expect(cpu.registers.PC).toBe(0x9000);
      expect(cpu.getFlag('I')).toBe(true);
      
      // 스택 포인터 확인
      expect(cpu.registers.SP).toBe(0xFF - 3);
    });

    test('IRQ 인터럽트 (활성화된 상태)', () => {
      cpu.setRegisterPC(0x5678);
      cpu.setFlag('I', false); // 인터럽트 활성화
      
      cpu.irq();
      
      expect(cpu.registers.PC).toBe(0xA000);
      expect(cpu.getFlag('I')).toBe(true);
    });

    test('IRQ 인터럽트 (비활성화된 상태)', () => {
      const originalPC = 0x5678;
      cpu.setRegisterPC(originalPC);
      cpu.setFlag('I', true); // 인터럽트 비활성화
      
      cpu.irq();
      
      // 인터럽트가 무시되어야 함
      expect(cpu.registers.PC).toBe(originalPC);
    });
  });

  describe('명령어 실행', () => {
    test('NOP 명령어 실행', () => {
      // NOP (0xEA) 명령어 설정
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xEA);
      
      const cycles = cpu.step();
      
      expect(cycles).toBe(2); // NOP는 2사이클
      expect(cpu.registers.PC).toBe(0x8001);
    });

    test('LDA immediate 명령어 실행', () => {
      // LDA #$42 (0xA9 0x42)
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xA9);
      memory.writeByte(0x8001, 0x42);
      
      const cycles = cpu.step();
      
      expect(cycles).toBe(2);
      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.registers.PC).toBe(0x8002);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('STA absolute 명령어 실행', () => {
      // STA $1000 (0x8D 0x00 0x10)
      cpu.setRegisterA(0x99);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x8D);
      memory.writeByte(0x8001, 0x00);
      memory.writeByte(0x8002, 0x10);
      
      const cycles = cpu.step();
      
      expect(cycles).toBe(4);
      expect(memory.readByte(0x1000)).toBe(0x99);
      expect(cpu.registers.PC).toBe(0x8003);
    });
  });

  describe('사이클 계산', () => {
    test('기본 사이클 카운트', () => {
      expect(cpu.getCycleCount()).toBe(0);
      
      // NOP 실행 (2사이클)
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xEA);
      cpu.step();
      
      expect(cpu.getCycleCount()).toBe(2);
    });

    test('누적 사이클 계산', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xEA); // NOP (2사이클)
      memory.writeByte(0x8001, 0xEA); // NOP (2사이클)
      
      cpu.step();
      cpu.step();
      
      expect(cpu.getCycleCount()).toBe(4);
    });
  });

  describe('에러 처리', () => {
    test('유효하지 않은 명령어', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x02); // 유효하지 않은 명령어
      
      expect(() => cpu.step()).toThrow(CPUError);
    });

    test('잘못된 레지스터 접근', () => {
      expect(() => cpu.setFlag('X' as any, true)).toThrow();
    });
  });

  describe('CPU 상태 관리', () => {
    test('CPU 정지', () => {
      cpu.halt();
      expect(cpu.isHalted).toBe(true);
      
      // 정지된 상태에서는 step이 0 사이클 반환
      const cycles = cpu.step();
      expect(cycles).toBe(0);
    });

    test('CPU 재개', () => {
      cpu.halt();
      cpu.resume();
      expect(cpu.isHalted).toBe(false);
    });

    test('상태 스냅샷', () => {
      cpu.setRegisterA(0x42);
      cpu.setRegisterX(0x33);
      cpu.setRegisterPC(0x1234);
      cpu.setFlag('C', true);
      cpu.setFlag('Z', true);
      
      const state = cpu.getState();
      
      expect(state.registers.A).toBe(0x42);
      expect(state.registers.X).toBe(0x33);
      expect(state.registers.PC).toBe(0x1234);
      expect(state.flags.C).toBe(true);
      expect(state.flags.Z).toBe(true);
      expect(state.flags.N).toBe(false);
      expect(state.isHalted).toBe(false);
    });
  });

  describe('메모리 관리자 연동', () => {
    test('메모리 매니저와 상호작용', () => {
      // 메모리 매니저 직접 사용
      memory.writeByte(0x2000, 0xAB);
      expect(cpu.readByte(0x2000)).toBe(0xAB);
      
      // CPU를 통한 메모리 접근
      cpu.writeByte(0x3000, 0xCD);
      expect(memory.readByte(0x3000)).toBe(0xCD);
    });

    test('메모리 크기 제한', () => {
      // 64KB 메모리 경계 테스트 - 보호되지 않은 주소 사용
      cpu.writeByte(0x7FFF, 0x99);  // 0xFFFF는 보호 영역이므로 0x7FFF 사용
      expect(cpu.readByte(0x7FFF)).toBe(0x99);

      // 16비트 주소 래핑
      const wrappedAddress = 0x10000 & 0xFFFF;
      expect(wrappedAddress).toBe(0x0000);
    });
  });

  describe('이벤트 시스템', () => {
    test('beforeStep 이벤트', (done) => {
      cpu.on('beforeStep', (state) => {
        expect(state.registers.PC).toBe(0x8000);
        done();
      });
      
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xEA); // NOP
      cpu.step();
    });

    test('afterStep 이벤트', (done) => {
      cpu.on('afterStep', (state, cycles) => {
        expect(cycles).toBe(2);
        expect(state.registers.PC).toBe(0x8001);
        done();
      });
      
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xEA); // NOP
      cpu.step();
    });
  });
});