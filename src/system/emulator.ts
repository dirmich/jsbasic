/**
 * 6502 BASIC 에뮬레이터 통합 시스템
 * CPU, BASIC 인터프리터, 메모리 매니저, 터미널을 통합합니다.
 */

import { CPU6502 } from '../cpu/cpu.js';
import { BasicInterpreter } from '../basic/interpreter.js';
import { Parser } from '../basic/parser.js';
import { MemoryManager } from '../memory/manager.js';
import { Terminal, TerminalState } from '../io/terminal.js';
import { EventEmitter } from '../utils/events.js';

export interface EmulatorConfig {
  cpuFrequency: number;
  memorySize: number;
  terminal: {
    width: number;
    height: number;
  };
}

export enum EmulatorState {
  STOPPED = 'STOPPED',
  RUNNING_BASIC = 'RUNNING_BASIC',
  RUNNING_6502 = 'RUNNING_6502',
  DEBUGGING = 'DEBUGGING',
  ERROR = 'ERROR'
}

export interface EmulatorStats {
  uptime: number;
  instructionsExecuted: number;
  basicLinesExecuted: number;
  memoryUsed: number;
  cpuCycles: number;
}

/**
 * 6502 BASIC 에뮬레이터 메인 클래스
 */
export class BasicEmulator extends EventEmitter {
  private cpu!: CPU6502;
  private basicInterpreter!: BasicInterpreter;
  private memoryManager!: MemoryManager;
  private terminal!: Terminal;
  private parser!: Parser;
  
  private state: EmulatorState = EmulatorState.STOPPED;
  private config!: EmulatorConfig;
  private stats!: EmulatorStats;
  private startTime: number = 0;
  private animationFrame: number | null = null;

  constructor(config: Partial<EmulatorConfig> = {}) {
    super();
    
    this.config = {
      cpuFrequency: 1000000, // 1MHz
      memorySize: 65536,     // 64KB
      terminal: {
        width: 80,
        height: 24
      },
      ...config
    };
    
    this.initializeComponents();
    this.setupEventHandlers();
    this.resetStats();
  }

  /**
   * 컴포넌트 초기화
   */
  private initializeComponents(): void {
    // 메모리 매니저 초기화
    this.memoryManager = new MemoryManager(this.config.memorySize, {
      enforceProtection: true,
      enableBanking: true,
      trackAccess: true
    });
    
    // CPU 초기화
    this.cpu = new CPU6502(this.memoryManager);
    
    // BASIC 인터프리터 초기화
    this.basicInterpreter = new BasicInterpreter();
    
    // 터미널 초기화
    this.terminal = new Terminal(this.config.terminal);
    
    // 파서 초기화
    this.parser = new Parser('');
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    // 터미널 명령 처리
    this.terminal.on('command', async (command: string) => {
      await this.handleTerminalCommand(command);
    });
    
    // 터미널 인터럽트 처리
    this.terminal.on('interrupt', () => {
      this.stop();
    });
    
    // BASIC 인터프리터 출력 처리
    this.basicInterpreter.on('output', (text: string) => {
      this.terminal.write(text);
    });
    
    // BASIC 인터프리터 입력 요청 처리
    this.basicInterpreter.on('inputRequest', async (prompt?: string) => {
      const input = await this.terminal.requestInput(prompt);
      this.basicInterpreter.provideInput([input]);
    });
    
    // BASIC 인터프리터 상태 변경 처리
    this.basicInterpreter.on('stateChange', (newState) => {
      this.updateEmulatorState();
    });
    
    // CPU 이벤트 처리
    this.cpu.on('error', (error) => {
      this.handleError(`CPU Error: ${error.message}`);
    });
    
    // 메모리 매니저 이벤트 처리
    this.memoryManager.on('protection', (address, operation, protection) => {
      console.warn(`메모리 보호 위반: 주소 0x${address.toString(16).padStart(4, '0')} ${operation}`);
    });
  }

