/**
 * BASIC 토큰화 시스템
 * 
 * BASIC 소스 코드를 토큰으로 분해하여 파서가 처리할 수 있도록 변환합니다.
 */

import { BasicError, ERROR_CODES } from '../utils/errors.js';

/**
 * 토큰 타입 정의
 */
export enum TokenType {
  // 기본 타입
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  
  // 연산자
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  POWER = 'POWER',
  MOD = 'MOD',
  
  // 비교 연산자
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  LESS_THAN = 'LESS_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  
  // 논리 연산자
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // 구분자
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',
  COLON = 'COLON',
  
  // BASIC 키워드
  // 제어 구조
  IF = 'IF',
  THEN = 'THEN',
  ELSE = 'ELSE',
  ENDIF = 'ENDIF',
  FOR = 'FOR',
  TO = 'TO',
  STEP = 'STEP',
  NEXT = 'NEXT',
  WHILE = 'WHILE',
  WEND = 'WEND',
  DO = 'DO',
  LOOP = 'LOOP',
  UNTIL = 'UNTIL',
  GOTO = 'GOTO',
  GOSUB = 'GOSUB',
  RETURN = 'RETURN',
  ON = 'ON',
  
  // 선언 및 할당
  LET = 'LET',
  DIM = 'DIM',
  
  // I/O 명령
  PRINT = 'PRINT',
  INPUT = 'INPUT',
  READ = 'READ',
  DATA = 'DATA',
  RESTORE = 'RESTORE',
  
  // 파일 I/O
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
  
  // 함수
  DEF = 'DEF',
  FN = 'FN',
  
  // 배열 및 문자열
  MID = 'MID',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  LEN = 'LEN',
  VAL = 'VAL',
  STR = 'STR',
  CHR = 'CHR',
  ASC = 'ASC',
  
  // 수학 함수
  ABS = 'ABS',
  INT = 'INT',
  RND = 'RND',
  SIN = 'SIN',
  COS = 'COS',
  TAN = 'TAN',
  ATN = 'ATN',
  EXP = 'EXP',
  LOG = 'LOG',
  SQR = 'SQR',
  
  // 시스템 명령
  RUN = 'RUN',
  STOP = 'STOP',
  END = 'END',
  CLEAR = 'CLEAR',
  NEW = 'NEW',
  LIST = 'LIST',
  SAVE = 'SAVE',
  LOAD = 'LOAD',
  REM = 'REM',
  
  // 특수 토큰
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 토큰 인터페이스
 */
export interface Token {
  type: TokenType;
  value: string | number;
  line: number;
  column: number;
  position: number;
}

/**
 * BASIC 키워드 맵
 */
export const KEYWORDS: Record<string, TokenType> = {
  // 제어 구조
  'IF': TokenType.IF,
  'THEN': TokenType.THEN,
  'ELSE': TokenType.ELSE,
  'ENDIF': TokenType.ENDIF,
  'FOR': TokenType.FOR,
  'TO': TokenType.TO,
  'STEP': TokenType.STEP,
  'NEXT': TokenType.NEXT,
  'WHILE': TokenType.WHILE,
  'WEND': TokenType.WEND,
  'DO': TokenType.DO,
  'LOOP': TokenType.LOOP,
  'UNTIL': TokenType.UNTIL,
  'GOTO': TokenType.GOTO,
  'GOSUB': TokenType.GOSUB,
  'RETURN': TokenType.RETURN,
  'ON': TokenType.ON,
  
  // 선언 및 할당
  'LET': TokenType.LET,
  'DIM': TokenType.DIM,
  
  // I/O 명령
  'PRINT': TokenType.PRINT,
  'INPUT': TokenType.INPUT,
  'READ': TokenType.READ,
  'DATA': TokenType.DATA,
  'RESTORE': TokenType.RESTORE,
  
  // 파일 I/O
  'OPEN': TokenType.OPEN,
  'CLOSE': TokenType.CLOSE,
  
  // 함수
  'DEF': TokenType.DEF,
  'FN': TokenType.FN,
  
  // 논리 연산자
  'AND': TokenType.AND,
  'OR': TokenType.OR,
  'NOT': TokenType.NOT,
  'MOD': TokenType.MOD,
  
  // 배열 및 문자열 함수
  'MID$': TokenType.MID,
  'LEFT$': TokenType.LEFT,
  'RIGHT$': TokenType.RIGHT,
  'LEN': TokenType.LEN,
  'VAL': TokenType.VAL,
  'STR$': TokenType.STR,
  'CHR$': TokenType.CHR,
  'ASC': TokenType.ASC,
  
  // 수학 함수
  'ABS': TokenType.ABS,
  'INT': TokenType.INT,
  'RND': TokenType.RND,
  'SIN': TokenType.SIN,
  'COS': TokenType.COS,
  'TAN': TokenType.TAN,
  'ATN': TokenType.ATN,
  'EXP': TokenType.EXP,
  'LOG': TokenType.LOG,
  'SQR': TokenType.SQR,
  
  // 시스템 명령
  'RUN': TokenType.RUN,
  'STOP': TokenType.STOP,
  'END': TokenType.END,
  'CLEAR': TokenType.CLEAR,
  'NEW': TokenType.NEW,
  'LIST': TokenType.LIST,
  'SAVE': TokenType.SAVE,
  'LOAD': TokenType.LOAD,
  'REM': TokenType.REM
};

/**
 * BASIC 토큰화기
 */
export class Tokenizer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private current: string = '';

