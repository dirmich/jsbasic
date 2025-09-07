/**
 * BASIC 구문 분석기 (Parser)
 * 
 * 토큰 스트림을 AST로 변환하는 재귀 하향 파서입니다.
 */

import type { 
  Token 
} from './tokenizer.js';

import { 
  TokenType, 
  Tokenizer 
} from './tokenizer.js';

import type {
  ASTNode,
  Program,
  Statement,
  Expression,
  LetStatement,
  ArrayAssignmentStatement,
  PrintStatement,
  InputStatement,
  IfStatement,
  ForStatement,
  WhileStatement,
  GotoStatement,
  GosubStatement,
  ReturnStatement,
  DimStatement,
  DataStatement,
  ReadStatement,
  RestoreStatement,
  EndStatement,
  StopStatement,
  DefStatement,
  OnStatement,
  RemStatement,
  BinaryExpression,
  UnaryExpression,
  FunctionCall,
  ArrayAccess,
  Identifier,
  NumberLiteral,
  StringLiteral,
  ParenthesizedExpression,
  BinaryOperator,
  UnaryOperator,
  ArrayDeclaration,
  ASTUtils
} from './ast.js';

import { BasicError, ERROR_CODES } from '../utils/errors.js';

/**
 * BASIC 파서
 */
export class Parser {
  private tokens: Token[];
  private position: number = 0;
  private current: Token;

  constructor(source: string) {
    const tokenizer = new Tokenizer(source);
    this.tokens = tokenizer.tokenize();
    this.current = this.tokens[0];
  }

  /**
   * 프로그램 파싱
   */
  public parseProgram(): Program {
    const statements: Statement[] = [];
    
    while (!this.isAtEnd() && this.current.type !== TokenType.EOF) {
      // 빈 줄 건너뛰기
      if (this.current.type === TokenType.NEWLINE) {
        this.advance();
        continue;
      }
      
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
      
      // 문장 끝에서 개행 또는 EOF 예상
      if (!this.isAtEnd() && this.current.type !== TokenType.NEWLINE && this.current.type !== TokenType.EOF) {
        this.consumeNewlineOrEOF();
      }
    }
    
    return {
      type: 'Program',
      statements: statements,
      line: 1,
      column: 1
    };
  }

  /**
   * 명령문 파싱
   */
  private parseStatement(): Statement | null {
    // 빈 줄 건너뛰기
    if (this.current.type === TokenType.NEWLINE) {
      return null;
    }
    
    // 라인 넘버 처리
    let lineNumber: number | undefined;
    if (this.current.type === TokenType.NUMBER) {
      lineNumber = this.current.value as number;
      this.advance();
    }

    const stmt = this.parseStatementInternal();
    if (stmt && lineNumber !== undefined) {
      stmt.lineNumber = lineNumber;
    }
    
    return stmt;
  }

  private parseStatementInternal(): Statement | null {
    switch (this.current.type) {
      case TokenType.LET:
        return this.parseLetStatement();
      case TokenType.PRINT:
        return this.parsePrintStatement();
      case TokenType.INPUT:
        return this.parseInputStatement();
      case TokenType.IF:
        return this.parseIfStatement();
      case TokenType.FOR:
        return this.parseForStatement();
      case TokenType.WHILE:
        return this.parseWhileStatement();
      case TokenType.GOTO:
        return this.parseGotoStatement();
      case TokenType.GOSUB:
        return this.parseGosubStatement();
      case TokenType.RETURN:
        return this.parseReturnStatement();
      case TokenType.DIM:
        return this.parseDimStatement();
      case TokenType.DATA:
        return this.parseDataStatement();
      case TokenType.READ:
        return this.parseReadStatement();
      case TokenType.RESTORE:
        return this.parseRestoreStatement();
      case TokenType.END:
        return this.parseEndStatement();
      case TokenType.STOP:
        return this.parseStopStatement();
      case TokenType.DEF:
        return this.parseDefStatement();
      case TokenType.ON:
        return this.parseOnStatement();
      case TokenType.IDENTIFIER:
        // 암시적 LET
        return this.parseImplicitLetStatement();
      default:
        if (this.current.type === TokenType.NEWLINE || this.current.type === TokenType.EOF) {
          return null;
        }
        this.error(`Unexpected token: ${this.current.value}`);
        return null;
    }
  }

