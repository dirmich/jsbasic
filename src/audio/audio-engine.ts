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
  volume?: number;
  waveform?: OscillatorType;
  articulation?: number;
}

/**
 * ADSR 엔벨로프 설정
 */
export interface EnvelopeConfig {
  attack?: number;   // 0-1초, 기본 0.01
  release?: number;  // 0-1초, 기본 0.1
}

/**
 * 오디오 채널 클래스 (다중 채널 지원)
 */
class AudioChannel {
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isActive: boolean = false;
  private audioContext: AudioContext;
  private masterGain: GainNode;

  constructor(audioContext: AudioContext, masterGain: GainNode) {
    this.audioContext = audioContext;
    this.masterGain = masterGain;
  }

  /**
   * 음표 재생
   */
  async playNote(
    frequency: number,
    duration: number,
    volume: number = 0.5,
    waveform: OscillatorType = 'square',
    envelope: EnvelopeConfig = {}
  ): Promise<void> {
    this.stop();

    const attack = envelope.attack ?? 0.01;
    const release = envelope.release ?? 0.1;

    return new Promise<void>((resolve) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = waveform;
      oscillator.frequency.value = frequency;

      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + attack);
      gainNode.gain.setValueAtTime(volume, now + duration - release);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      this.oscillator = oscillator;
      this.gainNode = gainNode;
      this.isActive = true;

      oscillator.start(now);
      oscillator.stop(now + duration);

      oscillator.onended = () => {
        this.cleanup();
        resolve();
      };
    });
  }

  /**
   * 채널 중지
   */
  stop(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {
        // 이미 중지된 경우 무시
      }
    }
    this.cleanup();
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    this.oscillator = null;
    this.gainNode = null;
    this.isActive = false;
  }

  /**
   * 활성 상태 확인
   */
  getIsActive(): boolean {
    return this.isActive;
  }
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
  private channels: AudioChannel[] = [];
  private readonly MAX_CHANNELS = 3;

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

      // 채널 초기화
      for (let i = 0; i < this.MAX_CHANNELS; i++) {
        this.channels.push(new AudioChannel(this.audioContext, this.masterGain));
      }
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
        await this.playNote(
          note.frequency,
          note.duration,
          note.volume ?? 0.5,
          note.waveform ?? 'square'
        );
      }
    }

    this.playing = false;
  }

  /**
   * 단일 음표 재생
   */
  private async playNote(
    frequency: number,
    duration: number,
    volume: number = 0.5,
    waveform: OscillatorType = 'square'
  ): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    return new Promise<void>((resolve) => {
      if (!this.audioContext || !this.masterGain) {
        resolve();
        return;
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = waveform;
      oscillator.frequency.value = frequency;

      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.setValueAtTime(volume, now + duration - 0.01);
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
    let volume = 0.5; // 기본 볼륨 (0-1 범위)
    let waveform: OscillatorType = 'square'; // 기본 파형
    let articulation = 0.875; // Normal (MN): 87.5%

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

      // 볼륨 설정 (V0-V15)
      if (char === 'V') {
        i++;
        let volStr = '';
        while (i < mml.length && /\d/.test(mml[i] ?? '')) {
          volStr += mml[i];
          i++;
        }
        const v = parseInt(volStr, 10);
        if (v >= 0 && v <= 15) {
          volume = v / 15; // 0-15를 0-1 범위로 변환
        }
        continue;
      }

      // 파형 설정 (W0-W3)
      if (char === 'W') {
        i++;
        const waveNum = parseInt(mml[i] ?? '0', 10);
        if (waveNum === 0) waveform = 'sine';
        else if (waveNum === 1) waveform = 'square';
        else if (waveNum === 2) waveform = 'sawtooth';
        else if (waveNum === 3) waveform = 'triangle';
        i++;
        continue;
      }

      // 아티큘레이션 (ML, MN, MS)
      if (char === 'M') {
        i++;
        const artChar = mml[i]?.toUpperCase();
        if (artChar === 'L') {
          articulation = 1.0; // Legato: 100%
        } else if (artChar === 'N') {
          articulation = 0.875; // Normal: 87.5%
        } else if (artChar === 'S') {
          articulation = 0.75; // Staccato: 75%
        }
        i++;
        continue;
      }

      // 반복 시작 ([)
      if (char === '[') {
        // 반복 구간 찾기
        let repeatStart = i + 1;
        let depth = 1;
        let repeatEnd = i + 1;

        while (repeatEnd < mml.length && depth > 0) {
          if (mml[repeatEnd] === '[') depth++;
          else if (mml[repeatEnd] === ']') depth--;
          repeatEnd++;
        }

        if (depth === 0) {
          // 반복 횟수 파싱
          let repeatCount = 2; // 기본 2회
          let j = repeatEnd;
          let countStr = '';
          while (j < mml.length && /\d/.test(mml[j] ?? '')) {
            countStr += mml[j];
            j++;
          }
          if (countStr) {
            repeatCount = Math.min(parseInt(countStr, 10), 100); // 최대 100회
          }

          // 반복 구간 추출
          const repeatSection = mml.substring(repeatStart, repeatEnd - 1);

          // 반복 구간을 반복 횟수만큼 복제
          const expandedMML = repeatSection.repeat(repeatCount);

          // 현재 위치에 반복 구간 삽입
          mml = mml.substring(0, i) + expandedMML + mml.substring(j);

          // i는 그대로 유지 (확장된 부분부터 다시 파싱)
          continue;
        }

        i++;
        continue;
      }

      // 반복 종료 (])는 이미 처리됨
      if (char === ']') {
        i++;
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

      // 타이 (&)
      if (char === '&') {
        // 이전 음표와 다음 음표를 연결
        // 이전 음표의 duration을 증가시킴
        i++;
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

        // 타이(&) 처리: 다음 문자가 &이면 다음 음표와 연결
        let tied = false;
        if (i < mml.length && mml[i] === '&') {
          tied = true;
        }

        notes.push({
          frequency,
          duration: duration * articulation,
          volume,
          waveform,
          articulation: tied ? 1.0 : articulation // 타이된 음표는 간격 없음
        });
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

  /**
   * 특정 채널에서 MML 재생
   */
  async playMMLOnChannel(channel: number, musicString: string): Promise<void> {
    if (channel < 0 || channel >= this.MAX_CHANNELS) {
      throw new BasicError(
        `Channel must be between 0 and ${this.MAX_CHANNELS - 1}`,
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;

    const targetChannel = this.channels[channel];
    if (!targetChannel) return;

    const notes = this.parseMML(musicString);

    for (const note of notes) {
      if (note.frequency === 0) {
        await this.delay(note.duration);
      } else {
        await targetChannel.playNote(
          note.frequency,
          note.duration,
          note.volume ?? 0.5,
          note.waveform ?? 'square'
        );
      }
    }
  }

  /**
   * 특정 채널 중지
   */
  stopChannel(channel: number): void {
    if (channel < 0 || channel >= this.MAX_CHANNELS) {
      throw new BasicError(
        `Channel must be between 0 and ${this.MAX_CHANNELS - 1}`,
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    const targetChannel = this.channels[channel];
    if (targetChannel) {
      targetChannel.stop();
    }
  }

  /**
   * 모든 채널 중지
   */
  stopAllChannels(): void {
    for (const channel of this.channels) {
      channel.stop();
    }
  }

  /**
   * 화음 재생 (여러 음을 동시에)
   */
  async playChord(notes: string[], duration: number): Promise<void> {
    this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;

    if (notes.length > this.MAX_CHANNELS) {
      throw new BasicError(
        `Cannot play more than ${this.MAX_CHANNELS} notes simultaneously`,
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    const noteFrequencies: Record<string, number[]> = {
      'C': [16.35, 32.70, 65.41, 130.81, 261.63, 523.25, 1046.50],
      'D': [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66],
      'E': [20.60, 41.20, 82.41, 164.81, 329.63, 659.25, 1318.51],
      'F': [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91],
      'G': [24.50, 49.00, 98.00, 196.00, 392.00, 783.99, 1567.98],
      'A': [27.50, 55.00, 110.00, 220.00, 440.00, 880.00, 1760.00],
      'B': [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53]
    };

    const promises: Promise<void>[] = [];

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (!note) continue;

      // 음표 파싱 (예: "C4", "D#5")
      const noteName = note[0]?.toUpperCase();
      const octaveStr = note.match(/\d+/)?.[0];
      const octave = octaveStr ? parseInt(octaveStr, 10) : 4;

      if (noteName && noteFrequencies[noteName]) {
        const frequency = noteFrequencies[noteName]?.[octave] ?? 440;
        const channel = this.channels[i];

        if (channel) {
          promises.push(channel.playNote(frequency, duration / 1000)); // ms를 초로 변환
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * 페이드 인
   */
  fadeIn(durationMs: number): void {
    if (!this.masterGain || !this.audioContext) return;

    const duration = durationMs / 1000;
    const now = this.audioContext.currentTime;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.volume, now + duration);
  }

  /**
   * 페이드 아웃
   */
  fadeOut(durationMs: number): void {
    if (!this.masterGain || !this.audioContext) return;

    const duration = durationMs / 1000;
    const now = this.audioContext.currentTime;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.volume, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + duration);
  }
}
