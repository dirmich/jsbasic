# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

6502 BASIC 에뮬레이터 - Microsoft 6502 BASIC 1.1 인터프리터의 완전한 TypeScript/JavaScript 구현체입니다.

## 필수 개발 명령어

### 빌드 및 실행

```bash
# 개발 서버 실행 (핫 리로드)
bun run dev

# 웹 애플리케이션 빌드 후 실행
bun run serve:web  # http://localhost:8080에서 접속

# 프로덕션 빌드
bun run build:web

# 개발 빌드 (소스맵 포함)
bun run build:web:dev

# 빌드 분석
bun run build:analyze
```

### 테스트

```bash
# 모든 테스트 실행
bun test

# 특정 테스트 파일 실행
bun test tests/cpu/cpu.test.ts

# 지속 테스트 (파일 변경 감지)
bun test --watch

# 테스트 커버리지
bun test --coverage
```

### 타입 체크 및 린팅

```bash
# TypeScript 타입 체크 (컴파일 없음)
bun run lint
```

## 핵심 아키텍처

### 계층 구조

```
1. System Layer (src/system/)
   └─ BasicEmulator: 전체 시스템 통합 클래스
      ├─ CPU6502: 6502 프로세서 에뮬레이션
      ├─ BasicInterpreter: BASIC 언어 인터프리터
      ├─ MemoryManager: 메모리 관리 시스템
      └─ Terminal: 입출력 터미널

2. Web Layer (src/web/)
   ├─ WebEmulator: 브라우저용 에뮬레이터 래퍼
   └─ main.ts: 웹 번들링 엔트리포인트
```

### 모듈 간 상호작용

- **BasicEmulator**가 중앙 컨트롤러 역할을 수행
- **EventEmitter** 기반 비동기 통신 (터미널 ↔ 인터프리터)
- **MemoryManager**를 통한 CPU와 BASIC 간 메모리 공유
- **Parser → AST → Interpreter** 파이프라인으로 BASIC 코드 실행

### 주요 설계 패턴

1. **이벤트 기반 아키텍처**: 컴포넌트 간 느슨한 결합
2. **AST 기반 인터프리터**: 토큰화 → 파싱 → 실행의 명확한 분리
3. **메모리 보호 시스템**: ROM/RAM 영역 분리, 뱅킹 지원
4. **크로스 플랫폼 호환성**: Node.js/브라우저 환경 모두 지원

## TypeScript 설정 특이사항

```json
{
  "compilerOptions": {
    "module": "Preserve",           // 최신 모듈 시스템
    "verbatimModuleSyntax": true,   // import type 명시 필요
    "noEmit": true,                 // Bun이 직접 변환
    "strict": true,                 // 모든 엄격 모드 활성화
    "exactOptionalPropertyTypes": true,  // undefined 명시 필요
    "noUncheckedIndexedAccess": true    // 배열/객체 접근 시 undefined 체크
  }
}
```

## 중요 구현 세부사항

### DOM 호환성 처리
- `src/ui/components.ts`의 `safeCreateElement()` 함수로 Node.js 환경에서도 동작
- Node.js 환경에서는 더미 DOM 객체 제공

### BASIC 프로그램 실행 흐름
1. **파싱**: `Parser`가 BASIC 코드를 AST로 변환
2. **저장**: 라인 번호가 있으면 프로그램 메모리에 저장
3. **실행**: `BasicInterpreter`가 AST를 해석하여 실행
4. **입출력**: `Terminal` 이벤트로 사용자 상호작용 처리

### 메모리 맵
- `0x0000-0x7FFF`: RAM (사용자 프로그램 및 변수)
- `0x8000-0xBFFF`: 확장 RAM
- `0xC000-0xFFFF`: ROM/IO 영역
- `0xFFFC-0xFFFD`: 리셋 벡터

### 성능 최적화
- **ObjectPool**: 자주 생성/삭제되는 객체 재활용
- **PerformanceMonitor**: 실시간 성능 추적 및 보고
- **MobileOptimizer**: 모바일 환경 특화 최적화 (터치, 배터리 절약)

## 테스트 작성 패턴

```typescript
import { describe, test, expect, beforeEach } from 'bun:test';

describe('ComponentName', () => {
  let instance: ComponentClass;

  beforeEach(() => {
    // Happy DOM을 사용한 DOM 모킹
    instance = new ComponentClass();
  });

  test('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

## 빌드 시스템

- **Bun 번들러** 사용 (build.js)
- 자동 코드 분할 (splitting: true)
- 프로덕션 빌드 시 console.log 제거
- 번들 크기 목표: < 500KB
- 빌드 메타데이터 자동 생성 (build-info.json)

## 파일 시스템

- 브라우저: localStorage 사용 (`basic_program_${filename}`)
- Node.js: 메모리 내 저장 (추후 파일 시스템 지원 가능)

## 디버깅 도구

- **CPU 디버거**: 브레이크포인트, 단계별 실행, 메모리 덤프
- **BASIC 디버거**: 라인별 추적, 변수 관찰
- **시스템 정보**: `getDebugInfo()` 메서드로 전체 상태 확인

## 주의사항

1. **import type 사용**: TypeScript `verbatimModuleSyntax` 설정으로 타입 import는 명시 필요
2. **undefined 체크**: 배열/객체 접근 시 항상 undefined 가능성 처리
3. **이벤트 리스너**: EventEmitter 사용 시 메모리 누수 방지 위해 cleanup 필수
4. **크로스 플랫폼**: `typeof window !== 'undefined'` 체크로 환경 구분