/**
 * Display Manager Implementation
 *
 * Canvas 렌더링 및 화면 관리
 */

import type {
  DisplayManagerInterface,
  PixelBufferInterface,
  ColorManagerInterface,
  DirtyRect,
  DirtyRectTrackerInterface,
  ImageDataPoolInterface,
  ScreenMode
} from '@/types/graphics';
import { DirtyRectTracker } from './dirty-rect-tracker.js';
import { ImageDataPool } from './image-data-pool.js';

export class DisplayManager implements DisplayManagerInterface {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: PixelBufferInterface;
  private colorManager: ColorManagerInterface;
  private currentMode: ScreenMode;
  private dirtyTracker: DirtyRectTrackerInterface;
  private imageDataPool: ImageDataPoolInterface;
  private isDirty: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    buffer: PixelBufferInterface,
    colorManager: ColorManagerInterface,
    screenMode: ScreenMode
  ) {
    this.canvas = canvas;
    this.buffer = buffer;
    this.colorManager = colorManager;
    this.currentMode = screenMode;

    // Canvas 컨텍스트 가져오기
    const context = canvas.getContext('2d', {
      alpha: false, // 알파 채널 불필요 (성능 향상)
      desynchronized: true // 비동기 렌더링 허용
    });

    if (!context) {
      throw new Error('Failed to get 2D context');
    }

    this.ctx = context;
    this.dirtyTracker = new DirtyRectTracker();
    this.imageDataPool = new ImageDataPool(10); // 최대 10개 ImageData 캐싱
    this.initializeCanvas();
  }

  /**
   * Canvas 초기화
   */
  private initializeCanvas(): void {
    // 이미지 스무딩 비활성화 (픽셀 아트 스타일)
    this.ctx.imageSmoothingEnabled = false;

    // Canvas 크기 설정
    this.canvas.width = this.currentMode.width;
    this.canvas.height = this.currentMode.height;

    // 하드웨어 가속 활성화
    this.canvas.style.transform = 'translateZ(0)';

    // 초기 화면 지우기
    this.clear(0);
  }

  /**
   * 화면 모드 변경
   */
  setScreenMode(mode: ScreenMode): void {
    this.currentMode = mode;

    // Canvas 크기 변경
    this.canvas.width = mode.width;
    this.canvas.height = mode.height;

    // 전체 화면 다시 그리기
    this.markDirty(0, 0, mode.width, mode.height);
    this.render();
  }

  /**
   * 전체 화면 렌더링
   */
  render(): void {
    const width = this.currentMode.width;
    const height = this.currentMode.height;

    // ImageDataPool에서 재사용 가능한 ImageData 가져오기
    const imageData = this.imageDataPool.acquire(width, height, this.ctx);
    const data = imageData.data;

    // 픽셀 버퍼를 ImageData로 변환
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const colorIndex = this.buffer.getPixel(x, y);
        const rgb = this.colorManager.getRGB(colorIndex);
        const offset = (y * width + x) * 4;

        data[offset] = rgb.r;       // Red
        data[offset + 1] = rgb.g;   // Green
        data[offset + 2] = rgb.b;   // Blue
        data[offset + 3] = 255;     // Alpha (불투명)
      }
    }

    // Canvas에 그리기
    this.ctx.putImageData(imageData, 0, 0);

    // ImageData 풀로 반환
    this.imageDataPool.release(imageData);

    this.isDirty = false;
  }

  /**
   * 더티 영역만 렌더링 (성능 최적화)
   */
  renderDirty(): void {
    if (!this.isDirty) {
      return;
    }

    // DirtyRectTracker에서 병합된 영역 가져오기
    const dirtyRects = this.dirtyTracker.getDirtyRegions();

    if (dirtyRects.length === 0) {
      this.isDirty = false;
      return;
    }

    // 각 더티 영역 렌더링
    for (const rect of dirtyRects) {
      this.renderRegion(rect.x, rect.y, rect.width, rect.height);
    }

    // 더티 트래커 및 플래그 초기화
    this.dirtyTracker.clear();
    this.isDirty = false;
  }

  /**
   * 특정 영역 렌더링
   */
  private renderRegion(x: number, y: number, width: number, height: number): void {
    // 경계 체크
    const x1 = Math.max(0, Math.floor(x));
    const y1 = Math.max(0, Math.floor(y));
    const x2 = Math.min(this.currentMode.width, Math.ceil(x + width));
    const y2 = Math.min(this.currentMode.height, Math.ceil(y + height));

    const w = x2 - x1;
    const h = y2 - y1;

    if (w <= 0 || h <= 0) return;

    // ImageDataPool에서 재사용 가능한 ImageData 가져오기
    const imageData = this.imageDataPool.acquire(w, h, this.ctx);
    const data = imageData.data;

    // 픽셀 버퍼에서 해당 영역 복사
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const colorIndex = this.buffer.getPixel(x1 + px, y1 + py);
        const rgb = this.colorManager.getRGB(colorIndex);
        const offset = (py * w + px) * 4;

        data[offset] = rgb.r;
        data[offset + 1] = rgb.g;
        data[offset + 2] = rgb.b;
        data[offset + 3] = 255;
      }
    }

    // Canvas의 해당 영역에 그리기
    this.ctx.putImageData(imageData, x1, y1);

    // ImageData 풀로 반환
    this.imageDataPool.release(imageData);
  }

  /**
   * 화면 지우기
   */
  clear(colorIndex: number = 0): void {
    this.buffer.clear(colorIndex);
    this.markDirty(0, 0, this.currentMode.width, this.currentMode.height);
  }

  /**
   * 더티 영역 표시
   */
  markDirty(x: number, y: number, width: number, height: number): void {
    this.dirtyTracker.markDirty(x, y, width, height);
    this.isDirty = true;
  }

  /**
   * 버퍼 교체 (더블 버퍼링용)
   */
  swap(): void {
    // 현재 구현은 단일 버퍼만 사용
    // 필요시 프론트/백 버퍼 교체 로직 추가 가능
    this.render();
  }

  /**
   * 픽셀 버퍼 가져오기
   */
  getBuffer(): PixelBufferInterface {
    return this.buffer;
  }

  /**
   * 픽셀 버퍼 설정 (화면 모드 변경 시 사용)
   */
  setPixelBuffer(buffer: PixelBufferInterface): void {
    this.buffer = buffer;
    // 전체 화면 다시 그리기 (새 버퍼 크기 사용)
    const width = buffer.getWidth();
    const height = buffer.getHeight();
    this.markDirty(0, 0, width, height);
    this.render();
    console.log(`📦 PixelBuffer updated in DisplayManager: ${width}x${height}`);
  }

  /**
   * Canvas 요소 가져오기
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 2D 컨텍스트 가져오기
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * 현재 화면 모드 가져오기
   */
  getScreenMode(): ScreenMode {
    return { ...this.currentMode };
  }

  /**
   * 리사이즈 처리
   */
  resize(width: number, height: number): void {
    // CSS 크기 조정 (픽셀 비율 유지)
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // 내부 버퍼는 화면 모드에 따라 유지
    // Canvas 크기는 변경하지 않음 (픽셀 아트 스타일 유지)
  }

  /**
   * 스크린샷 저장
   */
  saveScreenshot(): string {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * 성능 통계
   */
  getPerformanceStats(): {
    bufferSize: number;
    canvasSize: { width: number; height: number };
    dirtyRegions: number;
    isDirty: boolean;
    poolStats?: {
      poolSize: number;
      totalAcquired: number;
      totalReleased: number;
      totalCreated: number;
    };
  } {
    return {
      bufferSize: this.buffer.getWidth() * this.buffer.getHeight(),
      canvasSize: {
        width: this.canvas.width,
        height: this.canvas.height
      },
      dirtyRegions: this.dirtyTracker.getDirtyRegions().length,
      isDirty: this.isDirty,
      poolStats: this.imageDataPool.getStats()
    };
  }
}
