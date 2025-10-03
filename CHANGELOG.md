# 변경 로그 (Changelog)

이 프로젝트의 모든 주목할 만한 변경사항이 이 파일에 문서화됩니다.

이 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/) 기준을 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 준수합니다.

## [2.2.0] - 2025-10-03 - I/O 시스템 확장 및 테스트 강화

### 추가됨 (Added)
- **Keyboard 모듈**: EventEmitter 기반 키보드 입력 관리 시스템 구현
  - 키 상태 추적 (isKeyPressed, getPressedKeys)
  - 키 반복 기능 (enableRepeat, repeatDelay, repeatInterval)
  - 특수 키 캡처 (F1-F12, 화살표 키, 편집 키)
  - 이벤트 시스템 (keydown, keyup, keypress, keyrepeat, deactivated)
  - 리소스 정리 (dispose)
- **Storage 모듈**: localStorage/메모리 기반 데이터 저장소 구현
  - CRUD 연산 (set, get, has, remove, clear)
  - 키 관리 (keys, search with wildcard/regex)
  - 일괄 연산 (setMultiple, getMultiple)
  - 통계 기능 (getStats)
  - prefix 기반 격리 (다중 인스턴스 지원)
  - 이벤트 시스템 (set, get, remove, clear, error)
- **CPU OpcodeDecoder 통합**: CPU 실행 추적에 디스어셈블리 기능 통합
  - traceExecution()에서 실제 명령어 표시
  - disassemble() 및 disassembleRange() 메서드 활용
- **MemoryInterface 확장**: getData() 메서드 추가
  - 디스어셈블러가 메모리 배열에 접근 가능

### 수정됨 (Fixed)
- **TypeScript 타입 오류**: 6개 타입 오류 모두 해결
  - ui/components.ts: HTMLElement 타입 캐스팅 (HTMLInputElement, HTMLTableElement, HTMLLabelElement)
  - parser.ts: Token undefined 처리 (nullish coalescing)
  - debugger.ts: lastInstruction undefined 처리
- **CPU opcodes.ts 버그**: disassembleRange() 주소 계산 오류 수정
  - 기존: `address += info.bytes` (operands만 더함)
  - 수정: `address += 1 + info.bytes` (opcode + operands)
  - 이로 인해 연속 명령어 디스어셈블리가 정상 작동

### 테스트 (Testing)
- **Keyboard 모듈 테스트**: 18개 테스트 100% 통과 (278ms)
  - 초기화 (2개)
  - 활성화/비활성화 (4개)
  - 키 상태 추적 (2개)
  - 이벤트 발생 (3개)
  - 특수 키 감지 (2개)
  - 리소스 정리 (2개)
  - 키 반복 기능 (2개)
  - 에러 처리 (1개)
- **Storage 모듈 테스트**: 29개 테스트 100% 통과 (262ms)
  - 초기화 (2개)
  - CRUD 연산 (7개)
  - 다양한 데이터 타입 (6개)
  - 키 관리 (3개)
  - 일괄 연산 (2개)
  - 통계 (2개)
  - 이벤트 (4개)
  - 에러 처리 (1개)
  - prefix 격리 (1개)
  - 리소스 정리 (1개)
- **CPU 디스어셈블러 통합 테스트**: 27개 테스트 100% 통과 (237ms)
  - 기본 명령어 디스어셈블리 (4개)
  - 다양한 주소 지정 모드 (10개)
  - 범위 디스어셈블리 (2개)
  - 유효하지 않은 명령어 (2개)
  - 명령어 정보 (3개)
  - 명령어 분류 (2개)
  - 실제 프로그램 (2개)
  - 엣지 케이스 (2개)

### 문서화 (Documentation)
- **API 문서 업데이트**: Keyboard 및 Storage 모듈 상세 문서 추가
  - Keyboard 클래스: 생성자, 활성화 메서드, 키 상태 추적, 이벤트, 리소스 정리
  - Storage 클래스: 생성자, CRUD 연산, 키 관리, 일괄 연산, 통계, 이벤트, prefix 격리
  - FileStorage 클래스: 기존 Storage와 구분하여 파일 저장/로드 기능 명시
- **README 업데이트**: Phase 11 작업 내용 반영
  - 테스트 커버리지 124+ 케이스로 업데이트
  - I/O 시스템 확장 내용 추가

