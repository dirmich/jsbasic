import { describe, test, expect, beforeEach } from 'bun:test';
import { CPU6502 } from '@/cpu/cpu';
import { MemoryManager } from '@/memory/manager';

/**
 * 통합 테스트: CPU와 메모리 관리자의 상호작용 검증
 * 
 * 이 테스트는 6502 CPU와 메모리 관리자가 함께 올바르게 동작하는지 확인합니다:
 * - CPU-메모리 통합 동작
 * - 실제 6502 프로그램 실행 시뮬레이션
 * - 성능 및 안정성 검증
 */

describe('CPU와 메모리 관리자 통합', () => {
  let cpu: CPU6502;
  let memory: MemoryManager;

  beforeEach(() => {
    memory = new MemoryManager(65536, { 
      protectInterruptVectors: false 
    });
    cpu = new CPU6502(memory, { 
      enableDebug: false,
      strictMode: true 
    });
  });

  describe('기본 시스템 통합', () => {
    test('CPU와 메모리 관리자 초기화', () => {
      expect(cpu).toBeDefined();
      expect(memory).toBeDefined();
      
      // CPU 초기 상태
      const cpuState = cpu.getState();
      expect(cpuState.registers.SP).toBe(0xFF);
      expect(cpuState.cycleCount).toBe(0);
      
      // 메모리 초기 상태
      const memoryStats = memory.getMemoryStats();
      expect(memoryStats.totalSize).toBe(65536);
      expect(memoryStats.currentBank).toBe('main');
    });

    test('메모리 접근 일관성', () => {
      const testAddress = 0x1234;
      const testValue = 0x42;
      
      // CPU를 통한 쓰기
      cpu.writeByte(testAddress, testValue);
      
      // 메모리 관리자를 통한 읽기
      expect(memory.readByte(testAddress)).toBe(testValue);
      
      // 메모리 관리자를 통한 쓰기
      const newValue = 0x99;
      memory.writeByte(testAddress, newValue);
      
      // CPU를 통한 읽기
      expect(cpu.readByte(testAddress)).toBe(newValue);
    });

    test('리셋 벡터를 통한 CPU 시작', () => {
      // 리셋 벡터 설정
      const startAddress = 0x8000;
      memory.writeWord(0xFFFC, startAddress);
      
      // CPU 리셋
      cpu.reset();
      
      // PC가 리셋 벡터 값으로 설정되었는지 확인
      expect(cpu.registers.PC).toBe(startAddress);
    });
  });

  describe('간단한 프로그램 실행', () => {
    test('NOP 연속 실행', () => {
      // 프로그램 설정: 여러 개의 NOP 명령어
      memory.writeWord(0xFFFC, 0x8000); // 리셋 벡터
      memory.writeByte(0x8000, 0xEA);  // NOP
      memory.writeByte(0x8001, 0xEA);  // NOP
      memory.writeByte(0x8002, 0xEA);  // NOP
      
      cpu.reset();
      
      // 첫 번째 NOP 실행
      let cycles = cpu.step();
      expect(cycles).toBe(2);
      expect(cpu.registers.PC).toBe(0x8001);
      
      // 두 번째 NOP 실행
      cycles = cpu.step();
      expect(cycles).toBe(2);
      expect(cpu.registers.PC).toBe(0x8002);
      
      // 세 번째 NOP 실행
      cycles = cpu.step();
      expect(cycles).toBe(2);
      expect(cpu.registers.PC).toBe(0x8003);
      
      // 총 사이클 확인
      expect(cpu.getState().cycleCount).toBe(6);
      expect(cpu.getState().instructionCount).toBe(3);
    });

    test('LDA immediate 프로그램', () => {
      // 프로그램: LDA #$42, LDA #$00, LDA #$80
      memory.writeWord(0xFFFC, 0x8000);
      memory.writeByte(0x8000, 0xA9); // LDA #$42
      memory.writeByte(0x8001, 0x42);
      memory.writeByte(0x8002, 0xA9); // LDA #$00  
      memory.writeByte(0x8003, 0x00);
      memory.writeByte(0x8004, 0xA9); // LDA #$80
      memory.writeByte(0x8005, 0x80);
      
      cpu.reset();
      
      // LDA #$42
      let cycles = cpu.step();
      expect(cycles).toBe(2);
      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.getFlag('ZERO')).toBe(false);
      expect(cpu.getFlag('NEGATIVE')).toBe(false);
      
      // LDA #$00
      cycles = cpu.step();
      expect(cycles).toBe(2);
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.getFlag('ZERO')).toBe(true);
      expect(cpu.getFlag('NEGATIVE')).toBe(false);
      
      // LDA #$80
      cycles = cpu.step();
      expect(cycles).toBe(2);
      expect(cpu.registers.A).toBe(0x80);
      expect(cpu.getFlag('ZERO')).toBe(false);
      expect(cpu.getFlag('NEGATIVE')).toBe(true);
    });

    test('스택 연산 프로그램', () => {
      // 프로그램: LDA #$42, PHA, LDA #$00, PLA
      memory.writeWord(0xFFFC, 0x8000);
      memory.writeByte(0x8000, 0xA9); // LDA #$42
      memory.writeByte(0x8001, 0x42);
      memory.writeByte(0x8002, 0x48); // PHA
      memory.writeByte(0x8003, 0xA9); // LDA #$00
      memory.writeByte(0x8004, 0x00);
      memory.writeByte(0x8005, 0x68); // PLA
      
      cpu.reset();
      const initialSP = cpu.registers.SP;
      
      // LDA #$42
      cpu.step();
      expect(cpu.registers.A).toBe(0x42);
      
      // PHA
      cpu.step();
      expect(cpu.registers.SP).toBe(initialSP - 1);
      expect(memory.readByte(0x0100 + initialSP)).toBe(0x42);
      
      // LDA #$00
      cpu.step();
      expect(cpu.registers.A).toBe(0x00);
      
      // PLA
      cpu.step();
      expect(cpu.registers.A).toBe(0x42);
      expect(cpu.registers.SP).toBe(initialSP);
    });
  });

  describe('메모리 뱅킹과 CPU 연동', () => {
    test('다른 뱅크의 같은 주소에 다른 코드', () => {
      // 메인 뱅크에 프로그램 1
      memory.writeByte(0x8000, 0xA9); // LDA #$01
      memory.writeByte(0x8001, 0x01);
      
      // 새 뱅크 생성 및 전환
      memory.createBank('code2', 65536);
      memory.switchBank('code2');
      
      // 같은 주소에 다른 프로그램
      memory.writeByte(0x8000, 0xA9); // LDA #$02
      memory.writeByte(0x8001, 0x02);
      
      // 메인 뱅크로 복귀하여 실행
      memory.switchBank('main');
      memory.writeWord(0xFFFC, 0x8000);
      cpu.reset();
      
      cpu.step();
      expect(cpu.registers.A).toBe(0x01);
      
      // 뱅크 2로 전환하여 실행
      memory.switchBank('code2');
      cpu.setPC(0x8000);
      
      cpu.step();
      expect(cpu.registers.A).toBe(0x02);
    });
  });

  describe('메모리 보호와 CPU 접근', () => {
    test('읽기 전용 메모리 보호', () => {
      // ROM 영역 설정
      memory.setProtection(0xF000, 0xFFFF, {
        readable: true,
        writable: false,
        description: 'ROM area'
      });
      
      // 먼저 데이터를 설정 (보호 전)
      memory.setEnforceProtection(false);
      memory.writeByte(0xF000, 0x42);
      memory.setEnforceProtection(true);
      
      // CPU를 통한 읽기는 가능
      expect(cpu.readByte(0xF000)).toBe(0x42);
      
      // CPU를 통한 쓰기는 차단
      expect(() => cpu.writeByte(0xF000, 0x99)).toThrow();
    });

    test('메모리 맵핑된 I/O 시뮬레이션', () => {
      let ioRegister = 0x00;
      
      // I/O 포트 맵핑
      memory.addMemoryMap(0xD000, 0xD000, {
        name: 'Virtual I/O',
        description: 'Test I/O register',
        type: 'io',
        readHandler: () => ioRegister,
        writeHandler: (addr, value) => {
          ioRegister = value;
        }
      });
      
      // CPU를 통한 I/O 접근
      cpu.writeByte(0xD000, 0x55);
      expect(ioRegister).toBe(0x55);
      expect(cpu.readByte(0xD000)).toBe(0x55);
    });
  });

  describe('인터럽트와 메모리 상호작용', () => {
    test('NMI 인터럽트 처리', () => {
      // 인터럽트 벡터 설정
      memory.writeWord(0xFFFA, 0x9000); // NMI 벡터
      memory.writeWord(0xFFFC, 0x8000); // 리셋 벡터
      
      // 메인 프로그램
      memory.writeByte(0x8000, 0xEA); // NOP
      
      // 인터럽트 핸들러
      memory.writeByte(0x9000, 0x40); // RTI
      
      cpu.reset();
      
      const initialPC = cpu.registers.PC;
      const initialSP = cpu.registers.SP;
      
      // NMI 발생
      cpu.interrupt('NMI');
      const cycles = cpu.step(); // 인터럽트 처리
      
      // NMI 처리 확인
      expect(cycles).toBe(7);
      expect(cpu.registers.PC).toBe(0x9000);
      expect(cpu.getFlag('INTERRUPT')).toBe(true);
      
      // 스택에 저장된 PC 확인
      const savedPCL = memory.readByte(0x0100 + initialSP - 1);
      const savedPCH = memory.readByte(0x0100 + initialSP);
      expect((savedPCH << 8) | savedPCL).toBe(initialPC);
    });
  });

  describe('성능 및 안정성', () => {
    test('대량 메모리 접근 성능', () => {
      const startTime = performance.now();
      
      // 1KB 데이터 쓰기
      for (let i = 0; i < 1024; i++) {
        cpu.writeByte(0x2000 + i, i & 0xFF);
      }
      
      // 1KB 데이터 읽기
      for (let i = 0; i < 1024; i++) {
        const value = cpu.readByte(0x2000 + i);
        expect(value).toBe(i & 0xFF);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 성능 임계값 (1ms 미만)
      expect(duration).toBeLessThan(1);
    });

    test('장시간 CPU 실행 안정성', () => {
      // 루프 프로그램: JMP $8000 (무한 루프)
      memory.writeWord(0xFFFC, 0x8000);
      memory.writeByte(0x8000, 0x4C); // JMP absolute
      memory.writeByte(0x8001, 0x00); // $8000
      memory.writeByte(0x8002, 0x80);
      
      cpu.reset();
      
      // 1000회 실행
      let totalCycles = 0;
      for (let i = 0; i < 1000; i++) {
        const cycles = cpu.step();
        totalCycles += cycles;
        expect(cpu.registers.PC).toBe(0x8000); // 항상 루프 시작점
      }
      
      // 사이클 계산 확인
      expect(totalCycles).toBe(1000 * 3); // JMP는 3사이클
      expect(cpu.getState().cycleCount).toBe(totalCycles);
      expect(cpu.getState().instructionCount).toBe(1000);
    });

    test('메모리 접근 추적 성능', () => {
      // 접근 추적 활성화
      memory.setAccessTracking(true);
      memory.setMaxLogSize(100);
      
      const startTime = performance.now();
      
      // 200회 메모리 접근
      for (let i = 0; i < 200; i++) {
        cpu.writeByte(0x3000 + (i % 16), i & 0xFF);
        cpu.readByte(0x3000 + (i % 16));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 로그 크기 제한 확인
      const log = memory.getAccessLog();
      expect(log.length).toBeLessThanOrEqual(100);
      
      // 추적 기능이 성능에 큰 영향을 주지 않아야 함
      expect(duration).toBeLessThan(10);
    });

    test('메모리 뱅크 전환 성능', () => {
      const banks = ['bank1', 'bank2', 'bank3', 'bank4', 'bank5'];
      
      // 여러 뱅크 생성
      banks.forEach(name => {
        memory.createBank(name, 65536);
      });
      
      const startTime = performance.now();
      
      // 100회 뱅크 전환
      for (let i = 0; i < 100; i++) {
        const bankName = banks[i % banks.length];
        memory.switchBank(bankName);
        
        // 각 뱅크에 데이터 쓰기/읽기
        cpu.writeByte(0x1000, i & 0xFF);
        expect(cpu.readByte(0x1000)).toBe(i & 0xFF);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 뱅크 전환이 빠르게 수행되어야 함
      expect(duration).toBeLessThan(5);
    });
  });

  describe('복합 시나리오', () => {
    test('복잡한 프로그램 시뮬레이션: 데이터 복사', () => {
      // 메모리 블록 복사 프로그램 (의사 코드)
      // 소스: $2000-$20FF, 목적지: $3000-$30FF
      
      // 테스트 데이터 준비
      for (let i = 0; i < 256; i++) {
        memory.writeByte(0x2000 + i, i);
      }
      
      // 간단한 복사 명령어 시뮬레이션
      for (let i = 0; i < 256; i++) {
        const value = cpu.readByte(0x2000 + i);
        cpu.writeByte(0x3000 + i, value);
      }
      
      // 복사 결과 검증
      for (let i = 0; i < 256; i++) {
        expect(cpu.readByte(0x3000 + i)).toBe(i);
      }
    });

    test('인터럽트가 있는 복잡한 시나리오', () => {
      // 메인 프로그램과 인터럽트 핸들러 설정
      memory.writeWord(0xFFFC, 0x8000); // 리셋 벡터
      memory.writeWord(0xFFFE, 0x9000); // IRQ 벡터
      
      // 메인 프로그램: 카운터 증가
      let pc = 0x8000;
      memory.writeByte(pc++, 0xA9); // LDA #$00
      memory.writeByte(pc++, 0x00);
      memory.writeByte(pc++, 0x8D); // STA $4000 (카운터 변수)
      memory.writeByte(pc++, 0x00);
      memory.writeByte(pc++, 0x40);
      memory.writeByte(pc++, 0xEE); // INC $4000
      memory.writeByte(pc++, 0x00);
      memory.writeByte(pc++, 0x40);
      memory.writeByte(pc++, 0x4C); // JMP $8005 (루프)
      memory.writeByte(pc++, 0x05);
      memory.writeByte(pc++, 0x80);
      
      // 인터럽트 핸들러: 다른 카운터 증가
      pc = 0x9000;
      memory.writeByte(pc++, 0xEE); // INC $4001
      memory.writeByte(pc++, 0x01);
      memory.writeByte(pc++, 0x40);
      memory.writeByte(pc++, 0x40); // RTI
      
      cpu.reset();
      cpu.setFlag('INTERRUPT', false); // 인터럽트 허용
      
      // 몇 번의 명령어 실행
      for (let i = 0; i < 5; i++) {
        cpu.step();
      }
      
      // 인터럽트 발생 및 처리
      cpu.interrupt('IRQ');
      cpu.step(); // 인터럽트 처리
      
      // 인터럽트 핸들러 실행
      for (let i = 0; i < 2; i++) {
        cpu.step();
      }
      
      // 시스템이 안정적으로 동작했는지 확인
      expect(cpu.getState().isHalted).toBe(false);
    });
  });

  describe('에러 회복 및 안정성', () => {
    test('메모리 오류 후 CPU 안정성', () => {
      // 보호된 메모리 영역 설정
      memory.setProtection(0x8000, 0x8FFF, {
        readable: true,
        writable: false,
        description: 'Protected area'
      });
      
      // 보호된 영역에 쓰기 시도 (에러 발생)
      expect(() => cpu.writeByte(0x8000, 0x42)).toThrow();
      
      // 에러 후에도 CPU가 정상 동작하는지 확인
      cpu.writeByte(0x1000, 0x99);
      expect(cpu.readByte(0x1000)).toBe(0x99);
      
      // CPU 상태가 손상되지 않았는지 확인
      const state = cpu.getState();
      expect(state.isHalted).toBe(false);
    });

    test('잘못된 명령어 후 에러 처리', () => {
      memory.writeWord(0xFFFC, 0x8000);
      memory.writeByte(0x8000, 0x02); // 잘못된/구현되지 않은 명령어
      
      cpu.reset();
      
      // 잘못된 명령어 실행 시도
      expect(() => cpu.step()).toThrow();
      
      // 에러 후에도 메모리 접근은 정상적으로 동작해야 함
      expect(cpu.readByte(0x1000)).toBe(0x00);
      expect(() => cpu.writeByte(0x1000, 0x42)).not.toThrow();
    });
  });
});