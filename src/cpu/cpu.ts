import type {
  CPUInterface,
  CPURegisters,
  CPUStateInfo,
  StatusFlags,
  CPUOptions,
  CPUEvents
} from '@/types/cpu';

import {
  CPUState,
  InterruptType,
  CPUFlag
} from '@/types/cpu';
import type { MemoryInterface } from '@/types/memory';
import { EventEmitter } from '../utils/events.js';
import { CPUError } from '@/utils/errors';
import { formatHex } from '@/utils/format';
import { InstructionSet } from './instructions';
import { AddressingModes } from './addressing';
import { OpcodeDecoder } from './opcodes';

/**
 * 6502 마이크로프로세서 완전 에뮬레이션
 * 
 * 모든 151개 공식 명령어와 13가지 주소 지정 모드를 지원하며,
 * 사이클 정확한 실행과 완전한 플래그 처리를 제공합니다.
 * 
 * @example
 * ```typescript
 * const memory = new MemoryManager();
 * const cpu = new CPU6502(memory);
 * 
 * // 프로그램 로드
 * memory.write(0x0000, 0xA9); // LDA #$42
 * memory.write(0x0001, 0x42);
 * 
 * // 실행
 * cpu.reset();
 * const cycles = cpu.step();
 * console.log(`A=${cpu.registers.A}, cycles=${cycles}`);
 * ```
 */
export class CPU6502 extends EventEmitter<CPUEvents> implements CPUInterface {
  private readonly _registers: CPURegisters;
  public readonly memory: MemoryInterface;
  private readonly instructions: InstructionSet;
  public readonly addressing: AddressingModes;
  
  private cycleCount: number = 0;
  private instructionCount: number = 0;
  private isHalted: boolean = false;
  
  // CPU6502 인터페이스 구현을 위한 속성들
  public get cycles(): number {
    return this.cycleCount;
  }
  
  // 메모리 접근 메서드들 (CPU6502 인터페이스)
  public read(address: number): number {
    return this.memory.read(address);
  }
  
  public write(address: number, value: number): void {
    this.memory.write(address, value);
  }
  
  // 인터럽트 메서드들 (CPU6502 인터페이스)
  public irq(): void {
    if (!this._registers.P.interrupt) {
      this.handleIRQ();
    }
  }
  
  public nmi(): void {
    this.handleNMI();
  }
  
  private readonly options: Required<CPUOptions>;
  
  // 인터럽트 관련
  private nmiPending: boolean = false;
  private irqPending: boolean = false;
  
  // 디버깅 지원
  private readonly breakpoints: Set<number> = new Set();
  private traceEnabled: boolean = false;
  
  constructor(memory: MemoryInterface, options: CPUOptions = {}) {
    super();
    
    this.memory = memory;
    this.options = {
      clockSpeed: options.clockSpeed ?? 1000000, // 1MHz default
      frequencyMHz: options.frequencyMHz ?? 1.0,
      enableLogging: options.enableLogging ?? false,
      enableDebug: options.enableDebug ?? false,
      enableBreakpoints: options.enableBreakpoints ?? false,
      strictMode: options.strictMode ?? true,
      cycleAccurate: options.cycleAccurate ?? true
    };
    
    // 레지스터 초기화
    this._registers = {
      A: 0,
      X: 0,
      Y: 0,
      SP: 0xFF,
      PC: 0,
      P: { // StatusFlags 객체로 초기화
        carry: false,
        zero: false,
        interrupt: true, // 인터럽트 비활성화
        decimal: false,
        break: false,
        unused: true, // 미사용 비트 설정
        overflow: false,
        negative: false
      }
    };
    
    // 명령어 세트와 주소 지정 모드 초기화
    this.instructions = new InstructionSet(this);
    this.addressing = new AddressingModes(this);
    
    if (this.options.enableDebug) {
      this.enableTracing();
    }
  }
  
  /**
   * 레지스터 읽기 전용 접근
   */
  public get registers(): Readonly<CPURegisters> {
    return {
      ...this._registers
    } as Readonly<CPURegisters>;
  }
  
