import type { 
  InstructionInfo, 
  OpcodeMap, 
  DisassemblyInfo,
  CPUState,
  CPUStateInfo 
} from '@/types/cpu';
import { AddressingMode } from '@/types/cpu';
import { formatHex } from '@/utils/format';

/**
 * 6502 명령어 해독 및 디스어셈블리 유틸리티
 * 
 * 바이트코드를 읽어서 명령어 정보를 제공하고,
 * 디스어셈블리 출력을 생성하는 기능을 담당합니다.
 */
export class OpcodeDecoder {
  
  /**
   * 바이트코드에서 명령어 정보 추출
   * 
   * @param opcode 명령어 바이트코드 (0x00-0xFF)
   * @returns 명령어 정보 또는 undefined
   */
  public static getInstructionInfo(opcode: number): InstructionInfo | undefined {
    return INSTRUCTION_TABLE[opcode];
  }

  /**
   * 명령어가 유효한지 확인
   * 
   * @param opcode 명령어 바이트코드
   * @returns 유효한 명령어인지 여부
   */
  public static isValidInstruction(opcode: number): boolean {
    return opcode in INSTRUCTION_TABLE;
  }

  /**
   * 명령어의 총 바이트 수 반환 (opcode + operands)
   * 
   * @param opcode 명령어 바이트코드
   * @returns 총 바이트 수 (1-3)
   */
  public static getInstructionLength(opcode: number): number {
    const info = this.getInstructionInfo(opcode);
    return info ? info.bytes + 1 : 1;
  }

  /**
   * 메모리에서 명령어를 읽어 디스어셈블리 정보 생성
   * 
   * @param memory 메모리 데이터
   * @param address 시작 주소
   * @returns 디스어셈블리 정보
   */
  public static disassemble(memory: Uint8Array, address: number): DisassemblyInfo {
    const opcode = memory[address] || 0;
    const info = this.getInstructionInfo(opcode);
    
    if (!info) {
      return {
        address,
        opcode,
        operands: [],
        instruction: '???',
        fullInstruction: `??? $${formatHex(opcode)}`,
        bytes: 1,
        cycles: 0,
        isValid: false,
        addressingMode: AddressingMode.IMPLIED
      };
    }

    // 피연산자 바이트 읽기
    const operands: number[] = [];
    const bytes = [opcode];
    
    for (let i = 1; i <= info.bytes; i++) {
      const operandByte = memory[address + i] || 0;
      operands.push(operandByte);
      bytes.push(operandByte);
    }

    // 피연산자 텍스트 생성
    const operandText = this.formatOperand(info.addressingMode || AddressingMode.IMPLIED, operands, address + info.bytes + 1);
    
    // 전체 명령어 텍스트
    const fullInstruction = operandText 
      ? `${info.mnemonic} ${operandText}`
      : info.mnemonic;

    return {
      address,
      opcode,
      operands,
      instruction: info.mnemonic,
      fullInstruction,
      bytes: info.bytes,
      cycles: info.cycles,
      isValid: true,
      addressingMode: info.addressingMode || AddressingMode.IMPLIED
    };
  }

  /**
   * 메모리 영역을 디스어셈블리하여 여러 명령어 반환
   * 
   * @param memory 메모리 데이터
   * @param startAddress 시작 주소
   * @param count 명령어 개수
   * @returns 디스어셈블리 정보 배열
   */
  public static disassembleRange(
    memory: Uint8Array,
    startAddress: number,
    count: number
  ): DisassemblyInfo[] {
    const result: DisassemblyInfo[] = [];
    let address = startAddress;

    for (let i = 0; i < count && address < memory.length; i++) {
      const info = this.disassemble(memory, address);
      result.push(info);
      // opcode(1) + operands(info.bytes) 만큼 증가
      address += 1 + info.bytes;
    }

    return result;
  }

