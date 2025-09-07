import { describe, test, expect, beforeEach } from 'bun:test';
import { CPU6502 } from '../../cpu/cpu';
import { AddressingModes } from '../../cpu/addressing';
import { MemoryManager } from '../../memory/manager';
import { CPUError } from '../../utils/errors';

/**
 * 6502 주소 지정 모드 테스트
 * 
 * 6502 프로세서의 13가지 주소 지정 모드를 모두 테스트합니다:
 * - IMPLIED: 피연산자 없음
 * - ACCUMULATOR: 누산기 자체가 피연산자
 * - IMMEDIATE: 즉시값
 * - ZERO_PAGE: 제로 페이지 주소
 * - ZERO_PAGE_X: 제로 페이지 + X 레지스터
 * - ZERO_PAGE_Y: 제로 페이지 + Y 레지스터
 * - ABSOLUTE: 절대 주소
 * - ABSOLUTE_X: 절대 주소 + X 레지스터
 * - ABSOLUTE_Y: 절대 주소 + Y 레지스터
 * - RELATIVE: 상대 주소 (분기 명령어용)
 * - INDIRECT: 간접 주소
 * - INDEXED_INDIRECT: (제로페이지,X)
 * - INDIRECT_INDEXED: (제로페이지),Y
 */

describe('AddressingModes', () => {
  let cpu: CPU6502;
  let memory: MemoryManager;
  let addressing: AddressingModes;

  beforeEach(() => {
    memory = new MemoryManager(65536);
    cpu = new CPU6502(memory);
    addressing = new AddressingModes(cpu);
  });

  describe('IMPLIED 모드', () => {
    test('getOperandAddress는 0을 반환해야 함', () => {
      const address = addressing.getOperandAddress('IMPLIED');
      expect(address).toBe(0);
    });

    test('getOperandValue는 0을 반환해야 함', () => {
      const value = addressing.getOperandValue('IMPLIED');
      expect(value).toBe(0);
    });

    test('setOperandValue는 에러를 발생시켜야 함', () => {
      expect(() => {
        addressing.setOperandValue('IMPLIED', 0x42);
      }).toThrow(CPUError);
    });

    test('formatOperand는 빈 문자열을 반환해야 함', () => {
      const formatted = addressing.formatOperand('IMPLIED', []);
      expect(formatted).toBe('');
    });
  });

  describe('ACCUMULATOR 모드', () => {
    test('getOperandAddress는 0을 반환해야 함', () => {
      const address = addressing.getOperandAddress('ACCUMULATOR');
      expect(address).toBe(0);
    });

    test('getOperandValue는 누산기 값을 반환해야 함', () => {
      cpu.setRegisterA(0x99);
      const value = addressing.getOperandValue('ACCUMULATOR');
      expect(value).toBe(0x99);
    });

    test('setOperandValue는 누산기에 값을 설정해야 함', () => {
      addressing.setOperandValue('ACCUMULATOR', 0x55);
      expect(cpu.registers.A).toBe(0x55);
    });

    test('formatOperand는 "A"를 반환해야 함', () => {
      const formatted = addressing.formatOperand('ACCUMULATOR', []);
      expect(formatted).toBe('A');
    });
  });

  describe('IMMEDIATE 모드', () => {
    test('getOperandAddress는 현재 PC를 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      const address = addressing.getOperandAddress('IMMEDIATE');
      expect(address).toBe(0x8000);
    });

    test('getOperandValue는 PC 위치의 바이트를 페치해야 함', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x42);
      
      const value = addressing.getOperandValue('IMMEDIATE');
      expect(value).toBe(0x42);
      expect(cpu.registers.PC).toBe(0x8001); // PC가 증가해야 함
    });

    test('setOperandValue는 에러를 발생시켜야 함', () => {
      expect(() => {
        addressing.setOperandValue('IMMEDIATE', 0x42);
      }).toThrow(CPUError);
    });

    test('formatOperand는 "#$XX" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('IMMEDIATE', [0x42]);
      expect(formatted).toBe('#$42');
    });
  });

  describe('ZERO_PAGE 모드', () => {
    test('getOperandAddress는 페치한 바이트를 주소로 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x50);
      
      const address = addressing.getOperandAddress('ZERO_PAGE');
      expect(address).toBe(0x50);
      expect(cpu.registers.PC).toBe(0x8001);
    });

    test('getOperandValue는 제로페이지 주소의 값을 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x80);
      memory.writeByte(0x0080, 0x99);
      
      const value = addressing.getOperandValue('ZERO_PAGE');
      expect(value).toBe(0x99);
    });

    test('setOperandValue는 제로페이지 주소에 값을 저장해야 함', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x70);
      
      addressing.setOperandValue('ZERO_PAGE', 0x77);
      expect(memory.readByte(0x0070)).toBe(0x77);
    });

    test('formatOperand는 "$XX" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('ZERO_PAGE', [0x50]);
      expect(formatted).toBe('$50');
    });
  });

  describe('ZERO_PAGE_X 모드', () => {
    test('getOperandAddress는 제로페이지 + X를 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterX(0x10);
      memory.writeByte(0x8000, 0x50);
      
      const address = addressing.getOperandAddress('ZERO_PAGE_X');
      expect(address).toBe(0x60); // 0x50 + 0x10
    });

    test('제로페이지 경계에서 래핑되어야 함', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterX(0x10);
      memory.writeByte(0x8000, 0xF8);
      
      const address = addressing.getOperandAddress('ZERO_PAGE_X');
      expect(address).toBe(0x08); // (0xF8 + 0x10) & 0xFF = 0x08
    });

    test('formatOperand는 "$XX,X" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('ZERO_PAGE_X', [0x50]);
      expect(formatted).toBe('$50,X');
    });
  });

  describe('ZERO_PAGE_Y 모드', () => {
    test('getOperandAddress는 제로페이지 + Y를 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterY(0x20);
      memory.writeByte(0x8000, 0x30);
      
      const address = addressing.getOperandAddress('ZERO_PAGE_Y');
      expect(address).toBe(0x50); // 0x30 + 0x20
    });

    test('제로페이지 경계에서 래핑되어야 함', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterY(0x80);
      memory.writeByte(0x8000, 0x90);
      
      const address = addressing.getOperandAddress('ZERO_PAGE_Y');
      expect(address).toBe(0x10); // (0x90 + 0x80) & 0xFF = 0x10
    });

    test('formatOperand는 "$XX,Y" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('ZERO_PAGE_Y', [0x30]);
      expect(formatted).toBe('$30,Y');
    });
  });

  describe('ABSOLUTE 모드', () => {
    test('getOperandAddress는 16비트 주소를 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x34); // Low byte
      memory.writeByte(0x8001, 0x12); // High byte
      
      const address = addressing.getOperandAddress('ABSOLUTE');
      expect(address).toBe(0x1234);
      expect(cpu.registers.PC).toBe(0x8002);
    });

    test('getOperandValue는 절대 주소의 값을 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x00);
      memory.writeByte(0x8001, 0x20);
      memory.writeByte(0x2000, 0xAB);
      
      const value = addressing.getOperandValue('ABSOLUTE');
      expect(value).toBe(0xAB);
    });

    test('formatOperand는 "$XXXX" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('ABSOLUTE', [0x34, 0x12]);
      expect(formatted).toBe('$1234');
    });
  });

  describe('ABSOLUTE_X 모드', () => {
    test('getOperandAddress는 절대주소 + X를 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterX(0x10);
      memory.writeByte(0x8000, 0x00);
      memory.writeByte(0x8001, 0x20);
      
      const address = addressing.getOperandAddress('ABSOLUTE_X');
      expect(address).toBe(0x2010); // 0x2000 + 0x10
    });

    test('16비트 경계에서 래핑되어야 함', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterX(0x10);
      memory.writeByte(0x8000, 0xF0);
      memory.writeByte(0x8001, 0xFF);
      
      const address = addressing.getOperandAddress('ABSOLUTE_X');
      expect(address).toBe(0x0000); // (0xFFF0 + 0x10) & 0xFFFF = 0x0000
    });

    test('formatOperand는 "$XXXX,X" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('ABSOLUTE_X', [0x00, 0x20]);
      expect(formatted).toBe('$2000,X');
    });
  });

  describe('ABSOLUTE_Y 모드', () => {
    test('getOperandAddress는 절대주소 + Y를 반환해야 함', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterY(0x50);
      memory.writeByte(0x8000, 0x00);
      memory.writeByte(0x8001, 0x30);
      
      const address = addressing.getOperandAddress('ABSOLUTE_Y');
      expect(address).toBe(0x3050); // 0x3000 + 0x50
    });

    test('formatOperand는 "$XXXX,Y" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('ABSOLUTE_Y', [0x00, 0x30]);
      expect(formatted).toBe('$3000,Y');
    });
  });

  describe('RELATIVE 모드', () => {
    test('양수 오프셋 처리', () => {
      cpu.setRegisterPC(0x8002); // 명령어 다음 주소
      memory.writeByte(0x8000, 0x10); // +16
      
      // PC를 명령어 시작으로 설정하고 페치
      cpu.setRegisterPC(0x8000);
      const address = addressing.getOperandAddress('RELATIVE');
      expect(address).toBe(0x8011); // 0x8001 + 0x10
    });

    test('음수 오프셋 처리', () => {
      cpu.setRegisterPC(0x8020);
      memory.writeByte(0x8020, 0xF0); // -16 (0xF0 = 240, signed = -16)
      
      const address = addressing.getOperandAddress('RELATIVE');
      expect(address).toBe(0x8011); // 0x8021 + (-16)
    });

    test('16비트 경계 처리', () => {
      cpu.setRegisterPC(0x0010);
      memory.writeByte(0x0010, 0xF0); // -16
      
      const address = addressing.getOperandAddress('RELATIVE');
      expect(address).toBe(0x0001); // 0x0011 + (-16) = 0x0001
    });

    test('formatOperand는 절대 주소를 표시해야 함', () => {
      cpu.setRegisterPC(0x8010); // 현재 PC
      const formatted = addressing.formatOperand('RELATIVE', [0x10]);
      expect(formatted).toBe('$8020'); // PC + operand = 0x8010 + 0x10
    });
  });

  describe('INDIRECT 모드', () => {
    test('간접 주소 읽기', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x20); // Indirect address low
      memory.writeByte(0x8001, 0x30); // Indirect address high
      memory.writeByte(0x3020, 0x00); // Target address low
      memory.writeByte(0x3021, 0x40); // Target address high
      
      const address = addressing.getOperandAddress('INDIRECT');
      expect(address).toBe(0x4000);
    });

    test('6502 간접 주소 버그 - 페이지 경계 래핑', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xFF); // Indirect address low
      memory.writeByte(0x8001, 0x30); // Indirect address high
      memory.writeByte(0x30FF, 0x00); // Target address low
      memory.writeByte(0x3000, 0x40); // Target address high (wrapped to page start)
      
      const address = addressing.getOperandAddress('INDIRECT');
      expect(address).toBe(0x4000); // 0x30FF에서 0x3000으로 래핑
    });

    test('formatOperand는 "($XXXX)" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('INDIRECT', [0x20, 0x30]);
      expect(formatted).toBe('($3020)');
    });
  });

  describe('INDEXED_INDIRECT 모드 (zp,X)', () => {
    test('인덱스된 간접 주소 계산', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterX(0x04);
      memory.writeByte(0x8000, 0x20); // Base zero page address
      
      // 0x20 + 0x04 = 0x24에서 주소 읽기
      memory.writeByte(0x0024, 0x00); // Target address low
      memory.writeByte(0x0025, 0x40); // Target address high
      
      const address = addressing.getOperandAddress('INDEXED_INDIRECT');
      expect(address).toBe(0x4000);
    });

    test('제로페이지 경계에서 래핑', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterX(0x10);
      memory.writeByte(0x8000, 0xF8);
      
      // (0xF8 + 0x10) & 0xFF = 0x08
      memory.writeByte(0x0008, 0x34); // Target address low
      memory.writeByte(0x0009, 0x12); // Target address high
      
      const address = addressing.getOperandAddress('INDEXED_INDIRECT');
      expect(address).toBe(0x1234);
    });

    test('주소 읽기 시 제로페이지 래핑', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterX(0x00);
      memory.writeByte(0x8000, 0xFF);
      
      memory.writeByte(0x00FF, 0x00); // Target address low
      memory.writeByte(0x0000, 0x50); // Target address high (wrapped)
      
      const address = addressing.getOperandAddress('INDEXED_INDIRECT');
      expect(address).toBe(0x5000);
    });

    test('formatOperand는 "($XX,X)" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('INDEXED_INDIRECT', [0x20]);
      expect(formatted).toBe('($20,X)');
    });
  });

  describe('INDIRECT_INDEXED 모드 (zp),Y', () => {
    test('간접 인덱스된 주소 계산', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterY(0x10);
      memory.writeByte(0x8000, 0x20);
      
      // 0x20에서 베이스 주소 읽기
      memory.writeByte(0x0020, 0x00); // Base address low
      memory.writeByte(0x0021, 0x30); // Base address high
      
      const address = addressing.getOperandAddress('INDIRECT_INDEXED');
      expect(address).toBe(0x3010); // 0x3000 + 0x10
    });

    test('베이스 주소 읽기 시 제로페이지 래핑', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterY(0x05);
      memory.writeByte(0x8000, 0xFF);
      
      memory.writeByte(0x00FF, 0x00); // Base address low
      memory.writeByte(0x0000, 0x40); // Base address high (wrapped)
      
      const address = addressing.getOperandAddress('INDIRECT_INDEXED');
      expect(address).toBe(0x4005); // 0x4000 + 0x05
    });

    test('16비트 주소 래핑', () => {
      cpu.setRegisterPC(0x8000);
      cpu.setRegisterY(0x10);
      memory.writeByte(0x8000, 0x20);
      
      memory.writeByte(0x0020, 0xF0); // Base address low
      memory.writeByte(0x0021, 0xFF); // Base address high
      
      const address = addressing.getOperandAddress('INDIRECT_INDEXED');
      expect(address).toBe(0x0000); // (0xFFF0 + 0x10) & 0xFFFF = 0x0000
    });

    test('formatOperand는 "($XX),Y" 형식으로 반환해야 함', () => {
      const formatted = addressing.formatOperand('INDIRECT_INDEXED', [0x20]);
      expect(formatted).toBe('($20),Y');
    });
  });

  describe('페이지 경계 확인', () => {
    test('crossesPageBoundary 함수', () => {
      // 같은 페이지
      expect(addressing.crossesPageBoundary(0x1020, 0x1030)).toBe(false);
      
      // 페이지 경계 넘음
      expect(addressing.crossesPageBoundary(0x10F0, 0x1110)).toBe(true);
      
      // 경계 정확히
      expect(addressing.crossesPageBoundary(0x10FF, 0x1100)).toBe(true);
    });

    test('ABSOLUTE_X 추가 사이클', () => {
      cpu.setRegisterX(0x10);
      const extraCycles = addressing.getExtraCycles('ABSOLUTE_X', 0x20F0);
      expect(extraCycles).toBe(1); // 0x20F0 + 0x10 = 0x2100 (페이지 경계 넘음)
    });

    test('ABSOLUTE_Y 추가 사이클', () => {
      cpu.setRegisterY(0x05);
      const extraCycles = addressing.getExtraCycles('ABSOLUTE_Y', 0x30F0);
      expect(extraCycles).toBe(0); // 0x30F0 + 0x05 = 0x30F5 (페이지 경계 안 넘음)
    });
  });

  describe('주소 지정 모드 정보', () => {
    test('getModeInfo 함수', () => {
      const immediateInfo = addressing.getModeInfo('IMMEDIATE');
      expect(immediateInfo.name).toBe('Immediate');
      expect(immediateInfo.operandBytes).toBe(1);
      expect(immediateInfo.example).toBe('LDA #$42');
      
      const absoluteInfo = addressing.getModeInfo('ABSOLUTE');
      expect(absoluteInfo.name).toBe('Absolute');
      expect(absoluteInfo.operandBytes).toBe(2);
      expect(absoluteInfo.example).toBe('LDA $1234');
      
      const impliedInfo = addressing.getModeInfo('IMPLIED');
      expect(impliedInfo.name).toBe('Implied');
      expect(impliedInfo.operandBytes).toBe(0);
      expect(impliedInfo.example).toBe('NOP');
    });

    test('모든 주소 지정 모드 정보 확인', () => {
      const modes = [
        'IMPLIED', 'ACCUMULATOR', 'IMMEDIATE', 'ZERO_PAGE', 'ZERO_PAGE_X', 
        'ZERO_PAGE_Y', 'ABSOLUTE', 'ABSOLUTE_X', 'ABSOLUTE_Y', 'RELATIVE', 
        'INDIRECT', 'INDEXED_INDIRECT', 'INDIRECT_INDEXED'
      ] as const;
      
      for (const mode of modes) {
        const info = addressing.getModeInfo(mode);
        expect(info).toBeDefined();
        expect(info.name).toBeDefined();
        expect(info.description).toBeDefined();
        expect(typeof info.operandBytes).toBe('number');
        expect(info.example).toBeDefined();
      }
    });
  });

  describe('에러 처리', () => {
    test('알려지지 않은 주소 지정 모드', () => {
      expect(() => {
        addressing.getOperandAddress('UNKNOWN' as any);
      }).toThrow(CPUError);
    });

    test('IMMEDIATE 모드에 쓰기 시도', () => {
      expect(() => {
        addressing.setOperandValue('IMMEDIATE', 0x42);
      }).toThrow(CPUError);
    });

    test('IMPLIED 모드에 쓰기 시도', () => {
      expect(() => {
        addressing.setOperandValue('IMPLIED', 0x42);
      }).toThrow(CPUError);
    });
  });

  describe('실제 사용 시나리오', () => {
    test('LDA immediate 시뮬레이션', () => {
      // LDA #$42 명령어 시뮬레이션
      cpu.setRegisterPC(0x8001); // 피연산자 위치
      memory.writeByte(0x8001, 0x42);
      
      const value = addressing.getOperandValue('IMMEDIATE');
      expect(value).toBe(0x42);
      expect(cpu.registers.PC).toBe(0x8002); // PC 증가
    });

    test('STA absolute 시뮬레이션', () => {
      // STA $1234 명령어 시뮬레이션
      cpu.setRegisterPC(0x8001);
      cpu.setRegisterA(0x99);
      memory.writeByte(0x8001, 0x34); // Low byte
      memory.writeByte(0x8002, 0x12); // High byte
      
      addressing.setOperandValue('ABSOLUTE', cpu.registers.A);
      expect(memory.readByte(0x1234)).toBe(0x99);
    });

    test('복잡한 간접 주소 지정', () => {
      // LDA ($80),Y with Y=0x10
      cpu.setRegisterY(0x10);
      cpu.setRegisterPC(0x8001);
      memory.writeByte(0x8001, 0x80); // Zero page pointer
      
      // 제로페이지 0x80에 베이스 주소 설정
      memory.writeByte(0x0080, 0x00);
      memory.writeByte(0x0081, 0x20); // 베이스 주소 = 0x2000
      
      // 타겟 주소에 값 설정
      memory.writeByte(0x2010, 0x77); // 0x2000 + 0x10 = 0x2010
      
      const value = addressing.getOperandValue('INDIRECT_INDEXED');
      expect(value).toBe(0x77);
    });
  });
});