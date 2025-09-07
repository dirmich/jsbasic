/**
 * 웹 환경용 에뮬레이터 래퍼
 * 브라우저 환경에 최적화된 기능들을 제공합니다.
 */

import { BasicEmulator, EmulatorState } from '../system/emulator.js';
import { Terminal, TerminalState } from '../io/terminal.js';
import { EventEmitter } from '../utils/events.js';

export interface WebEmulatorConfig {
  containerId: string;
  autoFocus?: boolean;
  enablePersistence?: boolean;
  theme?: 'dark' | 'light';
}

export interface WebEmulatorCallbacks {
  onOutput?: (text: string, type: 'output' | 'error' | 'system') => void;
  onStateChange?: (state: EmulatorState) => void;
  onCommand?: (command: string) => void;
}

/**
 * 웹 환경용 에뮬레이터 클래스
 */
export class WebEmulator extends EventEmitter {
  private emulator: BasicEmulator;
  private container: HTMLElement;
  private config: WebEmulatorConfig;
  private callbacks: WebEmulatorCallbacks;
  
  // DOM 요소들
  private terminalOutput: HTMLElement | null = null;
  private terminalInput: HTMLInputElement | null = null;
  private systemInfoElements: Map<string, HTMLElement> = new Map();
  
  // 상태 관리
  private isInitialized = false;
  private updateInterval: number | null = null;