  /**
   * 주소 지정 모드에 따른 피연산자 텍스트 생성
   * 
   * @param mode 주소 지정 모드
   * @param operands 피연산자 바이트 배열
   * @param nextAddress 다음 명령어 주소 (상대 분기용)
   * @returns 포맷된 피연산자 문자열
   */
  private static formatOperand(
    mode: AddressingMode, 
    operands: number[], 
    nextAddress: number
  ): string {
    switch (mode) {
      case 'IMPLIED':
        return '';
        
      case 'ACCUMULATOR':
        return 'A';
        
      case 'IMMEDIATE':
        return `#$${formatHex(operands[0] || 0)}`;
        
      case 'ZERO_PAGE':
        return `$${formatHex(operands[0] || 0)}`;
        
      case 'ZERO_PAGE_X':
        return `$${formatHex(operands[0] || 0)},X`;
        
      case 'ZERO_PAGE_Y':
        return `$${formatHex(operands[0] || 0)},Y`;
        
      case 'ABSOLUTE': {
        const addr = (operands[0] || 0) | ((operands[1] || 0) << 8);
        return `$${formatHex(addr, 4)}`;
      }
      
      case 'ABSOLUTE_X': {
        const addr = (operands[0] || 0) | ((operands[1] || 0) << 8);
        return `$${formatHex(addr, 4)},X`;
      }
      
      case 'ABSOLUTE_Y': {
        const addr = (operands[0] || 0) | ((operands[1] || 0) << 8);
        return `$${formatHex(addr, 4)},Y`;
      }
      
      case 'RELATIVE': {
        // 상대 주소를 절대 주소로 변환
        const operand0 = operands[0] || 0;
        const offset = operand0 > 127 ? operand0 - 256 : operand0;
        const target = (nextAddress + offset) & 0xFFFF;
        return `$${formatHex(target, 4)}`;
      }
      
      case 'INDIRECT': {
        const addr = (operands[0] || 0) | ((operands[1] || 0) << 8);
        return `($${formatHex(addr, 4)})`;
      }
      
      case 'INDEXED_INDIRECT':
        return `($${formatHex(operands[0] || 0)},X)`;
        
      case 'INDIRECT_INDEXED':
        return `($${formatHex(operands[0] || 0)}),Y`;
        
      default:
        return '???';
    }
  }

  /**
   * 명령어 유형별 분류
   * 
   * @param mnemonic 명령어 이름
   * @returns 명령어 카테고리
   */
  public static getInstructionCategory(mnemonic: string): string {
    const categories: Record<string, string> = {
      // 로드/저장
      'LDA': 'Load/Store', 'LDX': 'Load/Store', 'LDY': 'Load/Store',
      'STA': 'Load/Store', 'STX': 'Load/Store', 'STY': 'Load/Store',
      
      // 산술
      'ADC': 'Arithmetic', 'SBC': 'Arithmetic',
      
      // 논리
      'AND': 'Logic', 'ORA': 'Logic', 'EOR': 'Logic',
      
      // 비교
      'CMP': 'Compare', 'CPX': 'Compare', 'CPY': 'Compare',
      
      // 증감
      'INC': 'Increment/Decrement', 'DEC': 'Increment/Decrement',
      'INX': 'Increment/Decrement', 'DEX': 'Increment/Decrement',
      'INY': 'Increment/Decrement', 'DEY': 'Increment/Decrement',
      
      // 시프트/회전
      'ASL': 'Shift/Rotate', 'LSR': 'Shift/Rotate',
      'ROL': 'Shift/Rotate', 'ROR': 'Shift/Rotate',
      
      // 분기
      'BCC': 'Branch', 'BCS': 'Branch', 'BEQ': 'Branch', 'BMI': 'Branch',
      'BNE': 'Branch', 'BPL': 'Branch', 'BVC': 'Branch', 'BVS': 'Branch',
      
      // 점프/호출
      'JMP': 'Jump/Call', 'JSR': 'Jump/Call', 'RTS': 'Jump/Call', 'RTI': 'Jump/Call',
      
      // 스택
      'PHA': 'Stack', 'PHP': 'Stack', 'PLA': 'Stack', 'PLP': 'Stack',
      
      // 전송
      'TAX': 'Transfer', 'TAY': 'Transfer', 'TXA': 'Transfer', 
      'TYA': 'Transfer', 'TSX': 'Transfer', 'TXS': 'Transfer',
      
      // 상태 플래그
      'CLC': 'Status', 'CLD': 'Status', 'CLI': 'Status', 'CLV': 'Status',
      'SEC': 'Status', 'SED': 'Status', 'SEI': 'Status',
      
      // 기타
      'NOP': 'Misc', 'BRK': 'Misc', 'BIT': 'Misc'
    };
    
    return categories[mnemonic] || 'Unknown';
  }

