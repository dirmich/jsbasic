# 테스트 빠른 시작 가이드

## 즉시 실행 가능한 명령어

### 1. 전체 테스트 실행
```bash
cd /Users/dirmich/work/0.ai/basic/jsbasic
bun test
```

### 2. 필수 테스트만 실행
```bash
# 시스템 통합 (19 tests)
bun test tests/system-integration.test.ts

# E2E 사용자 시나리오 (15 tests)
bun test tests/e2e/user-scenarios.test.ts
```

### 3. 중요 테스트 실행
```bash
# 크로스 모듈 통합 (20 tests)
bun test tests/cross-module.test.ts

# 성능 테스트 (17 tests)
bun test tests/performance-integration.test.ts
```

### 4. 권장 테스트 실행
```bash
# 에러 복구 (21 tests)
bun test tests/error-recovery.test.ts

# 회귀 테스트 (24 tests)
bun test tests/regression.test.ts
```

## 테스트 필터링

### 특정 테스트만 실행
```bash
# 이름으로 필터링
bun test --test-name-pattern "PRINT"
bun test --test-name-pattern "그래픽"
bun test --test-name-pattern "성능"

# 파일 패턴으로 필터링
bun test tests/*integration*.test.ts
```

### 커버리지 확인
```bash
bun test --coverage
```

## 테스트 디버깅

### 상세 로그 출력
```bash
# 개별 테스트를 상세 모드로 실행
bun test tests/system-integration.test.ts --verbose

# 특정 테스트만 디버그
bun test --test-name-pattern "PRINT 문 실행"
```

### 테스트 타임아웃 조정
```bash
# 느린 환경에서는 타임아웃 증가
bun test --timeout 30000
```

## 예상 실행 시간

| 테스트 파일 | 예상 시간 | 우선순위 |
|-----------|---------|---------|
| system-integration | ~5-10초 | 필수 |
| user-scenarios (E2E) | ~5-10초 | 필수 |
| cross-module | ~10-15초 | 중요 |
| performance | ~20-30초 | 중요 |
| error-recovery | ~15-20초 | 권장 |
| regression | ~15-20초 | 권장 |
| **전체** | **~1-2분** | - |

## 실패 시 대처

### 테스트 실패 원인 확인
1. 에러 메시지 확인
2. 해당 테스트 파일 열기
3. `beforeEach()`, `afterEach()` 확인
4. 타임아웃 관련 오류면 대기 시간 증가

### 일반적인 문제

**문제 1: "Cannot find module"**
```bash
# 해결: 의존성 재설치
bun install
```

**문제 2: "Timeout exceeded"**
```bash
# 해결: 타임아웃 증가
bun test --timeout 60000
```

**문제 3: "localStorage is not defined"**
- 정상 동작: Node.js 환경에서는 모킹됨
- 브라우저 테스트는 별도 환경 필요

## 빠른 검증 체크리스트

- [ ] `bun test tests/system-integration.test.ts` 실행
- [ ] PRINT 문 테스트 통과 확인
- [ ] FOR/NEXT 루프 테스트 통과 확인
- [ ] 그래픽 테스트 통과 확인 (SCREEN, PSET, LINE)
- [ ] 전체 테스트 실행 (`bun test`)
- [ ] 실패한 테스트 0개 확인

## 문서

- **상세 문서**: `tests/TEST_SUMMARY.md`
- **완료 보고서**: `INTEGRATION_TESTS_COMPLETE.md`
- **프로젝트 가이드**: `CLAUDE.md`

## 연락처

테스트 관련 문의: 프로젝트 이슈 트래커 사용
