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
import { GraphicsEngine } from '../graphics/graphics-engine.js';
import { PixelBuffer } from '../graphics/pixel-buffer.js';
import { ColorManager } from '../graphics/color-manager.js';
import { AudioEngine } from '../audio/audio-engine.js';
import { FileSystem } from './file-system.js';
import { MobileOptimizer } from '../mobile/mobile-optimizer.js';
import { GestureHandler } from '../mobile/gesture-handler.js';
import { ResponsiveLayout } from '../mobile/responsive-layout.js';

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
  private graphicsEngine!: GraphicsEngine;
  private pixelBuffer!: PixelBuffer;
  private colorManager!: ColorManager;
  private audioEngine!: AudioEngine;
  private fileSystem!: FileSystem;
  private mobileOptimizer: MobileOptimizer | null = null;
  private gestureHandler: GestureHandler | null = null;
  private responsiveLayout: ResponsiveLayout | null = null;

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

    // 그래픽 시스템 초기화
    this.pixelBuffer = new PixelBuffer(320, 200); // 기본 SCREEN 1 모드
    this.colorManager = new ColorManager();
    this.graphicsEngine = new GraphicsEngine(this.pixelBuffer, this.colorManager);

    // 인터프리터에 그래픽 엔진 연결
    this.basicInterpreter.setGraphicsEngine(this.graphicsEngine);

    // 오디오 시스템 초기화
    this.audioEngine = new AudioEngine();

    // 파일 시스템 초기화
    this.fileSystem = new FileSystem();

    // 인터프리터에 파일 시스템 연결
    this.basicInterpreter.setFileSystem(this.fileSystem);

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
      console.log('[Emulator] Terminal command received:', command);
      await this.handleTerminalCommand(command);
    });
    
    // 터미널 인터럽트 처리
    this.terminal.on('interrupt', () => {
      this.stop();
    });
    
    // BASIC 인터프리터 출력 처리
    this.basicInterpreter.on('output', (text: string) => {
      console.log('[Emulator] BasicInterpreter output:', text);
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

    // BASIC 인터프리터 사운드 이벤트 처리
    this.basicInterpreter.on('sound', async (frequency: number, duration: number) => {
      await this.audioEngine.sound(frequency, duration);
    });

    // BASIC 인터프리터 음악 재생 이벤트 처리
    this.basicInterpreter.on('play', async (musicString: string) => {
      await this.audioEngine.play(musicString);
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
    console.log('[Emulator] handleTerminalCommand called:', command);
    const upperCommand = command.toUpperCase().trim();
    console.log('[Emulator] upperCommand:', upperCommand);

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
        console.log('[Emulator] LIST command, program:', program);
        if (program && program.statements.length > 0) {
          // 프로그램 리스트 출력
          for (const stmt of program.statements) {
            if (stmt.lineNumber !== undefined) {
              const line = `${stmt.lineNumber} ${this.formatStatement(stmt)}`;
              console.log('[Emulator] LIST line:', line);
              this.terminal.writeLine(line);
            }
          }
        } else {
          console.log('[Emulator] No program to list');
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
        const filename = command.substring(5).trim().replace(/"/g, '').toUpperCase();
        console.log('[Emulator] SAVE command detected, filename:', filename);
        this.saveProgram(filename);
        return;
      }

      if (upperCommand.startsWith('LOAD ')) {
        const filename = command.substring(5).trim().replace(/"/g, '').toUpperCase();
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
      console.log('[Emulator] Parsing code:', code);
      this.parser = new Parser(code);
      const program = this.parser.parseProgram();
      console.log('[Emulator] Parsed AST:', JSON.stringify(program, null, 2));

      // 라인 번호가 있는 경우 프로그램에 추가
      if (program.statements.length > 0 && program.statements[0]?.lineNumber !== undefined) {
        console.log('[Emulator] Adding to program');
        this.basicInterpreter.addProgram(program);
        this.terminal.showPrompt();
      } else {
        // 즉시 실행
        console.log('[Emulator] Immediate execution');
        await this.basicInterpreter.run(program);
        console.log('[Emulator] Execution complete');
        this.terminal.showPrompt();
      }

    } catch (error) {
      console.error('[Emulator] Parse/Execute error:', error);
      this.handleError(`Syntax Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 프로그램 저장
   */
  private saveProgram(filename: string): void {
    try {
      const program = this.basicInterpreter.getCurrentProgram();
      console.log('[Emulator] Saving program:', program);

      if (program && program.statements.length > 0) {
        // 로컬 스토리지에 저장 (브라우저 환경)
        if (typeof localStorage !== 'undefined') {
          // AST를 BASIC 소스 코드로 변환하여 저장
          const sourceLines: string[] = [];
          for (const stmt of program.statements) {
            if (stmt.lineNumber !== undefined) {
              const formattedLine = `${stmt.lineNumber} ${this.formatStatement(stmt)}`;
              console.log('[Emulator] Formatted line:', formattedLine);
              sourceLines.push(formattedLine);
            }
          }
          const sourceCode = sourceLines.join('\n');
          console.log('[Emulator] Source code to save:', sourceCode);
          localStorage.setItem(`basic_program_${filename}`, sourceCode);
          this.terminal.writeLine(`SAVED "${filename}"`);
        } else {
          this.terminal.writeLine('SAVE NOT SUPPORTED');
        }
      } else {
        console.log('[Emulator] No program to save');
        this.terminal.writeLine('NO PROGRAM TO SAVE');
      }
    } catch (error) {
      console.error('[Emulator] Save error:', error);
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
        const sourceCode = localStorage.getItem(`basic_program_${filename}`);
        console.log('[Emulator] Loading program:', filename, 'Source code:', sourceCode);

        if (sourceCode) {
          // 프로그램 클리어
          this.basicInterpreter.clear();

          // 소스 코드를 라인별로 파싱하여 로드
          const lines = sourceCode.split('\n');
          console.log('[Emulator] Lines to load:', lines);

          for (const line of lines) {
            const trimmed = line.trim();
            // 빈 줄이나 라인 번호만 있는 줄 건너뛰기
            if (trimmed && !/^\d+\s*$/.test(trimmed)) {
              console.log('[Emulator] Parsing line:', line);
              try {
                this.parser = new Parser(line);
                const program = this.parser.parseProgram();
                console.log('[Emulator] Parsed program:', program);
                this.basicInterpreter.addProgram(program);
              } catch (error) {
                console.error('[Emulator] Error parsing line:', line, error);
                // 개별 라인 오류는 무시하고 계속 진행
              }
            }
          }

          const loadedProgram = this.basicInterpreter.getCurrentProgram();
          console.log('[Emulator] Loaded program:', loadedProgram);

          this.terminal.writeLine(`LOADED "${filename}"`);
        } else {
          this.terminal.writeLine(`FILE NOT FOUND: "${filename}"`);
        }
      } else {
        this.terminal.writeLine('LOAD NOT SUPPORTED');
      }
    } catch (error) {
      console.error('[Emulator] Load error:', error);
      this.handleError(`Load Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.terminal.showPrompt();
  }

  /**
   * 문장을 문자열로 포맷
   */
  private formatStatement(stmt: any): string {
    // AST 노드를 BASIC 코드로 변환
    if (stmt.type === 'PrintStatement') {
      if (!stmt.expressions || stmt.expressions.length === 0) {
        return 'PRINT';
      }
      const separator = stmt.separator === 'semicolon' ? '; ' : stmt.separator === 'comma' ? ', ' : ' ';
      const args = stmt.expressions.map((expr: any) => this.formatExpression(expr)).join(separator);
      return `PRINT ${args}`;
    }
    if (stmt.type === 'LetStatement') {
      const varName = typeof stmt.variable === 'string' ? stmt.variable : stmt.variable?.name || 'unknown';
      return `LET ${varName} = ${this.formatExpression(stmt.expression || stmt.value)}`;
    }
    if (stmt.type === 'InputStatement') {
      const vars = stmt.variables?.map((v: any) => typeof v === 'string' ? v : v?.name || 'unknown').join(', ') || '';
      const prompt = stmt.prompt ? `"${stmt.prompt.value || stmt.prompt}"; ` : '';
      return `INPUT ${prompt}${vars}`;
    }
    if (stmt.type === 'GotoStatement') {
      return `GOTO ${stmt.lineNumber}`;
    }
    if (stmt.type === 'IfStatement') {
      return `IF ${this.formatExpression(stmt.condition)} THEN ${stmt.thenLineNumber || ''}`;
    }
    if (stmt.type === 'ForStatement') {
      const varName = typeof stmt.variable === 'string' ? stmt.variable : stmt.variable?.name || 'unknown';
      return `FOR ${varName} = ${this.formatExpression(stmt.start)} TO ${this.formatExpression(stmt.end)}${stmt.step ? ` STEP ${this.formatExpression(stmt.step)}` : ''}`;
    }
    if (stmt.type === 'NextStatement') {
      const varName = stmt.variable ? (typeof stmt.variable === 'string' ? stmt.variable : stmt.variable?.name || '') : '';
      return `NEXT ${varName}`;
    }
    if (stmt.type === 'EndStatement') {
      return 'END';
    }
    if (stmt.type === 'RemStatement') {
      return `REM ${stmt.comment}`;
    }
    return JSON.stringify(stmt).substring(0, 50);
  }

  /**
   * 표현식을 문자열로 포맷
   */
  private formatExpression(expr: any): string {
    if (!expr) return '';

    if (expr.type === 'NumberLiteral') {
      return String(expr.value);
    }
    if (expr.type === 'StringLiteral') {
      return `"${expr.value}"`;
    }
    if (expr.type === 'Identifier') {
      return expr.name;
    }
    if (expr.type === 'BinaryExpression') {
      return `${this.formatExpression(expr.left)} ${expr.operator} ${this.formatExpression(expr.right)}`;
    }
    if (expr.type === 'UnaryExpression') {
      return `${expr.operator}${this.formatExpression(expr.operand)}`;
    }
    if (expr.type === 'CallExpression' || expr.type === 'FunctionCall') {
      // FunctionCall의 name은 Identifier 객체이므로 .name 속성을 가져옴
      let funcName = '';
      if (expr.callee) {
        funcName = typeof expr.callee === 'string' ? expr.callee : expr.callee.name;
      } else if (expr.name) {
        funcName = typeof expr.name === 'string' ? expr.name : expr.name.name;
      } else if (expr.function) {
        funcName = typeof expr.function === 'string' ? expr.function : expr.function.name;
      }
      const args = expr.arguments?.map((arg: any) => this.formatExpression(arg)).join(', ') || '';
      return `${funcName}(${args})`;
    }
    if (expr.type === 'ArrayAccess') {
      const indices = expr.indices?.map((idx: any) => this.formatExpression(idx)).join(', ') || '';
      return `${expr.name}(${indices})`;
    }
    if (expr.type === 'ParenthesizedExpression') {
      return `(${this.formatExpression(expr.expression)})`;
    }
    return String(expr);
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
   * GraphicsEngine 반환
   */
  getGraphicsEngine(): GraphicsEngine {
    return this.graphicsEngine;
  }

  /**
   * PixelBuffer 반환
   */
  getPixelBuffer(): PixelBuffer {
    return this.pixelBuffer;
  }

  /**
   * ColorManager 반환
   */
  getColorManager(): ColorManager {
    return this.colorManager;
  }

  /**
   * AudioEngine 반환
   */
  getAudioEngine(): AudioEngine {
    return this.audioEngine;
  }

  /**
   * 모바일 최적화 초기화
   */
  initializeMobileOptimization(containerElement?: HTMLElement): void {
    if (typeof window === 'undefined') {
      console.warn('Mobile optimization requires browser environment');
      return;
    }

    // MobileOptimizer 초기화
    this.mobileOptimizer = new MobileOptimizer({
      enableTouchInput: true,
      optimizeForBattery: true,
      reduceAnimations: false,
      compactLayout: false,
      adaptiveFontSize: true,
      enableVibration: false,
      networkOptimization: true
    });

    // 모바일 최적화 적용
    this.mobileOptimizer.optimize();

    // GestureHandler 초기화 (컨테이너 요소가 제공된 경우)
    if (containerElement) {
      this.gestureHandler = new GestureHandler(containerElement);

      // 제스처 이벤트 처리
      this.gestureHandler.on('tap', (event) => {
        this.emit('mobile:tap', event);
      });

      this.gestureHandler.on('swipe', (event) => {
        this.emit('mobile:swipe', event);
      });

      this.gestureHandler.on('longpress', (event) => {
        this.emit('mobile:longpress', event);
      });

      this.gestureHandler.on('pinch', (event) => {
        this.emit('mobile:pinch', event);
      });
    }

    // ResponsiveLayout 초기화
    this.responsiveLayout = new ResponsiveLayout({
      breakpoints: {
        mobile: 480,
        tablet: 768,
        desktop: 1024
      },
      autoAdjust: true,
      preserveAspectRatio: true,
      virtualKeyboardPadding: 20
    });

    // 레이아웃 이벤트 처리
    this.responsiveLayout.on('layoutModeChange', (mode) => {
      this.emit('mobile:layoutChange', mode);
      console.log(`📱 Layout mode changed to: ${mode}`);
    });

    this.responsiveLayout.on('orientationChange', (orientation) => {
      this.emit('mobile:orientationChange', orientation);
      console.log(`📱 Orientation changed to: ${orientation}`);
    });

    // CSS 변수 설정
    this.responsiveLayout.setCSSVariables();

    console.log('📱 Mobile optimization initialized');
  }

  /**
   * 모바일 최적화 해제
   */
  disableMobileOptimization(): void {
    if (this.mobileOptimizer) {
      this.mobileOptimizer.disable();
      this.mobileOptimizer = null;
    }

    if (this.gestureHandler) {
      this.gestureHandler.destroy();
      this.gestureHandler = null;
    }

    if (this.responsiveLayout) {
      this.responsiveLayout.destroy();
      this.responsiveLayout = null;
    }

    console.log('📱 Mobile optimization disabled');
  }

  /**
   * 모바일 최적화 상태 확인
   */
  isMobileOptimized(): boolean {
    return this.mobileOptimizer?.isOptimizationEnabled() ?? false;
  }

  /**
   * MobileOptimizer 반환
   */
  getMobileOptimizer(): MobileOptimizer | null {
    return this.mobileOptimizer;
  }

  /**
   * GestureHandler 반환
   */
  getGestureHandler(): GestureHandler | null {
    return this.gestureHandler;
  }

  /**
   * ResponsiveLayout 반환
   */
  getResponsiveLayout(): ResponsiveLayout | null {
    return this.responsiveLayout;
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
      },
      mobile: this.mobileOptimizer ? {
        optimized: this.mobileOptimizer.isOptimizationEnabled(),
        capabilities: this.mobileOptimizer.getCapabilities(),
        metrics: this.mobileOptimizer.getMetrics(),
        layout: this.responsiveLayout?.getMetrics()
      } : null
    };
  }
}