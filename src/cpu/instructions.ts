import type { AddressingMode, InstructionInfo, OpcodeMap } from '@/types/cpu';
import type { CPU6502 } from './cpu';
import { CPUError } from '@/utils/errors';

/**
 * 6502 명령어 세트 구현
 * 
 * 6502 프로세서의 151개 공식 명령어를 모두 구현합니다:
 * - 로드/저장 명령어 (LDA, LDX, LDY, STA, STX, STY)
 * - 산술/논리 명령어 (ADC, SBC, AND, ORA, EOR)
 * - 비교 명령어 (CMP, CPX, CPY)
 * - 증감 명령어 (INC, DEC, INX, DEX, INY, DEY)
 * - 시프트/회전 명령어 (ASL, LSR, ROL, ROR)
 * - 분기 명령어 (BCC, BCS, BEQ, BMI, BNE, BPL, BVC, BVS)
 * - 점프/호출 명령어 (JMP, JSR, RTS, RTI)
 * - 스택 명령어 (PHA, PHP, PLA, PLP)
 * - 상태 플래그 명령어 (CLC, CLD, CLI, CLV, SEC, SED, SEI)
 * - 기타 명령어 (NOP, BRK)
 */
export class InstructionSet {
  constructor(private readonly cpu: CPU6502) {}

  /**
   * 명령어 실행
   * 
   * @param opcode 명령어 바이트 코드
   * @returns 명령어 실행에 소요된 사이클 수
   */
  public execute(opcode: number): number {
    const instruction = this.getInstruction(opcode);
    if (!instruction) {
      throw new CPUError(`Unknown opcode: $${opcode.toString(16).padStart(2, '0')}`, 'UNKNOWN_OPCODE');
    }

    // 기본 사이클 수
    let cycles = instruction.cycles;

    // 주소 지정 모드에 따른 추가 사이클 계산
    if (instruction.extraCycles && this.needsExtraCycle(instruction)) {
      cycles++;
    }

    // 명령어 실행
    this.executeInstruction(instruction);

    return cycles;
  }

  /**
   * 명령어 정보 반환
   * 
   * @param opcode 명령어 바이트 코드
   * @returns 명령어 정보 객체
   */
  public getInstruction(opcode: number): InstructionInfo | undefined {
    return OPCODE_TABLE[opcode];
  }

  /**
   * 모든 명령어 정보 반환 (디버깅용)
   */
  public getAllInstructions(): OpcodeMap {
    return OPCODE_TABLE;
  }

