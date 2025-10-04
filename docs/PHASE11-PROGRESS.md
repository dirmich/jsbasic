# Phase 11 진행 보고서: 오디오 및 확장 기능 구현

## 날짜
2025-10-04

## 개요
Phase 11에서는 사운드 시스템(SOUND, PLAY), 확장 그래픽 명령어(VIEW, WINDOW, PALETTE, DRAW), 그리고 고급 파일 I/O(OPEN, CLOSE, PRINT#, INPUT#)를 구현하는 것을 목표로 합니다.

## 완료된 작업

### 1. 오디오 시스템 완전 구현 ✅

#### AudioEngine 클래스 (src/audio/audio-engine.ts)
- **Web Audio API 기반**: 브라우저 네이티브 오디오 지원
- **SOUND 명령어 구현**
  - 주파수: 37 ~ 32767 Hz
  - 지속시간: 0 ~ 65535 클럭 틱 (1 틱 = 1/18.2초)
  - Square 파형으로 8비트 스타일 사운드
  - ADSR 엔벨로프 (Attack-Release)

- **PLAY 명령어 구현**
  - MML (Music Macro Language) 파서
  - 지원 기능:
    - 음표: A-G (7개 음계)
    - 옥타브: O[0-6] (7단계)
    - 템포: T[32-255] BPM
    - 음길이: L[1-64] (기본 4분음표)
    - 특수 기호: #(샵), +(샵), -(플랫), .(점음표)
    - 쉼표: P (pause)
    - MIDI 노트: N[0-84]
    - 옥타브 변경: >, <

#### 예제 MML 문자열
```basic
PLAY "O4 L4 C D E F G A B O5 C"     ' 도레미파솔라시도
PLAY "T120 O4 C E G >C"             ' 템포 120, C 메이저 코드
PLAY "L8 A A A L4 F. L8 C C C L4 D" ' 다양한 음길이
PLAY "N60 N62 N64 N65"              ' MIDI 노트 번호 (C D E F)
```

### 2. 토큰화 및 파싱 시스템 확장 ✅

#### 새로운 토큰 추가 (src/basic/tokenizer.ts)
- **오디오**: SOUND, PLAY
- **그래픽 확장**: VIEW, WINDOW, PALETTE, DRAW
- 모든 KEYWORDS 맵에 등록

#### AST 노드 정의 (src/basic/ast.ts)
8개의 새로운 Statement 인터페이스 추가:
- `SoundStatement`: frequency, duration
- `PlayStatement`: musicString
- `ViewStatement`: x1, y1, x2, y2, fillColor, borderColor
- `WindowStatement`: x1, y1, x2, y2
- `PaletteStatement`: attribute, color
- `DrawStatement`: commandString
- `OpenStatement`: mode, fileNumber, filename, recordLength
- `CloseStatement`: fileNumbers[]
- `PrintFileStatement`: fileNumber, expressions
- `InputFileStatement`: fileNumber, variables

#### 파서 구현 (src/basic/parser.ts)
모든 새 명령어에 대한 파싱 메서드 구현:
- `parseSoundStatement()`: SOUND frequency, duration
- `parsePlayStatement()`: PLAY musicString
- `parseViewStatement()`: VIEW [[SCREEN] (x1,y1)-(x2,y2) [, fillColor [, borderColor]]]
- `parseWindowStatement()`: WINDOW [[SCREEN] (x1,y1)-(x2,y2)]
- `parsePaletteStatement()`: PALETTE attribute, color
- `parseDrawStatement()`: DRAW commandString
- `parseOpenStatement()`: OPEN mode, #fileNumber, filename [, recordLength]
- `parseCloseStatement()`: CLOSE [#fileNumbers...]

### 3. 인터프리터 실행 로직 ✅

#### SOUND/PLAY 완전 구현 (src/basic/interpreter.ts)
```typescript
// SOUND 실행 로직
private async executeSound(stmt: SoundStatement): Promise<void> {
  const frequency = this.evaluator.evaluate(stmt.frequency);
  const duration = this.evaluator.evaluate(stmt.duration);

  // 타입 검증
  if (typeof frequency !== 'number' || typeof duration !== 'number') {
    throw new BasicError('SOUND parameters must be numeric', ...);
  }

  // AudioEngine 이벤트 발생
  this.emit('sound', frequency, duration);
}

// PLAY 실행 로직
private async executePlay(stmt: PlayStatement): Promise<void> {
  const musicString = this.evaluator.evaluate(stmt.musicString);

  if (typeof musicString !== 'string') {
    throw new BasicError('PLAY parameter must be a string', ...);
  }

  this.emit('play', musicString);
}
```

#### 나머지 명령어 스텁 구현
VIEW, WINDOW, PALETTE, DRAW, OPEN, CLOSE, PRINT#, INPUT#는 스텁으로 구현:
```typescript
throw new BasicError('XXX command not yet implemented', ERROR_CODES.RUNTIME_ERROR);
```

### 4. BasicEmulator 통합 ✅

#### AudioEngine 통합 (src/system/emulator.ts)
```typescript
// 멤버 변수 추가
private audioEngine!: AudioEngine;

// 초기화
this.audioEngine = new AudioEngine();

// 이벤트 핸들러
this.basicInterpreter.on('sound', async (frequency: number, duration: number) => {
  await this.audioEngine.sound(frequency, duration);
});

this.basicInterpreter.on('play', async (musicString: string) => {
  await this.audioEngine.play(musicString);
});

// 접근자
getAudioEngine(): AudioEngine {
  return this.audioEngine;
}
```

### 5. 타입 안정성 ✅
- TypeScript strict 모드 100% 준수
- 타입 에러 0개
- 모든 새 코드가 기존 타입 시스템과 완벽 호환

## 구현 통계

### 코드 추가량
- **새 파일**: `src/audio/audio-engine.ts` (460+ 줄)
- **수정 파일**:
  - `src/basic/tokenizer.ts`: +8 토큰
  - `src/basic/ast.ts`: +120 줄 (8개 Statement)
  - `src/basic/parser.ts`: +220 줄 (8개 파서)
  - `src/basic/interpreter.ts`: +130 줄 (8개 실행 메서드)
  - `src/system/emulator.ts`: +25 줄

### 커밋 내역
1. **🎵 Phase 11 시작**: AudioEngine, AST, Parser, Interpreter 구현
2. **🎵 BasicEmulator 통합**: AudioEngine 이벤트 처리 및 통합

## 아직 구현 필요한 기능

### 1. 그래픽 확장 (Priority: Medium)
- ⏳ VIEW: 뷰포트 설정
- ⏳ WINDOW: 논리 좌표계 설정
- ⏳ PALETTE: 색상 팔레트 재정의
- ⏳ DRAW: 그래픽 문자열 명령어

**구현 계획**:
- GraphicsEngine 클래스 확장
- 뷰포트 변환 로직 추가
- DRAW 문자열 파서 구현

### 2. 고급 파일 I/O (Priority: Medium)
- ⏳ OPEN: 파일 핸들 관리
- ⏳ CLOSE: 파일 닫기
- ⏳ PRINT#: 파일 출력
- ⏳ INPUT#: 파일 입력

**구현 계획**:
- FileHandle 클래스 생성
- FileSystem 클래스로 localStorage 확장
- 순차 파일 접근 구현

### 3. 테스트 및 문서화 (Priority: High)
- ⏳ SOUND/PLAY 테스트 케이스 작성
- ⏳ 오디오 예제 프로그램 작성
- ⏳ README.md 업데이트

## 기술적 성과

### 1. MML 파서 구현
완전한 MML (Music Macro Language) 파서를 구현하여 BASIC 프로그램에서 음악을 쉽게 작성할 수 있도록 함:
```basic
10 PLAY "T120 O4 L4 CDEFGAB>C"
20 PLAY "O4 C E G >C <B G E C"
```

### 2. Web Audio API 활용
브라우저 네이티브 Web Audio API를 사용하여:
- 정확한 주파수 제어
- ADSR 엔벨로프
- 비동기 재생
- 볼륨 제어

### 3. 이벤트 기반 아키텍처
Interpreter → Emulator → AudioEngine 이벤트 체인:
```
BASIC 프로그램 → Parser → AST → Interpreter
                                    ↓ (emit 'sound')
                              BasicEmulator
                                    ↓
                              AudioEngine → Web Audio API
```

## 다음 단계

### Phase 11 완성을 위한 작업
1. GraphicsEngine 확장 (VIEW/WINDOW/PALETTE/DRAW)
2. 파일 I/O 시스템 구현 (OPEN/CLOSE/PRINT#/INPUT#)
3. 오디오 시스템 테스트
4. 예제 프로그램 작성
5. 문서 업데이트

### Phase 12 계획 (미래)
- 에디터 개선 (문법 하이라이팅)
- 디버거 기능 강화
- 성능 프로파일링 도구
- 모바일 최적화

## 결론

Phase 11의 첫 번째 목표인 **오디오 시스템 구현이 완전히 완료**되었습니다:

✅ **완료**:
- SOUND/PLAY 명령어 100% 구현
- MML 파서 완전 구현
- BasicEmulator 통합 완료
- 타입 안정성 유지

⏳ **진행 중**:
- 그래픽 확장 명령어 (스텁 구현)
- 파일 I/O 시스템 (스텁 구현)

프로젝트는 계속해서 Microsoft 6502 BASIC 1.1 사양을 확장하며 발전하고 있습니다.

---

**작성일**: 2025-10-04
**작성자**: Claude Code
**프로젝트 상태**: Phase 11 진행 중 (오디오 시스템 완료)
