10 REM ========================================
20 REM 틱택토 게임 (Tic-Tac-Toe)
30 REM 3x3 보드에서 O와 X가 대결!
40 REM ========================================
50 
60 PRINT "==============================================="
70 PRINT "              틱택토 게임"
80 PRINT "==============================================="
90 PRINT
100 
110 REM 게임 보드 초기화 (1-9로 번호 표시)
120 DIM BOARD$(9)
130 FOR I = 1 TO 9
140 BOARD$(I) = STR$(I)
150 NEXT I
160 
170 PLAYER$ = "X"
180 MOVES = 0
190 
200 REM 게임 메인 루프
210 GOSUB 500  REM 보드 출력
220 
230 IF MOVES = 9 THEN 450  REM 무승부 확인
240 
250 PRINT
260 PRINT "플레이어 "; PLAYER$; "의 차례입니다."
270 INPUT "위치를 선택하세요 (1-9): "; POS
280 
290 REM 입력 검증
300 IF POS < 1 OR POS > 9 THEN 270
310 IF BOARD$(POS) = "X" OR BOARD$(POS) = "O" THEN 330
320 GOTO 350
330 PRINT "이미 선택된 위치입니다!"
340 GOTO 270
350 
360 REM 보드에 마크 표시
370 BOARD$(POS) = PLAYER$
380 MOVES = MOVES + 1
390 
400 REM 승리 조건 확인
410 GOSUB 600
420 IF WIN = 1 THEN 470
430 
440 REM 플레이어 변경
450 IF PLAYER$ = "X" THEN PLAYER$ = "O": GOTO 210
460 PLAYER$ = "X"
470 GOTO 210
480 
490 REM 무승부
500 GOSUB 500
510 PRINT
520 PRINT "무승부입니다!"
530 GOTO 490
540 
550 REM 승리
560 GOSUB 500
570 PRINT
580 PRINT "플레이어 "; PLAYER$; "이(가) 승리했습니다!"
590 GOTO 490
600 
610 REM 게임 종료
620 INPUT "다시 하시겠습니까? (Y/N): "; AGAIN$
630 IF AGAIN$ = "Y" OR AGAIN$ = "y" THEN 120
640 PRINT "게임을 종료합니다!"
650 END
660 
670 REM 서브루틴: 보드 출력
680 PRINT
690 PRINT " "; BOARD$(1); " | "; BOARD$(2); " | "; BOARD$(3)
700 PRINT "---|---|---"
710 PRINT " "; BOARD$(4); " | "; BOARD$(5); " | "; BOARD$(6)
720 PRINT "---|---|---"
730 PRINT " "; BOARD$(7); " | "; BOARD$(8); " | "; BOARD$(9)
740 RETURN
750 
760 REM 서브루틴: 승리 조건 확인
770 WIN = 0
780 
790 REM 가로 체크
800 IF BOARD$(1) = BOARD$(2) AND BOARD$(2) = BOARD$(3) THEN WIN = 1
810 IF BOARD$(4) = BOARD$(5) AND BOARD$(5) = BOARD$(6) THEN WIN = 1
820 IF BOARD$(7) = BOARD$(8) AND BOARD$(8) = BOARD$(9) THEN WIN = 1
830 
840 REM 세로 체크
850 IF BOARD$(1) = BOARD$(4) AND BOARD$(4) = BOARD$(7) THEN WIN = 1
860 IF BOARD$(2) = BOARD$(5) AND BOARD$(5) = BOARD$(8) THEN WIN = 1
870 IF BOARD$(3) = BOARD$(6) AND BOARD$(6) = BOARD$(9) THEN WIN = 1
880 
890 REM 대각선 체크
900 IF BOARD$(1) = BOARD$(5) AND BOARD$(5) = BOARD$(9) THEN WIN = 1
910 IF BOARD$(3) = BOARD$(5) AND BOARD$(5) = BOARD$(7) THEN WIN = 1
920 
930 RETURN