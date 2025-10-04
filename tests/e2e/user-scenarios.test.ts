/**
 * E2E 사용자 시나리오 테스트
 * 실제 사용자 워크플로우를 시뮬레이션
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { BasicEmulator, EmulatorState } from '../../src/system/emulator.js';
import { TerminalState } from '../../src/io/terminal.js';

describe('E2E User Scenarios', () => {
  let emulator: BasicEmulator;
  let outputs: string[] = [];

  beforeEach(() => {
    emulator = new BasicEmulator();
    outputs = [];

    const interpreter = emulator.getBasicInterpreter();
    interpreter.on('output', (text: string) => {
      outputs.push(text);
    });

    emulator.start();
  });

  afterEach(() => {
    emulator.stop();
  });

  describe('워크플로우 1: 초보자 경험', () => {
    test('에뮬레이터 시작 → 예제 로드 → 실행 → 결과 확인', async () => {
      const terminal = emulator.getTerminal();

      // 1. 에뮬레이터 시작 확인
      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
      expect(terminal.getState()).toBe(TerminalState.READY);

      // 2. 간단한 예제 프로그램 입력
      terminal.emit('command', '10 PRINT "HELLO, BEGINNER!"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PRINT "WELCOME TO BASIC"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 3. 프로그램 확인 (LIST)
      terminal.emit('command', 'LIST');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 4. 실행 (RUN)
      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 5. 결과 확인
      expect(outputs.some(o => o.includes('HELLO, BEGINNER!'))).toBe(true);
      expect(outputs.some(o => o.includes('WELCOME TO BASIC'))).toBe(true);
    });

    test('프로그램 수정 → 다시 실행', async () => {
      const terminal = emulator.getTerminal();

      // 초기 프로그램
      terminal.emit('command', '10 PRINT "VERSION 1"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 첫 실행
      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(outputs.some(o => o.includes('VERSION 1'))).toBe(true);

      // 수정 (10번 라인 재입력)
      terminal.emit('command', '10 PRINT "VERSION 2 - UPDATED"');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 다시 실행
      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(outputs.some(o => o.includes('VERSION 2'))).toBe(true);
      expect(outputs.some(o => o.includes('VERSION 1'))).toBe(false);
    });

    test('에러 발생 → 수정 → 재실행', async () => {
      const terminal = emulator.getTerminal();

      // 잘못된 프로그램 (문법 오류)
      terminal.emit('command', '10 PRITN "ERROR"'); // PRINT 오타
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 실행 시도 (에러 발생 예상)
      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 수정
      terminal.emit('command', '10 PRINT "FIXED"');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 재실행
      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(outputs.some(o => o.includes('FIXED'))).toBe(true);
    });
  });

  describe('워크플로우 2: 프로그래머 경험', () => {
    test('새 프로그램 작성 → 디버깅 → 저장', async () => {
      const terminal = emulator.getTerminal();

      // 1. 새 프로그램 작성
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '10 LET TOTAL = 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LET TOTAL = TOTAL + I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 PRINT "TOTAL: "; TOTAL');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 2. LIST로 프로그램 확인
      terminal.emit('command', 'LIST');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. 실행 및 결과 확인
      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      const outputText = outputs.join('');
      expect(outputText).toContain('55'); // 1+2+...+10 = 55

      // 4. 저장 (브라우저 환경에서만)
      if (typeof localStorage !== 'undefined') {
        terminal.emit('command', 'SAVE "SUMTEST"');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    test('복잡한 프로그램 - 배열과 함수', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 DIM A(10)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 A(I) = I * I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 PRINT A(5)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(outputs.some(o => o.includes('25'))).toBe(true); // 5 * 5 = 25
    });

    test('중첩 루프 프로그램', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 3');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR J = 1 TO 3');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PRINT I; ","; J');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT J');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 250));

      const outputText = outputs.join('');
      expect(outputText).toContain('1');
      expect(outputText).toContain('3');
    });
  });

  describe('워크플로우 3: 게임 개발자 경험', () => {
    test('그래픽 게임 스켈레톤', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      // 화면 초기화
      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 CLS');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 간단한 스프라이트 그리기
      terminal.emit('command', '30 FOR Y = 0 TO 5');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 FOR X = 0 TO 5');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 PSET (X + 10, Y + 10), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 NEXT X');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '70 NEXT Y');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '80 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 300));

      // 스프라이트가 그려졌는지 확인
      const pixel = pixelBuffer.getPixel(12, 12);
      expect(pixel).toBe(15);
    });

    test('사운드와 그래픽 결합', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 5');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 CIRCLE (I * 30, 100), 10, I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 SOUND 440 + I * 100, 200');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 400));

      expect(emulator.getState()).toBe(EmulatorState.STOPPED);
    });

    test('간단한 애니메이션 루프', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 간단한 "애니메이션" (실제로는 여러 위치에 그리기)
      terminal.emit('command', '20 FOR POS = 10 TO 50 STEP 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PSET (POS, 100), 14');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT POS');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 여러 위치에 픽셀이 그려졌는지 확인
      expect(pixelBuffer.getPixel(10, 100)).toBe(14);
      expect(pixelBuffer.getPixel(50, 100)).toBe(14);
    });
  });

  describe('워크플로우 4: 모바일 사용자', () => {
    test('모바일 최적화 초기화', () => {
      // 모바일 환경 체크 (Node.js 환경에서는 스킵)
      if (typeof window === 'undefined') {
        expect(true).toBe(true); // 스킵
        return;
      }

      // 모바일 최적화 초기화
      const container = document.createElement('div');
      emulator.initializeMobileOptimization(container);

      expect(emulator.isMobileOptimized()).toBe(true);

      // 정리
      emulator.disableMobileOptimization();
      expect(emulator.isMobileOptimized()).toBe(false);
    });

    test('모바일 제스처 처리 시뮬레이션', () => {
      if (typeof window === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const container = document.createElement('div');
      emulator.initializeMobileOptimization(container);

      let tapReceived = false;
      emulator.on('mobile:tap', () => {
        tapReceived = true;
      });

      // 제스처 핸들러 시뮬레이션
      const gestureHandler = emulator.getGestureHandler();
      if (gestureHandler) {
        gestureHandler.emit('tap', { x: 100, y: 100 });
        expect(tapReceived).toBe(true);
      }

      emulator.disableMobileOptimization();
    });

    test('반응형 레이아웃 적용', () => {
      if (typeof window === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const container = document.createElement('div');
      emulator.initializeMobileOptimization(container);

      const layout = emulator.getResponsiveLayout();
      expect(layout).toBeDefined();

      if (layout) {
        const metrics = layout.getMetrics();
        expect(metrics).toBeDefined();
      }

      emulator.disableMobileOptimization();
    });
  });

  describe('통합 워크플로우: 전체 세션', () => {
    test('프로그램 작성 → 저장 → 종료 → 재시작 → 로드 → 실행', async () => {
      const terminal = emulator.getTerminal();

      // 1. 프로그램 작성
      terminal.emit('command', '10 PRINT "SESSION TEST"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 3');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PRINT "COUNT: "; I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 2. 저장
      if (typeof localStorage !== 'undefined') {
        terminal.emit('command', 'SAVE "SESSION"');
        await new Promise(resolve => setTimeout(resolve, 100));

        // 3. 에뮬레이터 재시작
        emulator.stop();
        await new Promise(resolve => setTimeout(resolve, 100));

        // 새 에뮬레이터 인스턴스
        const newEmulator = new BasicEmulator();
        const newOutputs: string[] = [];
        newEmulator.getBasicInterpreter().on('output', (text: string) => {
          newOutputs.push(text);
        });
        newEmulator.start();

        // 4. 로드
        const newTerminal = newEmulator.getTerminal();
        newTerminal.emit('command', 'LOAD "SESSION"');
        await new Promise(resolve => setTimeout(resolve, 150));

        // 5. 실행
        newTerminal.emit('command', 'RUN');
        await new Promise(resolve => setTimeout(resolve, 200));

        // 6. 결과 확인
        expect(newOutputs.some(o => o.includes('SESSION TEST'))).toBe(true);
        expect(newOutputs.some(o => o.includes('COUNT'))).toBe(true);

        newEmulator.stop();
      }
    });

    test('여러 프로그램 순차 실행', async () => {
      const terminal = emulator.getTerminal();

      // 첫 번째 프로그램
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '10 PRINT "PROGRAM 1"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(outputs.some(o => o.includes('PROGRAM 1'))).toBe(true);

      // 두 번째 프로그램
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '10 PRINT "PROGRAM 2"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(outputs.some(o => o.includes('PROGRAM 2'))).toBe(true);
      expect(outputs.some(o => o.includes('PROGRAM 1'))).toBe(false);
    });
  });

  describe('사용자 입력 시나리오', () => {
    test('INPUT 문 처리 (자동 입력)', async () => {
      const terminal = emulator.getTerminal();
      const interpreter = emulator.getBasicInterpreter();

      // INPUT 요청 시 자동으로 값 제공
      interpreter.on('inputRequest', async () => {
        interpreter.provideInput(['42']);
      });

      terminal.emit('command', '10 INPUT "ENTER NUMBER: ", X');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PRINT "YOU ENTERED: "; X');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      outputs = [];
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      const outputText = outputs.join('');
      expect(outputText).toContain('42');
    });
  });
});
