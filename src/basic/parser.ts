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
  NextStatement,
  WhileStatement,
  DoLoopStatement,
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
  RunStatement,
  ListStatement,
  NewStatement,
  ClearStatement,
  SaveStatement,
  LoadStatement,
  GetStatement,
  PutStatement,
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
  ArrayDeclaration
} from './ast.js';

import { ASTUtils } from './ast.js';

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
    const firstToken = this.tokens[0];
    if (!firstToken && source.trim() !== '') {
      throw new Error('No tokens found in source');
    }
    this.current = firstToken ?? { type: TokenType.EOF, value: '', line: 1, column: 1, position: 0 };
  }

  /**
   * 프로그램 파싱
   */
  public parseProgram(): Program {
    const statements: Statement[] = [];
    
    while (!this.isAtEnd() && this.current && this.current.type !== TokenType.EOF) {
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
      if (!this.isAtEnd() && !this.currentTokenIs(TokenType.NEWLINE) && !this.currentTokenIs(TokenType.EOF)) {
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
      case TokenType.NEXT:
        return this.parseNextStatement();
      case TokenType.WHILE:
        return this.parseWhileStatement();
      case TokenType.DO:
        return this.parseDoLoopStatement();
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
      case TokenType.REM:
        return this.parseRemStatement();
      case TokenType.RUN:
        return this.parseRunStatement();
      case TokenType.LIST:
        return this.parseListStatement();
      case TokenType.NEW:
        return this.parseNewStatement();
      case TokenType.CLEAR:
        return this.parseClearStatement();
      case TokenType.SAVE:
        return this.parseSaveStatement();
      case TokenType.LOAD:
        return this.parseLoadStatement();
      case TokenType.DEF:
        return this.parseDefStatement();
      case TokenType.ON:
        return this.parseOnStatement();
      case TokenType.SCREEN:
        return this.parseScreenStatement();
      case TokenType.PSET:
        return this.parsePsetStatement();
      case TokenType.PRESET:
        return this.parsePresetStatement();
      case TokenType.LINE:
        return this.parseLineStatement();
      case TokenType.CIRCLE:
        return this.parseCircleStatement();
      case TokenType.PAINT:
        return this.parsePaintStatement();
      case TokenType.COLOR:
        return this.parseColorStatement();
      case TokenType.CLS:
        return this.parseClsStatement();
      case TokenType.GET:
        return this.parseGetStatement();
      case TokenType.PUT:
        return this.parsePutStatement();
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
      while (this.currentTokenIs(TokenType.COMMA)) {
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
    } as PrintStatement;
  }

  private parseInputStatement(): InputStatement {
    const line = this.current.line;
    const column = this.current.column;
    
    this.consume(TokenType.INPUT);
    
    let prompt: StringLiteral | undefined;
    const variables: Identifier[] = [];
    
    // 프롬프트 문자열 확인
    if (this.currentTokenIs(TokenType.STRING)) {
      prompt = this.parseStringLiteral();
      if (this.currentTokenIs(TokenType.SEMICOLON)) {
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
    } as InputStatement;
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
             !this.currentTokenIs(TokenType.ELSE) && 
             !this.currentTokenIs(TokenType.ENDIF) &&
             this.current.type !== TokenType.EOF) {
        
        if (this.currentTokenIs(TokenType.NEWLINE)) {
          this.advance();
          continue;
        }
        
        const stmt = this.parseStatement();
        if (stmt) {
          thenStatement.push(stmt);
        }
        
        if (!this.isAtEnd() && !this.currentTokenIs(TokenType.NEWLINE)) {
          this.consumeNewlineOrEOF();
        }
      }
      
      // ELSE 처리
      if (this.currentTokenIs(TokenType.ELSE)) {
        this.advance();
        this.consumeNewlineOrEOF();
        
        elseStatement = [];
        while (!this.isAtEnd() && 
               !this.currentTokenIs(TokenType.ENDIF) &&
               !this.currentTokenIs(TokenType.EOF)) {
          
          if (this.currentTokenIs(TokenType.NEWLINE)) {
            this.advance();
            continue;
          }
          
          const stmt = this.parseStatement();
          if (stmt) {
            elseStatement.push(stmt);
          }
          
          if (!this.isAtEnd() && !this.currentTokenIs(TokenType.NEWLINE)) {
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
      elseStatement: elseStatement || undefined,
      line: line,
      column: column
    } as IfStatement;
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

    // 라인 단위 파싱: FOR 문은 body 없이 저장
    // 실행 시점에 인터프리터가 NEXT를 찾아서 루프를 실행
    const body: Statement[] = [];

    // 한 줄에 여러 명령이 있는 경우만 처리 (콜론 구분)
    if (this.current.type === TokenType.COLON) {
      this.advance();

      // while 루프 내에서 this.current가 계속 변경되므로, 매 반복마다 체크
      while (!this.isAtEnd()) {
        // 타입 좁히기를 방지하기 위해 TokenType으로 타입 단언
        const currentType = this.current.type as TokenType;

        if (currentType === TokenType.EOF || currentType === TokenType.NEWLINE) {
          break;
        }

        // NEXT를 만나면 종료
        if (currentType === TokenType.NEXT) {
          break;
        }

        const stmt = this.parseStatementInternal();
        if (stmt) {
          body.push(stmt);
        }

        if (this.current.type === TokenType.COLON) {
          this.advance();
        }
      }

      // NEXT 소비
      if (this.currentTokenIs(TokenType.NEXT)) {
        this.advance();
        if (this.currentTokenIs(TokenType.IDENTIFIER)) {
          this.advance();
        }
      }
    }

    return {
      type: 'ForStatement',
      variable: variable,
      start: start,
      end: end,
      step: step || undefined,
      body: body,
      line: line,
      column: column
    } as ForStatement;
  }

  private parseNextStatement(): Statement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.NEXT);

    // NEXT 뒤에 변수명이 올 수 있음 (선택적)
    let variable: Identifier | undefined;
    if (this.currentTokenIs(TokenType.IDENTIFIER)) {
      variable = this.parseIdentifier();
    }

    return {
      type: 'NextStatement',
      variable: variable,
      line: line,
      column: column
    } as any;
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
      
      if (!this.isAtEnd() && !this.currentTokenIs(TokenType.NEWLINE)) {
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

  private parseDoLoopStatement(): DoLoopStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.DO);

    // DO UNTIL/WHILE condition (전위 조건) 확인
    let condition: Expression | null = null;
    let conditionType: 'UNTIL' | 'WHILE' = 'UNTIL';
    let conditionPosition: 'pre' | 'post' = 'post';

    if (this.currentTokenIs(TokenType.UNTIL)) {
      this.advance();
      condition = this.parseExpression();
      conditionType = 'UNTIL';
      conditionPosition = 'pre';
    } else if (this.currentTokenIs(TokenType.WHILE)) {
      this.advance();
      condition = this.parseExpression();
      conditionType = 'WHILE';
      conditionPosition = 'pre';
    }

    this.consumeNewlineOrEOF();

    // 루프 본문 파싱
    const body: Statement[] = [];
    while (!this.isAtEnd() &&
           this.current.type !== TokenType.LOOP &&
           this.current.type !== TokenType.EOF) {

      if (this.current.type === TokenType.NEWLINE) {
        this.advance();
        continue;
      }

      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }

      if (!this.isAtEnd() && !this.currentTokenIs(TokenType.NEWLINE)) {
        this.consumeNewlineOrEOF();
      }
    }

    // LOOP 소비
    if (this.current.type !== TokenType.LOOP) {
      throw new Error(`Expected LOOP at line ${line}`);
    }
    this.consume(TokenType.LOOP);

    // LOOP UNTIL/WHILE condition (후위 조건) 확인
    if (condition === null) {
      if (this.currentTokenIs(TokenType.UNTIL)) {
        this.advance();
        condition = this.parseExpression();
        conditionType = 'UNTIL';
        conditionPosition = 'post';
      } else if (this.currentTokenIs(TokenType.WHILE)) {
        this.advance();
        condition = this.parseExpression();
        conditionType = 'WHILE';
        conditionPosition = 'post';
      } else {
        throw new Error(`Expected UNTIL or WHILE after LOOP at line ${line}`);
      }
    }

    return {
      type: 'DoLoopStatement',
      condition: condition,
      conditionType: conditionType,
      conditionPosition: conditionPosition,
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
      targetLine: lineNumber,
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
      targetLine: lineNumber,
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
    
    while (this.currentTokenIs(TokenType.COMMA)) {
      this.advance();
      if (this.currentTokenIs(TokenType.NUMBER)) {
        values.push(this.parseNumberLiteral());
      } else if (this.currentTokenIs(TokenType.STRING)) {
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
      targetLine: lineNumber,
      line: line,
      column: column
    } as RestoreStatement;
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

  private parseRemStatement(): RemStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.REM);

    // REM 뒤의 모든 텍스트를 주석으로 수집
    let comment = '';
    while (!this.checkNewlineOrEOF()) {
      comment += this.current.value;
      this.advance();
    }

    return {
      type: 'RemStatement',
      comment: comment.trim(),
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
    
    while (this.currentTokenIs(TokenType.COMMA)) {
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
      } as BinaryExpression;
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
      } as BinaryExpression;
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
      } as BinaryExpression;
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
      } as BinaryExpression;
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
      } as BinaryExpression;
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
      } as BinaryExpression;
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
      } as BinaryExpression;
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
      } as UnaryExpression;
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
        } as NumberLiteral;
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
      if (!this.currentTokenIs(TokenType.RIGHT_PAREN)) {
        args.push(this.parseExpression());
        while (this.currentTokenIs(TokenType.COMMA)) {
          this.advance();
          args.push(this.parseExpression());
        }
      }
      
      this.consume(TokenType.RIGHT_PAREN);
      
      return {
        type: 'FunctionCall',
        name: identifier,
        arguments: args,
        line: identifier.line || 0,
        column: identifier.column || 0
      } as FunctionCall;
    }
    
    // 배열 액세스 확인
    if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
      this.advance();
      
      const indices: Expression[] = [];
      indices.push(this.parseExpression());
      while (this.currentTokenIs(TokenType.COMMA)) {
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
      } as ArrayAccess;
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
    } as Identifier;
    
    this.advance();
    this.consume(TokenType.LEFT_PAREN);
    
    const args: Expression[] = [];
    if (this.current.type !== TokenType.RIGHT_PAREN) {
      args.push(this.parseExpression());
      while (this.currentTokenIs(TokenType.COMMA)) {
        this.advance();
        args.push(this.parseExpression());
      }
    }
    
    this.consume(TokenType.RIGHT_PAREN);
    
    return {
      type: 'FunctionCall',
      name: name,
      arguments: args,
      line: name.line || 0,
      column: name.column || 0
    } as FunctionCall;
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

  // === 시스템 명령문 파서 ===

  private parseRunStatement(): RunStatement {
    const line = this.current.line;
    const column = this.current.column;
    this.consume(TokenType.RUN);

    return {
      type: 'RunStatement',
      line: line,
      column: column
    };
  }

  private parseListStatement(): ListStatement {
    const line = this.current.line;
    const column = this.current.column;
    this.consume(TokenType.LIST);

    let startLine: number | undefined;
    let endLine: number | undefined;

    // LIST [start[-end]]
    if (this.current.type === TokenType.NUMBER) {
      startLine = this.current.value as number;
      this.advance();

      if (this.currentTokenIs(TokenType.MINUS)) {
        this.advance();
        if (this.currentTokenIs(TokenType.NUMBER)) {
          endLine = this.current.value as number;
          this.advance();
        }
      }
    }

    return {
      type: 'ListStatement',
      startLine: startLine,
      endLine: endLine,
      line: line,
      column: column
    };
  }

  private parseNewStatement(): NewStatement {
    const line = this.current.line;
    const column = this.current.column;
    this.consume(TokenType.NEW);

    return {
      type: 'NewStatement',
      line: line,
      column: column
    };
  }

  private parseClearStatement(): ClearStatement {
    const line = this.current.line;
    const column = this.current.column;
    this.consume(TokenType.CLEAR);

    return {
      type: 'ClearStatement',
      line: line,
      column: column
    };
  }

  private parseSaveStatement(): SaveStatement {
    const line = this.current.line;
    const column = this.current.column;
    this.consume(TokenType.SAVE);

    // SAVE "filename"
    if (this.current.type !== TokenType.STRING) {
      throw new Error(`Expected string filename at line ${line}`);
    }

    const filename: StringLiteral = {
      type: 'StringLiteral',
      value: this.current.value as string,
      line: this.current.line,
      column: this.current.column
    };
    this.advance();

    return {
      type: 'SaveStatement',
      filename: filename,
      line: line,
      column: column
    };
  }

  private parseLoadStatement(): LoadStatement {
    const line = this.current.line;
    const column = this.current.column;
    this.consume(TokenType.LOAD);

    // LOAD "filename"
    if (this.current.type !== TokenType.STRING) {
      throw new Error(`Expected string filename at line ${line}`);
    }

    const filename: StringLiteral = {
      type: 'StringLiteral',
      value: this.current.value as string,
      line: this.current.line,
      column: this.current.column
    };
    this.advance();

    return {
      type: 'LoadStatement',
      filename: filename,
      line: line,
      column: column
    };
  }

  // === 유틸리티 메서드들 ===

  private currentTokenIs(type: TokenType): boolean {
    return (this.current.type as any) === type;
  }

  private advance(): void {
    if (!this.isAtEnd()) {
      this.position++;
      const nextToken = this.tokens[this.position];
      if (nextToken) {
        this.current = nextToken;
      } else {
        const lastToken = this.tokens[this.tokens.length - 1];
        if (lastToken) {
          this.current = lastToken;
        }
      }
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.tokens.length || !this.current || this.current.type === TokenType.EOF;
  }

  private peek(): Token | null {
    if (this.position + 1 >= this.tokens.length) {
      return null;
    }
    const token = this.tokens[this.position + 1];
    return token || null;
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
      TokenType.MID, TokenType.LEFT, TokenType.RIGHT,
      TokenType.POINT // 그래픽 함수
    ];

    return functionTokens.includes(this.current.type);
  }

  // === 그래픽 명령어 파서들 ===

  /**
   * SCREEN 명령어 파싱
   * SCREEN mode [, colorswitch] [, apage] [, vpage]
   */
  private parseScreenStatement(): import('./ast.js').ScreenStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.SCREEN);

    const mode = this.parseExpression();

    let colorSwitch: Expression | undefined;
    let activePage: Expression | undefined;
    let visualPage: Expression | undefined;

    if (this.current.type === TokenType.COMMA) {
      this.advance();
      colorSwitch = this.parseExpression();

      if (this.current.type === TokenType.COMMA) {
        this.advance();
        activePage = this.parseExpression();

        if (this.current.type === TokenType.COMMA) {
          this.advance();
          visualPage = this.parseExpression();
        }
      }
    }

    return {
      type: 'ScreenStatement',
      mode,
      colorSwitch,
      activePage,
      visualPage,
      line,
      column
    };
  }

  /**
   * PSET 명령어 파싱
   * PSET (x, y) [, color]
   */
  private parsePsetStatement(): import('./ast.js').PsetStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.PSET);
    this.consume(TokenType.LEFT_PAREN);

    const x = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y = this.parseExpression();

    this.consume(TokenType.RIGHT_PAREN);

    let color: Expression | undefined;
    if (this.current.type === TokenType.COMMA) {
      this.advance();
      color = this.parseExpression();
    }

    return {
      type: 'PsetStatement',
      x,
      y,
      color,
      line,
      column
    };
  }

  /**
   * PRESET 명령어 파싱
   * PRESET (x, y) [, color]
   */
  private parsePresetStatement(): import('./ast.js').PresetStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.PRESET);
    this.consume(TokenType.LEFT_PAREN);

    const x = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y = this.parseExpression();

    this.consume(TokenType.RIGHT_PAREN);

    let color: Expression | undefined;
    if (this.current.type === TokenType.COMMA) {
      this.advance();
      color = this.parseExpression();
    }

    return {
      type: 'PresetStatement',
      x,
      y,
      color,
      line,
      column
    };
  }

  /**
   * LINE 명령어 파싱
   * LINE [(x1, y1)]-(x2, y2) [, color] [, B[F]]
   */
  private parseLineStatement(): import('./ast.js').LineStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.LINE);

    let x1: Expression | undefined;
    let y1: Expression | undefined;

    // 시작점이 있는 경우
    if (this.current.type === TokenType.LEFT_PAREN) {
      this.advance();
      x1 = this.parseExpression();
      this.consume(TokenType.COMMA);
      y1 = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN);
    }

    // - 구분자
    this.consume(TokenType.MINUS);

    // 끝점
    this.consume(TokenType.LEFT_PAREN);
    const x2 = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y2 = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN);

    let color: Expression | undefined;
    let style: 'B' | 'BF' | undefined;

    if (this.current.type === TokenType.COMMA) {
      this.advance();
      color = this.parseExpression();

      if (this.current.type === TokenType.COMMA) {
        this.advance();
        // B 또는 BF 스타일
        // @ts-expect-error - TypeScript cannot narrow types after advance()
        if (this.current.type === TokenType.IDENTIFIER) {
          const styleStr = this.current.value as string;
          if (styleStr === 'B' || styleStr === 'BF') {
            style = styleStr;
            this.advance();
          }
        }
      }
    }

    return {
      type: 'LineStatement',
      x1,
      y1,
      x2,
      y2,
      color,
      style,
      line,
      column
    };
  }

  /**
   * CIRCLE 명령어 파싱
   * CIRCLE (x, y), radius [, color] [, start] [, end] [, aspect]
   */
  private parseCircleStatement(): import('./ast.js').CircleStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.CIRCLE);

    this.consume(TokenType.LEFT_PAREN);
    const x = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN);

    this.consume(TokenType.COMMA);
    const radius = this.parseExpression();

    let color: Expression | undefined;
    let startAngle: Expression | undefined;
    let endAngle: Expression | undefined;
    let aspect: Expression | undefined;

    if (this.current.type === TokenType.COMMA) {
      this.advance();
      color = this.parseExpression();

      if (this.current.type === TokenType.COMMA) {
        this.advance();
        startAngle = this.parseExpression();

        if (this.current.type === TokenType.COMMA) {
          this.advance();
          endAngle = this.parseExpression();

          if (this.current.type === TokenType.COMMA) {
            this.advance();
            aspect = this.parseExpression();
          }
        }
      }
    }

    return {
      type: 'CircleStatement',
      x,
      y,
      radius,
      color,
      startAngle,
      endAngle,
      aspect,
      line,
      column
    };
  }

  /**
   * PAINT 명령어 파싱
   * PAINT (x, y) [, paintColor] [, borderColor]
   */
  private parsePaintStatement(): import('./ast.js').PaintStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.PAINT);

    this.consume(TokenType.LEFT_PAREN);
    const x = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN);

    let paintColor: Expression | undefined;
    let borderColor: Expression | undefined;

    if (this.current.type === TokenType.COMMA) {
      this.advance();
      paintColor = this.parseExpression();

      if (this.current.type === TokenType.COMMA) {
        this.advance();
        borderColor = this.parseExpression();
      }
    }

    return {
      type: 'PaintStatement',
      x,
      y,
      paintColor,
      borderColor,
      line,
      column
    };
  }

  /**
   * COLOR 명령어 파싱
   * COLOR [foreground] [, background] [, border]
   */
  private parseColorStatement(): import('./ast.js').ColorStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.COLOR);

    let foreground: Expression | undefined;
    let background: Expression | undefined;
    let border: Expression | undefined;

    // 전경색 (선택적)
    if (this.current.type !== TokenType.COMMA &&
        this.current.type !== TokenType.NEWLINE &&
        this.current.type !== TokenType.EOF &&
        this.current.type !== TokenType.COLON) {
      foreground = this.parseExpression();
    }

    if (this.current.type === TokenType.COMMA) {
      this.advance();
      const type1 = this.current.type;
      if (type1 !== TokenType.COMMA &&
          type1 !== TokenType.NEWLINE &&
          type1 !== TokenType.EOF &&
          type1 !== TokenType.COLON) {
        background = this.parseExpression();
      }

      if (this.current.type === TokenType.COMMA) {
        this.advance();
        const type2 = this.current.type;
        // @ts-expect-error - TypeScript cannot narrow types after advance()
        const notNewline = type2 !== TokenType.NEWLINE;
        // @ts-expect-error - TypeScript cannot narrow types after advance()
        const notEOF = type2 !== TokenType.EOF;
        // @ts-expect-error - TypeScript cannot narrow types after advance()
        const notColon = type2 !== TokenType.COLON;
        if (notNewline && notEOF && notColon) {
          border = this.parseExpression();
        }
      }
    }

    return {
      type: 'ColorStatement',
      foreground,
      background,
      border,
      line,
      column
    };
  }

  /**
   * CLS 명령어 파싱
   * CLS [mode]
   */
  private parseClsStatement(): import('./ast.js').ClsStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.CLS);

    let mode: Expression | undefined;
    if (this.current.type !== TokenType.NEWLINE &&
        this.current.type !== TokenType.EOF &&
        this.current.type !== TokenType.COLON) {
      mode = this.parseExpression();
    }

    return {
      type: 'ClsStatement',
      mode,
      line,
      column
    };
  }

  /**
   * GET 문 파싱: GET (x1, y1)-(x2, y2), arrayName
   */
  private parseGetStatement(): GetStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.GET);

    // 좌표 파싱: (x1, y1)-(x2, y2)
    this.consume(TokenType.LEFT_PAREN);
    const x1 = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y1 = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN);

    this.consume(TokenType.MINUS);

    this.consume(TokenType.LEFT_PAREN);
    const x2 = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y2 = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN);

    this.consume(TokenType.COMMA);

    // 배열 이름
    if (this.current.type !== TokenType.IDENTIFIER) {
      this.error('Expected array name after GET coordinates');
    }
    const arrayName = this.current.value as string;
    this.advance();

    return {
      type: 'GetStatement',
      x1,
      y1,
      x2,
      y2,
      arrayName,
      line,
      column
    };
  }

  /**
   * PUT 문 파싱: PUT (x, y), arrayName [, action]
   */
  private parsePutStatement(): PutStatement {
    const line = this.current.line;
    const column = this.current.column;

    this.consume(TokenType.PUT);

    // 좌표 파싱: (x, y)
    this.consume(TokenType.LEFT_PAREN);
    const x = this.parseExpression();
    this.consume(TokenType.COMMA);
    const y = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN);

    this.consume(TokenType.COMMA);

    // 배열 이름
    if (this.current.type !== TokenType.IDENTIFIER) {
      this.error('Expected array name after PUT coordinates');
    }
    const arrayName = this.current.value as string;
    this.advance();

    // 선택적 액션 파라미터
    let action: 'PSET' | 'PRESET' | 'AND' | 'OR' | 'XOR' | undefined = undefined;
    if (this.currentTokenIs(TokenType.COMMA)) {
      this.advance();
      if (this.currentTokenIs(TokenType.PSET)) {
        action = 'PSET';
        this.advance();
      } else if (this.currentTokenIs(TokenType.PRESET)) {
        action = 'PRESET';
        this.advance();
      } else if (this.currentTokenIs(TokenType.IDENTIFIER)) {
        const actionStr = (this.current.value as string).toUpperCase();
        if (actionStr === 'AND' || actionStr === 'OR' || actionStr === 'XOR') {
          action = actionStr as 'AND' | 'OR' | 'XOR';
          this.advance();
        }
      }
    }

    return {
      type: 'PutStatement',
      x,
      y,
      arrayName,
      action,
      line,
      column
    };
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