  /**
   * 에뮬레이터 시작
   */
  start(): void {
    if (this.state !== EmulatorState.STOPPED) {
      return;
    }
    
    this.startTime = Date.now();
    this.terminal.initialize();
    this.setState(EmulatorState.RUNNING_BASIC);
    
    this.emit('start');
  }

  /**
   * 에뮬레이터 중지
   */
  stop(): void {
    if (this.state === EmulatorState.STOPPED) {
      return;
    }
    
    // 실행 중인 프로그램 중지
    this.basicInterpreter.stop();
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.setState(EmulatorState.STOPPED);
    this.terminal.setState(TerminalState.READY);
    
    this.emit('stop');
  }

  /**
   * 터미널 명령 처리
   */
  private async handleTerminalCommand(command: string): Promise<void> {
    const upperCommand = command.toUpperCase().trim();
    
    try {
      // 시스템 명령 처리
      if (upperCommand === 'NEW') {
        this.basicInterpreter.clear();
        this.terminal.writeLine('NEW PROGRAM');
        this.terminal.showPrompt();
        return;
      }
      
      if (upperCommand === 'LIST') {
        const program = this.basicInterpreter.getCurrentProgram();
        if (program && program.statements.length > 0) {
          // 프로그램 리스트 출력
          for (const stmt of program.statements) {
            if (stmt.lineNumber !== undefined) {
              this.terminal.writeLine(`${stmt.lineNumber} ${this.formatStatement(stmt)}`);
            }
          }
        }
        this.terminal.showPrompt();
        return;
      }
      
      if (upperCommand === 'RUN') {
        await this.runBasicProgram();
        return;
      }
      
      if (upperCommand === 'STOP') {
        this.stop();
        this.terminal.writeLine('STOP');
        this.terminal.showPrompt();
        return;
      }
      
      if (upperCommand === 'CONT') {
        // 프로그램 계속 실행 (나중에 구현)
        this.terminal.writeLine('CAN\'T CONTINUE');
        this.terminal.showPrompt();
        return;
      }
      
      if (upperCommand.startsWith('SAVE ')) {
        const filename = upperCommand.substring(5).trim().replace(/"/g, '');
        this.saveProgram(filename);
        return;
      }
      
      if (upperCommand.startsWith('LOAD ')) {
        const filename = upperCommand.substring(5).trim().replace(/"/g, '');
        this.loadProgram(filename);
        return;
      }
      
      // BASIC 프로그램 라인 또는 즉시 실행 명령
      await this.parseAndExecuteBasic(command);
      
    } catch (error) {
      this.handleError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * BASIC 프로그램 실행
   */
  private async runBasicProgram(): Promise<void> {
    const program = this.basicInterpreter.getCurrentProgram();
    
    if (!program || program.statements.length === 0) {
      this.terminal.writeLine('NO PROGRAM');
      this.terminal.showPrompt();
      return;
    }
    
    try {
      this.setState(EmulatorState.RUNNING_BASIC);
      this.terminal.setState(TerminalState.RUNNING);
      
      await this.basicInterpreter.run(program);
      
      this.setState(EmulatorState.STOPPED);
      this.terminal.setState(TerminalState.READY);
      this.terminal.showPrompt();
      
    } catch (error) {
      this.handleError(`Runtime Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * BASIC 코드 파싱 및 실행
   */
  private async parseAndExecuteBasic(code: string): Promise<void> {
    try {
      this.parser = new Parser(code);
      const program = this.parser.parseProgram();
      
      // 라인 번호가 있는 경우 프로그램에 추가
      if (program.statements.length > 0 && program.statements[0].lineNumber !== undefined) {
        this.basicInterpreter.addProgram(program);
        this.terminal.showPrompt();
      } else {
        // 즉시 실행
        await this.basicInterpreter.run(program);
        this.terminal.showPrompt();
      }
      
    } catch (error) {
      this.handleError(`Syntax Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 프로그램 저장
   */
  private saveProgram(filename: string): void {
    try {
      const program = this.basicInterpreter.getCurrentProgram();
      if (program && program.statements.length > 0) {
        // 로컬 스토리지에 저장 (브라우저 환경)
        if (typeof localStorage !== 'undefined') {
          const programData = JSON.stringify(program);
          localStorage.setItem(`basic_program_${filename}`, programData);
          this.terminal.writeLine(`SAVED "${filename}"`);
        } else {
          this.terminal.writeLine('SAVE NOT SUPPORTED');
        }
      } else {
        this.terminal.writeLine('NO PROGRAM TO SAVE');
      }
    } catch (error) {
      this.handleError(`Save Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    this.terminal.showPrompt();
  }

  /**
   * 프로그램 로드
   */
  private loadProgram(filename: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const programData = localStorage.getItem(`basic_program_${filename}`);
        if (programData) {
          const program = JSON.parse(programData);
          this.basicInterpreter.addProgram(program);
          this.terminal.writeLine(`LOADED "${filename}"`);
        } else {
          this.terminal.writeLine(`FILE NOT FOUND: "${filename}"`);
        }
      } else {
        this.terminal.writeLine('LOAD NOT SUPPORTED');
      }
    } catch (error) {
      this.handleError(`Load Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    this.terminal.showPrompt();
  }

  /**
   * 문장을 문자열로 포맷
   */
  private formatStatement(stmt: any): string {
    // 간단한 문장 포맷팅 (실제로는 더 복잡한 로직 필요)
    return JSON.stringify(stmt).substring(0, 50) + '...';
  }

  /**
   * 에뮬레이터 상태 업데이트
   */
  private updateEmulatorState(): void {
    const basicState = this.basicInterpreter.getState();
    
    if (basicState === 'RUNNING') {
      this.setState(EmulatorState.RUNNING_BASIC);
    } else {
      this.setState(EmulatorState.STOPPED);
    }
  }

  /**
   * 상태 설정
   */
  private setState(newState: EmulatorState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emit('stateChange', { from: oldState, to: newState });
    }
  }

  /**
   * 에러 처리
   */
  private handleError(message: string): void {
    this.setState(EmulatorState.ERROR);
    this.terminal.writeLine(message, 'error');
    this.terminal.showPrompt();
    this.emit('error', new Error(message));
  }

  /**
   * 통계 리셋
   */
  private resetStats(): void {
    this.stats = {
      uptime: 0,
      instructionsExecuted: 0,
      basicLinesExecuted: 0,
      memoryUsed: 0,
      cpuCycles: 0
    };
  }

  /**
   * 통계 업데이트
   */
  private updateStats(): void {
    this.stats.uptime = this.startTime > 0 ? Date.now() - this.startTime : 0;
    this.stats.memoryUsed = this.memoryManager.getUsage();
    // CPU와 BASIC 인터프리터 통계는 나중에 구현
  }

  // Getter 메서드들
  
  getState(): EmulatorState {
    return this.state;
  }
  
  getCPU(): CPU6502 {
    return this.cpu;
  }
  
  getBasicInterpreter(): BasicInterpreter {
    return this.basicInterpreter;
  }
  
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }
  
  getTerminal(): Terminal {
    return this.terminal;
  }
  
  getStats(): EmulatorStats {
    this.updateStats();
    return { ...this.stats };
  }
  
  getConfig(): EmulatorConfig {
    return { ...this.config };
  }

  /**
   * 디버깅 정보 반환
   */
  getDebugInfo() {
    return {
      state: this.state,
      uptime: this.stats.uptime,
      components: {
        cpu: this.cpu.getDebugInfo(),
        basic: this.basicInterpreter.getDebugInfo(),
        memory: this.memoryManager.getMemoryStats(),
        terminal: this.terminal.getDebugInfo()
      }
    };
  }
}