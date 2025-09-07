import type { 
  CPUState, 
  CPUDebugInfo, 
  BreakpointInfo, 
  WatchpointInfo,
  ExecutionTrace,
  DisassemblyInfo
} from '@/types/cpu';
import type { CPU6502 } from './cpu';
import { OpcodeDecoder } from './opcodes';
import { formatHex } from '@/utils/format';
import { EventEmitter } from 'events';

/**
 * CPU 디버거 이벤트 타입
 */
interface DebuggerEvents {
  breakpoint: (info: BreakpointInfo) => void;
  watchpoint: (info: WatchpointInfo) => void;
  step: (trace: ExecutionTrace) => void;
  stateChange: (state: CPUState) => void;
}

/**
 * 6502 CPU 디버거
 * 
 * CPU 실행을 제어하고 디버깅 정보를 제공하는 클래스입니다:
 * - 브레이크포인트 설정/해제
 * - 워치포인트 (메모리 감시)
 * - 단계별 실행 (step, step over, step out)
 * - 실행 추적 및 로깅
 * - CPU 상태 검사 및 수정
 * - 디스어셈블리 뷰어
 */
export class CPUDebugger extends EventEmitter<DebuggerEvents> {
  private breakpoints = new Map<number, BreakpointInfo>();
  private watchpoints = new Map<number, WatchpointInfo>();
  private executionTrace: ExecutionTrace[] = [];
  private isDebugging = false;
  private stepMode = false;
  private stepOverMode = false;
  private stepOutMode = false;
  private stepOutStackDepth = 0;
  private symbolTable = new Map<number, string>();
  private maxTraceSize = 1000;

  constructor(private readonly cpu: CPU6502) {
    super();
    this.setupCPUEventHandlers();
  }

  /**
   * CPU 이벤트 핸들러 설정
   */
  private setupCPUEventHandlers(): void {
    // CPU 스텝 실행 전 이벤트
    this.cpu.on('beforeStep', (state: CPUState) => {
      if (this.isDebugging) {
        this.handleBeforeStep(state);
      }
    });

    // CPU 스텝 실행 후 이벤트
    this.cpu.on('afterStep', (state: CPUState, cycles: number) => {
      if (this.isDebugging) {
        this.handleAfterStep(state, cycles);
      }
    });

    // 메모리 읽기 이벤트
    this.cpu.on('memoryRead', (address: number, value: number) => {
      this.checkWatchpoints('read', address, value);
    });

    // 메모리 쓰기 이벤트
    this.cpu.on('memoryWrite', (address: number, value: number, oldValue: number) => {
      this.checkWatchpoints('write', address, value, oldValue);
    });
  }

  /**
   * 디버깅 모드 시작
   */
  public startDebugging(): void {
    this.isDebugging = true;
    this.executionTrace = [];
    console.log('🐛 CPU 디버깅 시작');
  }

  /**
   * 디버깅 모드 종료
   */
  public stopDebugging(): void {
    this.isDebugging = false;
    this.stepMode = false;
    this.stepOverMode = false;
    this.stepOutMode = false;
    console.log('✅ CPU 디버깅 종료');
  }

  // =================================================================
  // 브레이크포인트 관리
  // =================================================================

  /**
   * 브레이크포인트 설정
   * 
   * @param address 브레이크포인트 주소
   * @param condition 조건부 브레이크포인트 (선택사항)
   * @param name 브레이크포인트 이름 (선택사항)
   */
  public setBreakpoint(
    address: number, 
    condition?: string, 
    name?: string
  ): void {
    const breakpoint: BreakpointInfo = {
      address,
      condition,
      name: name || `BP_${formatHex(address, 4)}`,
      enabled: true,
      hitCount: 0,
      created: new Date()
    };

    this.breakpoints.set(address, breakpoint);
    console.log(`📍 브레이크포인트 설정: ${breakpoint.name} @ $${formatHex(address, 4)}`);
  }

  /**
   * 브레이크포인트 제거
   */
  public removeBreakpoint(address: number): boolean {
    const removed = this.breakpoints.delete(address);
    if (removed) {
      console.log(`🗑️ 브레이크포인트 제거: $${formatHex(address, 4)}`);
    }
    return removed;
  }

