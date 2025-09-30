/**
 * 6502 BASIC JavaScript Emulator
 * Main Entry Point
 */

import type { SystemConfig, SystemState } from './types/index.js'

// Import core modules
import { CPU6502 } from './cpu/index.js';
import { MemoryManager } from './memory/index.js';
import { BasicInterpreter } from './basic/index.js';
import { Parser } from './basic/parser.js';
import { Terminal } from './io/index.js';
import { TerminalComponent } from './ui/index.js';
import { TrigonometricFunctions, MathUtils } from './math/index.js';

/**
 * Main System class that coordinates all components
 */
export class System6502 {
  private config: SystemConfig
  private state: SystemState
  private waitingForInput = false;
  private inputResolver: ((value: string) => void) | null = null;

  // Core components
  private cpu!: CPU6502;
  private memory!: MemoryManager;
  private basic!: BasicInterpreter;
  private terminal!: Terminal;
  private ui!: TerminalComponent;

  constructor(config?: Partial<SystemConfig>) {
    this.config = this.createDefaultConfig(config)
    this.state = {
      running: false,
      paused: false,
      debugging: false,
      performance: {
        instructionsPerSecond: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    }

    console.log('6502 BASIC System initialized')
    console.log('Configuration:', this.config)
  }

  /**
   * Initialize the system and all components
   */
  async initialize(): Promise<void> {
    console.log('Initializing 6502 BASIC System...')

    try {
      // Initialize core components
      this.memory = new MemoryManager();
      this.cpu = new CPU6502(this.memory);
      this.terminal = new Terminal();
      this.basic = new BasicInterpreter();
      this.ui = new TerminalComponent();

      // Connect terminal to UI component
      this.terminal.on('output', (text: string) => {
        this.ui.appendOutput(text, 'output');
      });

      // Terminal command events (for direct terminal usage)
      this.terminal.on('command', (command: string) => {
        console.log('[System6502] Terminal command received:', command);
        this.handleCommand(command);
      });

      this.ui.on('command', (command: string) => {
        this.handleCommand(command);
      });

      // Connect BASIC output to terminal
      this.basic.on('output', (text: string) => {
        console.log('[System6502] BASIC output:', text);
        this.terminal.write(text);
      });

      // Connect BASIC input request to terminal
      this.basic.on('inputRequired', (count: number) => {
        console.log('[System6502] Input required, count:', count);
        this.waitingForInput = true;
        this.terminal.writeLine('? ');
      });

      console.log('System initialization complete')
    } catch (error) {
      console.error('Failed to initialize system:', error)
      throw error
    }
  }

  /**
   * Start the system
   */
  start(): void {
    if (this.state.running) {
      console.warn('System is already running')
      return
    }

    this.state.running = true
    this.startTime = Date.now()
    console.log('System started')

    // Start main execution loop
    this.run()
  }

  /**
   * Stop the system
   */
  stop(): void {
    this.state.running = false
    this.state.paused = false
    console.log('System stopped')
  }

  /**
   * Pause the system
   */
  pause(): void {
    this.state.paused = true
    console.log('System paused')
  }

  /**
   * Resume the system
   */
  resume(): void {
    this.state.paused = false
    console.log('System resumed')
  }

  /**
   * Get current system state
   */
  getState(): SystemState {
    return { ...this.state }
  }

  /**
   * Get system configuration
   */
  getConfig(): SystemConfig {
    return { ...this.config }
  }

  /**
   * Get CPU instance
   */
  getCPU(): CPU6502 {
    return this.cpu
  }

  /**
   * Get Memory Manager instance
   */
  getMemory(): MemoryManager {
    return this.memory
  }

  /**
   * Get Terminal instance
   */
  getTerminal(): Terminal {
    return this.terminal
  }

  /**
   * Get BASIC Interpreter instance
   */
  getBasic(): BasicInterpreter {
    return this.basic
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      uptime: Date.now() - (this.startTime || Date.now()),
      memoryUsed: this.memory ? 16384 : 0, // 16KB used as example
      cpuCycles: this.cpu ? 0 : 0, // Would need cycle counting
      instructionsPerSecond: this.state.performance.instructionsPerSecond,
      cpuUsage: this.state.performance.cpuUsage
    }
  }

  private startTime?: number

  /**
   * Main execution loop
   */
  private run(): void {
    if (!this.state.running) {
      return
    }

    if (!this.state.paused) {
      // Execute one CPU instruction if CPU is active
      if (this.cpu && this.state.running) {
        try {
          // this.cpu.step(); // Would execute one instruction
        } catch (error) {
          console.error('CPU execution error:', error);
          this.stop();
        }
      }

      // Update performance metrics
      this.updatePerformanceMetrics()
    }

    // Schedule next execution
    // Use setTimeout for Node.js environment, requestAnimationFrame would be used in browser
    setTimeout(() => this.run(), 16) // ~60fps
  }

