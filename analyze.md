# 6502 마이크로프로세서 BASIC 인터프리터 분석 보고서

## 1. 개요

`m6502.asm` 파일은 Microsoft에서 개발한 6502 마이크로프로세서용 BASIC 인터프리터 (버전 1.1)의 완전한 어셈블리 소스코드입니다.

### 주요 특징
- **제목**: BASIC M6502 8K VER 1.1 BY MICRO-SOFT
- **코드 크기**: 85,523 토큰 (약 6,600 라인)
- **대상 플랫폼**: 6502 마이크로프로세서
- **언어**: 6502 어셈블리어

## 2. 코드 구조 분석

### 2.1 시스템 설정 및 매크로 정의 (라인 1-244)
```assembly
REALIO=4    ; 플랫폼 설정 (4=APPLE, 3=COMMODORE, 2=OSI, 1=MOS TECH/KIM, 0=PDP-10 시뮬레이션)
INTPRC==1   ; 정수 배열 지원
ADDPRC==1   ; 추가 정밀도 지원
ROMSW==1    ; ROM 버전 여부
```

### 2.2 주요 섹션별 구조
1. **스위치 및 매크로 정의** (SWITCHES, MACROS)
2. **페이지 제로 변수** (PAGE ZERO)
3. **RAM 코드 영역** (RAM CODE)
4. **디스패치 테이블 및 예약어** (DISPATCH TABLES)
5. **메모리 관리 루틴** (STORAGE MANAGEMENT)
6. **에러 처리 및 입력** (ERROR HANDLER, INPUT)
7. **BASIC 명령어 구현**:
   - LIST, FOR, RESTORE, STOP, END
   - LOAD/SAVE, RUN, GOTO, GOSUB
   - IF...THEN, LET, PRINT, INPUT
   - 수학 함수 (SIN, COS, TAN, LOG 등)

### 2.3 메모리 레이아웃
```
LOW MEMORY:
- PAGE ZERO: 직접 메모리 영역 (가장 자주 사용되는 변수들)
- PAGE ONE: 스택 영역
- PAGE TWO+: 프로그램 저장 영역

STORAGE STRUCTURE:
[TXTTAB] → 프로그램 텍스트 저장
[VARTAB] → 단순 변수 (6바이트/변수)
[ARYTAB] → 배열 변수
[STREND] → 자유 공간
[FRETOP] → 문자열 공간
[MEMSIZ] → 최대 메모리 위치
```

## 3. 핵심 기능 분석

### 3.1 BASIC 언어 기능
- **변수 관리**: 문자열, 정수, 부동소수점 변수
- **배열 지원**: 다차원 배열 (INTPRC 플래그로 제어)
- **제어 구조**: FOR/NEXT, IF/THEN, GOSUB/RETURN
- **I/O 명령**: INPUT, PRINT, LIST
- **수학 함수**: 삼각함수, 로그함수, 지수함수

### 3.2 메모리 관리
- **가비지 컬렉션**: 문자열 메모리 자동 관리
- **동적 할당**: 변수 및 배열 공간 동적 할당
- **압축 기능**: 프로그램 압축 (COMPACTIFY)

### 3.3 부동소수점 수학 패키지
- **IEEE 754 유사 형식**: 6502용 부동소수점 연산
- **수학 함수**: SIN, COS, TAN, LOG, EXP, SQR, RND
- **정밀도 제어**: ADDPRC 플래그로 추가 정밀도 지원

## 4. 플랫폼별 구성

### 4.1 지원 플랫폼
- **REALIO=0**: PDP-10 시뮬레이션
- **REALIO=1**: MOS TECH KIM
- **REALIO=2**: OSI (Ohio Scientific)
- **REALIO=3**: Commodore
- **REALIO=4**: Apple
- **REALIO=5**: STM

### 4.2 조건부 컴파일
```assembly
IFE REALIO-4,<          ; Apple 전용 설정
    CQINLN==^O176547
    OUTCH=^O176755
    BUFLEN==240>
```

## 5. 기술적 특징

### 5.1 최적화 기법
- **페이지 제로 활용**: 자주 사용되는 변수를 페이지 제로에 배치
- **매크로 활용**: 반복되는 코드 패턴을 매크로로 정의
- **조건부 점프**: 6502의 상대 점프 한계를 우회하는 기법

### 5.2 코드 패턴
```assembly
DEFINE LDWD (WD),<      ; 16비트 로드 매크로
    LDA  WD
    LDY  <WD>+1>

DEFINE STWD (WD),<      ; 16비트 저장 매크로
    STA  WD
    STY  <WD>+1>
```

### 5.3 문자열 처리
- **동적 문자열**: 가변 길이 문자열 지원
- **연결 연산**: 문자열 연결 기능 (CAT 루틴)
- **메모리 압축**: 사용하지 않는 문자열 메모리 자동 회수

## 6. 보안 및 안정성

### 6.1 에러 처리
- **에러 코드 시스템**: 체계적인 에러 분류
- **복구 메커니즘**: 에러 발생 시 READY 상태로 복귀
- **입력 검증**: 사용자 입력 검증 및 파싱

### 6.2 메모리 보호
- **경계 검사**: 배열 및 문자열 경계 검사
- **스택 오버플로우 방지**: 스택 사용량 모니터링
- **가비지 컬렉션**: 메모리 누수 방지

## 7. JavaScript 변환 시 고려사항

### 7.1 아키텍처 차이점
- **메모리 모델**: 6502의 16비트 주소 공간 → JavaScript의 동적 메모리
- **데이터 타입**: 6502의 8비트 바이트 → JavaScript의 number/bigint
- **레지스터**: A, X, Y 레지스터 → JavaScript 변수로 에뮬레이션

### 7.2 변환 전략
1. **CPU 에뮬레이션**: 6502 CPU 상태 및 명령어 에뮬레이션
2. **메모리 맵핑**: 64KB 메모리 공간을 JavaScript 배열로 구현
3. **BASIC 인터프리터**: 고수준 BASIC 명령어 파서 및 실행기

### 7.3 성능 최적화 방향
- **JIT 컴파일**: 자주 사용되는 BASIC 코드의 JavaScript 변환
- **메모리 최적화**: TypedArray 활용한 메모리 표현
- **비동기 처리**: 긴 연산의 비동기 처리 지원

## 8. 결론

이 6502 BASIC 인터프리터는 1980년대 마이크로컴퓨터 시대의 뛰어난 시스템 소프트웨어 예시입니다. 제한된 메모리와 처리능력을 가진 8비트 프로세서에서 완전한 BASIC 언어 환경을 제공하는 정교한 설계를 보여줍니다.

JavaScript 변환을 위해서는 6502 어셈블리어의 저수준 연산을 JavaScript의 고수준 구조로 적절히 추상화하면서도, 원본의 정확한 동작을 보존하는 것이 핵심 과제가 될 것입니다.