10 REM ========================================
20 REM 숫자 맞추기 게임
30 REM 1부터 100 사이의 숫자를 맞춰보세요!
40 REM ========================================
50 
60 PRINT "==============================================="
70 PRINT "           숫자 맞추기 게임"
80 PRINT "==============================================="
90 PRINT
100 PRINT "1부터 100 사이의 숫자를 생각했습니다."
110 PRINT "몇 번 만에 맞출 수 있을까요?"
120 PRINT
130 
140 REM 난수 생성 (1-100)
150 ANSWER = INT(RND(1) * 100) + 1
160 TRIES = 0
170 
180 REM 게임 루프
190 INPUT "숫자를 입력하세요 (1-100): "; GUESS
200 TRIES = TRIES + 1
210 
220 REM 입력 검증
230 IF GUESS < 1 OR GUESS > 100 THEN 280
240 
250 REM 답 확인
260 IF GUESS = ANSWER THEN 320
270 IF GUESS < ANSWER THEN 300
280 PRINT "너무 큽니다! 더 작은 수를 시도해보세요."
290 GOTO 310
300 PRINT "너무 작습니다! 더 큰 수를 시도해보세요."
310 GOTO 190
320 
330 REM 성공 메시지
340 PRINT
350 PRINT "축하합니다! 정답입니다!"
360 PRINT "정답은"; ANSWER; "이었고,"
370 PRINT "총"; TRIES; "번 만에 맞추셨습니다!"
380 PRINT
390 
400 REM 평가
410 IF TRIES <= 5 THEN PRINT "대단합니다! 정말 빠르게 찾으셨네요!"
420 IF TRIES > 5 AND TRIES <= 10 THEN PRINT "좋은 결과입니다!"
430 IF TRIES > 10 THEN PRINT "다음번엔 더 빨리 찾아보세요!"
440 PRINT
450 
460 INPUT "다시 하시겠습니까? (Y/N): "; AGAIN$
470 IF AGAIN$ = "Y" OR AGAIN$ = "y" THEN 140
480 
490 PRINT "게임을 종료합니다. 수고하셨습니다!"
500 END