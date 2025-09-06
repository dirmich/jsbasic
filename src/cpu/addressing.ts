import type { AddressingMode, AddressingModeInfo } from '@/types/cpu';
import type { CPU6502 } from './cpu';
import { CPUError } from '@/utils/errors';
import { formatHex } from '@/utils/format';

/**
 * 6502 주소 지정 모드 구현
 * 
 * 6502 프로세서의 13가지 주소 지정 모드를 모두 구현합니다:
 * - Implied, Accumulator, Immediate
 * - Zero Page, Zero Page,X, Zero Page,Y  
 * - Absolute, Absolute,X, Absolute,Y
 * - Relative, Indirect, (Indirect,X), (Indirect),Y
 */
export class AddressingModes {
  constructor(private readonly cpu: CPU6502) {}
  
  /**
   * 주소 지정 모드에 따라 피연산자 주소 계산
   * 
   * @param mode 주소 지정 모드
   * @returns 계산된 주소 (Immediate, Implied, Accumulator 모드는 특별 처리)
   */
  public getOperandAddress(mode: AddressingMode): number {
    switch (mode) {
      case 'IMPLIED':
        return 0; // 피연산자 없음
        
      case 'ACCUMULATOR':
        return 0; // 누산기 자체가 피연산자
        
      case 'IMMEDIATE':
        return this.cpu.registers.PC; // 현재 PC 위치의 값
        
      case 'ZERO_PAGE':
        return this.cpu.fetchByte();
        
      case 'ZERO_PAGE_X':
        return (this.cpu.fetchByte() + this.cpu.registers.X) & 0xFF;
        
      case 'ZERO_PAGE_Y':
        return (this.cpu.fetchByte() + this.cpu.registers.Y) & 0xFF;
        
      case 'ABSOLUTE':
        return this.cpu.fetchWord();
        
      case 'ABSOLUTE_X':
        return (this.cpu.fetchWord() + this.cpu.registers.X) & 0xFFFF;
        
      case 'ABSOLUTE_Y':
        return (this.cpu.fetchWord() + this.cpu.registers.Y) & 0xFFFF;
        
      case 'RELATIVE':
        return this.calculateRelativeAddress();
        
      case 'INDIRECT':
        return this.calculateIndirectAddress();
        
      case 'INDEXED_INDIRECT': // (zp,X)
        return this.calculateIndexedIndirectAddress();
        
      case 'INDIRECT_INDEXED': // (zp),Y
        return this.calculateIndirectIndexedAddress();
        
      default:
        throw new CPUError(`Unknown addressing mode: ${mode}`, 'INVALID_ADDRESSING_MODE');
    }
  }
  
  /**
   * 주소 지정 모드에 따라 피연산자 값 반환
   * 
   * @param mode 주소 지정 모드
   * @returns 피연산자 값
   */
  public getOperandValue(mode: AddressingMode): number {
    switch (mode) {
      case 'IMPLIED':
        return 0;
        
      case 'ACCUMULATOR':
        return this.cpu.registers.A;
        
      case 'IMMEDIATE':
        return this.cpu.fetchByte();
        
      default: {
        const address = this.getOperandAddress(mode);
        return this.cpu.readByte(address);
      }
    }
  }
  
  /**
   * 주소 지정 모드에 따라 값 저장
   * 
   * @param mode 주소 지정 모드
   * @param value 저장할 값
   */
  public setOperandValue(mode: AddressingMode, value: number): void {
    switch (mode) {
      case 'ACCUMULATOR':
        this.cpu.setRegisterA(value);
        break;
        
      case 'IMPLIED':
      case 'IMMEDIATE':
        throw new CPUError(`Cannot write to ${mode} addressing mode`, 'INVALID_WRITE_MODE');
        
      default: {
        const address = this.getOperandAddress(mode);
        this.cpu.writeByte(address, value);
        break;
      }
    }
  }
  