### 통계
- **총 테스트**: 74개 (Keyboard 18 + Storage 29 + Disassembler 27) 100% 통과
- **실행 시간**: ~780ms (평균)
- **코드 품질**: TypeScript 엄격 모드 완전 호환 (타입 오류 0개)

## [2.1.0] - 2024-12-09 - BASIC LIST 명령어 및 INPUT 기능 완전 구현

### 추가됨 (Added)
- **REM 문 지원**: REM 주석문을 정식 키워드로 구현
  - TokenType.REM 추가 및 KEYWORDS 등록
  - parseRemStatement 메서드 구현
  - LIST 명령에서 REM 문 올바르게 표시
- **INPUT 기능 완전 구현**: 사용자 입력 받기 기능 완성
  - System6502에 waitingForInput 상태 관리 추가
  - BasicInterpreter의 inputRequired 이벤트 연결
  - handleCommand에서 INPUT 모드 자동 감지 및 처리
  - '?' 프롬프트 표시 및 입력 전달

### 수정됨 (Fixed)
- **LIST 표현식 표시 오류**: [object Object] 대신 실제 코드 표시
  - FunctionCall의 name이 Identifier 객체임을 인식하여 .name 속성 추출
  - LetStatement, InputStatement, ForStatement, NextStatement의 변수명 처리
  - CallExpression, FunctionCall, ArrayAccess, ParenthesizedExpression 타입 모두 지원
  - StringLiteral의 value 속성 올바르게 추출
- **.bas 파일 로드 오류**: 빈 라인 번호(예: "460 ") 처리
  - app.js에서 라인 번호만 있는 줄 건너뛰기 (정규식: /^\d+\s+\S/)
  - emulator.ts에서 빈 줄과 라인 번호만 있는 줄 필터링
  - 개별 라인 파싱 오류를 무시하고 계속 진행
- **REM 문이 프로그램 삭제**: 주석으로 처리되어 명령어가 사라지는 문제 해결
  - tokenizer에서 REM을 skipComment가 아닌 키워드로 처리
  - 모든 REM 라인이 프로그램에 정상 저장됨

### 향상됨 (Improved)
- **formatExpression 강화**: 모든 표현식 타입 완벽 지원
  - 함수 호출: callee/name/function 필드 모두 처리
  - 변수명: Identifier 객체와 문자열 모두 호환
  - 배열 접근, 괄호 표현식 지원 추가
- **formatStatement 강화**: 모든 명령문 타입 정확한 포맷팅
  - LET, INPUT, FOR, NEXT의 변수명 Identifier 객체 처리
  - LetStatement의 expression/value 필드 모두 지원
  - InputStatement의 prompt StringLiteral 처리

### 테스트 결과
- ✅ math-demo.bas 완전 동작 (LOAD → LIST → RUN → INPUT)
- ✅ REM 주석문 정상 표시 및 실행
- ✅ 함수 호출 (SQR, LOG, SIN 등) 올바르게 표시
- ✅ INPUT 프롬프트 및 사용자 입력 처리 완성
- ✅ LIST 명령으로 원본 BASIC 소스 코드 재구성

## [2.0.0] - 2024-12-09 - 완전한 TypeScript 호환성 및 DOM 크로스 플랫폼 지원

### 추가됨 (Added)
- **DOM 호환성 시스템**: Node.js와 브라우저 환경 모두 지원하는 safeCreateElement 유틸리티
- **완전한 classList API**: Node.js 더미 객체에 전체 classList 메서드 구현
- **크로스 플랫폼 UI**: 서버사이드 렌더링과 클라이언트 사이드 모두 지원

### 수정됨 (Fixed)
- **무한 재귀 버그**: safeCreateElement에서 자기 자신 호출하는 치명적 버그 해결
- **"document is not defined" 오류**: UI 컴포넌트의 DOM 접근 문제 완전 해결
- **"classList is undefined" 오류**: DOM 더미 객체 classList 미구현 문제 해결
- **TypeScript rootDir 제약**: 테스트 파일 포함을 위한 설정 최적화

### 향상됨 (Improved)
- **에뮬레이터 안정성**: System6502 정상 시작 및 모든 UI 컴포넌트 동작 확인
- **개발자 경험**: DOM 관련 런타임 오류 완전 제거로 개발 생산성 향상
- **코드 품질**: 타입 안전성과 런타임 안정성 모두 확보

## [1.9.0] - 2024-12-09 - TypeScript 타입 안전성 완전 체계화

