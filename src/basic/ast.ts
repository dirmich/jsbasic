/**
 * BASIC AST (Abstract Syntax Tree) 노드 정의
 *
 * BASIC 언어의 구문 구조를 표현하는 AST 노드들을 정의합니다.
 */

/**
 * 기본 AST 노드 인터페이스
 */
export interface ASTNode {
  type: string;
  line?: number;
  column?: number;
}

/**
 * 프로그램 루트 노드
 */
export interface Program extends ASTNode {
  type: 'Program';
  statements: Statement[];
}

/**
 * 명령문 기본 인터페이스
 */
export interface Statement extends ASTNode {
  lineNumber?: number;
}

/**
 * 표현식 기본 인터페이스
 */
export interface Expression extends ASTNode {}

// === 명령문 타입들 ===

/**
 * LET 할당문
 */
export interface LetStatement extends Statement {
  type: 'LetStatement';
  variable: Identifier;
  expression: Expression;
}

/**
 * 배열 요소 할당문
 */
export interface ArrayAssignmentStatement extends Statement {
  type: 'ArrayAssignmentStatement';
  arrayName: Identifier;
  indices: Expression[];
  expression: Expression;
}

/**
 * PRINT 출력문
 */
export interface PrintStatement extends Statement {
  type: 'PrintStatement';
  expressions: Expression[];
  separator?: 'comma' | 'semicolon';
  trailingSeparator?: boolean; // PRINT 문이 구분자로 끝나는지 여부
}

/**
 * INPUT 입력문
 */
export interface InputStatement extends Statement {
  type: 'InputStatement';
  prompt?: StringLiteral;
  variables: Identifier[];
}

/**
 * IF 조건문
 */
export interface IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenStatement: Statement[];
  elseStatement?: Statement[];
}

/**
 * FOR 반복문
 */
export interface ForStatement extends Statement {
  type: 'ForStatement';
  variable: Identifier;
  start: Expression;
  end: Expression;
  step?: Expression;
  body: Statement[];
}

/**
 * NEXT 반복 종료문
 */
export interface NextStatement extends Statement {
  type: 'NextStatement';
  variable?: Identifier;
}

/**
 * WHILE 반복문
 */
export interface WhileStatement extends Statement {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement[];
}

/**
 * GOTO 점프문
 */
export interface GotoStatement extends Statement {
  type: 'GotoStatement';
  targetLine: NumberLiteral;
}

/**
 * GOSUB 서브루틴 호출문
 */
export interface GosubStatement extends Statement {
  type: 'GosubStatement';
  targetLine: NumberLiteral;
}

/**
 * RETURN 반환문
 */
export interface ReturnStatement extends Statement {
  type: 'ReturnStatement';
}

/**
 * DIM 배열 선언문
 */
export interface DimStatement extends Statement {
  type: 'DimStatement';
  declarations: ArrayDeclaration[];
}

/**
 * DATA 데이터 선언문
 */
export interface DataStatement extends Statement {
  type: 'DataStatement';
  values: (NumberLiteral | StringLiteral)[];
}

/**
 * READ 데이터 읽기문
 */
export interface ReadStatement extends Statement {
  type: 'ReadStatement';
  variables: Identifier[];
}

/**
 * RESTORE 데이터 포인터 복원문
 */
export interface RestoreStatement extends Statement {
  type: 'RestoreStatement';
  targetLine?: NumberLiteral;
}

/**
 * END 프로그램 종료문
 */
export interface EndStatement extends Statement {
  type: 'EndStatement';
}

/**
 * STOP 프로그램 중지문
 */
export interface StopStatement extends Statement {
  type: 'StopStatement';
}

/**
 * DEF 함수 정의문
 */
export interface DefStatement extends Statement {
  type: 'DefStatement';
  functionName: Identifier;
  parameter: Identifier;
  expression: Expression;
}

/**
 * ON...GOTO/GOSUB 조건부 점프문
 */
export interface OnStatement extends Statement {
  type: 'OnStatement';
  expression: Expression;
  command: 'GOTO' | 'GOSUB';
  lineNumbers: NumberLiteral[];
}

/**
 * REM 주석문
 */
export interface RemStatement extends Statement {
  type: 'RemStatement';
  comment: string;
}

/**
 * SCREEN 화면 모드 설정
 */
export interface ScreenStatement extends Statement {
  type: 'ScreenStatement';
  mode: Expression;
  colorSwitch?: Expression | undefined;
  activePage?: Expression | undefined;
  visualPage?: Expression | undefined;
}

