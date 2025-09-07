/**
 * 삼각함수 및 수학 함수 구현
 * 
 * 6502 BASIC의 수학 함수들을 구현합니다.
 */

/**
 * 삼각함수 및 수학 함수 클래스
 */
export class TrigonometricFunctions {
  private static readonly PI = Math.PI;
  private static readonly E = Math.E;

  /**
   * 사인 함수 (라디안)
   */
  static sin(x: number): number {
    // BASIC에서는 각도를 라디안으로 처리
    return Math.sin(x);
  }

  /**
   * 코사인 함수 (라디안)
   */
  static cos(x: number): number {
    return Math.cos(x);
  }

  /**
   * 탄젠트 함수 (라디안)
   */
  static tan(x: number): number {
    return Math.tan(x);
  }

  /**
   * 아크사인 함수
   */
  static asin(x: number): number {
    if (x < -1 || x > 1) {
      throw new Error('ASIN argument out of range');
    }
    return Math.asin(x);
  }

  /**
   * 아크코사인 함수
   */
  static acos(x: number): number {
    if (x < -1 || x > 1) {
      throw new Error('ACOS argument out of range');
    }
    return Math.acos(x);
  }

  /**
   * 아크탄젠트 함수
   */
  static atan(x: number): number {
    return Math.atan(x);
  }

  /**
   * 각도를 라디안으로 변환
   */
  static degToRad(degrees: number): number {
    return degrees * (this.PI / 180);
  }

  /**
   * 라디안을 각도로 변환
   */
  static radToDeg(radians: number): number {
    return radians * (180 / this.PI);
  }

  /**
   * 자연로그 함수
   */
  static log(x: number): number {
    if (x <= 0) {
      throw new Error('LOG argument must be positive');
    }
    return Math.log(x);
  }

  /**
   * 상용로그 함수 (밑이 10)
   */
  static log10(x: number): number {
    if (x <= 0) {
      throw new Error('LOG10 argument must be positive');
    }
    return Math.log10(x);
  }

  /**
   * 지수 함수 (e^x)
   */
  static exp(x: number): number {
    // 오버플로우 체크
    if (x > 88) {
      throw new Error('EXP argument too large');
    }
    return Math.exp(x);
  }

  /**
   * 제곱근 함수
   */
  static sqrt(x: number): number {
    if (x < 0) {
      throw new Error('SQR argument cannot be negative');
    }
    return Math.sqrt(x);
  }

  /**
   * 거듭제곱 함수 (x^y)
   */
  static power(x: number, y: number): number {
    // 특수 경우 처리
    if (x === 0 && y === 0) {
      throw new Error('0^0 is undefined');
    }
    if (x < 0 && y !== Math.floor(y)) {
      throw new Error('Negative base with non-integer exponent');
    }
    return Math.pow(x, y);
  }

  /**
   * 절댓값 함수
   */
  static abs(x: number): number {
    return Math.abs(x);
  }

  /**
   * 부호 함수
   */
  static sign(x: number): number {
    if (x > 0) return 1;
    if (x < 0) return -1;
    return 0;
  }

  /**
   * 정수 부분만 추출 (버림)
   */
  static int(x: number): number {
    return Math.floor(x);
  }

  /**
   * 가장 가까운 정수로 반올림
   */
  static round(x: number): number {
    return Math.round(x);
  }

  /**
   * 최대값 반환
   */
  static max(a: number, b: number): number {
    return Math.max(a, b);
  }

  /**
   * 최소값 반환
   */
  static min(a: number, b: number): number {
    return Math.min(a, b);
  }

  /**
   * 난수 생성 (0 <= x < 1)
   */
  static random(): number {
    return Math.random();
  }

  /**
   * 파이 상수 반환
   */
  static getPi(): number {
    return this.PI;
  }

  /**
   * 자연상수 e 반환
   */
  static getE(): number {
    return this.E;
  }

  /**
   * 각도 정규화 (0~360도)
   */
  static normalizeDegrees(degrees: number): number {
    while (degrees < 0) degrees += 360;
    while (degrees >= 360) degrees -= 360;
    return degrees;
  }

  /**
   * 라디안 정규화 (0~2π)
   */
  static normalizeRadians(radians: number): number {
    const twoPi = 2 * this.PI;
    while (radians < 0) radians += twoPi;
    while (radians >= twoPi) radians -= twoPi;
    return radians;
  }
}