# 그래픽 시스템 설계 문서

## 개요

6502 BASIC 에뮬레이터에 그래픽 기능을 추가하여 시각적 프로그래밍과 게임 개발을 지원합니다.

## 목표

### 기능 목표
- Microsoft BASIC 그래픽 명령어 호환
- Canvas API 기반 고성능 렌더링
- 레트로 컴퓨팅 스타일 유지
- 크로스 브라우저 호환성

### 성능 목표
- 60 FPS 렌더링
- < 16ms 프레임 시간
- 메모리 효율적인 픽셀 버퍼

## 시스템 아키텍처

### 계층 구조

```
┌─────────────────────────────────┐
│   BASIC 명령어 레이어            │
│   (PSET, LINE, CIRCLE, etc.)    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Graphics Engine                │
│   - 도형 렌더링                  │
│   - 색상 관리                    │
│   - 좌표 변환                    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Display Manager                │
│   - 화면 모드                    │
│   - 더블 버퍼링                  │
│   - 뷰포트 관리                  │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Canvas Renderer                │
│   - HTML5 Canvas API             │
│   - WebGL (선택적)              │
└─────────────────────────────────┘
```

## 그래픽 명령어

### 1. SCREEN - 화면 모드 설정

```basic
SCREEN mode [, colorswitch] [, apage] [, vpage]
```

**지원 모드**:
- `SCREEN 0`: 텍스트 모드 (80x25, 16색)
- `SCREEN 1`: 저해상도 (320x200, 4색)
- `SCREEN 2`: 중해상도 (640x200, 2색)
- `SCREEN 7`: 고해상도 (320x200, 16색)
- `SCREEN 9`: 고해상도 (640x350, 16색)

**구현**:
```typescript
interface ScreenMode {
  mode: number;
  width: number;
  height: number;
  colors: number;
  textRows: number;
  textCols: number;
  pixelAspectRatio: number;
}

class DisplayManager {
  private currentMode: ScreenMode;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  setScreenMode(mode: number): void;
  getScreenMode(): ScreenMode;
}
```

### 2. PSET - 픽셀 그리기

```basic
PSET (x, y) [, color]
PRESET (x, y) [, color]  ' 배경색으로 설정
```

**구현**:
```typescript
class GraphicsEngine {
  pset(x: number, y: number, color?: number): void {
    // 좌표 유효성 검사
    if (!this.isValidCoordinate(x, y)) {
      throw new BasicError('Illegal function call');
    }

    // 색상 기본값
    const finalColor = color ?? this.foregroundColor;

    // 픽셀 버퍼에 쓰기
    this.setPixel(x, y, finalColor);
  }
}
```

### 3. LINE - 선 그리기

```basic
LINE [(x1, y1)]-(x2, y2) [, color] [, B[F]]
```

**옵션**:
- `B`: Box (사각형)
- `BF`: Box Filled (채워진 사각형)

**구현**:
```typescript
class GraphicsEngine {
  line(
    x1: number, y1: number,
    x2: number, y2: number,
    color?: number,
    boxStyle?: 'B' | 'BF'
  ): void {
    if (boxStyle === 'BF') {
      this.fillRect(x1, y1, x2, y2, color);
    } else if (boxStyle === 'B') {
      this.drawRect(x1, y1, x2, y2, color);
    } else {
      this.drawLine(x1, y1, x2, y2, color);
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, color: number): void {
    // Bresenham 알고리즘
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.pset(x1, y1, color);

      if (x1 === x2 && y1 === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
    }
  }
}
```

### 4. CIRCLE - 원 그리기

```basic
CIRCLE (x, y), radius [, color] [, start] [, end] [, aspect]
```

**구현**:
```typescript
class GraphicsEngine {
  circle(
    centerX: number,
    centerY: number,
    radius: number,
    color?: number,
    startAngle?: number,
    endAngle?: number,
    aspect?: number
  ): void {
    const finalColor = color ?? this.foregroundColor;
    const aspectRatio = aspect ?? 1.0;

    // Midpoint circle 알고리즘
    this.drawCircle(centerX, centerY, radius, finalColor, aspectRatio);
  }

  private drawCircle(cx: number, cy: number, r: number, color: number, aspect: number): void {
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;

    while (x <= y) {
      this.drawCirclePoints(cx, cy, x, y, color, aspect);

      if (d < 0) {
        d = d + 4 * x + 6;
      } else {
        d = d + 4 * (x - y) + 10;
        y--;
      }
      x++;
    }
  }

  private drawCirclePoints(cx: number, cy: number, x: number, y: number, color: number, aspect: number): void {
    const ay = Math.round(y * aspect);
    const ax = Math.round(x * aspect);

    this.pset(cx + x, cy + ay, color);
    this.pset(cx - x, cy + ay, color);
    this.pset(cx + x, cy - ay, color);
    this.pset(cx - x, cy - ay, color);
    this.pset(cx + ax, cy + y, color);
    this.pset(cx - ax, cy + y, color);
    this.pset(cx + ax, cy - y, color);
    this.pset(cx - ax, cy - y, color);
  }
}
```

