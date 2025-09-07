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
  ACCUMULATOR = 'ACCUMULATOR',
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
  INDEXED_INDIRECT = 'INDEXED_INDIRECT',
  INDIRECT_INDEXED = 'INDIRECT_INDEXED',
  RELATIVE = 'RELATIVE'
}

// Addressing mode information
export interface AddressingModeInfo {
  mode: AddressingMode;
  bytes: number;
  cycles: number;
  description: string;
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

// CPU Interface (alias for CPU6502)
export type CPUInterface = CPU6502;

// CPU State enum
export enum CPUState {
  RUNNING = 'RUNNING',
  HALTED = 'HALTED',
  WAITING = 'WAITING',
  RESET = 'RESET'
}

// CPU Flags enum
export enum CPUFlag {
  CARRY = 'carry',
  ZERO = 'zero',
  INTERRUPT = 'interrupt',
  DECIMAL = 'decimal',
  BREAK = 'break',
  UNUSED = 'unused',
  OVERFLOW = 'overflow',
  NEGATIVE = 'negative'
}

// Interrupt types
export enum InterruptType {
  IRQ = 'IRQ',
  NMI = 'NMI',
  RESET = 'RESET'
}

// CPU Options
export interface CPUOptions {
  clockSpeed?: number;
  frequencyMHz?: number;
  enableLogging?: boolean;
  enableDebug?: boolean;
  enableBreakpoints?: boolean;
  cycleAccurate?: boolean;
  strictMode?: boolean;
}

// CPU Events
export interface CPUEvents extends Record<string, (...args: any[]) => void> {
  step: (cycles: number) => void;
  interrupt: (type: InterruptType) => void;
  stateChange: (state: CPUState) => void;
  error: (error: Error) => void;
}

// Instruction information
export interface InstructionInfo {
  opcode: number;
  mnemonic: string;
  addressing: AddressingMode;
  cycles: number;
  bytes: number;
  description: string;
}

// Opcode to instruction mapping
export type OpcodeMap = Map<number, InstructionInfo>;

// Instruction set interface
export interface InstructionSet {
  opcodes: OpcodeMap;
  disassemble(opcode: number, operand1?: number, operand2?: number): string;
  getInstruction(opcode: number): InstructionInfo | undefined;
}