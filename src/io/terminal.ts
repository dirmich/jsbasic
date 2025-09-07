/**
 * 터미널 인터페이스 클래스
 * 입출력 처리와 사용자 상호작용을 담당합니다.
 */

import { EventEmitter } from '../utils/events.js';

export interface TerminalConfig {
  width: number;
  height: number;
  maxHistory: number;
  prompt: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface TerminalLine {
  content: string;
  type: 'input' | 'output' | 'error' | 'system';
  timestamp: number;
}

/**
 * 터미널 상태 관리
 */
export enum TerminalState {
  READY = 'READY',
  INPUT = 'INPUT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED'
}

/**
 * 터미널 인터페이스 클래스
 * BASIC 프로그램과 사용자 간의 입출력을 처리합니다.
 */
export class Terminal extends EventEmitter {
  private config: TerminalConfig;
  private lines: TerminalLine[] = [];
  private cursor: CursorPosition = { x: 0, y: 0 };
  private state: TerminalState = TerminalState.READY;
  private inputBuffer = '';
  private inputCallback: ((input: string) => void) | null = null;
  private currentColumn = 0;
  private tabSize = 8;

  constructor(config: Partial<TerminalConfig> = {}) {
    super();
    
    this.config = {
      width: 80,
      height: 24,
      maxHistory: 1000,
      prompt: 'READY.',
      ...config
    };
  }

  /**
   * 터미널 초기화
   */
  initialize(): void {
    this.clear();
    this.showWelcome();
    this.showPrompt();
  }

  /**
   * 환영 메시지 표시
   */
  private showWelcome(): void {
    this.writeLine('6502 BASIC INTERPRETER V1.1', 'system');
    this.writeLine('READY.', 'system');
    this.writeLine('', 'system');
  }

  /**
   * 프롬프트 표시
   */
  showPrompt(): void {
    if (this.state === TerminalState.READY) {
      this.write(this.config.prompt + ' ', 'system');
    }
  }

  /**
   * 텍스트 출력 (개행 포함)
   */
  writeLine(text: string, type: TerminalLine['type'] = 'output'): void {
    // 새로운 라인을 직접 추가
    this.lines.push({
      content: text + '\n',
      type,
      timestamp: Date.now()
    });
    
    // 커서 위치 업데이트 (새 줄)
    this.cursor.y++;
    this.cursor.x = 0;
    this.currentColumn = 0;
    
    this.emit('output', { text: text + '\n', type });
    
    // 히스토리 관리
    this.enforceHistoryLimit();
  }

  /**
   * 텍스트 출력
   */
  write(text: string, type: TerminalLine['type'] = 'output'): void {
    // 탭 문자를 공백으로 변환
    const processedText = this.processTabCharacters(text);
    
    // 각 write 호출에 대해 새로운 라인 생성
    this.lines.push({
      content: processedText,
      type,
      timestamp: Date.now()
    });
    
    // 개행 문자가 있으면 커서 위치 업데이트
    if (processedText.includes('\n')) {
      this.newLine();
    }
    
    this.emit('output', { text: processedText, type });
    
    // 히스토리 관리
    this.enforceHistoryLimit();
  }

  /**
   * 탭 문자를 공백으로 변환
   */
  private processTabCharacters(text: string): string {
    return text.replace(/\t/g, ' '.repeat(this.tabSize));
  }

  /**
   * 히스토리 제한 적용
   */
  private enforceHistoryLimit(): void {
    while (this.lines.length > this.config.maxHistory) {
      this.lines.shift();
    }
  }


  /**
   * 새 줄 시작
   */
  private newLine(): void {
    this.currentColumn = 0;
    this.cursor.y++;
    this.cursor.x = 0;
    
    // 히스토리 관리
    if (this.lines.length >= this.config.maxHistory) {
      this.lines.shift();
    }
  }