### 5. PAINT - 영역 채우기

```basic
PAINT (x, y) [, paintColor] [, borderColor]
```

**구현**:
```typescript
class GraphicsEngine {
  paint(x: number, y: number, paintColor?: number, borderColor?: number): void {
    const fillColor = paintColor ?? this.foregroundColor;
    const border = borderColor ?? this.foregroundColor;

    // Flood fill 알고리즘
    this.floodFill(x, y, fillColor, border);
  }

  private floodFill(x: number, y: number, fillColor: number, borderColor: number): void {
    const targetColor = this.getPixel(x, y);

    if (targetColor === fillColor || targetColor === borderColor) {
      return;
    }

    const stack: Array<{x: number, y: number}> = [{x, y}];

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const currentColor = this.getPixel(pos.x, pos.y);

      if (currentColor !== targetColor || currentColor === borderColor) {
        continue;
      }

      this.pset(pos.x, pos.y, fillColor);

      // 4방향 탐색
      stack.push({x: pos.x + 1, y: pos.y});
      stack.push({x: pos.x - 1, y: pos.y});
      stack.push({x: pos.x, y: pos.y + 1});
      stack.push({x: pos.x, y: pos.y - 1});
    }
  }
}
```

### 6. COLOR - 색상 설정

```basic
COLOR [foreground] [, background] [, border]
```

**구현**:
```typescript
class GraphicsEngine {
  private foregroundColor: number = 15; // 흰색
  private backgroundColor: number = 0;  // 검정색
  private borderColor: number = 0;

  setColor(foreground?: number, background?: number, border?: number): void {
    if (foreground !== undefined) {
      this.foregroundColor = this.validateColor(foreground);
    }
    if (background !== undefined) {
      this.backgroundColor = this.validateColor(background);
    }
    if (border !== undefined) {
      this.borderColor = this.validateColor(border);
    }
  }

  private validateColor(color: number): number {
    const maxColor = this.currentMode.colors - 1;
    if (color < 0 || color > maxColor) {
      throw new BasicError('Illegal function call');
    }
    return Math.floor(color);
  }
}
```

### 7. CLS - 화면 지우기

```basic
CLS [mode]
```

**구현**:
```typescript
class GraphicsEngine {
  cls(mode?: number): void {
    if (mode === undefined || mode === 0) {
      // 전체 화면 지우기
      this.clearScreen();
    } else if (mode === 1) {
      // 그래픽 뷰포트만 지우기
      this.clearGraphics();
    } else if (mode === 2) {
      // 텍스트 뷰포트만 지우기
      this.clearText();
    }
  }

  private clearScreen(): void {
    this.ctx.fillStyle = this.getColorString(this.backgroundColor);
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
```

## 색상 팔레트 시스템

### CGA 16색 팔레트 (기본)

```typescript
const CGA_PALETTE: string[] = [
  '#000000', // 0: 검정
  '#0000AA', // 1: 파랑
  '#00AA00', // 2: 초록
  '#00AAAA', // 3: 청록
  '#AA0000', // 4: 빨강
  '#AA00AA', // 5: 마젠타
  '#AA5500', // 6: 갈색
  '#AAAAAA', // 7: 밝은 회색
  '#555555', // 8: 어두운 회색
  '#5555FF', // 9: 밝은 파랑
  '#55FF55', // 10: 밝은 초록
  '#55FFFF', // 11: 밝은 청록
  '#FF5555', // 12: 밝은 빨강
  '#FF55FF', // 13: 밝은 마젠타
  '#FFFF55', // 14: 노랑
  '#FFFFFF'  // 15: 흰색
];

class ColorManager {
  private palette: string[] = CGA_PALETTE;

  getColorString(colorIndex: number): string {
    return this.palette[colorIndex % this.palette.length];
  }

  setPalette(newPalette: string[]): void {
    this.palette = [...newPalette];
  }
}
```

## 메모리 관리

### 픽셀 버퍼

```typescript
class PixelBuffer {
  private buffer: Uint8Array;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8Array(width * height);
  }

  setPixel(x: number, y: number, color: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.buffer[y * this.width + x] = color;
    }
  }

  getPixel(x: number, y: number): number {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.buffer[y * this.width + x];
    }
    return 0;
  }

  clear(color: number = 0): void {
    this.buffer.fill(color);
  }
}
```