  constructor(source: string) {
    this.source = source;
    this.current = this.source[0] || '';
  }

  /**
   * 전체 소스를 토큰화
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];
    
    while (this.position < this.source.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
        if (token.type === TokenType.EOF) {
          break;
        }
      }
    }
    
    return tokens;
  }

  /**
   * 다음 토큰 반환
   */
  public nextToken(): Token | null {
    this.skipWhitespace();
    
    if (this.position >= this.source.length) {
      return this.createToken(TokenType.EOF, '');
    }
    
    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    // 줄바꿈
    if (this.current === '\n' || this.current === '\r') {
      return this.readNewline();
    }
    
    // 주석
    if (this.current === "'" || (this.current === 'R' && this.peek() === 'E' && this.peek(2) === 'M')) {
      this.skipComment();
      return this.nextToken();
    }
    
    // 문자열
    if (this.current === '"') {
      return this.readString();
    }
    
    // 숫자
    if (this.isDigit(this.current) || (this.current === '.' && this.isDigit(this.peek()))) {
      return this.readNumber();
    }
    
    // 식별자 및 키워드
    if (this.isAlpha(this.current)) {
      return this.readIdentifier();
    }
    
    // 연산자 및 구분자
    return this.readOperator();
  }

  private advance(): void {
    if (this.current === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    
    this.position++;
    this.current = this.source[this.position] || '';
  }

  private peek(offset: number = 1): string {
    return this.source[this.position + offset] || '';
  }

  private skipWhitespace(): void {
    while (this.position < this.source.length && 
           this.current !== '\n' && this.current !== '\r' &&
           /\s/.test(this.current)) {
      this.advance();
    }
  }

  private skipComment(): void {
    const startChar = this.current;
    
    if (startChar === "'") {
      // ' 주석 - 다음 줄까지 건너뛰기
      this.advance(); // ' 문자 건너뛰기
      while (this.position < this.source.length &&
             this.current !== '\n' && this.current !== '\r') {
        this.advance();
      }
    }
    // REM은 더 이상 여기서 건너뛰지 않고 키워드로 처리됨
  }

  private readNewline(): Token {
    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    if (this.current === '\r' && this.peek() === '\n') {
      this.advance();
      this.advance();
    } else {
      this.advance();
    }
    
    return {
      type: TokenType.NEWLINE,
      value: '\n',
      line: startLine,
      column: startColumn,
      position: startPosition
    };
  }

  private readString(): Token {
    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    this.advance(); // 시작 따옴표 건너뛰기
    
    let value = '';
    while (this.position < this.source.length && 
           this.current !== '"' && 
           this.current !== '\n' && this.current !== '\r') {
      value += this.current;
      this.advance();
    }
    
    if (this.current !== '"') {
      throw new BasicError(
        'Unterminated string literal',
        ERROR_CODES.SYNTAX_ERROR,
        startLine,
        { position: startPosition, line: startLine, column: startColumn }
      );
    }
    
    this.advance(); // 끝 따옴표 건너뛰기
    
    return {
      type: TokenType.STRING,
      value: value,
      line: startLine,
      column: startColumn,
      position: startPosition
    };
  }

  private readNumber(): Token {
    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    let value = '';
    let hasDecimalPoint = false;
    
    while (this.position < this.source.length &&
           (this.isDigit(this.current) || 
            (this.current === '.' && !hasDecimalPoint))) {
      if (this.current === '.') {
        hasDecimalPoint = true;
      }
      value += this.current;
      this.advance();
    }
    
    // 지수 표기법 지원 (E 또는 e)
    if (this.current.toLowerCase() === 'e') {
      value += this.current;
      this.advance();
      
      if (this.current === '+' || this.current === '-') {
        value += this.current;
        this.advance();
      }
      
      while (this.position < this.source.length && this.isDigit(this.current)) {
        value += this.current;
        this.advance();
      }
    }
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      throw new BasicError(
        `Invalid number format: ${value}`,
        ERROR_CODES.SYNTAX_ERROR,
        startLine,
        { position: startPosition, line: startLine, column: startColumn }
      );
    }
    
    return {
      type: TokenType.NUMBER,
      value: numericValue,
      line: startLine,
      column: startColumn,
      position: startPosition
    };
  }

