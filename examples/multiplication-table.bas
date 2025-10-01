100 REM === 구구단 출력 프로그램 ===
110 PRINT "구구단 출력 프로그램"
120 PRINT "===================="
130 PRINT ""

140 REM 출력 방식 선택
150 PRINT "1. 특정 단 출력"
160 PRINT "2. 전체 구구단 출력"
170 PRINT ""
180 INPUT "선택하세요 (1 또는 2): "; CHOICE

190 IF CHOICE = 1 THEN GOTO 300
200 IF CHOICE = 2 THEN GOTO 500
210 PRINT "잘못된 선택입니다. 다시 시도해주세요."
220 GOTO 140

300 REM 특정 단 출력
310 INPUT "몇 단을 출력할까요? (1-9): "; DAN
320 IF DAN < 1 OR DAN > 9 THEN PRINT "1부터 9까지만 입력하세요.": GOTO 310

330 PRINT ""
340 PRINT DAN; "단:"
350 PRINT "----"
360 FOR I = 1 TO 9
370   PRINT DAN; " × "; I; " = "; DAN * I
380 NEXT I
390 GOTO 620

500 REM 전체 구구단 출력
510 PRINT ""
520 PRINT "전체 구구단:"
530 PRINT "============"
540 FOR DAN = 1 TO 9
550   PRINT ""
560   PRINT DAN; "단:"
570   PRINT "----"
580   FOR I = 1 TO 9
590     PRINT "  "; DAN; " × "; I; " = "; DAN * I
600   NEXT I
610 NEXT DAN

620 REM 프로그램 종료
630 PRINT ""
640 PRINT "구구단 출력이 완료되었습니다."
650 END