/**
 * BASIC 인터프리터
 * 
 * AST를 순회하며 BASIC 프로그램을 실행합니다.
 */

import type {
  Program,
  Statement,
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
  ScreenStatement,
  PsetStatement,
  PresetStatement,
  LineStatement,
  CircleStatement,
  PaintStatement,
  ColorStatement,
  ClsStatement,
  GetStatement,
  PutStatement,
  ViewStatement,
  WindowStatement,
  PaletteStatement,
  DrawStatement,
  SoundStatement,
  PlayStatement,
  OpenStatement,
  CloseStatement,
  PrintFileStatement,
  InputFileStatement
} from './ast.js';

import { VariableManager } from './variables.js';
import { ExpressionEvaluator, type UserDefinedFunction } from './evaluator.js';
import { BasicError, ERROR_CODES } from '../utils/errors.js';
import { EventEmitter } from '../utils/events.js';
import { fileStorage } from '../utils/file-storage.js';
import { BasicDebugger } from '../debugger/basic-debugger.js';
import type { CallStackFrame } from '../debugger/types.js';

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
  private graphicsEngine: any | null = null; // GraphicsEngineInterface
  private fileSystem: any | null = null; // FileSystem
  private debugger: BasicDebugger;

  constructor() {
    super();

    this.variables = new VariableManager();

    // ExecutionContext 먼저 초기화
    this.context = {
      statements: [],
      programCounter: 0,
      lineNumberMap: new Map(),
      dataPointer: 0,
      dataValues: [],
      forLoopStack: [],
      gosubStack: [],
      userFunctions: new Map()
    };

    // userFunctions를 evaluator에 전달
    this.evaluator = new ExpressionEvaluator(this.variables, this.context.userFunctions);
    this.state = ExecutionState.READY;
    this.outputBuffer = [];
    this.inputQueue = [];

    // 디버거 초기화
    this.debugger = new BasicDebugger({
      maxTraceSize: 1000,
      pauseOnError: true,
      showVariables: true,
      showCallStack: true,
      enableProfiling: false
    });

    // 디버거 이벤트 리스너 설정
    this.debugger.on('breakpoint-hit', (lineNumber, variables) => {
      this.state = ExecutionState.PAUSED;
      this.emit('stateChanged', this.state);
      this.emit('breakpoint', lineNumber, variables);
    });

    this.debugger.on('watch-changed', (watch) => {
      this.emit('watchChanged', watch);
    });

    this.debugger.on('state-changed', (state) => {
      this.emit('debuggerStateChanged', state);
    });
  }

  /**
   * 프로그램 실행
   */
  public async run(program: Program): Promise<void> {
    try {
      this.initializeProgram(program);
      this.state = ExecutionState.RUNNING;
      this.emit('stateChanged', this.state);

      // 디버거 시작
      this.debugger.start();

      while (this.state === ExecutionState.RUNNING &&
             this.context.programCounter < this.context.statements.length) {

        const stmt = this.context.statements[this.context.programCounter];
        if (!stmt) {
          throw new BasicError('Statement not found', ERROR_CODES.RUNTIME_ERROR);
        }

        // 브레이크포인트 체크
        if (stmt.lineNumber !== undefined) {
          this.debugger.setCurrentLine(stmt.lineNumber);

          const variables = this.getVariablesSnapshot();
          if (this.debugger.checkBreakpoint(stmt.lineNumber, variables)) {
            // 브레이크포인트에 걸림 - 일시정지 상태로 전환
            this.debugger.pause();
            this.state = ExecutionState.PAUSED;
            await this.waitForResume();
          }

          // 변수 워치 업데이트
          this.debugger.updateWatches(variables);

          // 실행 추적 기록
          this.debugger.recordTrace(stmt.lineNumber, variables);
        }

        // 명령문 실행 시작 시간 기록
        const startTime = performance.now();

        await this.executeStatement(stmt);

        // 명령문 실행 시간 기록
        if (stmt.lineNumber !== undefined) {
          const executionTime = performance.now() - startTime;
          this.debugger.recordProfiling(stmt.lineNumber, executionTime);
        }

        // 중단 요청 확인
        if (this.state !== ExecutionState.RUNNING) {
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

      // 디버거 중지
      this.debugger.stop();

    } catch (error) {
      this.state = ExecutionState.ERROR;
      this.emit('stateChanged', this.state);
      this.emit('error', error);

      // 디버거에 에러 전달
      if (error instanceof Error && this.debugger.getCurrentLine() > 0) {
        this.debugger.emit('error', error, this.debugger.getCurrentLine());
      }

      throw error;
    }
  }

  /**
   * 일시정지 상태에서 재개 대기
   */
  private async waitForResume(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkResume = () => {
        if (this.state === ExecutionState.RUNNING) {
          resolve();
        } else {
          setTimeout(checkResume, 100);
        }
      };
      checkResume();
    });
  }

  /**
   * 현재 변수들의 스냅샷 가져오기
   */
  private getVariablesSnapshot(): Record<string, string | number> {
    const snapshot: Record<string, string | number> = {};

    // 모든 변수 정보 가져오기
    const allVars = this.variables.getAllVariables();
    for (const varInfo of allVars) {
      // 배열이 아닌 변수만 포함, Uint8Array 제외
      if (!varInfo.isArray && varInfo.value !== undefined) {
        const value = varInfo.value;
        if (typeof value === 'string' || typeof value === 'number') {
          snapshot[varInfo.name] = value;
        }
      }
    }

    return snapshot;
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
      if (stmt && stmt.lineNumber !== undefined) {
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
        case 'NextStatement':
          await this.executeNext(statement as NextStatement);
          break;
        case 'WhileStatement':
          await this.executeWhile(statement as WhileStatement);
          break;
        case 'DoLoopStatement':
          await this.executeDoLoop(statement as DoLoopStatement);
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
        case 'RunStatement':
          await this.executeRun(statement as RunStatement);
          break;
        case 'ListStatement':
          await this.executeList(statement as ListStatement);
          break;
        case 'NewStatement':
          await this.executeNew(statement as NewStatement);
          break;
        case 'ClearStatement':
          await this.executeClear(statement as ClearStatement);
          break;
        case 'SaveStatement':
          await this.executeSave(statement as SaveStatement);
          break;
        case 'LoadStatement':
          await this.executeLoad(statement as LoadStatement);
          break;
        case 'ScreenStatement':
          await this.executeScreen(statement as ScreenStatement);
          break;
        case 'PsetStatement':
          await this.executePset(statement as PsetStatement);
          break;
        case 'PresetStatement':
          await this.executePreset(statement as PresetStatement);
          break;
        case 'LineStatement':
          await this.executeLine(statement as LineStatement);
          break;
        case 'CircleStatement':
          await this.executeCircle(statement as CircleStatement);
          break;
        case 'PaintStatement':
          await this.executePaint(statement as PaintStatement);
          break;
        case 'ColorStatement':
          await this.executeColor(statement as ColorStatement);
          break;
        case 'ClsStatement':
          await this.executeCls(statement as ClsStatement);
          break;
        case 'GetStatement':
          await this.executeGet(statement as GetStatement);
          break;
        case 'PutStatement':
          await this.executePut(statement as PutStatement);
          break;
        case 'ViewStatement':
          await this.executeView(statement as ViewStatement);
          break;
        case 'WindowStatement':
          await this.executeWindow(statement as WindowStatement);
          break;
        case 'PaletteStatement':
          await this.executePalette(statement as PaletteStatement);
          break;
        case 'DrawStatement':
          await this.executeDraw(statement as DrawStatement);
          break;
        case 'SoundStatement':
          await this.executeSound(statement as SoundStatement);
          break;
        case 'PlayStatement':
          await this.executePlay(statement as PlayStatement);
          break;
        case 'OpenStatement':
          await this.executeOpen(statement as OpenStatement);
          break;
        case 'CloseStatement':
          await this.executeClose(statement as CloseStatement);
          break;
        case 'PrintFileStatement':
          await this.executePrintFile(statement as PrintFileStatement);
          break;
        case 'InputFileStatement':
          await this.executeInputFile(statement as InputFileStatement);
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
        const expr = stmt.expressions[i];
        if (!expr) {
          throw new BasicError('Expression not found in PRINT statement', ERROR_CODES.RUNTIME_ERROR, stmt.line);
        }
        const value = this.evaluator.evaluate(expr);
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
      
      if (!variable) {
        throw new BasicError('Variable not found in INPUT statement', ERROR_CODES.RUNTIME_ERROR, stmt.line);
      }
      
      if (input === undefined) {
        throw new BasicError('Input value is undefined', ERROR_CODES.RUNTIME_ERROR, stmt.line);
      }
      
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

    // FOR 스택에 루프 정보 저장
    const loopInfo: ForLoopInfo = {
      variable: variable,
      endValue: endValue,
      stepValue: stepValue,
      loopStart: this.context.programCounter
    };
    this.context.forLoopStack.push(loopInfo);

    // 디버거 콜스택에 추가
    if (stmt.line !== undefined) {
      const frame: CallStackFrame = {
        lineNumber: stmt.line,
        type: 'FOR',
        variables: this.getVariablesSnapshot()
      };
      this.debugger.pushCallStack(frame);
    }

    // 현재 위치부터 NEXT를 찾기
    const forStartIndex = this.context.programCounter;
    let nextIndex = -1;

    for (let i = forStartIndex + 1; i < this.context.statements.length; i++) {
      const s = this.context.statements[i];
      if (s && s.type === 'NextStatement') {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex === -1) {
      throw new BasicError(
        `FOR without NEXT for variable ${variable}`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // FOR 조건 확인
    let currentValue = startValue;
    const shouldContinue = stepValue > 0
      ? currentValue <= endValue
      : currentValue >= endValue;

    if (!shouldContinue) {
      // 조건이 맞지 않으면 NEXT 다음으로 점프
      this.context.forLoopStack.pop();
      this.context.programCounter = nextIndex;
    }
    // 조건이 맞으면 다음 명령으로 진행 (루프 본문 실행)
  }

  private async executeNext(stmt: NextStatement): Promise<void> {
    // FOR 스택에서 가장 최근 루프 가져오기
    if (this.context.forLoopStack.length === 0) {
      throw new BasicError(
        'NEXT without FOR',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const loopInfo = this.context.forLoopStack[this.context.forLoopStack.length - 1];
    if (!loopInfo) {
      throw new BasicError(
        'NEXT without FOR',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // 변수명 확인 (선택적)
    if (stmt.variable && stmt.variable.name !== loopInfo.variable) {
      throw new BasicError(
        `NEXT variable mismatch: expected ${loopInfo.variable}, got ${stmt.variable.name}`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // 루프 변수 증가
    const currentValue = this.variables.getVariable(loopInfo.variable);
    if (typeof currentValue !== 'number') {
      throw new BasicError(
        'Loop variable must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    const newValue = currentValue + loopInfo.stepValue;
    this.variables.setVariable(loopInfo.variable, newValue);

    // 루프 조건 확인
    const shouldContinue = loopInfo.stepValue > 0
      ? newValue <= loopInfo.endValue
      : newValue >= loopInfo.endValue;

    if (shouldContinue) {
      // 루프 시작점으로 돌아가기 (FOR 문 다음)
      this.context.programCounter = loopInfo.loopStart;
    } else {
      // 루프 종료 - 스택에서 제거
      this.context.forLoopStack.pop();

      // 디버거 콜스택에서 제거
      this.debugger.popCallStack();

      // 다음 명령으로 계속 (programCounter는 자동 증가됨)
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

  private async executeDoLoop(stmt: DoLoopStatement): Promise<void> {
    // 전위 조건 (DO UNTIL/WHILE condition)
    if (stmt.conditionPosition === 'pre') {
      while (true) {
        const conditionValue = this.evaluator.evaluate(stmt.condition);
        const conditionMet = this.evaluator.toBooleanValue(conditionValue);

        // UNTIL: 조건이 참이면 종료
        // WHILE: 조건이 거짓이면 종료
        if (stmt.conditionType === 'UNTIL') {
          if (conditionMet) break;
        } else {
          if (!conditionMet) break;
        }

        // 루프 본문 실행
        for (const bodyStmt of stmt.body) {
          await this.executeStatement(bodyStmt);
          if (this.state !== ExecutionState.RUNNING) return;
        }

        // 무한루프 방지
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    // 후위 조건 (LOOP UNTIL/WHILE condition)
    else {
      while (true) {
        // 루프 본문 먼저 실행 (최소 1회)
        for (const bodyStmt of stmt.body) {
          await this.executeStatement(bodyStmt);
          if (this.state !== ExecutionState.RUNNING) return;
        }

        const conditionValue = this.evaluator.evaluate(stmt.condition);
        const conditionMet = this.evaluator.toBooleanValue(conditionValue);

        // UNTIL: 조건이 참이면 종료
        // WHILE: 조건이 거짓이면 종료
        if (stmt.conditionType === 'UNTIL') {
          if (conditionMet) break;
        } else {
          if (!conditionMet) break;
        }

        // 무한루프 방지
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  private async executeGoto(stmt: GotoStatement): Promise<void> {
    if (!stmt.targetLine) {
      throw new BasicError('GOTO target line is undefined', ERROR_CODES.RUNTIME_ERROR, stmt.line);
    }
    const lineNumber = stmt.targetLine.value;
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
    if (!stmt.targetLine) {
      throw new BasicError('GOSUB target line is undefined', ERROR_CODES.RUNTIME_ERROR, stmt.line);
    }
    const lineNumber = stmt.targetLine.value;
    const targetIndex = this.context.lineNumberMap.get(lineNumber);

    if (targetIndex === undefined) {
      throw new BasicError(
        `Line number ${lineNumber} not found`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // 디버거 콜스택에 추가
    if (stmt.line !== undefined) {
      const frame: CallStackFrame = {
        lineNumber: stmt.line,
        type: 'GOSUB',
        returnLine: this.context.programCounter + 1,
        variables: this.getVariablesSnapshot()
      };
      this.debugger.pushCallStack(frame);
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

    // 디버거 콜스택에서 제거
    this.debugger.popCallStack();

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
      if (value === undefined) {
        throw new BasicError('No more data available for READ statement', ERROR_CODES.RUNTIME_ERROR, stmt.line);
      }
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
    
    const targetLine = stmt.lineNumbers[Math.floor(index) - 1]; // 1-based indexing
    if (!targetLine) {
      throw new BasicError('ON target line is undefined', ERROR_CODES.RUNTIME_ERROR, stmt.line);
    }
    const targetLineNumber = targetLine.value;
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
      this.debugger.pause();
      this.emit('stateChanged', this.state);
    }
  }

  /**
   * 프로그램 재개
   */
  public resume(): void {
    if (this.state === ExecutionState.PAUSED) {
      this.state = ExecutionState.RUNNING;
      this.debugger.resume();
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
   * GraphicsEngine 설정
   */
  public setGraphicsEngine(engine: any): void {
    this.graphicsEngine = engine;
    this.evaluator.setGraphicsEngine(engine);
  }

  /**
   * AudioEngine 설정
   */
  public setAudioEngine(engine: any): void {
    this.audioEngine = engine;
    this.evaluator.setAudioEngine(engine);
  }

  /**
   * 파일 시스템 설정
   */
  public setFileSystem(fileSystem: any): void {
    this.fileSystem = fileSystem;
  }

  /**
   * GraphicsEngine 가져오기
   */
  public getGraphicsEngine(): any | null {
    return this.graphicsEngine;
  }

  /**
   * 현재 실행 위치
   */
  public getCurrentLine(): number | undefined {
    if (this.context.programCounter < this.context.statements.length) {
      const stmt = this.context.statements[this.context.programCounter];
      return stmt ? stmt.lineNumber : undefined;
    }
    return undefined;
  }

  /**
   * 현재 프로그램 반환
   */
  public getCurrentProgram(): Program | null {
    return {
      type: 'Program',
      statements: this.context.statements
    };
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

  /**
   * 프로그램 및 변수 초기화
   */
  public clear(): void {
    this.state = ExecutionState.READY;
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
    this.variables.clear();
    this.outputBuffer = [];
    this.inputQueue = [];
    this.pendingInput = null;
  }

  /**
   * 프로그램 지우기 (NEW 명령)
   */
  public clearProgram(): void {
    this.context.statements = [];
    this.context.lineNumberMap.clear();
    this.context.programCounter = 0;
    this.context.dataPointer = 0;
    this.context.dataValues = [];
    this.context.forLoopStack = [];
    this.context.gosubStack = [];
    this.context.userFunctions.clear();
    this.variables.clear();
    this.outputBuffer = [];
    this.inputQueue = [];
    this.pendingInput = null;
    this.state = ExecutionState.READY;
  }

  /**
   * 프로그램 추가 (라인 병합)
   */
  public addProgram(program: Program): void {
    // 새로운 라인들을 기존 프로그램에 병합
    for (const newStmt of program.statements) {
      if (newStmt.lineNumber !== undefined) {
        // 같은 라인 번호가 있으면 교체, 없으면 추가
        const existingIndex = this.context.statements.findIndex(
          s => s.lineNumber === newStmt.lineNumber
        );

        if (existingIndex >= 0) {
          this.context.statements[existingIndex] = newStmt;
        } else {
          // 라인 번호 순서대로 삽입
          let insertIndex = this.context.statements.length;
          for (let i = 0; i < this.context.statements.length; i++) {
            const stmt = this.context.statements[i];
            if (stmt?.lineNumber !== undefined && stmt.lineNumber > newStmt.lineNumber) {
              insertIndex = i;
              break;
            }
          }
          this.context.statements.splice(insertIndex, 0, newStmt);
        }

        // 라인 번호 맵 업데이트
        this.updateLineNumberMap();
      }
    }
  }

  /**
   * 라인 번호 맵 업데이트
   */
  private updateLineNumberMap(): void {
    this.context.lineNumberMap.clear();
    for (let i = 0; i < this.context.statements.length; i++) {
      const stmt = this.context.statements[i];
      if (stmt?.lineNumber !== undefined) {
        this.context.lineNumberMap.set(stmt.lineNumber, i);
      }
    }
  }

  // ===================================================================
  // 그래픽 명령어 실행 메서드들
  // ===================================================================

  /**
   * SCREEN 명령어 실행
   */
  private async executeScreen(stmt: ScreenStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const mode = this.evaluator.evaluate(stmt.mode);
    if (typeof mode !== 'number') {
      throw new BasicError(
        'Screen mode must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    this.graphicsEngine.setScreenMode(Math.floor(mode));
  }

  /**
   * PSET 명령어 실행
   */
  private async executePset(stmt: PsetStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const x = this.evaluator.evaluate(stmt.x);
    const y = this.evaluator.evaluate(stmt.y);

    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new BasicError(
        'Coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    let color: number | undefined = undefined;
    if (stmt.color) {
      const colorValue = this.evaluator.evaluate(stmt.color);
      if (typeof colorValue !== 'number') {
        throw new BasicError(
          'Color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      color = Math.floor(colorValue);
    }

    this.graphicsEngine.pset(x, y, color);
  }

  /**
   * PRESET 명령어 실행
   */
  private async executePreset(stmt: PresetStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const x = this.evaluator.evaluate(stmt.x);
    const y = this.evaluator.evaluate(stmt.y);

    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new BasicError(
        'Coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    let color: number | undefined = undefined;
    if (stmt.color) {
      const colorValue = this.evaluator.evaluate(stmt.color);
      if (typeof colorValue !== 'number') {
        throw new BasicError(
          'Color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      color = Math.floor(colorValue);
    }

    this.graphicsEngine.preset(x, y, color);
  }

  /**
   * LINE 명령어 실행
   */
  private async executeLine(stmt: LineStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // x1, y1이 없으면 마지막 위치 사용
    const state = this.graphicsEngine.getState();
    let x1: number, y1: number;

    if (stmt.x1 && stmt.y1) {
      const x1Val = this.evaluator.evaluate(stmt.x1);
      const y1Val = this.evaluator.evaluate(stmt.y1);
      if (typeof x1Val !== 'number' || typeof y1Val !== 'number') {
        throw new BasicError(
          'Coordinates must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      x1 = x1Val;
      y1 = y1Val;
    } else {
      x1 = state.lastX;
      y1 = state.lastY;
    }

    const x2 = this.evaluator.evaluate(stmt.x2);
    const y2 = this.evaluator.evaluate(stmt.y2);

    if (typeof x2 !== 'number' || typeof y2 !== 'number') {
      throw new BasicError(
        'Coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    let color: number | undefined = undefined;
    if (stmt.color) {
      const colorValue = this.evaluator.evaluate(stmt.color);
      if (typeof colorValue !== 'number') {
        throw new BasicError(
          'Color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      color = Math.floor(colorValue);
    }

    const options: any = {};
    if (stmt.style) {
      options.style = stmt.style;
    }
    if (color !== undefined) {
      options.color = color;
    }

    this.graphicsEngine.line(x1, y1, x2, y2, options);
  }

  /**
   * CIRCLE 명령어 실행
   */
  private async executeCircle(stmt: CircleStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const x = this.evaluator.evaluate(stmt.x);
    const y = this.evaluator.evaluate(stmt.y);
    const radius = this.evaluator.evaluate(stmt.radius);

    if (typeof x !== 'number' || typeof y !== 'number' || typeof radius !== 'number') {
      throw new BasicError(
        'Coordinates and radius must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    const options: any = {};

    if (stmt.color) {
      const colorValue = this.evaluator.evaluate(stmt.color);
      if (typeof colorValue !== 'number') {
        throw new BasicError(
          'Color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      options.color = Math.floor(colorValue);
    }

    if (stmt.startAngle) {
      const startValue = this.evaluator.evaluate(stmt.startAngle);
      if (typeof startValue !== 'number') {
        throw new BasicError(
          'Start angle must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      options.startAngle = startValue;
    }

    if (stmt.endAngle) {
      const endValue = this.evaluator.evaluate(stmt.endAngle);
      if (typeof endValue !== 'number') {
        throw new BasicError(
          'End angle must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      options.endAngle = endValue;
    }

    if (stmt.aspect) {
      const aspectValue = this.evaluator.evaluate(stmt.aspect);
      if (typeof aspectValue !== 'number') {
        throw new BasicError(
          'Aspect must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      options.aspect = aspectValue;
    }

    this.graphicsEngine.circle(x, y, radius, options);
  }

  /**
   * PAINT 명령어 실행
   */
  private async executePaint(stmt: PaintStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const x = this.evaluator.evaluate(stmt.x);
    const y = this.evaluator.evaluate(stmt.y);

    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new BasicError(
        'Coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    const options: any = {};

    if (stmt.paintColor) {
      const paintColorValue = this.evaluator.evaluate(stmt.paintColor);
      if (typeof paintColorValue !== 'number') {
        throw new BasicError(
          'Paint color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      options.paintColor = Math.floor(paintColorValue);
    }

    if (stmt.borderColor) {
      const borderColorValue = this.evaluator.evaluate(stmt.borderColor);
      if (typeof borderColorValue !== 'number') {
        throw new BasicError(
          'Border color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      options.borderColor = Math.floor(borderColorValue);
    }

    this.graphicsEngine.paint(x, y, options);
  }

  /**
   * COLOR 명령어 실행
   */
  private async executeColor(stmt: ColorStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    let foreground: number | undefined = undefined;
    let background: number | undefined = undefined;
    let border: number | undefined = undefined;

    if (stmt.foreground) {
      const fgValue = this.evaluator.evaluate(stmt.foreground);
      if (typeof fgValue !== 'number') {
        throw new BasicError(
          'Foreground color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      foreground = Math.floor(fgValue);
    }

    if (stmt.background) {
      const bgValue = this.evaluator.evaluate(stmt.background);
      if (typeof bgValue !== 'number') {
        throw new BasicError(
          'Background color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      background = Math.floor(bgValue);
    }

    if (stmt.border) {
      const borderValue = this.evaluator.evaluate(stmt.border);
      if (typeof borderValue !== 'number') {
        throw new BasicError(
          'Border color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      border = Math.floor(borderValue);
    }

    this.graphicsEngine.setColor(foreground, background, border);
  }

  /**
   * CLS 명령어 실행
   */
  private async executeCls(stmt: ClsStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    let mode = 0; // 기본값: 전체 화면 지우기

    if (stmt.mode) {
      const modeValue = this.evaluator.evaluate(stmt.mode);
      if (typeof modeValue !== 'number') {
        throw new BasicError(
          'CLS mode must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      mode = Math.floor(modeValue);
    }

    this.graphicsEngine.cls(mode);
  }

  /**
   * GET 명령어 실행: 화면 영역을 배열에 저장
   * GET (x1, y1)-(x2, y2), arrayName
   */
  private async executeGet(stmt: GetStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // 좌표 계산
    const x1Val = this.evaluator.evaluate(stmt.x1);
    const y1Val = this.evaluator.evaluate(stmt.y1);
    const x2Val = this.evaluator.evaluate(stmt.x2);
    const y2Val = this.evaluator.evaluate(stmt.y2);

    if (typeof x1Val !== 'number' || typeof y1Val !== 'number' ||
        typeof x2Val !== 'number' || typeof y2Val !== 'number') {
      throw new BasicError(
        'GET coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    const x1 = Math.floor(x1Val);
    const y1 = Math.floor(y1Val);
    const x2 = Math.floor(x2Val);
    const y2 = Math.floor(y2Val);

    // 그래픽 엔진에서 스프라이트 데이터 가져오기
    const spriteData = this.graphicsEngine.getSprite(x1, y1, x2, y2);

    // 변수에 저장 (스프라이트 데이터는 Uint8Array)
    this.variables.setVariable(stmt.arrayName, spriteData);
  }

  /**
   * PUT 명령어 실행: 배열에서 화면으로 스프라이트 표시
   * PUT (x, y), arrayName [, action]
   */
  private async executePut(stmt: PutStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // 좌표 계산
    const xVal = this.evaluator.evaluate(stmt.x);
    const yVal = this.evaluator.evaluate(stmt.y);

    if (typeof xVal !== 'number' || typeof yVal !== 'number') {
      throw new BasicError(
        'PUT coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    const x = Math.floor(xVal);
    const y = Math.floor(yVal);

    // 변수에서 스프라이트 데이터 가져오기
    const spriteData = this.variables.getVariable(stmt.arrayName);

    // 타입 체크: object이고 null이 아닌지 먼저 확인
    if (typeof spriteData !== 'object' || spriteData === null) {
      throw new BasicError(
        `Variable ${stmt.arrayName} does not contain sprite data`,
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    // 이제 spriteData는 object이므로 instanceof 체크 가능
    if (!(spriteData instanceof Uint8Array)) {
      throw new BasicError(
        `Variable ${stmt.arrayName} does not contain sprite data`,
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    // 액션 타입 결정 (기본값: PSET)
    const action = stmt.action || 'PSET';

    // 그래픽 엔진에 스프라이트 표시
    this.graphicsEngine.putSprite(x, y, spriteData, action);
  }

  // === 시스템 명령어 실행 ===

  /**
   * RUN 명령어 실행: 프로그램 처음부터 재실행
   */
  private async executeRun(_stmt: RunStatement): Promise<void> {
    // 변수와 상태 초기화
    this.variables.clear();
    this.context.dataPointer = 0;
    this.context.gosubStack = [];
    this.context.forLoopStack = [];
    this.context.userFunctions.clear();

    // 프로그램 처음부터 실행
    this.context.programCounter = 0;
    this.state = ExecutionState.RUNNING;
  }

  /**
   * LIST 명령어 실행: 프로그램 목록 출력
   */
  private async executeList(stmt: ListStatement): Promise<void> {
    const lineNumbers = Array.from(this.context.lineNumberMap.keys()).sort((a, b) => a - b);

    const startLine = stmt.startLine ?? lineNumbers[0];
    const endLine = stmt.endLine ?? lineNumbers[lineNumbers.length - 1];

    for (const lineNum of lineNumbers) {
      if (startLine !== undefined && lineNum < startLine) continue;
      if (endLine !== undefined && lineNum > endLine) break;

      const statementIndex = this.context.lineNumberMap.get(lineNum);
      if (statementIndex !== undefined) {
        const statement = this.context.statements[statementIndex];
        if (statement) {
          // TODO: 각 statement를 BASIC 구문으로 변환하여 출력
          this.emit('output', `${lineNum} [${statement.type}]\n`);
        }
      }
    }
  }

  /**
   * NEW 명령어 실행: 프로그램과 변수 모두 초기화
   */
  private async executeNew(_stmt: NewStatement): Promise<void> {
    // 프로그램 컨텍스트 초기화
    this.context.statements = [];
    this.context.lineNumberMap.clear();
    this.context.dataValues = [];

    // 변수와 실행 상태 초기화
    this.variables.clear();
    this.context.dataPointer = 0;
    this.context.gosubStack = [];
    this.context.forLoopStack = [];
    this.context.userFunctions.clear();
    this.state = ExecutionState.STOPPED;
    this.context.programCounter = 0;

    this.emit('output', 'Ok\n');
  }

  /**
   * CLEAR 명령어 실행: 변수만 초기화
   */
  private async executeClear(_stmt: ClearStatement): Promise<void> {
    this.variables.clear();
    this.context.dataPointer = 0;
    this.context.gosubStack = [];
    this.context.forLoopStack = [];
    this.context.userFunctions.clear();

    this.emit('output', 'Ok\n');
  }

  /**
   * SAVE 명령어 실행: 프로그램 파일 저장
   */
  private async executeSave(stmt: SaveStatement): Promise<void> {
    try {
      const filename = stmt.filename.value;
      const statements = this.context.statements;

      fileStorage.save(filename, statements);
      this.emit('output', `Saved: ${filename}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BasicError(
        `Save failed: ${message}`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }
  }

  /**
   * LOAD 명령어 실행: 프로그램 파일 로드
   */
  private async executeLoad(stmt: LoadStatement): Promise<void> {
    try {
      const filename = stmt.filename.value;
      const statements = fileStorage.load(filename);

      // 현재 프로그램을 로드된 프로그램으로 대체
      this.context.statements = statements;

      // 라인 번호 맵 재구성
      this.updateLineNumberMap();

      // 변수 및 실행 상태 초기화
      this.variables.clear();
      this.context.dataPointer = 0;
      this.context.gosubStack = [];
      this.context.forLoopStack = [];
      this.context.userFunctions.clear();
      this.state = ExecutionState.STOPPED;
      this.context.programCounter = 0;

      // DATA 문 수집
      this.collectDataStatements();

      this.emit('output', `Loaded: ${filename}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BasicError(
        `Load failed: ${message}`,
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }
  }

  /**
   * VIEW 명령어 실행
   */
  private async executeView(stmt: ViewStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // VIEW without parameters - reset viewport
    if (!stmt.x1 || !stmt.y1 || !stmt.x2 || !stmt.y2) {
      this.graphicsEngine.setView();
      return;
    }

    const x1 = this.evaluator.evaluate(stmt.x1);
    const y1 = this.evaluator.evaluate(stmt.y1);
    const x2 = this.evaluator.evaluate(stmt.x2);
    const y2 = this.evaluator.evaluate(stmt.y2);

    if (typeof x1 !== 'number' || typeof y1 !== 'number' ||
        typeof x2 !== 'number' || typeof y2 !== 'number') {
      throw new BasicError(
        'VIEW coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    let fillColor: number | undefined = undefined;
    if (stmt.fillColor) {
      const fillValue = this.evaluator.evaluate(stmt.fillColor);
      if (typeof fillValue !== 'number') {
        throw new BasicError(
          'Fill color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      fillColor = Math.floor(fillValue);
    }

    let borderColor: number | undefined = undefined;
    if (stmt.borderColor) {
      const borderValue = this.evaluator.evaluate(stmt.borderColor);
      if (typeof borderValue !== 'number') {
        throw new BasicError(
          'Border color must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      borderColor = Math.floor(borderValue);
    }

    this.graphicsEngine.setView(
      Math.floor(x1),
      Math.floor(y1),
      Math.floor(x2),
      Math.floor(y2),
      fillColor,
      borderColor
    );
  }

  /**
   * WINDOW 명령어 실행
   */
  private async executeWindow(stmt: WindowStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // WINDOW without parameters - reset window
    if (!stmt.x1 || !stmt.y1 || !stmt.x2 || !stmt.y2) {
      this.graphicsEngine.setWindow();
      return;
    }

    const x1 = this.evaluator.evaluate(stmt.x1);
    const y1 = this.evaluator.evaluate(stmt.y1);
    const x2 = this.evaluator.evaluate(stmt.x2);
    const y2 = this.evaluator.evaluate(stmt.y2);

    if (typeof x1 !== 'number' || typeof y1 !== 'number' ||
        typeof x2 !== 'number' || typeof y2 !== 'number') {
      throw new BasicError(
        'WINDOW coordinates must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    this.graphicsEngine.setWindow(x1, y1, x2, y2);
  }

  /**
   * PALETTE 명령어 실행
   */
  private async executePalette(stmt: PaletteStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const attribute = this.evaluator.evaluate(stmt.attribute);
    const color = this.evaluator.evaluate(stmt.color);

    if (typeof attribute !== 'number' || typeof color !== 'number') {
      throw new BasicError(
        'PALETTE parameters must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    this.graphicsEngine.setPalette(Math.floor(attribute), Math.floor(color));
  }

  /**
   * DRAW 명령어 실행
   */
  private async executeDraw(stmt: DrawStatement): Promise<void> {
    if (!this.graphicsEngine) {
      throw new BasicError(
        'Graphics engine not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const commandString = this.evaluator.evaluate(stmt.commandString);

    if (typeof commandString !== 'string') {
      throw new BasicError(
        'DRAW parameter must be a string',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    this.graphicsEngine.draw(commandString);
  }

  /**
   * SOUND 명령어 실행: SOUND frequency, duration
   */
  private async executeSound(stmt: SoundStatement): Promise<void> {
    const frequency = this.evaluator.evaluate(stmt.frequency);
    const duration = this.evaluator.evaluate(stmt.duration);

    if (typeof frequency !== 'number' || typeof duration !== 'number') {
      throw new BasicError(
        'SOUND parameters must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    // AudioEngine을 통해 사운드 재생
    this.emit('sound', frequency, duration);
  }

  /**
   * PLAY 명령어 실행: PLAY musicString
   */
  private async executePlay(stmt: PlayStatement): Promise<void> {
    const musicString = this.evaluator.evaluate(stmt.musicString);

    if (typeof musicString !== 'string') {
      throw new BasicError(
        'PLAY parameter must be a string',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    // AudioEngine을 통해 음악 재생
    this.emit('play', musicString);
  }

  /**
   * OPEN 명령어 실행
   */
  private async executeOpen(stmt: OpenStatement): Promise<void> {
    if (!this.fileSystem) {
      throw new BasicError(
        'File system not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const mode = stmt.mode; // 'INPUT' | 'OUTPUT' | 'APPEND' | 'RANDOM'
    const fileNumber = this.evaluator.evaluate(stmt.fileNumber);
    const filename = this.evaluator.evaluate(stmt.filename);

    if (typeof fileNumber !== 'number') {
      throw new BasicError(
        'File number must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    if (typeof filename !== 'string') {
      throw new BasicError(
        'Filename must be a string',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    let recordLength: number | undefined = undefined;
    if (stmt.recordLength) {
      const recLen = this.evaluator.evaluate(stmt.recordLength);
      if (typeof recLen !== 'number') {
        throw new BasicError(
          'Record length must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }
      recordLength = Math.floor(recLen);
    }

    this.fileSystem.open(mode, Math.floor(fileNumber), filename, recordLength);
  }

  /**
   * CLOSE 명령어 실행
   */
  private async executeClose(stmt: CloseStatement): Promise<void> {
    if (!this.fileSystem) {
      throw new BasicError(
        'File system not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    // CLOSE without parameters - close all files
    if (!stmt.fileNumbers || stmt.fileNumbers.length === 0) {
      this.fileSystem.close();
      return;
    }

    // CLOSE specific file numbers
    for (const fileNumExpr of stmt.fileNumbers) {
      const fileNumber = this.evaluator.evaluate(fileNumExpr);

      if (typeof fileNumber !== 'number') {
        throw new BasicError(
          'File number must be numeric',
          ERROR_CODES.TYPE_MISMATCH,
          stmt.line
        );
      }

      this.fileSystem.close(Math.floor(fileNumber));
    }
  }

  /**
   * PRINT# 명령어 실행
   */
  private async executePrintFile(stmt: PrintFileStatement): Promise<void> {
    if (!this.fileSystem) {
      throw new BasicError(
        'File system not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const fileNumber = this.evaluator.evaluate(stmt.fileNumber);

    if (typeof fileNumber !== 'number') {
      throw new BasicError(
        'File number must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    // 표현식 평가하여 문자열로 변환
    const values: string[] = [];
    for (const expr of stmt.expressions) {
      const value = this.evaluator.evaluate(expr);
      values.push(String(value));
    }

    const data = values.join(',') + '\n';
    this.fileSystem.print(Math.floor(fileNumber), data);
  }

  /**
   * INPUT# 명령어 실행
   */
  private async executeInputFile(stmt: InputFileStatement): Promise<void> {
    if (!this.fileSystem) {
      throw new BasicError(
        'File system not initialized',
        ERROR_CODES.RUNTIME_ERROR,
        stmt.line
      );
    }

    const fileNumber = this.evaluator.evaluate(stmt.fileNumber);

    if (typeof fileNumber !== 'number') {
      throw new BasicError(
        'File number must be numeric',
        ERROR_CODES.TYPE_MISMATCH,
        stmt.line
      );
    }

    // 파일에서 한 줄 읽기
    const line = this.fileSystem.input(Math.floor(fileNumber));

    // 쉼표로 분리된 값 파싱
    const values = line.split(',').map((v: string) => v.trim());

    // 변수에 할당
    for (let i = 0; i < stmt.variables.length && i < values.length; i++) {
      const varIdentifier = stmt.variables[i];
      const valueStr = values[i];

      if (!varIdentifier || !valueStr) continue;

      // Identifier에서 이름 추출
      const varName = varIdentifier.name;

      // 숫자 변환 시도
      const numValue = parseFloat(valueStr);
      const value = isNaN(numValue) ? valueStr : numValue;

      this.variables.setVariable(varName, value);
    }
  }

  // ===================================================================
  // 디버거 Public API
  // ===================================================================

  /**
   * 디버거 가져오기
   */
  public getDebugger(): BasicDebugger {
    return this.debugger;
  }
}