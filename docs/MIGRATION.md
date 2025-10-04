# Migration Guide: v1.x to v2.0

> 6502 BASIC 에뮬레이터 v1.x에서 v2.0으로의 마이그레이션 가이드

[![Version](https://img.shields.io/badge/from-v1.x-orange.svg)](#) [![Version](https://img.shields.io/badge/to-v2.0-blue.svg)](#)

## 목차

1. [개요](#개요)
2. [주요 변경사항](#주요-변경사항)
3. [API 변경사항](#api-변경사항)
4. [새로운 기능](#새로운-기능)
5. [호환성 주의사항](#호환성-주의사항)
6. [단계별 마이그레이션](#단계별-마이그레이션)
7. [문제 해결](#문제-해결)

---

## 개요

### v2.0의 주요 목표

- 다중 채널 오디오 지원
- 모바일 환경 완전 지원
- 그래픽 엔진 성능 향상
- 에디터 기능 강화
- 종합적인 테스트 시스템

### 마이그레이션 난이도

- 기본 사용: ⭐ 쉬움 (하위 호환 유지)
- 고급 기능: ⭐⭐ 보통 (일부 API 변경)
- 커스텀 확장: ⭐⭐⭐ 어려움 (내부 구조 변경)

### 예상 소요 시간

- 간단한 애플리케이션: 30분 - 1시간
- 중간 복잡도: 2-4시간
- 복잡한 커스텀화: 1-2일

---

## 주요 변경사항

### 1. 새로운 기능

#### 오디오 시스템 (신규)

```typescript
// v1.x: 오디오 미지원

// v2.0: 다중 채널 오디오
import { AudioEngine } from '@6502basic/emulator';

const audio = new AudioEngine();
await audio.playMMLOnChannel(0, 'T120 O4 CDEFGAB');
```

#### 모바일 지원 (신규)

```typescript
// v1.x: 모바일 최적화 부족

// v2.0: 가상 키보드 및 성능 모니터링
import { VirtualKeyboard, MobilePerformanceMonitor } from '@6502basic/emulator';

const keyboard = new VirtualKeyboard();
keyboard.show();
keyboard.setLayout('basic');

const monitor = new MobilePerformanceMonitor();
monitor.startMonitoring();
```

#### 에디터 강화 (신규)

```typescript
// v1.x: 기본 에디터만 제공

// v2.0: 테마 및 하이라이팅
import { ThemeManager, SyntaxHighlighter } from '@6502basic/emulator';

const themeManager = new ThemeManager();
themeManager.setTheme('dark');

const highlighter = new SyntaxHighlighter();
const tokens = highlighter.highlightLine('10 PRINT "HELLO"');
```

### 2. 개선된 기능

#### 그래픽 엔진

```typescript
// v1.x: 기본 그래픽 지원
emulator.executeCommand('SCREEN 1');
emulator.executeCommand('PSET (100, 100), 15');

// v2.0: 동일한 API (성능 2배 향상)
emulator.executeCommand('SCREEN 1');
emulator.executeCommand('PSET (100, 100), 15');
// 60 FPS 안정화, DirtyRect 최적화
```

#### 테스트 시스템

```bash
# v1.x: 기본 테스트만
bun test  # ~600 테스트

# v2.0: 종합적인 테스트
bun test  # 1,400+ 테스트, 90%+ 커버리지
bun test tests/audio/     # 오디오 테스트
bun test tests/mobile/    # 모바일 테스트
```

---

## API 변경사항

### 하위 호환성 유지

다음 API는 v1.x와 완전히 호환됩니다:

```typescript
// CPU API
const cpu = new CPU6502(memory);
cpu.reset();
cpu.step();
cpu.execute(1000);

// BASIC 인터프리터 API
const interpreter = new BasicInterpreter(cpu);
interpreter.loadProgram(lines);
await interpreter.run();

// 메모리 API
const memory = new MemoryManager();
memory.read(address);
memory.write(address, value);

// 터미널 API
terminal.write(text);
terminal.writeLine(text);
await terminal.readLine();
```

### 새로운 API

#### 오디오 API

```typescript
interface AudioEngine {
  // 다중 채널 재생
  playMMLOnChannel(channel: number, mml: string): Promise<void>;
  stopChannel(channel: number): void;
  stopAllChannels(): void;
  getChannelStatus(channel: number): ChannelStatus;

  // 화음 재생
  playChord(notes: string[], duration: number): Promise<void>;

  // 오디오 이펙트
  fadeIn(duration: number): void;
  fadeOut(duration: number): void;
  setMasterVolume(volume: number): void;
  setADSR(attack: number, decay: number, sustain: number, release: number): void;
}
```

#### 모바일 API

```typescript
interface VirtualKeyboard {
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;
  setLayout(layout: KeyboardLayout): void;
  getLayout(): KeyboardLayout;
  addCustomKey(key: CustomKey): void;
  removeCustomKey(key: string): void;
  onKeyPress(callback: (key: string) => void): void;
}

interface MobilePerformanceMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  getMetrics(): PerformanceMetrics;
  onWarning(callback: (warning: PerformanceWarning) => void): void;
}

interface ResponsiveLayout {
  getDeviceType(): DeviceType;
  getOrientation(): Orientation;
  on(event: 'orientationChange' | 'resize', callback: Function): void;
}

interface GestureHandler {
  on(event: GestureType, callback: (event: GestureEvent) => void): void;
}
```

#### 에디터 API

```typescript
interface ThemeManager {
  setTheme(name: string): void;
  getCurrentTheme(): Theme;
  getAvailableThemes(): string[];
  createCustomTheme(config: Partial<Theme>): Theme;
}

interface SyntaxHighlighter {
  highlightLine(code: string): Token[];
  highlightCode(code: string): Token[][];
  toHTML(tokens: Token[], theme: Theme): string;
  addKeyword(keyword: string): void;
  addFunction(func: string): void;
}
```

### 변경된 API

#### 없음 (완전한 하위 호환성)

v1.x의 모든 API가 v2.0에서 그대로 동작합니다.

---

## 새로운 기능

### 1. 오디오 시스템

#### BASIC 명령어

```basic
# 간단한 재생
PLAY "T120 O4 CDEFGAB"

# 다중 채널
PLAYCH 0, "T120 O4 [CEG]4"    # 화음
PLAYCH 1, "T120 O2 C4C4C4C4"  # 베이스

# 고급 MML
PLAY "V15 W0 ML CDEFG"        # 볼륨, 파형, 아티큘레이션
PLAY "[CDEFG]4"               # 반복
PLAY "C4&C4"                  # 타이

# 채널 제어
STOPCH 0                      # 채널 중지
STOPALL                       # 전체 중지

# 이펙트
FADEIN 1000
FADEOUT 2000
VOLUME 0.5
```

#### JavaScript API

```typescript
const audio = new AudioEngine({
  sampleRate: 44100,
  channels: 3,
  masterVolume: 0.8
});

// 채널 재생
await audio.playMMLOnChannel(0, 'CDEFGAB');
await audio.playMMLOnChannel(1, 'O2 CCC');
await audio.playMMLOnChannel(2, 'O4 EEE');

// 화음
await audio.playChord(['C4', 'E4', 'G4'], 1000);

// 이펙트
audio.fadeIn(1000);
audio.setADSR(0.1, 0.2, 0.7, 0.5);
```

### 2. 모바일 지원

#### 가상 키보드

```typescript
const keyboard = new VirtualKeyboard({
  layout: 'basic',
  hapticFeedback: true,
  soundFeedback: true
});

keyboard.show();
keyboard.setLayout('numeric');

keyboard.addCustomKey({
  key: 'PRINT',
  label: 'PRINT',
  width: 2
});

keyboard.onKeyPress((key) => {
  console.log('Key pressed:', key);
});
```

#### 성능 모니터링

```typescript
const monitor = new MobilePerformanceMonitor();
monitor.startMonitoring();

const metrics = monitor.getMetrics();
console.log(`FPS: ${metrics.fps}`);
console.log(`메모리: ${metrics.memory}MB`);
console.log(`배터리: ${metrics.battery * 100}%`);

monitor.onWarning((warning) => {
  if (warning.type === 'battery' && warning.severity === 'high') {
    // 배터리 절약 모드 활성화
  }
});
```

#### 반응형 레이아웃

```typescript
const layout = new ResponsiveLayout();

const deviceType = layout.getDeviceType(); // 'mobile' | 'tablet' | 'desktop'
const orientation = layout.getOrientation(); // 'portrait' | 'landscape'

layout.on('orientationChange', (newOrientation) => {
  adjustLayout(newOrientation);
});
```

### 3. 에디터 강화

#### 테마 관리

```typescript
const themeManager = new ThemeManager();

// 테마 설정
themeManager.setTheme('dark');   // VS Code Dark+
themeManager.setTheme('light');  // VS Code Light
themeManager.setTheme('monokai');
themeManager.setTheme('solarized');

// 커스텀 테마 생성
const customTheme = themeManager.createCustomTheme({
  name: 'myTheme',
  colors: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    keyword: '#569cd6',
    string: '#ce9178'
  }
});
```

#### 문법 하이라이팅

```typescript
const highlighter = new SyntaxHighlighter();

// 한 줄 하이라이팅
const tokens = highlighter.highlightLine('10 PRINT "HELLO"');
tokens.forEach(token => {
  console.log(`${token.type}: ${token.value}`);
});

// 여러 줄 하이라이팅
const program = `
10 PRINT "HELLO"
20 FOR I = 1 TO 10
30 PRINT I
40 NEXT I
`;
const lines = highlighter.highlightCode(program);

// HTML 변환
const html = highlighter.toHTML(tokens, theme);
```

---

## 호환성 주의사항

### 1. 의존성 업데이트

#### package.json

```json
{
  "dependencies": {
    "@6502basic/emulator": "^2.0.0"
  }
}
```

```bash
# NPM
npm install @6502basic/emulator@2.0.0

# Bun
bun add @6502basic/emulator@2.0.0
```

### 2. TypeScript 설정

v2.0은 TypeScript 5.0+를 권장합니다:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true
  }
}
```

### 3. 빌드 설정

#### 변경 없음

v1.x의 빌드 설정이 그대로 사용됩니다:

```bash
# 개발
bun run dev

# 빌드
bun run build:web

# 테스트
bun test
```

### 4. 브라우저 지원

#### 최소 요구사항

| 브라우저 | v1.x | v2.0 |
|---------|------|------|
| Chrome | 80+ | 90+ |
| Safari | 13+ | 14+ |
| Firefox | 75+ | 88+ |
| Edge | 80+ | 90+ |

**이유**: Web Audio API, Touch Events API 사용

### 5. 이벤트 시스템

#### 새로운 이벤트

```typescript
// v2.0 추가 이벤트
audio.on('noteStart', handler);
audio.on('noteEnd', handler);
audio.on('channelStop', handler);

keyboard.on('layoutChange', handler);
keyboard.on('show', handler);
keyboard.on('hide', handler);

monitor.on('warning', handler);

gestures.on('swipe', handler);
gestures.on('pinch', handler);
gestures.on('longpress', handler);
```

---

## 단계별 마이그레이션

### Step 1: 의존성 업데이트

```bash
# 기존 패키지 제거
npm uninstall @6502basic/emulator

# 새 버전 설치
npm install @6502basic/emulator@2.0.0

# 또는 Bun
bun add @6502basic/emulator@2.0.0
```

### Step 2: 코드 검토

v1.x 코드는 대부분 그대로 동작하므로 변경 불필요:

```typescript
// v1.x 코드 (v2.0에서도 동작)
const emulator = new BasicEmulator();
await emulator.initialize();

const program = [
  '10 PRINT "HELLO"',
  '20 END'
];

await emulator.loadProgram(program);
const result = await emulator.run();
```

### Step 3: 새로운 기능 추가 (선택)

#### 오디오 추가

```typescript
// 오디오 엔진 초기화
const audio = emulator.getAudioEngine();

// BASIC에서 오디오 사용
const program = [
  '10 PLAY "T120 O4 CDEFGAB"',
  '20 PLAYCH 0, "CEG"',
  '30 PLAYCH 1, "CCC"',
  '40 END'
];
```

#### 모바일 지원 추가

```typescript
// 가상 키보드 활성화
const keyboard = emulator.getVirtualKeyboard();
keyboard.show();
keyboard.setLayout('basic');

// 성능 모니터링
const monitor = emulator.getPerformanceMonitor();
monitor.startMonitoring();
monitor.onWarning((warning) => {
  console.warn('Performance warning:', warning);
});
```

#### 에디터 테마 추가

```typescript
// 테마 설정
const themeManager = emulator.getThemeManager();
themeManager.setTheme('dark');

// 하이라이팅 활성화
const highlighter = emulator.getSyntaxHighlighter();
const tokens = highlighter.highlightLine(code);
```

### Step 4: 테스트

```bash
# 기존 테스트 실행
bun test

# 새로운 기능 테스트
bun test tests/audio/
bun test tests/mobile/
```

### Step 5: 프로덕션 배포

```bash
# 프로덕션 빌드
bun run build:web

# 번들 크기 확인
ls -lh dist/bundle.js

# 배포
npm run deploy
```

---

## 문제 해결

### 일반적인 문제

#### 1. AudioContext 에러

**문제**:
```
Error: AudioContext is not supported
```

**해결**:
```typescript
// 브라우저 지원 확인
if ('AudioContext' in window || 'webkitAudioContext' in window) {
  const audio = new AudioEngine();
} else {
  console.warn('Audio not supported');
}
```

#### 2. 가상 키보드 미표시

**문제**: 모바일에서 가상 키보드가 표시되지 않음

**해결**:
```typescript
// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  const keyboard = new VirtualKeyboard();
  keyboard.show();
});
```

#### 3. 테마 적용 안됨

**문제**: 커스텀 테마가 적용되지 않음

**해결**:
```typescript
// 테마 생성 후 적용 필요
const customTheme = themeManager.createCustomTheme(config);
themeManager.setTheme(customTheme.name); // 이름으로 적용
```

#### 4. 성능 경고

**문제**: 모바일에서 성능 경고 빈번

**해결**:
```typescript
// 성능 최적화 모드
const emulator = new BasicEmulator({
  performanceMode: 'mobile',
  enableOptimizations: true
});

// 렌더링 최적화
emulator.getGraphics().setOptimizationLevel('high');
```

### 디버깅 팁

#### 1. 로깅 활성화

```typescript
const emulator = new BasicEmulator({
  debug: true,
  logLevel: 'verbose'
});
```

#### 2. 성능 프로파일링

```typescript
const profiler = emulator.getProfiler();
profiler.start();

// 코드 실행...

const report = profiler.getReport();
console.log('성능 리포트:', report);
```

#### 3. 메모리 누수 확인

```typescript
// 리소스 정리
emulator.dispose();
audio.dispose();
keyboard.dispose();
monitor.dispose();
```

---

## 추가 자료

### 문서
- [Release Notes](../RELEASE_NOTES.md) - 전체 변경사항
- [API 문서](./API문서.md) - 신규 API 레퍼런스
- [테스트 가이드](./테스트가이드.md) - 테스트 작성 방법
- [개발자 가이드](./개발자가이드.md) - 개발 가이드

### 예제
- [오디오 예제](../examples/audio/) - 오디오 시스템 사용 예제
- [모바일 예제](../examples/mobile/) - 모바일 기능 예제
- [에디터 예제](../examples/editor/) - 에디터 기능 예제

### 지원
- [GitHub Issues](https://github.com/your-username/jsbasic/issues)
- [Discord Community](https://discord.gg/6502basic)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/6502basic)

---

## 체크리스트

마이그레이션 완료 확인:

- [ ] 의존성 업데이트 완료
- [ ] 기존 코드 정상 동작 확인
- [ ] 새로운 기능 테스트 (선택)
  - [ ] 오디오 시스템
  - [ ] 모바일 지원
  - [ ] 에디터 기능
- [ ] 테스트 통과 확인
- [ ] 프로덕션 빌드 검증
- [ ] 배포 완료

---

**Version**: 2.0.0
**Last Updated**: 2025-10-04
**Migration Support**: support@6502basic.dev

도움이 필요하시면 언제든지 문의해 주세요!

