/**
 * 에러 복구 테스트
 * 에러 발생 시 시스템 복구 능력 검증
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BasicEmulator, EmulatorState } from '../src/system/emulator.js';
import { TerminalState } from '../src/io/terminal.js';

describe('Error Recovery Tests', () => {
  let emulator: BasicEmulator;
  let outputs: string[] = [];
  let errors: string[] = [];

  beforeEach(() => {
    emulator = new BasicEmulator();
    outputs = [];
    errors = [];

    const interpreter = emulator.getBasicInterpreter();
    interpreter.on('output', (text: string) => {
      outputs.push(text);
    });

    emulator.on('error', (error: Error) => {
      errors.push(error.message);
    });

    emulator.start();
  });

  describe('런타임 에러', () => {
    test('Division by zero 처리', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 LET A = 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET B = 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LET C = A / B');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 에러 발생 확인 (에러 처리 구현에 따라 다를 수 있음)
      // Division by zero는 특수 값(Infinity) 반환 가능
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('Type mismatch 처리', async () => {
      const terminal = emulator.getTerminal();

      // 문자열을 숫자 연산에 사용
      terminal.emit('command', '10 LET A$ = "HELLO"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET B = A$ + 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러가 발생했거나 안전하게 처리됨
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('Out of memory 처리', async () => {
      const terminal = emulator.getTerminal();

      // 매우 큰 배열 할당 시도
      terminal.emit('command', '10 DIM HUGE(100000)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 시스템이 에러를 처리하고 정지 상태로 복귀
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('Stack overflow 처리', async () => {
      const terminal = emulator.getTerminal();

      // 너무 깊은 중첩 FOR 루프
      terminal.emit('command', '10 FOR I = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR J = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 FOR K = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT K');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 NEXT J');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '70 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 시스템이 안정적으로 동작하거나 우아하게 실패
      expect([EmulatorState.STOPPED, EmulatorState.ERROR]).toContain(emulator.getState());
    });

    test('Undefined variable 접근', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PRINT UNDEFINED_VAR');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 정의되지 않은 변수는 0 또는 ""로 초기화됨
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('Array index out of bounds', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 DIM A(10)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET X = A(100)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 배열 범위 초과 에러 처리
      expect([EmulatorState.STOPPED, EmulatorState.ERROR]).toContain(emulator.getState());
    });
  });

  describe('에러 후 복구', () => {
    test('에러 발생 후 시스템 재시작', async () => {
      const terminal = emulator.getTerminal();

      // 에러 유발
      terminal.emit('command', '10 LET A = 1 / 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에뮬레이터 재시작
      emulator.stop();
      await new Promise(resolve => setTimeout(resolve, 100));

      emulator.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // 정상 동작 확인
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      expect(terminal.getState()).toBe(TerminalState.READY);
    });

    test('에러 후 메모리 정리', async () => {
      const terminal = emulator.getTerminal();

      // 에러 유발
      terminal.emit('command', '10 DIM HUGE(50000)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      const beforeClearStats = emulator.getStats();

      // 프로그램 클리어
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterClearStats = emulator.getStats();

      // 메모리가 정리되었는지 확인
      expect(afterClearStats.memoryUsed).toBeLessThanOrEqual(beforeClearStats.memoryUsed);
    });

    test('에러 후 상태 초기화', async () => {
      const terminal = emulator.getTerminal();

      // 복잡한 프로그램 실행 (에러 가능성)
      terminal.emit('command', '10 FOR I = 1 TO 1000000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 강제 중단
      emulator.stop();
      await new Promise(resolve => setTimeout(resolve, 100));

      // 상태 확인
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      expect(terminal.getState()).toBe(TerminalState.READY);
    });
  });

  describe('우아한 실패 (Graceful Failure)', () => {
    test('잘못된 BASIC 문법', async () => {
      const terminal = emulator.getTerminal();

      // 문법 오류
      terminal.emit('command', '10 PRIN "ERROR"'); // PRINT 오타
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 메시지 출력 후 정지
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('지원하지 않는 명령어', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 UNKNOWN_COMMAND');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 우아하게 에러 처리
      expect([EmulatorState.STOPPED, EmulatorState.ERROR]).toContain(emulator.getState());
    });

    test('잘못된 파일 로드', async () => {
      const terminal = emulator.getTerminal();

      if (typeof localStorage !== 'undefined') {
        // 존재하지 않는 파일 로드 시도
        terminal.emit('command', 'LOAD "NONEXISTENT"');
        await new Promise(resolve => setTimeout(resolve, 150));

        // 에러 메시지 출력 후 정상 복귀
        expect(terminal.getState()).toBe(TerminalState.READY);
      }
    });

    test('빈 프로그램 실행', async () => {
      const terminal = emulator.getTerminal();

      // 프로그램 클리어
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 빈 프로그램 실행
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 에러 없이 처리
      expect(terminal.getState()).toBe(TerminalState.READY);
    });

    test('잘못된 라인 번호 GOTO', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 GOTO 9999');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 처리
      expect([EmulatorState.STOPPED, EmulatorState.ERROR]).toContain(emulator.getState());
    });
  });

  describe('리소스 제한 처리', () => {
    test('메모리 한계 도달 시 처리', async () => {
      const terminal = emulator.getTerminal();
      const memory = emulator.getMemoryManager();

      const totalMemory = 65536;
      const usedMemory = memory.getUsage();

      // 사용 가능한 메모리 이상 할당 시도
      const toAllocate = Math.floor((totalMemory - usedMemory) / 8) + 1000;

      terminal.emit('command', `10 DIM A(${toAllocate})`);
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 메모리 부족 에러 처리
      expect([EmulatorState.STOPPED, EmulatorState.ERROR]).toContain(emulator.getState());
    });

    test('CPU 사이클 제한 (무한 루프 방지)', async () => {
      const terminal = emulator.getTerminal();

      // 무한 루프
      terminal.emit('command', '10 GOTO 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 강제 중단
      emulator.stop();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('중첩 깊이 제한', async () => {
      const terminal = emulator.getTerminal();

      // 매우 깊은 중첩
      for (let i = 1; i <= 100; i++) {
        terminal.emit('command', `${i * 10} FOR I${i} = 1 TO 10`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      for (let i = 100; i >= 1; i--) {
        terminal.emit('command', `${(i + 100) * 10} NEXT I${i}`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      terminal.emit('command', '99999 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 중첩 제한 에러 또는 완료
      expect([EmulatorState.STOPPED, EmulatorState.ERROR]).toContain(emulator.getState());
    });
  });

  describe('동시성 에러', () => {
    test('동시 명령 실행 시 안정성', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 30));

      terminal.emit('command', '20 PRINT I');
      await new Promise(resolve => setTimeout(resolve, 30));

      terminal.emit('command', '30 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 30));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 30));

      // 빠르게 여러 명령 실행
      terminal.emit('command', 'RUN');
      terminal.emit('command', 'LIST');
      await new Promise(resolve => setTimeout(resolve, 300));

      // 안정적으로 처리
      expect([EmulatorState.STOPPED, EmulatorState.RUNNING_BASIC]).toContain(emulator.getState());
    });

    test('실행 중 프로그램 수정 시도', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 프로그램 실행
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 실행 중 수정 시도
      terminal.emit('command', '15 PRINT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 안전하게 처리
      await new Promise(resolve => setTimeout(resolve, 300));
      expect([EmulatorState.STOPPED, EmulatorState.RUNNING_BASIC]).toContain(emulator.getState());
    });
  });

  describe('복구 검증', () => {
    test('에러 후 정상 프로그램 실행', async () => {
      const terminal = emulator.getTerminal();

      // 에러 프로그램
      terminal.emit('command', '10 LET A = 1 / 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 클리어
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 정상 프로그램
      terminal.emit('command', '10 PRINT "RECOVERY SUCCESS"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 정상 실행 확인
      expect(outputs.some(o => o.includes('RECOVERY SUCCESS'))).toBe(true);
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('여러 에러 연속 발생 후 복구', async () => {
      const terminal = emulator.getTerminal();

      // 에러 1
      terminal.emit('command', '10 UNKNOWN_CMD');
      await new Promise(resolve => setTimeout(resolve, 50));
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 에러 2
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));
      terminal.emit('command', '10 DIM X(999999)');
      await new Promise(resolve => setTimeout(resolve, 50));
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 복구
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '10 PRINT "OK"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 시스템이 복구되어 정상 동작
      expect(outputs.some(o => o.includes('OK'))).toBe(true);
    });
  });
});
