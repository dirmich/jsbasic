/**
 * 터미널 인터페이스 테스트
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { Terminal, TerminalState } from '../../io/terminal.js';

describe('Terminal 인터페이스', () => {
  let terminal: Terminal;

  beforeEach(() => {
    terminal = new Terminal();
  });

  describe('초기화', () => {
    test('기본 설정으로 초기화', () => {
      const config = terminal.getConfig();
      expect(config.width).toBe(80);
      expect(config.height).toBe(24);
      expect(config.maxHistory).toBe(1000);
      expect(config.prompt).toBe('READY.');
    });

    test('사용자 정의 설정으로 초기화', () => {
      const customTerminal = new Terminal({
        width: 40,
        height: 12,
        prompt: 'OK'
      });
      
      const config = customTerminal.getConfig();
      expect(config.width).toBe(40);
      expect(config.height).toBe(12);
      expect(config.prompt).toBe('OK');
    });

    test('초기 상태는 READY', () => {
      expect(terminal.getState()).toBe(TerminalState.READY);
    });
  });

  describe('텍스트 출력', () => {
    test('단일 라인 출력', () => {
      terminal.write('Hello World');
      
      const history = terminal.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Hello World');
      expect(history[0].type).toBe('output');
    });

    test('여러 라인 출력', () => {
      terminal.writeLine('Line 1');
      terminal.writeLine('Line 2');
      terminal.writeLine('Line 3');
      
      const history = terminal.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('Line 1\n');
      expect(history[1].content).toBe('Line 2\n');
      expect(history[2].content).toBe('Line 3\n');
    });

    test('다양한 타입의 출력', () => {
      terminal.write('Normal output', 'output');
      terminal.write('Error message', 'error');
      terminal.write('System message', 'system');
      terminal.write('User input', 'input');
      
      const history = terminal.getHistory();
      expect(history[0].type).toBe('output');
      expect(history[1].type).toBe('error');
      expect(history[2].type).toBe('system');
      expect(history[3].type).toBe('input');
    });

    test('탭 문자 처리', () => {
      terminal.write('A\tB\tC');
      
      const history = terminal.getHistory();
      const content = history[0].content;
      
      // 탭이 공백으로 변환되어야 함
      expect(content.includes('\t')).toBe(false);
      expect(content.length).toBeGreaterThan(3);
    });
  });

  describe('커서 및 위치 관리', () => {
    test('초기 커서 위치', () => {
      const cursor = terminal.getCursor();
      expect(cursor.x).toBe(0);
      expect(cursor.y).toBe(0);
    });

    test('새 줄 후 커서 위치 업데이트', () => {
      terminal.write('First line\n');
      terminal.write('Second line');
      
      const cursor = terminal.getCursor();
      expect(cursor.y).toBe(1);
    });
  });

  describe('키보드 입력 처리', () => {
    test('문자 키 입력', () => {
      terminal.handleKeyInput('H');
      terminal.handleKeyInput('i');
      
      expect(terminal.getInputBuffer()).toBe('Hi');
    });

    test('Backspace 키 처리', () => {
      terminal.handleKeyInput('H');
      terminal.handleKeyInput('e');
      terminal.handleKeyInput('l');
      terminal.handleKeyInput('Backspace');
      
      expect(terminal.getInputBuffer()).toBe('He');
    });

    test('Tab 키 처리', () => {
      terminal.handleKeyInput('A');
      terminal.handleKeyInput('Tab');
      terminal.handleKeyInput('B');
      
      expect(terminal.getInputBuffer()).toContain('\t');
    });
  });

  describe('사용자 입력 요청', () => {
    test('입력 요청 시 상태 변경', async () => {
      const inputPromise = terminal.requestInput('Enter name: ');
      
      expect(terminal.getState()).toBe(TerminalState.INPUT);
      
      // 입력 시뮬레이션
      terminal.handleKeyInput('J');
      terminal.handleKeyInput('o');
      terminal.handleKeyInput('h');
      terminal.handleKeyInput('n');
      terminal.handleKeyInput('Enter');
      
      const result = await inputPromise;
      expect(result).toBe('John');
      expect(terminal.getState()).toBe(TerminalState.READY);
    });

    test('프롬프트 없는 입력 요청', async () => {
      const inputPromise = terminal.requestInput();
      
      expect(terminal.getState()).toBe(TerminalState.INPUT);
      
      terminal.handleKeyInput('t');
      terminal.handleKeyInput('e');
      terminal.handleKeyInput('s');
      terminal.handleKeyInput('t');
      terminal.handleKeyInput('Enter');
      
      const result = await inputPromise;
      expect(result).toBe('test');
    });
  });

  describe('명령 처리', () => {
    test('명령 이벤트 발생', () => {
      let receivedCommand = '';
      
      terminal.on('command', (command) => {
        receivedCommand = command;
      });
      
      terminal.handleKeyInput('L');
      terminal.handleKeyInput('I');
      terminal.handleKeyInput('S');
      terminal.handleKeyInput('T');
      terminal.handleKeyInput('Enter');
      
      expect(receivedCommand).toBe('LIST');
    });

    test('빈 명령 처리', () => {
      let commandFired = false;
      
      terminal.on('command', () => {
        commandFired = true;
      });
      
      terminal.handleKeyInput('Enter');
      
      expect(commandFired).toBe(false);
    });
  });

  describe('상태 관리', () => {
    test('상태 설정 및 이벤트', () => {
      let stateChangeEvent: any = null;
      
      terminal.on('stateChange', (event) => {
        stateChangeEvent = event;
      });
      
      terminal.setState(TerminalState.RUNNING);
      
      expect(terminal.getState()).toBe(TerminalState.RUNNING);
      expect(stateChangeEvent.from).toBe(TerminalState.READY);
      expect(stateChangeEvent.to).toBe(TerminalState.RUNNING);
    });

    test('동일 상태 설정 시 이벤트 미발생', () => {
      let eventCount = 0;
      
      terminal.on('stateChange', () => {
        eventCount++;
      });
      
      terminal.setState(TerminalState.READY);
      terminal.setState(TerminalState.READY);
      
      expect(eventCount).toBe(0);
    });
  });

  describe('인터럽트 처리', () => {
    test('실행 중 인터럽트', () => {
      let interruptFired = false;
      
      terminal.on('interrupt', () => {
        interruptFired = true;
      });
      
      terminal.setState(TerminalState.RUNNING);
      terminal.interrupt();
      
      expect(interruptFired).toBe(true);
      expect(terminal.getState()).toBe(TerminalState.READY);
    });

    test('Escape 키로 인터럽트', () => {
      let interruptFired = false;
      
      terminal.on('interrupt', () => {
        interruptFired = true;
      });
      
      terminal.setState(TerminalState.RUNNING);
      terminal.handleKeyInput('Escape');
      
      expect(interruptFired).toBe(true);
    });

    test('READY 상태에서 인터럽트 무효', () => {
      let interruptFired = false;
      
      terminal.on('interrupt', () => {
        interruptFired = true;
      });
      
      terminal.interrupt();
      
      expect(interruptFired).toBe(false);
    });
  });

  describe('화면 관리', () => {
    test('화면 지우기', () => {
      terminal.writeLine('Line 1');
      terminal.writeLine('Line 2');
      
      terminal.clear();
      
      expect(terminal.getHistory()).toHaveLength(0);
      
      const cursor = terminal.getCursor();
      expect(cursor.x).toBe(0);
      expect(cursor.y).toBe(0);
    });

    test('히스토리 제한', () => {
      const smallTerminal = new Terminal({ maxHistory: 3 });
      
      smallTerminal.writeLine('Line 1');
      smallTerminal.writeLine('Line 2');
      smallTerminal.writeLine('Line 3');
      smallTerminal.writeLine('Line 4');
      smallTerminal.writeLine('Line 5');
      
      const history = smallTerminal.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('Line 3\n');
      expect(history[2].content).toBe('Line 5\n');
    });
  });

  describe('설정 관리', () => {
    test('설정 업데이트', () => {
      let configChanged = false;
      
      terminal.on('configChange', () => {
        configChanged = true;
      });
      
      terminal.updateConfig({ prompt: 'NEW>' });
      
      expect(configChanged).toBe(true);
      expect(terminal.getConfig().prompt).toBe('NEW>');
    });
  });

  describe('이벤트 시스템', () => {
    test('출력 이벤트', () => {
      let outputEvent: any = null;
      
      terminal.on('output', (event) => {
        outputEvent = event;
      });
      
      terminal.write('Test output', 'system');
      
      expect(outputEvent.text).toBe('Test output');
      expect(outputEvent.type).toBe('system');
    });

    test('입력 변경 이벤트', () => {
      let inputBuffer = '';
      
      terminal.on('inputChange', (buffer) => {
        inputBuffer = buffer;
      });
      
      terminal.handleKeyInput('H');
      terminal.handleKeyInput('i');
      
      expect(inputBuffer).toBe('Hi');
    });

    test('클리어 이벤트', () => {
      let clearFired = false;
      
      terminal.on('clear', () => {
        clearFired = true;
      });
      
      terminal.clear();
      
      expect(clearFired).toBe(true);
    });

    test('입력 요청 이벤트', () => {
      let inputRequestFired = false;
      
      terminal.on('inputRequest', () => {
        inputRequestFired = true;
      });
      
      terminal.requestInput('Test: ');
      
      expect(inputRequestFired).toBe(true);
    });
  });

  describe('디버깅 정보', () => {
    test('디버그 정보 반환', () => {
      terminal.writeLine('Test line');
      terminal.handleKeyInput('A');
      
      const debugInfo = terminal.getDebugInfo();
      
      expect(debugInfo.state).toBe(TerminalState.READY);
      expect(debugInfo.lineCount).toBe(1);
      expect(debugInfo.inputBufferLength).toBe(1);
      expect(debugInfo.cursor).toBeDefined();
      expect(debugInfo.currentColumn).toBeDefined();
    });
  });
});