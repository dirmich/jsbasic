/**
 * BASIC Debugger
 *
 * BASIC 프로그램 디버깅 기능 제공
 */

import { EventEmitter } from '@/utils/events';
import type {
  BasicBreakpoint,
  VariableWatch,
  CallStackFrame,
  ExecutionTrace,
  DebuggerState,
  StepMode,
  DebuggerConfig,
  ProfilingInfo,
  DebuggerEvents
} from './types';

/**
 * BasicDebugger 클래스
 *
 * BASIC 프로그램 실행 디버깅, 브레이크포인트, 변수 워치, 콜스택 추적
 */
export class BasicDebugger extends EventEmitter<DebuggerEvents> {
  private breakpoints: Map<number, BasicBreakpoint> = new Map();
  private watches: Map<string, VariableWatch> = new Map();
  private callStack: CallStackFrame[] = [];
  private executionTrace: ExecutionTrace[] = [];
  private profilingData: Map<number, ProfilingInfo> = new Map();

  private state: DebuggerState = 'stopped';
  private stepMode: StepMode | null = null;
  private currentLine: number = 0;

  private readonly config: DebuggerConfig;

  constructor(config?: Partial<DebuggerConfig>) {
    super();

    this.config = {
      maxTraceSize: 1000,
      pauseOnError: true,
      showVariables: true,
      showCallStack: true,
      enableProfiling: false,
      ...config
    };
  }

  // ===================================================================
  // 브레이크포인트 관리
  // ===================================================================

  /**
   * 브레이크포인트 설정
   */
  setBreakpoint(lineNumber: number, condition?: string, name?: string): void {
    const breakpoint: BasicBreakpoint = {
      lineNumber,
      enabled: true,
      condition,
      hitCount: 0,
      name: name || `Line ${lineNumber}`
    };

    this.breakpoints.set(lineNumber, breakpoint);
  }

  /**
   * 브레이크포인트 제거
   */
  removeBreakpoint(lineNumber: number): void {
    this.breakpoints.delete(lineNumber);
  }

  /**
   * 모든 브레이크포인트 제거
   */
  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  /**
   * 브레이크포인트 활성화/비활성화
   */
  toggleBreakpoint(lineNumber: number, enabled: boolean): void {
    const breakpoint = this.breakpoints.get(lineNumber);
    if (breakpoint) {
      breakpoint.enabled = enabled;
    }
  }

  /**
   * 브레이크포인트 목록 가져오기
   */
  getBreakpoints(): BasicBreakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * 브레이크포인트 체크
   */
  checkBreakpoint(lineNumber: number, variables: Record<string, string | number>): boolean {
    const breakpoint = this.breakpoints.get(lineNumber);

    if (!breakpoint || !breakpoint.enabled) {
      return false;
    }

    // 조건 평가
    if (breakpoint.condition) {
      try {
        // 간단한 조건 평가 (변수 이름 기반)
        // 예: "I > 5", "X = 10"
        const result = this.evaluateCondition(breakpoint.condition, variables);
        if (!result) {
          return false;
        }
      } catch (error) {
        console.warn('Breakpoint condition evaluation failed:', error);
        return false;
      }
    }

    // 히트 카운트 증가
    breakpoint.hitCount++;

    // 이벤트 발생
    this.emit('breakpoint-hit', lineNumber, variables);

    return true;
  }

  /**
   * 조건 평가 (간단한 비교만 지원)
   */
  private evaluateCondition(condition: string, variables: Record<string, string | number>): boolean {
    // 간단한 조건 파싱: "변수 연산자 값"
    const match = condition.match(/^\s*(\w+)\s*([<>=!]+)\s*(.+)\s*$/);
    if (!match) {
      return true; // 파싱 실패 시 항상 참
    }

    const [, varName, operator, valueStr] = match;
    if (!varName || !operator || !valueStr) {
      return true;
    }

    const varValue = variables[varName];
    if (varValue === undefined) {
      return false;
    }

    const expectedValue = isNaN(Number(valueStr)) ? valueStr.trim() : Number(valueStr);

    switch (operator) {
      case '=':
      case '==':
        return varValue === expectedValue;
      case '!=':
      case '<>':
        return varValue !== expectedValue;
      case '>':
        return Number(varValue) > Number(expectedValue);
      case '<':
        return Number(varValue) < Number(expectedValue);
      case '>=':
        return Number(varValue) >= Number(expectedValue);
      case '<=':
        return Number(varValue) <= Number(expectedValue);
      default:
        return true;
    }
  }

  // ===================================================================
  // 변수 워치
  // ===================================================================

  /**
   * 변수 워치 추가
   */
  addWatch(variableName: string): void {
    if (!this.watches.has(variableName)) {
      this.watches.set(variableName, {
        name: variableName,
        value: '',
        type: 'string',
        lastChanged: Date.now()
      });
    }
  }

  /**
   * 변수 워치 제거
   */
  removeWatch(variableName: string): void {
    this.watches.delete(variableName);
  }

  /**
   * 모든 워치 제거
   */
  clearWatches(): void {
    this.watches.clear();
  }

  /**
   * 워치 목록 가져오기
   */
  getWatches(): VariableWatch[] {
    return Array.from(this.watches.values());
  }

