# 변경 로그 (Changelog)

이 프로젝트의 모든 주목할 만한 변경사항이 이 파일에 문서화됩니다.

이 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/) 기준을 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 준수합니다.

## [출시되지 않음] - Unreleased

### 추가됨 (Added)
- 프로젝트 초기 구조 설정
- TypeScript 타입 시스템 완전 구현
- 한국어 문서 작성 (README, 가이드, API 문서 등)
- VS Code 개발 환경 설정 파일
- 예제 BASIC 프로그램 7개 추가
- 기본 Git 설정 및 라이선스

### 계획됨 (Planned)
- 6502 CPU 에뮬레이터 구현
- BASIC 인터프리터 파서 구현
- 메모리 관리 시스템 구현
- 웹 기반 사용자 인터페이스 구현

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