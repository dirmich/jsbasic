/**
 * BASIC 인터프리터
 * 
 * AST를 순회하며 BASIC 프로그램을 실행합니다.
 */

import {
  Program,
  Statement,
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
  RemStatement
} from './ast.js';

import { VariableManager } from './variables.js';
import { ExpressionEvaluator } from './evaluator.js';
import { BasicError, ERROR_CODES } from '../utils/errors.js';
import { EventEmitter } from '../utils/events.js';

/**
 * 프로그램 실행 상태
 */
export enum ExecutionState {
  READY = 'READY',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

/**
 * FOR 루프 정보
 */
interface ForLoopInfo {
  variable: string;
  endValue: number;
  stepValue: number;
  loopStart: number; // 명령문 인덱스
}

/**
 * 사용자 정의 함수 정보
 */
interface UserDefinedFunction {
  parameter: string;
  expression: any; // Expression AST 노드
}

/**
 * 실행 컨텍스트
 */
interface ExecutionContext {
  programCounter: number;
  statements: Statement[];
  lineNumberMap: Map<number, number>; // 라인 넘버 -> 명령문 인덱스
  dataPointer: number;
  dataValues: (string | number)[];
  forLoopStack: ForLoopInfo[];
  gosubStack: number[];
  userFunctions: Map<string, UserDefinedFunction>;
}

/**
 * BASIC 인터프리터
 */
export class BasicInterpreter extends EventEmitter {
  private variables: VariableManager;
  private evaluator: ExpressionEvaluator;
  private context: ExecutionContext;
  private state: ExecutionState;
  private outputBuffer: string[];
  private inputQueue: string[];
  private pendingInput: string[] | null = null;

  constructor() {
    super();
    
    this.variables = new VariableManager();
    this.evaluator = new ExpressionEvaluator(this.variables);
    this.state = ExecutionState.READY;
    this.outputBuffer = [];
    this.inputQueue = [];
    
    this.context = {
      programCounter: 0,
      statements: [],
      lineNumberMap: new Map(),
      dataPointer: 0,
      dataValues: [],
      forLoopStack: [],
      gosubStack: [],
      userFunctions: new Map()
    };
  }