  /**
   * 명령어 실행 내부 로직
   */
  private executeInstruction(instruction: InstructionInfo): void {
    const { mnemonic, addressingMode } = instruction;

    switch (mnemonic) {
      // === 로드/저장 명령어 ===
      case 'LDA': this.lda(addressingMode); break;
      case 'LDX': this.ldx(addressingMode); break;
      case 'LDY': this.ldy(addressingMode); break;
      case 'STA': this.sta(addressingMode); break;
      case 'STX': this.stx(addressingMode); break;
      case 'STY': this.sty(addressingMode); break;

      // === 산술 명령어 ===
      case 'ADC': this.adc(addressingMode); break;
      case 'SBC': this.sbc(addressingMode); break;

      // === 논리 명령어 ===
      case 'AND': this.and(addressingMode); break;
      case 'ORA': this.ora(addressingMode); break;
      case 'EOR': this.eor(addressingMode); break;

      // === 비교 명령어 ===
      case 'CMP': this.cmp(addressingMode); break;
      case 'CPX': this.cpx(addressingMode); break;
      case 'CPY': this.cpy(addressingMode); break;

      // === 증감 명령어 ===
      case 'INC': this.inc(addressingMode); break;
      case 'DEC': this.dec(addressingMode); break;
      case 'INX': this.inx(); break;
      case 'DEX': this.dex(); break;
      case 'INY': this.iny(); break;
      case 'DEY': this.dey(); break;

      // === 시프트/회전 명령어 ===
      case 'ASL': this.asl(addressingMode); break;
      case 'LSR': this.lsr(addressingMode); break;
      case 'ROL': this.rol(addressingMode); break;
      case 'ROR': this.ror(addressingMode); break;

      // === 분기 명령어 ===
      case 'BCC': this.bcc(); break;
      case 'BCS': this.bcs(); break;
      case 'BEQ': this.beq(); break;
      case 'BMI': this.bmi(); break;
      case 'BNE': this.bne(); break;
      case 'BPL': this.bpl(); break;
      case 'BVC': this.bvc(); break;
      case 'BVS': this.bvs(); break;

      // === 점프/호출 명령어 ===
      case 'JMP': this.jmp(addressingMode); break;
      case 'JSR': this.jsr(); break;
      case 'RTS': this.rts(); break;
      case 'RTI': this.rti(); break;

      // === 스택 명령어 ===
      case 'PHA': this.pha(); break;
      case 'PHP': this.php(); break;
      case 'PLA': this.pla(); break;
      case 'PLP': this.plp(); break;

      // === 상태 플래그 명령어 ===
      case 'CLC': this.clc(); break;
      case 'CLD': this.cld(); break;
      case 'CLI': this.cli(); break;
      case 'CLV': this.clv(); break;
      case 'SEC': this.sec(); break;
      case 'SED': this.sed(); break;
      case 'SEI': this.sei(); break;

      // === 기타 명령어 ===
      case 'NOP': this.nop(); break;
      case 'BRK': this.brk(); break;

      // === 전송 명령어 ===
      case 'TAX': this.tax(); break;
      case 'TAY': this.tay(); break;
      case 'TXA': this.txa(); break;
      case 'TYA': this.tya(); break;
      case 'TSX': this.tsx(); break;
      case 'TXS': this.txs(); break;

      // === 비트 테스트 명령어 ===
      case 'BIT': this.bit(addressingMode); break;

      default:
        throw new CPUError(`Unimplemented instruction: ${mnemonic}`, 'UNIMPLEMENTED_INSTRUCTION');
    }
  }

  /**
   * 추가 사이클이 필요한지 확인
   */
  private needsExtraCycle(instruction: InstructionInfo): boolean {
    const { addressingMode } = instruction;
    
    // 페이지 경계를 넘는 인덱싱 모드에서 추가 사이클 발생
    if (addressingMode === 'ABSOLUTE_X' || addressingMode === 'ABSOLUTE_Y' || 
        addressingMode === 'INDIRECT_INDEXED') {
      // 실제 페이지 경계 확인은 AddressingModes 클래스에서 처리
      return this.cpu.addressing.getExtraCycles(addressingMode) > 0;
    }

    return false;
  }

  // =================================================================
  // 로드/저장 명령어 구현
  // =================================================================

  /**
   * LDA - Load Accumulator
   * 메모리에서 누산기로 값 로드
   */
  private lda(mode: AddressingMode): void {
    const value = this.cpu.addressing.getOperandValue(mode);
    this.cpu.setRegisterA(value);
    this.cpu.setFlag('Z', value === 0);
    this.cpu.setFlag('N', (value & 0x80) !== 0);
  }

  /**
   * LDX - Load X Register
   * 메모리에서 X 레지스터로 값 로드
   */
  private ldx(mode: AddressingMode): void {
    const value = this.cpu.addressing.getOperandValue(mode);
    this.cpu.setRegisterX(value);
    this.cpu.setFlag('Z', value === 0);
    this.cpu.setFlag('N', (value & 0x80) !== 0);
  }

  /**
   * LDY - Load Y Register
   * 메모리에서 Y 레지스터로 값 로드
   */
  private ldy(mode: AddressingMode): void {
    const value = this.cpu.addressing.getOperandValue(mode);
    this.cpu.setRegisterY(value);
    this.cpu.setFlag('Z', value === 0);
    this.cpu.setFlag('N', (value & 0x80) !== 0);
  }

  /**
   * STA - Store Accumulator
   * 누산기 값을 메모리에 저장
   */
  private sta(mode: AddressingMode): void {
    this.cpu.addressing.setOperandValue(mode, this.cpu.registers.A);
  }

  /**
   * STX - Store X Register
   * X 레지스터 값을 메모리에 저장
   */
  private stx(mode: AddressingMode): void {
    this.cpu.addressing.setOperandValue(mode, this.cpu.registers.X);
  }