/**
 * PSET 픽셀 설정
 */
export interface PsetStatement extends Statement {
  type: 'PsetStatement';
  x: Expression;
  y: Expression;
  color?: Expression | undefined;
}

/**
 * PRESET 픽셀 지우기
 */
export interface PresetStatement extends Statement {
  type: 'PresetStatement';
  x: Expression;
  y: Expression;
  color?: Expression | undefined;
}

/**
 * LINE 선 그리기
 */
export interface LineStatement extends Statement {
  type: 'LineStatement';
  x1?: Expression | undefined;
  y1?: Expression | undefined;
  x2: Expression;
  y2: Expression;
  color?: Expression | undefined;
  style?: 'B' | 'BF' | undefined; // B=Box, BF=Box Filled
}

/**
 * CIRCLE 원 그리기
 */
export interface CircleStatement extends Statement {
  type: 'CircleStatement';
  x: Expression;
  y: Expression;
  radius: Expression;
  color?: Expression | undefined;
  startAngle?: Expression | undefined;
  endAngle?: Expression | undefined;
  aspect?: Expression | undefined;
}

/**
 * PAINT 영역 채우기
 */
export interface PaintStatement extends Statement {
  type: 'PaintStatement';
  x: Expression;
  y: Expression;
  paintColor?: Expression | undefined;
  borderColor?: Expression | undefined;
}

/**
 * COLOR 색상 설정
 */
export interface ColorStatement extends Statement {
  type: 'ColorStatement';
  foreground?: Expression | undefined;
  background?: Expression | undefined;
  border?: Expression | undefined;
}

/**
 * CLS 화면 지우기
 */
export interface ClsStatement extends Statement {
  type: 'ClsStatement';
  mode?: Expression | undefined;
}

/**
 * GET 그래픽 스프라이트 저장
 */
export interface GetStatement extends Statement {
  type: 'GetStatement';
  x1: Expression;
  y1: Expression;
  x2: Expression;
  y2: Expression;
  arrayName: string;
}

/**
 * PUT 그래픽 스프라이트 표시
 */
export interface PutStatement extends Statement {
  type: 'PutStatement';
  x: Expression;
  y: Expression;
  arrayName: string;
  action?: 'PSET' | 'PRESET' | 'AND' | 'OR' | 'XOR' | undefined;
}

// === 표현식 타입들 ===

/**
 * 이진 연산식
 */
export interface BinaryExpression extends Expression {
  type: 'BinaryExpression';
  left: Expression;
  operator: BinaryOperator;
  right: Expression;
}

/**
 * 단항 연산식
 */
export interface UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
}

/**
 * 함수 호출식
 */
export interface FunctionCall extends Expression {
  type: 'FunctionCall';
  name: Identifier;
  arguments: Expression[];
}

/**
 * 배열 액세스식
 */
export interface ArrayAccess extends Expression {
  type: 'ArrayAccess';
  array: Identifier;
  indices: Expression[];
}

/**
 * 식별자
 */
export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
  dataType?: 'numeric' | 'string' | 'integer';
}

/**
 * 숫자 리터럴
 */
export interface NumberLiteral extends Expression {
  type: 'NumberLiteral';
  value: number;
}

/**
 * 문자열 리터럴
 */
export interface StringLiteral extends Expression {
  type: 'StringLiteral';
  value: string;
}

/**
 * 괄호 표현식
 */
export interface ParenthesizedExpression extends Expression {
  type: 'ParenthesizedExpression';
  expression: Expression;
}

// === 보조 타입들 ===

/**
 * 이진 연산자
 */
export type BinaryOperator = 
  | '+' | '-' | '*' | '/' | '^' | 'MOD'
  | '=' | '<>' | '<' | '<=' | '>' | '>='
  | 'AND' | 'OR';

/**
 * 단항 연산자
 */
export type UnaryOperator = '+' | '-' | 'NOT';

/**
 * 배열 선언
 */
export interface ArrayDeclaration {
  name: Identifier;
  dimensions: Expression[];
}

/**
 * AST 노드 타입 유니온
 */
