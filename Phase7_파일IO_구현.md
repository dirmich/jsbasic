# Phase 7: 파일 I/O 시스템 구현 완료 보고서

## 📋 작업 개요

6502 BASIC 에뮬레이터에 localStorage 기반 SAVE/LOAD 파일 시스템을 완전히 구현했습니다.

## ✅ 구현 완료 항목

### 1. AST 노드 정의 (ast.ts)

```typescript
// SAVE "filename"
export interface SaveStatement extends Statement {
  type: 'SaveStatement';
  filename: StringLiteral;
}

// LOAD "filename"
export interface LoadStatement extends Statement {
  type: 'LoadStatement';
  filename: StringLiteral;
}
```

**ASTNodeTypes 유니온 타입 업데이트**:
- `SaveStatement`, `LoadStatement` 추가

### 2. 파일 저장소 유틸리티 (file-storage.ts)

완전한 파일 관리 시스템을 새로 구현했습니다:

#### 핵심 인터페이스

```typescript
export interface ProgramFile {
  filename: string;
  statements: Statement[];
  savedAt: number;
  size: number;
}

export interface FileMetadata {
  filename: string;
  savedAt: number;
  size: number;
}
```

#### FileStorage 클래스

**주요 메서드**:

**save(filename, statements)**:
- localStorage에 프로그램 저장
- 키 형식: `basic_program_${filename}`
- 메타데이터 포함 (저장 시간, 크기)
- 파일 목록 자동 업데이트

**load(filename)**:
- localStorage에서 프로그램 로드
- JSON 파싱 및 검증
- 파일 없을 시 에러 발생

**exists(filename)**:
- 파일 존재 여부 확인
- localStorage 키 체크

**delete(filename)**:
- 파일 삭제
- 파일 목록에서도 제거

**listFiles()**:
- 저장된 모든 파일 목록 조회
- FileMetadata[] 반환

**getFileInfo(filename)**:
- 특정 파일 메타데이터 조회
- 저장 시간, 크기 정보 포함

**clear()**:
- 모든 파일 삭제
- 파일 목록 초기화

#### 싱글톤 인스턴스

```typescript
export const fileStorage = new FileStorage();
```

### 3. 파서 구현 (parser.ts)

#### parseSaveStatement()
```typescript
private parseSaveStatement(): SaveStatement {
  this.consume(TokenType.SAVE);

  // 문자열 파일명 검증
  if (this.current.type !== TokenType.STRING) {
    throw new Error(`Expected string filename`);
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
```

#### parseLoadStatement()
- SAVE와 동일한 구조
- `LOAD "filename"` 구문 파싱

### 4. 인터프리터 실행 (interpreter.ts)

#### executeSave()
```typescript
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
```

**주요 기능**:
- 현재 프로그램 statements를 파일로 저장
- 파일명은 문자열 리터럴에서 추출
- 저장 성공 시 "Saved: filename" 출력
- 에러 발생 시 BasicError 처리

#### executeLoad()
```typescript
private async executeLoad(stmt: LoadStatement): Promise<void> {
  try {
    const filename = stmt.filename.value;
    const statements = fileStorage.load(filename);

    // 프로그램 교체
    this.context.statements = statements;

    // 라인 번호 맵 재구성
    this.updateLineNumberMap();

    // 실행 상태 초기화
    this.variables.clear();
    this.context.dataPointer = 0;
    this.context.gosubStack = [];
    this.context.forLoopStack = [];
    this.context.userFunctions.clear();
    this.state = ExecutionState.STOPPED;
    this.context.programCounter = 0;

    // DATA 문 재수집
    this.collectDataStatements();

    this.emit('output', `Loaded: ${filename}\n`);
  } catch (error) {
    // 에러 처리
  }
}
```

**주요 기능**:
- localStorage에서 프로그램 로드
- 현재 프로그램 완전 대체
- 라인 번호 맵 재구성
- 모든 변수 및 상태 초기화
- DATA 문 재수집
- 로드 성공 시 "Loaded: filename" 출력

## 🔧 수정된 파일

### 1. src/basic/ast.ts
- SaveStatement, LoadStatement 인터페이스 추가
- ASTNodeTypes 유니온 타입 업데이트