  /**
   * CPU 리셋 - 하드웨어 리셋과 동일
   * 
   * - PC를 리셋 벡터($FFFC-$FFFD)에서 로드
   * - 스택 포인터를 $FF로 초기화  
   * - 인터럽트 비활성화 플래그 설정
   * - 다른 레지스터는 변경되지 않음
   */
  public reset(): void {
    // 리셋 벡터에서 PC 로드
    const resetVector = this.memory.readWord(0xFFFC);
    this._registers.PC = resetVector;
    
    // 스택 포인터 초기화
    this._registers.SP = 0xFF;
    
    // 상태 레지스터: 인터럽트 비활성화, 미사용 비트 설정
    this._registers.P = {
      carry: false,
      zero: false,
      interrupt: true, // I=1
      decimal: false,
      break: false,
      unused: true, // U=1
      overflow: false,
      negative: false
    };
    
    // 카운터 및 상태 초기화
    this.cycleCount = 0;
    this.instructionCount = 0;
    this.isHalted = false;
    this.nmiPending = false;
    this.irqPending = false;
    
    this.emit('reset', this.getState());
    
    if (this.options.enableDebug) {
      console.log(`[CPU] Reset - PC=${formatHex(this._registers.PC, 4)}`);
    }
  }
  
  /**
   * 단일 명령어 실행
   * 
   * @returns 소모된 사이클 수
   * @throws {CPUError} 알 수 없는 오피코드 또는 실행 오류
   */
  public step(): number {
    if (this.isHalted) {
      return 0;
    }

    // 인터럽트 처리
    const interruptCycles = this.handleInterrupts();
    if (interruptCycles > 0) {
      return interruptCycles;
    }

    // 브레이크포인트 확인
    if (this.breakpoints.has(this._registers.PC)) {
      this.emit('breakpoint', this._registers.PC);
      if (!this.options.enableDebug) {
        return 0; // 디버그 모드가 아니면 멈춤
      }
    }

    // beforeStep 이벤트 발생
    this.emit('beforeStep', this.getState());

    // 명령어 페치
    const opcode = this.fetchByte();
    const startPC = this._registers.PC - 1;

    // 명령어 실행
    try {
      const cycles = this.instructions.execute(opcode);

      this.cycleCount += cycles;
      this.instructionCount++;

      // 트레이스 출력
      if (this.traceEnabled) {
        this.traceExecution(startPC, opcode, cycles);
      }

      // afterStep 이벤트 발생
      this.emit('afterStep', this.getState(), cycles);

      // 실행 이벤트 발생
      this.emit('step', cycles);

      return cycles;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const cpuError = new CPUError(
        `Execution failed at PC=${formatHex(startPC, 4)}, opcode=${formatHex(opcode, 2)}: ${errorMessage}`,
        'EXECUTION_ERROR',
        startPC
      );

      this.emit('error', cpuError);
      throw cpuError;
    }
  }
  
  /**
   * 지정된 사이클 수만큼 실행
   * 
   * @param maxCycles 최대 실행할 사이클 수
   * @returns 실제 실행된 사이클 수
   */
  public execute(maxCycles: number): number {
    let totalCycles = 0;
    const startCycles = this.cycleCount;
    
    while (totalCycles < maxCycles && !this.isHalted) {
      const stepCycles = this.step();
      totalCycles += stepCycles;
      
      // 인터럽트나 에러로 인한 조기 종료 확인
      if (stepCycles === 0) {
        break;
      }
    }
    
    return this.cycleCount - startCycles;
  }
  
  /**
   * 인터럽트 발생
   * 
   * @param type 인터럽트 타입
   */
  public interrupt(type: InterruptType): void {
    switch (type) {
      case 'IRQ':
        this.irqPending = true;
        break;
      case 'NMI':
        this.nmiPending = true;
        break;
      case 'BRK':
        this.handleBRK();
        break;
    }
    
    this.emit('interrupt', type);
  }
  
  /**
   * CPU 중단
   */
  public halt(): void {
    this.isHalted = true;
    this.emit('halt', this.getState());
  }
  
  /**
   * CPU 재시작
   */
  public resume(): void {
    this.isHalted = false;
    this.emit('resume', this.getState());
  }
  
