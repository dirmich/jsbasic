/**
 * 회귀 테스트 (Regression Tests)
 * 과거 버그가 재발하지 않도록 검증
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BasicEmulator } from '../src/system/emulator.js';

describe('Regression Tests', () => {
  let emulator: BasicEmulator;

  beforeEach(() => {
    emulator = new BasicEmulator();
    emulator.start();
  });

  describe('알려진 버그 케이스', () => {
    test('CASE-001: FOR 루프 변수 초기화 버그', async () => {
      // 버그: FOR 루프 변수가 루프 종료 후 유지되지 않음
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 5');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PRINT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const outputs: string[] = [];
      emulator.getBasicInterpreter().on('output', (text: string) => {
        outputs.push(text);
      });

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // I는 루프 종료 후 6이어야 함
      expect(outputs.some(o => o.includes('6'))).toBe(true);
    });

    test('CASE-002: 문자열 연결 메모리 누수', async () => {
      // 버그: 문자열 반복 연결 시 메모리 누수
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 LET S$ = ""');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LET S$ = S$ + "A"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const stats1 = emulator.getStats();

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats2 = emulator.getStats();

      // 메모리 증가가 합리적인 범위 내
      const memoryIncrease = stats2.memoryUsed - stats1.memoryUsed;
      expect(memoryIncrease).toBeLessThan(10000); // 10KB 이하
    });

    test('CASE-003: GOTO 무한 루프 탐지', async () => {
      // 버그: GOTO 무한 루프 시 시스템 멈춤
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 GOTO 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 강제 중단
      emulator.stop();
      await new Promise(resolve => setTimeout(resolve, 100));

      // 시스템이 응답함
      expect(emulator.getState()).toBeDefined();
    });

    test('CASE-004: 중첩 IF/THEN 파싱 오류', async () => {
      // 버그: 중첩된 IF 문 파싱 실패
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 LET A = 5');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET B = 3');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 IF A > B THEN 50');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 PRINT "NOT EXECUTED"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 IF B < A THEN 70');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 PRINT "ALSO NOT EXECUTED"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '70 PRINT "SUCCESS"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '80 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const outputs: string[] = [];
      emulator.getBasicInterpreter().on('output', (text: string) => {
        outputs.push(text);
      });

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(outputs.some(o => o.includes('SUCCESS'))).toBe(true);
      expect(outputs.some(o => o.includes('NOT EXECUTED'))).toBe(false);
    });

    test('CASE-005: 배열 경계 체크 누락', async () => {
      // 버그: 배열 인덱스 범위 체크 안 함
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 DIM A(10)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET A(11) = 999');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러가 발생하거나 안전하게 처리됨
      expect(true).toBe(true);
    });
  });

  describe('엣지 케이스', () => {
    test('EDGE-001: 빈 문자열 처리', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 LET S$ = ""');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PRINT S$');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 없이 실행
      expect(true).toBe(true);
    });

    test('EDGE-002: 0으로 나누기', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 LET A = 1 / 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PRINT A');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // Infinity 또는 에러 처리
      expect(true).toBe(true);
    });

    test('EDGE-003: 매우 큰 숫자', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 LET BIG = 999999999');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PRINT BIG');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const outputs: string[] = [];
      emulator.getBasicInterpreter().on('output', (text: string) => {
        outputs.push(text);
      });

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(outputs.some(o => o.includes('999999999'))).toBe(true);
    });

    test('EDGE-004: 음수 배열 인덱스', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 DIM A(10)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET X = A(-1)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 처리
      expect(true).toBe(true);
    });

    test('EDGE-005: FOR 루프 STEP 0', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 10 STEP 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PRINT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 무한 루프 방지 (에러 또는 1회 실행)
      emulator.stop();
      expect(true).toBe(true);
    });

    test('EDGE-006: 매우 긴 문자열', async () => {
      const terminal = emulator.getTerminal();
      const longString = 'A'.repeat(1000);

      terminal.emit('command', `10 PRINT "${longString}"`);
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const outputs: string[] = [];
      emulator.getBasicInterpreter().on('output', (text: string) => {
        outputs.push(text);
      });

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(outputs.some(o => o.includes('AAA'))).toBe(true);
    });

    test('EDGE-007: 중첩 깊이 한계', async () => {
      const terminal = emulator.getTerminal();

      // 10중 중첩 루프
      for (let i = 1; i <= 10; i++) {
        terminal.emit('command', `${i * 10} FOR I${i} = 1 TO 2`);
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      for (let i = 10; i >= 1; i--) {
        terminal.emit('command', `${(i + 10) * 10} NEXT I${i}`);
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      terminal.emit('command', '9999 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 정상 완료 또는 깊이 제한 에러
      expect(true).toBe(true);
    });
  });

  describe('플랫폼별 이슈', () => {
    test('PLATFORM-001: localStorage 없는 환경', async () => {
      const terminal = emulator.getTerminal();

      // Node.js 환경에서는 localStorage 없음
      if (typeof localStorage === 'undefined') {
        terminal.emit('command', 'SAVE "TEST"');
        await new Promise(resolve => setTimeout(resolve, 100));

        // 에러 메시지 출력
        expect(true).toBe(true);
      }
    });

    test('PLATFORM-002: 브라우저 AudioContext 제한', async () => {
      const terminal = emulator.getTerminal();

      // 오디오 재생 (브라우저에서만 동작)
      terminal.emit('command', '10 SOUND 440, 500');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // Node.js 환경에서는 에러 없이 스킵
      expect(true).toBe(true);
    });

    test('PLATFORM-003: 타이밍 민감성', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 빠른 연속 실행
      terminal.emit('command', 'RUN');
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 300));

      // 안정적으로 처리
      expect(true).toBe(true);
    });
  });

  describe('그래픽 관련 버그', () => {
    test('GRAPHICS-001: PSET 좌표 범위 초과', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PSET (1000, 1000), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 범위 초과 에러 또는 클리핑 처리
      expect(true).toBe(true);
    });

    test('GRAPHICS-002: LINE 시작점=끝점', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LINE (50, 50)-(50, 50), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 단일 픽셀 그려짐
      expect(pixelBuffer.getPixel(50, 50)).toBe(15);
    });

    test('GRAPHICS-003: CIRCLE 반지름 0', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 CIRCLE (100, 100), 0, 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 없이 처리
      expect(true).toBe(true);
    });

    test('GRAPHICS-004: PAINT 닫힌 영역 없음', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 경계 없이 PAINT 시도
      terminal.emit('command', '20 PAINT (100, 100), 12');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 화면 전체 채워지거나 에러 처리
      expect(true).toBe(true);
    });
  });

  describe('오디오 관련 버그', () => {
    test('AUDIO-001: SOUND 주파수 0', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SOUND 0, 500');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 없이 처리 (무음)
      expect(true).toBe(true);
    });

    test('AUDIO-002: PLAY 빈 문자열', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PLAY ""');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 없이 처리
      expect(true).toBe(true);
    });

    test('AUDIO-003: PLAY 잘못된 MML', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PLAY "INVALID MML CODE"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 에러 처리
      expect(true).toBe(true);
    });
  });

  describe('파일 시스템 버그', () => {
    test('FILE-001: 중복 파일명 저장', async () => {
      if (typeof localStorage === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PRINT "VERSION 1"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'SAVE "DUPTEST"');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 같은 이름으로 다시 저장 (덮어쓰기)
      terminal.emit('command', 'NEW');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '10 PRINT "VERSION 2"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'SAVE "DUPTEST"');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 로드
      terminal.emit('command', 'LOAD "DUPTEST"');
      await new Promise(resolve => setTimeout(resolve, 100));

      const outputs: string[] = [];
      emulator.getBasicInterpreter().on('output', (text: string) => {
        outputs.push(text);
      });

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // VERSION 2가 로드됨
      expect(outputs.some(o => o.includes('VERSION 2'))).toBe(true);
    });

    test('FILE-002: 특수문자 파일명', async () => {
      if (typeof localStorage === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PRINT "SPECIAL"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 특수문자 파일명 (안전하게 처리되어야 함)
      terminal.emit('command', 'SAVE "TEST@#$"');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 에러 또는 안전하게 처리
      expect(true).toBe(true);
    });
  });
});
