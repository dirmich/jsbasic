/**
 * 6502 BASIC 부동소수점 구현
 * 
 * Microsoft 6502 BASIC의 부동소수점 형식을 구현합니다.
 * 5바이트 형식: 1바이트 지수 + 4바이트 가수
 */

/**
 * 6502 BASIC 부동소수점 클래스
 */
export class BasicFloat {
  private bytes: Uint8Array;

  constructor(value: number = 0) {
    this.bytes = new Uint8Array(5);
    this.setValue(value);
  }

  /**
   * JavaScript 숫자를 6502 BASIC 부동소수점으로 변환
   */
  setValue(value: number): void {
    if (value === 0) {
      this.bytes.fill(0);
      return;
    }

    const sign = value < 0 ? 1 : 0;
    const absValue = Math.abs(value);
    
    // 지수와 가수 계산
    let exponent = Math.floor(Math.log2(absValue)) + 1;
    let mantissa = absValue / Math.pow(2, exponent - 1);
    
    // 가수를 정규화 (0.5 <= mantissa < 1.0)
    if (mantissa >= 1.0) {
      mantissa /= 2;
      exponent++;
    }
    
    // 지수를 바이어스된 형태로 저장 (바이어스 = 128)
    this.bytes[0] = Math.max(0, Math.min(255, exponent + 128));
    
    // 가수를 4바이트로 저장 (MSB에 부호 비트 포함)
    const mantissaInt = Math.floor(mantissa * 0x80000000);
    this.bytes[1] = (mantissaInt >>> 24) & 0xFF;
    this.bytes[2] = (mantissaInt >>> 16) & 0xFF;
    this.bytes[3] = (mantissaInt >>> 8) & 0xFF;
    this.bytes[4] = mantissaInt & 0xFF;
    
    if (sign) {
      this.bytes[1] |= 0x80; // 부호 비트 설정
    }
  }

  /**
   * 6502 BASIC 부동소수점을 JavaScript 숫자로 변환
   */
  getValue(): number {
    if (this.bytes[0] === 0) {
      return 0;
    }

    const exponent = (this.bytes[0] ?? 0) - 128;
    const sign = ((this.bytes[1] ?? 0) & 0x80) ? -1 : 1;
    
    // 가수 복원
    const mantissaInt = (((this.bytes[1] ?? 0) & 0x7F) << 24) |
                       ((this.bytes[2] ?? 0) << 16) |
                       ((this.bytes[3] ?? 0) << 8) |
                       (this.bytes[4] ?? 0);
    
    const mantissa = (mantissaInt ?? 0) / 0x80000000;
    
    return sign * mantissa * Math.pow(2, exponent);
  }

  /**
   * 바이트 배열 반환
   */
  getBytes(): Uint8Array {
    return this.bytes.slice();
  }

  /**
   * 바이트 배열에서 값 설정
   */
  setBytes(bytes: Uint8Array): void {
    if (bytes.length !== 5) {
      throw new Error('BasicFloat requires exactly 5 bytes');
    }
    this.bytes.set(bytes);
  }

  /**
   * 문자열 표현
   */
  toString(): string {
    return this.getValue().toString();
  }

  /**
   * 부동소수점 연산: 덧셈
   */
  add(other: BasicFloat): BasicFloat {
    const result = new BasicFloat();
    result.setValue(this.getValue() + other.getValue());
    return result;
  }

  /**
   * 부동소수점 연산: 뺄셈
   */
  subtract(other: BasicFloat): BasicFloat {
    const result = new BasicFloat();
    result.setValue(this.getValue() - other.getValue());
    return result;
  }

  /**
   * 부동소수점 연산: 곱셈
   */
  multiply(other: BasicFloat): BasicFloat {
    const result = new BasicFloat();
    result.setValue(this.getValue() * other.getValue());
    return result;
  }

  /**
   * 부동소수점 연산: 나눗셈
   */
  divide(other: BasicFloat): BasicFloat {
    if (other.getValue() === 0) {
      throw new Error('Division by zero');
    }
    const result = new BasicFloat();
    result.setValue(this.getValue() / other.getValue());
    return result;
  }
}

/**
 * 부동소수점 유틸리티 함수들
 */
export class FloatUtils {
  /**
   * JavaScript 숫자를 6502 BASIC 부동소수점 바이트로 변환
   */
  static numberToFloat(value: number): Uint8Array {
    const float = new BasicFloat(value);
    return float.getBytes();
  }

  /**
   * 6502 BASIC 부동소수점 바이트를 JavaScript 숫자로 변환
   */
  static floatToNumber(bytes: Uint8Array): number {
    const float = new BasicFloat();
    float.setBytes(bytes);
    return float.getValue();
  }

  /**
   * 부동소수점 포맷 검증
   */
  static isValidFloat(bytes: Uint8Array): boolean {
    if (bytes.length !== 5) {
      return false;
    }
    
    // 지수가 0이면 모든 바이트가 0이어야 함
    if (bytes[0] === 0) {
      return bytes.every(b => b === 0);
    }
    
    return true;
  }
}