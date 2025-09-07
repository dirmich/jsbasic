/**
 * 6502 BASIC 에뮬레이터 통합 시스템 테스트
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { BasicEmulator, EmulatorState } from '../../system/emulator.js';

describe('BasicEmulator 통합 시스템', () => {
  let emulator: BasicEmulator;

  beforeEach(() => {
    emulator = new BasicEmulator();
  });

  describe('초기화', () => {
    test('기본 설정으로 초기화', () => {
      const config = emulator.getConfig();
      
      expect(config.cpuFrequency).toBe(1000000);
      expect(config.memorySize).toBe(65536);
      expect(config.terminal.width).toBe(80);
      expect(config.terminal.height).toBe(24);
    });

    test('사용자 정의 설정으로 초기화', () => {
      const customEmulator = new BasicEmulator({
        cpuFrequency: 2000000,
        memorySize: 32768,
        terminal: { width: 40, height: 12 }
      });
      
      const config = customEmulator.getConfig();
      expect(config.cpuFrequency).toBe(2000000);
      expect(config.memorySize).toBe(32768);
      expect(config.terminal.width).toBe(40);
    });

    test('초기 상태는 STOPPED', () => {
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('컴포넌트들이 정상 초기화됨', () => {
      expect(emulator.getCPU()).toBeDefined();
      expect(emulator.getBasicInterpreter()).toBeDefined();
      expect(emulator.getMemoryManager()).toBeDefined();
      expect(emulator.getTerminal()).toBeDefined();
    });
  });

  describe('에뮬레이터 제어', () => {
    test('시작 및 중지', () => {
      let startEventFired = false;
      let stopEventFired = false;

      emulator.on('start', () => {
        startEventFired = true;
      });

      emulator.on('stop', () => {
        stopEventFired = true;
      });

      emulator.start();
      expect(emulator.getState()).toBe(EmulatorState.RUNNING_BASIC);
      expect(startEventFired).toBe(true);

      emulator.stop();
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      expect(stopEventFired).toBe(true);
    });

    test('중복 시작 무시', () => {
      emulator.start();
      const firstState = emulator.getState();

      emulator.start();
      expect(emulator.getState()).toBe(firstState);
    });

    test('중복 중지 무시', () => {
      emulator.stop();
      const firstState = emulator.getState();

      emulator.stop();
      expect(emulator.getState()).toBe(firstState);
    });
  });

  describe('BASIC 명령 처리', () => {
    beforeEach(() => {
      emulator.start();
    });

    test('NEW 명령', async () => {
      const terminal = emulator.getTerminal();
      
      // NEW 명령 실행
      await terminal.emit('command', 'NEW');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('NEW PROGRAM'))).toBe(true);
    });

    test('프로그램 라인 입력', async () => {
      const terminal = emulator.getTerminal();
      
      // 프로그램 라인 입력
      await terminal.emit('command', '10 PRINT "HELLO"');
      
      // LIST 명령으로 확인
      await terminal.emit('command', 'LIST');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('10'))).toBe(true);
    });

    test('즉시 실행 명령', async () => {
      const terminal = emulator.getTerminal();
      
      // 즉시 실행
      await terminal.emit('command', 'PRINT "IMMEDIATE"');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('IMMEDIATE'))).toBe(true);
    });

    test('RUN 명령 (프로그램 없음)', async () => {
      const terminal = emulator.getTerminal();
      
      await terminal.emit('command', 'RUN');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('NO PROGRAM'))).toBe(true);
    });

    test('RUN 명령 (프로그램 있음)', async () => {
      const terminal = emulator.getTerminal();
      
      // 프로그램 입력
      await terminal.emit('command', '10 PRINT "TEST"');
      await terminal.emit('command', '20 END');
      
      // 실행
      await terminal.emit('command', 'RUN');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('TEST'))).toBe(true);
    });

    test('STOP 명령', async () => {
      const terminal = emulator.getTerminal();
      
      await terminal.emit('command', 'STOP');
      
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('STOP'))).toBe(true);
    });
  });

  describe('프로그램 저장/로드', () => {
    beforeEach(() => {
      emulator.start();
      
      // localStorage 모킹
      global.localStorage = {
        getItem: (key: string) => {
          if (key === 'basic_program_test') {
            return JSON.stringify({
              statements: [
                { type: 'PrintStatement', lineNumber: 10 }
              ]
            });
          }
          return null;
        },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      };
    });

    test('SAVE 명령 (프로그램 없음)', async () => {
      const terminal = emulator.getTerminal();
      
      await terminal.emit('command', 'SAVE "test"');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('NO PROGRAM TO SAVE'))).toBe(true);
    });

    test('SAVE 명령 (프로그램 있음)', async () => {
      const terminal = emulator.getTerminal();
      
      // 프로그램 입력
      await terminal.emit('command', '10 PRINT "TEST"');
      
      await terminal.emit('command', 'SAVE "test"');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('SAVED "test"'))).toBe(true);
    });

    test('LOAD 명령 (파일 있음)', async () => {
      const terminal = emulator.getTerminal();
      
      await terminal.emit('command', 'LOAD "test"');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('LOADED "test"'))).toBe(true);
    });

    test('LOAD 명령 (파일 없음)', async () => {
      const terminal = emulator.getTerminal();
      
      await terminal.emit('command', 'LOAD "nonexistent"');
      
      const history = terminal.getHistory();
      expect(history.some(line => line.content.includes('FILE NOT FOUND'))).toBe(true);
    });
  });

  describe('에러 처리', () => {
    beforeEach(() => {
      emulator.start();
    });

    test('구문 에러 처리', async () => {
      let errorEvent: any = null;
      
      emulator.on('error', (error) => {
        errorEvent = error;
      });
      
      const terminal = emulator.getTerminal();
      await terminal.emit('command', '10 INVALID SYNTAX');
      
      expect(emulator.getState()).toBe(EmulatorState.ERROR);
      expect(errorEvent).toBeTruthy();
    });

    test('실행 에러 처리', async () => {
      const terminal = emulator.getTerminal();
      
      // 에러가 발생할 수 있는 프로그램
      await terminal.emit('command', '10 GOTO 999');
      await terminal.emit('command', 'RUN');
      
      expect(emulator.getState()).toBe(EmulatorState.ERROR);
    });
  });

  describe('상태 관리', () => {
    test('상태 변경 이벤트', () => {
      let stateChangeEvents: any[] = [];
      
      emulator.on('stateChange', (event) => {
        stateChangeEvents.push(event);
      });
      
      emulator.start();
      emulator.stop();
      
      expect(stateChangeEvents).toHaveLength(2);
      expect(stateChangeEvents[0].to).toBe(EmulatorState.RUNNING_BASIC);
      expect(stateChangeEvents[1].to).toBe(EmulatorState.STOPPED);
    });
  });

  describe('통계 및 디버깅', () => {
    test('통계 정보 반환', () => {
      emulator.start();
      
      const stats = emulator.getStats();
      
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('instructionsExecuted');
      expect(stats).toHaveProperty('basicLinesExecuted');
      expect(stats).toHaveProperty('memoryUsed');
      expect(stats).toHaveProperty('cpuCycles');
    });

    test('디버그 정보 반환', () => {
      const debugInfo = emulator.getDebugInfo();
      
      expect(debugInfo.state).toBeDefined();
      expect(debugInfo.uptime).toBeDefined();
      expect(debugInfo.components.cpu).toBeDefined();
      expect(debugInfo.components.basic).toBeDefined();
      expect(debugInfo.components.memory).toBeDefined();
      expect(debugInfo.components.terminal).toBeDefined();
    });

    test('업타임 계산', () => {
      emulator.start();
      
      // 약간의 지연
      setTimeout(() => {
        const stats = emulator.getStats();
        expect(stats.uptime).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('컴포넌트 접근', () => {
    test('CPU 접근', () => {
      const cpu = emulator.getCPU();
      expect(cpu).toBeDefined();
      expect(typeof cpu.reset).toBe('function');
    });

    test('BASIC 인터프리터 접근', () => {
      const basic = emulator.getBasicInterpreter();
      expect(basic).toBeDefined();
      expect(typeof basic.reset).toBe('function');
    });

    test('메모리 매니저 접근', () => {
      const memory = emulator.getMemoryManager();
      expect(memory).toBeDefined();
      expect(typeof memory.read).toBe('function');
    });

    test('터미널 접근', () => {
      const terminal = emulator.getTerminal();
      expect(terminal).toBeDefined();
      expect(typeof terminal.write).toBe('function');
    });
  });
});