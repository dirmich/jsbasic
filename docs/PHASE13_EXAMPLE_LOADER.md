# Phase 13: 예제 로더 시스템 구현

## 개요

사용자가 25개의 예제 프로그램을 쉽게 탐색하고 실행할 수 있는 통합 예제 로더 시스템을 구현했습니다.

## 구현 내용

### 1. 예제 메타데이터 시스템

**파일**: `src/web/examples-metadata.ts`

#### 주요 기능
- 25개 예제 프로그램의 메타데이터 정의
- 카테고리별 분류 (basic, graphics, audio, games, demos, math, tools)
- 난이도 표시 (beginner, intermediate, advanced)
- 태그 기반 검색 지원

#### 예제 구조
```typescript
interface ExampleProgram {
  id: string;
  title: string;
  category: 'basic' | 'graphics' | 'audio' | 'games' | 'demos' | 'math' | 'tools';
  description: string;
  filename: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}
```

#### 카테고리별 예제 수
- **Basic (4개)**: hello-world, hello, loops-and-arrays, string-functions
- **Graphics (7개)**: graphics-demo, graphics-extended, pixel-art, sprite-demo, ascii-art, star-pattern, fractal-tree
- **Audio (1개)**: audio-demo
- **Games (3개)**: guess-game, guess-number, tic-tac-toe
- **Demos (3개)**: bouncing-ball, phase11-complete, performance-test
- **Math (4개)**: math-demo, math-functions, multiplication-table, prime-numbers
- **Tools (3개)**: calculator, address-book, file-io-demo

### 2. ExampleBrowser UI 컴포넌트

**파일**: `src/web/components/example-browser.ts`

#### 주요 기능
- 카테고리 필터링 (8개 카테고리)
- 실시간 검색 (제목, 설명, 태그 검색)
- 예제 카드 UI (아이콘, 제목, 설명, 메타 정보)
- 3가지 액션 버튼
  - 📋 **로드**: 프로그램을 에뮬레이터에 로드
  - ▶️ **실행**: 프로그램을 로드하고 즉시 실행
  - 👁️ **코드**: 코드 뷰어 모달로 소스 코드 표시

#### 이벤트 시스템
```typescript
exampleBrowser.on('load', (exampleId) => { /* ... */ });
exampleBrowser.on('run', (exampleId) => { /* ... */ });
exampleBrowser.on('view', (exampleId) => { /* ... */ });
```

### 3. ExampleLoader 로직

**파일**: `src/web/example-loader.ts`

#### 주요 기능
- 예제 파일 비동기 로딩 (fetch API)
- 코드 캐싱 (중복 로딩 방지)
- 코드 뷰어 모달 생성
  - 복사 버튼 (클립보드 복사)
  - 로드 버튼 (모달에서 바로 로드)
  - 실행 버튼 (모달에서 바로 실행)
- 에러 처리 및 로딩 상태 관리

#### 코드 로딩 프로세스
1. 예제 메타데이터 조회
2. fetch로 .bas 파일 로드
3. 캐시에 저장
4. 에뮬레이터에 전달
5. 정보 표시 (제목, 설명, 태그)

### 4. WebEmulator 통합

**파일**: `src/web/web-emulator.ts` (수정)

#### 추가 메서드
```typescript
// 예제 브라우저 초기화
private initializeExampleBrowser(): void

// BASIC 프로그램 로드
async loadProgram(code: string): Promise<void>

// 프로그램 실행
async run(): Promise<void>

// 화면 지우기
clearScreen(): void

// 터미널 객체 가져오기
getTerminal(): Terminal

// 예제 로더 가져오기
getExampleLoader(): ExampleLoader | null
```

#### 초기화 순서
1. DOM 요소 찾기
2. 모바일 환경 초기화
3. **예제 브라우저 초기화** ← 새로 추가
4. 이벤트 핸들러 설정
5. 에뮬레이터 시작

### 5. UI/UX 디자인

#### HTML 구조
**파일**: `public/index.html` (수정)

```html
<main class="main-content">
  <!-- 예제 브라우저 사이드바 (왼쪽) -->
  <div class="example-sidebar" id="example-browser">
    <!-- ExampleBrowser 컴포넌트가 여기에 렌더링 -->
  </div>

  <!-- 그래픽 화면 (중앙) -->
  <div class="graphics-container">...</div>

  <!-- 터미널 (중앙) -->
  <div class="terminal-container">...</div>

  <!-- 사이드바 (오른쪽) -->
  <aside class="sidebar">...</aside>
</main>
```

#### CSS 스타일
**파일**: `public/style.css` (추가)

- **예제 사이드바**: 320px 너비, 고정 레이아웃
- **카테고리 버튼**: 아이콘 + 라벨, 호버/활성 상태
- **예제 카드**: 호버 애니메이션, 그림자 효과
- **난이도 배지**: 초급(녹색), 중급(주황), 고급(빨강)
- **코드 뷰어 모달**: 중앙 정렬, 오버레이, ESC 키 지원

