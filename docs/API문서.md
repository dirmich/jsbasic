# 6502 BASIC 에뮬레이터 API 레퍼런스

> 완전한 클래스 및 함수 API 문서

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![API Coverage](https://img.shields.io/badge/API%20Coverage-100%25-brightgreen.svg)](#)
[![Documentation](https://img.shields.io/badge/docs-TypeDoc-blue.svg)](docs/)

## 📋 목차

1. [시작하기](#시작하기)
2. [CPU 에뮬레이터 API](#cpu-에뮬레이터-api)
3. [BASIC 인터프리터 API](#basic-인터프리터-api)
4. [메모리 관리 API](#메모리-관리-api)
5. [수학 함수 API](#수학-함수-api)
6. [I/O 시스템 API](#io-시스템-api)
7. [UI 컴포넌트 API](#ui-컴포넌트-api)
8. [유틸리티 API](#유틸리티-api)
9. [이벤트 시스템 API](#이벤트-시스템-api)
10. [성능 모니터링 API](#성능-모니터링-api)
11. [에러 처리 API](#에러-처리-api)
12. [확장 API](#확장-api)

## 🚀 시작하기

### 패키지 설치

```bash
npm install @6502basic/emulator
# 또는
bun add @6502basic/emulator
```

### 기본 사용법

```typescript
import { BasicEmulator, EmulatorOptions } from '@6502basic/emulator';

// 에뮬레이터 인스턴스 생성
const options: EmulatorOptions = {
  memorySize: 65536,
  cpuFrequency: 1000000, // 1MHz
  enablePerformanceMonitoring: true
};

const emulator = new BasicEmulator(options);

// 초기화
await emulator.initialize();

// BASIC 프로그램 실행
const program = [
  '10 PRINT "HELLO, WORLD!"',
  '20 FOR I = 1 TO 5',
  '30 PRINT "Number:", I',
  '40 NEXT I',
  '50 END'
];

await emulator.loadProgram(program);
const result = await emulator.run();

console.log('출력:', result.output);
```

### TypeScript 타입 지원

모든 API는 완전한 TypeScript 타입 정의를 제공합니다:

```typescript
// 타입 안전한 API 사용
const cpu: CPU6502 = emulator.getCPU();
const registers: CPURegisters = cpu.registers;
const accumulator: number = registers.A; // 0-255 범위 보장

// 이벤트 타입 안전성
emulator.on('basic.output', (output: string) => {
  console.log(output);
});
```

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

## 🎵 오디오 엔진 API

### `AudioEngine` 클래스

다중 채널 오디오 재생 및 고급 MML(Music Macro Language) 파싱을 제공합니다.

#### 생성자

```typescript
constructor(config?: AudioConfig)
```

**매개변수:**
- `config?` - 오디오 설정 (선택적)

```typescript
interface AudioConfig {
  sampleRate?: number;        // 샘플링 레이트 (기본: 44100Hz)
  channels?: number;          // 채널 수 (기본: 3)
  masterVolume?: number;      // 마스터 볼륨 0-1 (기본: 0.8)
  enableReverb?: boolean;     // 리버브 활성화 (기본: false)
}
```

**예제:**
```typescript
const audio = new AudioEngine({
  sampleRate: 44100,
  channels: 3,
  masterVolume: 0.8
});
```

#### 다중 채널 재생

##### `playMMLOnChannel(channel: number, mml: string): Promise<void>`

특정 채널에서 MML을 재생합니다.

```typescript
// 채널 0에서 멜로디 재생
await audio.playMMLOnChannel(0, 'T120 O4 CDEFGAB');

// 채널 1에서 베이스라인 재생
await audio.playMMLOnChannel(1, 'T120 O2 C4C4C4C4');

// 채널 2에서 화음 재생
await audio.playMMLOnChannel(2, 'T120 O4 [CEG]2');
```

**매개변수:**
- `channel` - 채널 번호 (0-2)
- `mml` - MML 문자열

##### `stopChannel(channel: number): void`

특정 채널의 재생을 중지합니다.

```typescript
audio.stopChannel(0); // 채널 0 중지
```

##### `stopAllChannels(): void`

모든 채널의 재생을 중지합니다.

```typescript
audio.stopAllChannels();
```

##### `getChannelStatus(channel: number): ChannelStatus`

채널의 현재 상태를 반환합니다.

```typescript
interface ChannelStatus {
  isPlaying: boolean;
  currentNote?: string;
  position: number;
  volume: number;
}

const status = audio.getChannelStatus(0);
console.log(`재생 중: ${status.isPlaying}`);
```

#### 화음 재생

##### `playChord(notes: string[], duration: number): Promise<void>`

여러 음을 동시에 재생합니다.

```typescript
// C 메이저 코드 재생 (1초)
await audio.playChord(['C4', 'E4', 'G4'], 1000);

// A 마이너 코드 재생 (500ms)
await audio.playChord(['A3', 'C4', 'E4'], 500);
```

**매개변수:**
- `notes` - 음표 배열 (예: ['C4', 'E4', 'G4'])
- `duration` - 지속 시간 (밀리초)

#### 오디오 이펙트

##### `fadeIn(duration: number): void`

페이드 인 효과를 적용합니다.

```typescript
audio.fadeIn(1000); // 1초에 걸쳐 페이드 인
await audio.playMMLOnChannel(0, 'T120 O4 CDEFGAB');
```

##### `fadeOut(duration: number): void`

페이드 아웃 효과를 적용합니다.

```typescript
audio.fadeOut(2000); // 2초에 걸쳐 페이드 아웃
```

##### `setMasterVolume(volume: number): void`

마스터 볼륨을 설정합니다.

```typescript
audio.setMasterVolume(0.5); // 50% 볼륨
```

#### 고급 MML 명령어

##### 볼륨 제어 (V0-V15)

```typescript
// V0 = 무음, V15 = 최대 볼륨
await audio.playMMLOnChannel(0, 'V15 C V10 D V5 E V0 F');
```

##### 파형 선택 (W0-W3)

```typescript
// W0 = 사인파, W1 = 사각파, W2 = 톱니파, W3 = 삼각파
await audio.playMMLOnChannel(0, 'W0 C W1 D W2 E W3 F');
```

##### 아티큘레이션 (ML/MN/MS)

```typescript
// ML = Legato (연결), MN = Normal, MS = Staccato (끊어서)
await audio.playMMLOnChannel(0, 'ML CDEF MN CDEF MS CDEF');
```

##### 반복 ([...]n)

```typescript
// [...]n: 괄호 안 패턴을 n회 반복 (최대 100회)
await audio.playMMLOnChannel(0, '[CDEFG]4'); // CDEFG를 4번 반복
await audio.playMMLOnChannel(0, '[CD]8 [EF]4'); // 중첩 반복
```

##### 타이 (&)

```typescript
// &: 음표를 연결
await audio.playMMLOnChannel(0, 'C4&C4'); // 반음표 C (4분음표 2개 연결)
await audio.playMMLOnChannel(0, 'C&D&E&F'); // 부드러운 글리산도
```

#### ADSR 엔벨로프

##### `setADSR(attack: number, decay: number, sustain: number, release: number): void`

ADSR 엔벨로프를 설정합니다.

```typescript
audio.setADSR(
  0.1,  // Attack: 0.1초
  0.2,  // Decay: 0.2초
  0.7,  // Sustain: 70% 볼륨
  0.5   // Release: 0.5초
);
```

**매개변수:**
- `attack` - 어택 타임 (초)
- `decay` - 디케이 타임 (초)
- `sustain` - 서스테인 레벨 (0-1)
- `release` - 릴리스 타임 (초)

#### 이벤트

```typescript
// noteStart: 음표 재생 시작
audio.on('noteStart', (event) => {
  console.log(`채널 ${event.channel}: ${event.note} 시작`);
});

// noteEnd: 음표 재생 종료
audio.on('noteEnd', (event) => {
  console.log(`채널 ${event.channel}: ${event.note} 종료`);
});

// channelStop: 채널 중지
audio.on('channelStop', (event) => {
  console.log(`채널 ${event.channel} 중지됨`);
});

// error: 오디오 에러
audio.on('error', (event) => {
  console.error(`오디오 에러: ${event.error.message}`);
});
```

#### 리소스 정리

##### `dispose(): void`

오디오 리소스를 정리합니다.

```typescript
audio.dispose();
// AudioContext 정리 및 모든 채널 중지
```

#### MML 예제

```typescript
// 간단한 멜로디
await audio.playMMLOnChannel(0, 'T120 O4 CDEFGAB>C');

// 복잡한 곡
const melody = `
  T144 O4
  V15 W0 ML          // 볼륨 최대, 사인파, 레가토
  [CDEFG]2           // 스케일 2번 반복
  V10 MN             // 볼륨 낮추고 노말
  A4&A4 B2           // 타이와 다양한 음길이
  MS V5              // 스타카토, 작은 볼륨
  >CCCC<             // 옥타브 변경
`;
await audio.playMMLOnChannel(0, melody);

// 3채널 화음 진행
await audio.playMMLOnChannel(0, 'T120 O4 [CEG]4');  // 멜로디
await audio.playMMLOnChannel(1, 'T120 O3 [CCC]4');  // 베이스
await audio.playMMLOnChannel(2, 'T120 O4 [EEE]4');  // 화음
```

## 📺 I/O 시스템 API

### `Keyboard` 클래스

키보드 입력을 관리하는 EventEmitter 기반 클래스입니다.

#### 생성자

```typescript
constructor(config?: KeyboardConfig)
```

**매개변수:**
- `config?` - 키보드 설정 (선택적)

```typescript
interface KeyboardConfig {
  enableRepeat?: boolean;        // 키 반복 활성화 (기본: true)
  repeatDelay?: number;          // 반복 시작 지연 (ms, 기본: 500)
  repeatInterval?: number;       // 반복 간격 (ms, 기본: 50)
  captureSpecialKeys?: boolean;  // 특수 키 캡처 (기본: true)
}
```

**예제:**
```typescript
const keyboard = new Keyboard({
  enableRepeat: true,
  repeatDelay: 500,
  repeatInterval: 50,
  captureSpecialKeys: true
});
```

#### 활성화 메서드

##### `activate(): void`

키보드 입력을 활성화합니다.

```typescript
keyboard.activate();
console.log(keyboard.isKeyboardActive()); // true
```

##### `deactivate(): void`

키보드 입력을 비활성화합니다.

```typescript
keyboard.deactivate();
// 'deactivated' 이벤트 발생
```

##### `isKeyboardActive(): boolean`

현재 활성화 상태를 반환합니다.

```typescript
if (keyboard.isKeyboardActive()) {
  console.log('키보드 활성화됨');
}
```

#### 키 상태 추적

##### `isKeyPressed(code: string): boolean`

특정 키가 눌려있는지 확인합니다.

```typescript
if (keyboard.isKeyPressed('KeyA')) {
  console.log('A키가 눌려있음');
}

if (keyboard.isKeyPressed('Space')) {
  console.log('스페이스바가 눌려있음');
}
```

##### `getPressedKeys(): string[]`

현재 눌려있는 모든 키의 코드를 반환합니다.

```typescript
const pressedKeys = keyboard.getPressedKeys();
console.log('눌린 키들:', pressedKeys); // ['KeyA', 'ShiftLeft']
```

#### 이벤트

```typescript
export interface KeyEvent {
  key: string;        // 키 문자 (예: 'a', 'A', 'Enter')
  code: string;       // 키 코드 (예: 'KeyA', 'Enter')
  shiftKey: boolean;  // Shift 키 상태
  ctrlKey: boolean;   // Ctrl 키 상태
  altKey: boolean;    // Alt 키 상태
  metaKey: boolean;   // Meta(Command/Windows) 키 상태
  timestamp: number;  // 이벤트 발생 시각
  repeat?: boolean;   // 키 반복 여부
}
```

##### 이벤트 리스너 등록

```typescript
// keydown: 키를 누를 때
keyboard.on('keydown', (event: KeyEvent) => {
  console.log(`키 다운: ${event.key} (${event.code})`);
});

// keyup: 키를 뗄 때
keyboard.on('keyup', (event: KeyEvent) => {
  console.log(`키 업: ${event.key}`);
});

// keypress: 문자 키를 누를 때
keyboard.on('keypress', (event: KeyEvent) => {
  console.log(`문자 입력: ${event.key}`);
});

// keyrepeat: 키 반복이 발생할 때
keyboard.on('keyrepeat', (event: KeyEvent) => {
  console.log(`키 반복: ${event.key}`);
});

// deactivated: 키보드 비활성화 시
keyboard.on('deactivated', () => {
  console.log('키보드 비활성화됨');
});
```

#### 리소스 정리

##### `dispose(): void`

키보드 리소스를 정리합니다.

```typescript
keyboard.dispose();
// 모든 이벤트 리스너 제거 및 키 상태 초기화
```

#### 특수 키 지원

다음 특수 키들이 자동으로 캡처됩니다 (`captureSpecialKeys: true` 시):

- **기능 키**: F1-F12
- **화살표 키**: ArrowUp, ArrowDown, ArrowLeft, ArrowRight
- **편집 키**: Home, End, PageUp, PageDown, Insert, Delete
- **수정 키**: Shift, Control, Alt, Meta
- **기타**: Tab, Escape, Enter, Backspace, Space

### `Storage` 클래스

localStorage/메모리 기반 데이터 저장소를 관리하는 EventEmitter 기반 클래스입니다.

#### 생성자

```typescript
constructor(config?: StorageConfig)
```

**매개변수:**
- `config?` - 저장소 설정 (선택적)

```typescript
interface StorageConfig {
  prefix?: string;           // 키 접두사 (기본: 'basic_')
  useLocalStorage?: boolean; // localStorage 사용 여부 (기본: true)
  maxEntries?: number;       // 최대 항목 수 (기본: 1000)
}
```

**예제:**
```typescript
const storage = new Storage({
  prefix: 'myapp_',
  useLocalStorage: true,
  maxEntries: 500
});
```

#### CRUD 연산

##### `set<T>(key: string, value: T): boolean`

데이터를 저장합니다.

```typescript
// 문자열 저장
storage.set('username', 'Alice');

// 숫자 저장
storage.set('score', 9999);

// 객체 저장
storage.set('user', { name: 'Alice', age: 30 });

// 배열 저장
storage.set('scores', [100, 200, 300]);
```

**반환값:** `boolean` - 저장 성공 여부

##### `get<T>(key: string, defaultValue?: T): T | undefined`

데이터를 조회합니다.

```typescript
const username = storage.get('username');
console.log(username); // 'Alice'

// 기본값 제공
const level = storage.get('level', 1);
console.log(level); // 키가 없으면 1 반환
```

##### `has(key: string): boolean`

키의 존재 여부를 확인합니다.

```typescript
if (storage.has('username')) {
  console.log('사용자명이 저장되어 있음');
}
```

##### `remove(key: string): boolean`

데이터를 삭제합니다.

```typescript
const removed = storage.remove('username');
if (removed) {
  console.log('사용자명 삭제됨');
}
```

##### `clear(): boolean`

모든 데이터를 삭제합니다.

```typescript
storage.clear();
console.log(storage.keys().length); // 0
```

#### 키 관리

##### `keys(): string[]`

모든 키를 반환합니다 (prefix 제외).

```typescript
storage.set('key1', 'value1');
storage.set('key2', 'value2');

const keys = storage.keys();
console.log(keys); // ['key1', 'key2']
```

##### `search(pattern: string | RegExp): string[]`

패턴에 매칭되는 키를 검색합니다.

```typescript
storage.set('user_1', 'Alice');
storage.set('user_2', 'Bob');
storage.set('admin_1', 'Charlie');

// 와일드카드 검색
const userKeys = storage.search('user_*');
console.log(userKeys); // ['user_1', 'user_2']

// 정규식 검색
const allUsers = storage.search(/^user_/);
console.log(allUsers); // ['user_1', 'user_2']
```

#### 일괄 연산

##### `setMultiple(data: Record<string, any>): boolean`

여러 키-값 쌍을 한 번에 저장합니다.

```typescript
const success = storage.setMultiple({
  username: 'Alice',
  score: 9999,
  level: 10
});
```

##### `getMultiple<T = any>(keys: string[]): Record<string, T>`

여러 키의 값을 한 번에 조회합니다.

```typescript
const data = storage.getMultiple(['username', 'score', 'level']);
console.log(data);
// { username: 'Alice', score: 9999, level: 10 }
```

#### 통계

##### `getStats(): StorageStats`

저장소 통계 정보를 반환합니다.

```typescript
interface StorageStats {
  totalEntries: number;           // 총 항목 수
  totalSize: number;              // 총 크기 (bytes)
  isLocalStorageAvailable: boolean; // localStorage 사용 가능 여부
  prefix: string;                 // 현재 접두사
  maxEntries: number;             // 최대 항목 수
}

const stats = storage.getStats();
console.log(`저장된 항목: ${stats.totalEntries}`);
console.log(`사용 중인 용량: ${stats.totalSize} bytes`);
```

#### 이벤트

```typescript
// set 이벤트: 데이터 저장 시
storage.on('set', (event) => {
  console.log(`저장: ${event.key} = ${event.value}`);
});

// get 이벤트: 데이터 조회 시
storage.on('get', (event) => {
  console.log(`조회: ${event.key}`);
});

// remove 이벤트: 데이터 삭제 시
storage.on('remove', (event) => {
  console.log(`삭제: ${event.key}`);
});

// clear 이벤트: 전체 삭제 시
storage.on('clear', (event) => {
  console.log('전체 삭제됨');
});

// error 이벤트: 에러 발생 시
storage.on('error', (event) => {
  console.error(`에러: ${event.operation} - ${event.error.message}`);
});
```

#### 리소스 정리

##### `dispose(): void`

저장소 리소스를 정리합니다.

```typescript
storage.dispose();
// 모든 이벤트 리스너 제거
```

#### Prefix 격리

여러 Storage 인스턴스가 서로 다른 prefix를 사용하면 데이터가 격리됩니다:

```typescript
const storage1 = new Storage({ prefix: 'app1_' });
const storage2 = new Storage({ prefix: 'app2_' });

storage1.set('key', 'value1');
storage2.set('key', 'value2');

console.log(storage1.get('key')); // 'value1'
console.log(storage2.get('key')); // 'value2'
```

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

### `FileStorage` 클래스

BASIC 프로그램 파일 저장/로드 기능을 제공합니다.

#### 파일 작업

##### `save(filename: string, content: string): Promise<boolean>`

프로그램을 파일로 저장합니다.

```typescript
const fileStorage = new FileStorage();
const success = await fileStorage.save('HELLO.BAS', program);
if (success) {
  console.log('저장 완료');
}
```

##### `load(filename: string): Promise<string | null>`

파일에서 프로그램을 로드합니다.

```typescript
const content = await fileStorage.load('HELLO.BAS');
if (content) {
  interpreter.loadProgram(content.split('\n'));
}
```

##### `delete(filename: string): Promise<boolean>`

파일을 삭제합니다.

```typescript
const deleted = await fileStorage.delete('OLD.BAS');
```

##### `list(): Promise<FileInfo[]>`

저장된 파일 목록을 반환합니다.

```typescript
interface FileInfo {
  name: string;
  size: number;
  modified: Date;
}

const files = await fileStorage.list();
files.forEach(file => {
  console.log(`${file.name} (${file.size} bytes)`);
});
```

## 📱 모바일 최적화 API

### `VirtualKeyboard` 클래스

모바일 환경을 위한 가상 키보드를 제공합니다.

#### 생성자

```typescript
constructor(config?: VirtualKeyboardConfig)
```

**매개변수:**
- `config?` - 가상 키보드 설정

```typescript
interface VirtualKeyboardConfig {
  theme?: 'light' | 'dark';
  layout?: 'default' | 'basic' | 'numeric' | 'symbols';
  hapticFeedback?: boolean;
  soundFeedback?: boolean;
}
```

#### 키보드 제어

##### `show(): void`

가상 키보드를 표시합니다.

```typescript
keyboard.show();
```

##### `hide(): void`

가상 키보드를 숨깁니다.

```typescript
keyboard.hide();
```

##### `toggle(): void`

가상 키보드 표시 상태를 토글합니다.

```typescript
keyboard.toggle();
```

##### `isVisible(): boolean`

가상 키보드 표시 상태를 반환합니다.

```typescript
if (keyboard.isVisible()) {
  console.log('키보드가 표시되어 있습니다');
}
```

#### 레이아웃 관리

##### `setLayout(layout: KeyboardLayout): void`

키보드 레이아웃을 변경합니다.

```typescript
keyboard.setLayout('basic');   // BASIC 명령어 최적화
keyboard.setLayout('numeric'); // 숫자 입력
keyboard.setLayout('symbols'); // 특수 문자
keyboard.setLayout('default'); // 기본 QWERTY
```

**레이아웃 타입:**
- `default`: QWERTY 레이아웃
- `basic`: BASIC 키워드 (PRINT, FOR, IF 등)
- `numeric`: 숫자 패드 (0-9, +, -, *, /)
- `symbols`: 특수 문자 (괄호, 따옴표 등)

##### `getLayout(): KeyboardLayout`

현재 레이아웃을 반환합니다.

```typescript
const currentLayout = keyboard.getLayout();
```

#### 커스텀 키 추가

##### `addCustomKey(key: CustomKey): void`

사용자 정의 키를 추가합니다.

```typescript
interface CustomKey {
  key: string;           // 키 값
  label: string;         // 표시 텍스트
  position?: { row: number, col: number };
  width?: number;        // 1-4 (키 너비)
  action?: () => void;   // 커스텀 액션
}

keyboard.addCustomKey({
  key: 'PRINT',
  label: 'PRINT',
  position: { row: 0, col: 0 },
  width: 2
});
```

##### `removeCustomKey(key: string): void`

사용자 정의 키를 제거합니다.

```typescript
keyboard.removeCustomKey('PRINT');
```

#### 이벤트

```typescript
// keyPress: 키 입력
keyboard.onKeyPress((key) => {
  console.log(`입력: ${key}`);
});

// layoutChange: 레이아웃 변경
keyboard.on('layoutChange', (layout) => {
  console.log(`레이아웃: ${layout}`);
});

// show/hide: 표시 상태 변경
keyboard.on('show', () => console.log('키보드 표시'));
keyboard.on('hide', () => console.log('키보드 숨김'));
```

### `MobilePerformanceMonitor` 클래스

모바일 환경의 성능을 모니터링합니다.

#### 성능 모니터링

##### `startMonitoring(): void`

성능 모니터링을 시작합니다.

```typescript
const monitor = new MobilePerformanceMonitor();
monitor.startMonitoring();
```

##### `stopMonitoring(): void`

성능 모니터링을 중지합니다.

```typescript
monitor.stopMonitoring();
```

##### `getMetrics(): PerformanceMetrics`

현재 성능 메트릭을 반환합니다.

```typescript
interface PerformanceMetrics {
  fps: number;              // 초당 프레임 수
  memory: number;           // 메모리 사용량 (MB)
  battery: number;          // 배터리 레벨 (0-1)
  network: string;          // 네트워크 타입
  touchLatency: number;     // 터치 지연 (ms)
  renderTime: number;       // 렌더링 시간 (ms)
}

const metrics = monitor.getMetrics();
console.log(`FPS: ${metrics.fps}`);
console.log(`메모리: ${metrics.memory}MB`);
console.log(`배터리: ${metrics.battery * 100}%`);
```

#### 경고 및 알림

##### `onWarning(callback: (warning: PerformanceWarning) => void): void`

성능 경고 발생 시 콜백을 호출합니다.

```typescript
monitor.onWarning((warning) => {
  console.warn(`성능 경고: ${warning.type}`);
  console.warn(`메시지: ${warning.message}`);
  console.warn(`제안: ${warning.suggestion}`);
});

interface PerformanceWarning {
  type: 'fps' | 'memory' | 'battery' | 'network';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}
```

##### 경고 임계값

```typescript
// FPS < 30: 프레임 드롭 경고
// 메모리 > 100MB: 메모리 과다 사용 경고
// 배터리 < 20%: 배터리 절약 모드 권장
// 네트워크 = slow-2g: 오프라인 모드 권장
```

### `ResponsiveLayout` 클래스

반응형 레이아웃을 관리합니다.

#### 레이아웃 감지

##### `getDeviceType(): DeviceType`

현재 디바이스 타입을 반환합니다.

```typescript
type DeviceType = 'mobile' | 'tablet' | 'desktop';

const layout = new ResponsiveLayout();
const deviceType = layout.getDeviceType();

if (deviceType === 'mobile') {
  // 모바일 최적화 UI
} else if (deviceType === 'tablet') {
  // 태블릿 최적화 UI
} else {
  // 데스크톱 UI
}
```

##### `getOrientation(): Orientation`

화면 방향을 반환합니다.

```typescript
type Orientation = 'portrait' | 'landscape';

const orientation = layout.getOrientation();
if (orientation === 'landscape') {
  // 가로 모드 레이아웃
}
```

#### 이벤트

```typescript
// orientationChange: 화면 방향 변경
layout.on('orientationChange', (orientation) => {
  console.log(`방향: ${orientation}`);
  adjustLayout(orientation);
});

// resize: 화면 크기 변경
layout.on('resize', ({ width, height }) => {
  console.log(`크기: ${width}x${height}`);
});
```

### `GestureHandler` 클래스

터치 제스처를 처리합니다.

#### 제스처 인식

```typescript
const gestures = new GestureHandler();

// 탭
gestures.on('tap', (event) => {
  console.log(`탭: ${event.x}, ${event.y}`);
});

// 더블 탭
gestures.on('doubletap', (event) => {
  console.log('더블 탭');
});

// 스와이프
gestures.on('swipe', (event) => {
  console.log(`스와이프: ${event.direction}`); // left, right, up, down
});

// 핀치 (확대/축소)
gestures.on('pinch', (event) => {
  console.log(`핀치: ${event.scale}`);
});

// 롱 프레스
gestures.on('longpress', (event) => {
  console.log('롱 프레스');
});
```

## 🎨 UI 컴포넌트 API

### `ThemeManager` 클래스

에디터 테마를 관리합니다.

#### 테마 제어

##### `setTheme(name: string): void`

테마를 설정합니다.

```typescript
const themeManager = new ThemeManager();

themeManager.setTheme('dark');   // 다크 테마
themeManager.setTheme('light');  // 라이트 테마
themeManager.setTheme('custom'); // 커스텀 테마
```

##### `getCurrentTheme(): Theme`

현재 테마를 반환합니다.

```typescript
interface Theme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    comment: string;
    keyword: string;
    string: string;
    number: string;
    operator: string;
    function: string;
    variable: string;
    error: string;
  };
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

const theme = themeManager.getCurrentTheme();
console.log(`테마: ${theme.name}`);
```

##### `getAvailableThemes(): string[]`

사용 가능한 테마 목록을 반환합니다.

```typescript
const themes = themeManager.getAvailableThemes();
console.log(themes); // ['dark', 'light', 'monokai', 'solarized']
```

##### `createCustomTheme(config: Partial<Theme>): Theme`

커스텀 테마를 생성합니다.

```typescript
const customTheme = themeManager.createCustomTheme({
  name: 'myTheme',
  colors: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    keyword: '#569cd6',
    string: '#ce9178',
    // ... 나머지 색상
  }
});

themeManager.setTheme('myTheme');
```

### `SyntaxHighlighter` 클래스

BASIC 코드 문법 하이라이팅을 제공합니다.

#### 하이라이팅

##### `highlightLine(code: string): Token[]`

한 줄의 코드를 토큰화합니다.

```typescript
interface Token {
  type: 'keyword' | 'string' | 'number' | 'operator' | 'comment' | 'identifier';
  value: string;
  start: number;
  end: number;
}

const highlighter = new SyntaxHighlighter();
const tokens = highlighter.highlightLine('10 PRINT "HELLO"');

tokens.forEach(token => {
  console.log(`${token.type}: ${token.value}`);
});
```

##### `highlightCode(code: string): Token[][]`

여러 줄의 코드를 토큰화합니다.

```typescript
const code = `
10 PRINT "HELLO"
20 FOR I = 1 TO 10
30 PRINT I
40 NEXT I
`;

const lines = highlighter.highlightCode(code);
lines.forEach((tokens, lineNumber) => {
  console.log(`Line ${lineNumber}:`, tokens);
});
```

##### `toHTML(tokens: Token[], theme: Theme): string`

토큰을 HTML로 변환합니다.

```typescript
const tokens = highlighter.highlightLine('10 PRINT "HELLO"');
const html = highlighter.toHTML(tokens, theme);
console.log(html);
// <span class="line-number">10</span>
// <span class="keyword">PRINT</span>
// <span class="string">"HELLO"</span>
```

#### 설정

```typescript
// 키워드 추가
highlighter.addKeyword('CUSTOM');

// 함수 추가
highlighter.addFunction('MYFUNC');

// 색상 테마 적용
highlighter.setTheme(theme);
```

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

## 🚨 에러 처리 API

### `EmulatorError` 클래스

에뮬레이터 관련 오류의 기본 클래스입니다.

```typescript
class EmulatorError extends Error {
  readonly code: string;
  readonly context?: Record<string, any>;
  
  constructor(message: string, code: string, context?: Record<string, any>);
}

// 사용 예제
try {
  cpu.execute(1000);
} catch (error) {
  if (error instanceof EmulatorError) {
    console.error(`에러 코드: ${error.code}`);
    console.error(`컨텍스트:`, error.context);
  }
}
```

### 에러 타입별 클래스

#### `CPUError`
```typescript
class CPUError extends EmulatorError {
  readonly instruction?: number;
  readonly address?: number;
}

// 예시: 알 수 없는 오피코드
throw new CPUError(
  'Unknown opcode: 0xFF',
  'UNKNOWN_OPCODE',
  { opcode: 0xFF, address: 0x1000 }
);
```

#### `BasicError`
```typescript
class BasicError extends EmulatorError {
  readonly lineNumber?: number;
  readonly position?: number;
}

// 예시: 구문 오류
throw new BasicError(
  'Syntax Error: Expected expression',
  'SYNTAX_ERROR',
  { lineNumber: 10, position: 15 }
);
```

#### `MemoryError`
```typescript
class MemoryError extends EmulatorError {
  readonly address?: number;
  readonly operation?: 'read' | 'write' | 'allocate' | 'free';
}

// 예시: 메모리 부족
throw new MemoryError(
  'Out of memory',
  'OUT_OF_MEMORY',
  { address: 0x8000, operation: 'allocate' }
);
```

### 에러 처리 패턴

#### 글로벌 에러 핸들러
```typescript
emulator.on('error', (error: EmulatorError) => {
  console.error('에뮬레이터 에러:', error.message);
  
  switch (error.code) {
    case 'SYNTAX_ERROR':
      highlightSyntaxError(error as BasicError);
      break;
    case 'OUT_OF_MEMORY':
      showMemoryWarning();
      break;
    case 'UNKNOWN_OPCODE':
      debugCPUState(error as CPUError);
      break;
  }
});
```

#### Try-Catch 패턴
```typescript
async function safeExecute(program: string[]) {
  try {
    await emulator.loadProgram(program);
    const result = await emulator.run();
    return { success: true, result };
  } catch (error) {
    if (error instanceof BasicError) {
      return { 
        success: false, 
        error: {
          type: 'basic',
          message: error.message,
          line: error.lineNumber
        }
      };
    }
    throw error; // Re-throw unexpected errors
  }
}
```

## 🔌 확장 API

### `Plugin` 인터페이스

에뮬레이터에 사용자 정의 기능을 추가할 수 있습니다.

```typescript
interface Plugin {
  readonly name: string;
  readonly version: string;
  
  initialize(emulator: BasicEmulator): void | Promise<void>;
  destroy?(): void | Promise<void>;
}

// 플러그인 예제
class SoundPlugin implements Plugin {
  readonly name = 'sound';
  readonly version = '1.0.0';
  
  async initialize(emulator: BasicEmulator) {
    // BASIC 인터프리터에 사운드 함수 추가
    emulator.getInterpreter().addFunction('BEEP', this.beep);
    emulator.getInterpreter().addFunction('PLAY', this.play);
  }
  
  private beep(frequency: number, duration: number) {
    // Web Audio API를 사용한 비프음 구현
  }
  
  private play(notes: string) {
    // 간단한 음악 재생 구현
  }
}

// 플러그인 로드
const soundPlugin = new SoundPlugin();
emulator.loadPlugin(soundPlugin);
```

### 커스텀 BASIC 명령어

```typescript
// 새로운 BASIC 명령어 추가
emulator.getInterpreter().addStatement('DELAY', (args: BasicValue[]) => {
  const milliseconds = Number(args[0]);
  return new Promise(resolve => setTimeout(resolve, milliseconds));
});

// 사용 예제 (BASIC 코드에서)
// 10 PRINT "시작"
// 20 DELAY 1000
// 30 PRINT "1초 후"
```

### 메모리 매핑 I/O

```typescript
// 특정 메모리 주소에 I/O 핸들러 등록
emulator.getMemory().mapIOHandler(0xD000, 0xD003, {
  read: (address: number) => {
    // 가상 I/O 디바이스에서 읽기
    switch (address) {
      case 0xD000: return getKeyboardStatus();
      case 0xD001: return getKeyboardData();
      case 0xD002: return getTimerLow();
      case 0xD003: return getTimerHigh();
    }
  },
  
  write: (address: number, value: number) => {
    // 가상 I/O 디바이스에 쓰기
    switch (address) {
      case 0xD000: setDisplayMode(value); break;
      case 0xD001: setDisplayData(value); break;
      case 0xD002: setSoundFrequency(value); break;
      case 0xD003: setSoundVolume(value); break;
    }
  }
});
```

### 디버거 확장

```typescript
// 커스텀 디버거 명령어 추가
emulator.getDebugger().addCommand('trace', (args: string[]) => {
  const count = args[0] ? parseInt(args[0]) : 10;
  return emulator.getCPU().trace(count);
});

// 브레이크포인트 조건 설정
emulator.getDebugger().setBreakpoint(0x1000, {
  condition: (cpu: CPU6502) => cpu.registers.A === 0xFF,
  action: 'break', // 'break' | 'log' | 'continue'
  message: '누산기가 0xFF에 도달함'
});
```

## 📈 고급 사용 패턴

### 멀티 인스턴스 관리

```typescript
class EmulatorManager {
  private emulators = new Map<string, BasicEmulator>();
  
  async createEmulator(id: string, options?: EmulatorOptions): Promise<BasicEmulator> {
    const emulator = new BasicEmulator(options);
    await emulator.initialize();
    this.emulators.set(id, emulator);
    return emulator;
  }
  
  getEmulator(id: string): BasicEmulator | undefined {
    return this.emulators.get(id);
  }
  
  async destroyEmulator(id: string): Promise<void> {
    const emulator = this.emulators.get(id);
    if (emulator) {
      await emulator.destroy();
      this.emulators.delete(id);
    }
  }
  
  async destroyAll(): Promise<void> {
    const promises = Array.from(this.emulators.values()).map(e => e.destroy());
    await Promise.all(promises);
    this.emulators.clear();
  }
}
```

### 스냅샷 및 복원

```typescript
// 에뮬레이터 상태 스냅샷 생성
const snapshot = await emulator.createSnapshot();

// 나중에 상태 복원
await emulator.restoreSnapshot(snapshot);

// 스냅샷을 파일로 저장/로드
const snapshotData = snapshot.serialize();
await storage.save('save1.snapshot', snapshotData);

const loadedData = await storage.load('save1.snapshot');
const restoredSnapshot = BasicSnapshot.deserialize(loadedData);
await emulator.restoreSnapshot(restoredSnapshot);
```

### 성능 프로파일링

```typescript
// 성능 프로파일러 설정
const profiler = emulator.getProfiler();

profiler.startProfiling({
  sampleInterval: 10,      // 10ms마다 샘플링
  maxSamples: 10000,       // 최대 샘플 수
  includeCallStack: true   // 호출 스택 포함
});

// 프로그램 실행
await emulator.run();

// 프로파일링 결과 분석
const report = profiler.getReport();
console.log('가장 느린 함수:', report.slowestFunctions);
console.log('메모리 사용 패턴:', report.memoryUsage);
console.log('CPU 핫스팟:', report.cpuHotspots);
```

### 실시간 데이터 스트리밍

```typescript
// 실시간 CPU 상태 스트리밍
const cpuStream = emulator.getCPU().createStateStream();
cpuStream.subscribe(state => {
  updateCPUVisualization(state);
});

// 메모리 변경 사항 모니터링
const memoryStream = emulator.getMemory().createChangeStream();
memoryStream.subscribe(change => {
  updateMemoryView(change.address, change.newValue, change.oldValue);
});

// BASIC 실행 추적
const executionStream = emulator.getInterpreter().createExecutionStream();
executionStream.subscribe(execution => {
  highlightCurrentLine(execution.lineNumber);
  updateVariableView(execution.variables);
});
```

## 🧪 테스트 유틸리티

### 단위 테스트 헬퍼

```typescript
import { createTestEmulator, expectCPUState, expectMemoryValue } from '@6502basic/test-utils';

describe('6502 CPU Tests', () => {
  let emulator: BasicEmulator;
  
  beforeEach(async () => {
    emulator = await createTestEmulator({
      enableDebug: true,
      fastMode: true // 테스트에서 빠른 실행
    });
  });
  
  test('LDA immediate instruction', async () => {
    // LDA #$42 명령어 테스트
    await emulator.getCPU().loadInstruction(0xA9, 0x42);
    await emulator.getCPU().step();
    
    expectCPUState(emulator.getCPU(), {
      A: 0x42,
      flags: { zero: false, negative: false }
    });
  });
  
  test('BASIC program execution', async () => {
    const program = [
      '10 A = 42',
      '20 PRINT A'
    ];
    
    const result = await emulator.runProgram(program);
    expect(result.output).toBe('42\n');
    expect(result.success).toBe(true);
  });
});
```

### 통합 테스트

```typescript
import { EmulatorTestSuite } from '@6502basic/integration-tests';

// 표준 호환성 테스트 실행
const testSuite = new EmulatorTestSuite(emulator);
const results = await testSuite.runAllTests();

console.log(`통과: ${results.passed}/${results.total} 테스트`);
results.failures.forEach(failure => {
  console.error(`실패: ${failure.name} - ${failure.reason}`);
});
```

---

## 📚 추가 자료

### API 레퍼런스
- 🔗 [전체 TypeScript 타입 정의](types/index.d.ts)
- 📖 [TSDoc 생성 문서](https://api-docs.6502basic.dev)
- 🏷️ [버전별 변경사항](CHANGELOG.md)

### 예제 및 튜토리얼
- 💻 [CodePen 예제 모음](https://codepen.io/collection/6502basic)
- 📚 [단계별 튜토리얼](./tutorials/)
- 🎮 [게임 개발 가이드](./game-development.md)

### 도구 및 확장
- 🛠️ [VS Code 확장](https://marketplace.visualstudio.com/items?itemName=6502basic.syntax)
- 🖥️ [CLI 도구](https://www.npmjs.com/package/@6502basic/cli)
- 📊 [성능 분석 도구](https://www.npmjs.com/package/@6502basic/profiler)

---

## 📄 라이선스

이 API는 [MIT 라이선스](../LICENSE) 하에 제공됩니다.

**버전 호환성**:
- v1.x: 안정적인 공개 API
- v2.x: 주요 변경사항 (마이그레이션 가이드 제공)
- v3.x: 미래 계획 중

---

**🚀 Happy Coding with 6502 BASIC!**

이 API 문서를 참조하여 6502 BASIC JavaScript 에뮬레이터의 모든 기능을 효과적으로 활용할 수 있습니다. 각 클래스와 메서드는 완전한 TypeScript 타입 지원을 제공하여 개발 시 IntelliSense와 타입 안전성을 보장합니다.