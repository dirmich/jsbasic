# 6502 BASIC 에뮬레이터 - 통합 및 E2E 테스트 요약

## 테스트 파일 구조

### 1. 시스템 통합 테스트 (`tests/system-integration.test.ts`)
**목적**: 전체 시스템 컴포넌트의 통합 동작 검증

#### 테스트 시나리오
- **시나리오 1: 완전한 BASIC 프로그램 실행** (5개 테스트)
  - PRINT 문 실행
  - FOR/NEXT 루프
  - 변수 연산 및 출력
  - GOTO 문
  - IF/THEN 조건문

- **시나리오 2: 그래픽 프로그램** (6개 테스트)
  - SCREEN 명령어
  - PSET 픽셀 그리기
  - LINE 선 그리기
  - CIRCLE 원 그리기

- **시나리오 3: 오디오 프로그램** (2개 테스트)
  - SOUND 명령어
  - PLAY MML 재생

- **시나리오 4: 복합 프로그램** (1개 테스트)
  - 그래픽 + 오디오 동시 실행

- **시나리오 5: 파일 시스템** (1개 테스트)
  - 프로그램 저장/로드

- **메모리 상태 검증** (2개 테스트)
  - 메모리 사용량 확인
  - 메모리 누수 테스트

- **시스템 상태 관리** (2개 테스트)
  - 에뮬레이터 상태 전환
  - 터미널 상태 동기화

**총 테스트 케이스**: 19개

---

### 2. E2E 사용자 시나리오 (`tests/e2e/user-scenarios.test.ts`)
**목적**: 실제 사용자 워크플로우 시뮬레이션

#### 워크플로우
- **워크플로우 1: 초보자 경험** (3개 테스트)
  - 예제 로드 → 실행 → 결과 확인
  - 프로그램 수정 → 재실행
  - 에러 발생 → 수정 → 재실행

- **워크플로우 2: 프로그래머 경험** (3개 테스트)
  - 새 프로그램 작성 → 디버깅 → 저장
  - 복잡한 프로그램 (배열, 함수)
  - 중첩 루프 프로그램

- **워크플로우 3: 게임 개발자 경험** (3개 테스트)
  - 그래픽 게임 스켈레톤
  - 사운드 + 그래픽 결합
  - 간단한 애니메이션 루프

- **워크플로우 4: 모바일 사용자** (3개 테스트)
  - 모바일 최적화 초기화
  - 제스처 처리 시뮬레이션
  - 반응형 레이아웃 적용

- **통합 워크플로우** (2개 테스트)
  - 전체 세션 (작성 → 저장 → 종료 → 재시작 → 로드)
  - 여러 프로그램 순차 실행

- **사용자 입력 시나리오** (1개 테스트)
  - INPUT 문 처리

**총 테스트 케이스**: 15개

---

### 3. 크로스 모듈 통합 테스트 (`tests/cross-module.test.ts`)
**목적**: 모듈 간 상호작용 검증

#### 모듈 간 통합
- **CPU ↔ Memory** (3개 테스트)
  - 메모리 접근
  - 메모리 보호 영역
  - 메모리 뱅킹 시스템

- **BASIC ↔ CPU** (2개 테스트)
  - PEEK 함수 (메모리 읽기)
  - POKE 명령어 (메모리 쓰기)

- **BASIC ↔ Graphics** (6개 테스트)
  - SCREEN 명령어
  - PSET, LINE, CIRCLE, PAINT
  - CLS 화면 지우기

- **BASIC ↔ Audio** (3개 테스트)
  - SOUND 명령어
  - PLAY MML
  - 다중 채널 재생

- **Debugger ↔ BASIC** (2개 테스트)
  - 프로그램 실행 추적
  - 변수 감시

- **Editor ↔ BASIC** (1개 테스트)
  - 문법 하이라이팅 토큰 검증