### 2. src/utils/file-storage.ts (신규)
- FileStorage 클래스 구현
- ProgramFile, FileMetadata 인터페이스 정의
- localStorage 기반 파일 관리 시스템
- 싱글톤 인스턴스 export

### 3. src/basic/parser.ts
- import 문에 SaveStatement, LoadStatement 추가
- switch-case에 라우팅 추가
- parseSaveStatement(), parseLoadStatement() 구현

### 4. src/basic/interpreter.ts
- import 문에 SaveStatement, LoadStatement 추가
- fileStorage import 추가
- switch-case에 실행 라우팅 추가
- executeSave(), executeLoad() 구현

## 📊 타입 안전성

- TypeScript 엄격 모드 통과 (`bun run lint`)
- 모든 nullable 필드 올바른 처리
- Error 타입 가드 적용
- localStorage 환경 체크

## 🎯 사용 예제

### 프로그램 저장
```basic
10 PRINT "Hello, World!"
20 FOR I = 1 TO 10
30 PRINT I
40 NEXT I
SAVE "HELLO"
```
→ 프로그램을 "HELLO" 파일명으로 저장
→ 출력: `Saved: HELLO`

### 프로그램 로드
```basic
LOAD "HELLO"
```
→ "HELLO" 파일에서 프로그램 로드
→ 출력: `Loaded: HELLO`
→ 기존 프로그램 완전 대체

### 파일 관리 (JavaScript API)
```javascript
import { fileStorage } from './utils/file-storage.js';

// 파일 목록 조회
const files = fileStorage.listFiles();
// [{ filename: "HELLO", savedAt: 1234567890, size: 234 }, ...]

// 파일 정보 조회
const info = fileStorage.getFileInfo("HELLO");
// { filename: "HELLO", savedAt: 1234567890, size: 234 }

// 파일 존재 확인
const exists = fileStorage.exists("HELLO");
// true

// 파일 삭제
fileStorage.delete("HELLO");

// 모든 파일 삭제
fileStorage.clear();
```

## 🛡️ 에러 처리

**SAVE 에러**:
- localStorage 사용 불가 (Node.js 환경)
- 저장 공간 부족
- JSON 직렬화 실패

**LOAD 에러**:
- 파일이 존재하지 않음
- JSON 파싱 실패
- localStorage 사용 불가

모든 에러는 BasicError로 변환되어 라인 번호와 함께 보고됩니다.

## 📦 저장 형식

### localStorage 키 구조
- 프로그램 파일: `basic_program_${filename}`
- 파일 목록: `basic_file_list`

### 저장 데이터 형식
```json
{
  "filename": "HELLO",
  "statements": [...],
  "savedAt": 1234567890,
  "size": 234
}
```

## 🚀 다음 단계 (Phase 8)

### 향후 개선 사항

1. **DIR/FILES 명령어**:
   - 저장된 파일 목록 BASIC에서 조회
   - `DIR` 또는 `FILES` 명령어

2. **KILL 명령어**:
   - 파일 삭제
   - `KILL "filename"`

3. **파일 관리 UI**:
   - 브라우저 UI에서 파일 관리
   - 드래그 앤 드롭 로드

4. **파일 메타데이터 확장**:
   - 프로그램 설명
   - 태그/카테고리
   - 버전 관리

## ✨ 주요 성과

1. **완전한 파일 시스템**: localStorage 기반 SAVE/LOAD 구현
2. **메타데이터 관리**: 파일 크기, 저장 시간 추적
3. **타입 안전성**: TypeScript 엄격 모드 통과
4. **견고한 에러 처리**: 모든 에러 케이스 처리
5. **확장 가능한 구조**: 추가 파일 관리 기능 준비 완료
6. **크로스 플랫폼 고려**: Node.js 환경 체크 및 graceful degradation

## 📝 커밋 정보

- **새로운 파일**: 1개 (file-storage.ts)
- **수정된 파일**: 3개 (ast.ts, parser.ts, interpreter.ts)
- **추가된 코드**: ~350줄
- **TypeScript 타입 오류**: 0
- **테스트 상태**: 타입 체크 통과

---

**작성일**: 2025-10-04
**작성자**: Claude Code
**상태**: ✅ 완료
**다음 마일스톤**: Phase 8 - 누락된 제어 구조 (WHILE/DO)