  private readIdentifier(): Token {
    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    let value = '';
    while (this.position < this.source.length &&
           (this.isAlphaNumeric(this.current) || this.current === '$' || this.current === '%')) {
      value += this.current;
      this.advance();
    }
    
    // 키워드 확인
    const upperValue = value.toUpperCase();
    const tokenType = KEYWORDS[upperValue] || TokenType.IDENTIFIER;
    
    return {
      type: tokenType,
      value: value,
      line: startLine,
      column: startColumn,
      position: startPosition
    };
  }

  private readOperator(): Token {
    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    let tokenType: TokenType;
    let value = this.current;
    
    switch (this.current) {
      case '+':
        tokenType = TokenType.PLUS;
        break;
      case '-':
        tokenType = TokenType.MINUS;
        break;
      case '*':
        tokenType = TokenType.MULTIPLY;
        break;
      case '/':
        tokenType = TokenType.DIVIDE;
        break;
      case '^':
        tokenType = TokenType.POWER;
        break;
      case '(':
        tokenType = TokenType.LEFT_PAREN;
        break;
      case ')':
        tokenType = TokenType.RIGHT_PAREN;
        break;
      case ',':
        tokenType = TokenType.COMMA;
        break;
      case ';':
        tokenType = TokenType.SEMICOLON;
        break;
      case ':':
        tokenType = TokenType.COLON;
        break;
      case '=':
        tokenType = TokenType.EQUALS;
        break;
      case '<':
        if (this.peek() === '=') {
          this.advance();
          value = '<=';
          tokenType = TokenType.LESS_EQUAL;
        } else if (this.peek() === '>') {
          this.advance();
          value = '<>';
          tokenType = TokenType.NOT_EQUALS;
        } else {
          tokenType = TokenType.LESS_THAN;
        }
        break;
      case '>':
        if (this.peek() === '=') {
          this.advance();
          value = '>=';
          tokenType = TokenType.GREATER_EQUAL;
        } else {
          tokenType = TokenType.GREATER_THAN;
        }
        break;
      default:
        tokenType = TokenType.UNKNOWN;
        break;
    }
    
    this.advance();
    
    return {
      type: tokenType,
      value: value,
      line: startLine,
      column: startColumn,
      position: startPosition
    };
  }

  private createToken(type: TokenType, value: string | number): Token {
    return {
      type: type,
      value: value,
      line: this.line,
      column: this.column,
      position: this.position
    };
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}