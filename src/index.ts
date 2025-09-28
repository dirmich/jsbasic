/**
 * 6502 BASIC JavaScript Emulator
 * Main Entry Point
 */

import type { SystemConfig, SystemState } from './types/index.js'

// Import core modules
import { CPU6502 } from './cpu/index.js';
import { MemoryManager } from './memory/index.js';
import { BasicInterpreter } from './basic/index.js';
import { Terminal } from './io/index.js';
import { TerminalComponent } from './ui/index.js';
import { TrigonometricFunctions, MathUtils } from './math/index.js';

/**
 * Main System class that coordinates all components
 */
export class System6502 {
  private config: SystemConfig
  private state: SystemState

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

      this.ui.on('command', (command: string) => {
        this.handleCommand(command);
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
  private handleCommand(command: string): void {
    try {
      if (this.basic) {
        // Parse and run the command (placeholder implementation)
        console.log('Command received:', command);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.ui.appendOutput(`ERROR: ${errorMessage}`, 'error');
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