- **Mobile ↔ 전체 시스템** (2개 테스트)
  - 모바일 최적화
  - 터치 입력 → 키보드 이벤트 변환

- **통합 시나리오** (1개 테스트)
  - BASIC + 그래픽 + 오디오 + 메모리 동시 사용

**총 테스트 케이스**: 20개

---

### 4. 성능 통합 테스트 (`tests/performance-integration.test.ts`)
**목적**: 시스템 전체 성능 검증

#### 성능 시나리오
- **대규모 계산 성능** (3개 테스트)
  - 10,000회 루프 < 1초
  - 중첩 루프 성능
  - 배열 초기화 성능

- **그래픽 렌더링 성능** (4개 테스트)
  - 1,000개 픽셀 그리기 < 3초
  - LINE 그리기 성능 (100개)
  - CIRCLE 그리기 성능 (50개)
  - 더티 렉트 최적화 효과

- **오디오 재생 성능** (2개 테스트)
  - 연속 SOUND 재생
  - 3채널 동시 재생

- **동시 작업 성능** (2개 테스트)
  - 그래픽 + 오디오 + 계산 동시 실행
  - 전체 시스템 FPS > 30

- **메모리 누수 테스트** (2개 테스트)
  - 반복 실행 시 메모리 증가 < 50%
  - 그래픽 반복 렌더링 안정성

- **성능 프로파일링** (2개 테스트)
  - 시스템 통계 수집
  - 디버그 정보 수집

- **최적화 검증** (2개 테스트)
  - ObjectPool 사용 효과
  - 캐싱 효과

**총 테스트 케이스**: 17개

---

### 5. 에러 복구 테스트 (`tests/error-recovery.test.ts`)
**목적**: 에러 발생 시 시스템 복구 능력 검증

#### 에러 시나리오
- **런타임 에러** (6개 테스트)
  - Division by zero
  - Type mismatch
  - Out of memory
  - Stack overflow
  - Undefined variable
  - Array index out of bounds

- **에러 후 복구** (3개 테스트)
  - 시스템 재시작
  - 메모리 정리
  - 상태 초기화

- **우아한 실패** (5개 테스트)
  - 잘못된 BASIC 문법
  - 지원하지 않는 명령어
  - 잘못된 파일 로드
  - 빈 프로그램 실행
  - 잘못된 GOTO

- **리소스 제한 처리** (3개 테스트)
  - 메모리 한계 도달
  - CPU 사이클 제한 (무한 루프 방지)
  - 중첩 깊이 제한

- **동시성 에러** (2개 테스트)
  - 동시 명령 실행 안정성
  - 실행 중 프로그램 수정

- **복구 검증** (2개 테스트)
  - 에러 후 정상 프로그램 실행
  - 여러 에러 연속 발생 후 복구

**총 테스트 케이스**: 21개

---

### 6. 회귀 테스트 (`tests/regression.test.ts`)
**목적**: 과거 버그 재발 방지

#### 버그 케이스
- **알려진 버그 케이스** (5개 테스트)
  - CASE-001: FOR 루프 변수 초기화
  - CASE-002: 문자열 연결 메모리 누수
  - CASE-003: GOTO 무한 루프 탐지
  - CASE-004: 중첩 IF/THEN 파싱 오류
  - CASE-005: 배열 경계 체크 누락

- **엣지 케이스** (7개 테스트)
  - 빈 문자열 처리
  - 0으로 나누기
  - 매우 큰 숫자
  - 음수 배열 인덱스
  - FOR 루프 STEP 0
  - 매우 긴 문자열
  - 중첩 깊이 한계

- **플랫폼별 이슈** (3개 테스트)
  - localStorage 없는 환경
  - 브라우저 AudioContext 제한
  - 타이밍 민감성

- **그래픽 관련 버그** (4개 테스트)
  - PSET 좌표 범위 초과
  - LINE 시작점=끝점
  - CIRCLE 반지름 0
  - PAINT 닫힌 영역 없음

