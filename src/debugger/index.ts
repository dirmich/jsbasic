/**
 * BASIC Debugger Module
 *
 * BASIC 프로그램 디버깅 및 성능 분석 도구
 */

export { BasicDebugger } from './basic-debugger.js';
export { ProfilingAnalyzer } from './profiling-analyzer.js';

export type {
  BasicBreakpoint,
  VariableWatch,
  CallStackFrame,
  ExecutionTrace,
  DebuggerState,
  StepMode,
  DebuggerConfig,
  ProfilingInfo,
  DebuggerEvents
} from './types.js';

export type {
  PerformanceHotspot,
  OptimizationSuggestion,
  PerformanceStats,
  PerformanceReport
} from './profiling-analyzer.js';