#### 반응형 디자인
- **모바일 (≤768px)**: 예제 브라우저 상단 배치, 50vh 높이
- **태블릿 (769-1024px)**: 예제 브라우저 280px 너비
- **데스크톱 (>1024px)**: 예제 브라우저 320px 너비

### 6. 빌드 시스템

**파일**: `build.js` (이미 구현됨)

```javascript
// 예제 프로그램 복사
await $`cp -r ${EXAMPLES_DIR}/* ${BUILD_DIR}/examples/`;
```

- 빌드 시 `examples/` 디렉토리 전체를 `dist/examples/`로 복사
- 25개 .bas 파일 모두 포함

## 사용 방법

### 1. 예제 탐색
1. 왼쪽 사이드바에서 카테고리 선택 (전체, 기초, 그래픽, 오디오, 게임, 데모, 수학, 도구)
2. 검색 입력창에서 키워드로 검색
3. 예제 카드를 클릭하여 상세 정보 확인

### 2. 예제 실행
- **로드 버튼**: 프로그램을 에뮬레이터에 로드 (실행 전 코드 확인 가능)
- **실행 버튼**: 프로그램을 즉시 로드하고 실행
- **코드 버튼**: 모달 창에서 소스 코드 확인

### 3. 코드 뷰어
- 소스 코드 전체 확인
- 📋 복사 버튼: 클립보드에 코드 복사
- 📥 로드 버튼: 에뮬레이터에 로드
- ▶️ 실행 버튼: 즉시 실행
- ESC 키 또는 오버레이 클릭으로 닫기

## 기술적 특징

### 1. 성능 최적화
- **코드 캐싱**: 한 번 로드한 예제는 메모리에 캐싱
- **이벤트 기반 아키텍처**: 느슨한 결합, 유지보수 용이
- **lazy loading**: 코드는 실제 로드 시점에 fetch

### 2. 사용자 경험
- **즉각적인 피드백**: 호버 애니메이션, 버튼 상태 변화
- **명확한 정보 제공**: 카테고리, 난이도, 설명, 태그
- **직관적인 UI**: 아이콘 사용, 색상 구분, 일관된 디자인

### 3. 확장성
- **메타데이터 중심 설계**: 새 예제 추가 시 메타데이터만 수정
- **플러그인 구조**: ExampleBrowser와 ExampleLoader 분리
- **타입 안전성**: TypeScript 인터페이스로 타입 보장

## 개발 서버 실행

```bash
# 빌드 및 서버 실행
bun run serve:web

# 브라우저에서 접속
# http://localhost:8080 (또는 표시된 포트)
```

## 테스트 체크리스트

- ✅ 25개 예제 모두 메타데이터 등록
- ✅ 카테고리 필터링 동작
- ✅ 검색 기능 동작
- ✅ 예제 로드 성공
- ✅ 예제 실행 성공
- ✅ 코드 뷰어 모달 동작
- ✅ 반응형 레이아웃 (모바일/태블릿/데스크톱)
- ✅ 코드 복사 기능
- ✅ 에러 처리
- ✅ 타입 체크 통과

## 향후 개선 사항

### 우선순위 높음
1. **예제 썸네일 이미지**: 각 예제의 실행 결과 미리보기
2. **즐겨찾기 기능**: localStorage에 즐겨찾기 저장
3. **최근 실행 목록**: 최근 실행한 예제 히스토리

### 우선순위 중간
4. **예제 평가 시스템**: 별점 또는 좋아요
5. **예제 공유**: URL 파라미터로 특정 예제 링크 공유
6. **코드 편집기**: 모달에서 바로 코드 수정 후 실행

### 우선순위 낮음
7. **예제 플레이리스트**: 여러 예제를 순서대로 실행
8. **예제 챌린지 모드**: 단계별 학습 코스
9. **커뮤니티 예제**: 사용자 제출 예제 (서버 필요)

## 파일 구조

```
src/web/
├── examples-metadata.ts       # 예제 메타데이터 및 헬퍼 함수
├── example-loader.ts          # 예제 로딩 및 실행 로직
├── components/
│   └── example-browser.ts     # 예제 브라우저 UI 컴포넌트
└── web-emulator.ts            # WebEmulator 통합 (수정)

public/
├── index.html                 # HTML 구조 (수정)
└── style.css                  # CSS 스타일 (추가)

examples/                      # 25개 .bas 파일
├── *.bas
└── games/
    └── *.bas
```

## 결론

예제 로더 시스템을 통해 사용자는 25개의 다양한 BASIC 프로그램을 쉽게 탐색하고 실행할 수 있게 되었습니다. 카테고리별 분류, 검색 기능, 직관적인 UI를 통해 학습 경험이 크게 향상되었습니다.

- **개발 시간**: 약 2시간
- **코드 라인 수**: ~1,000줄 (TS + CSS)
- **예제 프로그램 수**: 25개
- **카테고리 수**: 7개
- **지원 액션**: 3개 (로드, 실행, 코드 보기)
