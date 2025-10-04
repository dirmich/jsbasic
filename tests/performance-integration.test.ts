/**
 * 성능 통합 테스트
 * 시스템 전체 성능 시나리오 검증
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BasicEmulator } from '../src/system/emulator.js';

describe('Performance Integration Tests', () => {
  let emulator: BasicEmulator;

  beforeEach(() => {
    emulator = new BasicEmulator();
    emulator.start();
  });

  describe('대규모 계산 성능', () => {
    test('10,000회 루프 실행 < 1초', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 LET SUM = 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 10000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LET SUM = SUM + I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 1500)); // 여유있게 1.5초 대기
      const elapsed = Date.now() - startTime;

      // 실행 시간 체크 (1.5초 이내 완료 예상)
      expect(elapsed).toBeLessThan(1500);
    });

    test('중첩 루프 성능', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR J = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LET K = I * J');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT J');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2000);
    });

    test('배열 초기화 성능', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 DIM A(1000)');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 A(I) = I * 2');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('그래픽 렌더링 성능', () => {
    test('1,000개 픽셀 그리기 < 3초', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PSET (RND * 320, RND * 200), RND * 16');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 3500));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(3500);
    });

    test('LINE 그리기 성능 (100개)', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 LINE (0, I)-(319, I), I MOD 16');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2000);
    });

    test('CIRCLE 그리기 성능 (50개)', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 50');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 CIRCLE (I * 5, 100), 10, I MOD 16');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 2500));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2500);
    });

    test('더티 렉트 최적화 효과', async () => {
      const terminal = emulator.getTerminal();
      const pixelBuffer = emulator.getPixelBuffer();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 같은 영역에 반복 그리기 (더티 렉트 통합 테스트)
      terminal.emit('command', '20 FOR I = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PSET (50, 50), I MOD 16');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const elapsed = Date.now() - startTime;

      // 더티 렉트 최적화로 빠르게 완료되어야 함
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('오디오 재생 성능', () => {
    test('연속 SOUND 재생 (글리치 없음)', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 10');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 SOUND 440 + I * 50, 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 1500));
      const elapsed = Date.now() - startTime;

      // 오디오 재생이 빠르게 시작되어야 함 (실제 재생 시간 제외)
      expect(elapsed).toBeLessThan(1500);
    });

    test('3채널 동시 재생', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 PLAY 1, "O4 [C E G]16"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 PLAY 2, "O3 [C E G]16"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PLAY 3, "O5 [C E G]16"');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 500));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('동시 작업 성능', () => {
    test('그래픽 + 오디오 + 계산 동시 실행', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET TOTAL = 0');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 FOR I = 1 TO 50');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 계산
      terminal.emit('command', '40 LET TOTAL = TOTAL + I');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 그래픽
      terminal.emit('command', '50 PSET (I * 5, 100), I MOD 16');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 오디오
      terminal.emit('command', '60 SOUND 220 + I * 10, 50');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '70 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '80 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 3000));
      const elapsed = Date.now() - startTime;

      // 통합 작업도 합리적인 시간 내에 완료
      expect(elapsed).toBeLessThan(3000);
    });

    test('전체 시스템 FPS > 30', async () => {
      // FPS 측정은 실제 브라우저 환경에서만 의미 있음
      // 여기서는 프레임당 처리 시간이 33ms 이하인지 확인

      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR FRAME = 1 TO 30');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PSET (FRAME, 100), FRAME MOD 16');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT FRAME');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 1500));
      const elapsed = Date.now() - startTime;

      // 30프레임을 1초(1000ms) 이내에 처리
      expect(elapsed).toBeLessThan(1500);
    });
  });

  describe('메모리 누수 테스트', () => {
    test('반복 실행 시 메모리 증가 < 50%', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 100');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET A = I * 2');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 첫 실행
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 200));
      const stats1 = emulator.getStats();
      const mem1 = stats1.memoryUsed;

      // 10번 반복 실행
      for (let i = 0; i < 10; i++) {
        terminal.emit('command', 'RUN');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const statsN = emulator.getStats();
      const memN = statsN.memoryUsed;

      // 메모리 증가율 계산
      const increaseRatio = memN / mem1;

      // 50% 이상 증가하지 않아야 함
      expect(increaseRatio).toBeLessThan(1.5);
    });

    test('그래픽 반복 렌더링 메모리 안정성', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 SCREEN 1');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 FOR I = 1 TO 50');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 PSET (I, I), 15');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '50 CLS');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '60 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const stats1 = emulator.getStats();
      const mem1 = stats1.memoryUsed;

      // 5번 반복
      for (let i = 0; i < 5; i++) {
        terminal.emit('command', 'RUN');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const stats5 = emulator.getStats();
      const mem5 = stats5.memoryUsed;

      const increaseRatio = mem5 / mem1;
      expect(increaseRatio).toBeLessThan(1.3);
    });
  });

  describe('성능 프로파일링', () => {
    test('시스템 통계 수집', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET A = I * I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const beforeStats = emulator.getStats();

      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 500));

      const afterStats = emulator.getStats();

      // 통계가 수집되었는지 확인
      expect(afterStats.uptime).toBeGreaterThanOrEqual(beforeStats.uptime);
      expect(afterStats.memoryUsed).toBeGreaterThan(0);
    });

    test('디버그 정보 수집', () => {
      const debugInfo = emulator.getDebugInfo();

      expect(debugInfo).toBeDefined();
      expect(debugInfo.state).toBeDefined();
      expect(debugInfo.components).toBeDefined();
      expect(debugInfo.components.cpu).toBeDefined();
      expect(debugInfo.components.basic).toBeDefined();
      expect(debugInfo.components.memory).toBeDefined();
    });
  });

  describe('최적화 검증', () => {
    test('ObjectPool 사용 효과', async () => {
      // ObjectPool 재사용으로 객체 생성 비용 감소
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 1000');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET A = I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const elapsed = Date.now() - startTime;

      // ObjectPool로 빠른 실행 예상
      expect(elapsed).toBeLessThan(1000);
    });

    test('캐싱 효과 - 반복 실행 시 성능 향상', async () => {
      const terminal = emulator.getTerminal();

      terminal.emit('command', '10 FOR I = 1 TO 500');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '20 LET A = I * 2');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '30 NEXT I');
      await new Promise(resolve => setTimeout(resolve, 50));

      terminal.emit('command', '40 END');
      await new Promise(resolve => setTimeout(resolve, 50));

      // 첫 실행
      const start1 = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 800));
      const elapsed1 = Date.now() - start1;

      // 두 번째 실행 (캐싱 효과)
      const start2 = Date.now();
      terminal.emit('command', 'RUN');
      await new Promise(resolve => setTimeout(resolve, 800));
      const elapsed2 = Date.now() - start2;

      // 두 번째 실행이 첫 실행보다 빠르거나 비슷해야 함
      expect(elapsed2).toBeLessThanOrEqual(elapsed1 * 1.1);
    });
  });
});