  /**
   * STY - Store Y Register
   * Y 레지스터 값을 메모리에 저장
   */
  private sty(mode: AddressingMode): void {
    this.cpu.addressing.setOperandValue(mode, this.cpu.registers.Y);
  }

  // =================================================================
  // 산술 명령어 구현
  // =================================================================

  /**
   * ADC - Add with Carry
   * 캐리가 포함된 덧셈
   */
  private adc(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const accumulator = this.cpu.registers.A;
    const carry = this.cpu.getFlag('C') ? 1 : 0;
    
    const result = accumulator + operand + carry;
    
    // 플래그 설정
    this.cpu.setFlag('C', result > 0xFF);
    this.cpu.setFlag('Z', (result & 0xFF) === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
    
    // 오버플로우 플래그: 부호가 같은 두 수를 더했는데 결과 부호가 다르면 오버플로우
    this.cpu.setFlag('V', ((accumulator ^ result) & (operand ^ result) & 0x80) !== 0);
    
    this.cpu.setRegisterA(result & 0xFF);
  }

  /**
   * SBC - Subtract with Carry
   * 캐리가 포함된 뺄셈
   */
  private sbc(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const accumulator = this.cpu.registers.A;
    const carry = this.cpu.getFlag('C') ? 0 : 1; // SBC에서는 캐리가 반대로 동작
    
    const result = accumulator - operand - carry;
    
    // 플래그 설정
    this.cpu.setFlag('C', result >= 0);
    this.cpu.setFlag('Z', (result & 0xFF) === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
    
    // 오버플로우 플래그
    this.cpu.setFlag('V', ((accumulator ^ operand) & (accumulator ^ result) & 0x80) !== 0);
    
    this.cpu.setRegisterA(result & 0xFF);
  }

  // =================================================================
  // 논리 명령어 구현
  // =================================================================

  /**
   * AND - Logical AND
   * 누산기와 메모리 값의 논리곱
   */
  private and(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const result = this.cpu.registers.A & operand;
    
    this.cpu.setRegisterA(result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * ORA - Logical OR
   * 누산기와 메모리 값의 논리합
   */
  private ora(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const result = this.cpu.registers.A | operand;
    
    this.cpu.setRegisterA(result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * EOR - Exclusive OR
   * 누산기와 메모리 값의 배타적 논리합
   */
  private eor(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const result = this.cpu.registers.A ^ operand;
    
    this.cpu.setRegisterA(result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  // =================================================================
  // 비교 명령어 구현
  // =================================================================

  /**
   * CMP - Compare Accumulator
   * 누산기와 메모리 값 비교
   */
  private cmp(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const result = this.cpu.registers.A - operand;
    
    this.cpu.setFlag('C', this.cpu.registers.A >= operand);
    this.cpu.setFlag('Z', (result & 0xFF) === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * CPX - Compare X Register
   * X 레지스터와 메모리 값 비교
   */
  private cpx(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const result = this.cpu.registers.X - operand;
    
    this.cpu.setFlag('C', this.cpu.registers.X >= operand);
    this.cpu.setFlag('Z', (result & 0xFF) === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * CPY - Compare Y Register
   * Y 레지스터와 메모리 값 비교
   */
  private cpy(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const result = this.cpu.registers.Y - operand;
    
    this.cpu.setFlag('C', this.cpu.registers.Y >= operand);
    this.cpu.setFlag('Z', (result & 0xFF) === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  // =================================================================
  // 증감 명령어 구현
  // =================================================================

  /**
   * INC - Increment Memory
   * 메모리 값 1 증가
   */
  private inc(mode: AddressingMode): void {
    const address = this.cpu.addressing.getOperandAddress(mode);
    const value = this.cpu.readByte(address);
    const result = (value + 1) & 0xFF;
    
    this.cpu.writeByte(address, result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * DEC - Decrement Memory
   * 메모리 값 1 감소
   */
  private dec(mode: AddressingMode): void {
    const address = this.cpu.addressing.getOperandAddress(mode);
    const value = this.cpu.readByte(address);
    const result = (value - 1) & 0xFF;
    
    this.cpu.writeByte(address, result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * INX - Increment X Register
   * X 레지스터 1 증가
   */
  private inx(): void {
    const result = (this.cpu.registers.X + 1) & 0xFF;
    this.cpu.setRegisterX(result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * DEX - Decrement X Register
   * X 레지스터 1 감소
   */
  private dex(): void {
    const result = (this.cpu.registers.X - 1) & 0xFF;
    this.cpu.setRegisterX(result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * INY - Increment Y Register
   * Y 레지스터 1 증가
   */
  private iny(): void {
    const result = (this.cpu.registers.Y + 1) & 0xFF;
    this.cpu.setRegisterY(result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  /**
   * DEY - Decrement Y Register
   * Y 레지스터 1 감소
   */
  private dey(): void {
    const result = (this.cpu.registers.Y - 1) & 0xFF;
    this.cpu.setRegisterY(result);
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('N', (result & 0x80) !== 0);
  }

  // =================================================================
  // 시프트/회전 명령어 구현
  // =================================================================

  /**
   * ASL - Arithmetic Shift Left
   * 왼쪽 산술 시프트
   */
  private asl(mode: AddressingMode): void {
    if (mode === 'ACCUMULATOR') {
      const value = this.cpu.registers.A;
      const result = (value << 1) & 0xFF;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag('C', (value & 0x80) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', (result & 0x80) !== 0);
    } else {
      const address = this.cpu.addressing.getOperandAddress(mode);
      const value = this.cpu.readByte(address);
      const result = (value << 1) & 0xFF;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag('C', (value & 0x80) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', (result & 0x80) !== 0);
    }
  }

  /**
   * LSR - Logical Shift Right
   * 오른쪽 논리 시프트
   */
  private lsr(mode: AddressingMode): void {
    if (mode === 'ACCUMULATOR') {
      const value = this.cpu.registers.A;
      const result = value >> 1;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag('C', (value & 0x01) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', false); // 0이 들어오므로 항상 양수
    } else {
      const address = this.cpu.addressing.getOperandAddress(mode);
      const value = this.cpu.readByte(address);
      const result = value >> 1;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag('C', (value & 0x01) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', false);
    }
  }

  /**
   * ROL - Rotate Left
   * 왼쪽 회전 (캐리를 통한 9비트 회전)
   */
  private rol(mode: AddressingMode): void {
    if (mode === 'ACCUMULATOR') {
      const value = this.cpu.registers.A;
      const carry = this.cpu.getFlag('C') ? 1 : 0;
      const result = ((value << 1) | carry) & 0xFF;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag('C', (value & 0x80) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', (result & 0x80) !== 0);
    } else {
      const address = this.cpu.addressing.getOperandAddress(mode);
      const value = this.cpu.readByte(address);
      const carry = this.cpu.getFlag('C') ? 1 : 0;
      const result = ((value << 1) | carry) & 0xFF;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag('C', (value & 0x80) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', (result & 0x80) !== 0);
    }
  }

  /**
   * ROR - Rotate Right
   * 오른쪽 회전 (캐리를 통한 9비트 회전)
   */
  private ror(mode: AddressingMode): void {
    if (mode === 'ACCUMULATOR') {
      const value = this.cpu.registers.A;
      const carry = this.cpu.getFlag('C') ? 0x80 : 0;
      const result = (value >> 1) | carry;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag('C', (value & 0x01) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', (result & 0x80) !== 0);
    } else {
      const address = this.cpu.addressing.getOperandAddress(mode);
      const value = this.cpu.readByte(address);
      const carry = this.cpu.getFlag('C') ? 0x80 : 0;
      const result = (value >> 1) | carry;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag('C', (value & 0x01) !== 0);
      this.cpu.setFlag('Z', result === 0);
      this.cpu.setFlag('N', (result & 0x80) !== 0);
    }
  }

  // =================================================================
  // 분기 명령어 구현
  // =================================================================

  /**
   * 분기 명령어 공통 로직
   */
  private branch(condition: boolean): void {
    if (condition) {
      const address = this.cpu.addressing.getOperandAddress('RELATIVE');
      this.cpu.setRegisterPC(address);
      
      // 분기가 발생하면 추가 사이클이 필요할 수 있음
      // (페이지 경계를 넘으면 +1 사이클)
    }
  }

  private bcc(): void { this.branch(!this.cpu.getFlag('C')); } // Branch if Carry Clear
  private bcs(): void { this.branch(this.cpu.getFlag('C')); }  // Branch if Carry Set
  private beq(): void { this.branch(this.cpu.getFlag('Z')); }  // Branch if Equal
  private bmi(): void { this.branch(this.cpu.getFlag('N')); }  // Branch if Minus
  private bne(): void { this.branch(!this.cpu.getFlag('Z')); } // Branch if Not Equal
  private bpl(): void { this.branch(!this.cpu.getFlag('N')); } // Branch if Plus
  private bvc(): void { this.branch(!this.cpu.getFlag('V')); } // Branch if Overflow Clear
  private bvs(): void { this.branch(this.cpu.getFlag('V')); }  // Branch if Overflow Set

  // =================================================================
  // 점프/호출 명령어 구현
  // =================================================================

  /**
   * JMP - Jump
   * 무조건 점프
   */
  private jmp(mode: AddressingMode): void {
    const address = this.cpu.addressing.getOperandAddress(mode);
    this.cpu.setRegisterPC(address);
  }

  /**
   * JSR - Jump to Subroutine
   * 서브루틴 호출
   */
  private jsr(): void {
    // 현재 PC-1을 스택에 저장 (RTS에서 올바른 위치로 돌아가기 위해)
    const returnAddress = this.cpu.registers.PC - 1;
    this.cpu.pushWord(returnAddress);
    
    // 새 주소로 점프
    const address = this.cpu.addressing.getOperandAddress('ABSOLUTE');
    this.cpu.setRegisterPC(address);
  }

  /**
   * RTS - Return from Subroutine
   * 서브루틴에서 복귀
   */
  private rts(): void {
    const returnAddress = this.cpu.pullWord();
    this.cpu.setRegisterPC((returnAddress + 1) & 0xFFFF);
  }

  /**
   * RTI - Return from Interrupt
   * 인터럽트에서 복귀
   */
  private rti(): void {
    // 상태 레지스터 복원
    const status = this.cpu.pullByte();
    this.cpu.setRegisterP(status);
    
    // PC 복원
    const returnAddress = this.cpu.pullWord();
    this.cpu.setRegisterPC(returnAddress);
  }

  // =================================================================
  // 스택 명령어 구현
  // =================================================================

  private pha(): void { this.cpu.pushByte(this.cpu.registers.A); }    // Push Accumulator
  private php(): void { this.cpu.pushByte(this.cpu.registers.P | 0x30); } // Push Processor Status
  private pla(): void { 
    const value = this.cpu.pullByte();
    this.cpu.setRegisterA(value);
    this.cpu.setFlag('Z', value === 0);
    this.cpu.setFlag('N', (value & 0x80) !== 0);
  }
  private plp(): void { this.cpu.setRegisterP(this.cpu.pullByte()); } // Pull Processor Status

  // =================================================================
  // 상태 플래그 명령어 구현
  // =================================================================

  private clc(): void { this.cpu.setFlag('C', false); } // Clear Carry
  private cld(): void { this.cpu.setFlag('D', false); } // Clear Decimal
  private cli(): void { this.cpu.setFlag('I', false); } // Clear Interrupt
  private clv(): void { this.cpu.setFlag('V', false); } // Clear Overflow
  private sec(): void { this.cpu.setFlag('C', true); }  // Set Carry
  private sed(): void { this.cpu.setFlag('D', true); }  // Set Decimal
  private sei(): void { this.cpu.setFlag('I', true); }  // Set Interrupt

  // =================================================================
  // 전송 명령어 구현
  // =================================================================

  private tax(): void { 
    this.cpu.setRegisterX(this.cpu.registers.A);
    this.cpu.setFlag('Z', this.cpu.registers.A === 0);
    this.cpu.setFlag('N', (this.cpu.registers.A & 0x80) !== 0);
  }

  private tay(): void {
    this.cpu.setRegisterY(this.cpu.registers.A);
    this.cpu.setFlag('Z', this.cpu.registers.A === 0);
    this.cpu.setFlag('N', (this.cpu.registers.A & 0x80) !== 0);
  }

  private txa(): void {
    this.cpu.setRegisterA(this.cpu.registers.X);
    this.cpu.setFlag('Z', this.cpu.registers.X === 0);
    this.cpu.setFlag('N', (this.cpu.registers.X & 0x80) !== 0);
  }

  private tya(): void {
    this.cpu.setRegisterA(this.cpu.registers.Y);
    this.cpu.setFlag('Z', this.cpu.registers.Y === 0);
    this.cpu.setFlag('N', (this.cpu.registers.Y & 0x80) !== 0);
  }

  private tsx(): void {
    this.cpu.setRegisterX(this.cpu.registers.SP);
    this.cpu.setFlag('Z', this.cpu.registers.SP === 0);
    this.cpu.setFlag('N', (this.cpu.registers.SP & 0x80) !== 0);
  }

  private txs(): void {
    this.cpu.setRegisterSP(this.cpu.registers.X);
  }

  // =================================================================
  // 기타 명령어 구현
  // =================================================================

  /**
   * BIT - Bit Test
   * 메모리와 누산기의 비트 테스트
   */
  private bit(mode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(mode);
    const result = this.cpu.registers.A & operand;
    
    this.cpu.setFlag('Z', result === 0);
    this.cpu.setFlag('V', (operand & 0x40) !== 0); // 비트 6
    this.cpu.setFlag('N', (operand & 0x80) !== 0); // 비트 7
  }

  /**
   * NOP - No Operation
   * 아무것도 하지 않음
   */
  private nop(): void {
    // 아무것도 하지 않음
  }

  /**
   * BRK - Break
   * 소프트웨어 인터럽트
   */
  private brk(): void {
    // PC+2를 스택에 저장 (BRK는 2바이트 명령어)
    this.cpu.pushWord(this.cpu.registers.PC + 1);
    
    // 상태 레지스터를 스택에 저장 (B 플래그 설정)
    this.cpu.pushByte(this.cpu.registers.P | 0x30);
    
    // 인터럽트 비활성화
    this.cpu.setFlag('I', true);
    
    // IRQ/BRK 벡터로 점프
    this.cpu.setRegisterPC(this.cpu.readWord(0xFFFE));
  }
}

/**
 * 6502 명령어 테이블
 * 
 * 각 바이트코드(0x00-0xFF)에 대응하는 명령어 정보를 정의합니다.
 * 
 * 주요 필드:
 * - mnemonic: 명령어 이름 (예: 'LDA', 'STA')
 * - addressingMode: 주소 지정 모드
 * - operandBytes: 피연산자 바이트 수
 * - cycles: 기본 실행 사이클
 * - extraCycles: 페이지 경계 등에서 추가 사이클 발생 여부
 */
const OPCODE_TABLE: OpcodeMap = {
  // BRK
  0x00: { mnemonic: 'BRK', addressingMode: 'IMPLIED', operandBytes: 1, cycles: 7, extraCycles: false },
  
  // ORA
  0x01: { mnemonic: 'ORA', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0x05: { mnemonic: 'ORA', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x06: { mnemonic: 'ASL', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 5, extraCycles: false },
  0x08: { mnemonic: 'PHP', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 3, extraCycles: false },
  0x09: { mnemonic: 'ORA', addressingMode: 'IMMEDIATE', operandBytes: 1, cycles: 2, extraCycles: false },
  0x0A: { mnemonic: 'ASL', addressingMode: 'ACCUMULATOR', operandBytes: 0, cycles: 2, extraCycles: false },
  0x0D: { mnemonic: 'ORA', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x0E: { mnemonic: 'ASL', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 6, extraCycles: false },
  
  // BPL
  0x10: { mnemonic: 'BPL', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x11: { mnemonic: 'ORA', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x15: { mnemonic: 'ORA', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x16: { mnemonic: 'ASL', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x18: { mnemonic: 'CLC', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x19: { mnemonic: 'ORA', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x1D: { mnemonic: 'ORA', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x1E: { mnemonic: 'ASL', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },
  
  // JSR
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
  
  // BMI
  0x30: { mnemonic: 'BMI', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x31: { mnemonic: 'AND', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x35: { mnemonic: 'AND', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x36: { mnemonic: 'ROL', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x38: { mnemonic: 'SEC', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x39: { mnemonic: 'AND', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x3D: { mnemonic: 'AND', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x3E: { mnemonic: 'ROL', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },
  
  // RTI
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
  
  // BVC
  0x50: { mnemonic: 'BVC', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x51: { mnemonic: 'EOR', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x55: { mnemonic: 'EOR', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x56: { mnemonic: 'LSR', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x58: { mnemonic: 'CLI', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x59: { mnemonic: 'EOR', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x5D: { mnemonic: 'EOR', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x5E: { mnemonic: 'LSR', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },
  
  // RTS
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
  
  // BVS
  0x70: { mnemonic: 'BVS', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x71: { mnemonic: 'ADC', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0x75: { mnemonic: 'ADC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x76: { mnemonic: 'ROR', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0x78: { mnemonic: 'SEI', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x79: { mnemonic: 'ADC', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0x7D: { mnemonic: 'ADC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0x7E: { mnemonic: 'ROR', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },
  
  // STA
  0x81: { mnemonic: 'STA', addressingMode: 'INDEXED_INDIRECT', operandBytes: 1, cycles: 6, extraCycles: false },
  0x84: { mnemonic: 'STY', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x85: { mnemonic: 'STA', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x86: { mnemonic: 'STX', addressingMode: 'ZERO_PAGE', operandBytes: 1, cycles: 3, extraCycles: false },
  0x88: { mnemonic: 'DEY', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x8A: { mnemonic: 'TXA', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x8C: { mnemonic: 'STY', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x8D: { mnemonic: 'STA', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  0x8E: { mnemonic: 'STX', addressingMode: 'ABSOLUTE', operandBytes: 2, cycles: 4, extraCycles: false },
  
  // BCC
  0x90: { mnemonic: 'BCC', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0x91: { mnemonic: 'STA', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 6, extraCycles: false },
  0x94: { mnemonic: 'STY', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x95: { mnemonic: 'STA', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0x96: { mnemonic: 'STX', addressingMode: 'ZERO_PAGE_Y', operandBytes: 1, cycles: 4, extraCycles: false },
  0x98: { mnemonic: 'TYA', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x99: { mnemonic: 'STA', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 5, extraCycles: false },
  0x9A: { mnemonic: 'TXS', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0x9D: { mnemonic: 'STA', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 5, extraCycles: false },
  
  // LDY
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
  
  // BCS
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
  
  // CPY
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
  
  // BNE
  0xD0: { mnemonic: 'BNE', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0xD1: { mnemonic: 'CMP', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0xD5: { mnemonic: 'CMP', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0xD6: { mnemonic: 'DEC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0xD8: { mnemonic: 'CLD', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xD9: { mnemonic: 'CMP', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0xDD: { mnemonic: 'CMP', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0xDE: { mnemonic: 'DEC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false },
  
  // CPX
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
  
  // BEQ
  0xF0: { mnemonic: 'BEQ', addressingMode: 'RELATIVE', operandBytes: 1, cycles: 2, extraCycles: true },
  0xF1: { mnemonic: 'SBC', addressingMode: 'INDIRECT_INDEXED', operandBytes: 1, cycles: 5, extraCycles: true },
  0xF5: { mnemonic: 'SBC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 4, extraCycles: false },
  0xF6: { mnemonic: 'INC', addressingMode: 'ZERO_PAGE_X', operandBytes: 1, cycles: 6, extraCycles: false },
  0xF8: { mnemonic: 'SED', addressingMode: 'IMPLIED', operandBytes: 0, cycles: 2, extraCycles: false },
  0xF9: { mnemonic: 'SBC', addressingMode: 'ABSOLUTE_Y', operandBytes: 2, cycles: 4, extraCycles: true },
  0xFD: { mnemonic: 'SBC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 4, extraCycles: true },
  0xFE: { mnemonic: 'INC', addressingMode: 'ABSOLUTE_X', operandBytes: 2, cycles: 7, extraCycles: false }
};