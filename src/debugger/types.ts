/**
 * BASIC Debugger Type Definitions
 *
 * BASIC 프로그램 디버깅을 위한 타입 정의
 */

/**
 * 브레이크포인트 정보
 */
export interface BasicBreakpoint {
  lineNumber: number;
  enabled: boolean;
  condition?: string | undefined;
  hitCount: number;
  name?: string | undefined;
}

/**
 * 변수 워치 정보
 */
export interface VariableWatch {
  name: string;
  value: string | number;
  type: 'string' | 'number';
  lastChanged: number; // timestamp
}

/**
 * 콜스택 프레임
 */
export interface CallStackFrame {
  lineNumber: number;
  type: 'GOSUB' | 'FOR' | 'DEF';
  returnLine?: number | undefined;
  variables?: Record<string, string | number> | undefined;
}

/**
 * 실행 추적 정보
 */
export interface ExecutionTrace {
  lineNumber: number;
  timestamp: number;
  variables: Record<string, string | number>;
  output?: string | undefined;
}

/**
 * 디버거 상태
 */
export type DebuggerState = 'stopped' | 'running' | 'paused' | 'stepping';

/**
 * 단계별 실행 모드
 */
export type StepMode = 'step-in' | 'step-over' | 'step-out' | 'continue';

/**
 * 디버거 설정
 */
export interface DebuggerConfig {
  maxTraceSize: number;
  pauseOnError: boolean;
  showVariables: boolean;
  showCallStack: boolean;
  enableProfiling: boolean;
}

/**
 * 성능 프로파일링 정보
 */
export interface ProfilingInfo {
  lineNumber: number;
  executionCount: number;
  totalTime: number; // milliseconds
  averageTime: number; // milliseconds
}

/**
 * 디버거 이벤트 타입
 */
export interface DebuggerEvents {
  'breakpoint-hit': (lineNumber: number, variables: Record<string, string | number>) => void;
  'watch-changed': (watch: VariableWatch) => void;
  'state-changed': (state: DebuggerState) => void;
  'step-completed': (trace: ExecutionTrace) => void;
  'error': (error: Error, lineNumber: number) => void;
  [key: string]: (...args: any[]) => void;
}
