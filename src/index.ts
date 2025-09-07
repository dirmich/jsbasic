/**
 * 6502 BASIC JavaScript Emulator
 * Main Entry Point
 */

import type { SystemConfig, SystemState } from './types/index.js'

// Import core modules (will be implemented)
// import { CPU6502 } from './cpu/index.js';
// import { Memory } from './memory/index.js';
// import { BasicInterpreter } from './basic/index.js';
// import { IOSystem } from './io/index.js';
// import { UIManager } from './ui/index.js';
// import { MathPackage } from './math/index.js';

/**
 * Main System class that coordinates all components
 */
export class System6502 {
  private config: SystemConfig
  private state: SystemState

  // Core components (will be initialized when modules are implemented)
  // private cpu: CPU6502;
  // private memory: Memory;
  // private basic: BasicInterpreter;
  // private io: IOSystem;
  // private ui: UIManager;
  // private math: MathPackage;

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
      // TODO: Initialize components when implemented
      // this.memory = new Memory(this.config.memory);
      // this.cpu = new CPU6502(this.memory, this.config.cpu);
      // this.io = new IOSystem(this.config.io);
      // this.math = new MathPackage();
      // this.basic = new BasicInterpreter(this.math, this.io, this.config.basic);
      // this.ui = new UIManager(this.config.ui);

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
    console.log('System started')

    // TODO: Start main execution loop
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
   * Main execution loop
   */
  private run(): void {
    if (!this.state.running) {
      return
    }

    if (!this.state.paused) {
      // TODO: Execute CPU instructions, update components
      // this.cpu.step();
      // this.io.update();
      // this.ui.update();

      // Update performance metrics
      this.updatePerformanceMetrics()
    }

    // Schedule next execution
    // Use setTimeout for Node.js environment, requestAnimationFrame would be used in browser
    setTimeout(() => this.run(), 16) // ~60fps
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    // TODO: Calculate actual performance metrics
    this.state.performance = {
      instructionsPerSecond: 0,
      memoryUsage: 0,
      cpuUsage: 0,
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