  /**
   * 프로그램 실행
   */
  public async run(program: Program): Promise<void> {
    try {
      this.initializeProgram(program);
      this.state = ExecutionState.RUNNING;
      this.emit('stateChanged', this.state);

      while (this.state === ExecutionState.RUNNING && 
             this.context.programCounter < this.context.statements.length) {
        
        await this.executeStatement(this.context.statements[this.context.programCounter]);
        
        // 중단 요청 확인
        if (this.state === ExecutionState.PAUSED) {
          break;
        }
        
        this.context.programCounter++;
        
        // 무한루프 방지를 위한 yield
        if (this.context.programCounter % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      if (this.state === ExecutionState.RUNNING) {
        this.state = ExecutionState.STOPPED;
        this.emit('stateChanged', this.state);
      }

    } catch (error) {
      this.state = ExecutionState.ERROR;
      this.emit('stateChanged', this.state);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 프로그램 초기화
   */
  private initializeProgram(program: Program): void {
    this.context.statements = program.statements;
    this.context.programCounter = 0;
    this.context.lineNumberMap.clear();
    this.context.dataPointer = 0;
    this.context.dataValues = [];
    this.context.forLoopStack = [];
    this.context.gosubStack = [];
    this.context.userFunctions.clear();
    this.outputBuffer = [];
    this.variables.clear();

    // 라인 넘버 맵 생성
    for (let i = 0; i < this.context.statements.length; i++) {
      const stmt = this.context.statements[i];
      if (stmt.lineNumber !== undefined) {
        this.context.lineNumberMap.set(stmt.lineNumber, i);
      }
    }

    // DATA 문 수집
    this.collectDataStatements();
  }

  /**
   * DATA 문에서 데이터 수집
   */
  private collectDataStatements(): void {
    for (const stmt of this.context.statements) {
      if (stmt.type === 'DataStatement') {
        const dataStmt = stmt as DataStatement;
        for (const value of dataStmt.values) {
          this.context.dataValues.push(value.value);
        }
      }
    }
  }

  /**
   * 명령문 실행
   */
  private async executeStatement(statement: Statement): Promise<void> {
    this.emit('beforeStatement', statement);

    try {
      switch (statement.type) {
        case 'LetStatement':
          await this.executeLet(statement as LetStatement);
          break;
        case 'ArrayAssignmentStatement':
          await this.executeArrayAssignment(statement as ArrayAssignmentStatement);
          break;
        case 'PrintStatement':
          await this.executePrint(statement as PrintStatement);
          break;
        case 'InputStatement':
          await this.executeInput(statement as InputStatement);
          break;
        case 'IfStatement':
          await this.executeIf(statement as IfStatement);
          break;
        case 'ForStatement':
          await this.executeFor(statement as ForStatement);
          break;
        case 'WhileStatement':
          await this.executeWhile(statement as WhileStatement);
          break;
        case 'GotoStatement':
          await this.executeGoto(statement as GotoStatement);
          break;
        case 'GosubStatement':
          await this.executeGosub(statement as GosubStatement);
          break;
        case 'ReturnStatement':
          await this.executeReturn(statement as ReturnStatement);
          break;
        case 'DimStatement':
          await this.executeDim(statement as DimStatement);
          break;
        case 'DataStatement':
          // DATA 문은 프로그램 초기화 시 수집되므로 실행 시에는 무시
          break;
        case 'ReadStatement':
          await this.executeRead(statement as ReadStatement);
          break;
        case 'RestoreStatement':
          await this.executeRestore(statement as RestoreStatement);
          break;
        case 'EndStatement':
          await this.executeEnd(statement as EndStatement);
          break;
        case 'StopStatement':
          await this.executeStop(statement as StopStatement);
          break;
        case 'DefStatement':
          await this.executeDef(statement as DefStatement);
          break;
        case 'OnStatement':
          await this.executeOn(statement as OnStatement);
          break;
        case 'RemStatement':
          // 주석은 무시
          break;
        default:
          throw new BasicError(
            `Unknown statement type: ${statement.type}`,
            ERROR_CODES.RUNTIME_ERROR,
            statement.line
          );
      }

      this.emit('afterStatement', statement);

    } catch (error) {
      this.emit('statementError', statement, error);
      throw error;
    }
  }

  // === 개별 명령문 실행 메서드들 ===

  private async executeLet(stmt: LetStatement): Promise<void> {
    const value = this.evaluator.evaluate(stmt.expression);
    this.variables.setVariable(stmt.variable.name, value);
  }

  private async executeArrayAssignment(stmt: ArrayAssignmentStatement): Promise<void> {
    // 인덱스 값들을 계산
    const indices: number[] = [];
    for (const indexExpr of stmt.indices) {
      const indexValue = this.evaluator.evaluate(indexExpr);
      if (typeof indexValue !== 'number') {
        throw new BasicError(
          'Array indices must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      indices.push(Math.floor(indexValue)); // BASIC에서는 인덱스를 정수로 변환
    }

    // 할당할 값 계산
    const value = this.evaluator.evaluate(stmt.expression);

    // 배열에 값 설정
    this.variables.setArrayElement(stmt.arrayName.name, indices, value);
  }

  private async executePrint(stmt: PrintStatement): Promise<void> {
    let output = '';
    
    if (stmt.expressions.length === 0) {
      output = '\n';
    } else {
      for (let i = 0; i < stmt.expressions.length; i++) {
        const value = this.evaluator.evaluate(stmt.expressions[i]);
        output += String(value);
        
        // 구분자 처리
        if (i < stmt.expressions.length - 1) {
          if (stmt.separator === 'comma') {
            output += '\t'; // 탭으로 구분
          } else if (stmt.separator === 'semicolon') {
            // 세미콜론은 공백 없이 연결
          }
        }
      }
      
      // 세미콜론이 사용되면 개행 억제, 아니면 개행 추가
      if (stmt.separator !== 'semicolon') {
        output += '\n';
      }
    }
    
    this.outputBuffer.push(output);
    this.emit('output', output);
  }

  private async executeInput(stmt: InputStatement): Promise<void> {
    // 프롬프트 출력
    if (stmt.prompt) {
      const promptText = stmt.prompt.value;
      this.outputBuffer.push(promptText);
      this.emit('output', promptText);
    }

    // 입력 요청
    const inputs = await this.requestInput(stmt.variables.length);
    
    // 변수에 값 할당
    for (let i = 0; i < stmt.variables.length && i < inputs.length; i++) {
      const variable = stmt.variables[i];
      const input = inputs[i];
      
      if (variable.dataType === 'string') {
        this.variables.setVariable(variable.name, input);
      } else {
        const numValue = parseFloat(input);
        this.variables.setVariable(variable.name, isNaN(numValue) ? 0 : numValue);
      }
    }
  }

  private async executeIf(stmt: IfStatement): Promise<void> {
    const condition = this.evaluator.evaluate(stmt.condition);
    const isTrue = this.evaluator.toBooleanValue(condition);
    
    if (isTrue) {
      for (const thenStmt of stmt.thenStatement) {
        await this.executeStatement(thenStmt);
        if (this.state !== ExecutionState.RUNNING) break;
      }
    } else if (stmt.elseStatement) {
      for (const elseStmt of stmt.elseStatement) {
        await this.executeStatement(elseStmt);
        if (this.state !== ExecutionState.RUNNING) break;
      }
    }
  }

  private async executeFor(stmt: ForStatement): Promise<void> {
    const variable = stmt.variable.name;
    const startValue = this.evaluator.evaluate(stmt.start);
    const endValue = this.evaluator.evaluate(stmt.end);
    const stepValue = stmt.step ? this.evaluator.evaluate(stmt.step) : 1;
    
    if (typeof startValue !== 'number' || typeof endValue !== 'number' || typeof stepValue !== 'number') {
      throw new BasicError(
        'FOR loop values must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    // 루프 변수 초기화
    this.variables.setVariable(variable, startValue);
    
    // FOR 루프 실행: BASIC에서 FOR 루프는 완전히 실행됩니다
    let currentValue = startValue;
    
    while (true) {
      // 루프 조건 확인
      const shouldContinue = stepValue > 0 
        ? currentValue <= endValue
        : currentValue >= endValue;

      if (!shouldContinue) {
        break;
      }

      // 루프 본체 실행
      for (const bodyStmt of stmt.body) {
        await this.executeStatement(bodyStmt);
        if (this.state !== ExecutionState.RUNNING) return;
      }

      // 다음 반복을 위한 변수 증가
      currentValue += stepValue;
      this.variables.setVariable(variable, currentValue);
      
      // 무한루프 방지
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  private async executeWhile(stmt: WhileStatement): Promise<void> {
    const loopStart = this.context.programCounter;
    
    while (true) {
      const condition = this.evaluator.evaluate(stmt.condition);
      if (!this.evaluator.toBooleanValue(condition)) {
        break;
      }
      
      for (const bodyStmt of stmt.body) {
        await this.executeStatement(bodyStmt);
        if (this.state !== ExecutionState.RUNNING) return;
      }
      
      // 무한루프 방지
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  private async executeGoto(stmt: GotoStatement): Promise<void> {
    const lineNumber = stmt.lineNumber.value;
    const targetIndex = this.context.lineNumberMap.get(lineNumber);
    
    if (targetIndex === undefined) {
      throw new BasicError(
        `Line number ${lineNumber} not found`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }
    
    this.context.programCounter = targetIndex - 1; // -1 because it will be incremented
  }

  private async executeGosub(stmt: GosubStatement): Promise<void> {
    const lineNumber = stmt.lineNumber.value;
    const targetIndex = this.context.lineNumberMap.get(lineNumber);
    
    if (targetIndex === undefined) {
      throw new BasicError(
        `Line number ${lineNumber} not found`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }
    
    // 현재 위치를 스택에 저장
    this.context.gosubStack.push(this.context.programCounter);
    this.context.programCounter = targetIndex - 1; // -1 because it will be incremented
  }

  private async executeReturn(stmt: ReturnStatement): Promise<void> {
    if (this.context.gosubStack.length === 0) {
      throw new BasicError(
        'RETURN without GOSUB',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }
    
    this.context.programCounter = this.context.gosubStack.pop()!;
  }

  private async executeDim(stmt: DimStatement): Promise<void> {
    for (const declaration of stmt.declarations) {
      const dimensions: number[] = [];
      
      for (const dimExpr of declaration.dimensions) {
        const dimValue = this.evaluator.evaluate(dimExpr);
        if (typeof dimValue !== 'number' || dimValue < 0) {
          throw new BasicError(
            'Array dimension must be a non-negative number',
            ERROR_CODES.INVALID_OPERATION,
            stmt.line
          );
        }
        dimensions.push(Math.floor(dimValue));
      }
      
      this.variables.declareArray(declaration.name.name, dimensions);
    }
  }

  private async executeRead(stmt: ReadStatement): Promise<void> {
    for (const variable of stmt.variables) {
      if (this.context.dataPointer >= this.context.dataValues.length) {
        throw new BasicError(
          'Out of DATA',
          ERROR_CODES.RUNTIME_ERROR,
          stmt.line
        );
      }
      
      const value = this.context.dataValues[this.context.dataPointer++];
      this.variables.setVariable(variable.name, value);
    }
  }

  private async executeRestore(stmt: RestoreStatement): Promise<void> {
    if (stmt.lineNumber) {
      // 특정 라인으로 복원 (구현 간소화를 위해 전체 복원)
      this.context.dataPointer = 0;
    } else {
      this.context.dataPointer = 0;
    }
  }

  private async executeEnd(stmt: EndStatement): Promise<void> {
    this.state = ExecutionState.STOPPED;
    this.context.programCounter = this.context.statements.length; // 프로그램 종료
  }

  private async executeStop(stmt: StopStatement): Promise<void> {
    this.state = ExecutionState.STOPPED;
    this.context.programCounter = this.context.statements.length; // 프로그램 종료
  }

  private async executeDef(stmt: DefStatement): Promise<void> {
    const functionName = stmt.functionName.name.toUpperCase();
    this.context.userFunctions.set(functionName, {
      parameter: stmt.parameter.name,
      expression: stmt.expression
    });
  }

  private async executeOn(stmt: OnStatement): Promise<void> {
    const index = this.evaluator.evaluate(stmt.expression);
    
    if (typeof index !== 'number' || index < 1 || index > stmt.lineNumbers.length) {
      // 범위를 벗어나면 무시 (BASIC의 일반적인 동작)
      return;
    }
    
    const targetLineNumber = stmt.lineNumbers[Math.floor(index) - 1].value; // 1-based indexing
    const targetIndex = this.context.lineNumberMap.get(targetLineNumber);
    
    if (targetIndex === undefined) {
      throw new BasicError(
        `Line number ${targetLineNumber} not found`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }
    
    if (stmt.command === 'GOSUB') {
      this.context.gosubStack.push(this.context.programCounter);
    }
    
    this.context.programCounter = targetIndex - 1; // -1 because it will be incremented
  }

  // === 유틸리티 메서드들 ===

  /**
   * 입력 요청
   */
  private async requestInput(count: number): Promise<string[]> {
    if (this.inputQueue.length >= count) {
      return this.inputQueue.splice(0, count);
    }
    
    // 입력 대기
    return new Promise((resolve) => {
      this.pendingInput = [];
      this.emit('inputRequired', count - this.inputQueue.length);
      
      const checkInput = () => {
        if (this.inputQueue.length >= count) {
          const result = this.inputQueue.splice(0, count);
          this.pendingInput = null;
          resolve(result);
        } else {
          setTimeout(checkInput, 100);
        }
      };
      
      checkInput();
    });
  }

  /**
   * 입력 제공
   */
  public provideInput(input: string | string[]): void {
    const inputs = Array.isArray(input) ? input : [input];
    this.inputQueue.push(...inputs);
  }

  /**
   * 출력 버퍼 가져오기
   */
  public getOutput(): string[] {
    return [...this.outputBuffer];
  }

  /**
   * 출력 버퍼 비우기
   */
  public clearOutput(): void {
    this.outputBuffer = [];
  }

  /**
   * 현재 상태
   */
  public getState(): ExecutionState {
    return this.state;
  }

  /**
   * 프로그램 일시정지
   */
  public pause(): void {
    if (this.state === ExecutionState.RUNNING) {
      this.state = ExecutionState.PAUSED;
      this.emit('stateChanged', this.state);
    }
  }

  /**
   * 프로그램 재개
   */
  public resume(): void {
    if (this.state === ExecutionState.PAUSED) {
      this.state = ExecutionState.RUNNING;
      this.emit('stateChanged', this.state);
    }
  }

  /**
   * 프로그램 중지
   */
  public stop(): void {
    this.state = ExecutionState.STOPPED;
    this.emit('stateChanged', this.state);
  }

  /**
   * 변수 관리자 접근
   */
  public getVariables(): VariableManager {
    return this.variables;
  }

  /**
   * 현재 실행 위치
   */
  public getCurrentLine(): number | undefined {
    if (this.context.programCounter < this.context.statements.length) {
      return this.context.statements[this.context.programCounter].lineNumber;
    }
    return undefined;
  }

  /**
   * 현재 프로그램 반환
   */
  public getCurrentProgram(): Program | null {
    return this.program;
  }

  /**
   * 디버깅 정보
   */
  public getDebugInfo(): any {
    return {
      state: this.state,
      programCounter: this.context.programCounter,
      currentLine: this.getCurrentLine(),
      forLoopStack: this.context.forLoopStack,
      gosubStack: this.context.gosubStack,
      dataPointer: this.context.dataPointer,
      variableCount: this.variables.size()
    };
  }
}