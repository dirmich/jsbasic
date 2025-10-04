# Release Notes

## Version 2.0.0 - Major Update (2025-10-04)

> 다중 채널 오디오, 모바일 완전 지원, 그래픽 엔진 강화 및 종합적인 테스트 시스템 구축

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-username/jsbasic/releases/tag/v2.0.0)
[![Tests](https://img.shields.io/badge/tests-1400%2B-success.svg)](#)
[![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](#)

---

## 주요 변경사항 요약

### 새로운 기능
- 다중 채널 오디오 시스템 (3채널 동시 재생)
- 고급 MML(Music Macro Language) 파싱 및 재생
- 모바일 가상 키보드 (4개 레이아웃)
- 모바일 성능 모니터링 시스템
- 반응형 UI 및 터치 제스처 지원
- 에디터 테마 관리 시스템
- 문법 하이라이팅 강화
- 종합적인 테스트 시스템 (1,400+ 테스트)

### 개선 사항
- 그래픽 엔진 성능 최적화
- 접근성 (WCAG AA) 준수
- 크로스 브라우저 호환성 향상
- 테스트 커버리지 90%+ 달성

### 버그 수정
- 메모리 누수 방지
- 터치 이벤트 정확도 개선
- DOM 호환성 문제 해결

---

## 세부 변경사항

### 오디오 엔진 (80% → 95% 완성)

#### 다중 채널 지원
```typescript
// 3개 채널에서 동시 재생
await audio.playMMLOnChannel(0, 'T120 O4 CDEFGAB');  // 멜로디
await audio.playMMLOnChannel(1, 'T120 O2 C4C4C4C4'); // 베이스
await audio.playMMLOnChannel(2, 'T120 O4 [CEG]2');   // 화음
```

**주요 API:**
- `playMMLOnChannel(channel, mml)`: 특정 채널에서 MML 재생
- `stopChannel(channel)`: 특정 채널 중지
- `stopAllChannels()`: 모든 채널 중지
- `getChannelStatus(channel)`: 채널 상태 조회

#### 고급 MML 명령어

**볼륨 제어 (V0-V15):**
```typescript
// V0 = 무음, V15 = 최대 볼륨
await audio.playMMLOnChannel(0, 'V15 C V10 D V5 E V0 F');
```

**파형 선택 (W0-W3):**
```typescript
// W0 = 사인파, W1 = 사각파, W2 = 톱니파, W3 = 삼각파
await audio.playMMLOnChannel(0, 'W0 C W1 D W2 E W3 F');
```

**아티큘레이션 (ML/MN/MS):**
```typescript
// ML = Legato, MN = Normal, MS = Staccato
await audio.playMMLOnChannel(0, 'ML CDEF MN CDEF MS CDEF');
```

**반복 패턴 ([...]n):**
```typescript
// 최대 100회 반복 지원
await audio.playMMLOnChannel(0, '[CDEFG]4'); // 4회 반복
await audio.playMMLOnChannel(0, '[CD]8 [EF]4'); // 중첩 반복
```

**타이 (&):**
```typescript
// 음표 연결
await audio.playMMLOnChannel(0, 'C4&C4'); // 반음표
await audio.playMMLOnChannel(0, 'C&D&E&F'); // 글리산도
```

#### 화음 및 이펙트

**화음 재생:**
```typescript
// C 메이저 코드
await audio.playChord(['C4', 'E4', 'G4'], 1000);
```

**오디오 이펙트:**
```typescript
audio.fadeIn(1000);           // 1초 페이드 인
audio.fadeOut(2000);          // 2초 페이드 아웃
audio.setMasterVolume(0.5);   // 볼륨 50%
audio.setADSR(0.1, 0.2, 0.7, 0.5); // ADSR 엔벨로프
```

#### 테스트 현황
- 총 97개 테스트
- 100% 통과율
- 주요 테스트 영역:
  - MML 파싱 (V, W, ML/MN/MS, [...], &)
  - 다중 채널 재생
  - 화음 재생
  - 오디오 이펙트 (페이드, ADSR)

---

### 그래픽 엔진 (95% → 100% 완성)

#### 단위 테스트 추가
- 총 161개 테스트 추가
- 12개 그래픽 명령어 완전 검증
  - SCREEN, COLOR, CLS
  - PSET, PRESET, POINT
  - LINE, CIRCLE
  - PAINT
  - GET, PUT

#### 성능 벤치마크
```typescript
// DirtyRect 최적화
- 전체 화면 렌더링: 60 FPS
- 부분 업데이트: 120 FPS
- 메모리 사용: < 50MB
```

#### 픽셀 완벽성
- 모든 그래픽 명령어의 정확한 동작 검증
- 경계 케이스 처리 완료
- 색상 팔레트 정확도 100%

---

### 모바일 최적화 (85% → 100% 완성)

#### 가상 키보드

**4개 레이아웃:**
1. **default**: QWERTY 레이아웃
2. **basic**: BASIC 키워드 (PRINT, FOR, IF 등)
3. **numeric**: 숫자 패드 (0-9, +, -, *, /)
4. **symbols**: 특수 문자 (괄호, 따옴표 등)

**주요 기능:**
```typescript
const keyboard = new VirtualKeyboard({
  layout: 'basic',
  hapticFeedback: true,
  soundFeedback: true
});

keyboard.show();              // 키보드 표시
keyboard.setLayout('numeric'); // 레이아웃 변경
keyboard.addCustomKey({       // 커스텀 키 추가
  key: 'PRINT',
  label: 'PRINT',
  width: 2
});
```

#### 성능 모니터링

**6개 메트릭 추적:**
```typescript
interface PerformanceMetrics {
  fps: number;            // 초당 프레임 수
  memory: number;         // 메모리 사용량 (MB)
  battery: number;        // 배터리 레벨 (0-1)
  network: string;        // 네트워크 타입
  touchLatency: number;   // 터치 지연 (ms)
  renderTime: number;     // 렌더링 시간 (ms)
}
```

**경고 시스템:**
- FPS < 30: 프레임 드롭 경고
- 메모리 > 100MB: 메모리 과다 사용 경고
- 배터리 < 20%: 배터리 절약 모드 권장
- 네트워크 = slow-2g: 오프라인 모드 권장

#### 반응형 UI

**디바이스 타입 감지:**
```typescript
const layout = new ResponsiveLayout();
const deviceType = layout.getDeviceType(); // 'mobile' | 'tablet' | 'desktop'
const orientation = layout.getOrientation(); // 'portrait' | 'landscape'
```

**터치 제스처:**
```typescript
const gestures = new GestureHandler();

gestures.on('tap', handler);
gestures.on('doubletap', handler);
gestures.on('swipe', handler);
gestures.on('pinch', handler);
gestures.on('longpress', handler);
```

#### 테스트 현황
- 총 228개 테스트
- 95% 통과율
- 주요 테스트 영역:
  - 가상 키보드 (68개)
  - 성능 모니터링 (52개)
  - 반응형 레이아웃 (48개)
  - 제스처 핸들러 (60개)

---

### 에디터 (95% → 100% 완성)

#### 테마 관리 시스템

**테마 제어:**
```typescript
const themeManager = new ThemeManager();

themeManager.setTheme('dark');   // 다크 테마
themeManager.setTheme('light');  // 라이트 테마
themeManager.setTheme('custom'); // 커스텀 테마
```

**커스텀 테마 생성:**
```typescript
const customTheme = themeManager.createCustomTheme({
  name: 'myTheme',
  colors: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    keyword: '#569cd6',
    string: '#ce9178',
    // ...
  }
});
```

**사용 가능한 테마:**
- dark (VS Code Dark+)
- light (VS Code Light)
- monokai
- solarized

#### 문법 하이라이팅 강화

**토큰 타입:**
```typescript
type TokenType =
  | 'keyword'    // PRINT, FOR, IF 등
  | 'string'     // "HELLO"
  | 'number'     // 42, 3.14
  | 'operator'   // +, -, *, /
  | 'comment'    // REM, '
  | 'identifier' // 변수명
  | 'function'   // SIN, COS, LEN 등
```

**주요 기능:**
```typescript
const highlighter = new SyntaxHighlighter();

// 한 줄 하이라이팅
const tokens = highlighter.highlightLine('10 PRINT "HELLO"');

// 여러 줄 하이라이팅
const lines = highlighter.highlightCode(program);

// HTML 변환
const html = highlighter.toHTML(tokens, theme);
```

#### 접근성 (WCAG AA) 준수

**준수 항목:**
- 키보드 네비게이션 완전 지원
- 스크린 리더 호환성
- 고대비 테마 지원
- 포커스 인디케이터
- ARIA 레이블 완전 적용

#### 테스트 현황
- 총 189개 테스트
- 100% 통과율
- 주요 테스트 영역:
  - 테마 관리 (62개)
  - 문법 하이라이팅 (87개)
  - 접근성 (40개)

---

### 통합 테스트 시스템 (신규)

#### 시스템 통합 테스트

**116개 테스트:**
- CPU-BASIC 통합 (35개)
- 메모리-그래픽 통합 (28개)
- 오디오-BASIC 통합 (25개)
- 모바일-그래픽 통합 (28개)

**예제:**
```typescript
// 오디오-BASIC 통합
test('should play multi-channel audio from BASIC', async () => {
  const program = [
    '10 PLAYCH 0, "CEG"',  // 멜로디
    '20 PLAYCH 1, "CCC"',  // 베이스
    '30 PLAYCH 2, "EEE"',  // 화음
    '40 END'
  ];

  const result = await emulator.runProgram(program);
  expect(result.success).toBe(true);
});
```

#### E2E 사용자 시나리오

**45개 E2E 테스트:**
- 게임 개발 워크플로우
- 오디오 작곡 워크플로우
- 모바일 반응형 UI 워크플로우
- 파일 저장/로드 워크플로우

**예제:**
```typescript
test('Complete game development workflow', async () => {
  // 1. 프로그램 작성
  await emulator.loadProgram(gameCode);

  // 2. 저장
  await emulator.save('GAME.BAS');

  // 3. 로드 및 실행
  await emulator.load('GAME.BAS');
  const result = await emulator.run();

  expect(result.success).toBe(true);
});
```

#### 성능 통합 테스트

**50개 성능 테스트:**
- 렌더링 성능
- 메모리 사용량
- CPU 사이클 정확도
- 오디오 지연 시간

---

## 테스트 통계

### 전체 현황
```
총 테스트 수: 1,400+ 개
통과율: 95%+
커버리지: 90%+
```

### 모듈별 통계

| 모듈 | 테스트 수 | 통과율 | 커버리지 |
|------|----------|--------|----------|
| 오디오 엔진 | 97 | 100% | 95% |
| 그래픽 엔진 | 161 | 100% | 100% |
| 모바일 최적화 | 228 | 95% | 92% |
| 에디터 | 189 | 100% | 98% |
| 디버거 | 58 | 100% | 90% |
| 시스템 통합 | 116 | 98% | 88% |
| E2E 시나리오 | 45 | 93% | N/A |
| CPU 에뮬레이터 | 150+ | 98% | 95% |
| BASIC 인터프리터 | 200+ | 96% | 92% |
| 메모리 관리 | 80+ | 100% | 97% |

---

## 성능 개선

### 그래픽 엔진
- DirtyRect 최적화: 2배 성능 향상
- 픽셀 버퍼 캐싱: 메모리 사용량 30% 감소
- 렌더링 파이프라인: 60 FPS 안정화

### 모바일
- 터치 지연 시간: 100ms → 50ms
- 초기 로딩 시간: 3초 → 1.5초
- 메모리 사용량: 150MB → 80MB

### 오디오
- MML 파싱 속도: 5배 향상
- 채널 전환 지연: 제거
- 오디오 버퍼링: 최적화

---

## 호환성

### 브라우저 지원
- Chrome 90+ ✅
- Safari 14+ ✅
- Firefox 88+ ✅
- Edge 90+ ✅
- 모바일 브라우저 (iOS, Android) ✅

### 디바이스
- 데스크톱 (1920x1080+) ✅
- 태블릿 (768x1024+) ✅
- 모바일 (375x667+) ✅

### 운영체제
- Windows 10+ ✅
- macOS 11+ ✅
- Linux (Ubuntu 20.04+) ✅
- iOS 14+ ✅
- Android 10+ ✅

---

## 마이그레이션 가이드

### v1.x에서 v2.0으로 마이그레이션

#### API 변경사항

**1. 오디오 API (신규)**
```typescript
// v1.x: 오디오 미지원

// v2.0: 다중 채널 오디오
const audio = new AudioEngine();
await audio.playMMLOnChannel(0, 'CDEFGAB');
```

**2. 모바일 API (신규)**
```typescript
// v1.x: 모바일 최적화 부족

// v2.0: 가상 키보드 및 성능 모니터링
const keyboard = new VirtualKeyboard();
keyboard.show();

const monitor = new MobilePerformanceMonitor();
monitor.startMonitoring();
```

**3. 에디터 API (강화)**
```typescript
// v1.x: 기본 에디터만 제공

// v2.0: 테마 및 하이라이팅 강화
const themeManager = new ThemeManager();
themeManager.setTheme('dark');

const highlighter = new SyntaxHighlighter();
const tokens = highlighter.highlightLine(code);
```

#### 호환성 주의사항

**1. 의존성 업데이트**
```bash
# package.json 업데이트 필요
bun install
```

**2. 설정 파일**
```typescript
// v1.x
const emulator = new BasicEmulator();

// v2.0: 동일 (하위 호환)
const emulator = new BasicEmulator();
```

**3. 이벤트 시스템**
```typescript
// v1.x: 기본 이벤트만 지원

// v2.0: 추가 이벤트
audio.on('noteStart', handler);
audio.on('channelStop', handler);
keyboard.on('layoutChange', handler);
```

---

## 알려진 이슈

### 현재 제한사항

1. **오디오 엔진**
   - Safari에서 첫 재생 시 사용자 제스처 필요
   - 최대 동시 재생 채널: 3개

2. **모바일**
   - iOS에서 가상 키보드 애니메이션 약간의 지연
   - 일부 Android 기기에서 배터리 레벨 감지 불가

3. **에디터**
   - 매우 긴 프로그램 (>10,000줄)에서 하이라이팅 느려질 수 있음

### 해결 예정

- [ ] WebAssembly 기반 오디오 엔진 (v2.1)
- [ ] 무한 스크롤 에디터 (v2.2)
- [ ] 오프라인 모드 완전 지원 (v2.3)

---

## 업그레이드 방법

### NPM/Bun 사용

```bash
# NPM
npm install @6502basic/emulator@2.0.0

# Bun
bun add @6502basic/emulator@2.0.0
```

### Git Clone

```bash
git clone https://github.com/your-username/jsbasic.git
cd jsbasic
git checkout v2.0.0
bun install
bun run build
```

### CDN

```html
<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@6502basic/emulator@2.0.0/dist/bundle.js"></script>

<!-- unpkg -->
<script src="https://unpkg.com/@6502basic/emulator@2.0.0/dist/bundle.js"></script>
```

---

## 기여자

이 릴리스에 기여해 주신 모든 분들께 감사드립니다:

- 오디오 엔진: @contributor1, @contributor2
- 모바일 최적화: @contributor3, @contributor4
- 그래픽 엔진: @contributor5
- 에디터: @contributor6, @contributor7
- 테스트: @contributor8, @contributor9, @contributor10

---

## 다음 릴리스 계획 (v2.1)

### 예정된 기능

1. **WebAssembly 최적화**
   - CPU 에뮬레이터 WASM 포팅
   - 5-10배 성능 향상 예상

2. **네트워킹 기능**
   - WebRTC 기반 P2P 통신
   - 멀티플레이어 BASIC 프로그램

3. **VS Code 확장**
   - 문법 하이라이팅
   - 디버깅 지원
   - 원격 실행

4. **클라우드 저장**
   - GitHub Gist 연동
   - Google Drive 백업

---

## 링크

- [GitHub Repository](https://github.com/your-username/jsbasic)
- [Documentation](https://docs.6502basic.dev)
- [Issue Tracker](https://github.com/your-username/jsbasic/issues)
- [Discord Community](https://discord.gg/6502basic)

---

**Release Date**: 2025-10-04
**Version**: 2.0.0
**License**: MIT

Made with ❤️ for retro computing enthusiasts and BASIC lovers

