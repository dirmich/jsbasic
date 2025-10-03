/**
 * ImageData Pool Implementation
 *
 * ImageData 객체를 재사용하여 메모리 할당 및 GC 압력 감소
 */

export interface ImageDataPoolInterface {
  acquire(width: number, height: number, ctx: CanvasRenderingContext2D): ImageData;
  release(imageData: ImageData): void;
  clear(): void;
  getStats(): {
    poolSize: number;
    totalAcquired: number;
    totalReleased: number;
    totalCreated: number;
  };
}

interface PoolEntry {
  data: ImageData;
  width: number;
  height: number;
  inUse: boolean;
}

export class ImageDataPool implements ImageDataPoolInterface {
  private pool: PoolEntry[] = [];
  private maxPoolSize: number;

  // 통계
  private totalAcquired = 0;
  private totalReleased = 0;
  private totalCreated = 0;

  constructor(maxPoolSize: number = 10) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * ImageData 가져오기 (재사용 또는 새로 생성)
   */
  acquire(width: number, height: number, ctx: CanvasRenderingContext2D): ImageData {
    this.totalAcquired++;

    // 풀에서 사용 가능한 동일 크기 ImageData 찾기
    for (const entry of this.pool) {
      if (!entry.inUse && entry.width === width && entry.height === height) {
        entry.inUse = true;
        return entry.data;
      }
    }

    // 사용 가능한 ImageData가 없으면 새로 생성
    this.totalCreated++;
    const imageData = ctx.createImageData(width, height);

    // 풀에 추가 (최대 크기 제한)
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push({
        data: imageData,
        width,
        height,
        inUse: true
      });
    }

    return imageData;
  }

  /**
   * ImageData 반환 (풀로 되돌리기)
   */
  release(imageData: ImageData): void {
    this.totalReleased++;

    // 풀에서 해당 ImageData 찾기
    for (const entry of this.pool) {
      if (entry.data === imageData) {
        entry.inUse = false;

        // 데이터 초기화 (선택적, 보안 또는 디버깅용)
        // const data = imageData.data;
        // for (let i = 0; i < data.length; i++) {
        //   data[i] = 0;
        // }

        return;
      }
    }
  }

  /**
   * 풀 비우기
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * 풀 통계 가져오기
   */
  getStats(): {
    poolSize: number;
    totalAcquired: number;
    totalReleased: number;
    totalCreated: number;
  } {
    return {
      poolSize: this.pool.length,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      totalCreated: this.totalCreated
    };
  }
}