  /**
   * CPU 상태를 사용한 고급 디스어셈블리 (심볼릭 주소 포함)
   * 
   * @param memory 메모리 데이터
   * @param address 명령어 주소
   * @param cpuState 현재 CPU 상태
   * @param symbols 심볼 테이블 (선택사항)
   * @returns 확장된 디스어셈블리 정보
   */
  public static disassembleWithContext(
    memory: Uint8Array, 
    address: number, 
    cpuState: CPUStateInfo,
    symbols?: Map<number, string>
  ): DisassemblyInfo & { 
    effectiveAddress?: number; 
    symbolName?: string;
    comment?: string;
  } {
    const basic = this.disassemble(memory, address);
    const result = { ...basic };

    // 심볼 이름 추가
    if (symbols && symbols.has(address)) {
      const symbolName = symbols.get(address);
      if (symbolName) {
        result.symbolName = symbolName;
      }
    }

    // 유효 주소 계산 (가능한 경우)
    result.isValid = true;
    if (result.isValid) {
      const effectiveAddr = this.calculateEffectiveAddress(
        result.addressingMode || AddressingMode.IMPLIED, 
        result.operands, 
        cpuState,
        address
      );
      if (effectiveAddr !== undefined) {
        result.effectiveAddress = effectiveAddr;
      }

      // 주석 생성
      result.comment = this.generateComment(result, cpuState, result.effectiveAddress);
    }

    return result;
  }

  /**
   * 유효 주소 계산 (정적 분석용)
   */
  private static calculateEffectiveAddress(
    mode: AddressingMode,
    operands: number[],
    cpuState: CPUStateInfo,
    instructionAddress: number
  ): number | undefined {
    switch (mode) {
      case 'ZERO_PAGE':
        return operands[0] || 0;
        
      case 'ZERO_PAGE_X':
        return ((operands[0] || 0) + cpuState.registers.X) & 0xFF;
        
      case 'ZERO_PAGE_Y':
        return ((operands[0] || 0) + cpuState.registers.Y) & 0xFF;
        
      case 'ABSOLUTE':
        return (operands[0] || 0) | ((operands[1] || 0) << 8);
        
      case 'ABSOLUTE_X':
        return (((operands[0] || 0) | ((operands[1] || 0) << 8)) + cpuState.registers.X) & 0xFFFF;
        
      case 'ABSOLUTE_Y':
        return (((operands[0] || 0) | ((operands[1] || 0) << 8)) + cpuState.registers.Y) & 0xFFFF;
        
      case 'RELATIVE': {
        const operand0 = operands[0] || 0;
        const offset = operand0 > 127 ? operand0 - 256 : operand0;
        return (instructionAddress + operands.length + 1 + offset) & 0xFFFF;
      }
      
      case 'INDIRECT': {
        const indirectAddr = (operands[0] || 0) | ((operands[1] || 0) << 8);
        // 실제 간접 주소 값을 알려면 메모리 내용이 필요
        return indirectAddr;
      }
      
      default:
        return undefined;
    }
  }