### 추가됨 (Added)
- **CPU 인터페이스 완전 구현**: memory 속성 접근성 개선 및 모든 필수 메서드 구현
- **AddressingMode/CPUFlag enum**: 문자열 리터럴을 enum으로 변환하여 타입 안전성 강화
- **완전한 디버깅 시스템**: 고급 브레이크포인트, 워치포인트, 실행 추적 기능
- **BASIC 파서 빈 소스 처리**: 빈 입력에 대한 안전한 처리 로직 추가

### 수정됨 (Fixed)
- **CPU6502 인터페이스 준수**: private memory를 public으로 변경하여 호환성 확보
- **모든 undefined 안전성 오류**: nullish coalescing 연산자(??) 활용하여 해결
- **Happy-DOM classList 호환성**: className 직접 조작으로 테스트 환경 호환성 확보
- **모바일 테스트 환경**: screen 객체 정확한 모킹으로 테스트 통과율 100% 달성

### 향상됨 (Improved)
- **모바일 최적화 테스트**: 27개 테스트 모두 통과하여 완전한 모바일 지원 확인
- **타입스크립트 엄격 모드**: exactOptionalPropertyTypes 포함 모든 엄격 설정 호환
- **코드 품질**: 150+ TypeScript 타입 오류 체계적 해결 완료

## [0.1.0] - 2024-12-XX - 프로젝트 초기화

### 추가됨 (Added)
- **프로젝트 구조**: plan.md에 따른 완전한 폴더 구조 생성
- **TypeScript 설정**: 엄격한 타입 체크 및 현대적 ES 기능 지원
- **타입 시스템**: CPU, BASIC, 메모리, I/O, UI, 수학 패키지의 완전한 타입 정의
- **빌드 시스템**: Bun 기반 개발/프로덕션 빌드 시스템
- **테스트 프레임워크**: Jest 기반 테스트 환경 (16개 초기 테스트 통과)
- **문서화**: 
  - `README.md`: 프로젝트 개요 및 사용법 (한국어)
  - `docs/개발자가이드.md`: 개발 환경 설정 및 코딩 가이드
  - `docs/API문서.md`: 전체 API 레퍼런스
  - `docs/사용자가이드.md`: BASIC 언어 사용법 완전 가이드
  - `docs/기여가이드.md`: 오픈소스 기여 방법
  - `docs/아키텍처.md`: 시스템 설계 문서
- **개발 도구**:
  - VS Code 설정 (settings.json, tasks.json, launch.json)
  - ESLint 및 Prettier 설정
  - Git 설정 (.gitignore)
  - MIT 라이선스
- **예제 프로그램**:
  - `hello.bas`: 기본 인사말 프로그램
  - `calculator.bas`: 간단한 계산기
  - `guess-game.bas`: 숫자 맞추기 게임
  - `multiplication-table.bas`: 구구단 출력
  - `math-functions.bas`: 수학 함수 데모
  - `address-book.bas`: 주소록 관리
  - `prime-numbers.bas`: 소수 찾기
  - `star-pattern.bas`: 다양한 별 패턴 그리기

### 기술 스택
- **런타임**: Bun 1.0+
- **언어**: TypeScript 5.0+
- **빌드**: 자체 번들러 (Bun 내장)
- **테스트**: Jest
- **린트**: ESLint + Prettier
- **개발 도구**: VS Code

### 성과 지표
- ✅ **16개 테스트 통과** (100% 성공률)
- ✅ **완전한 타입 안전성** (TypeScript strict 모드)
- ✅ **8개 문서 파일** 작성 완료
- ✅ **7개 예제 프로그램** 제공
- ✅ **0개 빌드 에러** (깔끔한 컴파일)

---

## 버전 관리 정책

### 주 버전 (Major) - X.0.0
- 하위 호환성을 깨는 API 변경
- 아키텍처의 근본적인 변경

### 부 버전 (Minor) - 0.X.0  
- 하위 호환성을 유지하는 새 기능 추가
- 기존 API의 확장

### 수정 버전 (Patch) - 0.0.X
- 하위 호환성을 유지하는 버그 수정
- 문서 업데이트
- 성능 개선

## 기여자

- [@dirmich](https://github.com/dirmich) - 프로젝트 초기 설정 및 문서화

---

**참고**: 이 프로젝트는 현재 개발 초기 단계입니다. 실제 CPU 에뮬레이터와 BASIC 인터프리터 구현은 다음 버전에서 제공될 예정입니다.