  /**
   * 현재 CPU 상태 반환
   */
  public getState(): CPUStateInfo {
    const flags = this._registers.P;
    return {
      state: this.isHalted ? CPUState.HALTED : CPUState.RUNNING,
      registers: this.registers,
      flags: {
        ...flags,
        // 단일 문자 플래그 접근을 위한 별칭
        C: flags.carry,
        Z: flags.zero,
        I: flags.interrupt,
        D: flags.decimal,
        B: flags.break,
        U: flags.unused,
        V: flags.overflow,
        N: flags.negative
      } as any,
      cycles: this.cycleCount,
      cycleCount: this.cycleCount,
      instructionCount: this.instructionCount,
      isHalted: this.isHalted
    };
  }
  
  // =================================================================
  // 메모리 접근 메서드
  // =================================================================
  
  /**
   * 바이트 페치 (PC 자동 증가)
   */
  public fetchByte(): number {
    const value = this.memory.readByte(this._registers.PC);
    this._registers.PC = (this._registers.PC + 1) & 0xFFFF;
    return value;
  }
  
  /**
   * 워드 페치 (PC 자동 증가, 리틀 엔디안)
   */
  public fetchWord(): number {
    const low = this.fetchByte();
    const high = this.fetchByte();
    return low | (high << 8);
  }
  
  /**
   * 메모리 읽기
   */
  public readByte(address: number): number {
    return this.memory.readByte(address & 0xFFFF);
  }
  
  /**
   * 메모리 쓰기
   */
  public writeByte(address: number, value: number): void {
    this.memory.writeByte(address & 0xFFFF, value & 0xFF);
  }
  
  /**
   * 워드 읽기 (리틀 엔디안)
   */
  public readWord(address: number): number {
    const low = this.readByte(address);
    const high = this.readByte(address + 1);
    return low | (high << 8);
  }
  
  /**
   * 워드 쓰기 (리틀 엔디안)
   */
  public writeWord(address: number, value: number): void {
    this.writeByte(address, value & 0xFF);
    this.writeByte(address + 1, (value >> 8) & 0xFF);
  }
  
  // =================================================================
  // 스택 연산
  // =================================================================
  
  /**
   * 스택에 바이트 푸시
   */
  public pushByte(value: number): void {
    this.writeByte(0x0100 | this._registers.SP, value & 0xFF);
    this._registers.SP = (this._registers.SP - 1) & 0xFF;
  }
  
  /**
   * 스택에서 바이트 팝
   */
  public pullByte(): number {
    this._registers.SP = (this._registers.SP + 1) & 0xFF;
    return this.readByte(0x0100 | this._registers.SP);
  }
  
  /**
   * 스택에 워드 푸시 (리틀 엔디안)
   */
  public pushWord(value: number): void {
    this.pushByte((value >> 8) & 0xFF); // 상위 바이트 먼저
    this.pushByte(value & 0xFF);        // 하위 바이트
  }
  
  /**
   * 스택에서 워드 팝 (리틀 엔디안)
   */
  public pullWord(): number {
    const low = this.pullByte();   // 하위 바이트 먼저
    const high = this.pullByte();  // 상위 바이트
    return low | (high << 8);
  }
  
  // =================================================================
  // 플래그 연산
  // =================================================================
  
  /**
   * 플래그 값 확인
   */
  public getFlag(flag: CPUFlag | string): boolean {
    const flagKey = typeof flag === 'string' ? flag.charAt(0).toUpperCase() : flag;
    switch (flagKey) {
      case 'C': return this._registers.P.carry;
      case 'Z': return this._registers.P.zero;
      case 'I': return this._registers.P.interrupt;
      case 'D': return this._registers.P.decimal;
      case 'B': return this._registers.P.break;
      case 'U': return this._registers.P.unused;
      case 'V': return this._registers.P.overflow;
      case 'N': return this._registers.P.negative;
      default: return false;
    }
  }
  
