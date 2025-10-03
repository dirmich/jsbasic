/**
 * Pixel Buffer Implementation
 *
 * 메모리 효율적인 픽셀 버퍼 관리
 */

import type { PixelBufferInterface } from '@/types/graphics';

export class PixelBuffer implements PixelBufferInterface {
  private buffer: Uint8Array;
  private readonly width: number;
  private readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer = new Uint8Array(width * height);
  }

  /**
   * 픽셀 값 설정
   */
  setPixel(x: number, y: number, color: number): void {
    if (this.isValidCoordinate(x, y)) {
      this.buffer[this.getIndex(x, y)] = color & 0xFF;
    }
  }

  /**
   * 픽셀 값 가져오기
   */
  getPixel(x: number, y: number): number {
    if (this.isValidCoordinate(x, y)) {
      return this.buffer[this.getIndex(x, y)] ?? 0;
    }
    return 0;
  }

  /**
   * 버퍼 전체 지우기
   */
  clear(color: number = 0): void {
    this.buffer.fill(color & 0xFF);
  }

  /**
   * 너비 반환
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * 높이 반환
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * 원본 데이터 반환
   */
  getData(): Uint8Array {
    return this.buffer;
  }

  /**
   * 좌표 유효성 검사
   */
  private isValidCoordinate(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * 1차원 인덱스 계산
   */
  private getIndex(x: number, y: number): number {
    return Math.floor(y) * this.width + Math.floor(x);
  }

  /**
   * 버퍼 복사
   */
  copyFrom(source: PixelBuffer): void {
    if (source.width !== this.width || source.height !== this.height) {
      throw new Error('Buffer size mismatch');
    }
    this.buffer.set(source.buffer);
  }

  /**
   * 영역 복사
   */
  copyRegion(
    source: PixelBuffer,
    srcX: number,
    srcY: number,
    destX: number,
    destY: number,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = source.getPixel(srcX + x, srcY + y);
        this.setPixel(destX + x, destY + y, color);
      }
    }
  }
}
