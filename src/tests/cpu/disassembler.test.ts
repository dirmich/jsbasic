import { describe, test, expect } from 'bun:test';
import { OpcodeDecoder } from '@/cpu/opcodes';
import { AddressingMode } from '@/types/cpu';

describe('CPU Disassembler (OpcodeDecoder)', () => {
  describe('기본 명령어 디스어셈블리', () => {
    test('LDA Immediate 디스어셈블리', () => {
      const memory = new Uint8Array([0xA9, 0x42]); // LDA #$42
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('LDA');
      expect(result.fullInstruction).toBe('LDA #$42');
      expect(result.addressingMode).toBe(AddressingMode.IMMEDIATE);
      expect(result.isValid).toBe(true);
      expect(result.bytes).toBe(1);
      expect(result.operands).toEqual([0x42]);
    });

    test('STA Absolute 디스어셈블리', () => {
      const memory = new Uint8Array([0x8D, 0x00, 0x20]); // STA $2000
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('STA');
      expect(result.fullInstruction).toBe('STA $2000');
      expect(result.addressingMode).toBe(AddressingMode.ABSOLUTE);
      expect(result.isValid).toBe(true);
      expect(result.bytes).toBe(2);
      expect(result.operands).toEqual([0x00, 0x20]);
    });

    test('JMP Absolute 디스어셈블리', () => {
      const memory = new Uint8Array([0x4C, 0xFC, 0xFF]); // JMP $FFFC
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('JMP');
      expect(result.fullInstruction).toBe('JMP $FFFC');
      expect(result.addressingMode).toBe(AddressingMode.ABSOLUTE);
      expect(result.isValid).toBe(true);
    });

    test('BRK Implied 디스어셈블리', () => {
      const memory = new Uint8Array([0x00]); // BRK
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('BRK');
      expect(result.fullInstruction).toBe('BRK');
      expect(result.addressingMode).toBe(AddressingMode.IMPLIED);
      expect(result.isValid).toBe(true);
      expect(result.bytes).toBe(1);
    });
  });

  describe('다양한 주소 지정 모드', () => {
    test('Zero Page 모드', () => {
      const memory = new Uint8Array([0xA5, 0x10]); // LDA $10
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('LDA $10');
      expect(result.addressingMode).toBe(AddressingMode.ZERO_PAGE);
    });

    test('Zero Page,X 모드', () => {
      const memory = new Uint8Array([0xB5, 0x10]); // LDA $10,X
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('LDA $10,X');
      expect(result.addressingMode).toBe(AddressingMode.ZERO_PAGE_X);
    });

    test('Absolute,X 모드', () => {
      const memory = new Uint8Array([0xBD, 0x00, 0x20]); // LDA $2000,X
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('LDA $2000,X');
      expect(result.addressingMode).toBe(AddressingMode.ABSOLUTE_X);
    });

    test('Absolute,Y 모드', () => {
      const memory = new Uint8Array([0xB9, 0x00, 0x20]); // LDA $2000,Y
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('LDA $2000,Y');
      expect(result.addressingMode).toBe(AddressingMode.ABSOLUTE_Y);
    });

    test('Indirect 모드', () => {
      const memory = new Uint8Array([0x6C, 0x00, 0x20]); // JMP ($2000)
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('JMP ($2000)');
      expect(result.addressingMode).toBe(AddressingMode.INDIRECT);
    });

    test('(Indirect,X) 모드', () => {
      const memory = new Uint8Array([0xA1, 0x10]); // LDA ($10,X)
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('LDA ($10,X)');
      expect(result.addressingMode).toBe(AddressingMode.INDEXED_INDIRECT);
    });

    test('(Indirect),Y 모드', () => {
      const memory = new Uint8Array([0xB1, 0x10]); // LDA ($10),Y
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('LDA ($10),Y');
      expect(result.addressingMode).toBe(AddressingMode.INDIRECT_INDEXED);
    });

    test('Relative 모드 (양수 오프셋)', () => {
      const memory = new Uint8Array([0xD0, 0x10]); // BNE +16
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('BNE');
      expect(result.addressingMode).toBe(AddressingMode.RELATIVE);
      // 상대 주소가 절대 주소로 변환되어야 함
      expect(result.fullInstruction).toContain('$');
    });

    test('Relative 모드 (음수 오프셋)', () => {
      const memory = new Uint8Array([0xD0, 0xF0]); // BNE -16
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('BNE');
      expect(result.addressingMode).toBe(AddressingMode.RELATIVE);
    });

    test('Accumulator 모드', () => {
      const memory = new Uint8Array([0x0A]); // ASL A
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.fullInstruction).toBe('ASL A');
      expect(result.addressingMode).toBe(AddressingMode.ACCUMULATOR);
    });
  });

  describe('범위 디스어셈블리', () => {
    test('disassembleRange()로 여러 명령어 디스어셈블리', () => {
      const memory = new Uint8Array([
        0xA9, 0x42,       // LDA #$42
        0x8D, 0x00, 0x20, // STA $2000
        0x60              // RTS
      ]);

      const result = OpcodeDecoder.disassembleRange(memory, 0, 3);

      expect(result.length).toBe(3);
      expect(result[0]?.fullInstruction).toBe('LDA #$42');
      expect(result[1]?.fullInstruction).toBe('STA $2000');
      expect(result[2]?.fullInstruction).toBe('RTS');
    });

    test('메모리 끝까지 디스어셈블리', () => {
      const memory = new Uint8Array([
        0xA9, 0x01, // LDA #$01
        0xA9, 0x02  // LDA #$02
      ]);

      const result = OpcodeDecoder.disassembleRange(memory, 0, 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('유효하지 않은 명령어', () => {
    test('알 수 없는 opcode 처리', () => {
      const memory = new Uint8Array([0xFF]); // 유효하지 않은 opcode
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('???');
      expect(result.isValid).toBe(false);
      expect(result.fullInstruction).toContain('???');
    });

    test('빈 메모리 처리', () => {
      const memory = new Uint8Array([]);
      const result = OpcodeDecoder.disassemble(memory, 0);

      // 빈 메모리는 0x00 (BRK)로 처리됨
      expect(result.instruction).toBe('BRK');
      expect(result.isValid).toBe(true);
    });
  });

  describe('명령어 정보', () => {
    test('getInstructionInfo()로 명령어 정보 조회', () => {
      const info = OpcodeDecoder.getInstructionInfo(0xA9);

      expect(info).toBeDefined();
      expect(info?.mnemonic).toBe('LDA');
      expect(info?.addressingMode).toBe(AddressingMode.IMMEDIATE);
      expect(info?.cycles).toBe(2);
    });

    test('isValidInstruction()로 유효성 확인', () => {
      expect(OpcodeDecoder.isValidInstruction(0xA9)).toBe(true);
      expect(OpcodeDecoder.isValidInstruction(0xFF)).toBe(false);
    });

    test('getInstructionLength()로 명령어 길이 조회', () => {
      expect(OpcodeDecoder.getInstructionLength(0xA9)).toBe(2); // LDA #$XX (opcode + 1 byte)
      expect(OpcodeDecoder.getInstructionLength(0x8D)).toBe(3); // STA $XXXX (opcode + 2 bytes)
      expect(OpcodeDecoder.getInstructionLength(0x60)).toBe(1); // RTS (opcode only)
    });
  });

  describe('명령어 분류', () => {
    test('getInstructionCategory()로 명령어 유형 조회', () => {
      expect(OpcodeDecoder.getInstructionCategory('LDA')).toBe('Load/Store');
      expect(OpcodeDecoder.getInstructionCategory('ADC')).toBe('Arithmetic');
      expect(OpcodeDecoder.getInstructionCategory('AND')).toBe('Logic');
      expect(OpcodeDecoder.getInstructionCategory('CMP')).toBe('Compare');
      expect(OpcodeDecoder.getInstructionCategory('JMP')).toBe('Jump/Call');
      expect(OpcodeDecoder.getInstructionCategory('BEQ')).toBe('Branch');
      expect(OpcodeDecoder.getInstructionCategory('PHA')).toBe('Stack');
      expect(OpcodeDecoder.getInstructionCategory('TAX')).toBe('Transfer');
      expect(OpcodeDecoder.getInstructionCategory('CLC')).toBe('Status');
    });

    test('알 수 없는 명령어는 Unknown 반환', () => {
      expect(OpcodeDecoder.getInstructionCategory('XXX')).toBe('Unknown');
    });
  });

  describe('실제 프로그램 디스어셈블리', () => {
    test('간단한 루프 프로그램', () => {
      const memory = new Uint8Array([
        0xA2, 0x00,       // LDX #$00
        0xE8,             // INX
        0xE0, 0x0A,       // CPX #$0A
        0xD0, 0xFB,       // BNE -5 (back to INX)
        0x60              // RTS
      ]);

      const result = OpcodeDecoder.disassembleRange(memory, 0, 5);

      expect(result[0]?.fullInstruction).toBe('LDX #$00');
      expect(result[1]?.fullInstruction).toBe('INX');
      expect(result[2]?.fullInstruction).toBe('CPX #$0A');
      expect(result[3]?.fullInstruction).toContain('BNE');
      expect(result[4]?.fullInstruction).toBe('RTS');
    });

    test('서브루틴 호출', () => {
      const memory = new Uint8Array([
        0x20, 0x10, 0x00, // JSR $0010
        0x60,             // RTS
      ]);

      const result = OpcodeDecoder.disassembleRange(memory, 0, 2);

      expect(result[0]?.fullInstruction).toBe('JSR $0010');
      expect(result[0]?.instruction).toBe('JSR');
      expect(result[1]?.fullInstruction).toBe('RTS');
    });
  });

  describe('엣지 케이스', () => {
    test('메모리 경계에서 디스어셈블리', () => {
      const memory = new Uint8Array([0xA9, 0x42]);
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.isValid).toBe(true);
      expect(result.fullInstruction).toBe('LDA #$42');
    });

    test('불완전한 명령어 처리', () => {
      const memory = new Uint8Array([0x8D]); // STA Absolute인데 주소 없음
      const result = OpcodeDecoder.disassemble(memory, 0);

      expect(result.instruction).toBe('STA');
      expect(result.isValid).toBe(true);
      // 피연산자가 부족하지만 처리됨
    });
  });
});