  /**
   * 페이지 경계를 넘나드는지 확인 (추가 사이클 계산용)
   * 
   * @param baseAddress 기본 주소
   * @param indexedAddress 인덱스가 적용된 주소
   * @returns 페이지 경계를 넘으면 true
   */
  public crossesPageBoundary(baseAddress: number, indexedAddress: number): boolean {
    return (baseAddress & 0xFF00) !== (indexedAddress & 0xFF00);
  }
  
  /**
   * 주소 지정 모드 정보 반환
   */
  public getModeInfo(mode: AddressingMode): AddressingModeInfo {
    const modeInfoMap: Record<AddressingMode, AddressingModeInfo> = {
      'IMPLIED': {
        name: 'Implied',
        description: '피연산자 없음 (예: NOP, RTS)',
        operandBytes: 0,
        example: 'NOP'
      },
      'ACCUMULATOR': {
        name: 'Accumulator',
        description: '누산기를 피연산자로 사용 (예: LSR A)',
        operandBytes: 0,
        example: 'LSR A'
      },
      'IMMEDIATE': {
        name: 'Immediate',
        description: '즉시값 사용 (예: LDA #$42)',
        operandBytes: 1,
        example: 'LDA #$42'
      },
      'ZERO_PAGE': {
        name: 'Zero Page',
        description: '페이지 제로 주소 (예: LDA $12)',
        operandBytes: 1,
        example: 'LDA $12'
      },
      'ZERO_PAGE_X': {
        name: 'Zero Page,X',
        description: '페이지 제로 + X 레지스터 (예: LDA $12,X)',
        operandBytes: 1,
        example: 'LDA $12,X'
      },
      'ZERO_PAGE_Y': {
        name: 'Zero Page,Y',
        description: '페이지 제로 + Y 레지스터 (예: LDX $12,Y)',
        operandBytes: 1,
        example: 'LDX $12,Y'
      },
      'ABSOLUTE': {
        name: 'Absolute',
        description: '절대 주소 (예: LDA $1234)',
        operandBytes: 2,
        example: 'LDA $1234'
      },
      'ABSOLUTE_X': {
        name: 'Absolute,X',
        description: '절대 주소 + X 레지스터 (예: LDA $1234,X)',
        operandBytes: 2,
        example: 'LDA $1234,X'
      },
      'ABSOLUTE_Y': {
        name: 'Absolute,Y',
        description: '절대 주소 + Y 레지스터 (예: LDA $1234,Y)',
        operandBytes: 2,
        example: 'LDA $1234,Y'
      },
      'RELATIVE': {
        name: 'Relative',
        description: '상대 주소 (분기 명령어용, 예: BNE $12)',
        operandBytes: 1,
        example: 'BNE $12'
      },
      'INDIRECT': {
        name: 'Indirect',
        description: '간접 주소 (JMP 전용, 예: JMP ($1234))',
        operandBytes: 2,
        example: 'JMP ($1234)'
      },
      'INDEXED_INDIRECT': {
        name: '(Indirect,X)',
        description: '인덱스된 간접 주소 (예: LDA ($12,X))',
        operandBytes: 1,
        example: 'LDA ($12,X)'
      },
      'INDIRECT_INDEXED': {
        name: '(Indirect),Y',
        description: '간접 인덱스된 주소 (예: LDA ($12),Y)',
        operandBytes: 1,
        example: 'LDA ($12),Y'
      }
    };
    
    return modeInfoMap[mode];
  }
  
  // =================================================================
  // 복잡한 주소 지정 모드 계산 메서드
  // =================================================================
  
  /**
   * 상대 주소 계산 (분기 명령어용)
   * 
   * 부호 있는 8비트 오프셋을 현재 PC에 더함
   * PC는 이미 명령어 다음을 가리키고 있음
   */
  private calculateRelativeAddress(): number {
    const offset = this.cpu.fetchByte();
    const pc = this.cpu.registers.PC;
    
    // 8비트 부호 있는 값을 16비트로 확장
    const signedOffset = offset > 127 ? offset - 256 : offset;
    
    return (pc + signedOffset) & 0xFFFF;
  }
  
