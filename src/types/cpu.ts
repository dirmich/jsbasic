/**
 * 6502 CPU Type Definitions
 */

// CPU Status flags
export interface StatusFlags {
  carry: boolean;        // C - Carry flag
  zero: boolean;         // Z - Zero flag
  interrupt: boolean;    // I - Interrupt disable flag
  decimal: boolean;      // D - Decimal mode flag
  break: boolean;        // B - Break command flag
  unused: boolean;       // - Unused flag (always 1)
  overflow: boolean;     // V - Overflow flag
  negative: boolean;     // N - Negative flag
}

// CPU Registers
export interface CPURegisters {
  A: number;    // Accumulator (8-bit)
  X: number;    // X index register (8-bit)
  Y: number;    // Y index register (8-bit)
  PC: number;   // Program counter (16-bit)
  SP: number;   // Stack pointer (8-bit)
  P: StatusFlags; // Processor status flags
}

// Addressing modes for 6502 instructions
export enum AddressingMode {
  IMPLIED = 'IMPLIED',
  IMMEDIATE = 'IMMEDIATE',
  ZERO_PAGE = 'ZERO_PAGE',
  ZERO_PAGE_X = 'ZERO_PAGE_X',
  ZERO_PAGE_Y = 'ZERO_PAGE_Y',
  ABSOLUTE = 'ABSOLUTE',
  ABSOLUTE_X = 'ABSOLUTE_X',
  ABSOLUTE_Y = 'ABSOLUTE_Y',
  INDIRECT = 'INDIRECT',
  INDIRECT_X = 'INDIRECT_X',
  INDIRECT_Y = 'INDIRECT_Y',
  RELATIVE = 'RELATIVE'
}

// Instruction definition
export interface Instruction {
  opcode: number;
  mnemonic: string;
  addressingMode: AddressingMode;
  cycles: number;
  execute: (cpu: CPU6502, operand?: number) => void;
}

// CPU Interface
export interface CPU6502 {
  registers: CPURegisters;
  memory: MemoryInterface;
  cycles: number;
  
  // Core operations
  reset(): void;
  step(): number;
  execute(instruction: Instruction, operand?: number): void;
  
  // Memory operations
  read(address: number): number;
  write(address: number, value: number): void;
  
  // Stack operations
  pushByte(value: number): void;
  pullByte(): number;
  pushWord(value: number): void;
  pullWord(): number;
  
  // Flag operations
  setFlag(flag: keyof StatusFlags, value: boolean): void;
  getFlag(flag: keyof StatusFlags): boolean;
  
  // Interrupt handling
  irq(): void;
  nmi(): void;
}

// Memory interface that CPU will use
export interface MemoryInterface {
  read(address: number): number;
  write(address: number, value: number): void;
  reset(): void;
}