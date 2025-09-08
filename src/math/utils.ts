/**
 * 수학 유틸리티 함수들
 * 
 * BASIC 언어에서 사용되는 다양한 수학 유틸리티를 제공합니다.
 */

import { BasicFloat, FloatUtils } from './float.js';

/**
 * 숫자 타입 검사 결과
 */
export interface NumberTypeInfo {
  isInteger: boolean;
  isFloat: boolean;
  isNegative: boolean;
  isZero: boolean;
  precision: number;
}

/**
 * 수학 유틸리티 클래스
 */
export class MathUtils {
  private static readonly PRECISION_THRESHOLD = 1e-10;

  /**
   * 숫자 타입 분석
   */
  static analyzeNumber(value: number): NumberTypeInfo {
    return {
      isInteger: Number.isInteger(value),
      isFloat: !Number.isInteger(value),
      isNegative: value < 0,
      isZero: Math.abs(value) < this.PRECISION_THRESHOLD,
      precision: this.getPrecision(value)
    };
  }

  /**
   * 소수점 자릿수 계산
   */
  static getPrecision(value: number): number {
    if (Number.isInteger(value)) return 0;
    
    const str = value.toString();
    if (str.indexOf('.') === -1) return 0;
    
    return str.split('.')[1]?.length ?? 0;
  }

  /**
   * 두 실수가 거의 같은지 비교 (부동소수점 오차 고려)
   */
  static isAlmostEqual(a: number, b: number, tolerance = this.PRECISION_THRESHOLD): boolean {
    return Math.abs(a - b) < tolerance;
  }

  /**
   * 숫자를 지정된 자릿수로 반올림
   */
  static roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  /**
   * 최대공약수 계산 (유클리드 호제법)
   */
  static gcd(a: number, b: number): number {
    a = Math.abs(Math.floor(a));
    b = Math.abs(Math.floor(b));
    
    while (b !== 0) {
      [a, b] = [b, a % b];
    }
    
    return a;
  }

  /**
   * 최소공배수 계산
   */
  static lcm(a: number, b: number): number {
    return Math.abs(a * b) / this.gcd(a, b);
  }

  /**
   * 팩토리얼 계산
   */
  static factorial(n: number): number {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error('Factorial is only defined for non-negative integers');
    }
    
    if (n > 170) {
      throw new Error('Factorial too large (overflow)');
    }
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    
    return result;
  }

  /**
   * 조합 계산 (nCr)
   */
  static combination(n: number, r: number): number {
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
      throw new Error('Invalid arguments for combination');
    }
    
    if (r === 0 || r === n) return 1;
    if (r === 1) return n;
    
    // 계산 최적화를 위해 r = min(r, n-r)
    if (r > n - r) r = n - r;
    
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = result * (n - i) / (i + 1);
    }
    
    return Math.round(result);
  }

  /**
   * 순열 계산 (nPr)
   */
  static permutation(n: number, r: number): number {
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
      throw new Error('Invalid arguments for permutation');
    }
    
    let result = 1;
    for (let i = n; i > n - r; i--) {
      result *= i;
    }
    
    return result;
  }

  /**
   * 주어진 범위 내의 난수 생성
   */
  static randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * 주어진 범위 내의 정수 난수 생성
   */
  static randomIntInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 배열의 평균값 계산
   */
  static average(numbers: number[]): number {
    if (numbers.length === 0) {
      throw new Error('Cannot calculate average of empty array');
    }
    
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  }

  /**
   * 배열의 중앙값 계산
   */
  static median(numbers: number[]): number {
    if (numbers.length === 0) {
      throw new Error('Cannot calculate median of empty array');
    }
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
    } else {
      return sorted[mid] ?? 0;
    }
  }

  /**
   * 배열의 표준편차 계산
   */
  static standardDeviation(numbers: number[]): number {
    if (numbers.length === 0) {
      throw new Error('Cannot calculate standard deviation of empty array');
    }
    
    const avg = this.average(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
    const avgSquaredDiff = this.average(squaredDiffs);
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * 숫자가 소수인지 확인
   */
  static isPrime(n: number): boolean {
    if (!Number.isInteger(n) || n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
      if (n % i === 0) return false;
    }
    
    return true;
  }

  /**
   * 범위 내의 소수 목록 생성 (에라토스테네스의 체)
   */
  static generatePrimes(max: number): number[] {
    if (max < 2) return [];
    
    const sieve = new Array(max + 1).fill(true);
    sieve[0] = sieve[1] = false;
    
    for (let i = 2; i * i <= max; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= max; j += i) {
          sieve[j] = false;
        }
      }
    }
    
    return sieve.map((isPrime, num) => isPrime ? num : null)
                .filter(num => num !== null) as number[];
  }

  /**
   * 숫자를 과학적 표기법 문자열로 변환
   */
  static toScientificNotation(value: number, precision: number = 6): string {
    if (value === 0) return '0E+00';
    
    const exp = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exp);
    
    const sign = exp >= 0 ? '+' : '';
    const expStr = exp.toString().padStart(2, '0');
    
    return `${mantissa.toFixed(precision)}E${sign}${expStr}`;
  }

  /**
   * BASIC 숫자 포맷팅
   */
  static formatBasicNumber(value: number): string {
    // BASIC에서의 숫자 표시 규칙 적용
    if (Number.isInteger(value) && Math.abs(value) < 1e9) {
      return value.toString();
    }
    
    if (Math.abs(value) < 0.01 || Math.abs(value) >= 1e9) {
      return this.toScientificNotation(value, 6);
    }
    
    return value.toString();
  }
}

/**
 * BASIC 수치 형변환 함수
 */
export class NumberConversion {
  /**
   * 문자열을 숫자로 변환 (BASIC VAL 함수)
   */
  static val(str: string): number {
    const trimmed = str.trim();
    if (trimmed === '') return 0;
    
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 숫자를 문자열로 변환 (BASIC STR$ 함수)
   */
  static str(value: number): string {
    const formatted = MathUtils.formatBasicNumber(value);
    return value >= 0 ? ` ${formatted}` : formatted;
  }

  /**
   * 16진수 문자열을 숫자로 변환
   */
  static hexToNumber(hexStr: string): number {
    const cleaned = hexStr.replace(/^[$&]/, ''); // $ 또는 & 제거
    const parsed = parseInt(cleaned, 16);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 숫자를 16진수 문자열로 변환
   */
  static numberToHex(value: number): string {
    return Math.floor(value).toString(16).toUpperCase();
  }

  /**
   * 8진수 문자열을 숫자로 변환
   */
  static octalToNumber(octalStr: string): number {
    const parsed = parseInt(octalStr, 8);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * 숫자를 8진수 문자열로 변환
   */
  static numberToOctal(value: number): string {
    return Math.floor(value).toString(8);
  }
}