### 더블 버퍼링

```typescript
class DisplayManager {
  private frontBuffer: PixelBuffer;
  private backBuffer: PixelBuffer;

  swap(): void {
    [this.frontBuffer, this.backBuffer] = [this.backBuffer, this.frontBuffer];
  }

  render(): void {
    // 백 버퍼를 Canvas에 렌더링
    const imageData = this.ctx.createImageData(this.width, this.height);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const color = this.backBuffer.getPixel(x, y);
        const rgb = this.colorManager.getRGB(color);
        const offset = (y * this.width + x) * 4;

        imageData.data[offset] = rgb.r;
        imageData.data[offset + 1] = rgb.g;
        imageData.data[offset + 2] = rgb.b;
        imageData.data[offset + 3] = 255;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }
}
```

## 성능 최적화

### 1. 더티 렉트 추적

```typescript
class DirtyRectTracker {
  private dirtyRects: Array<{x: number, y: number, w: number, h: number}> = [];

  markDirty(x: number, y: number, w: number, h: number): void {
    this.dirtyRects.push({x, y, w, h});
  }

  getDirtyRegions(): Array<{x: number, y: number, w: number, h: number}> {
    return this.dirtyRects;
  }

  clear(): void {
    this.dirtyRects = [];
  }
}
```

### 2. 부분 렌더링

```typescript
class DisplayManager {
  renderDirty(): void {
    const dirtyRegions = this.dirtyTracker.getDirtyRegions();

    for (const region of dirtyRegions) {
      this.renderRegion(region.x, region.y, region.w, region.h);
    }

    this.dirtyTracker.clear();
  }
}
```

### 3. Canvas 최적화

```typescript
class CanvasOptimizer {
  optimizeCanvas(canvas: HTMLCanvasElement): void {
    // 하드웨어 가속 활성화
    canvas.style.transform = 'translateZ(0)';

    // 이미지 스무딩 비활성화 (픽셀 아트)
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // 픽셀 비율 조정
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
}
```

## 통합 계획

### Phase 1: 기초 구조 (1-2일)
- [ ] GraphicsEngine 클래스 구현
- [ ] DisplayManager 클래스 구현
- [ ] PixelBuffer 구현
- [ ] ColorManager 구현

### Phase 2: 기본 명령어 (2-3일)
- [ ] SCREEN 명령어
- [ ] PSET/PRESET 명령어
- [ ] COLOR 명령어
- [ ] CLS 명령어

### Phase 3: 도형 그리기 (2-3일)
- [ ] LINE 명령어
- [ ] CIRCLE 명령어
- [ ] PAINT 명령어

### Phase 4: 최적화 및 테스트 (2-3일)
- [ ] 더블 버퍼링 구현
- [ ] 더티 렉트 추적
- [ ] 성능 벤치마크
- [ ] 유닛 테스트 작성

### Phase 5: 예제 및 문서 (1-2일)
- [ ] 그래픽 예제 프로그램
- [ ] 사용자 가이드 업데이트
- [ ] API 문서 작성

## 예제 프로그램

### 예제 1: 픽셀 아트

```basic
10 SCREEN 1
20 CLS
30 COLOR 14, 1
40 FOR Y = 0 TO 199
50   FOR X = 0 TO 319
60     C = INT(RND * 4)
70     PSET (X, Y), C
80   NEXT X
90 NEXT Y
```

### 예제 2: 선 그리기

```basic
10 SCREEN 1
20 CLS
30 FOR I = 0 TO 319 STEP 10
40   LINE (0, 0)-(I, 199), I MOD 4
50 NEXT I
```

### 예제 3: 원 그리기

```basic
10 SCREEN 1
20 CLS
30 FOR R = 10 TO 100 STEP 10
40   CIRCLE (160, 100), R, R / 10 MOD 4
50 NEXT R
```

### 예제 4: 간단한 애니메이션

```basic
10 SCREEN 1
20 CLS
30 X = 160: Y = 100: DX = 2: DY = 1
40 PSET (X, Y), 15
50 X = X + DX: Y = Y + DY
60 IF X < 0 OR X > 319 THEN DX = -DX
70 IF Y < 0 OR Y > 199 THEN DY = -DY
80 GOTO 40
```

## 참고 자료

- Microsoft BASIC 그래픽 명령어 레퍼런스
- HTML5 Canvas API 문서
- Bresenham 알고리즘 구현
- CGA/EGA 색상 팔레트 사양