export type ASTNodeTypes =
  | Program
  | LetStatement
  | ArrayAssignmentStatement
  | PrintStatement
  | InputStatement
  | IfStatement
  | ForStatement
  | WhileStatement
  | GotoStatement
  | GosubStatement
  | ReturnStatement
  | DimStatement
  | DataStatement
  | ReadStatement
  | RestoreStatement
  | EndStatement
  | StopStatement
  | DefStatement
  | OnStatement
  | RemStatement
  | ScreenStatement
  | PsetStatement
  | PresetStatement
  | LineStatement
  | CircleStatement
  | PaintStatement
  | ColorStatement
  | ClsStatement
  | GetStatement
  | PutStatement
  | BinaryExpression
  | UnaryExpression
  | FunctionCall
  | ArrayAccess
  | Identifier
  | NumberLiteral
  | StringLiteral
  | ParenthesizedExpression;

/**
 * AST 노드 방문자 인터페이스
 */
export interface ASTVisitor<T> {
  visitProgram(node: Program): T;
  visitLetStatement(node: LetStatement): T;
  visitArrayAssignmentStatement(node: ArrayAssignmentStatement): T;
  visitPrintStatement(node: PrintStatement): T;
  visitInputStatement(node: InputStatement): T;
  visitIfStatement(node: IfStatement): T;
  visitForStatement(node: ForStatement): T;
  visitWhileStatement(node: WhileStatement): T;
  visitGotoStatement(node: GotoStatement): T;
  visitGosubStatement(node: GosubStatement): T;
  visitReturnStatement(node: ReturnStatement): T;
  visitDimStatement(node: DimStatement): T;
  visitDataStatement(node: DataStatement): T;
  visitReadStatement(node: ReadStatement): T;
  visitRestoreStatement(node: RestoreStatement): T;
  visitEndStatement(node: EndStatement): T;
  visitStopStatement(node: StopStatement): T;
  visitDefStatement(node: DefStatement): T;
  visitOnStatement(node: OnStatement): T;
  visitRemStatement(node: RemStatement): T;
  visitScreenStatement(node: ScreenStatement): T;
  visitPsetStatement(node: PsetStatement): T;
  visitPresetStatement(node: PresetStatement): T;
  visitLineStatement(node: LineStatement): T;
  visitCircleStatement(node: CircleStatement): T;
  visitPaintStatement(node: PaintStatement): T;
  visitColorStatement(node: ColorStatement): T;
  visitClsStatement(node: ClsStatement): T;
  visitGetStatement(node: GetStatement): T;
  visitPutStatement(node: PutStatement): T;
  visitBinaryExpression(node: BinaryExpression): T;
  visitUnaryExpression(node: UnaryExpression): T;
  visitFunctionCall(node: FunctionCall): T;
  visitArrayAccess(node: ArrayAccess): T;
  visitIdentifier(node: Identifier): T;
  visitNumberLiteral(node: NumberLiteral): T;
  visitStringLiteral(node: StringLiteral): T;
  visitParenthesizedExpression(node: ParenthesizedExpression): T;
}

/**
 * AST 유틸리티 함수들
 */
export class ASTUtils {
  /**
   * 노드 타입 확인 유틸리티
   */
  static isStatement(node: ASTNode): node is Statement {
    return node.type.endsWith('Statement');
  }

  static isExpression(node: ASTNode): node is Expression {
    return node.type.endsWith('Expression') || 
           node.type.endsWith('Literal') || 
           node.type === 'Identifier' ||
           node.type === 'FunctionCall' ||
           node.type === 'ArrayAccess';
  }

  static isLiteral(node: ASTNode): node is NumberLiteral | StringLiteral {
    return node.type === 'NumberLiteral' || node.type === 'StringLiteral';
  }

  /**
   * 변수 타입 추론
   */
  static inferVariableType(name: string): 'numeric' | 'string' | 'integer' {
    if (name.endsWith('$')) {
      return 'string';
    } else if (name.endsWith('%')) {
      return 'integer';
    } else {
      return 'numeric';
    }
  }

  /**
   * 연산자 우선순위 반환
   */
  static getOperatorPrecedence(operator: BinaryOperator): number {
    switch (operator) {
      case 'OR':
        return 1;
      case 'AND':
        return 2;
      case '=':
      case '<>':
      case '<':
      case '<=':
      case '>':
      case '>=':
        return 3;
      case '+':
      case '-':
        return 4;
      case '*':
      case '/':
      case 'MOD':
        return 5;
      case '^':
        return 6;
      default:
        return 0;
    }
  }

  /**
   * 연산자가 우결합인지 확인
   */
  static isRightAssociative(operator: BinaryOperator): boolean {
    return operator === '^';
  }
}