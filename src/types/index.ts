/**
 * Type Definitions Index
 * 
 * Centralized exports for all type definitions used in the 6502 BASIC emulator.
 */

// CPU types
export * from './cpu.js';

// BASIC interpreter types
export * from './basic.js';

// Memory management types
export * from './memory.js';

// I/O system types
export * from './io.js';

// UI component types
export * from './ui.js';

// Math package types
export * from './math.js';

// Common utility types
export interface EventEmitter {
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  emit(event: string, ...args: any[]): void;
}

export interface Disposable {
  dispose(): void;
}

export interface Serializable<T> {
  serialize(): string;
  deserialize(data: string): T;
}

// System configuration
export interface SystemConfig {
  cpu: {
    clockSpeed: number; // Hz
    enableDebug: boolean;
    breakOnInvalidOpcode: boolean;
  };
  
  memory: {
    size: number; // bytes
    enforceReadOnly: boolean;
    trackAccess: boolean;
  };
  
  basic: {
    maxLineNumber: number;
    maxStringLength: number;
    maxArraySize: number;
    caseSensitive: boolean;
  };
  
  io: {
    enableKeyboard: boolean;
    enableDisplay: boolean;
    enableSerial: boolean;
    enableSound: boolean;
  };
  
  ui: {
    theme: 'light' | 'dark';
    fontSize: number;
    showLineNumbers: boolean;
    enableSyntaxHighlighting: boolean;
  };
}

// System state
export interface SystemState {
  running: boolean;
  paused: boolean;
  debugging: boolean;
  error?: string;
  
  performance: {
    instructionsPerSecond: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

// Error types
export enum ErrorType {
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  IO_ERROR = 'IO_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export interface SystemError {
  type: ErrorType;
  message: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: number;
}