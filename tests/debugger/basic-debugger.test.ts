/**
 * BasicDebugger Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BasicDebugger } from '../../src/debugger/basic-debugger';
import type { DebuggerState, StepMode } from '../../src/debugger/types';

describe('BasicDebugger', () => {
  let debugger: BasicDebugger;

  beforeEach(() => {
    debugger = new BasicDebugger();
  });

  describe('브레이크포인트 관리', () => {
    test('브레이크포인트 설정', () => {
      debugger.setBreakpoint(10);
      const breakpoints = debugger.getBreakpoints();

      expect(breakpoints.length).toBe(1);
      expect(breakpoints[0]?.lineNumber).toBe(10);
      expect(breakpoints[0]?.enabled).toBe(true);
      expect(breakpoints[0]?.hitCount).toBe(0);
    });

    test('조건부 브레이크포인트 설정', () => {
      debugger.setBreakpoint(20, 'I > 5', 'Counter Check');
      const breakpoints = debugger.getBreakpoints();

      expect(breakpoints.length).toBe(1);
      expect(breakpoints[0]?.condition).toBe('I > 5');
      expect(breakpoints[0]?.name).toBe('Counter Check');
    });

    test('브레이크포인트 제거', () => {
      debugger.setBreakpoint(10);
      debugger.setBreakpoint(20);
      expect(debugger.getBreakpoints().length).toBe(2);

      debugger.removeBreakpoint(10);
      expect(debugger.getBreakpoints().length).toBe(1);
      expect(debugger.getBreakpoints()[0]?.lineNumber).toBe(20);
    });

    test('모든 브레이크포인트 제거', () => {
      debugger.setBreakpoint(10);
      debugger.setBreakpoint(20);
      debugger.setBreakpoint(30);

      debugger.clearBreakpoints();
      expect(debugger.getBreakpoints().length).toBe(0);
    });

    test('브레이크포인트 활성화/비활성화', () => {
      debugger.setBreakpoint(10);

      debugger.toggleBreakpoint(10, false);
      expect(debugger.getBreakpoints()[0]?.enabled).toBe(false);

      debugger.toggleBreakpoint(10, true);
      expect(debugger.getBreakpoints()[0]?.enabled).toBe(true);
    });

    test('브레이크포인트 체크 - 조건 없음', () => {
      debugger.setBreakpoint(10);
      const variables = { I: 5, X: 10 };

      const hit = debugger.checkBreakpoint(10, variables);
      expect(hit).toBe(true);
      expect(debugger.getBreakpoints()[0]?.hitCount).toBe(1);
    });

    test('브레이크포인트 체크 - 조건 성공', () => {
      debugger.setBreakpoint(10, 'I > 5');

      const hit1 = debugger.checkBreakpoint(10, { I: 3 });
      expect(hit1).toBe(false);

      const hit2 = debugger.checkBreakpoint(10, { I: 10 });
      expect(hit2).toBe(true);
    });

    test('브레이크포인트 체크 - 비활성화', () => {
      debugger.setBreakpoint(10);
      debugger.toggleBreakpoint(10, false);

      const hit = debugger.checkBreakpoint(10, {});
      expect(hit).toBe(false);
    });

    test('조건 평가 - 다양한 연산자', () => {
      debugger.setBreakpoint(10, 'X = 10');
      expect(debugger.checkBreakpoint(10, { X: 10 })).toBe(true);
      expect(debugger.checkBreakpoint(10, { X: 5 })).toBe(false);

      debugger.setBreakpoint(20, 'Y != 0');
      expect(debugger.checkBreakpoint(20, { Y: 5 })).toBe(true);
      expect(debugger.checkBreakpoint(20, { Y: 0 })).toBe(false);

      debugger.setBreakpoint(30, 'Z >= 100');
      expect(debugger.checkBreakpoint(30, { Z: 100 })).toBe(true);
      expect(debugger.checkBreakpoint(30, { Z: 99 })).toBe(false);
    });
  });

  describe('변수 워치', () => {
    test('변수 워치 추가', () => {
      debugger.addWatch('I');
      debugger.addWatch('X');

      const watches = debugger.getWatches();
      expect(watches.length).toBe(2);
      expect(watches[0]?.name).toBe('I');
      expect(watches[1]?.name).toBe('X');
    });

    test('변수 워치 제거', () => {
      debugger.addWatch('I');
      debugger.addWatch('X');

      debugger.removeWatch('I');
      expect(debugger.getWatches().length).toBe(1);
      expect(debugger.getWatches()[0]?.name).toBe('X');
    });

    test('모든 워치 제거', () => {
      debugger.addWatch('I');
      debugger.addWatch('X');

      debugger.clearWatches();
      expect(debugger.getWatches().length).toBe(0);
    });

    test('워치 업데이트', () => {
      debugger.addWatch('I');
      debugger.addWatch('X');

      const variables = { I: 10, X: 'hello' };
      debugger.updateWatches(variables);

      const watches = debugger.getWatches();
      expect(watches[0]?.value).toBe(10);
      expect(watches[0]?.type).toBe('number');
      expect(watches[1]?.value).toBe('hello');
      expect(watches[1]?.type).toBe('string');
    });

    test('워치 변경 감지', () => {
      let changedWatch: any = null;

      debugger.on('watch-changed', (watch) => {
        changedWatch = watch;
      });

      debugger.addWatch('I');
      debugger.updateWatches({ I: 5 });

      expect(changedWatch).not.toBeNull();
      expect(changedWatch.name).toBe('I');
      expect(changedWatch.value).toBe(5);
    });
  });

  describe('콜스택 관리', () => {
    test('콜스택 푸시', () => {
      debugger.pushCallStack({ lineNumber: 100, type: 'GOSUB', returnLine: 10 });
      debugger.pushCallStack({ lineNumber: 200, type: 'FOR' });

      const stack = debugger.getCallStack();
      expect(stack.length).toBe(2);
      expect(stack[0]?.lineNumber).toBe(100);
      expect(stack[1]?.lineNumber).toBe(200);
    });

    test('콜스택 팝', () => {
      debugger.pushCallStack({ lineNumber: 100, type: 'GOSUB' });
      debugger.pushCallStack({ lineNumber: 200, type: 'FOR' });

      const frame = debugger.popCallStack();
      expect(frame?.lineNumber).toBe(200);
      expect(debugger.getCallStack().length).toBe(1);
    });

    test('콜스택 클리어', () => {
      debugger.pushCallStack({ lineNumber: 100, type: 'GOSUB' });
      debugger.pushCallStack({ lineNumber: 200, type: 'FOR' });

      debugger.clearCallStack();
      expect(debugger.getCallStack().length).toBe(0);
    });

    test('빈 콜스택 팝', () => {
      const frame = debugger.popCallStack();
      expect(frame).toBeUndefined();
    });
  });

  describe('실행 추적', () => {
    test('실행 추적 기록', () => {
      debugger.recordTrace(10, { I: 5 }, 'Output 1');
      debugger.recordTrace(20, { I: 10 }, 'Output 2');

      const trace = debugger.getExecutionTrace();
      expect(trace.length).toBe(2);
      expect(trace[0]?.lineNumber).toBe(10);
      expect(trace[1]?.lineNumber).toBe(20);
    });

    test('실행 추적 최대 크기 제한', () => {
      const debuggerWithLimit = new BasicDebugger({ maxTraceSize: 5 });

      for (let i = 0; i < 10; i++) {
        debuggerWithLimit.recordTrace(i * 10, { I: i });
      }

      const trace = debuggerWithLimit.getExecutionTrace();
      expect(trace.length).toBe(5);
      expect(trace[0]?.lineNumber).toBe(50);
      expect(trace[4]?.lineNumber).toBe(90);
    });

    test('실행 추적 클리어', () => {
      debugger.recordTrace(10, { I: 5 });
      debugger.recordTrace(20, { I: 10 });

      debugger.clearExecutionTrace();
      expect(debugger.getExecutionTrace().length).toBe(0);
    });
  });

  describe('성능 프로파일링', () => {
    test('프로파일링 데이터 기록', () => {
      const debuggerWithProfiling = new BasicDebugger({ enableProfiling: true });

      debuggerWithProfiling.recordProfiling(10, 5.5);
      debuggerWithProfiling.recordProfiling(10, 3.2);
      debuggerWithProfiling.recordProfiling(20, 10.0);

      const data = debuggerWithProfiling.getProfilingData();
      expect(data.length).toBe(2);

      const line10 = data.find(d => d.lineNumber === 10);
      expect(line10?.executionCount).toBe(2);
      expect(line10?.totalTime).toBeCloseTo(8.7, 1);
      expect(line10?.averageTime).toBeCloseTo(4.35, 1);
    });

    test('프로파일링 비활성화', () => {
      const debuggerNoProfiling = new BasicDebugger({ enableProfiling: false });

      debuggerNoProfiling.recordProfiling(10, 5.5);
      debuggerNoProfiling.recordProfiling(20, 3.2);

      const data = debuggerNoProfiling.getProfilingData();
      expect(data.length).toBe(0);
    });

    test('프로파일링 데이터 정렬', () => {
      const debuggerWithProfiling = new BasicDebugger({ enableProfiling: true });

      debuggerWithProfiling.recordProfiling(10, 5.0);
      debuggerWithProfiling.recordProfiling(20, 10.0);
      debuggerWithProfiling.recordProfiling(30, 3.0);

      const data = debuggerWithProfiling.getProfilingData();
      expect(data[0]?.lineNumber).toBe(20); // 가장 느린 라인
      expect(data[1]?.lineNumber).toBe(10);
      expect(data[2]?.lineNumber).toBe(30);
    });

    test('프로파일링 데이터 클리어', () => {
      const debuggerWithProfiling = new BasicDebugger({ enableProfiling: true });

      debuggerWithProfiling.recordProfiling(10, 5.5);
      debuggerWithProfiling.clearProfilingData();

      expect(debuggerWithProfiling.getProfilingData().length).toBe(0);
    });
  });

  describe('디버거 상태 관리', () => {
    test('디버거 시작', () => {
      let stateChanged: DebuggerState | null = null;

      debugger.on('state-changed', (state) => {
        stateChanged = state;
      });

      debugger.start();

      expect(debugger.getState()).toBe('running');
      expect(stateChanged).toBe('running');
    });

    test('디버거 일시정지', () => {
      debugger.start();
      debugger.pause();

      expect(debugger.getState()).toBe('paused');
    });

    test('디버거 재개', () => {
      debugger.start();
      debugger.pause();
      debugger.resume();

      expect(debugger.getState()).toBe('running');
      expect(debugger.getStepMode()).toBeNull();
    });

    test('디버거 중지', () => {
      debugger.start();
      debugger.pushCallStack({ lineNumber: 100, type: 'GOSUB' });
      debugger.recordTrace(10, { I: 5 });

      debugger.stop();

      expect(debugger.getState()).toBe('stopped');
      expect(debugger.getCallStack().length).toBe(0);
      expect(debugger.getExecutionTrace().length).toBe(0);
    });

    test('단계별 실행', () => {
      debugger.step('step-in');

      expect(debugger.getState()).toBe('stepping');
      expect(debugger.getStepMode()).toBe('step-in');
    });

    test('현재 라인 설정/가져오기', () => {
      debugger.setCurrentLine(100);
      expect(debugger.getCurrentLine()).toBe(100);

      debugger.setCurrentLine(200);
      expect(debugger.getCurrentLine()).toBe(200);
    });
  });

  describe('디버거 설정', () => {
    test('기본 설정', () => {
      const config = debugger.getConfig();

      expect(config.maxTraceSize).toBe(1000);
      expect(config.pauseOnError).toBe(true);
      expect(config.showVariables).toBe(true);
      expect(config.showCallStack).toBe(true);
      expect(config.enableProfiling).toBe(false);
    });

    test('커스텀 설정', () => {
      const customDebugger = new BasicDebugger({
        maxTraceSize: 500,
        pauseOnError: false,
        enableProfiling: true
      });

      const config = customDebugger.getConfig();
      expect(config.maxTraceSize).toBe(500);
      expect(config.pauseOnError).toBe(false);
      expect(config.enableProfiling).toBe(true);
    });

    test('설정 업데이트', () => {
      debugger.updateConfig({ enableProfiling: true, maxTraceSize: 2000 });

      const config = debugger.getConfig();
      expect(config.enableProfiling).toBe(true);
      expect(config.maxTraceSize).toBe(2000);
    });
  });

  describe('디버거 유틸리티', () => {
    test('디버거 리셋', () => {
      debugger.setBreakpoint(10);
      debugger.addWatch('I');
      debugger.pushCallStack({ lineNumber: 100, type: 'GOSUB' });
      debugger.recordTrace(10, { I: 5 });
      debugger.start();
      debugger.setCurrentLine(50);

      debugger.reset();

      expect(debugger.getBreakpoints().length).toBe(0);
      expect(debugger.getWatches().length).toBe(0);
      expect(debugger.getCallStack().length).toBe(0);
      expect(debugger.getExecutionTrace().length).toBe(0);
      expect(debugger.getState()).toBe('stopped');
      expect(debugger.getStepMode()).toBeNull();
      expect(debugger.getCurrentLine()).toBe(0);
    });

    test('디버거 정보', () => {
      debugger.setBreakpoint(10);
      debugger.setBreakpoint(20);
      debugger.addWatch('I');
      debugger.pushCallStack({ lineNumber: 100, type: 'GOSUB' });
      debugger.recordTrace(10, { I: 5 });
      debugger.start();
      debugger.setCurrentLine(50);

      const info = debugger.getDebugInfo();

      expect(info.state).toBe('running');
      expect(info.currentLine).toBe(50);
      expect(info.breakpoints).toBe(2);
      expect(info.watches).toBe(1);
      expect(info.callStackDepth).toBe(1);
      expect(info.traceSize).toBe(1);
    });
  });

  describe('성능 분석', () => {
    test('성능 보고서 생성', () => {
      const debuggerWithProfiling = new BasicDebugger({ enableProfiling: true });

      debuggerWithProfiling.recordProfiling(10, 5.0);
      debuggerWithProfiling.recordProfiling(10, 3.0);
      debuggerWithProfiling.recordProfiling(20, 10.0);

      const report = debuggerWithProfiling.generatePerformanceReport();

      expect(report.stats.totalExecutionTime).toBeCloseTo(18.0, 1);
      expect(report.stats.totalExecutionCount).toBe(3);
      expect(report.hotspots.length).toBeGreaterThan(0);
    });

    test('성능 보고서 텍스트 출력', () => {
      const debuggerWithProfiling = new BasicDebugger({ enableProfiling: true });

      debuggerWithProfiling.recordProfiling(10, 5.0);
      debuggerWithProfiling.recordProfiling(20, 10.0);

      const text = debuggerWithProfiling.getPerformanceReportText();

      expect(text).toContain('성능 프로파일링 보고서');
      expect(text).toContain('전체 통계');
      expect(text).toContain('총 실행 시간');
    });

    test('ProfilingAnalyzer 접근', () => {
      const analyzer = debugger.getAnalyzer();
      expect(analyzer).toBeDefined();
    });
  });

  describe('이벤트 발생', () => {
    test('브레이크포인트 히트 이벤트', () => {
      let hitEvent: any = null;

      debugger.on('breakpoint-hit', (lineNumber, variables) => {
        hitEvent = { lineNumber, variables };
      });

      debugger.setBreakpoint(10);
      debugger.checkBreakpoint(10, { I: 5 });

      expect(hitEvent).not.toBeNull();
      expect(hitEvent.lineNumber).toBe(10);
      expect(hitEvent.variables.I).toBe(5);
    });

    test('상태 변경 이벤트', () => {
      const states: DebuggerState[] = [];

      debugger.on('state-changed', (state) => {
        states.push(state);
      });

      debugger.start();
      debugger.pause();
      debugger.resume();
      debugger.stop();

      expect(states).toEqual(['running', 'paused', 'running', 'stopped']);
    });
  });
});
