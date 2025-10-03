/**
 * Graphics Engine Implementation
 *
 * 그래픽 명령어 실행 엔진
 */

import type {
  GraphicsEngineInterface,
  GraphicsState,
  ScreenMode,
  LineOptions,
  CircleOptions,
  PaintOptions
} from '@/types/graphics';
import { SCREEN_MODES } from '@/types/graphics';
import type { PixelBufferInterface } from '@/types/graphics';
import type { ColorManagerInterface } from '@/types/graphics';
import { BasicError, ERROR_CODES } from '@/utils/errors';

export class GraphicsEngine implements GraphicsEngineInterface {
  private currentMode: ScreenMode;
  private foregroundColor: number = 15; // 흰색
  private backgroundColor: number = 0;  // 검정색
  private borderColor: number = 0;
  private lastX: number = 0;
  private lastY: number = 0;

  private readonly buffer: PixelBufferInterface;
  private readonly colorManager: ColorManagerInterface;

  constructor(buffer: PixelBufferInterface, colorManager: ColorManagerInterface) {
    this.buffer = buffer;
    this.colorManager = colorManager;
    this.currentMode = SCREEN_MODES[1]!; // 기본 모드: 320x200
  }

  /**
   * 화면 모드 설정
   */
  setScreenMode(mode: number): void {
    const screenMode = SCREEN_MODES[mode];

    if (!screenMode) {
      throw new BasicError(
        `Invalid screen mode: ${mode}`,
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    this.currentMode = screenMode;

    // 버퍼 크기가 다르면 클리어
    if (this.buffer.getWidth() !== screenMode.width ||
        this.buffer.getHeight() !== screenMode.height) {
      this.buffer.clear(this.backgroundColor);
    }
  }

  /**
   * 현재 화면 모드 가져오기
   */
  getScreenMode(): ScreenMode {
    return { ...this.currentMode };
  }

  /**
   * 픽셀 설정 (PSET)
   */
  pset(x: number, y: number, color?: number): void {
    if (!this.isValidCoordinate(x, y)) {
      throw new BasicError(
        'Illegal function call',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    const finalColor = color !== undefined ?
      this.colorManager.validateColor(color) :
      this.foregroundColor;

    this.buffer.setPixel(Math.floor(x), Math.floor(y), finalColor);
    this.lastX = x;
    this.lastY = y;
  }

  /**
   * 픽셀 지우기 (PRESET)
   */
  preset(x: number, y: number, color?: number): void {
    const finalColor = color !== undefined ?
      this.colorManager.validateColor(color) :
      this.backgroundColor;

    this.pset(x, y, finalColor);
  }

  /**
   * 선 그리기 (LINE)
   */
  line(x1: number, y1: number, x2: number, y2: number, options?: LineOptions): void {
    const color = options?.color !== undefined ?
      this.colorManager.validateColor(options.color) :
      this.foregroundColor;

    const style = options?.style;

    if (style === 'BF') {
      // 채워진 사각형
      this.fillRect(x1, y1, x2, y2, color);
    } else if (style === 'B') {
      // 빈 사각형
      this.drawRect(x1, y1, x2, y2, color);
    } else {
      // 선
      this.drawLine(x1, y1, x2, y2, color);
    }

    this.lastX = x2;
    this.lastY = y2;
  }

  /**
   * 원 그리기 (CIRCLE)
   */
  circle(centerX: number, centerY: number, radius: number, options?: CircleOptions): void {
    if (radius < 0) {
      throw new BasicError(
        'Illegal function call',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    const color = options?.color !== undefined ?
      this.colorManager.validateColor(options.color) :
      this.foregroundColor;

    const startAngle = options?.startAngle ?? 0;
    const endAngle = options?.endAngle ?? Math.PI * 2;
    const aspect = options?.aspect ?? 1.0;

    if (startAngle === 0 && endAngle === Math.PI * 2) {
      // 완전한 원
      this.drawCircle(centerX, centerY, radius, color, aspect);
    } else {
      // 호(arc)
      this.drawArc(centerX, centerY, radius, startAngle, endAngle, color, aspect);
    }

    this.lastX = centerX;
    this.lastY = centerY;
  }

  /**
   * 영역 채우기 (PAINT)
   */
  paint(x: number, y: number, options?: PaintOptions): void {
    if (!this.isValidCoordinate(x, y)) {
      throw new BasicError(
        'Illegal function call',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    const paintColor = options?.paintColor !== undefined ?
      this.colorManager.validateColor(options.paintColor) :
      this.foregroundColor;

    const borderColor = options?.borderColor !== undefined ?
      this.colorManager.validateColor(options.borderColor) :
      paintColor;

    this.floodFill(Math.floor(x), Math.floor(y), paintColor, borderColor);
  }

  /**
   * 색상 설정 (COLOR)
   */
  setColor(foreground?: number, background?: number, border?: number): void {
    if (foreground !== undefined) {
      this.foregroundColor = this.colorManager.validateColor(foreground);
    }
    if (background !== undefined) {
      this.backgroundColor = this.colorManager.validateColor(background);
    }
    if (border !== undefined) {
      this.borderColor = this.colorManager.validateColor(border);
    }
  }

  /**
   * 픽셀 값 가져오기
   */
  getPixel(x: number, y: number): number {
    if (!this.isValidCoordinate(x, y)) {
      return 0;
    }
    return this.buffer.getPixel(Math.floor(x), Math.floor(y));
  }

  /**
   * 화면 지우기 (CLS)
   */
  cls(mode?: number): void {
    if (mode === undefined || mode === 0) {
      // 전체 화면 지우기
      this.buffer.clear(this.backgroundColor);
    } else if (mode === 1) {
      // 그래픽 뷰포트만 지우기 (현재는 전체와 동일)
      this.buffer.clear(this.backgroundColor);
    } else if (mode === 2) {
      // 텍스트 뷰포트만 지우기 (향후 구현)
      // TODO: 텍스트 영역만 지우기
    }
  }

  /**
   * 상태 가져오기
   */
  getState(): GraphicsState {
    return {
      currentMode: { ...this.currentMode },
      foregroundColor: this.foregroundColor,
      backgroundColor: this.backgroundColor,
      borderColor: this.borderColor,
      lastX: this.lastX,
      lastY: this.lastY
    };
  }

  /**
   * 상태 설정
   */
  setState(state: GraphicsState): void {
    this.currentMode = { ...state.currentMode };
    this.foregroundColor = state.foregroundColor;
    this.backgroundColor = state.backgroundColor;
    this.borderColor = state.borderColor;
    this.lastX = state.lastX;
    this.lastY = state.lastY;
  }

  // ===================================================================
  // Private 메서드 - 그리기 알고리즘
  // ===================================================================

  /**
   * 선 그리기 - Bresenham 알고리즘
   */
  private drawLine(x1: number, y1: number, x2: number, y2: number, color: number): void {
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);
    x2 = Math.floor(x2);
    y2 = Math.floor(y2);

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

  /**
   * 사각형 그리기
   */
  private drawRect(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    // 상단
    this.drawLine(minX, minY, maxX, minY, color);
    // 하단
    this.drawLine(minX, maxY, maxX, maxY, color);
    // 좌측
    this.drawLine(minX, minY, minX, maxY, color);
    // 우측
    this.drawLine(maxX, minY, maxX, maxY, color);
  }

  /**
   * 채워진 사각형
   */
  private fillRect(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const minX = Math.floor(Math.min(x1, x2));
    const maxX = Math.floor(Math.max(x1, x2));
    const minY = Math.floor(Math.min(y1, y2));
    const maxY = Math.floor(Math.max(y1, y2));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.isValidCoordinate(x, y)) {
          this.buffer.setPixel(x, y, color);
        }
      }
    }
  }

  /**
   * 원 그리기 - Midpoint Circle 알고리즘
   */
  private drawCircle(cx: number, cy: number, radius: number, color: number, aspect: number): void {
    let x = 0;
    let y = Math.floor(radius);
    let d = 3 - 2 * radius;

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

  /**
   * 원의 8개 대칭점 그리기
   */
  private drawCirclePoints(
    cx: number,
    cy: number,
    x: number,
    y: number,
    color: number,
    aspect: number
  ): void {
    const ay = Math.round(y * aspect);
    const ax = Math.round(x * aspect);

    // 8개 대칭점
    this.pset(cx + x, cy + ay, color);
    this.pset(cx - x, cy + ay, color);
    this.pset(cx + x, cy - ay, color);
    this.pset(cx - x, cy - ay, color);
    this.pset(cx + ax, cy + y, color);
    this.pset(cx - ax, cy + y, color);
    this.pset(cx + ax, cy - y, color);
    this.pset(cx - ax, cy - y, color);
  }

  /**
   * 호(arc) 그리기
   */
  private drawArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: number,
    aspect: number
  ): void {
    // 각도를 작은 단계로 나누어 그리기
    const steps = Math.max(Math.floor(radius * 2), 32);
    const angleStep = (endAngle - startAngle) / steps;

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + angleStep * i;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle) * aspect;
      this.pset(x, y, color);
    }
  }

  /**
   * Flood Fill 알고리즘
   */
  private floodFill(x: number, y: number, fillColor: number, borderColor: number): void {
    const targetColor = this.buffer.getPixel(x, y);

    // 이미 채울 색이거나 경계선이면 중단
    if (targetColor === fillColor || targetColor === borderColor) {
      return;
    }

    // 스택 기반 구현 (재귀 대신)
    const stack: Array<{x: number, y: number}> = [{x, y}];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const pos = stack.pop();
      if (!pos) break;

      const key = `${pos.x},${pos.y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (!this.isValidCoordinate(pos.x, pos.y)) continue;

      const currentColor = this.buffer.getPixel(pos.x, pos.y);

      if (currentColor !== targetColor || currentColor === borderColor) {
        continue;
      }

      this.buffer.setPixel(pos.x, pos.y, fillColor);

      // 4방향 탐색
      stack.push({x: pos.x + 1, y: pos.y});
      stack.push({x: pos.x - 1, y: pos.y});
      stack.push({x: pos.x, y: pos.y + 1});
      stack.push({x: pos.x, y: pos.y - 1});
    }
  }

  /**
   * 좌표 유효성 검사
   */
  private isValidCoordinate(x: number, y: number): boolean {
    return x >= 0 && x < this.currentMode.width &&
           y >= 0 && y < this.currentMode.height;
  }

  /**
   * GET 명령어: 화면 영역을 Uint8Array로 저장
   */
  getSprite(x1: number, y1: number, x2: number, y2: number): Uint8Array {
    const width = Math.abs(x2 - x1) + 1;
    const height = Math.abs(y2 - y1) + 1;
    const startX = Math.min(x1, x2);
    const startY = Math.min(y1, y2);

    // 헤더 정보 포함: width(2바이트) + height(2바이트) + 픽셀 데이터
    const dataSize = 4 + (width * height);
    const spriteData = new Uint8Array(dataSize);

    // 헤더 작성
    spriteData[0] = width & 0xFF;
    spriteData[1] = (width >> 8) & 0xFF;
    spriteData[2] = height & 0xFF;
    spriteData[3] = (height >> 8) & 0xFF;

    // 픽셀 데이터 복사
    let offset = 4;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelX = startX + x;
        const pixelY = startY + y;
        if (this.isValidCoordinate(pixelX, pixelY)) {
          spriteData[offset] = this.buffer.getPixel(pixelX, pixelY);
        } else {
          spriteData[offset] = 0; // 범위 밖은 0으로
        }
        offset++;
      }
    }

    return spriteData;
  }

  /**
   * PUT 명령어: Uint8Array 스프라이트를 화면에 표시
   */
  putSprite(x: number, y: number, spriteData: Uint8Array, action: 'PSET' | 'PRESET' | 'AND' | 'OR' | 'XOR'): void {
    if (spriteData.length < 4) {
      throw new BasicError(
        'Invalid sprite data',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    // 헤더 파싱
    const width = spriteData[0]! | (spriteData[1]! << 8);
    const height = spriteData[2]! | (spriteData[3]! << 8);

    if (spriteData.length < 4 + (width * height)) {
      throw new BasicError(
        'Sprite data size mismatch',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    // 픽셀 데이터 복사
    let offset = 4;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const pixelX = x + dx;
        const pixelY = y + dy;

        if (!this.isValidCoordinate(pixelX, pixelY)) {
          offset++;
          continue;
        }

        const spritePixel = spriteData[offset]!;
        offset++;

        // 액션에 따른 픽셀 처리
        switch (action) {
          case 'PSET':
            this.buffer.setPixel(pixelX, pixelY, spritePixel);
            break;
          case 'PRESET':
            this.buffer.setPixel(pixelX, pixelY, spritePixel ^ 0xFF); // 반전
            break;
          case 'AND':
            {
              const currentPixel = this.buffer.getPixel(pixelX, pixelY);
              this.buffer.setPixel(pixelX, pixelY, currentPixel & spritePixel);
            }
            break;
          case 'OR':
            {
              const currentPixel = this.buffer.getPixel(pixelX, pixelY);
              this.buffer.setPixel(pixelX, pixelY, currentPixel | spritePixel);
            }
            break;
          case 'XOR':
            {
              const currentPixel = this.buffer.getPixel(pixelX, pixelY);
              this.buffer.setPixel(pixelX, pixelY, currentPixel ^ spritePixel);
            }
            break;
        }
      }
    }
  }
}
