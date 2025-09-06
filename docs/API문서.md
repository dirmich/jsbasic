# API 문서

> 6502 BASIC JavaScript 에뮬레이터 클래스 및 함수 레퍼런스

## 📋 목차

1. [CPU 에뮬레이터 API](#cpu-에뮬레이터-api)
2. [BASIC 인터프리터 API](#basic-인터프리터-api)
3. [메모리 관리 API](#메모리-관리-api)
4. [수학 함수 API](#수학-함수-api)
5. [I/O 시스템 API](#io-시스템-api)
6. [UI 컴포넌트 API](#ui-컴포넌트-api)
7. [유틸리티 API](#유틸리티-api)
8. [이벤트 시스템 API](#이벤트-시스템-api)

## 🔧 CPU 에뮬레이터 API

### `CPU6502` 클래스

6502 마이크로프로세서의 완전한 에뮬레이션을 제공하는 핵심 클래스입니다.

#### 생성자

```typescript
constructor(memory: MemoryManager, options?: CPUOptions)
```

**매개변수:**
- `memory` - 메모리 관리자 인스턴스
- `options?` - CPU 옵션 (선택적)

**예제:**
```typescript
const memory = new MemoryManager();
const cpu = new CPU6502(memory, {
  frequencyMHz: 1.0,
  enableDebug: true
});
```

#### 주요 메서드

##### `reset(): void`

CPU를 초기 상태로 리셋합니다.

```typescript
cpu.reset();
```

**동작:**
- 레지스터 초기화 (A=0, X=0, Y=0, SP=0xFF)
- 플래그 초기화 (I=1, 나머지=0)
- PC를 리셋 벡터($FFFC-$FFFD)에서 로드

##### `step(): number`

단일 명령어를 실행하고 소모된 사이클 수를 반환합니다.

```typescript
const cycles = cpu.step();
```

**반환값:** `number` - 실행에 소모된 CPU 사이클 수

**예외:**
- `CPUError` - 알 수 없는 오피코드 실행 시

##### `execute(cycles: number): number`

지정된 사이클 수만큼 명령어들을 실행합니다.

```typescript
const executedCycles = cpu.execute(1000);
```

**매개변수:**
- `cycles` - 실행할 최대 사이클 수

**반환값:** `number` - 실제 실행된 사이클 수

##### `interrupt(type: InterruptType): void`

인터럽트를 발생시킵니다.

```typescript
cpu.interrupt('IRQ');  // 일반 인터럽트
cpu.interrupt('NMI');  // 마스크 불가능한 인터럽트
cpu.interrupt('BRK');  // 브레이크 인터럽트
```

**매개변수:**
- `type` - 인터럽트 타입 (`'IRQ'` | `'NMI'` | `'BRK'`)

#### 레지스터 접근

##### `registers: CPURegisters` (읽기 전용)

CPU 레지스터에 대한 읽기 전용 접근을 제공합니다.

```typescript
interface CPURegisters {
  readonly A: number;   // 누산기 (0-255)
  readonly X: number;   // X 인덱스 레지스터 (0-255)
  readonly Y: number;   // Y 인덱스 레지스터 (0-255)
  readonly SP: number;  // 스택 포인터 (0-255)
  readonly PC: number;  // 프로그램 카운터 (0-65535)
  readonly P: number;   // 상태 레지스터 (플래그)
}

// 사용 예제
console.log(`A=${cpu.registers.A}, X=${cpu.registers.X}`);
```

##### 플래그 조작

```typescript
// 플래그 상태 확인
getFlag(flag: CPUFlag): boolean
setFlag(flag: CPUFlag, value: boolean): void

// 사용 예제
const isZero = cpu.getFlag(CPUFlag.ZERO);
cpu.setFlag(CPUFlag.CARRY, true);
```

**플래그 열거형:**
```typescript
enum CPUFlag {
  CARRY = 0x01,      // C - 캐리 플래그
  ZERO = 0x02,       // Z - 제로 플래그
  INTERRUPT = 0x04,  // I - 인터럽트 비활성화
  DECIMAL = 0x08,    // D - 십진 모드
  BREAK = 0x10,      // B - 브레이크 플래그
  UNUSED = 0x20,     // - 사용되지 않음
  OVERFLOW = 0x40,   // V - 오버플로우 플래그
  NEGATIVE = 0x80    // N - 음수 플래그
}
```

#### 디버깅 메서드

##### `getState(): CPUState`

CPU의 전체 상태를 반환합니다.

```typescript
interface CPUState {
  registers: CPURegisters;
  flags: Record<string, boolean>;
  cycleCount: number;
  instructionCount: number;
}

const state = cpu.getState();
console.log('CPU 상태:', state);
```

##### `disassemble(address: number, count: number): DisassemblyLine[]`

메모리의 명령어들을 역어셈블합니다.

```typescript
const assembly = cpu.disassemble(0x0000, 10);
assembly.forEach(line => {
  console.log(`${line.address}: ${line.instruction} ${line.operands}`);
});
```

## 📝 BASIC 인터프리터 API

### `BasicInterpreter` 클래스

Microsoft BASIC 1.1 언어의 완전한 구현을 제공합니다.

#### 생성자

```typescript
constructor(cpu: CPU6502, options?: BasicOptions)
```

**매개변수:**
- `cpu` - CPU 인스턴스
- `options?` - BASIC 인터프리터 옵션

#### 주요 메서드

##### `loadProgram(lines: string[]): void`

BASIC 프로그램을 메모리에 로드합니다.

```typescript
const program = [
  '10 PRINT "HELLO"',
  '20 FOR I = 1 TO 10',
  '30 PRINT I',
  '40 NEXT I',
  '50 END'
];

interpreter.loadProgram(program);
```

##### `run(): Promise<ExecutionResult>`

현재 로드된 프로그램을 실행합니다.

```typescript
interface ExecutionResult {
  success: boolean;
  output: string;
  error?: BasicError;
  executionTime: number;
  cyclesUsed: number;
}

const result = await interpreter.run();
if (result.success) {
  console.log('출력:', result.output);
} else {
  console.error('에러:', result.error?.message);
}
```

##### `executeCommand(command: string): Promise<CommandResult>`

즉시 모드 명령을 실행합니다.

```typescript
// PRINT 명령 실행
const result = await interpreter.executeCommand('PRINT 2 + 3');
console.log(result.output); // "5"

// LIST 명령 실행
const list = await interpreter.executeCommand('LIST');
console.log(list.output); // 프로그램 목록
```

##### `stop(): void`

실행 중인 프로그램을 중단합니다.

```typescript
interpreter.stop();
```

#### 변수 관리

##### `getVariable(name: string): BasicValue | undefined`

변수 값을 조회합니다.

```typescript
const value = interpreter.getVariable('A');
if (value !== undefined) {
  console.log(`A = ${value}`);
}
```

##### `setVariable(name: string, value: BasicValue): void`

변수 값을 설정합니다.

```typescript
interpreter.setVariable('A', 42);
interpreter.setVariable('B$', 'HELLO');
interpreter.setVariable('C', [1, 2, 3]); // 배열
```

##### `listVariables(): Record<string, BasicValue>`

모든 변수의 목록을 반환합니다.

```typescript
const vars = interpreter.listVariables();
Object.entries(vars).forEach(([name, value]) => {
  console.log(`${name} = ${value}`);
});
```

### `BasicParser` 클래스

BASIC 소스 코드의 구문 분석을 담당합니다.

#### 주요 메서드

##### `parseLine(line: string): ParsedLine`

BASIC 라인을 파싱합니다.

```typescript
interface ParsedLine {
  lineNumber?: number;
  statement: Statement;
  tokens: Token[];
}

const parsed = parser.parseLine('10 PRINT "HELLO"');
console.log('라인 번호:', parsed.lineNumber);
console.log('명령문:', parsed.statement.type);
```

##### `parseExpression(expression: string): Expression`

BASIC 표현식을 파싱합니다.

```typescript
const expr = parser.parseExpression('A + B * 2');
const result = interpreter.evaluateExpression(expr);
```

## 💾 메모리 관리 API

### `MemoryManager` 클래스

64KB 메모리 공간을 관리하는 클래스입니다.

#### 생성자

```typescript
constructor(size: number = 65536)
```

#### 기본 메모리 접근

##### `read(address: number): number`

메모리 주소에서 1바이트를 읽습니다.

```typescript
const value = memory.read(0x1000);
```

##### `write(address: number, value: number): void`

메모리 주소에 1바이트를 씁니다.

```typescript
memory.write(0x1000, 0xFF);
```

##### `readWord(address: number): number`

메모리 주소에서 2바이트 워드를 읽습니다 (리틀 엔디안).

```typescript
const word = memory.readWord(0x1000); // 0x1000-0x1001 읽기
```

##### `writeWord(address: number, value: number): void`

메모리 주소에 2바이트 워드를 씁니다 (리틀 엔디안).

```typescript
memory.writeWord(0x1000, 0x1234); // 0x34를 0x1000에, 0x12를 0x1001에
```

#### 고급 메모리 기능

##### `fill(start: number, end: number, value: number): void`

메모리 영역을 특정 값으로 채웁니다.

```typescript
memory.fill(0x0000, 0x00FF, 0x00); // 페이지 제로를 0으로 초기화
```

##### `copy(source: number, dest: number, length: number): void`

메모리 영역을 복사합니다.

```typescript
memory.copy(0x1000, 0x2000, 256); // 256바이트 복사
```

##### `dump(start: number, length: number): MemoryDump`

메모리 덤프를 생성합니다.

```typescript
interface MemoryDump {
  address: number;
  data: number[];
  ascii: string;
}

const dump = memory.dump(0x1000, 16);
console.log(`주소: 0x${dump.address.toString(16)}`);
console.log(`데이터: ${dump.data.map(b => b.toString(16)).join(' ')}`);
console.log(`ASCII: ${dump.ascii}`);
```

### `HeapManager` 클래스

동적 메모리 할당을 관리합니다.

#### 주요 메서드

##### `allocate(size: number): number`

메모리 블록을 할당하고 주소를 반환합니다.

```typescript
const address = heap.allocate(256); // 256바이트 할당
if (address !== 0) {
  console.log(`할당된 주소: 0x${address.toString(16)}`);
}
```

##### `free(address: number): boolean`

메모리 블록을 해제합니다.

```typescript
const freed = heap.free(address);
if (freed) {
  console.log('메모리 해제 성공');
}
```

##### `getStats(): HeapStats`

힙 통계 정보를 반환합니다.

```typescript
interface HeapStats {
  totalSize: number;
  usedSize: number;
  freeSize: number;
  blockCount: number;
  largestFreeBlock: number;
}

const stats = heap.getStats();
console.log(`사용 중: ${stats.usedSize}/${stats.totalSize} bytes`);
```

## 🧮 수학 함수 API

### `MathLibrary` 클래스

6502 BASIC의 수학 함수들을 구현합니다.

#### 삼각함수

```typescript
sin(x: number): number    // 사인
cos(x: number): number    // 코사인
tan(x: number): number    // 탄젠트
atn(x: number): number    // 아크탄젠트 (ATN)
```

#### 로그 및 지수 함수

```typescript
log(x: number): number    // 자연로그
exp(x: number): number    // 지수함수 (e^x)
```

#### 기타 수학 함수

```typescript
sqr(x: number): number    // 제곱근
abs(x: number): number    // 절댓값
sgn(x: number): number    // 부호 함수 (-1, 0, 1)
int(x: number): number    // 정수 부분
rnd(seed?: number): number // 난수 생성
```

**사용 예제:**
```typescript
const math = new MathLibrary();

console.log(math.sin(Math.PI / 2)); // 1
console.log(math.log(Math.E));       // 1
console.log(math.sqr(16));          // 4
console.log(math.rnd());            // 0.0 ~ 1.0
```

### `FloatMath` 클래스

6502 BASIC의 6바이트 부동소수점 연산을 구현합니다.

#### 부동소수점 변환

```typescript
fromNumber(num: number): Float6502      // JavaScript number → 6502 float
toNumber(float: Float6502): number      // 6502 float → JavaScript number
```

#### 산술 연산

```typescript
add(a: Float6502, b: Float6502): Float6502     // a + b
subtract(a: Float6502, b: Float6502): Float6502 // a - b
multiply(a: Float6502, b: Float6502): Float6502 // a * b
divide(a: Float6502, b: Float6502): Float6502   // a / b
```

**예제:**
```typescript
const floatMath = new FloatMath();

const a = floatMath.fromNumber(3.14159);
const b = floatMath.fromNumber(2.0);
const result = floatMath.multiply(a, b);
const jsResult = floatMath.toNumber(result);

console.log(`3.14159 * 2.0 = ${jsResult}`);
```

## 📺 I/O 시스템 API

### `Terminal` 클래스

터미널 인터페이스를 관리합니다.

#### 출력 메서드

##### `write(text: string): void`

텍스트를 터미널에 출력합니다.

```typescript
terminal.write('HELLO WORLD');
```

##### `writeLine(text: string): void`

텍스트를 출력하고 새 줄로 이동합니다.

```typescript
terminal.writeLine('READY.');
```

##### `clear(): void`

터미널 화면을 지웁니다.

```typescript
terminal.clear();
```

#### 입력 메서드

##### `readLine(): Promise<string>`

사용자로부터 한 줄을 입력받습니다.

```typescript
const input = await terminal.readLine();
console.log(`사용자 입력: ${input}`);
```

##### `readKey(): Promise<string>`

사용자로부터 단일 키 입력을 받습니다.

```typescript
const key = await terminal.readKey();
console.log(`입력된 키: ${key}`);
```

#### 커서 제어

```typescript
setCursor(x: number, y: number): void   // 커서 위치 설정
getCursor(): {x: number, y: number}     // 현재 커서 위치
showCursor(show: boolean): void         // 커서 표시/숨김
```

### `Storage` 클래스

파일 저장/로드 기능을 제공합니다.

#### 파일 작업

##### `save(filename: string, content: string): Promise<boolean>`

프로그램을 파일로 저장합니다.

```typescript
const success = await storage.save('HELLO.BAS', program);
if (success) {
  console.log('저장 완료');
}
```

##### `load(filename: string): Promise<string | null>`

파일에서 프로그램을 로드합니다.

```typescript
const content = await storage.load('HELLO.BAS');
if (content) {
  interpreter.loadProgram(content.split('\n'));
}
```

##### `delete(filename: string): Promise<boolean>`

파일을 삭제합니다.

```typescript
const deleted = await storage.delete('OLD.BAS');
```

##### `list(): Promise<FileInfo[]>`

저장된 파일 목록을 반환합니다.

```typescript
interface FileInfo {
  name: string;
  size: number;
  modified: Date;
}

const files = await storage.list();
files.forEach(file => {
  console.log(`${file.name} (${file.size} bytes)`);
});
```

## 🎨 UI 컴포넌트 API

### `Editor` 클래스

BASIC 코드 에디터를 제공합니다.

#### 에디터 제어

##### `setText(text: string): void`

에디터의 텍스트를 설정합니다.

```typescript
editor.setText('10 PRINT "HELLO"\n20 END');
```

##### `getText(): string`

에디터의 현재 텍스트를 반환합니다.

```typescript
const code = editor.getText();
```

##### `insertLine(lineNumber: number, text: string): void`

특정 라인에 텍스트를 삽입합니다.

```typescript
editor.insertLine(15, 'PRINT "MIDDLE"');
```

##### `deleteLine(lineNumber: number): void`

특정 라인을 삭제합니다.

```typescript
editor.deleteLine(20);
```

#### 에디터 이벤트

```typescript
editor.on('textChanged', (text: string) => {
  console.log('텍스트 변경됨');
});

editor.on('lineNumberClick', (lineNumber: number) => {
  console.log(`라인 ${lineNumber} 클릭됨`);
});
```

### `Console` 클래스

콘솔 창을 관리합니다.

#### 콘솔 출력

##### `log(message: string, type?: 'info' | 'error' | 'warn'): void`

콘솔에 메시지를 출력합니다.

```typescript
console.log('정보 메시지', 'info');
console.log('에러 메시지', 'error');
console.log('경고 메시지', 'warn');
```

##### `clear(): void`

콘솔을 지웁니다.

```typescript
console.clear();
```

## 🛠️ 유틸리티 API

### 수치 유틸리티

```typescript
// 16진수 포맷팅
formatHex(value: number, width: number = 2): string
formatHex(0xFF, 2)     // "FF"
formatHex(0x1234, 4)   // "1234"

// 바이트 조작
clamp(value: number, min: number, max: number): number
toByte(value: number): number     // 0-255로 제한
toWord(value: number): number     // 0-65535로 제한

// 바이트 배열 조작
bytesToWord(low: number, high: number): number
wordToBytes(word: number): {low: number, high: number}
```

### 문자열 유틸리티

```typescript
// BASIC 문자열 함수 구현
left(str: string, length: number): string
right(str: string, length: number): string
mid(str: string, start: number, length?: number): string
len(str: string): number

// 사용 예제
left("HELLO", 3)        // "HEL"
right("WORLD", 2)       // "LD"
mid("BASIC", 2, 3)      // "ASI"
len("PROGRAMMING")      // 11
```

## 📡 이벤트 시스템 API

### `EventEmitter<T>` 클래스

타입 안전한 이벤트 시스템을 제공합니다.

#### 이벤트 등록 및 해제

```typescript
interface SystemEvents {
  'cpu.reset': void;
  'cpu.step': CPUState;
  'basic.error': BasicError;
  'basic.output': string;
  'memory.write': {address: number, value: number};
}

const emitter = new EventEmitter<SystemEvents>();

// 이벤트 리스너 등록
emitter.on('cpu.reset', () => {
  console.log('CPU 리셋됨');
});

emitter.on('basic.output', (output) => {
  console.log('BASIC 출력:', output);
});

// 이벤트 발생
emitter.emit('cpu.reset');
emitter.emit('basic.output', 'HELLO WORLD');

// 이벤트 리스너 해제
emitter.off('cpu.reset', handler);
```

#### 일회성 이벤트

```typescript
// 한 번만 실행되는 이벤트 리스너
emitter.once('cpu.reset', () => {
  console.log('첫 번째 리셋');
});
```

### 글로벌 이벤트

시스템 전체에서 사용되는 주요 이벤트들:

```typescript
// CPU 이벤트
'cpu.reset'           // CPU 리셋
'cpu.step'            // 명령어 실행
'cpu.interrupt'       // 인터럽트 발생
'cpu.breakpoint'      // 브레이크포인트 도달

// BASIC 인터프리터 이벤트
'basic.start'         // 프로그램 시작
'basic.stop'          // 프로그램 중단
'basic.error'         // 에러 발생
'basic.output'        // 출력 생성
'basic.input'         // 입력 요청

// 메모리 이벤트
'memory.read'         // 메모리 읽기
'memory.write'        // 메모리 쓰기
'memory.allocate'     // 메모리 할당
'memory.free'         // 메모리 해제

// UI 이벤트
'ui.ready'            // UI 준비 완료
'ui.resize'           // 창 크기 변경
'editor.change'       // 에디터 텍스트 변경
'terminal.input'      // 터미널 입력
```

## 📊 성능 모니터링 API

### `PerformanceMonitor` 클래스

시스템 성능을 모니터링합니다.

```typescript
interface PerformanceMetrics {
  cpuUsage: number;           // CPU 사용률 (0-100%)
  memoryUsage: number;        // 메모리 사용량 (bytes)
  cyclesPerSecond: number;    // 초당 사이클 수
  instructionsPerSecond: number; // 초당 명령어 수
  executionTime: number;      // 총 실행 시간 (ms)
}

const monitor = new PerformanceMonitor();

// 성능 측정 시작
monitor.start();

// 현재 메트릭 조회
const metrics = monitor.getMetrics();
console.log(`CPU 사용률: ${metrics.cpuUsage}%`);
console.log(`메모리 사용량: ${metrics.memoryUsage} bytes`);

// 성능 측정 중단
monitor.stop();
```

이 API 문서를 참조하여 6502 BASIC JavaScript 에뮬레이터의 모든 기능을 효과적으로 활용할 수 있습니다. 각 클래스와 메서드는 완전한 TypeScript 타입 지원을 제공하여 개발 시 IntelliSense와 타입 안전성을 보장합니다.