import { describe, test, expect, beforeEach } from 'bun:test';
import { CPU6502 } from '../../cpu/cpu';
import { InstructionSet } from '../../cpu/instructions';
import { MemoryManager } from '../../memory/manager';

/**
 * 6502 명령어 세트 테스트
 * 
 * 6502 프로세서의 모든 명령어 카테고리를 테스트합니다:
 * - 로드/저장 명령어 (LDA, LDX, LDY, STA, STX, STY)
 * - 산술 명령어 (ADC, SBC)
 * - 논리 명령어 (AND, ORA, EOR)
 * - 비교 명령어 (CMP, CPX, CPY)
 * - 증감 명령어 (INC, DEC, INX, DEX, INY, DEY)
 * - 시프트/회전 명령어 (ASL, LSR, ROL, ROR)
 * - 분기 명령어 (BCC, BCS, BEQ, BMI, BNE, BPL, BVC, BVS)
 * - 점프/호출 명령어 (JMP, JSR, RTS, RTI)
 * - 스택 명령어 (PHA, PHP, PLA, PLP)
 * - 전송 명령어 (TAX, TAY, TXA, TYA, TSX, TXS)
 * - 상태 플래그 명령어 (CLC, CLD, CLI, CLV, SEC, SED, SEI)
 */

describe('InstructionSet', () => {
  let cpu: CPU6502;
  let memory: MemoryManager;
  let instructions: InstructionSet;

  beforeEach(() => {
    memory = new MemoryManager(65536, { protectInterruptVectors: false });
    cpu = new CPU6502(memory);
    instructions = new InstructionSet(cpu);
  });

  describe('로드/저장 명령어', () => {
    describe('LDA - Load Accumulator', () => {
      test('LDA immediate', () => {
        // LDA #$42
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xA9);
        memory.writeByte(0x8001, 0x42);
        
        const cycles = cpu.step();
        
        expect(cycles).toBe(2);
        expect(cpu.registers.A).toBe(0x42);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(false);
      });

      test('LDA zero flag', () => {
        // LDA #$00
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xA9);
        memory.writeByte(0x8001, 0x00);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x00);
        expect(cpu.getFlag('Z')).toBe(true);
        expect(cpu.getFlag('N')).toBe(false);
      });

      test('LDA negative flag', () => {
        // LDA #$80
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xA9);
        memory.writeByte(0x8001, 0x80);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x80);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(true);
      });

      test('LDA absolute', () => {
        // LDA $1234
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xAD);
        memory.writeByte(0x8001, 0x34);
        memory.writeByte(0x8002, 0x12);
        memory.writeByte(0x1234, 0x99);
        
        const cycles = cpu.step();
        
        expect(cycles).toBe(4);
        expect(cpu.registers.A).toBe(0x99);
      });

      test('LDA zero page', () => {
        // LDA $50
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xA5);
        memory.writeByte(0x8001, 0x50);
        memory.writeByte(0x0050, 0x33);
        
        const cycles = cpu.step();
        
        expect(cycles).toBe(3);
        expect(cpu.registers.A).toBe(0x33);
      });
    });

    describe('LDX - Load X Register', () => {
      test('LDX immediate', () => {
        // LDX #$55
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xA2);
        memory.writeByte(0x8001, 0x55);
        
        cpu.step();
        
        expect(cpu.registers.X).toBe(0x55);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(false);
      });
    });

    describe('LDY - Load Y Register', () => {
      test('LDY immediate', () => {
        // LDY #$AA
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xA0);
        memory.writeByte(0x8001, 0xAA);
        
        cpu.step();
        
        expect(cpu.registers.Y).toBe(0xAA);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(true);
      });
    });

    describe('STA - Store Accumulator', () => {
      test('STA absolute', () => {
        // STA $2000
        cpu.setRegisterA(0x77);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x8D);
        memory.writeByte(0x8001, 0x00);
        memory.writeByte(0x8002, 0x20);
        
        cpu.step();
        
        expect(memory.readByte(0x2000)).toBe(0x77);
      });

      test('STA zero page', () => {
        // STA $80
        cpu.setRegisterA(0x88);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x85);
        memory.writeByte(0x8001, 0x80);
        
        cpu.step();
        
        expect(memory.readByte(0x0080)).toBe(0x88);
      });
    });
  });

  describe('산술 명령어', () => {
    describe('ADC - Add with Carry', () => {
      test('ADC immediate 기본', () => {
        // ADC #$10
        cpu.setRegisterA(0x20);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x69);
        memory.writeByte(0x8001, 0x10);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x30);
        expect(cpu.getFlag('C')).toBe(false);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(false);
        expect(cpu.getFlag('V')).toBe(false);
      });

      test('ADC with carry', () => {
        // ADC #$10 with carry set
        cpu.setRegisterA(0x20);
        cpu.setFlag('C', true);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x69);
        memory.writeByte(0x8001, 0x10);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x31); // 0x20 + 0x10 + 1
        expect(cpu.getFlag('C')).toBe(false);
      });

      test('ADC carry flag', () => {
        // ADC #$FF (255 + 1 = 256, overflow)
        cpu.setRegisterA(0xFF);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x69);
        memory.writeByte(0x8001, 0x01);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x00);
        expect(cpu.getFlag('C')).toBe(true);
        expect(cpu.getFlag('Z')).toBe(true);
      });

      test('ADC overflow flag', () => {
        // ADC #$50 (양수 + 양수 = 음수, 오버플로우)
        cpu.setRegisterA(0x50); // +80
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x69);
        memory.writeByte(0x8001, 0x50); // +80
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0xA0); // -96 (부호 있는 관점)
        expect(cpu.getFlag('V')).toBe(true);
        expect(cpu.getFlag('N')).toBe(true);
      });
    });

    describe('SBC - Subtract with Carry', () => {
      test('SBC immediate 기본', () => {
        // SBC #$10
        cpu.setRegisterA(0x30);
        cpu.setFlag('C', true); // SBC는 carry 설정 필요
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xE9);
        memory.writeByte(0x8001, 0x10);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x20);
        expect(cpu.getFlag('C')).toBe(true);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(false);
      });

      test('SBC borrow', () => {
        // SBC #$30 (0x20 - 0x30 = -16)
        cpu.setRegisterA(0x20);
        cpu.setFlag('C', true);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xE9);
        memory.writeByte(0x8001, 0x30);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0xF0); // -16 as unsigned
        expect(cpu.getFlag('C')).toBe(false); // borrow occurred
        expect(cpu.getFlag('N')).toBe(true);
      });
    });
  });

  describe('논리 명령어', () => {
    describe('AND - Logical AND', () => {
      test('AND immediate', () => {
        // AND #$0F
        cpu.setRegisterA(0xF0);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x29);
        memory.writeByte(0x8001, 0x0F);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x00);
        expect(cpu.getFlag('Z')).toBe(true);
        expect(cpu.getFlag('N')).toBe(false);
      });

      test('AND result negative', () => {
        // AND #$FF
        cpu.setRegisterA(0x80);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x29);
        memory.writeByte(0x8001, 0xFF);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x80);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(true);
      });
    });

    describe('ORA - Logical OR', () => {
      test('ORA immediate', () => {
        // ORA #$0F
        cpu.setRegisterA(0xF0);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x09);
        memory.writeByte(0x8001, 0x0F);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0xFF);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(true);
      });
    });

    describe('EOR - Exclusive OR', () => {
      test('EOR immediate', () => {
        // EOR #$FF
        cpu.setRegisterA(0xAA);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0x49);
        memory.writeByte(0x8001, 0xFF);
        
        cpu.step();
        
        expect(cpu.registers.A).toBe(0x55);
        expect(cpu.getFlag('Z')).toBe(false);
        expect(cpu.getFlag('N')).toBe(false);
      });
    });
  });

  describe('비교 명령어', () => {
    describe('CMP - Compare Accumulator', () => {
      test('CMP equal', () => {
        // CMP #$42
        cpu.setRegisterA(0x42);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xC9);
        memory.writeByte(0x8001, 0x42);
        
        cpu.step();
        
        expect(cpu.getFlag('C')).toBe(true); // A >= operand
        expect(cpu.getFlag('Z')).toBe(true); // A == operand
        expect(cpu.getFlag('N')).toBe(false);
      });

      test('CMP greater', () => {
        // CMP #$30
        cpu.setRegisterA(0x42);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xC9);
        memory.writeByte(0x8001, 0x30);
        
        cpu.step();
        
        expect(cpu.getFlag('C')).toBe(true); // A >= operand
        expect(cpu.getFlag('Z')).toBe(false); // A != operand
        expect(cpu.getFlag('N')).toBe(false);
      });

      test('CMP less', () => {
        // CMP #$50
        cpu.setRegisterA(0x42);
        cpu.setRegisterPC(0x8000);
        memory.writeByte(0x8000, 0xC9);
        memory.writeByte(0x8001, 0x50);
        
        cpu.step();
        
        expect(cpu.getFlag('C')).toBe(false); // A < operand
        expect(cpu.getFlag('Z')).toBe(false); // A != operand
        expect(cpu.getFlag('N')).toBe(true); // result negative
      });
    });

    test('CPX - Compare X Register', () => {
      // CPX #$42
      cpu.setRegisterX(0x42);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xE0);
      memory.writeByte(0x8001, 0x42);
      
      cpu.step();
      
      expect(cpu.getFlag('C')).toBe(true);
      expect(cpu.getFlag('Z')).toBe(true);
    });

    test('CPY - Compare Y Register', () => {
      // CPY #$42
      cpu.setRegisterY(0x30);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xC0);
      memory.writeByte(0x8001, 0x42);
      
      cpu.step();
      
      expect(cpu.getFlag('C')).toBe(false);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(true);
    });
  });

  describe('증감 명령어', () => {
    test('INC - Increment Memory', () => {
      // INC $50
      memory.writeByte(0x0050, 0x42);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xE6);
      memory.writeByte(0x8001, 0x50);
      
      cpu.step();
      
      expect(memory.readByte(0x0050)).toBe(0x43);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('DEC - Decrement Memory', () => {
      // DEC $50
      memory.writeByte(0x0050, 0x42);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xC6);
      memory.writeByte(0x8001, 0x50);
      
      cpu.step();
      
      expect(memory.readByte(0x0050)).toBe(0x41);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('INX - Increment X', () => {
      // INX
      cpu.setRegisterX(0x42);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xE8);
      
      cpu.step();
      
      expect(cpu.registers.X).toBe(0x43);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('DEX - Decrement X', () => {
      // DEX
      cpu.setRegisterX(0x01);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xCA);
      
      cpu.step();
      
      expect(cpu.registers.X).toBe(0x00);
      expect(cpu.getFlag('Z')).toBe(true);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('INY - Increment Y', () => {
      // INY
      cpu.setRegisterY(0xFF);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xC8);
      
      cpu.step();
      
      expect(cpu.registers.Y).toBe(0x00);
      expect(cpu.getFlag('Z')).toBe(true);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('DEY - Decrement Y', () => {
      // DEY
      cpu.setRegisterY(0x00);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x88);
      
      cpu.step();
      
      expect(cpu.registers.Y).toBe(0xFF);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(true);
    });
  });

  describe('시프트/회전 명령어', () => {
    test('ASL Accumulator - Arithmetic Shift Left', () => {
      // ASL A
      cpu.setRegisterA(0x42); // 01000010
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x0A);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x84); // 10000100
      expect(cpu.getFlag('C')).toBe(false);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(true);
    });

    test('ASL with carry', () => {
      // ASL A
      cpu.setRegisterA(0x80); // 10000000
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x0A);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x00);
      expect(cpu.getFlag('C')).toBe(true);
      expect(cpu.getFlag('Z')).toBe(true);
    });

    test('LSR Accumulator - Logical Shift Right', () => {
      // LSR A
      cpu.setRegisterA(0x85); // 10000101
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x4A);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x42); // 01000010
      expect(cpu.getFlag('C')).toBe(true);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('ROL Accumulator - Rotate Left', () => {
      // ROL A
      cpu.setRegisterA(0x42); // 01000010
      cpu.setFlag('C', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x2A);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x85); // 10000101
      expect(cpu.getFlag('C')).toBe(false);
      expect(cpu.getFlag('N')).toBe(true);
    });

    test('ROR Accumulator - Rotate Right', () => {
      // ROR A
      cpu.setRegisterA(0x85); // 10000101
      cpu.setFlag('C', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x6A);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0xC2); // 11000010
      expect(cpu.getFlag('C')).toBe(true);
      expect(cpu.getFlag('N')).toBe(true);
    });
  });

  describe('분기 명령어', () => {
    test('BCC - Branch if Carry Clear', () => {
      // BCC +$10
      cpu.setFlag('C', false);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x90);
      memory.writeByte(0x8001, 0x10);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x8012); // 0x8002 + 0x10
    });

    test('BCC - Branch not taken', () => {
      // BCC +$10
      cpu.setFlag('C', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x90);
      memory.writeByte(0x8001, 0x10);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x8002); // no branch
    });

    test('BEQ - Branch if Equal', () => {
      // BEQ +$20
      cpu.setFlag('Z', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xF0);
      memory.writeByte(0x8001, 0x20);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x8022);
    });

    test('BMI - Branch if Minus', () => {
      // BMI +$05
      cpu.setFlag('N', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x30);
      memory.writeByte(0x8001, 0x05);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x8007);
    });

    test('Branch backward', () => {
      // BNE -$10 (0xF0 = -16 in signed 8-bit)
      cpu.setFlag('Z', false);
      cpu.setRegisterPC(0x8020);
      memory.writeByte(0x8020, 0xD0);
      memory.writeByte(0x8021, 0xF0);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x8012); // 0x8022 - 16
    });
  });

  describe('점프/호출 명령어', () => {
    test('JMP Absolute', () => {
      // JMP $1234
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x4C);
      memory.writeByte(0x8001, 0x34);
      memory.writeByte(0x8002, 0x12);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x1234);
    });

    test('JSR - Jump to Subroutine', () => {
      // JSR $2000
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x20);
      memory.writeByte(0x8001, 0x00);
      memory.writeByte(0x8002, 0x20);
      
      const initialSP = cpu.registers.SP;
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x2000);
      expect(cpu.registers.SP).toBe(initialSP - 2);
      
      // 스택에 저장된 복귀 주소 확인 (PC-1)
      const returnAddr = cpu.pullWord();
      expect(returnAddr).toBe(0x8002); // JSR instruction + 2 - 1
    });

    test('RTS - Return from Subroutine', () => {
      // 스택에 복귀 주소 설정
      cpu.pushWord(0x8042);
      
      // RTS
      cpu.setRegisterPC(0x2000);
      memory.writeByte(0x2000, 0x60);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x8043); // pulled address + 1
    });
  });

  describe('스택 명령어', () => {
    test('PHA - Push Accumulator', () => {
      // PHA
      cpu.setRegisterA(0x99);
      const initialSP = cpu.registers.SP;
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x48);
      
      cpu.step();
      
      expect(cpu.registers.SP).toBe(initialSP - 1);
      expect(memory.readByte(0x0100 + initialSP)).toBe(0x99);
    });

    test('PLA - Pull Accumulator', () => {
      // 스택에 값 준비
      cpu.pushByte(0x77);
      
      // PLA
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x68);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x77);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('PHP - Push Processor Status', () => {
      // PHP
      cpu.setFlag('C', true);
      cpu.setFlag('Z', true);
      cpu.setFlag('N', true);
      const initialSP = cpu.registers.SP;
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x08);
      
      cpu.step();
      
      expect(cpu.registers.SP).toBe(initialSP - 1);
      const pushedP = memory.readByte(0x0100 + initialSP);
      expect(pushedP & 0x01).toBe(0x01); // C flag
      expect(pushedP & 0x02).toBe(0x02); // Z flag
      expect(pushedP & 0x80).toBe(0x80); // N flag
    });

    test('PLP - Pull Processor Status', () => {
      // 스택에 상태 준비
      cpu.pushByte(0x83); // N, C 플래그 설정
      
      // PLP
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x28);
      
      cpu.step();
      
      expect(cpu.getFlag('C')).toBe(true);
      expect(cpu.getFlag('Z')).toBe(true);  // 0x83 has bit 1 set, so Z should be true
      expect(cpu.getFlag('N')).toBe(true);
    });
  });

  describe('전송 명령어', () => {
    test('TAX - Transfer A to X', () => {
      // TAX
      cpu.setRegisterA(0x99);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xAA);
      
      cpu.step();
      
      expect(cpu.registers.X).toBe(0x99);
      expect(cpu.getFlag('Z')).toBe(false);
      expect(cpu.getFlag('N')).toBe(true);
    });

    test('TAY - Transfer A to Y', () => {
      // TAY
      cpu.setRegisterA(0x00);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xA8);
      
      cpu.step();
      
      expect(cpu.registers.Y).toBe(0x00);
      expect(cpu.getFlag('Z')).toBe(true);
      expect(cpu.getFlag('N')).toBe(false);
    });

    test('TXA - Transfer X to A', () => {
      // TXA
      cpu.setRegisterX(0x55);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x8A);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x55);
    });

    test('TYA - Transfer Y to A', () => {
      // TYA
      cpu.setRegisterY(0xAA);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x98);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0xAA);
    });

    test('TSX - Transfer Stack pointer to X', () => {
      // TSX
      cpu.setRegisterSP(0x80);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xBA);
      
      cpu.step();
      
      expect(cpu.registers.X).toBe(0x80);
    });

    test('TXS - Transfer X to Stack pointer', () => {
      // TXS
      cpu.setRegisterX(0x90);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x9A);
      
      cpu.step();
      
      expect(cpu.registers.SP).toBe(0x90);
      // TXS는 플래그에 영향주지 않음
    });
  });

  describe('상태 플래그 명령어', () => {
    test('CLC - Clear Carry', () => {
      cpu.setFlag('C', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x18);
      
      cpu.step();
      
      expect(cpu.getFlag('C')).toBe(false);
    });

    test('SEC - Set Carry', () => {
      cpu.setFlag('C', false);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x38);
      
      cpu.step();
      
      expect(cpu.getFlag('C')).toBe(true);
    });

    test('CLI - Clear Interrupt', () => {
      cpu.setFlag('I', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x58);
      
      cpu.step();
      
      expect(cpu.getFlag('I')).toBe(false);
    });

    test('SEI - Set Interrupt', () => {
      cpu.setFlag('I', false);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x78);
      
      cpu.step();
      
      expect(cpu.getFlag('I')).toBe(true);
    });

    test('CLD - Clear Decimal', () => {
      cpu.setFlag('D', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xD8);
      
      cpu.step();
      
      expect(cpu.getFlag('D')).toBe(false);
    });

    test('SED - Set Decimal', () => {
      cpu.setFlag('D', false);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xF8);
      
      cpu.step();
      
      expect(cpu.getFlag('D')).toBe(true);
    });

    test('CLV - Clear Overflow', () => {
      cpu.setFlag('V', true);
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xB8);
      
      cpu.step();
      
      expect(cpu.getFlag('V')).toBe(false);
    });
  });

  describe('기타 명령어', () => {
    test('NOP - No Operation', () => {
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xEA);
      
      const cycles = cpu.step();
      
      expect(cycles).toBe(2);
      expect(cpu.registers.PC).toBe(0x8001);
      // 다른 레지스터나 플래그는 변경되지 않아야 함
    });

    test('BIT - Bit Test', () => {
      // BIT $50
      cpu.setRegisterA(0x80);
      memory.writeByte(0x0050, 0xC0); // 11000000
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x24);
      memory.writeByte(0x8001, 0x50);
      
      cpu.step();
      
      expect(cpu.getFlag('Z')).toBe(false); // A & operand = 0x80 & 0xC0 = 0x80 (not zero)
      expect(cpu.getFlag('V')).toBe(true); // bit 6 of operand
      expect(cpu.getFlag('N')).toBe(true); // bit 7 of operand
    });

    test('BRK - Software Interrupt', () => {
      // BRK 벡터 설정
      memory.writeWord(0xFFFE, 0x9000);
      
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0x00);
      
      cpu.step();
      
      expect(cpu.registers.PC).toBe(0x9000);
      expect(cpu.getFlag('I')).toBe(true);
      expect(cpu.registers.SP).toBe(0xFF - 3); // PC와 P가 스택에 저장됨
    });
  });

  describe('주소 지정 모드 테스트', () => {
    test('Zero Page,X 주소 지정', () => {
      // LDA $50,X
      cpu.setRegisterX(0x10);
      memory.writeByte(0x0060, 0x99); // $50 + $10 = $60
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xB5);
      memory.writeByte(0x8001, 0x50);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x99);
    });

    test('Absolute,X 주소 지정', () => {
      // LDA $1000,X
      cpu.setRegisterX(0x50);
      memory.writeByte(0x1050, 0x77); // $1000 + $50 = $1050
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xBD);
      memory.writeByte(0x8001, 0x00);
      memory.writeByte(0x8002, 0x10);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x77);
    });

    test('(Indirect,X) 주소 지정', () => {
      // LDA ($20,X)
      cpu.setRegisterX(0x04);
      memory.writeByte(0x24, 0x00); // Low byte of target address
      memory.writeByte(0x25, 0x30); // High byte of target address
      memory.writeByte(0x3000, 0x88); // Value at target
      
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xA1);
      memory.writeByte(0x8001, 0x20);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x88);
    });

    test('(Indirect),Y 주소 지정', () => {
      // LDA ($20),Y
      cpu.setRegisterY(0x10);
      memory.writeByte(0x20, 0x00); // Low byte of base address
      memory.writeByte(0x21, 0x30); // High byte of base address  
      memory.writeByte(0x3010, 0x66); // Value at base + Y
      
      cpu.setRegisterPC(0x8000);
      memory.writeByte(0x8000, 0xB1);
      memory.writeByte(0x8001, 0x20);
      
      cpu.step();
      
      expect(cpu.registers.A).toBe(0x66);
    });
  });
});