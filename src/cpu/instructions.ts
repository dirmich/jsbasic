import type { InstructionInfo, OpcodeMap, OpcodeTableEntry } from '@/types/cpu';
import { AddressingMode, CPUFlag } from '@/types/cpu';
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
  public getInstruction(opcode: number): OpcodeTableEntry | undefined {
    return OPCODE_TABLE[opcode];
  }

  /**
   * 모든 명령어 정보 반환 (디버깅용)
   */
  public getAllInstructions(): Record<number, OpcodeTableEntry> {
    return OPCODE_TABLE;
  }

  /**
   * 명령어 실행 내부 로직
   */
  private executeInstruction(instruction: OpcodeTableEntry): void {
    const { mnemonic, addressingMode } = instruction;
    const mode = addressingMode || AddressingMode.IMPLIED;

    switch (mnemonic) {
      // === 로드/저장 명령어 ===
      case 'LDA': this.lda(mode); break;
      case 'LDX': this.ldx(mode); break;
      case 'LDY': this.ldy(mode); break;
      case 'STA': this.sta(mode); break;
      case 'STX': this.stx(mode); break;
      case 'STY': this.sty(mode); break;

      // === 산술 명령어 ===
      case 'ADC': this.adc(mode); break;
      case 'SBC': this.sbc(mode); break;

      // === 논리 명령어 ===
      case 'AND': this.and(mode); break;
      case 'ORA': this.ora(mode); break;
      case 'EOR': this.eor(mode); break;

      // === 비교 명령어 ===
      case 'CMP': this.cmp(mode); break;
      case 'CPX': this.cpx(mode); break;
      case 'CPY': this.cpy(mode); break;

      // === 증감 명령어 ===
      case 'INC': this.inc(mode); break;
      case 'DEC': this.dec(mode); break;
      case 'INX': this.inx(); break;
      case 'DEX': this.dex(); break;
      case 'INY': this.iny(); break;
      case 'DEY': this.dey(); break;

      // === 시프트/회전 명령어 ===
      case 'ASL': this.asl(mode); break;
      case 'LSR': this.lsr(mode); break;
      case 'ROL': this.rol(mode); break;
      case 'ROR': this.ror(mode); break;

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
      case 'JMP': this.jmp(mode); break;
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
      case 'BIT': this.bit(mode); break;

      default:
        throw new CPUError(`Unimplemented instruction: ${mnemonic}`, 'UNIMPLEMENTED_INSTRUCTION');
    }
  }

  /**
   * 추가 사이클이 필요한지 확인
   */
  private needsExtraCycle(instruction: OpcodeTableEntry): boolean {
    const mode = instruction.addressingMode;
    
    // 페이지 경계를 넘는 인덱싱 모드에서 추가 사이클 발생
    if (mode === AddressingMode.ABSOLUTE_X || mode === AddressingMode.ABSOLUTE_Y || 
        mode === AddressingMode.INDIRECT_INDEXED) {
      // 실제 페이지 경계 확인은 AddressingModes 클래스에서 처리
      return this.cpu.addressing.getExtraCycles(mode) > 0;
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
  private lda(addressingMode: AddressingMode): void {
    const value = this.cpu.addressing.getOperandValue(addressingMode);
    this.cpu.setRegisterA(value);
    this.cpu.setFlag(CPUFlag.ZERO, value === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (value & 0x80) !== 0);
  }

  /**
   * LDX - Load X Register
   * 메모리에서 X 레지스터로 값 로드
   */
  private ldx(addressingMode: AddressingMode): void {
    const value = this.cpu.addressing.getOperandValue(addressingMode);
    this.cpu.setRegisterX(value);
    this.cpu.setFlag(CPUFlag.ZERO, value === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (value & 0x80) !== 0);
  }

  /**
   * LDY - Load Y Register
   * 메모리에서 Y 레지스터로 값 로드
   */
  private ldy(addressingMode: AddressingMode): void {
    const value = this.cpu.addressing.getOperandValue(addressingMode);
    this.cpu.setRegisterY(value);
    this.cpu.setFlag(CPUFlag.ZERO, value === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (value & 0x80) !== 0);
  }

  /**
   * STA - Store Accumulator
   * 누산기 값을 메모리에 저장
   */
  private sta(addressingMode: AddressingMode): void {
    this.cpu.addressing.setOperandValue(addressingMode, this.cpu.registers.A);
  }

  /**
   * STX - Store X Register
   * X 레지스터 값을 메모리에 저장
   */
  private stx(addressingMode: AddressingMode): void {
    this.cpu.addressing.setOperandValue(addressingMode, this.cpu.registers.X);
  }

  /**
   * STY - Store Y Register
   * Y 레지스터 값을 메모리에 저장
   */
  private sty(addressingMode: AddressingMode): void {
    this.cpu.addressing.setOperandValue(addressingMode, this.cpu.registers.Y);
  }

  // =================================================================
  // 산술 명령어 구현
  // =================================================================

  /**
   * ADC - Add with Carry
   * 캐리가 포함된 덧셈
   */
  private adc(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const accumulator = this.cpu.registers.A;
    const carry = this.cpu.getFlag(CPUFlag.CARRY) ? 1 : 0;
    
    const result = accumulator + operand + carry;
    
    // 플래그 설정
    this.cpu.setFlag(CPUFlag.CARRY, result > 0xFF);
    this.cpu.setFlag(CPUFlag.ZERO, (result & 0xFF) === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
    
    // 오버플로우 플래그: 부호가 같은 두 수를 더했는데 결과 부호가 다르면 오버플로우
    this.cpu.setFlag(CPUFlag.OVERFLOW, ((accumulator ^ result) & (operand ^ result) & 0x80) !== 0);
    
    this.cpu.setRegisterA(result & 0xFF);
  }

  /**
   * SBC - Subtract with Carry
   * 캐리가 포함된 뺄셈
   */
  private sbc(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const accumulator = this.cpu.registers.A;
    const carry = this.cpu.getFlag(CPUFlag.CARRY) ? 0 : 1; // SBC에서는 캐리가 반대로 동작
    
    const result = accumulator - operand - carry;
    
    // 플래그 설정
    this.cpu.setFlag(CPUFlag.CARRY, result >= 0);
    this.cpu.setFlag(CPUFlag.ZERO, (result & 0xFF) === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
    
    // 오버플로우 플래그
    this.cpu.setFlag(CPUFlag.OVERFLOW, ((accumulator ^ operand) & (accumulator ^ result) & 0x80) !== 0);
    
    this.cpu.setRegisterA(result & 0xFF);
  }

  // =================================================================
  // 논리 명령어 구현
  // =================================================================

  /**
   * AND - Logical AND
   * 누산기와 메모리 값의 논리곱
   */
  private and(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const result = this.cpu.registers.A & operand;
    
    this.cpu.setRegisterA(result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * ORA - Logical OR
   * 누산기와 메모리 값의 논리합
   */
  private ora(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const result = this.cpu.registers.A | operand;
    
    this.cpu.setRegisterA(result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * EOR - Exclusive OR
   * 누산기와 메모리 값의 배타적 논리합
   */
  private eor(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const result = this.cpu.registers.A ^ operand;
    
    this.cpu.setRegisterA(result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  // =================================================================
  // 비교 명령어 구현
  // =================================================================

  /**
   * CMP - Compare Accumulator
   * 누산기와 메모리 값 비교
   */
  private cmp(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const result = this.cpu.registers.A - operand;
    
    this.cpu.setFlag(CPUFlag.CARRY, this.cpu.registers.A >= operand);
    this.cpu.setFlag(CPUFlag.ZERO, (result & 0xFF) === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * CPX - Compare X Register
   * X 레지스터와 메모리 값 비교
   */
  private cpx(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const result = this.cpu.registers.X - operand;
    
    this.cpu.setFlag(CPUFlag.CARRY, this.cpu.registers.X >= operand);
    this.cpu.setFlag(CPUFlag.ZERO, (result & 0xFF) === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * CPY - Compare Y Register
   * Y 레지스터와 메모리 값 비교
   */
  private cpy(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const result = this.cpu.registers.Y - operand;
    
    this.cpu.setFlag(CPUFlag.CARRY, this.cpu.registers.Y >= operand);
    this.cpu.setFlag(CPUFlag.ZERO, (result & 0xFF) === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  // =================================================================
  // 증감 명령어 구현
  // =================================================================

  /**
   * INC - Increment Memory
   * 메모리 값 1 증가
   */
  private inc(addressingMode: AddressingMode): void {
    const address = this.cpu.addressing.getOperandAddress(addressingMode);
    const value = this.cpu.readByte(address);
    const result = (value + 1) & 0xFF;
    
    this.cpu.writeByte(address, result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * DEC - Decrement Memory
   * 메모리 값 1 감소
   */
  private dec(addressingMode: AddressingMode): void {
    const address = this.cpu.addressing.getOperandAddress(addressingMode);
    const value = this.cpu.readByte(address);
    const result = (value - 1) & 0xFF;
    
    this.cpu.writeByte(address, result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * INX - Increment X Register
   * X 레지스터 1 증가
   */
  private inx(): void {
    const result = (this.cpu.registers.X + 1) & 0xFF;
    this.cpu.setRegisterX(result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * DEX - Decrement X Register
   * X 레지스터 1 감소
   */
  private dex(): void {
    const result = (this.cpu.registers.X - 1) & 0xFF;
    this.cpu.setRegisterX(result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * INY - Increment Y Register
   * Y 레지스터 1 증가
   */
  private iny(): void {
    const result = (this.cpu.registers.Y + 1) & 0xFF;
    this.cpu.setRegisterY(result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  /**
   * DEY - Decrement Y Register
   * Y 레지스터 1 감소
   */
  private dey(): void {
    const result = (this.cpu.registers.Y - 1) & 0xFF;
    this.cpu.setRegisterY(result);
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
  }

  // =================================================================
  // 시프트/회전 명령어 구현
  // =================================================================

  /**
   * ASL - Arithmetic Shift Left
   * 왼쪽 산술 시프트
   */
  private asl(addressingMode: AddressingMode): void {
    if (addressingMode === AddressingMode.ACCUMULATOR) {
      const value = this.cpu.registers.A;
      const result = (value << 1) & 0xFF;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x80) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
    } else {
      const address = this.cpu.addressing.getOperandAddress(addressingMode);
      const value = this.cpu.readByte(address);
      const result = (value << 1) & 0xFF;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x80) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
    }
  }

  /**
   * LSR - Logical Shift Right
   * 오른쪽 논리 시프트
   */
  private lsr(addressingMode: AddressingMode): void {
    if (addressingMode === AddressingMode.ACCUMULATOR) {
      const value = this.cpu.registers.A;
      const result = value >> 1;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x01) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, false); // 0이 들어오므로 항상 양수
    } else {
      const address = this.cpu.addressing.getOperandAddress(addressingMode);
      const value = this.cpu.readByte(address);
      const result = value >> 1;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x01) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, false);
    }
  }

  /**
   * ROL - Rotate Left
   * 왼쪽 회전 (캐리를 통한 9비트 회전)
   */
  private rol(addressingMode: AddressingMode): void {
    if (addressingMode === AddressingMode.ACCUMULATOR) {
      const value = this.cpu.registers.A;
      const carry = this.cpu.getFlag(CPUFlag.CARRY) ? 1 : 0;
      const result = ((value << 1) | carry) & 0xFF;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x80) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
    } else {
      const address = this.cpu.addressing.getOperandAddress(addressingMode);
      const value = this.cpu.readByte(address);
      const carry = this.cpu.getFlag(CPUFlag.CARRY) ? 1 : 0;
      const result = ((value << 1) | carry) & 0xFF;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x80) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
    }
  }

  /**
   * ROR - Rotate Right
   * 오른쪽 회전 (캐리를 통한 9비트 회전)
   */
  private ror(addressingMode: AddressingMode): void {
    if (addressingMode === AddressingMode.ACCUMULATOR) {
      const value = this.cpu.registers.A;
      const carry = this.cpu.getFlag(CPUFlag.CARRY) ? 0x80 : 0;
      const result = (value >> 1) | carry;
      
      this.cpu.setRegisterA(result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x01) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
    } else {
      const address = this.cpu.addressing.getOperandAddress(addressingMode);
      const value = this.cpu.readByte(address);
      const carry = this.cpu.getFlag(CPUFlag.CARRY) ? 0x80 : 0;
      const result = (value >> 1) | carry;
      
      this.cpu.writeByte(address, result);
      this.cpu.setFlag(CPUFlag.CARRY, (value & 0x01) !== 0);
      this.cpu.setFlag(CPUFlag.ZERO, result === 0);
      this.cpu.setFlag(CPUFlag.NEGATIVE, (result & 0x80) !== 0);
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
      const address = this.cpu.addressing.getOperandAddress(AddressingMode.RELATIVE);
      this.cpu.setRegisterPC(address);
      
      // 분기가 발생하면 추가 사이클이 필요할 수 있음
      // (페이지 경계를 넘으면 +1 사이클)
    }
  }

  private bcc(): void { this.branch(!this.cpu.getFlag(CPUFlag.CARRY)); } // Branch if Carry Clear
  private bcs(): void { this.branch(this.cpu.getFlag(CPUFlag.CARRY)); }  // Branch if Carry Set
  private beq(): void { this.branch(this.cpu.getFlag(CPUFlag.ZERO)); }  // Branch if Equal
  private bmi(): void { this.branch(this.cpu.getFlag(CPUFlag.NEGATIVE)); }  // Branch if Minus
  private bne(): void { this.branch(!this.cpu.getFlag(CPUFlag.ZERO)); } // Branch if Not Equal
  private bpl(): void { this.branch(!this.cpu.getFlag(CPUFlag.NEGATIVE)); } // Branch if Plus
  private bvc(): void { this.branch(!this.cpu.getFlag(CPUFlag.OVERFLOW)); } // Branch if Overflow Clear
  private bvs(): void { this.branch(this.cpu.getFlag(CPUFlag.OVERFLOW)); }  // Branch if Overflow Set

  // =================================================================
  // 점프/호출 명령어 구현
  // =================================================================

  /**
   * JMP - Jump
   * 무조건 점프
   */
  private jmp(addressingMode: AddressingMode): void {
    const address = this.cpu.addressing.getOperandAddress(addressingMode);
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
    const address = this.cpu.addressing.getOperandAddress(AddressingMode.ABSOLUTE);
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
  private php(): void { this.cpu.pushByte(this.cpu.getRegisterP() | 0x30); } // Push Processor Status
  private pla(): void { 
    const value = this.cpu.pullByte();
    this.cpu.setRegisterA(value);
    this.cpu.setFlag(CPUFlag.ZERO, value === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (value & 0x80) !== 0);
  }
  private plp(): void { this.cpu.setRegisterP(this.cpu.pullByte()); } // Pull Processor Status

  // =================================================================
  // 상태 플래그 명령어 구현
  // =================================================================

  private clc(): void { this.cpu.setFlag(CPUFlag.CARRY, false); } // Clear Carry
  private cld(): void { this.cpu.setFlag(CPUFlag.DECIMAL, false); } // Clear Decimal
  private cli(): void { this.cpu.setFlag(CPUFlag.INTERRUPT, false); } // Clear Interrupt
  private clv(): void { this.cpu.setFlag(CPUFlag.OVERFLOW, false); } // Clear Overflow
  private sec(): void { this.cpu.setFlag(CPUFlag.CARRY, true); }  // Set Carry
  private sed(): void { this.cpu.setFlag(CPUFlag.DECIMAL, true); }  // Set Decimal
  private sei(): void { this.cpu.setFlag(CPUFlag.INTERRUPT, true); }  // Set Interrupt

  // =================================================================
  // 전송 명령어 구현
  // =================================================================

  private tax(): void { 
    this.cpu.setRegisterX(this.cpu.registers.A);
    this.cpu.setFlag(CPUFlag.ZERO, this.cpu.registers.A === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (this.cpu.registers.A & 0x80) !== 0);
  }

  private tay(): void {
    this.cpu.setRegisterY(this.cpu.registers.A);
    this.cpu.setFlag(CPUFlag.ZERO, this.cpu.registers.A === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (this.cpu.registers.A & 0x80) !== 0);
  }

  private txa(): void {
    this.cpu.setRegisterA(this.cpu.registers.X);
    this.cpu.setFlag(CPUFlag.ZERO, this.cpu.registers.X === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (this.cpu.registers.X & 0x80) !== 0);
  }

  private tya(): void {
    this.cpu.setRegisterA(this.cpu.registers.Y);
    this.cpu.setFlag(CPUFlag.ZERO, this.cpu.registers.Y === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (this.cpu.registers.Y & 0x80) !== 0);
  }

  private tsx(): void {
    this.cpu.setRegisterX(this.cpu.registers.SP);
    this.cpu.setFlag(CPUFlag.ZERO, this.cpu.registers.SP === 0);
    this.cpu.setFlag(CPUFlag.NEGATIVE, (this.cpu.registers.SP & 0x80) !== 0);
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
  private bit(addressingMode: AddressingMode): void {
    const operand = this.cpu.addressing.getOperandValue(addressingMode);
    const result = this.cpu.registers.A & operand;
    
    this.cpu.setFlag(CPUFlag.ZERO, result === 0);
    this.cpu.setFlag(CPUFlag.OVERFLOW, (operand & 0x40) !== 0); // 비트 6
    this.cpu.setFlag(CPUFlag.NEGATIVE, (operand & 0x80) !== 0); // 비트 7
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
    this.cpu.pushByte(this.cpu.getRegisterP() | 0x30);
    
    // 인터럽트 비활성화
    this.cpu.setFlag(CPUFlag.INTERRUPT, true);
    
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
 * - bytes: 피연산자 바이트 수
 * - cycles: 기본 실행 사이클
 * - extraCycles: 페이지 경계 등에서 추가 사이클 발생 여부
 */
const OPCODE_TABLE: Record<number, OpcodeTableEntry> = {
  // BRK
  0x00: { mnemonic: 'BRK', addressingMode: AddressingMode.IMPLIED, bytes: 1, cycles: 7, extraCycles: 0 },
  
  // ORA
  0x01: { mnemonic: 'ORA', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0x05: { mnemonic: 'ORA', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x06: { mnemonic: 'ASL', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0 },
  0x08: { mnemonic: 'PHP', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 3, extraCycles: 0 },
  0x09: { mnemonic: 'ORA', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0x0A: { mnemonic: 'ASL', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0 },
  0x0D: { mnemonic: 'ORA', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0x0E: { mnemonic: 'ASL', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0 },
  
  // BPL
  0x10: { mnemonic: 'BPL', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0x11: { mnemonic: 'ORA', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1 },
  0x15: { mnemonic: 'ORA', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0x16: { mnemonic: 'ASL', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0 },
  0x18: { mnemonic: 'CLC', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x19: { mnemonic: 'ORA', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  0x1D: { mnemonic: 'ORA', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0x1E: { mnemonic: 'ASL', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0 },
  
  // JSR
  0x20: { mnemonic: 'JSR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0 },
  0x21: { mnemonic: 'AND', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0x24: { mnemonic: 'BIT', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x25: { mnemonic: 'AND', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x26: { mnemonic: 'ROL', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0 },
  0x28: { mnemonic: 'PLP', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 4, extraCycles: 0 },
  0x29: { mnemonic: 'AND', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0x2A: { mnemonic: 'ROL', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0 },
  0x2C: { mnemonic: 'BIT', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0x2D: { mnemonic: 'AND', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0x2E: { mnemonic: 'ROL', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0 },
  
  // BMI
  0x30: { mnemonic: 'BMI', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0x31: { mnemonic: 'AND', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1 },
  0x35: { mnemonic: 'AND', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0x36: { mnemonic: 'ROL', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0 },
  0x38: { mnemonic: 'SEC', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x39: { mnemonic: 'AND', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  0x3D: { mnemonic: 'AND', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0x3E: { mnemonic: 'ROL', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0 },
  
  // RTI
  0x40: { mnemonic: 'RTI', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 6, extraCycles: 0 },
  0x41: { mnemonic: 'EOR', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0x45: { mnemonic: 'EOR', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x46: { mnemonic: 'LSR', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0 },
  0x48: { mnemonic: 'PHA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 3, extraCycles: 0 },
  0x49: { mnemonic: 'EOR', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0x4A: { mnemonic: 'LSR', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0 },
  0x4C: { mnemonic: 'JMP', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 3, extraCycles: 0 },
  0x4D: { mnemonic: 'EOR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0x4E: { mnemonic: 'LSR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0 },
  
  // BVC
  0x50: { mnemonic: 'BVC', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0x51: { mnemonic: 'EOR', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1 },
  0x55: { mnemonic: 'EOR', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0x56: { mnemonic: 'LSR', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0 },
  0x58: { mnemonic: 'CLI', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x59: { mnemonic: 'EOR', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  0x5D: { mnemonic: 'EOR', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0x5E: { mnemonic: 'LSR', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0 },
  
  // RTS
  0x60: { mnemonic: 'RTS', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 6, extraCycles: 0 },
  0x61: { mnemonic: 'ADC', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0x65: { mnemonic: 'ADC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x66: { mnemonic: 'ROR', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0 },
  0x68: { mnemonic: 'PLA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 4, extraCycles: 0 },
  0x69: { mnemonic: 'ADC', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0x6A: { mnemonic: 'ROR', addressingMode: AddressingMode.ACCUMULATOR, bytes: 0, cycles: 2, extraCycles: 0 },
  0x6C: { mnemonic: 'JMP', addressingMode: AddressingMode.INDIRECT, bytes: 2, cycles: 5, extraCycles: 0 },
  0x6D: { mnemonic: 'ADC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0x6E: { mnemonic: 'ROR', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0 },
  
  // BVS
  0x70: { mnemonic: 'BVS', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0x71: { mnemonic: 'ADC', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1 },
  0x75: { mnemonic: 'ADC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0x76: { mnemonic: 'ROR', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0 },
  0x78: { mnemonic: 'SEI', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x79: { mnemonic: 'ADC', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  0x7D: { mnemonic: 'ADC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0x7E: { mnemonic: 'ROR', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0 },
  
  // STA
  0x81: { mnemonic: 'STA', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0x84: { mnemonic: 'STY', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x85: { mnemonic: 'STA', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x86: { mnemonic: 'STX', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0x88: { mnemonic: 'DEY', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x8A: { mnemonic: 'TXA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x8C: { mnemonic: 'STY', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0x8D: { mnemonic: 'STA', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0x8E: { mnemonic: 'STX', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  
  // BCC
  0x90: { mnemonic: 'BCC', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0x91: { mnemonic: 'STA', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 6, extraCycles: 0 },
  0x94: { mnemonic: 'STY', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0x95: { mnemonic: 'STA', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0x96: { mnemonic: 'STX', addressingMode: AddressingMode.ZERO_PAGE_Y, bytes: 1, cycles: 4, extraCycles: 0 },
  0x98: { mnemonic: 'TYA', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x99: { mnemonic: 'STA', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 5, extraCycles: 0 },
  0x9A: { mnemonic: 'TXS', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0x9D: { mnemonic: 'STA', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 5, extraCycles: 0 },
  
  // LDY
  0xA0: { mnemonic: 'LDY', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0xA1: { mnemonic: 'LDA', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0xA2: { mnemonic: 'LDX', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0xA4: { mnemonic: 'LDY', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0xA5: { mnemonic: 'LDA', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0xA6: { mnemonic: 'LDX', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0xA8: { mnemonic: 'TAY', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xA9: { mnemonic: 'LDA', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0xAA: { mnemonic: 'TAX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xAC: { mnemonic: 'LDY', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0xAD: { mnemonic: 'LDA', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0xAE: { mnemonic: 'LDX', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  
  // BCS
  0xB0: { mnemonic: 'BCS', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0xB1: { mnemonic: 'LDA', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1 },
  0xB4: { mnemonic: 'LDY', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0xB5: { mnemonic: 'LDA', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0xB6: { mnemonic: 'LDX', addressingMode: AddressingMode.ZERO_PAGE_Y, bytes: 1, cycles: 4, extraCycles: 0 },
  0xB8: { mnemonic: 'CLV', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xB9: { mnemonic: 'LDA', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  0xBA: { mnemonic: 'TSX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xBC: { mnemonic: 'LDY', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0xBD: { mnemonic: 'LDA', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0xBE: { mnemonic: 'LDX', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  
  // CPY
  0xC0: { mnemonic: 'CPY', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0xC1: { mnemonic: 'CMP', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0xC4: { mnemonic: 'CPY', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0xC5: { mnemonic: 'CMP', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0xC6: { mnemonic: 'DEC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0 },
  0xC8: { mnemonic: 'INY', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xC9: { mnemonic: 'CMP', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0xCA: { mnemonic: 'DEX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xCC: { mnemonic: 'CPY', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0xCD: { mnemonic: 'CMP', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0xCE: { mnemonic: 'DEC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0 },
  
  // BNE
  0xD0: { mnemonic: 'BNE', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0xD1: { mnemonic: 'CMP', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1 },
  0xD5: { mnemonic: 'CMP', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0xD6: { mnemonic: 'DEC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0 },
  0xD8: { mnemonic: 'CLD', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xD9: { mnemonic: 'CMP', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  0xDD: { mnemonic: 'CMP', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0xDE: { mnemonic: 'DEC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0 },
  
  // CPX
  0xE0: { mnemonic: 'CPX', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0xE1: { mnemonic: 'SBC', addressingMode: AddressingMode.INDEXED_INDIRECT, bytes: 1, cycles: 6, extraCycles: 0 },
  0xE4: { mnemonic: 'CPX', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0xE5: { mnemonic: 'SBC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 3, extraCycles: 0 },
  0xE6: { mnemonic: 'INC', addressingMode: AddressingMode.ZERO_PAGE, bytes: 1, cycles: 5, extraCycles: 0 },
  0xE8: { mnemonic: 'INX', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xE9: { mnemonic: 'SBC', addressingMode: AddressingMode.IMMEDIATE, bytes: 1, cycles: 2, extraCycles: 0 },
  0xEA: { mnemonic: 'NOP', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xEC: { mnemonic: 'CPX', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0xED: { mnemonic: 'SBC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 4, extraCycles: 0 },
  0xEE: { mnemonic: 'INC', addressingMode: AddressingMode.ABSOLUTE, bytes: 2, cycles: 6, extraCycles: 0 },
  
  // BEQ
  0xF0: { mnemonic: 'BEQ', addressingMode: AddressingMode.RELATIVE, bytes: 1, cycles: 2, extraCycles: 1 },
  0xF1: { mnemonic: 'SBC', addressingMode: AddressingMode.INDIRECT_INDEXED, bytes: 1, cycles: 5, extraCycles: 1 },
  0xF5: { mnemonic: 'SBC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 4, extraCycles: 0 },
  0xF6: { mnemonic: 'INC', addressingMode: AddressingMode.ZERO_PAGE_X, bytes: 1, cycles: 6, extraCycles: 0 },
  0xF8: { mnemonic: 'SED', addressingMode: AddressingMode.IMPLIED, bytes: 0, cycles: 2, extraCycles: 0 },
  0xF9: { mnemonic: 'SBC', addressingMode: AddressingMode.ABSOLUTE_Y, bytes: 2, cycles: 4, extraCycles: 1 },
  0xFD: { mnemonic: 'SBC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 4, extraCycles: 1 },
  0xFE: { mnemonic: 'INC', addressingMode: AddressingMode.ABSOLUTE_X, bytes: 2, cycles: 7, extraCycles: 0 }
};