  /**
   * 플래그 값 설정
   */
  public setFlag(flag: CPUFlag | string, value: boolean): void {
    const flagKey = typeof flag === 'string' ? flag.charAt(0).toUpperCase() : flag;
    switch (flagKey) {
      case 'C': this._registers.P.carry = value; break;
      case 'Z': this._registers.P.zero = value; break;
      case 'I': this._registers.P.interrupt = value; break;
      case 'D': this._registers.P.decimal = value; break;
      case 'B': this._registers.P.break = value; break;
      case 'U': this._registers.P.unused = value; break;
      case 'V': this._registers.P.overflow = value; break;
      case 'N': this._registers.P.negative = value; break;
      default: throw new Error(`Invalid flag: ${flag}`);
    }
  }
  
  /**
   * Zero 및 Negative 플래그 자동 설정
   */
  public setZeroNegativeFlags(value: number): void {
    this.setFlag(CPUFlag.ZERO, (value & 0xFF) === 0);
    this.setFlag(CPUFlag.NEGATIVE, (value & 0x80) !== 0);
  }

  /**
   * StatusFlags 객체를 8비트 숫자로 변환
   */
  private statusFlagsToNumber(flags: StatusFlags): number {
    return (
      (flags.carry ? 0x01 : 0) |
      (flags.zero ? 0x02 : 0) |
      (flags.interrupt ? 0x04 : 0) |
      (flags.decimal ? 0x08 : 0) |
      (flags.break ? 0x10 : 0) |
      (flags.unused ? 0x20 : 0) |
      (flags.overflow ? 0x40 : 0) |
      (flags.negative ? 0x80 : 0)
    );
  }
  
  // =================================================================
  // 레지스터 접근 메서드 (내부용)
  // =================================================================
  
  public setRegisterA(value: number): void {
    this._registers.A = value & 0xFF;
    this.setZeroNegativeFlags(this._registers.A);
  }

  public setRegisterX(value: number): void {
    this._registers.X = value & 0xFF;
    this.setZeroNegativeFlags(this._registers.X);
  }

  public setRegisterY(value: number): void {
    this._registers.Y = value & 0xFF;
    this.setZeroNegativeFlags(this._registers.Y);
  }
  
  public setPC(address: number): void {
    this._registers.PC = address & 0xFFFF;
  }
  
  public setSP(value: number): void {
    this._registers.SP = value & 0xFF;
  }
  
  // =================================================================
  // 인터럽트 처리
  // =================================================================
  
  private handleInterrupts(): number {
    // NMI (Non-Maskable Interrupt) 우선 처리
    if (this.nmiPending) {
      this.nmiPending = false;
      return this.handleNMI();
    }
    
    // IRQ (Interrupt Request) - 인터럽트가 비활성화되어 있으면 무시
    if (this.irqPending && !this.getFlag(CPUFlag.INTERRUPT)) {
      this.irqPending = false;
      return this.handleIRQ();
    }
    
    return 0;
  }
  
  private handleNMI(): number {
    // PC와 P 레지스터 스택에 저장
    this.pushWord(this._registers.PC);
    this.pushByte(this.statusFlagsToNumber(this._registers.P) & ~0x10); // B 플래그 클리어
    
    // 인터럽트 비활성화
    this.setFlag(CPUFlag.INTERRUPT, true);
    
    // NMI 벡터로 점프
    this._registers.PC = this.readWord(0xFFFA);
    
    return 7; // NMI는 7 사이클 소모
  }
  
  private handleIRQ(): number {
    // PC와 P 레지스터 스택에 저장
    this.pushWord(this._registers.PC);
    this.pushByte(this.statusFlagsToNumber(this._registers.P) & ~0x10); // B 플래그 클리어
    
    // 인터럽트 비활성화
    this.setFlag(CPUFlag.INTERRUPT, true);
    
    // IRQ 벡터로 점프
    this._registers.PC = this.readWord(0xFFFE);
    
    return 7; // IRQ는 7 사이클 소모
  }
  