  /**
   * 워치 업데이트
   */
  updateWatches(variables: Record<string, string | number>): void {
    for (const [name, watch] of this.watches.entries()) {
      const newValue = variables[name];
      if (newValue !== undefined && newValue !== watch.value) {
        const oldValue = watch.value;
        watch.value = newValue;
        watch.type = typeof newValue === 'number' ? 'number' : 'string';
        watch.lastChanged = Date.now();

        // 변경 이벤트 발생
        this.emit('watch-changed', watch);

        console.log(`🔍 Watch: ${name} changed from ${oldValue} to ${newValue}`);
      }
    }
  }

  // ===================================================================
  // 콜스택 관리
  // ===================================================================

  /**
   * 콜스택에 프레임 푸시
   */
  pushCallStack(frame: CallStackFrame): void {
    this.callStack.push(frame);
  }

  /**
   * 콜스택에서 프레임 팝
   */
  popCallStack(): CallStackFrame | undefined {
    return this.callStack.pop();
  }

  /**
   * 콜스택 가져오기
   */
  getCallStack(): CallStackFrame[] {
    return [...this.callStack];
  }

  /**
   * 콜스택 클리어
   */
  clearCallStack(): void {
    this.callStack = [];
  }

  // ===================================================================
  // 실행 추적
  // ===================================================================

  /**
   * 실행 추적 기록
   */
  recordTrace(lineNumber: number, variables: Record<string, string | number>, output?: string): void {
    const trace: ExecutionTrace = {
      lineNumber,
      timestamp: Date.now(),
      variables: { ...variables },
      output
    };

    this.executionTrace.push(trace);

    // 최대 크기 제한
    if (this.executionTrace.length > this.config.maxTraceSize) {
      this.executionTrace.shift();
    }
  }

  /**
   * 실행 추적 가져오기
   */
  getExecutionTrace(): ExecutionTrace[] {
    return [...this.executionTrace];
  }

  /**
   * 실행 추적 클리어
   */
  clearExecutionTrace(): void {
    this.executionTrace = [];
  }

  // ===================================================================
  // 성능 프로파일링
  // ===================================================================

  /**
   * 프로파일링 데이터 기록
   */
  recordProfiling(lineNumber: number, executionTime: number): void {
    if (!this.config.enableProfiling) {
      return;
    }

    let info = this.profilingData.get(lineNumber);
    if (!info) {
      info = {
        lineNumber,
        executionCount: 0,
        totalTime: 0,
        averageTime: 0
      };
      this.profilingData.set(lineNumber, info);
    }

    info.executionCount++;
    info.totalTime += executionTime;
    info.averageTime = info.totalTime / info.executionCount;
  }

  /**
   * 프로파일링 데이터 가져오기
   */
  getProfilingData(): ProfilingInfo[] {
    return Array.from(this.profilingData.values())
      .sort((a, b) => b.totalTime - a.totalTime); // 총 실행 시간 기준 정렬
  }

  /**
   * 프로파일링 데이터 클리어
   */
  clearProfilingData(): void {
    this.profilingData.clear();
  }

  // ===================================================================
  // 디버거 상태 관리
  // ===================================================================

  /**
   * 디버거 시작
   */
  start(): void {
    this.state = 'running';
    this.emit('state-changed', this.state);
  }

  /**
   * 디버거 일시정지
   */
  pause(): void {
    this.state = 'paused';
    this.emit('state-changed', this.state);
  }

  /**
   * 디버거 재개
   */
  resume(): void {
    this.state = 'running';
    this.stepMode = null;
    this.emit('state-changed', this.state);
  }

  /**
   * 디버거 중지
   */
  stop(): void {
    this.state = 'stopped';
    this.clearCallStack();
    this.clearExecutionTrace();
    this.emit('state-changed', this.state);
  }

  /**
   * 단계별 실행
   */
  step(mode: StepMode): void {
    this.state = 'stepping';
    this.stepMode = mode;
    this.emit('state-changed', this.state);
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): DebuggerState {
    return this.state;
  }

  /**
   * 현재 라인 설정
   */
  setCurrentLine(lineNumber: number): void {
    this.currentLine = lineNumber;
  }

  /**
   * 현재 라인 가져오기
   */
  getCurrentLine(): number {
    return this.currentLine;
  }

  /**
   * 단계별 실행 모드 가져오기
   */
  getStepMode(): StepMode | null {
    return this.stepMode;
  }

  // ===================================================================
  // 유틸리티
  // ===================================================================

  /**
   * 디버거 설정 가져오기
   */
  getConfig(): DebuggerConfig {
    return { ...this.config };
  }

  /**
   * 디버거 설정 업데이트
   */
  updateConfig(config: Partial<DebuggerConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * 디버거 리셋
   */
  reset(): void {
    this.clearBreakpoints();
    this.clearWatches();
    this.clearCallStack();
    this.clearExecutionTrace();
    this.clearProfilingData();
    this.state = 'stopped';
    this.stepMode = null;
    this.currentLine = 0;
  }

  /**
   * 디버거 정보 가져오기
   */
  getDebugInfo(): {
    state: DebuggerState;
    currentLine: number;
    breakpoints: number;
    watches: number;
    callStackDepth: number;
    traceSize: number;
  } {
    return {
      state: this.state,
      currentLine: this.currentLine,
      breakpoints: this.breakpoints.size,
      watches: this.watches.size,
      callStackDepth: this.callStack.length,
      traceSize: this.executionTrace.length
    };
  }
}
