/**
 * Color Manager Implementation
 *
 * 색상 팔레트 관리 및 변환
 */

import type { ColorManagerInterface, RGB } from '@/types/graphics';
import { CGA_PALETTE } from '@/types/graphics';

export class ColorManager implements ColorManagerInterface {
  private palette: string[];
  private rgbCache: Map<number, RGB> = new Map();

  constructor(initialPalette?: string[]) {
    this.palette = initialPalette ? [...initialPalette] : [...CGA_PALETTE];
    this.buildRGBCache();
  }

  /**
   * 색상 인덱스를 CSS 색상 문자열로 변환
   */
  getColorString(colorIndex: number): string {
    const validIndex = this.validateColor(colorIndex);
    return this.palette[validIndex] ?? this.palette[0] ?? '#000000';
  }

  /**
   * 색상 인덱스를 RGB 값으로 변환
   */
  getRGB(colorIndex: number): RGB {
    const validIndex = this.validateColor(colorIndex);

    // 캐시된 값 반환
    const cached = this.rgbCache.get(validIndex);
    if (cached) {
      return cached;
    }

    // 새로 계산
    const hex = this.palette[validIndex] ?? '#000000';
    const rgb = this.hexToRGB(hex);
    this.rgbCache.set(validIndex, rgb);
    return rgb;
  }

  /**
   * 팔레트 설정
   */
  setPalette(palette: string[]): void {
    if (palette.length === 0) {
      throw new Error('Palette must have at least one color');
    }

    this.palette = [...palette];
    this.rgbCache.clear();
    this.buildRGBCache();
  }

  /**
   * 팔레트 가져오기
   */
  getPalette(): string[] {
    return [...this.palette];
  }

  /**
   * 색상 인덱스 유효성 검사
   */
  validateColor(color: number): number {
    const colorInt = Math.floor(color);

    if (colorInt < 0) {
      return 0;
    }

    if (colorInt >= this.palette.length) {
      return this.palette.length - 1;
    }

    return colorInt;
  }

  /**
   * Hex 색상을 RGB로 변환
   */
  private hexToRGB(hex: string): RGB {
    // #RRGGBB 형식
    const cleanHex = hex.replace('#', '');

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return { r, g, b };
  }

  /**
   * RGB 캐시 미리 빌드
   */
  private buildRGBCache(): void {
    for (let i = 0; i < this.palette.length; i++) {
      const hex = this.palette[i];
      if (hex) {
        this.rgbCache.set(i, this.hexToRGB(hex));
      }
    }
  }

  /**
   * RGB를 Hex 색상으로 변환
   */
  rgbToHex(r: number, g: number, b: number): string {
    const rHex = Math.floor(r).toString(16).padStart(2, '0');
    const gHex = Math.floor(g).toString(16).padStart(2, '0');
    const bHex = Math.floor(b).toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
  }

  /**
   * 가장 가까운 팔레트 색상 찾기
   */
  findClosestColor(r: number, g: number, b: number): number {
    let closestIndex = 0;
    let minDistance = Number.MAX_VALUE;

    for (let i = 0; i < this.palette.length; i++) {
      const paletteRGB = this.getRGB(i);
      const distance = this.colorDistance(r, g, b, paletteRGB.r, paletteRGB.g, paletteRGB.b);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  /**
   * 색상 거리 계산 (유클리드 거리)
   */
  private colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * 팔레트 크기 반환
   */
  getPaletteSize(): number {
    return this.palette.length;
  }

  /**
   * 특정 인덱스의 색상 변경
   */
  setColor(index: number, hex: string): void {
    if (index >= 0 && index < this.palette.length) {
      this.palette[index] = hex;
      this.rgbCache.delete(index);
      this.rgbCache.set(index, this.hexToRGB(hex));
    }
  }
}