  /**
   * 간접 주소 계산 (JMP 명령어 전용)
   * 
   * 6502의 유명한 간접 주소 버그도 구현:
   * JMP ($xxFF)에서 상위 바이트를 $xx00에서 읽음
   */
  private calculateIndirectAddress(): number {
    const indirectAddr = this.cpu.fetchWord();
    
    // 6502 간접 주소 버그: 페이지 경계에서 래핑
    if ((indirectAddr & 0xFF) === 0xFF) {
      const low = this.cpu.readByte(indirectAddr);
      const high = this.cpu.readByte(indirectAddr & 0xFF00); // 같은 페이지의 시작으로
      return low | (high << 8);
    } else {
      return this.cpu.readWord(indirectAddr);
    }
  }
  
  /**
   * 인덱스된 간접 주소 계산: (zp,X)
   * 
   * 1. 제로 페이지 주소에 X를 더함 (제로 페이지 내에서 래핑)
   * 2. 그 주소에서 16비트 주소를 읽음
   */
  private calculateIndexedIndirectAddress(): number {
    const zpAddr = this.cpu.fetchByte();
    const effectiveZpAddr = (zpAddr + this.cpu.registers.X) & 0xFF;
    
    // 제로 페이지 경계에서 래핑
    const low = this.cpu.readByte(effectiveZpAddr);
    const high = this.cpu.readByte((effectiveZpAddr + 1) & 0xFF);
    
    return low | (high << 8);
  }
  
  /**
   * 간접 인덱스된 주소 계산: (zp),Y
   * 
   * 1. 제로 페이지 주소에서 16비트 베이스 주소를 읽음
   * 2. 베이스 주소에 Y를 더함
   */
  private calculateIndirectIndexedAddress(): number {
    const zpAddr = this.cpu.fetchByte();
    
    // 제로 페이지 경계에서 래핑
    const low = this.cpu.readByte(zpAddr);
    const high = this.cpu.readByte((zpAddr + 1) & 0xFF);
    
    const baseAddr = low | (high << 8);
    return (baseAddr + this.cpu.registers.Y) & 0xFFFF;
  }
  
  /**
   * 주소 지정 모드별 추가 사이클 계산
   * 
   * 일부 주소 지정 모드는 페이지 경계를 넘을 때 추가 사이클 필요
   * 
   * @param mode 주소 지정 모드
   * @param baseAddress 기본 주소 (페이지 경계 확인용)
   * @returns 추가 사이클 수
   */
  public getExtraCycles(mode: AddressingMode, baseAddress?: number): number {
    if (!baseAddress) return 0;
    
    switch (mode) {
      case 'ABSOLUTE_X': {
        const finalAddress = (baseAddress + this.cpu.registers.X) & 0xFFFF;
        return this.crossesPageBoundary(baseAddress, finalAddress) ? 1 : 0;
      }
      case 'ABSOLUTE_Y': {
        const finalAddress = (baseAddress + this.cpu.registers.Y) & 0xFFFF;
        return this.crossesPageBoundary(baseAddress, finalAddress) ? 1 : 0;
      }
      case 'INDIRECT_INDEXED': {
        // (zp),Y에서 Y를 더했을 때 페이지 경계를 넘으면 +1 사이클
        const zpAddr = baseAddress & 0xFF;
        const low = this.cpu.readByte(zpAddr);
        const high = this.cpu.readByte((zpAddr + 1) & 0xFF);
        const baseAddr = low | (high << 8);
        const finalAddress = (baseAddr + this.cpu.registers.Y) & 0xFFFF;
        return this.crossesPageBoundary(baseAddr, finalAddress) ? 1 : 0;
      }
      default:
        return 0;
    }
  }
  
  /**
   * 디스어셈블리용 주소 표현 생성
   * 
   * @param mode 주소 지정 모드
   * @param operands 피연산자 바이트 배열
   * @returns 어셈블리 형식 문자열
   */
  public formatOperand(mode: AddressingMode, operands: number[]): string {
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
        // 상대 주소를 절대 주소로 변환하여 표시
        const offset = operands[0] > 127 ? operands[0] - 256 : operands[0];
        const target = (this.cpu.registers.PC + offset) & 0xFFFF;
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
}