  /**
   * 사용자 입력 요청
   */
  requestInput(prompt?: string): Promise<string> {
    return new Promise((resolve) => {
      if (prompt) {
        this.write(prompt, 'system');
      }
      
      this.state = TerminalState.INPUT;
      this.inputCallback = (input: string) => {
        this.state = TerminalState.READY;
        this.inputCallback = null;
        resolve(input);
      };
      
      this.emit('inputRequest');
    });
  }

  /**
   * 키보드 입력 처리
   */
  handleKeyInput(key: string): void {
    switch (key) {
      case 'Enter':
        this.handleEnterKey();
        break;
        
      case 'Backspace':
        this.handleBackspaceKey();
        break;
        
      case 'Tab':
        this.handleTabKey();
        break;
        
      case 'Escape':
        this.handleEscapeKey();
        break;
        
      default:
        if (key.length === 1) {
          this.handleCharacterKey(key);
        }
        break;
    }
  }

  /**
   * Enter 키 처리
   */
  private handleEnterKey(): void {
    const input = this.inputBuffer.trim();
    
    // 입력된 내용을 화면에 표시
    this.writeLine(input, 'input');
    
    if (this.state === TerminalState.INPUT && this.inputCallback) {
      // INPUT 명령 대기 중
      this.inputCallback(input);
    } else {
      // 일반 명령 처리
      this.processCommand(input);
    }
    
    this.inputBuffer = '';
  }

  /**
   * Backspace 키 처리
   */
  private handleBackspaceKey(): void {
    if (this.inputBuffer.length > 0) {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this.emit('inputChange', this.inputBuffer);
    }
  }

  /**
   * Tab 키 처리
   */
  private handleTabKey(): void {
    this.inputBuffer += '\t';
    this.emit('inputChange', this.inputBuffer);
  }

  /**
   * Escape 키 처리
   */
  private handleEscapeKey(): void {
    if (this.state === TerminalState.RUNNING) {
      this.interrupt();
    } else {
      this.inputBuffer = '';
      this.emit('inputChange', this.inputBuffer);
    }
  }

  /**
   * 문자 키 처리
   */
  private handleCharacterKey(char: string): void {
    this.inputBuffer += char;
    this.emit('inputChange', this.inputBuffer);
  }

  /**
   * 명령 처리
   */
  private processCommand(command: string): void {
    if (command === '') {
      this.showPrompt();
      return;
    }
    
    this.emit('command', command);
  }

  /**
   * 프로그램 실행 중단
   */
  interrupt(): void {
    if (this.state === TerminalState.RUNNING) {
      this.writeLine('\nBREAK', 'system');
      this.state = TerminalState.READY;
      this.emit('interrupt');
      this.showPrompt();
    }
  }

  /**
   * 화면 지우기
   */
  clear(): void {
    this.lines = [];
    this.cursor = { x: 0, y: 0 };
    this.currentColumn = 0;
    this.emit('clear');
  }

  /**
   * 실행 상태 설정
   */
  setState(state: TerminalState): void {
    const oldState = this.state;
    this.state = state;
    
    if (oldState !== state) {
      this.emit('stateChange', { from: oldState, to: state });
    }
  }

  /**
   * 현재 입력 버퍼 반환
   */
  getInputBuffer(): string {
    return this.inputBuffer;
  }

  /**
   * 터미널 라인 히스토리 반환
   */
  getHistory(): TerminalLine[] {
    return [...this.lines];
  }

  /**
   * 현재 상태 반환
   */
  getState(): TerminalState {
    return this.state;
  }

  /**
   * 커서 위치 반환
   */
  getCursor(): CursorPosition {
    return { ...this.cursor };
  }

  /**
   * 터미널 설정 반환
   */
  getConfig(): TerminalConfig {
    return { ...this.config };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<TerminalConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChange', this.config);
  }

  /**
   * 디버깅 정보 반환
   */
  getDebugInfo() {
    return {
      state: this.state,
      lineCount: this.lines.length,
      inputBufferLength: this.inputBuffer.length,
      cursor: this.cursor,
      currentColumn: this.currentColumn
    };
  }
}