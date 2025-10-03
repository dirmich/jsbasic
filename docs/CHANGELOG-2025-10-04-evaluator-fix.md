# Evaluator 함수 호출 순서 수정 완료

## 날짜
2025-10-04

## 변경 사항

### 🐛 버그 수정: 내장 함수 우선순위 문제

#### 문제 상황
- 18개의 evaluator 테스트가 실패 (ABS, INT, SIN, COS, TAN, SQR, LOG, RND 등 모든 내장 함수)
- `evaluateFunctionCall` 메서드에서 내장 함수 체크가 사용자 정의 함수 체크 **후에** 실행됨
- 사용자 정의 함수가 없을 때 내장 함수도 실행되지 않는 버그

#### 해결 방법
1. **함수 호출 우선순위 재정렬**:
   - 배열 접근 체크 (최우선)
   - **내장 함수 체크** (우선순위 2)
   - 사용자 정의 함수 체크 (우선순위 3)

2. **ExpressionEvaluator 생성자 개선**:
   - `userFunctions` 파라미터를 선택적으로 변경
   - 기본값으로 빈 Map 제공
   - 테스트 호환성 향상

#### 수정된 파일
- `src/basic/evaluator.ts`
  - `evaluateFunctionCall` 메서드 리팩토링
  - 내장 함수 체크를 사용자 정의 함수 체크보다 먼저 실행
  - `constructor` 시그니처 개선

#### 테스트 결과

**수정 전**:
- 632 pass, 18 fail, 9 skip

**수정 후**:
- **650 pass, 0 fail, 9 skip** ✅

**개선 사항**:
- 모든 내장 함수 테스트 통과
- ABS, INT, SIN, COS, TAN, SQR, LOG, RND 함수 정상 동작 확인
- LEN, VAL, STR$, CHR$, ASC, LEFT$, RIGHT$, MID$ 문자열 함수 정상 동작 확인
- 사용자 정의 함수(DEF FN)와 내장 함수 모두 정상 작동

## 기술적 세부사항

### 수정 전 코드 흐름
```typescript
1. 배열 접근 체크
2. 사용자 정의 함수 체크 (userFunc)
3. 인자 평가 (args)
4. 내장 함수 체크 ❌ (userFunc가 없으면 도달하지 못함)
```

### 수정 후 코드 흐름
```typescript
1. 배열 접근 체크
2. 인자 평가 (args) ✅ (미리 평가)
3. 내장 함수 체크 ✅ (우선 실행)
4. 사용자 정의 함수 체크 ✅ (fallback)
```

## 영향 범위
- ✅ 모든 내장 함수가 정상 동작
- ✅ 사용자 정의 함수(DEF FN)도 정상 동작
- ✅ 기존 테스트 100% 통과
- ✅ 타입 안정성 유지

## 다음 단계
- Phase 10: 테스트 & 문서화 진행
- 그래픽 시스템 문서화
- development-status.md 업데이트
