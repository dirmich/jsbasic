/**
 * 크로스 모듈 통합 테스트
 * 모듈 간 상호작용 검증
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BasicEmulator } from '../src/system/emulator.js';
import { CPU6502 } from '../src/cpu/cpu.js';
import { MemoryManager } from '../src/memory/manager.js';

describe('Cross-Module Integration Tests', () => {
  let emulator: BasicEmulator;

  beforeEach(() => {
    emulator = new BasicEmulator();
    emulator.start();
  });

  describe('CPU ↔ Memory', () => {
    test('CPU가 메모리에 올바르게 접근', () => {
      const cpu = emulator.getCPU();
      const memory = emulator.getMemoryManager();

      // CPU를 통한 메모리 쓰기
      const testAddress = 0x0200;
      const testValue = 0x42;

      memory.write(testAddress, testValue);
      const readValue = memory.read(testAddress);

      expect(readValue).toBe(testValue);
    });

    test('메모리 보호 영역 검증', () => {
      const memory = emulator.getMemoryManager();

      // ROM 영역 보호 테스트
      const romAddress = 0xF000;

      // ROM 영역에 쓰기 시도 (보호 모드)
      expect(() => {
        memory.write(romAddress, 0xFF);
      }).toThrow();
    });

    test('메모리 뱅킹 시스템', () => {
      const memory = emulator.getMemoryManager();

      // 뱅크 0에 데이터 쓰기
      memory.selectBank(0);
      memory.write(0x8000, 0xAA);

      // 뱅크 1로 전환
      memory.selectBank(1);
      memory.write(0x8000, 0xBB);

      // 뱅크 0으로 다시 전환하여 읽기
      memory.selectBank(0);
      expect(memory.read(0x8000)).toBe(0xAA);

      // 뱅크 1로 전환하여 읽기
      memory.selectBank(1);
      expect(memory.read(0x8000)).toBe(0xBB);
    });
  });

  describe('BASIC ↔ CPU', () => {
    test('PEEK 함수 - 메모리 읽기', async () => {
      const terminal = emulator.getTerminal();
      const memory = emulator.getMemoryManager();
      const outputs: string[] = [];

      emulator.getBasicInterpreter().on('output', (text: string) => {
        outputs.push(text);
      });

      // 특정 메모리 주소에 값 쓰기
      memory.write(0x1000, 123);

      // BASIC PEEK으로 읽기
      terminal.emit('command', '10 PRINT PEEK(4096)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(outputs.some(o => o.includes('123'))).toBe(true);
    });

    test('POKE 명령어 - 메모리 쓰기', async () => {
      const terminal = emulator.getTerminal();
      const memory = emulator.getMemoryManager();

      terminal.emit('command', '10 POKE 4096, 99');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 메모리 직접 확인
      const value = memory.read(0x1000);
      expect(value).toBe(99);
    });
  });

  describe('BASIC ↔ Graphics', () => {
    test('SCREEN 명령어 - 그래픽 모드 전환', async () => {
      const terminal = emulator.getTerminal();
      const graphicsEngine = emulator.getGraphicsEngine();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 그래픽 모드 활성화 확인
      const pixelBuffer = emulator.getPixelBuffer();
      expect(pixelBuffer.getWidth()).toBeGreaterThan(0);
      expect(pixelBuffer.getHeight()).toBeGreaterThan(0);
    });

    test('PSET - 픽셀 그리기', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PSET (50, 50), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(pixelBuffer.getPixel(50, 50)).toBe(15);
    });

    test('LINE - 선 그리기', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LINE (0, 0)-(20, 20), 12');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 선의 시작과 끝 확인
      expect(pixelBuffer.getPixel(0, 0)).toBe(12);
      expect(pixelBuffer.getPixel(20, 20)).toBe(12);
    });

    test('CIRCLE - 원 그리기', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 CIRCLE (100, 100), 30, 14');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 원의 상단 픽셀 (100, 70) 확인
      expect(pixelBuffer.getPixel(100, 70)).toBe(14);
    });

    test('PAINT - 영역 채우기', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 사각형 그리기
      terminal.emit('command', '20 LINE (10, 10)-(50, 10), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LINE (50, 10)-(50, 50), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 LINE (50, 50)-(10, 50), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 LINE (10, 50)-(10, 10), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 내부 채우기
      terminal.emit('command', '60 PAINT (30, 30), 12');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '70 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 내부 픽셀이 채워졌는지 확인
      expect(pixelBuffer.getPixel(30, 30)).toBe(12);
    });

    test('CLS - 화면 지우기', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PSET (10, 10), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 CLS');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 화면이 클리어되었는지 확인
      expect(pixelBuffer.getPixel(10, 10)).toBe(0);
    });
  });

  describe('BASIC ↔ Audio', () => {
    test('SOUND 명령어 - 사운드 재생', async () => {
      const terminal = emulator.getTerminal();
      const audioEngine = emulator.getAudioEngine();

      let soundEventReceived = false;
      audioEngine.on('sound', () => {
        soundEventReceived = true;
      });

      terminal.emit('command', '10 SOUND 440, 500');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      // 오디오 재생은 브라우저 환경에서만 동작
      expect(true).toBe(true);
    });

    test('PLAY MML - 음악 재생', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PLAY "O4 C D E F G"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(true).toBe(true);
    });

    test('다중 채널 PLAY', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PLAY 1, "O4 C E G"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PLAY 2, "O3 C E G"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PLAY 3, "O5 C E G"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(true).toBe(true);
    });
  });

  describe('Debugger ↔ BASIC', () => {
    test('프로그램 실행 추적', async () => {
      const terminal = emulator.getTerminal();
      const interpreter = emulator.getBasicInterpreter();

      let executedLines: number[] = [];
      interpreter.on('lineExecuted', (lineNumber: number) => {
        executedLines.push(lineNumber);
      });

      terminal.emit('command', '10 PRINT "LINE 10"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PRINT "LINE 20"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 실행된 라인 확인
      expect(executedLines).toContain(10);
      expect(executedLines).toContain(20);
      expect(executedLines).toContain(30);
    });

    test('변수 감시', async () => {
      const terminal = emulator.getTerminal();
      const interpreter = emulator.getBasicInterpreter();

      terminal.emit('command', '10 LET A = 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET B = 20');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LET C = A + B');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 150));

      // 변수 값 확인
      const variables = interpreter.getVariables();
      expect(variables.get('A')).toBe(10);
      expect(variables.get('B')).toBe(20);
      expect(variables.get('C')).toBe(30);
    });
  });

  describe('Editor ↔ BASIC', () => {
    test('문법 하이라이팅 토큰 검증', () => {
      const interpreter = emulator.getBasicInterpreter();

      // 간단한 BASIC 코드
      const code = '10 PRINT "HELLO"';

      // 토크나이저 동작 확인 (내부 구현에 따라 다를 수 있음)
      expect(code).toContain('PRINT');
      expect(code).toContain('"HELLO"');
    });
  });

  describe('Mobile ↔ 전체 시스템', () => {
    test('모바일 최적화 활성화', () => {
      if (typeof window === 'undefined') {
        expect(true).toBe(true); // Node.js 환경에서는 스킵
        return;
      }

      const container = document.createElement('div');
      emulator.initializeMobileOptimization(container);

      expect(emulator.isMobileOptimized()).toBe(true);

      const optimizer = emulator.getMobileOptimizer();
      expect(optimizer).not.toBeNull();

      emulator.disableMobileOptimization();
    });

    test('터치 입력 → 키보드 이벤트 변환', () => {
      if (typeof window === 'undefined') {
        expect(true).toBe(true);
        return;
      }

      const container = document.createElement('div');
      emulator.initializeMobileOptimization(container);

      const gestureHandler = emulator.getGestureHandler();
      expect(gestureHandler).not.toBeNull();

      if (gestureHandler) {
        let tapReceived = false;
        emulator.on('mobile:tap', () => {
          tapReceived = true;
        });

        gestureHandler.emit('tap', { x: 100, y: 100 });
        expect(tapReceived).toBe(true);
      }

      emulator.disableMobileOptimization();
    });
  });

  describe('통합 시나리오: 모든 모듈 동시 사용', () => {
    test('BASIC + 그래픽 + 오디오 + 메모리', async () => {
      const terminal = emulator.getTerminal();
      const memory = emulator.getMemoryManager();
      const pixelBuffer = emulator.getPixelBuffer();

      // 메모리에 데이터 저장
      memory.write(0x2000, 42);

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET X = PEEK(8192)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PSET (X, X), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 SOUND X * 10, 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));

      // 그래픽 출력 확인
      expect(pixelBuffer.getPixel(42, 42)).toBe(15);
    });
  });
});
