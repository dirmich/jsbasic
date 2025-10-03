10 REM Fractal Tree - Recursive Drawing
20 SCREEN 1
30 CLS
40 COLOR 2, 0
50 PRINT "Fractal Tree Demo"
60 PRINT "Drawing recursive tree..."
70 PRINT ""
80 REM Tree parameters
90 X = 160
100 Y = 180
110 LEN = 60
120 ANGLE = 90
130 DEPTH = 5
140 REM Draw trunk
150 GOSUB 1000
160 PRINT "Tree complete!"
170 PRINT "Depth: "; DEPTH
180 PRINT "Branches drawn"
190 END
1000 REM Recursive tree drawing subroutine
1010 REM Current: X, Y, LEN, ANGLE, DEPTH
1020 IF DEPTH = 0 THEN RETURN
1030 REM Calculate end point
1040 RAD = ANGLE * 3.14159 / 180
1050 X2 = X + LEN * COS(RAD)
1060 Y2 = Y - LEN * SIN(RAD)
1070 REM Draw line
1080 C = 2 + DEPTH
1090 LINE (X, Y)-(X2, Y2), C
1100 REM Save current position
1110 XS = X
1120 YS = Y
1130 LS = LEN
1140 AS = ANGLE
1150 DS = DEPTH
1160 REM Draw left branch
1170 X = X2
1180 Y = Y2
1190 LEN = LEN * 0.7
1200 ANGLE = ANGLE + 30
1210 DEPTH = DEPTH - 1
1220 GOSUB 1000
1230 REM Restore and draw right branch
1240 X = X2
1250 Y = Y2
1260 LEN = LS * 0.7
1270 ANGLE = AS - 30
1280 DEPTH = DS - 1
1290 GOSUB 1000
1300 REM Restore original values
1310 X = XS
1320 Y = YS
1330 LEN = LS
1340 ANGLE = AS
1350 DEPTH = DS
1360 RETURN
