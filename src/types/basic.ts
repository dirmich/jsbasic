/**
 * BASIC Interpreter Type Definitions
 */

// BASIC Variable types
export type BasicValue = number | string | boolean;

export interface BasicVariable {
  name: string;
  type: 'NUMBER' | 'STRING' | 'BOOLEAN';
  value: BasicValue;
}

// BASIC Array
export interface BasicArray {
  name: string;
  dimensions: number[];
  values: BasicValue[];
}

// BASIC Token types
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  
  // Keywords
  LET = 'LET',
  PRINT = 'PRINT',
  INPUT = 'INPUT',
  IF = 'IF',
  THEN = 'THEN',
  ELSE = 'ELSE',
  FOR = 'FOR',
  TO = 'TO',
  STEP = 'STEP',
  NEXT = 'NEXT',
  WHILE = 'WHILE',
  WEND = 'WEND',
  GOSUB = 'GOSUB',
  RETURN = 'RETURN',
  GOTO = 'GOTO',
  REM = 'REM',
  END = 'END',
  STOP = 'STOP',
  DIM = 'DIM',
  DATA = 'DATA',
  READ = 'READ',
  RESTORE = 'RESTORE',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  POWER = 'POWER',
  MOD = 'MOD',
  
  // Comparison
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  
  // Logical
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // Punctuation
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  COLON = 'COLON',
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  
  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  LINE_NUMBER = 'LINE_NUMBER'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// Abstract Syntax Tree nodes
export interface ASTNode {
  type: string;
  line?: number;
}

export interface ProgramNode extends ASTNode {
  type: 'PROGRAM';
  statements: StatementNode[];
}

export interface StatementNode extends ASTNode {
  lineNumber?: number;
}

export interface ExpressionNode extends ASTNode {
  valueType?: 'NUMBER' | 'STRING' | 'BOOLEAN';
}

export interface LetStatement extends StatementNode {
  type: 'LET';
  variable: string;
  value: ExpressionNode;
}

export interface PrintStatement extends StatementNode {
  type: 'PRINT';
  expressions: ExpressionNode[];
  separator?: 'SEMICOLON' | 'COMMA';
}

export interface InputStatement extends StatementNode {
  type: 'INPUT';
  variables: string[];
  prompt?: string;
}

export interface IfStatement extends StatementNode {
  type: 'IF';
  condition: ExpressionNode;
  thenStatement: StatementNode;
  elseStatement?: StatementNode;
}

export interface ForStatement extends StatementNode {
  type: 'FOR';
  variable: string;
  start: ExpressionNode;
  end: ExpressionNode;
  step?: ExpressionNode;
}

export interface NextStatement extends StatementNode {
  type: 'NEXT';
  variable?: string;
}

export interface GotoStatement extends StatementNode {
  type: 'GOTO';
  lineNumber: number;
}

export interface GosubStatement extends StatementNode {
  type: 'GOSUB';
  lineNumber: number;
}

export interface ReturnStatement extends StatementNode {
  type: 'RETURN';
}

// Expression nodes
export interface BinaryExpression extends ExpressionNode {
  type: 'BINARY';
  operator: TokenType;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpression extends ExpressionNode {
  type: 'UNARY';
  operator: TokenType;
  operand: ExpressionNode;
}

export interface LiteralExpression extends ExpressionNode {
  type: 'LITERAL';
  value: BasicValue;
}

export interface VariableExpression extends ExpressionNode {
  type: 'VARIABLE';
  name: string;
}

export interface ArrayExpression extends ExpressionNode {
  type: 'ARRAY';
  name: string;
  indices: ExpressionNode[];
}

// BASIC Interpreter interface
export interface BasicInterpreter {
  variables: Map<string, BasicVariable>;
  arrays: Map<string, BasicArray>;
  program: ProgramNode | null;
  currentLine: number;
  callStack: number[];
  forStack: Array<{ variable: string; end: number; step: number; line: number }>;
  dataPointer: number;
  dataValues: BasicValue[];
  
  // Core operations
  run(program: string): void;
  step(): boolean;
  reset(): void;
  
  // Program management
  loadProgram(source: string): void;
  listProgram(): string;
  
  // Variable operations
  setVariable(name: string, value: BasicValue): void;
  getVariable(name: string): BasicValue;
  
  // Array operations
  setArrayValue(name: string, indices: number[], value: BasicValue): void;
  getArrayValue(name: string, indices: number[]): BasicValue;
  
  // I/O operations
  print(message: string): void;
  input(prompt?: string): Promise<string>;
}