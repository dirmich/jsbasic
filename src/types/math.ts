/**
 * Math Package Type Definitions
 */

// Math operation types
export enum MathOperation {
  // Basic arithmetic
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  POWER = 'POWER',
  
  // Trigonometric functions
  SIN = 'SIN',
  COS = 'COS',
  TAN = 'TAN',
  ASIN = 'ASIN',
  ACOS = 'ACOS',
  ATAN = 'ATAN',
  ATAN2 = 'ATAN2',
  
  // Logarithmic functions
  LOG = 'LOG',
  LOG10 = 'LOG10',
  EXP = 'EXP',
  
  // Other functions
  SQRT = 'SQRT',
  ABS = 'ABS',
  INT = 'INT',
  FIX = 'FIX',
  FRAC = 'FRAC',
  ROUND = 'ROUND',
  SIGN = 'SIGN',
  
  // Random functions
  RND = 'RND',
  RANDOMIZE = 'RANDOMIZE'
}

// Math function definition
export interface MathFunction {
  name: string;
  operation: MathOperation;
  arity: number; // number of arguments
  description: string;
  execute: (...args: number[]) => number;
  validate?: (...args: number[]) => boolean;
}

// Math constants
export interface MathConstants {
  PI: number;
  E: number;
  LN2: number;
  LN10: number;
  LOG2E: number;
  LOG10E: number;
  SQRT1_2: number;
  SQRT2: number;
}

// Math error types
export enum MathErrorType {
  DIVISION_BY_ZERO = 'DIVISION_BY_ZERO',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  DOMAIN_ERROR = 'DOMAIN_ERROR',
  OVERFLOW = 'OVERFLOW',
  UNDERFLOW = 'UNDERFLOW',
  NOT_A_NUMBER = 'NOT_A_NUMBER'
}

// Math error
export interface MathError {
  type: MathErrorType;
  message: string;
  operation: MathOperation;
  arguments: number[];
}

// Number format options
export interface NumberFormat {
  precision: number;
  scientific: boolean;
  decimalPlaces?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

// Math package interface
export interface MathPackage {
  constants: MathConstants;
  functions: Map<string, MathFunction>;
  
  // Function registration
  registerFunction(func: MathFunction): void;
  unregisterFunction(name: string): void;
  
  // Function execution
  callFunction(name: string, ...args: number[]): number;
  hasFunction(name: string): boolean;
  getFunctionInfo(name: string): MathFunction | undefined;
  
  // Utility functions
  isNumber(value: any): boolean;
  isInteger(value: number): boolean;
  isFinite(value: number): boolean;
  isNaN(value: number): boolean;
  
  // Number conversion
  toNumber(value: string | number): number;
  toString(value: number, format?: NumberFormat): string;
  
  // Random number generation
  random(): number;
  randomInt(min: number, max: number): number;
  seed(value: number): void;
  
  // Error handling
  getLastError(): MathError | null;
  clearError(): void;
  onError(callback: (error: MathError) => void): void;
  
  // Range and validation
  clamp(value: number, min: number, max: number): number;
  inRange(value: number, min: number, max: number): boolean;
  
  // Degree/Radian conversion
  toRadians(degrees: number): number;
  toDegrees(radians: number): number;
}

// Statistical functions
export interface StatisticalFunctions {
  mean(values: number[]): number;
  median(values: number[]): number;
  mode(values: number[]): number;
  min(values: number[]): number;
  max(values: number[]): number;
  sum(values: number[]): number;
  variance(values: number[]): number;
  standardDeviation(values: number[]): number;
}

// Matrix operations (for advanced math)
export interface Matrix {
  rows: number;
  cols: number;
  data: number[][];
}

export interface MatrixOperations {
  create(rows: number, cols: number, fill?: number): Matrix;
  add(a: Matrix, b: Matrix): Matrix;
  subtract(a: Matrix, b: Matrix): Matrix;
  multiply(a: Matrix, b: Matrix): Matrix;
  transpose(matrix: Matrix): Matrix;
  determinant(matrix: Matrix): number;
  inverse(matrix: Matrix): Matrix;
}