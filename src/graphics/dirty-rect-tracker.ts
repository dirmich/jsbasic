/**
 * Dirty Rectangle Tracker
 *
 * 변경된 화면 영역 추적 및 최적화
 */

import type { DirtyRect, DirtyRectTrackerInterface } from '@/types/graphics';

export class DirtyRectTracker implements DirtyRectTrackerInterface {
  private dirtyRegions: DirtyRect[] = [];
  private readonly maxRegions: number;
  private readonly mergeThreshold: number;

  constructor(maxRegions: number = 100, mergeThreshold: number = 10) {
    this.maxRegions = maxRegions;
    this.mergeThreshold = mergeThreshold;
  }

  /**
   * 더티 영역 추가
   */
  markDirty(x: number, y: number, width: number, height: number): void {
    const newRegion: DirtyRect = { x, y, width, height };

    // 너무 많은 영역이 쌓이면 병합
    if (this.dirtyRegions.length >= this.maxRegions) {
      this.mergeAll();
    }

    // 인접한 영역과 병합 시도
    const merged = this.tryMergeWithExisting(newRegion);

    if (!merged) {
      this.dirtyRegions.push(newRegion);
    }
  }

  /**
   * 모든 더티 영역 가져오기
   */
  getDirtyRegions(): DirtyRect[] {
    return [...this.dirtyRegions];
  }

  /**
   * 더티 영역 초기화
   */
  clear(): void {
    this.dirtyRegions = [];
  }

  /**
   * 더티 영역이 있는지 확인
   */
  isEmpty(): boolean {
    return this.dirtyRegions.length === 0;
  }

  /**
   * 기존 영역과 병합 시도
   */
  private tryMergeWithExisting(newRegion: DirtyRect): boolean {
    for (let i = 0; i < this.dirtyRegions.length; i++) {
      const existing = this.dirtyRegions[i];
      if (!existing) continue;

      // 영역이 겹치거나 인접한지 확인
      if (this.shouldMerge(existing, newRegion)) {
        // 두 영역을 병합
        this.dirtyRegions[i] = this.mergeRects(existing, newRegion);
        return true;
      }
    }

    return false;
  }

  /**
   * 두 영역을 병합해야 하는지 판단
   */
  private shouldMerge(rect1: DirtyRect, rect2: DirtyRect): boolean {
    // 두 영역이 겹치는지 확인
    const x1Min = rect1.x;
    const x1Max = rect1.x + rect1.width;
    const y1Min = rect1.y;
    const y1Max = rect1.y + rect1.height;

    const x2Min = rect2.x;
    const x2Max = rect2.x + rect2.width;
    const y2Min = rect2.y;
    const y2Max = rect2.y + rect2.height;

    // 겹치거나 임계값 내에서 인접한 경우
    const xOverlap = x1Max >= x2Min - this.mergeThreshold &&
                     x2Max >= x1Min - this.mergeThreshold;
    const yOverlap = y1Max >= y2Min - this.mergeThreshold &&
                     y2Max >= y1Min - this.mergeThreshold;

    return xOverlap && yOverlap;
  }

  /**
   * 두 영역 병합
   */
  private mergeRects(rect1: DirtyRect, rect2: DirtyRect): DirtyRect {
    const minX = Math.min(rect1.x, rect2.x);
    const minY = Math.min(rect1.y, rect2.y);
    const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
    const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 모든 영역을 하나로 병합
   */
  private mergeAll(): void {
    if (this.dirtyRegions.length === 0) return;

    let merged = this.dirtyRegions[0]!;

    for (let i = 1; i < this.dirtyRegions.length; i++) {
      const region = this.dirtyRegions[i];
      if (region) {
        merged = this.mergeRects(merged, region);
      }
    }

    this.dirtyRegions = [merged];
  }

  /**
   * 더티 영역 통계
   */
  getStats(): {
    regionCount: number;
    totalArea: number;
    averageArea: number;
  } {
    const regionCount = this.dirtyRegions.length;
    let totalArea = 0;

    for (const region of this.dirtyRegions) {
      totalArea += region.width * region.height;
    }

    return {
      regionCount,
      totalArea,
      averageArea: regionCount > 0 ? totalArea / regionCount : 0
    };
  }
}