  /**
   * 모든 브레이크포인트 제거
   */
  public clearBreakpoints(): void {
    const count = this.breakpoints.size;
    this.breakpoints.clear();
    console.log(`🧹 모든 브레이크포인트 제거 (${count}개)`);
  }

  /**
   * 브레이크포인트 목록 반환
   */
  public getBreakpoints(): BreakpointInfo[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * 브레이크포인트 활성화/비활성화
   */
  public toggleBreakpoint(address: number): boolean {
    const breakpoint = this.breakpoints.get(address);
    if (breakpoint) {
      breakpoint.enabled = !breakpoint.enabled;
      console.log(`🔄 브레이크포인트 ${breakpoint.enabled ? '활성화' : '비활성화'}: ${breakpoint.name}`);
      return breakpoint.enabled;
    }
    return false;
  }

  // =================================================================
  // 워치포인트 관리
  // =================================================================

  /**
   * 워치포인트 설정 (메모리 감시)
   * 
   * @param address 감시할 메모리 주소
   * @param type 감시 타입 ('read', 'write', 'access')
   * @param condition 조건 (선택사항)
   */
  public setWatchpoint(
    address: number, 
    type: 'read' | 'write' | 'access' = 'access',
    condition?: string,
    name?: string
  ): void {
    const watchpoint: WatchpointInfo = {
      address,
      type,
      condition,
      name: name || `WP_${formatHex(address, 4)}`,
      enabled: true,
      hitCount: 0,
      created: new Date()
    };

    this.watchpoints.set(address, watchpoint);
    console.log(`👁️ 워치포인트 설정: ${watchpoint.name} @ $${formatHex(address, 4)} (${type})`);
  }

  /**
   * 워치포인트 제거
   */
  public removeWatchpoint(address: number): boolean {
    const removed = this.watchpoints.delete(address);
    if (removed) {
      console.log(`🗑️ 워치포인트 제거: $${formatHex(address, 4)}`);
    }
    return removed;
  }

  /**
   * 워치포인트 확인
   */
  private checkWatchpoints(
    operation: 'read' | 'write', 
    address: number, 
    value: number,
    oldValue?: number
  ): void {
    const watchpoint = this.watchpoints.get(address);
    if (!watchpoint || !watchpoint.enabled) return;

    // 타입 확인
    if (watchpoint.type !== 'access' && watchpoint.type !== operation) {
      return;
    }

    // 조건 확인 (단순한 조건만 지원)
    if (watchpoint.condition && !this.evaluateCondition(watchpoint.condition, value, oldValue)) {
      return;
    }

    watchpoint.hitCount++;
    
    const info: WatchpointInfo = {
      ...watchpoint,
      lastValue: value,
      lastOldValue: oldValue,
      lastAccess: new Date()
    };

    console.log(`🎯 워치포인트 히트: ${info.name} (${operation}) = $${formatHex(value)}`);
    this.emit('watchpoint', info);

    // 실행 일시정지
    this.stepMode = true;
  }

  // =================================================================
  // 단계별 실행 제어
  // =================================================================

  /**
   * 한 단계 실행 (Step Into)
   */
  public step(): void {
    this.stepMode = true;
    this.stepOverMode = false;
    this.stepOutMode = false;
    console.log('🔽 단계 실행');
  }

  /**
   * 함수 호출을 건너뛰고 실행 (Step Over)
   */
  public stepOver(): void {
    const currentPC = this.cpu.registers.PC;
    const opcode = this.cpu.readByte(currentPC);
    const info = OpcodeDecoder.getInstructionInfo(opcode);
    
    if (info?.mnemonic === 'JSR') {
      // JSR 명령어인 경우 step over 모드
      this.stepOverMode = true;
      this.stepMode = false;
      this.stepOutMode = false;
      console.log('🔄 함수 건너뛰기 실행');
    } else {
      // 일반 명령어는 step과 같음
      this.step();
    }
  }

  /**
   * 함수에서 빠져나올 때까지 실행 (Step Out)
   */
  public stepOut(): void {
    this.stepOutMode = true;
    this.stepOutStackDepth = this.cpu.registers.SP;
    this.stepMode = false;
    this.stepOverMode = false;
    console.log('🔼 함수 빠져나가기 실행');
  }

  /**
   * 계속 실행 (Continue)
   */
  public continue(): void {
    this.stepMode = false;
    this.stepOverMode = false;
    this.stepOutMode = false;
    console.log('▶️ 계속 실행');
  }

  /**
   * 실행 일시정지
   */
  public pause(): void {
    this.stepMode = true;
    console.log('⏸️ 실행 일시정지');
  }

  // =================================================================
  // 실행 추적 및 로깅
  // =================================================================

  /**
   * 스텝 실행 전 처리
   */
  private handleBeforeStep(state: CPUState): void {
    const currentPC = state.registers.PC;
    
    // 브레이크포인트 확인
    this.checkBreakpoints(currentPC);

    // Step Over 모드 확인
    if (this.stepOverMode) {
      const opcode = this.cpu.readByte(currentPC);
      const info = OpcodeDecoder.getInstructionInfo(opcode);
      if (info?.mnemonic === 'RTS') {
        this.stepMode = true;
        this.stepOverMode = false;
      }
    }

    // Step Out 모드 확인
    if (this.stepOutMode && state.registers.SP > this.stepOutStackDepth) {
      this.stepMode = true;
      this.stepOutMode = false;
    }

    // 단계 모드에서 실행 일시정지
    if (this.stepMode && !this.shouldContinueStep(currentPC)) {
      console.log('⏸️ 단계 실행으로 일시정지');
      // 실제 구현에서는 여기서 실행을 일시정지해야 함
    }
  }

  /**
   * 스텝 실행 후 처리
   */
  private handleAfterStep(state: CPUState, cycles: number): void {
    // 실행 추적 기록
    this.recordExecutionTrace(state, cycles);
    
    // 상태 변경 이벤트 발생
    this.emit('stateChange', state);
  }

  /**
   * 브레이크포인트 확인
   */
  private checkBreakpoints(address: number): void {
    const breakpoint = this.breakpoints.get(address);
    if (!breakpoint || !breakpoint.enabled) return;

    // 조건 확인
    if (breakpoint.condition && !this.evaluateCondition(breakpoint.condition)) {
      return;
    }

    breakpoint.hitCount++;
    breakpoint.lastHit = new Date();
    
    console.log(`🛑 브레이크포인트 히트: ${breakpoint.name} (${breakpoint.hitCount}회)`);
    this.emit('breakpoint', breakpoint);

    // 실행 일시정지
    this.stepMode = true;
  }

  /**
   * 단순 조건 평가
   */
  private evaluateCondition(
    condition: string, 
    value?: number, 
    oldValue?: number
  ): boolean {
    try {
      // 매우 단순한 조건 평가 (보안상 eval 사용하지 않음)
      const state = this.cpu.getState();
      
      // 기본 비교 연산자 지원
      if (condition.includes('A==')) {
        const target = parseInt(condition.split('==')[1], 16);
        return state.registers.A === target;
      }
      if (condition.includes('X==')) {
        const target = parseInt(condition.split('==')[1], 16);
        return state.registers.X === target;
      }
      if (condition.includes('Y==')) {
        const target = parseInt(condition.split('==')[1], 16);
        return state.registers.Y === target;
      }
      
      return true; // 기본적으로 조건 통과
    } catch (error) {
      console.warn(`조건 평가 실패: ${condition}`, error);
      return true;
    }
  }

  /**
   * 계속 단계 실행할지 결정
   */
  private shouldContinueStep(address: number): boolean {
    // NOP 명령어나 특정 주소는 자동으로 건너뛸 수 있음
    const opcode = this.cpu.readByte(address);
    const info = OpcodeDecoder.getInstructionInfo(opcode);
    
    return info?.mnemonic === 'NOP'; // NOP는 자동으로 계속
  }

  /**
   * 실행 추적 기록
   */
  private recordExecutionTrace(state: CPUState, cycles: number): void {
    const trace: ExecutionTrace = {
      timestamp: Date.now(),
      address: state.registers.PC - this.getLastInstructionLength(),
      opcode: this.cpu.readByte(state.registers.PC - this.getLastInstructionLength()),
      registers: { ...state.registers },
      flags: { ...state.flags },
      cycles,
      stackDepth: 0xFF - state.registers.SP,
      disassembly: this.getDisassemblyAtAddress(state.registers.PC - this.getLastInstructionLength())
    };

    this.executionTrace.push(trace);
    
    // 추적 크기 제한
    if (this.executionTrace.length > this.maxTraceSize) {
      this.executionTrace.shift();
    }

    this.emit('step', trace);
  }

  /**
   * 마지막 명령어 길이 계산
   */
  private getLastInstructionLength(): number {
    // 단순화: 평균적으로 2바이트로 가정
    return 1;
  }

  /**
   * 지정된 주소의 디스어셈블리 정보 반환
   */
  private getDisassemblyAtAddress(address: number): DisassemblyInfo {
    const memory = this.cpu.memory.getBytes(address, 3);
    return OpcodeDecoder.disassemble(memory, address);
  }

  // =================================================================
  // 상태 검사 및 수정
  // =================================================================

  /**
   * 현재 CPU 상태 반환
   */
  public getState(): CPUState {
    return this.cpu.getState();
  }

  /**
   * 레지스터 값 수정
   */
  public setRegister(register: keyof CPUState['registers'], value: number): void {
    switch (register) {
      case 'A': this.cpu.setRegisterA(value); break;
      case 'X': this.cpu.setRegisterX(value); break;
      case 'Y': this.cpu.setRegisterY(value); break;
      case 'PC': this.cpu.setRegisterPC(value); break;
      case 'SP': this.cpu.setRegisterSP(value); break;
      case 'P': this.cpu.setRegisterP(value); break;
    }
    console.log(`📝 레지스터 ${register} = $${formatHex(value)}`);
  }

  /**
   * 플래그 값 수정
   */
  public setFlag(flag: string, value: boolean): void {
    this.cpu.setFlag(flag as any, value);
    console.log(`🚩 플래그 ${flag} = ${value}`);
  }

  /**
   * 메모리 값 수정
   */
  public setMemory(address: number, value: number): void {
    this.cpu.writeByte(address, value);
    console.log(`💾 메모리 $${formatHex(address, 4)} = $${formatHex(value)}`);
  }

  // =================================================================
  // 디스어셈블리 및 정보 표시
  // =================================================================

  /**
   * 메모리 영역 디스어셈블리
   * 
   * @param startAddress 시작 주소
   * @param count 명령어 개수
   * @returns 디스어셈블리 정보 배열
   */
  public disassemble(startAddress: number, count: number = 16): DisassemblyInfo[] {
    const memory = this.cpu.memory.getBytes(startAddress, count * 3); // 최대 3바이트씩
    return OpcodeDecoder.disassembleRange(memory, startAddress, count);
  }

  /**
   * 현재 PC 주변 디스어셈블리
   */
  public disassembleAroundPC(beforeCount = 8, afterCount = 8): DisassemblyInfo[] {
    const currentPC = this.cpu.registers.PC;
    const startAddress = Math.max(0, currentPC - beforeCount * 3);
    return this.disassemble(startAddress, beforeCount + afterCount);
  }

  /**
   * 실행 추적 기록 반환
   */
  public getExecutionTrace(count?: number): ExecutionTrace[] {
    if (count && count < this.executionTrace.length) {
      return this.executionTrace.slice(-count);
    }
    return [...this.executionTrace];
  }

  /**
   * 스택 내용 표시
   */
  public getStackContents(depth = 16): Array<{ address: number; value: number }> {
    const stack: Array<{ address: number; value: number }> = [];
    const sp = this.cpu.registers.SP;
    
    for (let i = 0; i < depth && (sp + i + 1) <= 0xFF; i++) {
      const address = 0x0100 + sp + i + 1;
      const value = this.cpu.readByte(address);
      stack.push({ address, value });
    }
    
    return stack;
  }

  /**
   * 제로페이지 내용 표시
   */
  public getZeroPageContents(): Uint8Array {
    return this.cpu.memory.getBytes(0x0000, 0x100);
  }

  // =================================================================
  // 심볼 테이블 관리
  // =================================================================

  /**
   * 심볼 추가
   */
  public addSymbol(address: number, name: string): void {
    this.symbolTable.set(address, name);
    console.log(`🏷️ 심볼 추가: ${name} @ $${formatHex(address, 4)}`);
  }

  /**
   * 심볼 제거
   */
  public removeSymbol(address: number): boolean {
    const removed = this.symbolTable.delete(address);
    if (removed) {
      console.log(`🗑️ 심볼 제거: $${formatHex(address, 4)}`);
    }
    return removed;
  }

  /**
   * 심볼 테이블 반환
   */
  public getSymbolTable(): Map<number, string> {
    return new Map(this.symbolTable);
  }

  /**
   * 주소로 심볼 이름 찾기
   */
  public getSymbolName(address: number): string | undefined {
    return this.symbolTable.get(address);
  }

  // =================================================================
  // 디버깅 정보 출력
  // =================================================================

  /**
   * 전체 디버깅 정보 반환
   */
  public getDebugInfo(): CPUDebugInfo {
    const state = this.getState();
    const trace = this.getExecutionTrace(10);
    const disassembly = this.disassembleAroundPC(5, 10);
    const stack = this.getStackContents(8);

    return {
      state,
      breakpoints: this.getBreakpoints(),
      watchpoints: Array.from(this.watchpoints.values()),
      executionTrace: trace,
      disassembly,
      stack,
      symbols: Array.from(this.symbolTable.entries()).map(([address, name]) => ({ address, name })),
      isDebugging: this.isDebugging,
      stepMode: this.stepMode
    };
  }

  /**
   * 디버깅 정보를 콘솔에 출력
   */
  public printDebugInfo(): void {
    const info = this.getDebugInfo();
    
    console.log('\n=== CPU 디버깅 정보 ===');
    console.log(`PC: $${formatHex(info.state.registers.PC, 4)}  A: $${formatHex(info.state.registers.A)}  X: $${formatHex(info.state.registers.X)}  Y: $${formatHex(info.state.registers.Y)}`);
    console.log(`SP: $${formatHex(info.state.registers.SP)}  P: $${formatHex(info.state.registers.P)}  Flags: ${this.formatFlags(info.state.flags)}`);
    
    console.log('\n--- 현재 명령어 ---');
    const currentInstruction = this.getDisassemblyAtAddress(info.state.registers.PC);
    console.log(`$${formatHex(currentInstruction.address, 4)}: ${currentInstruction.fullInstruction}`);
    
    if (info.breakpoints.length > 0) {
      console.log('\n--- 브레이크포인트 ---');
      info.breakpoints.forEach(bp => {
        console.log(`$${formatHex(bp.address, 4)}: ${bp.name} (${bp.enabled ? '활성' : '비활성'}) - ${bp.hitCount}회`);
      });
    }
    
    console.log('====================\n');
  }

  /**
   * 플래그를 문자열로 포맷
   */
  private formatFlags(flags: CPUState['flags']): string {
    const flagChars = [
      flags.N ? 'N' : 'n',
      flags.V ? 'V' : 'v', 
      '-',
      flags.B ? 'B' : 'b',
      flags.D ? 'D' : 'd',
      flags.I ? 'I' : 'i',
      flags.Z ? 'Z' : 'z',
      flags.C ? 'C' : 'c'
    ];
    return flagChars.join('');
  }

  /**
   * 추적 크기 설정
   */
  public setMaxTraceSize(size: number): void {
    this.maxTraceSize = Math.max(10, Math.min(10000, size));
    
    // 기존 추적 기록 크기 조정
    if (this.executionTrace.length > this.maxTraceSize) {
      this.executionTrace = this.executionTrace.slice(-this.maxTraceSize);
    }
  }
}