10 REM Sprite Demo - GET/PUT Test
20 SCREEN 1
30 CLS
40 PRINT "Sprite Animation Demo"
50 PRINT "Drawing sprite and animating..."
60 PRINT ""
70 REM Draw a simple sprite (8x8 square)
80 LINE (10, 10)-(18, 18), 15, BF
90 PSET (12, 12), 12
100 PSET (16, 12), 12
110 LINE (12, 16)-(16, 16), 12
120 REM Save sprite to array
130 DIM SPRITE(64)
140 GET (10, 10)-(18, 18), SPRITE
150 PRINT "Sprite saved to array"
160 PRINT ""
170 REM Clear original
180 LINE (10, 10)-(18, 18), 0, BF
190 REM Animate sprite across screen
200 FOR X = 50 TO 250 STEP 5
210 REM Draw sprite using PSET mode
220 PUT (X, 50), SPRITE, PSET
230 REM Small delay
240 FOR D = 1 TO 50
250 NEXT D
260 REM Erase using XOR mode
270 PUT (X, 50), SPRITE, XOR
280 NEXT X
290 PRINT "Animation complete!"
300 PRINT ""
310 PRINT "Demonstrating PUT modes:"
320 PUT (50, 100), SPRITE, PSET
330 PRINT "PSET mode at (50,100)"
340 PUT (100, 100), SPRITE, AND
350 PRINT "AND mode at (100,100)"
360 PUT (150, 100), SPRITE, OR
370 PRINT "OR mode at (150,100)"
380 PUT (200, 100), SPRITE, XOR
390 PRINT "XOR mode at (200,100)"
400 END