  /**
   * 명령어에 대한 설명 주석 생성
   */
  private static generateComment(
    info: DisassemblyInfo,
    cpuState: CPUStateInfo,
    effectiveAddress?: number
  ): string {
    const { instruction: mnemonic, addressingMode } = info;
    
    const comments: string[] = [];

    // 레지스터 값 주석
    if (mnemonic.includes('A') || addressingMode === 'ACCUMULATOR') {
      comments.push(`A=${formatHex(cpuState.registers.A)}`);
    }
    if (mnemonic.includes('X') || addressingMode?.includes('X')) {
      comments.push(`X=${formatHex(cpuState.registers.X)}`);
    }
    if (mnemonic.includes('Y') || addressingMode?.includes('Y')) {
      comments.push(`Y=${formatHex(cpuState.registers.Y)}`);
    }

    // 플래그 상태
    if (['CMP', 'CPX', 'CPY'].includes(mnemonic)) {
      const flags = [];
      if (cpuState.registers.P.carry) flags.push('C');
      if (cpuState.registers.P.zero) flags.push('Z');
      if (cpuState.registers.P.negative) flags.push('N');
      if (flags.length > 0) {
        comments.push(`Flags: ${flags.join('')}`);
      }
    }

    // 유효 주소
    if (effectiveAddress !== undefined) {
      comments.push(`→ $${formatHex(effectiveAddress, 4)}`);
    }

    return comments.join(', ');
  }
}

/**
 * 6502 명령어 테이블
 * 
 * 각 바이트코드(0x00-0xFF)에 대응하는 명령어 정보를 정의합니다.
 * InstructionSet 클래스와 동일한 테이블을 사용하여 일관성을 보장합니다.
 */