  // === 개별 명령문 파서들 ===

  private parseLetStatement(): LetStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.LET);
    
    const variable = this.parseIdentifier();
    this.consume(TokenType.EQUALS);
    const expression = this.parseExpression();
    
    return {
      type: 'LetStatement',
      variable: variable,
      expression: expression,
      line: line,
      column: column
    };
  }

  private parseImplicitLetStatement(): LetStatement | ArrayAssignmentStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    const variable = this.parseIdentifier();
    
    // 배열 요소 할당인지 확인
    if (this.current.type === TokenType.LEFT_PAREN) {
      this.advance();
      
      const indices: Expression[] = [];
      indices.push(this.parseExpression());
      while (this.current.type === TokenType.COMMA) {
        this.advance();
        indices.push(this.parseExpression());
      }
      
      this.consume(TokenType.RIGHT_PAREN);
      this.consume(TokenType.EQUALS);
      const expression = this.parseExpression();
      
      return {
        type: 'ArrayAssignmentStatement',
        arrayName: variable,
        indices: indices,
        expression: expression,
        line: line,
        column: column
      };
    } else {
      // 일반 변수 할당
      this.consume(TokenType.EQUALS);
      const expression = this.parseExpression();
      
      return {
        type: 'LetStatement',
        variable: variable,
        expression: expression,
        line: line,
        column: column
      };
    }
  }

  private parsePrintStatement(): PrintStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.PRINT);
    
    const expressions: Expression[] = [];
    let separator: 'comma' | 'semicolon' | undefined;
    let trailingSeparator = false;
    
    if (!this.checkNewlineOrEOF()) {
      expressions.push(this.parseExpression());
      
      while (this.current.type === TokenType.COMMA || this.current.type === TokenType.SEMICOLON) {
        separator = this.current.type === TokenType.COMMA ? 'comma' : 'semicolon';
        this.advance();
        
        if (!this.checkNewlineOrEOF()) {
          expressions.push(this.parseExpression());
          trailingSeparator = false; // 구분자 뒤에 표현식이 있으면 끝나지 않음
        } else {
          trailingSeparator = true; // 구분자로 끝남
          break;
        }
      }
    }
    
    return {
      type: 'PrintStatement',
      expressions: expressions,
      separator: separator,
      trailingSeparator: trailingSeparator,
      line: line,
      column: column
    };
  }

  private parseInputStatement(): InputStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.INPUT);
    
    let prompt: StringLiteral | undefined;
    const variables: Identifier[] = [];
    
    // 프롬프트 문자열 확인
    if (this.current.type === TokenType.STRING) {
      prompt = this.parseStringLiteral();
      if (this.current.type === TokenType.SEMICOLON) {
        this.advance();
      }
    }
    
    // 변수 목록
    variables.push(this.parseIdentifier());
    
    while (this.current.type === TokenType.COMMA) {
      this.advance();
      variables.push(this.parseIdentifier());
    }
    
    return {
      type: 'InputStatement',
      prompt: prompt,
      variables: variables,
      line: line,
      column: column
    };
  }

  private parseIfStatement(): IfStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.IF);
    const condition = this.parseExpression();
    this.consume(TokenType.THEN);
    
    const thenStatement: Statement[] = [];
    let elseStatement: Statement[] | undefined;
    
    // THEN 뒤의 명령문들
    if (!this.checkNewlineOrEOF()) {
      const stmt = this.parseStatementInternal();
      if (stmt) {
        thenStatement.push(stmt);
      }
    } else {
      // 멀티라인 IF
      this.consumeNewlineOrEOF();
      
      while (!this.isAtEnd() && 
             this.current.type !== TokenType.ELSE && 
             this.current.type !== TokenType.ENDIF &&
             this.current.type !== TokenType.EOF) {
        
        if (this.current.type === TokenType.NEWLINE) {
          this.advance();
          continue;
        }
        
        const stmt = this.parseStatement();
        if (stmt) {
          thenStatement.push(stmt);
        }
        
        if (!this.isAtEnd() && this.current.type !== TokenType.NEWLINE) {
          this.consumeNewlineOrEOF();
        }
      }
      
      // ELSE 처리
      if (this.current.type === TokenType.ELSE) {
        this.advance();
        this.consumeNewlineOrEOF();
        
        elseStatement = [];
        while (!this.isAtEnd() && 
               this.current.type !== TokenType.ENDIF &&
               this.current.type !== TokenType.EOF) {
          
          if (this.current.type === TokenType.NEWLINE) {
            this.advance();
            continue;
          }
          
          const stmt = this.parseStatement();
          if (stmt) {
            elseStatement.push(stmt);
          }
          
          if (!this.isAtEnd() && this.current.type !== TokenType.NEWLINE) {
            this.consumeNewlineOrEOF();
          }
        }
      }
      
      // ENDIF 소비
      if (this.current.type === TokenType.ENDIF) {
        this.advance();
      }
    }
    
    return {
      type: 'IfStatement',
      condition: condition,
      thenStatement: thenStatement,
      elseStatement: elseStatement,
      line: line,
      column: column
    };
  }

  private parseForStatement(): ForStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.FOR);
    const variable = this.parseIdentifier();
    this.consume(TokenType.EQUALS);
    const start = this.parseExpression();
    this.consume(TokenType.TO);
    const end = this.parseExpression();
    
    let step: Expression | undefined;
    if (this.current.type === TokenType.STEP) {
      this.advance();
      step = this.parseExpression();
    }
    
    this.consumeNewlineOrEOF();
    
    const body: Statement[] = [];
    while (!this.isAtEnd() && 
           this.current.type !== TokenType.EOF) {
      
      if (this.current.type === TokenType.NEWLINE) {
        this.advance();
        continue;
      }
      
      // NEXT 토큰을 만나거나 라인 넘버 뒤에 NEXT가 오는지 확인
      if (this.current.type === TokenType.NEXT || 
          (this.current.type === TokenType.NUMBER && this.peek()?.type === TokenType.NEXT)) {
        break;
      }
      
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
      
      // 개행 처리
      if (!this.isAtEnd() && 
          this.current.type !== TokenType.NEWLINE && 
          this.current.type !== TokenType.EOF) {
        this.consumeNewlineOrEOF();
      } else if (this.current.type === TokenType.NEWLINE) {
        this.advance();
      }
    }
    
    // NEXT 소비 (라인 넘버가 있을 수 있음)
    if (this.current.type === TokenType.NUMBER) {
      this.advance(); // 라인 넘버 건너뛰기
    }
    
    if (this.current.type === TokenType.NEXT) {
      this.advance();
      // 선택적으로 변수명 확인
      if (this.current.type === TokenType.IDENTIFIER) {
        this.advance();
      }
    }
    
    return {
      type: 'ForStatement',
      variable: variable,
      start: start,
      end: end,
      step: step,
      body: body,
      line: line,
      column: column
    };
  }

  private parseWhileStatement(): WhileStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.WHILE);
    const condition = this.parseExpression();
    this.consumeNewlineOrEOF();
    
    const body: Statement[] = [];
    while (!this.isAtEnd() && 
           this.current.type !== TokenType.WEND &&
           this.current.type !== TokenType.EOF) {
      
      if (this.current.type === TokenType.NEWLINE) {
        this.advance();
        continue;
      }
      
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
      
      if (!this.isAtEnd() && this.current.type !== TokenType.NEWLINE) {
        this.consumeNewlineOrEOF();
      }
    }
    
    // WEND 소비
    if (this.current.type === TokenType.WEND) {
      this.advance();
    }
    
    return {
      type: 'WhileStatement',
      condition: condition,
      body: body,
      line: line,
      column: column
    };
  }

  private parseGotoStatement(): GotoStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.GOTO);
    const lineNumber = this.parseNumberLiteral();
    
    return {
      type: 'GotoStatement',
      lineNumber: lineNumber,
      line: line,
      column: column
    };
  }

  private parseGosubStatement(): GosubStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.GOSUB);
    const lineNumber = this.parseNumberLiteral();
    
    return {
      type: 'GosubStatement',
      lineNumber: lineNumber,
      line: line,
      column: column
    };
  }

  private parseReturnStatement(): ReturnStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.RETURN);
    
    return {
      type: 'ReturnStatement',
      line: line,
      column: column
    };
  }

  private parseDimStatement(): DimStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.DIM);
    
    const declarations: ArrayDeclaration[] = [];
    declarations.push(this.parseArrayDeclaration());
    
    while (this.current.type === TokenType.COMMA) {
      this.advance();
      declarations.push(this.parseArrayDeclaration());
    }
    
    return {
      type: 'DimStatement',
      declarations: declarations,
      line: line,
      column: column
    };
  }

  private parseDataStatement(): DataStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.DATA);
    
    const values: (NumberLiteral | StringLiteral)[] = [];
    
    if (this.current.type === TokenType.NUMBER) {
      values.push(this.parseNumberLiteral());
    } else if (this.current.type === TokenType.STRING) {
      values.push(this.parseStringLiteral());
    } else {
      this.error('Expected number or string in DATA statement');
    }
    
    while (this.current.type === TokenType.COMMA) {
      this.advance();
      if (this.current.type === TokenType.NUMBER) {
        values.push(this.parseNumberLiteral());
      } else if (this.current.type === TokenType.STRING) {
        values.push(this.parseStringLiteral());
      } else {
        this.error('Expected number or string in DATA statement');
      }
    }
    
    return {
      type: 'DataStatement',
      values: values,
      line: line,
      column: column
    };
  }

  private parseReadStatement(): ReadStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.READ);
    
    const variables: Identifier[] = [];
    variables.push(this.parseIdentifier());
    
    while (this.current.type === TokenType.COMMA) {
      this.advance();
      variables.push(this.parseIdentifier());
    }
    
    return {
      type: 'ReadStatement',
      variables: variables,
      line: line,
      column: column
    };
  }

  private parseRestoreStatement(): RestoreStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.RESTORE);
    
    let lineNumber: NumberLiteral | undefined;
    if (this.current.type === TokenType.NUMBER) {
      lineNumber = this.parseNumberLiteral();
    }
    
    return {
      type: 'RestoreStatement',
      lineNumber: lineNumber,
      line: line,
      column: column
    };
  }

  private parseEndStatement(): EndStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.END);
    
    return {
      type: 'EndStatement',
      line: line,
      column: column
    };
  }

  private parseStopStatement(): StopStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.STOP);
    
    return {
      type: 'StopStatement',
      line: line,
      column: column
    };
  }

  private parseDefStatement(): DefStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.DEF);
    
    const functionName = this.parseIdentifier();
    this.consume(TokenType.LEFT_PAREN);
    const parameter = this.parseIdentifier();
    this.consume(TokenType.RIGHT_PAREN);
    this.consume(TokenType.EQUALS);
    const expression = this.parseExpression();
    
    return {
      type: 'DefStatement',
      functionName: functionName,
      parameter: parameter,
      expression: expression,
      line: line,
      column: column
    };
  }

  private parseOnStatement(): OnStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.ON);
    const expression = this.parseExpression();
    
    let command: 'GOTO' | 'GOSUB';
    if (this.current.type === TokenType.GOTO) {
      command = 'GOTO';
      this.advance();
    } else if (this.current.type === TokenType.GOSUB) {
      command = 'GOSUB';
      this.advance();
    } else {
      this.error('Expected GOTO or GOSUB after ON expression');
      command = 'GOTO';
    }
    
    const lineNumbers: NumberLiteral[] = [];
    lineNumbers.push(this.parseNumberLiteral());
    
    while (this.current.type === TokenType.COMMA) {
      this.advance();
      lineNumbers.push(this.parseNumberLiteral());
    }
    
    return {
      type: 'OnStatement',
      expression: expression,
      command: command,
      lineNumbers: lineNumbers,
      line: line,
      column: column
    };
  }

  // === 표현식 파서 ===

  private parseExpression(): Expression {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): Expression {
    let expr = this.parseLogicalAnd();
    
    while (this.current.type === TokenType.OR) {
      const operator = this.current.value as BinaryOperator;
      this.advance();
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator,
        right: right,
        line: this.current.line,
        column: this.current.column
      };
    }
    
    return expr;
  }

  private parseLogicalAnd(): Expression {
    let expr = this.parseEquality();
    
    while (this.current.type === TokenType.AND) {
      const operator = this.current.value as BinaryOperator;
      this.advance();
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator,
        right: right,
        line: this.current.line,
        column: this.current.column
      };
    }
    
    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison();
    
    while (this.current.type === TokenType.EQUALS || this.current.type === TokenType.NOT_EQUALS) {
      const operator = this.current.value as BinaryOperator;
      this.advance();
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator,
        right: right,
        line: this.current.line,
        column: this.current.column
      };
    }
    
    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseAddition();
    
    while (this.current.type === TokenType.LESS_THAN || 
           this.current.type === TokenType.LESS_EQUAL ||
           this.current.type === TokenType.GREATER_THAN || 
           this.current.type === TokenType.GREATER_EQUAL) {
      const operator = this.current.value as BinaryOperator;
      this.advance();
      const right = this.parseAddition();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator,
        right: right,
        line: this.current.line,
        column: this.current.column
      };
    }
    
    return expr;
  }

  private parseAddition(): Expression {
    let expr = this.parseMultiplication();
    
    while (this.current.type === TokenType.PLUS || this.current.type === TokenType.MINUS) {
      const operator = this.current.value as BinaryOperator;
      this.advance();
      const right = this.parseMultiplication();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator,
        right: right,
        line: this.current.line,
        column: this.current.column
      };
    }
    
    return expr;
  }

  private parseMultiplication(): Expression {
    let expr = this.parsePower();
    
    while (this.current.type === TokenType.MULTIPLY || 
           this.current.type === TokenType.DIVIDE || 
           this.current.type === TokenType.MOD) {
      const operator = this.current.value as BinaryOperator;
      this.advance();
      const right = this.parsePower();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator,
        right: right,
        line: this.current.line,
        column: this.current.column
      };
    }
    
    return expr;
  }

  private parsePower(): Expression {
    let expr = this.parseUnary();
    
    if (this.current.type === TokenType.POWER) {
      const operator = this.current.value as BinaryOperator;
      this.advance();
      // 지수는 우결합
      const right = this.parsePower();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator: operator,
        right: right,
        line: this.current.line,
        column: this.current.column
      };
    }
    
    return expr;
  }

  private parseUnary(): Expression {
    if (this.current.type === TokenType.MINUS || 
        this.current.type === TokenType.PLUS || 
        this.current.type === TokenType.NOT) {
      const operator = this.current.value as UnaryOperator;
      const line = this.current.line;
      const column = this.current.column;
      this.advance();
      const operand = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: operator,
        operand: operand,
        line: line,
        column: column
      };
    }
    
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    switch (this.current.type) {
      case TokenType.NUMBER:
        return this.parseNumberLiteral();
      case TokenType.STRING:
        return this.parseStringLiteral();
      case TokenType.IDENTIFIER:
        return this.parseIdentifierOrFunctionCall();
      case TokenType.LEFT_PAREN:
        return this.parseParenthesizedExpression();
      default:
        // 내장 함수들
        if (this.isBuiltinFunction()) {
          return this.parseFunctionCall();
        }
        this.error(`Unexpected token in expression: ${this.current.value}`);
        // 오류 복구를 위해 더미 숫자 반환
        return {
          type: 'NumberLiteral',
          value: 0,
          line: this.current.line,
          column: this.current.column
        };
    }
  }

  private parseNumberLiteral(): NumberLiteral {
    const value = this.current.value as number;
    const line = this.current.line;
    const column = this.current.column;
    this.advance();
    
    return {
      type: 'NumberLiteral',
      value: value,
      line: line,
      column: column
    };
  }

  private parseStringLiteral(): StringLiteral {
    const value = this.current.value as string;
    const line = this.current.line;
    const column = this.current.column;
    this.advance();
    
    return {
      type: 'StringLiteral',
      value: value,
      line: line,
      column: column
    };
  }

  private parseIdentifier(): Identifier {
    if (this.current.type !== TokenType.IDENTIFIER) {
      this.error('Expected identifier');
    }
    
    const name = this.current.value as string;
    const line = this.current.line;
    const column = this.current.column;
    this.advance();
    
    return {
      type: 'Identifier',
      name: name,
      dataType: ASTUtils.inferVariableType(name),
      line: line,
      column: column
    };
  }

  private parseIdentifierOrFunctionCall(): Expression {
    const identifier = this.parseIdentifier();
    
    // 함수 호출 확인
    if (this.current.type === TokenType.LEFT_PAREN) {
      this.advance();
      
      const args: Expression[] = [];
      if (this.current.type !== TokenType.RIGHT_PAREN) {
        args.push(this.parseExpression());
        while (this.current.type === TokenType.COMMA) {
          this.advance();
          args.push(this.parseExpression());
        }
      }
      
      this.consume(TokenType.RIGHT_PAREN);
      
      return {
        type: 'FunctionCall',
        name: identifier,
        arguments: args,
        line: identifier.line,
        column: identifier.column
      };
    }
    
    // 배열 액세스 확인
    if (this.current.type === TokenType.LEFT_PAREN) {
      this.advance();
      
      const indices: Expression[] = [];
      indices.push(this.parseExpression());
      while (this.current.type === TokenType.COMMA) {
        this.advance();
        indices.push(this.parseExpression());
      }
      
      this.consume(TokenType.RIGHT_PAREN);
      
      return {
        type: 'ArrayAccess',
        array: identifier,
        indices: indices,
        line: identifier.line,
        column: identifier.column
      };
    }
    
    return identifier;
  }

  private parseParenthesizedExpression(): ParenthesizedExpression {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.LEFT_PAREN);
    const expression = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN);
    
    return {
      type: 'ParenthesizedExpression',
      expression: expression,
      line: line,
      column: column
    };
  }

  private parseFunctionCall(): FunctionCall {
    const name: Identifier = {
      type: 'Identifier',
      name: this.current.value as string,
      dataType: 'numeric',
      line: this.current.line,
      column: this.current.column
    };
    
    this.advance();
    this.consume(TokenType.LEFT_PAREN);
    
    const args: Expression[] = [];
    if (this.current.type !== TokenType.RIGHT_PAREN) {
      args.push(this.parseExpression());
      while (this.current.type === TokenType.COMMA) {
        this.advance();
        args.push(this.parseExpression());
      }
    }
    
    this.consume(TokenType.RIGHT_PAREN);
    
    return {
      type: 'FunctionCall',
      name: name,
      arguments: args,
      line: name.line,
      column: name.column
    };
  }

  private parseArrayDeclaration(): ArrayDeclaration {
    const name = this.parseIdentifier();
    this.consume(TokenType.LEFT_PAREN);
    
    const dimensions: Expression[] = [];
    dimensions.push(this.parseExpression());
    while (this.current.type === TokenType.COMMA) {
      this.advance();
      dimensions.push(this.parseExpression());
    }
    
    this.consume(TokenType.RIGHT_PAREN);
    
    return {
      name: name,
      dimensions: dimensions
    };
  }

  // === 유틸리티 메서드들 ===

  private advance(): void {
    if (!this.isAtEnd()) {
      this.position++;
      this.current = this.tokens[this.position] || this.tokens[this.tokens.length - 1];
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.tokens.length || this.current.type === TokenType.EOF;
  }

  private peek(): Token | null {
    if (this.position + 1 >= this.tokens.length) {
      return null;
    }
    return this.tokens[this.position + 1];
  }

  private consume(expectedType: TokenType): void {
    if (this.current.type === expectedType) {
      this.advance();
    } else {
      this.error(`Expected ${expectedType}, got ${this.current.type}`);
    }
  }

  private consumeNewlineOrEOF(): void {
    if (this.current.type === TokenType.NEWLINE) {
      this.advance();
    } else if (this.current.type !== TokenType.EOF) {
      this.error('Expected newline or end of file');
    }
  }

  private checkNewlineOrEOF(): boolean {
    return this.current.type === TokenType.NEWLINE || 
           this.current.type === TokenType.EOF ||
           this.isAtEnd();
  }

  private isBuiltinFunction(): boolean {
    const functionTokens = [
      TokenType.ABS, TokenType.INT, TokenType.RND,
      TokenType.SIN, TokenType.COS, TokenType.TAN, TokenType.ATN,
      TokenType.EXP, TokenType.LOG, TokenType.SQR,
      TokenType.LEN, TokenType.VAL, TokenType.STR, 
      TokenType.CHR, TokenType.ASC,
      TokenType.MID, TokenType.LEFT, TokenType.RIGHT
    ];
    
    return functionTokens.includes(this.current.type);
  }

  private error(message: string): never {
    throw new BasicError(
      message,
      ERROR_CODES.SYNTAX_ERROR,
      this.current.line,
      {
        position: this.current.position,
        line: this.current.line,
        column: this.current.column,
        token: this.current
      }
    );
  }
}