  /**
   * Handle commands from UI
   */
  private async handleCommand(command: string): Promise<void> {
    try {
      console.log('[System6502] handleCommand called:', command);
      console.log('[System6502] waitingForInput:', this.waitingForInput);

      // INPUT 대기 중이면 입력을 BASIC에 전달
      if (this.waitingForInput) {
        console.log('[System6502] Providing input to BASIC:', command);
        this.waitingForInput = false;
        this.basic.provideInput(command);
        return;
      }

      if (!this.basic) {
        console.error('[System6502] BASIC interpreter not initialized');
        this.terminal.writeLine('ERROR: BASIC interpreter not initialized');
        return;
      }

      const upperCommand = command.trim().toUpperCase();

      // Handle system commands that don't need parsing
      if (upperCommand === 'RUN') {
        console.log('[System6502] RUN command detected');
        const program = this.basic.getCurrentProgram();
        console.log('[System6502] Current program:', program);
        console.log('[System6502] Statement count:', program?.statements?.length || 0);

        if (!program || program.statements.length === 0) {
          console.log('[System6502] No program to run');
          this.terminal.writeLine('NO PROGRAM');
          return;
        }

        console.log('[System6502] Running program with', program.statements.length, 'statements');
        await this.basic.run(program);
        console.log('[System6502] Program execution finished');
        return;
      }

      if (upperCommand === 'NEW') {
        console.log('[System6502] NEW command detected');
        this.basic.clearProgram();
        this.terminal.writeLine('NEW PROGRAM');
        return;
      }

      if (upperCommand === 'LIST') {
        console.log('[System6502] LIST command detected');
        const program = this.basic.getCurrentProgram();
        if (!program || program.statements.length === 0) {
          this.terminal.writeLine('NO PROGRAM');
          return;
        }
        // 프로그램 리스트 출력
        for (const stmt of program.statements) {
          if (stmt.lineNumber !== undefined) {
            const line = `${stmt.lineNumber} ${this.formatStatement(stmt)}`;
            this.terminal.writeLine(line);
          }
        }
        return;
      }

      // Parse the command
      console.log('[System6502] Creating parser...');
      const parser = new Parser(command);
      console.log('[System6502] Parsing program...');
      const program = parser.parseProgram();

      console.log('[System6502] Parsed program:', program);

      // Connect BASIC output to terminal
      if (!this.basic.listenerCount('output')) {
        this.basic.on('output', (text: string) => {
          console.log('[System6502] BASIC output:', text);
          this.terminal.write(text);
        });
      }

      // Check if this is a program line (has line number) or immediate execution
      if (program.statements.length > 0 && program.statements[0]?.lineNumber !== undefined) {
        // Add to program
        console.log('[System6502] Adding program line:', program.statements[0].lineNumber);
        this.basic.addProgram(program);
      } else {
        // Run the program immediately
        console.log('[System6502] Running program...');
        await this.basic.run(program);
        console.log('[System6502] Program execution complete');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[System6502] Command error:', errorMessage);
      this.terminal.writeLine(`ERROR: ${errorMessage}`);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    // Calculate basic performance metrics
    this.state.performance = {
      instructionsPerSecond: this.cpu?.getCycleCount() || 0,
      memoryUsage: this.memory?.getUsage() || 0,
      cpuUsage: 0, // Would calculate based on actual CPU usage
    }
  }

  /**
   * Format statement to BASIC source code
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
   * Format expression to BASIC code
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
   * Create default configuration
   */
  private createDefaultConfig(
    userConfig?: Partial<SystemConfig>
  ): SystemConfig {
    const defaultConfig: SystemConfig = {
      cpu: {
        clockSpeed: 1000000, // 1 MHz
        enableDebug: false,
        breakOnInvalidOpcode: true,
      },
      memory: {
        size: 65536, // 64KB
        enforceReadOnly: true,
        trackAccess: false,
      },
      basic: {
        maxLineNumber: 65535,
        maxStringLength: 255,
        maxArraySize: 32767,
        caseSensitive: false,
      },
      io: {
        enableKeyboard: true,
        enableDisplay: true,
        enableSerial: false,
        enableSound: false,
      },
      ui: {
        theme: 'dark',
        fontSize: 14,
        showLineNumbers: true,
        enableSyntaxHighlighting: true,
      },
    }

    // Merge user configuration
    return {
      ...defaultConfig,
      ...userConfig,
      cpu: { ...defaultConfig.cpu, ...userConfig?.cpu },
      memory: { ...defaultConfig.memory, ...userConfig?.memory },
      basic: { ...defaultConfig.basic, ...userConfig?.basic },
      io: { ...defaultConfig.io, ...userConfig?.io },
      ui: { ...defaultConfig.ui, ...userConfig?.ui },
    }
  }
}

/**
 * Create and initialize the system
 */
async function main(): Promise<void> {
  console.log('Starting 6502 BASIC JavaScript Emulator...')

  try {
    const system = new System6502()
    await system.initialize()
    system.start()

    // Make system available globally for debugging
    ;(globalThis as any).__system6502 = system

    console.log(
      'Emulator is ready! Access the system via __system6502 global variable.'
    )
  } catch (error) {
    console.error('Failed to start emulator:', error)
    process.exit(1)
  }
}

// Start the application
if (import.meta.main) {
  main().catch(console.error)
}

// Export main classes for use as a library
export * from './types/index.js'
export { System6502 as default }