const INSTRUCTION_TABLE: Record<number, InstructionInfo> = {
  // 0x0_
  0x00: { opcode: 0x00, mnemonic: 'BRK', addressingMode: AddressingMode.IMPLIED, bytes: 1, cycles: 7, extraCycles: 0, description: 'Break' },
  0x01: { opcode: 0x01, mnemonic: 'ORA', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Logical OR with Accumulator' },
  0x05: { opcode: 0x05, mnemonic: 'ORA', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Logical OR with Accumulator' },
  0x06: { opcode: 0x06, mnemonic: 'ASL', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0, description: 'Arithmetic Shift Left' },
  0x08: { opcode: 0x08, mnemonic: 'PHP', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 3, extraCycles: 0, description: 'Push Processor Status' },
  0x09: { opcode: 0x09, mnemonic: 'ORA', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Logical OR with Accumulator' },
  0x0A: { opcode: 0x0A, mnemonic: 'ASL', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0, description: 'Arithmetic Shift Left' },
  0x0D: { opcode: 0x0D, mnemonic: 'ORA', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Logical OR with Accumulator' },
  0x0E: { opcode: 0x0E, mnemonic: 'ASL', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0, description: 'Arithmetic Shift Left' },

  // 0x1_
  0x10: { opcode: 0x10, mnemonic: 'BPL', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Plus' },
  0x11: { opcode: 0x11, mnemonic: 'ORA', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1, description: 'Logical OR with Accumulator' },
  0x15: { opcode: 0x15, mnemonic: 'ORA', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Logical OR with Accumulator' },
  0x16: { opcode: 0x16, mnemonic: 'ASL', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0, description: 'Arithmetic Shift Left' },
  0x18: { opcode: 0x18, mnemonic: 'CLC', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Clear Carry Flag' },
  0x19: { opcode: 0x19, mnemonic: 'ORA', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Logical OR with Accumulator' },
  0x1D: { opcode: 0x1D, mnemonic: 'ORA', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Logical OR with Accumulator' },
  0x1E: { opcode: 0x1E, mnemonic: 'ASL', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0, description: 'Arithmetic Shift Left' },

  // 0x2_
  0x20: { opcode: 0x20, mnemonic: 'JSR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0, description: 'Jump to Subroutine' },
  0x21: { opcode: 0x21, mnemonic: 'AND', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Logical AND with Accumulator' },
  0x24: { opcode: 0x24, mnemonic: 'BIT', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Bit Test' },
  0x25: { opcode: 0x25, mnemonic: 'AND', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Logical AND with Accumulator' },
  0x26: { opcode: 0x26, mnemonic: 'ROL', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0, description: 'Rotate Left' },
  0x28: { opcode: 0x28, mnemonic: 'PLP', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 4, extraCycles: 0, description: 'Pull Processor Status' },
  0x29: { opcode: 0x29, mnemonic: 'AND', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Logical AND with Accumulator' },
  0x2A: { opcode: 0x2A, mnemonic: 'ROL', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0, description: 'Rotate Left' },
  0x2C: { opcode: 0x2C, mnemonic: 'BIT', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Bit Test' },
  0x2D: { opcode: 0x2D, mnemonic: 'AND', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Logical AND with Accumulator' },
  0x2E: { opcode: 0x2E, mnemonic: 'ROL', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0, description: 'Rotate Left' },

  // 0x3_
  0x30: { opcode: 0x30, mnemonic: 'BMI', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Minus' },
  0x31: { opcode: 0x31, mnemonic: 'AND', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1, description: 'Logical AND with Accumulator' },
  0x35: { opcode: 0x35, mnemonic: 'AND', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Logical AND with Accumulator' },
  0x36: { opcode: 0x36, mnemonic: 'ROL', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0, description: 'Rotate Left' },
  0x38: { opcode: 0x38, mnemonic: 'SEC', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Set Carry Flag' },
  0x39: { opcode: 0x39, mnemonic: 'AND', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Logical AND with Accumulator' },
  0x3D: { opcode: 0x3D, mnemonic: 'AND', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Logical AND with Accumulator' },
  0x3E: { opcode: 0x3E, mnemonic: 'ROL', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0, description: 'Rotate Left' },

  // 0x4_
  0x40: { opcode: 0x40, mnemonic: 'RTI', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 6, extraCycles: 0, description: 'Return from Interrupt' },
  0x41: { opcode: 0x41, mnemonic: 'EOR', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Exclusive OR with Accumulator' },
  0x45: { opcode: 0x45, mnemonic: 'EOR', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Exclusive OR with Accumulator' },
  0x46: { opcode: 0x46, mnemonic: 'LSR', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0, description: 'Logical Shift Right' },
  0x48: { opcode: 0x48, mnemonic: 'PHA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 3, extraCycles: 0, description: 'Push Accumulator' },
  0x49: { opcode: 0x49, mnemonic: 'EOR', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Exclusive OR with Accumulator' },
  0x4A: { opcode: 0x4A, mnemonic: 'LSR', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0, description: 'Logical Shift Right' },
  0x4C: { opcode: 0x4C, mnemonic: 'JMP', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 3, extraCycles: 0, description: 'Jump' },
  0x4D: { opcode: 0x4D, mnemonic: 'EOR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Exclusive OR with Accumulator' },
  0x4E: { opcode: 0x4E, mnemonic: 'LSR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0, description: 'Logical Shift Right' },

  // 0x5_
  0x50: { opcode: 0x50, mnemonic: 'BVC', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Overflow Clear' },
  0x51: { opcode: 0x51, mnemonic: 'EOR', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1, description: 'Exclusive OR with Accumulator' },
  0x55: { opcode: 0x55, mnemonic: 'EOR', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Exclusive OR with Accumulator' },
  0x56: { opcode: 0x56, mnemonic: 'LSR', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0, description: 'Logical Shift Right' },
  0x58: { opcode: 0x58, mnemonic: 'CLI', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Clear Interrupt Flag' },
  0x59: { opcode: 0x59, mnemonic: 'EOR', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Exclusive OR with Accumulator' },
  0x5D: { opcode: 0x5D, mnemonic: 'EOR', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Exclusive OR with Accumulator' },
  0x5E: { opcode: 0x5E, mnemonic: 'LSR', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0, description: 'Logical Shift Right' },

  // 0x6_
  0x60: { opcode: 0x60, mnemonic: 'RTS', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 6, extraCycles: 0, description: 'Return from Subroutine' },
  0x61: { opcode: 0x61, mnemonic: 'ADC', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Add with Carry' },
  0x65: { opcode: 0x65, mnemonic: 'ADC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Add with Carry' },
  0x66: { opcode: 0x66, mnemonic: 'ROR', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0, description: 'Rotate Right' },
  0x68: { opcode: 0x68, mnemonic: 'PLA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 4, extraCycles: 0, description: 'Pull Accumulator' },
  0x69: { opcode: 0x69, mnemonic: 'ADC', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Add with Carry' },
  0x6A: { opcode: 0x6A, mnemonic: 'ROR', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0, description: 'Rotate Right' },
  0x6C: { opcode: 0x6C, mnemonic: 'JMP', addressingMode: AddressingMode.INDIRECT, bytes: 2, cycles: 5, extraCycles: 0, description: 'Jump' },
  0x6D: { opcode: 0x6D, mnemonic: 'ADC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Add with Carry' },
  0x6E: { opcode: 0x6E, mnemonic: 'ROR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0, description: 'Rotate Right' },

  // 0x7_
  0x70: { opcode: 0x70, mnemonic: 'BVS', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Overflow Set' },
  0x71: { opcode: 0x71, mnemonic: 'ADC', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1, description: 'Add with Carry' },
  0x75: { opcode: 0x75, mnemonic: 'ADC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Add with Carry' },
  0x76: { opcode: 0x76, mnemonic: 'ROR', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0, description: 'Rotate Right' },
  0x78: { opcode: 0x78, mnemonic: 'SEI', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Set Interrupt Flag' },
  0x79: { opcode: 0x79, mnemonic: 'ADC', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Add with Carry' },
  0x7D: { opcode: 0x7D, mnemonic: 'ADC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Add with Carry' },
  0x7E: { opcode: 0x7E, mnemonic: 'ROR', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0, description: 'Rotate Right' },

  // 0x8_
  0x81: { opcode: 0x81, mnemonic: 'STA', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Store Accumulator' },
  0x84: { opcode: 0x84, mnemonic: 'STY', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Store Y Register' },
  0x85: { opcode: 0x85, mnemonic: 'STA', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Store Accumulator' },
  0x86: { opcode: 0x86, mnemonic: 'STX', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Store X Register' },
  0x88: { opcode: 0x88, mnemonic: 'DEY', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Decrement Y Register' },
  0x8A: { opcode: 0x8A, mnemonic: 'TXA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Transfer X to Accumulator' },
  0x8C: { opcode: 0x8C, mnemonic: 'STY', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Store Y Register' },
  0x8D: { opcode: 0x8D, mnemonic: 'STA', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Store Accumulator' },
  0x8E: { opcode: 0x8E, mnemonic: 'STX', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Store X Register' },

  // 0x9_
  0x90: { opcode: 0x90, mnemonic: 'BCC', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Carry Clear' },
  0x91: { opcode: 0x91, mnemonic: 'STA', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 6, extraCycles: 0, description: 'Store Accumulator' },
  0x94: { opcode: 0x94, mnemonic: 'STY', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Store Y Register' },
  0x95: { opcode: 0x95, mnemonic: 'STA', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Store Accumulator' },
  0x96: { opcode: 0x96, mnemonic: 'STX', addressingMode: AddressingMode.ZERO_PAGE_Y, bytes: 1, cycles: 4, extraCycles: 0, description: 'Store X Register' },
  0x98: { opcode: 0x98, mnemonic: 'TYA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Transfer Y to Accumulator' },
  0x99: { opcode: 0x99, mnemonic: 'STA', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 5, extraCycles: 0, description: 'Store Accumulator' },
  0x9A: { opcode: 0x9A, mnemonic: 'TXS', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Transfer X to Stack Pointer' },
  0x9D: { opcode: 0x9D, mnemonic: 'STA', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 5, extraCycles: 0, description: 'Store Accumulator' },

  // 0xA_
  0xA0: { opcode: 0xA0, mnemonic: 'LDY', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Load Y Register' },
  0xA1: { opcode: 0xA1, mnemonic: 'LDA', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Load Accumulator' },
  0xA2: { opcode: 0xA2, mnemonic: 'LDX', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Load X Register' },
  0xA4: { opcode: 0xA4, mnemonic: 'LDY', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Load Y Register' },
  0xA5: { opcode: 0xA5, mnemonic: 'LDA', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Load Accumulator' },
  0xA6: { opcode: 0xA6, mnemonic: 'LDX', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Load X Register' },
  0xA8: { opcode: 0xA8, mnemonic: 'TAY', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Transfer Accumulator to Y' },
  0xA9: { opcode: 0xA9, mnemonic: 'LDA', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Load Accumulator' },
  0xAA: { opcode: 0xAA, mnemonic: 'TAX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Transfer Accumulator to X' },
  0xAC: { opcode: 0xAC, mnemonic: 'LDY', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Load Y Register' },
  0xAD: { opcode: 0xAD, mnemonic: 'LDA', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Load Accumulator' },
  0xAE: { opcode: 0xAE, mnemonic: 'LDX', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Load X Register' },

  // 0xB_
  0xB0: { opcode: 0xB0, mnemonic: 'BCS', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Carry Set' },
  0xB1: { opcode: 0xB1, mnemonic: 'LDA', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1, description: 'Load Accumulator' },
  0xB4: { opcode: 0xB4, mnemonic: 'LDY', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Load Y Register' },
  0xB5: { opcode: 0xB5, mnemonic: 'LDA', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Load Accumulator' },
  0xB6: { opcode: 0xB6, mnemonic: 'LDX', addressingMode: AddressingMode.ZERO_PAGE_Y, bytes: 1, cycles: 4, extraCycles: 0, description: 'Load X Register' },
  0xB8: { opcode: 0xB8, mnemonic: 'CLV', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Clear Overflow Flag' },
  0xB9: { opcode: 0xB9, mnemonic: 'LDA', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Load Accumulator' },
  0xBA: { opcode: 0xBA, mnemonic: 'TSX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Transfer Stack Pointer to X' },
  0xBC: { opcode: 0xBC, mnemonic: 'LDY', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Load Y Register' },
  0xBD: { opcode: 0xBD, mnemonic: 'LDA', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Load Accumulator' },
  0xBE: { opcode: 0xBE, mnemonic: 'LDX', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Load X Register' },

  // 0xC_
  0xC0: { opcode: 0xC0, mnemonic: 'CPY', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Compare Y Register' },
  0xC1: { opcode: 0xC1, mnemonic: 'CMP', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Compare Accumulator' },
  0xC4: { opcode: 0xC4, mnemonic: 'CPY', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Compare Y Register' },
  0xC5: { opcode: 0xC5, mnemonic: 'CMP', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Compare Accumulator' },
  0xC6: { opcode: 0xC6, mnemonic: 'DEC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0, description: 'Decrement Memory' },
  0xC8: { opcode: 0xC8, mnemonic: 'INY', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Increment Y Register' },
  0xC9: { opcode: 0xC9, mnemonic: 'CMP', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Compare Accumulator' },
  0xCA: { opcode: 0xCA, mnemonic: 'DEX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Decrement X Register' },
  0xCC: { opcode: 0xCC, mnemonic: 'CPY', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Compare Y Register' },
  0xCD: { opcode: 0xCD, mnemonic: 'CMP', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Compare Accumulator' },
  0xCE: { opcode: 0xCE, mnemonic: 'DEC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0, description: 'Decrement Memory' },

  // 0xD_
  0xD0: { opcode: 0xD0, mnemonic: 'BNE', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Not Equal' },
  0xD1: { opcode: 0xD1, mnemonic: 'CMP', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1, description: 'Compare Accumulator' },
  0xD5: { opcode: 0xD5, mnemonic: 'CMP', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Compare Accumulator' },
  0xD6: { opcode: 0xD6, mnemonic: 'DEC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0, description: 'Decrement Memory' },
  0xD8: { opcode: 0xD8, mnemonic: 'CLD', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Clear Decimal Flag' },
  0xD9: { opcode: 0xD9, mnemonic: 'CMP', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Compare Accumulator' },
  0xDD: { opcode: 0xDD, mnemonic: 'CMP', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Compare Accumulator' },
  0xDE: { opcode: 0xDE, mnemonic: 'DEC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0, description: 'Decrement Memory' },

  // 0xE_
  0xE0: { opcode: 0xE0, mnemonic: 'CPX', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Compare X Register' },
  0xE1: { opcode: 0xE1, mnemonic: 'SBC', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0, description: 'Subtract with Carry' },
  0xE4: { opcode: 0xE4, mnemonic: 'CPX', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Compare X Register' },
  0xE5: { opcode: 0xE5, mnemonic: 'SBC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0, description: 'Subtract with Carry' },
  0xE6: { opcode: 0xE6, mnemonic: 'INC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0, description: 'Increment Memory' },
  0xE8: { opcode: 0xE8, mnemonic: 'INX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Increment X Register' },
  0xE9: { opcode: 0xE9, mnemonic: 'SBC', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0, description: 'Subtract with Carry' },
  0xEA: { opcode: 0xEA, mnemonic: 'NOP', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'No Operation' },
  0xEC: { opcode: 0xEC, mnemonic: 'CPX', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Compare X Register' },
  0xED: { opcode: 0xED, mnemonic: 'SBC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0, description: 'Subtract with Carry' },
  0xEE: { opcode: 0xEE, mnemonic: 'INC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0, description: 'Increment Memory' },

  // 0xF_
  0xF0: { opcode: 0xF0, mnemonic: 'BEQ', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1, description: 'Branch if Equal' },
  0xF1: { opcode: 0xF1, mnemonic: 'SBC', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1, description: 'Subtract with Carry' },
  0xF5: { opcode: 0xF5, mnemonic: 'SBC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0, description: 'Subtract with Carry' },
  0xF6: { opcode: 0xF6, mnemonic: 'INC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0, description: 'Increment Memory' },
  0xF8: { opcode: 0xF8, mnemonic: 'SED', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0, description: 'Set Decimal Flag' },
  0xF9: { opcode: 0xF9, mnemonic: 'SBC', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1, description: 'Subtract with Carry' },
  0xFD: { opcode: 0xFD, mnemonic: 'SBC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1, description: 'Subtract with Carry' },
  0xFE: { opcode: 0xFE, mnemonic: 'INC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0, description: 'Increment Memory' },
};

/**
 * 명령어 통계 정보
 */
export class InstructionStats {
  /**
   * 명령어 유형별 개수 통계
   */
  public static getInstructionTypeStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const info of Object.values(INSTRUCTION_TABLE)) {
      const category = OpcodeDecoder.getInstructionCategory(info.mnemonic);
      stats[category] = (stats[category] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * 주소 지정 모드별 개수 통계
   */
  public static getAddressingModeStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const info of Object.values(INSTRUCTION_TABLE)) {
      const mode = info.addressingMode;
      if (mode) {
        stats[mode] = (stats[mode] || 0) + 1;
      }
    }
    
    return stats;
  }

  /**
   * 사이클 수별 명령어 분포
   */
  public static getCycleDistribution(): Record<number, number> {
    const stats: Record<number, number> = {};
    
    for (const info of Object.values(INSTRUCTION_TABLE)) {
      const cycles = info.cycles;
      stats[cycles] = (stats[cycles] || 0) + 1;
    }
    
    return stats;
  }
}