/**
 * Audio Engine Implementation
 *
 * SOUND 및 PLAY 명령어를 위한 오디오 엔진
 * Web Audio API 기반 구현
 */

import { BasicError, ERROR_CODES } from '@/utils/errors';

export interface AudioEngineInterface {
  // SOUND 명령어: 주파수와 지속시간으로 비프음 생성
  sound(frequency: number, duration: number): Promise<void>;

  // PLAY 명령어: MML(Music Macro Language) 문자열 재생
  play(musicString: string): Promise<void>;

  // 현재 재생 중인 사운드 중지
  stop(): void;

  // 볼륨 설정 (0.0 ~ 1.0)
  setVolume(volume: number): void;

  // 재생 중 여부
  isPlaying(): boolean;
}

/**
 * MML 음표 파서
 */
interface Note {
  frequency: number;
  duration: number;
}

/**
 * AudioEngine 클래스
 */
export class AudioEngine implements AudioEngineInterface {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private playing: boolean = false;
  private volume: number = 0.3; // 기본 볼륨 30%

  /**
   * AudioContext 초기화 (lazy initialization)
   */
  private initAudioContext(): void {
    if (this.audioContext) return;

    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
    } catch (error) {
      throw new BasicError(
        'Failed to initialize audio system',
        ERROR_CODES.DEVICE_NOT_FOUND
      );
    }
  }

  /**
   * SOUND 명령어 구현
   * @param frequency 주파수 (Hz), 37 ~ 32767
   * @param duration 지속시간 (클럭 틱), 0 ~ 65535 (1 클럭 = 1/18.2초)
   */
  async sound(frequency: number, duration: number): Promise<void> {
    // 파라미터 검증
    if (frequency < 37 || frequency > 32767) {
      throw new BasicError(
        'Frequency must be between 37 and 32767 Hz',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    if (duration < 0 || duration > 65535) {
      throw new BasicError(
        'Duration must be between 0 and 65535 clock ticks',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;

    // 현재 재생 중인 사운드 중지
    this.stop();

    // 지속시간을 초로 변환 (1 클럭 = 1/18.2초 ≈ 0.0549초)
    const durationSeconds = duration * (1 / 18.2);

    this.playing = true;

    return new Promise<void>((resolve) => {
      if (!this.audioContext || !this.masterGain) {
        resolve();
        return;
      }

      // Oscillator 생성
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'square'; // 8비트 스타일 사운드
      oscillator.frequency.value = frequency;

      // ADSR 엔벨로프 (간단한 Attack-Release)
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.01); // Attack
      gainNode.gain.setValueAtTime(1, now + durationSeconds - 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + durationSeconds); // Release

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      this.currentOscillator = oscillator;

      oscillator.start(now);
      oscillator.stop(now + durationSeconds);

      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        this.currentOscillator = null;
        this.playing = false;
        resolve();
      };
    });
  }

  /**
   * PLAY 명령어 구현
   * @param musicString MML 형식의 음악 문자열
   *
   * 지원하는 MML 명령어:
   * - A-G: 음표 (옥타브 내 음높이)
   * - O[0-6]: 옥타브 설정
   * - L[1-64]: 기본 음길이 설정
   * - T[32-255]: 템포 설정 (BPM)
   * - >[<: 옥타브 증가/감소
   * - .: 점음표 (1.5배 길이)
   * - #,+,-: 샵, 플랫
   * - P: 쉼표
   * - N[0-84]: MIDI 노트 번호
   */
  async play(musicString: string): Promise<void> {
    this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;

    // 현재 재생 중인 사운드 중지
    this.stop();

    const notes = this.parseMML(musicString);

    this.playing = true;

    for (const note of notes) {
      if (!this.playing) break; // 중단된 경우

      if (note.frequency === 0) {
        // 쉼표
        await this.delay(note.duration);
      } else {
        await this.playNote(note.frequency, note.duration);
      }
    }

    this.playing = false;
  }

  /**
   * 단일 음표 재생
   */
  private async playNote(frequency: number, duration: number): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    return new Promise<void>((resolve) => {
      if (!this.audioContext || !this.masterGain) {
        resolve();
        return;
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.value = frequency;

      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
      gainNode.gain.setValueAtTime(0.5, now + duration - 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      this.currentOscillator = oscillator;

      oscillator.start(now);
      oscillator.stop(now + duration);

      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        this.currentOscillator = null;
        resolve();
      };
    });
  }

  /**
   * MML 문자열 파싱
   */
  private parseMML(mml: string): Note[] {
    const notes: Note[] = [];
    let octave = 4;
    let defaultLength = 4; // 4분음표
    let tempo = 120; // BPM

    const noteFrequencies: Record<string, number[]> = {
      'C': [16.35, 32.70, 65.41, 130.81, 261.63, 523.25, 1046.50],
      'D': [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66],
      'E': [20.60, 41.20, 82.41, 164.81, 329.63, 659.25, 1318.51],
      'F': [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91],
      'G': [24.50, 49.00, 98.00, 196.00, 392.00, 783.99, 1567.98],
      'A': [27.50, 55.00, 110.00, 220.00, 440.00, 880.00, 1760.00],
      'B': [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53]
    };

    let i = 0;
    while (i < mml.length) {
      const char = mml[i]?.toUpperCase();
      if (!char) break;

      // 옥타브 설정
      if (char === 'O') {
        i++;
        const oct = parseInt(mml[i] ?? '4', 10);
        if (oct >= 0 && oct <= 6) octave = oct;
        i++;
        continue;
      }

      // 옥타브 증가/감소
      if (char === '>') {
        octave = Math.min(6, octave + 1);
        i++;
        continue;
      }
      if (char === '<') {
        octave = Math.max(0, octave - 1);
        i++;
        continue;
      }

      // 기본 음길이 설정
      if (char === 'L') {
        i++;
        let lenStr = '';
        while (i < mml.length && /\d/.test(mml[i] ?? '')) {
          lenStr += mml[i];
          i++;
        }
        const len = parseInt(lenStr, 10);
        if (len >= 1 && len <= 64) defaultLength = len;
        continue;
      }

      // 템포 설정
      if (char === 'T') {
        i++;
        let tempoStr = '';
        while (i < mml.length && /\d/.test(mml[i] ?? '')) {
          tempoStr += mml[i];
          i++;
        }
        const t = parseInt(tempoStr, 10);
        if (t >= 32 && t <= 255) tempo = t;
        continue;
      }

      // 쉼표
      if (char === 'P') {
        i++;
        let lenStr = '';
        while (i < mml.length && /\d/.test(mml[i] ?? '')) {
          lenStr += mml[i];
          i++;
        }
        const len = lenStr ? parseInt(lenStr, 10) : defaultLength;
        const duration = (60 / tempo) * (4 / len);
        notes.push({ frequency: 0, duration });
        continue;
      }

      // 음표
      if ('ABCDEFG'.includes(char)) {
        i++;
        let modifier = 0;

        // 샵/플랫
        if (i < mml.length && (mml[i] === '#' || mml[i] === '+')) {
          modifier = 1;
          i++;
        } else if (i < mml.length && mml[i] === '-') {
          modifier = -1;
          i++;
        }

        // 음길이
        let lenStr = '';
        while (i < mml.length && /\d/.test(mml[i] ?? '')) {
          lenStr += mml[i];
          i++;
        }
        let len = lenStr ? parseInt(lenStr, 10) : defaultLength;

        // 점음표
        let dotted = false;
        if (i < mml.length && mml[i] === '.') {
          dotted = true;
          i++;
        }

        const baseFreq = noteFrequencies[char]?.[octave] ?? 440;
        const frequency = baseFreq * Math.pow(2, modifier / 12);
        let duration = (60 / tempo) * (4 / len);
        if (dotted) duration *= 1.5;

        notes.push({ frequency, duration });
        continue;
      }

      // MIDI 노트 번호
      if (char === 'N') {
        i++;
        let noteStr = '';
        while (i < mml.length && /\d/.test(mml[i] ?? '')) {
          noteStr += mml[i];
          i++;
        }
        const noteNum = parseInt(noteStr, 10);
        if (noteNum === 0) {
          // 쉼표
          const duration = (60 / tempo) * (4 / defaultLength);
          notes.push({ frequency: 0, duration });
        } else if (noteNum >= 1 && noteNum <= 84) {
          // A0 = MIDI 21, C4 = MIDI 60
          const frequency = 440 * Math.pow(2, (noteNum + 20 - 69) / 12);
          const duration = (60 / tempo) * (4 / defaultLength);
          notes.push({ frequency, duration });
        }
        continue;
      }

      // 공백 무시
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // 인식할 수 없는 문자는 무시
      i++;
    }

    return notes;
  }

  /**
   * 딜레이 헬퍼
   */
  private delay(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /**
   * 재생 중지
   */
  stop(): void {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
        this.currentOscillator.disconnect();
      } catch (e) {
        // 이미 중지된 경우 무시
      }
      this.currentOscillator = null;
    }
    this.playing = false;
  }

  /**
   * 볼륨 설정
   */
  setVolume(volume: number): void {
    if (volume < 0 || volume > 1) {
      throw new BasicError(
        'Volume must be between 0.0 and 1.0',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    this.volume = volume;
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  /**
   * 재생 중 여부 확인
   */
  isPlaying(): boolean {
    return this.playing;
  }
}
