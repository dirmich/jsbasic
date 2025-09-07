/**
 * Memory Management Type Definitions
 */

// Memory bank configuration
export interface MemoryBank {
  start: number;
  end: number;
  size: number;
  readonly: boolean;
  data: Uint8Array;
}

// Memory map regions for 6502 system
export interface MemoryMap {
  zeroPage: MemoryBank;      // $0000-$00FF (256 bytes)
  stack: MemoryBank;         // $0100-$01FF (256 bytes)
  ram: MemoryBank;           // $0200-$7FFF (31.5KB)
  io: MemoryBank;            // $8000-$BFFF (16KB) - I/O and peripherals
  rom: MemoryBank;           // $C000-$FFFF (16KB) - ROM/BASIC/OS
}

// Memory interface
export interface Memory {
  banks: MemoryMap;
  totalSize: number;
  
  // Core operations
  read(address: number): number;
  write(address: number, value: number): void;
  readWord(address: number): number;
  writeWord(address: number, value: number): void;
  
  // Bulk operations
  readBlock(start: number, length: number): Uint8Array;
  writeBlock(start: number, data: Uint8Array): void;
  fill(start: number, length: number, value: number): void;
  copy(src: number, dest: number, length: number): void;
  
  // Memory management
  reset(): void;
  clear(): void;
  loadROM(data: Uint8Array, offset?: number): void;
  
  // Debugging and inspection
  dump(start: number, length: number): string;
  isValidAddress(address: number): boolean;
  getMemoryInfo(): MemoryInfo;
}

// Memory information for debugging
export interface MemoryInfo {
  totalSize: number;
  usedBytes: number;
  freeBytes: number;
  banks: Array<{
    name: string;
    start: number;
    end: number;
    size: number;
    readonly: boolean;
    usage: number; // percentage used
  }>;
}

// Memory access violation
export interface MemoryViolation {
  address: number;
  operation: 'READ' | 'WRITE';
  reason: 'OUT_OF_BOUNDS' | 'READ_ONLY' | 'INVALID_BANK';
  timestamp: number;
}

// Memory configuration options
export interface MemoryConfig {
  totalSize?: number;
  zeroPageSize?: number;
  stackSize?: number;
  ramSize?: number;
  ioSize?: number;
  romSize?: number;
  
  // Options
  enforceReadOnly?: boolean;
  trackViolations?: boolean;
  enableLogging?: boolean;
  
  // Custom memory layout
  customBanks?: Array<{
    name: string;
    start: number;
    size: number;
    readonly?: boolean;
    data?: Uint8Array;
  }>;
}

// Memory interface for CPU
export interface MemoryInterface {
  read(address: number): number;
  write(address: number, value: number): void;
  readWord(address: number): number;
  writeWord(address: number, value: number): void;
  reset(): void;
}

// Memory bank information
export interface MemoryBankInfo {
  name: string;
  start: number;
  end: number;
  size: number;
  readonly: boolean;
  usage: number;
}

// Memory access log entry
export interface MemoryAccessLog {
  address: number;
  value: number;
  operation: 'READ' | 'WRITE';
  timestamp: number;
  context?: string;
}

// Memory map entry
export interface MemoryMapEntry {
  name: string;
  start: number;
  end: number;
  type: 'RAM' | 'ROM' | 'IO' | 'STACK' | 'ZERO_PAGE';
  description?: string;
}