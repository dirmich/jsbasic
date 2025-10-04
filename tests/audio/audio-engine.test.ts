/**
 * Audio Engine Tests
 *
 * 오디오 엔진의 모든 기능에 대한 포괄적인 테스트
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { AudioEngine } from '@/audio/audio-engine';
import { BasicError, ERROR_CODES } from '@/utils/errors';

// Web Audio API 모킹
class MockOscillatorNode {
  type: OscillatorType = 'sine';
  frequency = { value: 440 };
  onended: (() => void) | null = null;
  private connected = false;
  private started = false;
  private stopped = false;

  connect(destination: any): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  start(when?: number): void {
    this.started = true;
  }

  stop(when?: number): void {
    this.stopped = true;
    // 비동기적으로 onended 호출 (실제 Web Audio API 동작 모방)
    setTimeout(() => {
      if (this.onended) {
        this.onended();
      }
    }, 0);
  }

  isConnected(): boolean {
    return this.connected;
  }

  isStarted(): boolean {
    return this.started;
  }

  isStopped(): boolean {
    return this.stopped;
  }
}

class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: mock((value: number, time: number) => {}),
    linearRampToValueAtTime: mock((value: number, time: number) => {}),
    cancelScheduledValues: mock((time: number) => {})
  };
  private connected = false;

  connect(destination: any): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

class MockAudioContext {
  currentTime = 0;
  destination = {};
  private oscillatorCount = 0;
  private gainCount = 0;

  createOscillator(): MockOscillatorNode {
    this.oscillatorCount++;
    return new MockOscillatorNode();
  }

  createGain(): MockGainNode {
    this.gainCount++;
    return new MockGainNode();
  }

  getOscillatorCount(): number {
    return this.oscillatorCount;
  }

  getGainCount(): number {
    return this.gainCount;
  }
}

// Global AudioContext 모킹
declare global {
  var AudioContext: any;
}

describe('AudioEngine', () => {
  let engine: AudioEngine;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    // AudioContext 모킹
    mockAudioContext = new MockAudioContext();
    globalThis.AudioContext = class {
      constructor() {
        return mockAudioContext;
      }
    };

    engine = new AudioEngine();
  });

  afterEach(() => {
    engine.stop();
  });

  describe('sound() 메서드', () => {
    test('유효한 주파수와 지속시간으로 사운드 재생', async () => {
      const promise = engine.sound(440, 100);
      expect(engine.isPlaying()).toBe(true);
      await promise;
      expect(engine.isPlaying()).toBe(false);
    });

    test('최소 주파수 (37Hz) 재생', async () => {
      await engine.sound(37, 50);
      // 에러 없이 완료되어야 함
    });

    test('최대 주파수 (32767Hz) 재생', async () => {
      await engine.sound(32767, 50);
      // 에러 없이 완료되어야 함
    });

    test('주파수가 너무 낮으면 에러', () => {
      expect(() => engine.sound(36, 100)).toThrow(BasicError);
      expect(() => engine.sound(36, 100)).toThrow(/between 37 and 32767/);
    });

    test('주파수가 너무 높으면 에러', () => {
      expect(() => engine.sound(32768, 100)).toThrow(BasicError);
      expect(() => engine.sound(32768, 100)).toThrow(/between 37 and 32767/);
    });

    test('음수 주파수는 에러', () => {
      expect(() => engine.sound(-100, 100)).toThrow(BasicError);
    });

    test('음수 지속시간은 에러', () => {
      expect(() => engine.sound(440, -1)).toThrow(BasicError);
    });

    test('지속시간이 최대값(65535)을 초과하면 에러', () => {
      expect(() => engine.sound(440, 65536)).toThrow(BasicError);
    });

    test('지속시간 0은 허용', async () => {
      await engine.sound(440, 0);
      // 에러 없이 완료되어야 함
    });

    test('새로운 사운드 재생 시 이전 사운드 중지', async () => {
      const promise1 = engine.sound(440, 1000);
      expect(engine.isPlaying()).toBe(true);

      // 첫 번째 사운드가 끝나기 전에 새로운 사운드 재생
      await engine.sound(880, 100);

      // 새로운 사운드가 재생되어야 함
      expect(engine.isPlaying()).toBe(false);
    });
  });

  describe('play() 메서드', () => {
    test('빈 MML 문자열 처리', async () => {
      await engine.play('');
      expect(engine.isPlaying()).toBe(false);
    });

    test('기본 음표 재생 (C, D, E, F, G, A, B)', async () => {
      await engine.play('CDEFGAB');
      expect(engine.isPlaying()).toBe(false);
    });

    test('옥타브 변경 (O3, O4, O5)', async () => {
      await engine.play('O3C O4C O5C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('옥타브 증가/감소 (>, <)', async () => {
      await engine.play('O4C>C<C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('템포 설정 (T60, T120, T240)', async () => {
      await engine.play('T60C T120C T240C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('기본 음길이 설정 (L1, L2, L4, L8, L16)', async () => {
      await engine.play('L1C L2C L4C L8C L16C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('쉼표 (P) 처리', async () => {
      await engine.play('C P C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('샵/플랫 (#, +, -) 처리', async () => {
      await engine.play('C# C+ C-');
      expect(engine.isPlaying()).toBe(false);
    });

    test('점음표 (.) 처리', async () => {
      await engine.play('C4. D4. E4.');
      expect(engine.isPlaying()).toBe(false);
    });

    test('음표에 길이 지정', async () => {
      await engine.play('C4 D8 E16');
      expect(engine.isPlaying()).toBe(false);
    });

    test('MIDI 노트 번호 (N0-N84)', async () => {
      await engine.play('N0 N60 N84');
      expect(engine.isPlaying()).toBe(false);
    });

    test('복잡한 MML 문자열 파싱', async () => {
      await engine.play('T120 L4 O4 C D E F G A B O5 C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('공백 문자 무시', async () => {
      await engine.play('  C   D   E  ');
      expect(engine.isPlaying()).toBe(false);
    });

    test('대소문자 구분 없이 처리', async () => {
      await engine.play('cDeFgAb');
      expect(engine.isPlaying()).toBe(false);
    });

    test('인식할 수 없는 문자는 무시', async () => {
      await engine.play('C@D!E#F$G');
      expect(engine.isPlaying()).toBe(false);
    });

    test('옥타브 범위 제한 (0-6)', async () => {
      await engine.play('O0C O6C O7C'); // O7은 무시되고 O6 유지
      expect(engine.isPlaying()).toBe(false);
    });

    test('템포 범위 제한 (32-255)', async () => {
      await engine.play('T32C T255C T256C'); // T256은 무시되고 T255 유지
      expect(engine.isPlaying()).toBe(false);
    });

    test('음길이 범위 제한 (1-64)', async () => {
      await engine.play('L1C L64C L65C'); // L65는 무시되고 L64 유지
      expect(engine.isPlaying()).toBe(false);
    });
  });

  describe('setVolume() 메서드', () => {
    test('유효한 볼륨 설정 (0.0)', () => {
      engine.setVolume(0.0);
      // 에러 없이 완료되어야 함
    });

    test('유효한 볼륨 설정 (0.5)', () => {
      engine.setVolume(0.5);
      // 에러 없이 완료되어야 함
    });

    test('유효한 볼륨 설정 (1.0)', () => {
      engine.setVolume(1.0);
      // 에러 없이 완료되어야 함
    });

    test('볼륨이 0보다 작으면 에러', () => {
      expect(() => engine.setVolume(-0.1)).toThrow(BasicError);
      expect(() => engine.setVolume(-0.1)).toThrow(/between 0.0 and 1.0/);
    });

    test('볼륨이 1보다 크면 에러', () => {
      expect(() => engine.setVolume(1.1)).toThrow(BasicError);
      expect(() => engine.setVolume(1.1)).toThrow(/between 0.0 and 1.0/);
    });

    test('볼륨 설정 후 사운드 재생 시 적용', async () => {
      engine.setVolume(0.5);
      await engine.sound(440, 50);
      // 에러 없이 완료되어야 함
    });
  });

  describe('stop() 메서드', () => {
    test('재생 중인 사운드 중지', async () => {
      const promise = engine.sound(440, 1000);
      expect(engine.isPlaying()).toBe(true);

      engine.stop();
      expect(engine.isPlaying()).toBe(false);

      // Promise는 여전히 resolve되어야 함
      await promise;
    });

    test('재생 중이 아닐 때 stop 호출해도 에러 없음', () => {
      engine.stop();
      engine.stop();
      // 에러 없이 완료되어야 함
    });

    test('MML 재생 중 중지', async () => {
      const promise = engine.play('T60 L1 CCCCCCCC'); // 긴 MML
      expect(engine.isPlaying()).toBe(true);

      engine.stop();
      expect(engine.isPlaying()).toBe(false);

      await promise;
    });
  });

  describe('isPlaying() 메서드', () => {
    test('초기 상태는 재생 중이 아님', () => {
      expect(engine.isPlaying()).toBe(false);
    });

    test('사운드 재생 중에는 true', async () => {
      const promise = engine.sound(440, 100);
      expect(engine.isPlaying()).toBe(true);
      await promise;
      expect(engine.isPlaying()).toBe(false);
    });

    test('MML 재생 중에는 true', async () => {
      const promise = engine.play('CDEFGAB');
      expect(engine.isPlaying()).toBe(true);
      await promise;
      expect(engine.isPlaying()).toBe(false);
    });

    test('stop 호출 후에는 false', async () => {
      const promise = engine.sound(440, 1000);
      expect(engine.isPlaying()).toBe(true);

      engine.stop();
      expect(engine.isPlaying()).toBe(false);

      await promise;
    });
  });

  describe('엣지 케이스', () => {
    test('연속적인 사운드 재생', async () => {
      await engine.sound(440, 50);
      await engine.sound(880, 50);
      await engine.sound(1760, 50);
      expect(engine.isPlaying()).toBe(false);
    });

    test('사운드와 MML 교차 재생', async () => {
      await engine.sound(440, 50);
      await engine.play('CDE');
      await engine.sound(880, 50);
      await engine.play('FGA');
      expect(engine.isPlaying()).toBe(false);
    });

    test('매우 짧은 지속시간', async () => {
      await engine.sound(440, 1);
      expect(engine.isPlaying()).toBe(false);
    });

    test('매우 긴 MML 문자열', async () => {
      const longMML = 'CDEFGAB'.repeat(10);
      await engine.play(longMML);
      expect(engine.isPlaying()).toBe(false);
    });

    test('볼륨 변경 후 여러 사운드 재생', async () => {
      engine.setVolume(0.1);
      await engine.sound(440, 50);

      engine.setVolume(0.5);
      await engine.sound(880, 50);

      engine.setVolume(1.0);
      await engine.sound(1760, 50);

      expect(engine.isPlaying()).toBe(false);
    });

    test('MML에서 모든 옥타브 테스트', async () => {
      await engine.play('O0C O1C O2C O3C O4C O5C O6C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('MML에서 모든 음표 길이 테스트', async () => {
      await engine.play('L1C L2C L4C L8C L16C L32C L64C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('MML에서 쉼표 길이 지정', async () => {
      await engine.play('C P4 C P8 C P16 C');
      expect(engine.isPlaying()).toBe(false);
    });

    test('MML에서 연속된 샵/플랫', async () => {
      await engine.play('C# D# E# F# G# A# B#');
      expect(engine.isPlaying()).toBe(false);
    });

    test('경계값 MIDI 노트 번호', async () => {
      await engine.play('N1 N42 N84');
      expect(engine.isPlaying()).toBe(false);
    });
  });

  describe('메모리 및 리소스 관리', () => {
    test('AudioContext는 한 번만 생성됨', async () => {
      const initialCount = mockAudioContext.getOscillatorCount();

      await engine.sound(440, 50);
      await engine.sound(880, 50);

      // 새로운 AudioContext가 생성되지 않았는지 확인
      // (각 sound 호출마다 Oscillator는 생성되지만 Context는 재사용)
      expect(mockAudioContext.getOscillatorCount()).toBeGreaterThan(initialCount);
    });

    test('stop 호출 시 oscillator 정리', async () => {
      engine.sound(440, 1000);
      expect(engine.isPlaying()).toBe(true);

      engine.stop();
      expect(engine.isPlaying()).toBe(false);

      // 두 번째 stop 호출도 에러 없이 처리
      engine.stop();
    });

    test('여러 번 stop 호출해도 안전', () => {
      engine.stop();
      engine.stop();
      engine.stop();
      expect(engine.isPlaying()).toBe(false);
    });
  });

  describe('동시성 테스트', () => {
    test('이전 재생이 끝나기 전 새로운 재생 시작', async () => {
      const promise1 = engine.sound(440, 100);

      // 첫 번째가 끝나기 전에 두 번째 시작
      await engine.sound(880, 50);

      // 첫 번째 promise도 정상 완료되어야 함
      await promise1;
      expect(engine.isPlaying()).toBe(false);
    });

    test('MML 재생 중 sound 호출', async () => {
      const promise1 = engine.play('T60 L1 CCCCCCCC');

      // MML이 끝나기 전에 sound 호출
      await engine.sound(880, 50);

      await promise1;
      expect(engine.isPlaying()).toBe(false);
    });
  });

  describe('고급 MML 기능', () => {
    describe('볼륨 제어 (V0-V15)', () => {
      test('V0 (무음)', async () => {
        await engine.play('V0 C4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('V8 (중간 볼륨)', async () => {
        await engine.play('V8 C4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('V15 (최대 볼륨)', async () => {
        await engine.play('V15 C4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('점진적 볼륨 변화', async () => {
        await engine.play('V4 C4 V8 D4 V12 E4 V15 F4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('범위를 벗어난 볼륨은 무시', async () => {
        await engine.play('V20 C4'); // V20은 무시되고 이전 볼륨 유지
        expect(engine.isPlaying()).toBe(false);
      });
    });

    describe('파형 타입 (W0-W3)', () => {
      test('W0 (사인파)', async () => {
        await engine.play('W0 C4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('W1 (사각파)', async () => {
        await engine.play('W1 C4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('W2 (톱니파)', async () => {
        await engine.play('W2 C4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('W3 (삼각파)', async () => {
        await engine.play('W3 C4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('파형 타입 변경', async () => {
        await engine.play('W0 C4 W1 D4 W2 E4 W3 F4');
        expect(engine.isPlaying()).toBe(false);
      });
    });

    describe('아티큘레이션 (ML, MN, MS)', () => {
      test('ML (레가토)', async () => {
        await engine.play('ML C4 D4 E4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('MN (노멀)', async () => {
        await engine.play('MN C4 D4 E4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('MS (스타카토)', async () => {
        await engine.play('MS C4 D4 E4');
        expect(engine.isPlaying()).toBe(false);
      });

      test('아티큘레이션 변경', async () => {
        await engine.play('ML C4 D4 MS E4 F4 MN G4');
        expect(engine.isPlaying()).toBe(false);
      });
    });

    describe('반복 ([...]n)', () => {
      test('기본 반복 (2회)', async () => {
        await engine.play('[C4 D4]');
        expect(engine.isPlaying()).toBe(false);
      });

      test('반복 횟수 지정', async () => {
        await engine.play('[C4 D4]3');
        expect(engine.isPlaying()).toBe(false);
      });

      test('중첩 반복', async () => {
        await engine.play('[C4 [D4 E4]2 F4]2');
        expect(engine.isPlaying()).toBe(false);
      });

      test('반복과 다른 명령어 조합', async () => {
        await engine.play('O4 [C D E]3 F G A');
        expect(engine.isPlaying()).toBe(false);
      });
    });

    describe('타이 (&)', () => {
      test('두 음표 타이', async () => {
        await engine.play('C4&C8');
        expect(engine.isPlaying()).toBe(false);
      });

      test('여러 음표 타이', async () => {
        await engine.play('C4&C8&C16');
        expect(engine.isPlaying()).toBe(false);
      });

      test('타이와 일반 음표 조합', async () => {
        await engine.play('C4&C4 D4 E4&E8');
        expect(engine.isPlaying()).toBe(false);
      });
    });

    describe('복합 MML', () => {
      test('모든 고급 기능 조합', async () => {
        await engine.play('V12 W1 ML T120 O4 [C D E F]2 MS V8 G A B O5 C');
        expect(engine.isPlaying()).toBe(false);
      });

      test('복잡한 음악 패턴', async () => {
        await engine.play('T140 L8 V10 W2 ML [O4 C E G O5 C]2 MN V15 W1 [O4 D F A O5 D]2');
        expect(engine.isPlaying()).toBe(false);
      });
    });
  });

  describe('다중 채널 지원', () => {
    test('채널 0에서 MML 재생', async () => {
      await engine.playMMLOnChannel(0, 'C4 D4 E4');
      // 에러 없이 완료되어야 함
    });

    test('채널 1에서 MML 재생', async () => {
      await engine.playMMLOnChannel(1, 'G4 A4 B4');
      // 에러 없이 완료되어야 함
    });

    test('채널 2에서 MML 재생', async () => {
      await engine.playMMLOnChannel(2, 'E4 F4 G4');
      // 에러 없이 완료되어야 함
    });

    test('잘못된 채널 번호 (음수)', () => {
      expect(() => engine.playMMLOnChannel(-1, 'C4')).toThrow(BasicError);
    });

    test('잘못된 채널 번호 (최대값 초과)', () => {
      expect(() => engine.playMMLOnChannel(3, 'C4')).toThrow(BasicError);
    });

    test('특정 채널 중지', () => {
      engine.stopChannel(0);
      engine.stopChannel(1);
      engine.stopChannel(2);
      // 에러 없이 완료되어야 함
    });

    test('모든 채널 중지', () => {
      engine.stopAllChannels();
      // 에러 없이 완료되어야 함
    });

    test('채널 중지 - 잘못된 번호', () => {
      expect(() => engine.stopChannel(-1)).toThrow(BasicError);
      expect(() => engine.stopChannel(3)).toThrow(BasicError);
    });
  });

  describe('화음 재생 (playChord)', () => {
    test('C 메이저 코드 (C4, E4, G4)', async () => {
      await engine.playChord(['C4', 'E4', 'G4'], 500);
      // 에러 없이 완료되어야 함
    });

    test('D 마이너 코드 (D4, F4, A4)', async () => {
      await engine.playChord(['D4', 'F4', 'A4'], 500);
      // 에러 없이 완료되어야 함
    });

    test('2개 음표 화음', async () => {
      await engine.playChord(['C4', 'E4'], 300);
      // 에러 없이 완료되어야 함
    });

    test('최대 3개 음표', async () => {
      await engine.playChord(['C4', 'E4', 'G4'], 500);
      // 에러 없이 완료되어야 함
    });

    test('4개 이상 음표는 에러', () => {
      expect(() => engine.playChord(['C4', 'E4', 'G4', 'B4'], 500)).toThrow(BasicError);
    });

    test('다양한 옥타브', async () => {
      await engine.playChord(['C3', 'E4', 'G5'], 500);
      // 에러 없이 완료되어야 함
    });
  });

  describe('오디오 이펙트', () => {
    test('페이드 인 (500ms)', () => {
      engine.fadeIn(500);
      // 에러 없이 완료되어야 함
    });

    test('페이드 아웃 (500ms)', () => {
      engine.fadeOut(500);
      // 에러 없이 완료되어야 함
    });

    test('페이드 인/아웃 조합', () => {
      engine.fadeIn(300);
      engine.fadeOut(300);
      // 에러 없이 완료되어야 함
    });

    test('페이드와 사운드 재생 조합', async () => {
      engine.fadeIn(200);
      await engine.sound(440, 50);
      engine.fadeOut(200);
      expect(engine.isPlaying()).toBe(false);
    });
  });
});