  constructor(config: WebEmulatorConfig, callbacks: WebEmulatorCallbacks = {}) {
    super();
    
    this.config = config;
    this.callbacks = callbacks;
    
    // 컨테이너 요소 찾기
    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container element with id '${config.containerId}' not found`);
    }
    
    this.container = container;
    this.emulator = new BasicEmulator();
    
    this.initialize();
  }

  /**
   * 웹 에뮬레이터 초기화
   */
  private async initialize(): Promise<void> {
    try {
      // DOM 요소들 찾기
      this.findDOMElements();
      
      // 이벤트 핸들러 설정
      this.setupEventHandlers();
      
      // 에뮬레이터 시작
      this.emulator.start();
      
      // 주기적 업데이트 시작
      this.startPeriodicUpdate();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('🎮 WebEmulator initialized successfully');
      
    } catch (error) {
      console.error('❌ WebEmulator initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * DOM 요소들 찾기
   */
  private findDOMElements(): void {
    this.terminalOutput = document.getElementById('terminal-output');
    this.terminalInput = document.getElementById('terminal-input') as HTMLInputElement;
    
    // 시스템 정보 요소들
    const systemInfoSelectors = [
      'cpu-status', 'memory-status', 'uptime',
      'reg-a', 'reg-x', 'reg-y', 'reg-pc', 'reg-sp', 'reg-p'
    ];
    
    systemInfoSelectors.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.systemInfoElements.set(id, element);
      }
    });
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    // 에뮬레이터 이벤트
    this.emulator.on('stateChange', (event) => {
      this.callbacks.onStateChange?.(event.to);
      this.emit('stateChange', event);
    });
    
    // 터미널 이벤트
    const terminal = this.emulator.getTerminal();
    terminal.on('output', (event) => {
      this.displayOutput(event.text, event.type);
      this.callbacks.onOutput?.(event.text, event.type);
    });
    
    // 키보드 이벤트
    if (this.terminalInput) {
      this.terminalInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
      
      if (this.config.autoFocus !== false) {
        this.terminalInput.focus();
      }
    }
    
    // 터미널 클릭 시 포커스
    if (this.terminalOutput?.parentElement) {
      this.terminalOutput.parentElement.addEventListener('click', () => {
        this.terminalInput?.focus();
      });
    }
  }

  /**
   * 키보드 이벤트 처리
   */
  private async handleKeyDown(e: KeyboardEvent): Promise<void> {
    const input = e.target as HTMLInputElement;
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        const command = input.value;
        input.value = '';
        
        if (command.trim()) {
          this.callbacks.onCommand?.(command);
          await this.executeCommand(command);
        }
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault();
        // 명령어 히스토리 처리 (나중에 구현)
        break;
        
      case 'Tab':
        e.preventDefault();
        // 자동완성 (나중에 구현)
        break;
    }
  }

  /**
   * 명령어 실행
   */
  private async executeCommand(command: string): Promise<void> {
    try {
      const terminal = this.emulator.getTerminal();
      
      // 입력 표시
      this.displayOutput(`READY. ${command}`, 'input');
      
      // 명령어 실행 (터미널 이벤트를 통해 처리)
      terminal.handleKeyInput(command.split('').pop() || '');
      for (const char of command) {
        terminal.handleKeyInput(char);
      }
      terminal.handleKeyInput('Enter');
      
    } catch (error) {
      console.error('Command execution error:', error);
      this.displayOutput(`ERROR: ${error}`, 'error');
    }
  }

  /**
   * 터미널 출력 표시
   */
  private displayOutput(text: string, type: 'input' | 'output' | 'error' | 'system'): void {
    if (!this.terminalOutput) return;
    
    const lines = text.split('\n');
    lines.forEach(line => {
      const div = document.createElement('div');
      div.className = `terminal-line ${type}`;
      div.textContent = line;
      this.terminalOutput!.appendChild(div);
    });
    
    // 스크롤을 맨 아래로
    this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
  }

  /**
   * 시스템 정보 업데이트
   */
  private updateSystemInfo(): void {
    const stats = this.emulator.getStats();
    const cpu = this.emulator.getCPU();
    const state = this.emulator.getState();
    
    // 시스템 상태
    const cpuElement = this.systemInfoElements.get('cpu-status');
    if (cpuElement) {
      cpuElement.textContent = `CPU: ${state === EmulatorState.RUNNING_BASIC ? '실행중' : '정지'}`;
    }
    
    const memoryElement = this.systemInfoElements.get('memory-status');
    if (memoryElement) {
      memoryElement.textContent = `메모리: ${Math.floor(stats.memoryUsed / 1024)}KB`;
    }
    
    const uptimeElement = this.systemInfoElements.get('uptime');
    if (uptimeElement) {
      const uptimeSeconds = Math.floor(stats.uptime / 1000);
      uptimeElement.textContent = `가동시간: ${uptimeSeconds}s`;
    }
    
    // CPU 레지스터 (실제 구현에서는 CPU 상태를 가져와야 함)
    const debugInfo = cpu?.getDebugInfo?.() || {
      registers: { A: 0, X: 0, Y: 0, PC: 0, SP: 0xFF, P: 0 },
      flags: { N: false, V: false, B: false, D: false, I: false, Z: false, C: false }
    };
    
    ['A', 'X', 'Y', 'PC', 'SP', 'P'].forEach(reg => {
      const element = this.systemInfoElements.get(`reg-${reg.toLowerCase()}`);
      if (element) {
        const value = debugInfo.registers[reg as keyof typeof debugInfo.registers] || 0;
        const format = reg === 'PC' ? 4 : 2;
        element.textContent = `$${value.toString(16).padStart(format, '0').toUpperCase()}`;
      }
    });
  }

  /**
   * 주기적 업데이트 시작
   */
  private startPeriodicUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = window.setInterval(() => {
      this.updateSystemInfo();
    }, 1000);
  }

  /**
   * 터미널 지우기
   */
  clearTerminal(): void {
    if (this.terminalOutput) {
      this.terminalOutput.innerHTML = '';
    }
  }

  /**
   * 에뮬레이터 재시작
   */
  restart(): void {
    this.clearTerminal();
    this.emulator.stop();
    this.emulator.start();
  }

  /**
   * 명령어 실행 (외부에서 호출)
   */
  async runCommand(command: string): Promise<void> {
    await this.executeCommand(command);
  }

  /**
   * 현재 프로그램 가져오기
   */
  getCurrentProgram(): any {
    return this.emulator.getBasicInterpreter().getCurrentProgram();
  }

  /**
   * 메모리 내용 가져오기
   */
  getMemoryData(address: number, length: number = 256): number[] {
    const memory = this.emulator.getMemoryManager();
    const data: number[] = [];
    
    for (let i = 0; i < length; i++) {
      try {
        data.push(memory.read(address + i));
      } catch {
        data.push(0);
      }
    }
    
    return data;
  }

  /**
   * 정리
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.emulator.stop();
    this.removeAllListeners();
  }

  /**
   * 디버깅 정보
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      emulatorState: this.emulator.getState(),
      emulatorDebugInfo: this.emulator.getDebugInfo()
    };
  }
}