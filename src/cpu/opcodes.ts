import type { 
  AddressingMode, 
  InstructionInfo, 
  OpcodeMap, 
  DisassemblyInfo,
  CPUState 
} from '@/types/cpu';
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
    return info ? info.operandBytes + 1 : 1;
  }

  /**
   * 메모리에서 명령어를 읽어 디스어셈블리 정보 생성
   * 
   * @param memory 메모리 데이터
   * @param address 시작 주소
   * @returns 디스어셈블리 정보
   */
  public static disassemble(memory: Uint8Array, address: number): DisassemblyInfo {
    const opcode = memory[address];
    const info = this.getInstructionInfo(opcode);
    
    if (!info) {
      return {
        address,
        opcode,
        operands: [],
        mnemonic: '???',
        operandText: '',
        fullInstruction: `??? $${formatHex(opcode)}`,
        bytes: [opcode],
        isValid: false
      };
    }

    // 피연산자 바이트 읽기
    const operands: number[] = [];
    const bytes = [opcode];
    
    for (let i = 1; i <= info.operandBytes; i++) {
      const operandByte = memory[address + i] || 0;
      operands.push(operandByte);
      bytes.push(operandByte);
    }

    // 피연산자 텍스트 생성
    const operandText = this.formatOperand(info.addressingMode, operands, address + info.operandBytes + 1);
    
    // 전체 명령어 텍스트
    const fullInstruction = operandText 
      ? `${info.mnemonic} ${operandText}`
      : info.mnemonic;

    return {
      address,
      opcode,
      operands,
      mnemonic: info.mnemonic,
      operandText,
      fullInstruction,
      bytes,
      isValid: true,
      cycles: info.cycles,
      extraCycles: info.extraCycles,
      addressingMode: info.addressingMode
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
      address += info.bytes.length;
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
        return `#$${formatHex(operands[0])}`;
        
      case 'ZERO_PAGE':
        return `$${formatHex(operands[0])}`;
        
      case 'ZERO_PAGE_X':
        return `$${formatHex(operands[0])},X`;
        
      case 'ZERO_PAGE_Y':
        return `$${formatHex(operands[0])},Y`;
        
      case 'ABSOLUTE': {
        const addr = operands[0] | (operands[1] << 8);
        return `$${formatHex(addr, 4)}`;
      }
      
      case 'ABSOLUTE_X': {
        const addr = operands[0] | (operands[1] << 8);
        return `$${formatHex(addr, 4)},X`;
      }
      
      case 'ABSOLUTE_Y': {
        const addr = operands[0] | (operands[1] << 8);
        return `$${formatHex(addr, 4)},Y`;
      }
      
      case 'RELATIVE': {
        // 상대 주소를 절대 주소로 변환
        const offset = operands[0] > 127 ? operands[0] - 256 : operands[0];
        const target = (nextAddress + offset) & 0xFFFF;
        return `$${formatHex(target, 4)}`;
      }
      
      case 'INDIRECT': {
        const addr = operands[0] | (operands[1] << 8);
        return `($${formatHex(addr, 4)})`;
      }
      
      case 'INDEXED_INDIRECT':
        return `($${formatHex(operands[0])},X)`;
        
      case 'INDIRECT_INDEXED':
        return `($${formatHex(operands[0])}),Y`;
        
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
    cpuState: CPUState,
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
      result.symbolName = symbols.get(address);
    }

    // 유효 주소 계산 (가능한 경우)
    if (basic.isValid) {
      result.effectiveAddress = this.calculateEffectiveAddress(
        basic.addressingMode!, 
        basic.operands, 
        cpuState,
        address
      );

      // 주석 생성
      result.comment = this.generateComment(basic, cpuState, result.effectiveAddress);
    }

    return result;
  }

  /**
   * 유효 주소 계산 (정적 분석용)
   */
  private static calculateEffectiveAddress(
    mode: AddressingMode,
    operands: number[],
    cpuState: CPUState,
    instructionAddress: number
  ): number | undefined {
    switch (mode) {
      case 'ZERO_PAGE':
        return operands[0];
        
      case 'ZERO_PAGE_X':
        return (operands[0] + cpuState.registers.X) & 0xFF;
        
      case 'ZERO_PAGE_Y':
        return (operands[0] + cpuState.registers.Y) & 0xFF;
        
      case 'ABSOLUTE':
        return operands[0] | (operands[1] << 8);
        
      case 'ABSOLUTE_X':
        return ((operands[0] | (operands[1] << 8)) + cpuState.registers.X) & 0xFFFF;
        
      case 'ABSOLUTE_Y':
        return ((operands[0] | (operands[1] << 8)) + cpuState.registers.Y) & 0xFFFF;
        
      case 'RELATIVE': {
        const offset = operands[0] > 127 ? operands[0] - 256 : operands[0];
        return (instructionAddress + operands.length + 1 + offset) & 0xFFFF;
      }
      
      case 'INDIRECT': {
        const indirectAddr = operands[0] | (operands[1] << 8);
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
    cpuState: CPUState,
    effectiveAddress?: number
  ): string {
    const { mnemonic, addressingMode } = info;
    
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
      if (cpuState.registers.P & 0x01) flags.push('C');
      if (cpuState.registers.P & 0x02) flags.push('Z');
      if (cpuState.registers.P & 0x80) flags.push('N');
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
const INSTRUCTION_TABLE: OpcodeMap = {
  // 0x0_
  0x00: { mnemonic: 'BRK', addressingMode: 'IMPLIED', operandBytes: 1, cycles: 7, extraCycles: false },
  0x01: { mnemonic: 'ORA', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0x05: { mnemonic: 'ORA', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x06: { mnemonic: 'ASL', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 5, extraCycles: false },
  0x08: { mnemonic: 'PHP', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 3, extraCycles: false },
  0x09: { mnemonic: 'ORA', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0x0A: { mnemonic: 'ASL', addressingMode: 'ACCUMULATOR', operandBytes: 0, cycles: 2, extraCycles: false },
  0x0D: { mnemonic: 'ORA', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x0E: { mnemonic: 'ASL', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },

  // 0x1_
  0x10: { mnemonic: 'BPL', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x11: { mnemonic: 'ORA', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x15: { mnemonic: 'ORA', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x16: { mnemonic: 'ASL', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x18: { mnemonic: 'CLC', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x19: { mnemonic: 'ORA', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x1D: { mnemonic: 'ORA', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x1E: { mnemonic: 'ASL', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },

  // 0x2_
  0x20: { mnemonic: 'JSR', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },
  0x21: { mnemonic: 'AND', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0x24: { mnemonic: 'BIT', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x25: { mnemonic: 'AND', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x26: { mnemonic: 'ROL', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 5, extraCycles: false },
  0x28: { mnemonic: 'PLP', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 4, extraCycles: false },
  0x29: { mnemonic: 'AND', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0x2A: { mnemonic: 'ROL', addressingMode: 'ACCUMULATOR', operandBytes: 0, cycles: 2, extraCycles: false },
  0x2C: { mnemonic: 'BIT', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x2D: { mnemonic: 'AND', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x2E: { mnemonic: 'ROL', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },

  // 0x3_
  0x30: { mnemonic: 'BMI', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x31: { mnemonic: 'AND', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x35: { mnemonic: 'AND', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x36: { mnemonic: 'ROL', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x38: { mnemonic: 'SEC', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x39: { mnemonic: 'AND', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x3D: { mnemonic: 'AND', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x3E: { mnemonic: 'ROL', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },

  // 0x4_
  0x40: { mnemonic: 'RTI', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 6, extraCycles: false },
  0x41: { mnemonic: 'EOR', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0x45: { mnemonic: 'EOR', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x46: { mnemonic: 'LSR', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 5, extraCycles: false },
  0x48: { mnemonic: 'PHA', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 3, extraCycles: false },
  0x49: { mnemonic: 'EOR', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0x4A: { mnemonic: 'LSR', addressingMode: 'ACCUMULATOR', operandBytes: 0, cycles: 2, extraCycles: false },
  0x4C: { mnemonic: 'JMP', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 3, extraCycles: false },
  0x4D: { mnemonic: 'EOR', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x4E: { mnemonic: 'LSR', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },

  // 0x5_
  0x50: { mnemonic: 'BVC', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x51: { mnemonic: 'EOR', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x55: { mnemonic: 'EOR', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x56: { mnemonic: 'LSR', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x58: { mnemonic: 'CLI', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x59: { mnemonic: 'EOR', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x5D: { mnemonic: 'EOR', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x5E: { mnemonic: 'LSR', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },

  // 0x6_
  0x60: { mnemonic: 'RTS', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 6, extraCycles: false },
  0x61: { mnemonic: 'ADC', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0x65: { mnemonic: 'ADC', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x66: { mnemonic: 'ROR', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 5, extraCycles: false },
  0x68: { mnemonic: 'PLA', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 4, extraCycles: false },
  0x69: { mnemonic: 'ADC', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0x6A: { mnemonic: 'ROR', addressingMode: 'ACCUMULATOR', operandBytes: 0, cycles: 2, extraCycles: false },
  0x6C: { mnemonic: 'JMP', addressingMode: 'INDIRECT', operandBytes: 2, cycles: 5, extraCycles: false },
  0x6D: { mnemonic: 'ADC', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x6E: { mnemonic: 'ROR', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },

  // 0x7_
  0x70: { mnemonic: 'BVS', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x71: { mnemonic: 'ADC', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x75: { mnemonic: 'ADC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x76: { mnemonic: 'ROR', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x78: { mnemonic: 'SEI', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x79: { mnemonic: 'ADC', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x7D: { mnemonic: 'ADC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x7E: { mnemonic: 'ROR', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },

  // 0x8_
  0x81: { mnemonic: 'STA', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0x84: { mnemonic: 'STY', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x85: { mnemonic: 'STA', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x86: { mnemonic: 'STX', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x88: { mnemonic: 'DEY', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x8A: { mnemonic: 'TXA', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x8C: { mnemonic: 'STY', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x8D: { mnemonic: 'STA', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x8E: { mnemonic: 'STX', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },

  // 0x9_
  0x90: { mnemonic: 'BCC', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x91: { mnemonic: 'STA', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 6, extraCycles: false },
  0x94: { mnemonic: 'STY', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x95: { mnemonic: 'STA', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x96: { mnemonic: 'STX', addressingMode: 'ZERO_PAGE_Y', operandBytes: 1, cycles: 4, extraCycles: false },
  0x98: { mnemonic: 'TYA', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x99: { mnemonic: 'STA', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 5, extraCycles: false },
  0x9A: { mnemonic: 'TXS', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x9D: { mnemonic: 'STA', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 5, extraCycles: false },

  // 0xA_
  0xA0: { mnemonic: 'LDY', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0xA1: { mnemonic: 'LDA', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0xA2: { mnemonic: 'LDX', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0xA4: { mnemonic: 'LDY', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0xA5: { mnemonic: 'LDA', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0xA6: { mnemonic: 'LDX', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0xA8: { mnemonic: 'TAY', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xA9: { mnemonic: 'LDA', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0xAA: { mnemonic: 'TAX', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xAC: { mnemonic: 'LDY', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0xAD: { mnemonic: 'LDA', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0xAE: { mnemonic: 'LDX', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },

  // 0xB_
  0xB0: { mnemonic: 'BCS', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0xB1: { mnemonic: 'LDA', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0xB4: { mnemonic: 'LDY', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0xB5: { mnemonic: 'LDA', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0xB6: { mnemonic: 'LDX', addressingMode: 'ZERO_PAGE_Y', operandBytes: 1, cycles: 4, extraCycles: false },
  0xB8: { mnemonic: 'CLV', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xB9: { mnemonic: 'LDA', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0xBA: { mnemonic: 'TSX', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xBC: { mnemonic: 'LDY', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0xBD: { mnemonic: 'LDA', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0xBE: { mnemonic: 'LDX', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },

  // 0xC_
  0xC0: { mnemonic: 'CPY', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0xC1: { mnemonic: 'CMP', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0xC4: { mnemonic: 'CPY', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0xC5: { mnemonic: 'CMP', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0xC6: { mnemonic: 'DEC', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 5, extraCycles: false },
  0xC8: { mnemonic: 'INY', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xC9: { mnemonic: 'CMP', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0xCA: { mnemonic: 'DEX', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xCC: { mnemonic: 'CPY', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0xCD: { mnemonic: 'CMP', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0xCE: { mnemonic: 'DEC', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },

  // 0xD_
  0xD0: { mnemonic: 'BNE', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0xD1: { mnemonic: 'CMP', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0xD5: { mnemonic: 'CMP', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0xD6: { mnemonic: 'DEC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0xD8: { mnemonic: 'CLD', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xD9: { mnemonic: 'CMP', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0xDD: { mnemonic: 'CMP', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0xDE: { mnemonic: 'DEC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },

  // 0xE_
  0xE0: { mnemonic: 'CPX', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0xE1: { mnemonic: 'SBC', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0xE4: { mnemonic: 'CPX', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0xE5: { mnemonic: 'SBC', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0xE6: { mnemonic: 'INC', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 5, extraCycles: false },
  0xE8: { mnemonic: 'INX', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xE9: { mnemonic: 'SBC', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0xEA: { mnemonic: 'NOP', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xEC: { mnemonic: 'CPX', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0xED: { mnemonic: 'SBC', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0xEE: { mnemonic: 'INC', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },

  // 0xF_
  0xF0: { mnemonic: 'BEQ', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0xF1: { mnemonic: 'SBC', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0xF5: { mnemonic: 'SBC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0xF6: { mnemonic: 'INC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0xF8: { mnemonic: 'SED', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xF9: { mnemonic: 'SBC', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0xFD: { mnemonic: 'SBC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0xFE: { mnemonic: 'INC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false }
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
  public static getAddressingModeStats(): Record<AddressingMode, number> {
    const stats: Record<AddressingMode, number> = {} as any;
    
    for (const info of Object.values(INSTRUCTION_TABLE)) {
      const mode = info.addressingMode;
      stats[mode] = (stats[mode] || 0) + 1;
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