- **오디오 관련 버그** (3개 테스트)
  - SOUND 주파수 0
  - PLAY 빈 문자열
  - PLAY 잘못된 MML

- **파일 시스템 버그** (2개 테스트)
  - 중복 파일명 저장
  - 특수문자 파일명

**총 테스트 케이스**: 24개

---

## 전체 테스트 통계

| 테스트 파일 | 테스트 케이스 수 | 카테고리 |
|------------|----------------|---------|
| system-integration.test.ts | 19 | 필수 |
| e2e/user-scenarios.test.ts | 15 | 필수 |
| cross-module.test.ts | 20 | 중요 |
| performance-integration.test.ts | 17 | 중요 |
| error-recovery.test.ts | 21 | 권장 |
| regression.test.ts | 24 | 권장 |
| **총계** | **116** | - |

## 테스트 실행 방법

### 개별 테스트 파일 실행
```bash
# 시스템 통합 테스트
bun test tests/system-integration.test.ts

# E2E 사용자 시나리오
bun test tests/e2e/user-scenarios.test.ts

# 크로스 모듈 통합
bun test tests/cross-module.test.ts

# 성능 통합 테스트
bun test tests/performance-integration.test.ts

# 에러 복구 테스트
bun test tests/error-recovery.test.ts

# 회귀 테스트
bun test tests/regression.test.ts
```

### 전체 테스트 실행
```bash
# 모든 테스트 실행
bun test

# 특정 패턴 테스트만 실행
bun test --test-name-pattern "시나리오"
```

## 테스트 커버리지 목표

- **전체 시스템**: 80% 이상
- **핵심 모듈** (CPU, BASIC, Memory): 90% 이상
- **통합 시나리오**: 95% 이상 통과율

## 성능 벤치마크

| 작업 | 목표 시간 | 측정 방법 |
|-----|---------|----------|
| 10,000회 루프 | < 1초 | performance-integration.test.ts |
| 1,000개 픽셀 그리기 | < 3초 | performance-integration.test.ts |
| 100개 LINE 그리기 | < 2초 | performance-integration.test.ts |
| 50개 CIRCLE 그리기 | < 2.5초 | performance-integration.test.ts |
| 전체 시스템 FPS | > 30 | performance-integration.test.ts |

## 알려진 제약사항

1. **브라우저 환경 의존성**
   - `localStorage`: Node.js 환경에서는 모킹됨
   - `AudioContext`: 브라우저에서만 동작
   - `requestAnimationFrame`: Happy DOM으로 모킹

2. **타이밍 민감성**
   - 비동기 테스트는 `await new Promise(resolve => setTimeout(...))`로 대기
   - CI 환경에서는 타임아웃 여유 필요

3. **메모리 제한**
   - 대규모 배열 할당 시 Out of Memory 발생 가능
   - 테스트에서는 적절한 크기로 제한

## 테스트 유지보수 가이드

### 새 기능 추가 시
1. 해당 기능의 단위 테스트 작성
2. 통합 테스트에 시나리오 추가
3. E2E 테스트에 사용자 워크플로우 추가

### 버그 수정 시
1. `regression.test.ts`에 버그 케이스 추가
2. 버그 수정 확인
3. 회귀 방지 검증

### 성능 개선 시
1. `performance-integration.test.ts`에 벤치마크 추가
2. 최적화 전/후 비교
3. 목표 성능 달성 확인

## CI/CD 통합

```yaml
# GitHub Actions 예시
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test
      - run: bun test --coverage
```

## 다음 단계

1. **시각적 회귀 테스트**: 그래픽 출력 스크린샷 비교
2. **부하 테스트**: 장기 실행 안정성 검증
3. **접근성 테스트**: WCAG 준수 확인
4. **크로스 브라우저 테스트**: Playwright 통합

---

**작성일**: 2025-10-04
**버전**: 1.0.0
**작성자**: Claude Code