  private handleBRK(): number {
    // PC + 1을 스택에 저장 (BRK는 2바이트 명령어)
    this.pushWord(this._registers.PC + 1);
    
    // P 레지스터를 B 플래그와 함께 스택에 저장
    this.pushByte(this.statusFlagsToNumber(this._registers.P) | 0x10); // B 플래그 설정
    
    // 인터럽트 비활성화
    this.setFlag(CPUFlag.INTERRUPT, true);
    
    // IRQ/BRK 벡터로 점프
    this._registers.PC = this.readWord(0xFFFE);
    
    return 7; // BRK는 7 사이클 소모
  }
  
  // =================================================================
  // 디버깅 지원
  // =================================================================
  
  /**
   * 브레이크포인트 설정
   */
  public setBreakpoint(address: number): void {
    this.breakpoints.add(address & 0xFFFF);
  }
  
  /**
   * 브레이크포인트 해제
   */
  public removeBreakpoint(address: number): void {
    this.breakpoints.delete(address & 0xFFFF);
  }
  
  /**
   * 모든 브레이크포인트 해제
   */
  public clearBreakpoints(): void {
    this.breakpoints.clear();
  }
  
  /**
   * 트레이싱 활성화
   */
  public enableTracing(): void {
    this.traceEnabled = true;
  }
  
  /**
   * 트레이싱 비활성화
   */
  public disableTracing(): void {
    this.traceEnabled = false;
  }
  
  private traceExecution(pc: number, opcode: number, cycles: number): void {
    const disasm = OpcodeDecoder.disassemble(this.memory.getData(), pc);
    const instruction = disasm.fullInstruction;
    console.log(`[CPU] ${formatHex(pc, 4)}: ${instruction} [${cycles} cycles] A=${formatHex(this._registers.A)} X=${formatHex(this._registers.X)} Y=${formatHex(this._registers.Y)} SP=${formatHex(this._registers.SP)} P=${formatHex(this.statusFlagsToNumber(this._registers.P))}`);
  }
  
  /**
   * 사이클 카운트 반환
   */
  public getCycleCount(): number {
    return this.cycleCount;
  }

  /**
   * 디버그 정보 반환
   */
  public getDebugInfo() {
    const disasm = OpcodeDecoder.disassemble(this.memory.getData(), this._registers.PC);
    return {
      registers: { ...this._registers },
      flags: this._registers.P,
      cycleCount: this.cycleCount,
      instructionCount: this.instructionCount,
      isHalted: this.isHalted,
      pendingInterrupts: {
        nmi: this.nmiPending,
        irq: this.irqPending
      },
      lastInstruction: disasm.fullInstruction
    };
  }

  /**
   * 성능 통계
   */
  public getPerformanceStats() {
    return {
      cycleCount: this.cycleCount,
      instructionCount: this.instructionCount,
      averageCyclesPerInstruction: this.instructionCount > 0 ? this.cycleCount / this.instructionCount : 0,
      frequencyMHz: this.options.frequencyMHz
    };
  }

  // === 레지스터 설정 메서드들 ===

  /**
   * PC 레지스터 설정
   */
  public setRegisterPC(value: number): void {
    this._registers.PC = value & 0xFFFF;
  }

  /**
   * SP 레지스터 설정  
   */
  public setRegisterSP(value: number): void {
    this._registers.SP = value & 0xFF;
  }

  /**
   * P 레지스터 설정
   */
  public setRegisterP(value: number): void {
    this._registers.P = {
      carry: (value & 0x01) !== 0,
      zero: (value & 0x02) !== 0,
      interrupt: (value & 0x04) !== 0,
      decimal: (value & 0x08) !== 0,
      break: (value & 0x10) !== 0,
      unused: true,
      overflow: (value & 0x40) !== 0,
      negative: (value & 0x80) !== 0
    };
  }

  /**
   * P 레지스터를 바이트 값으로 반환
   */
  public getRegisterP(): number {
    let value = 0;
    const flags = this._registers.P;
    
    if (flags.carry) value |= 0x01;
    if (flags.zero) value |= 0x02;
    if (flags.interrupt) value |= 0x04;
    if (flags.decimal) value |= 0x08;
    if (flags.break) value |= 0x10;
    if (flags.unused) value |= 0x20;
    if (flags.overflow) value |= 0x40;
    if (flags.negative) value |= 0x80;
    
    return value;
  }

}