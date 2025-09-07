/**
 * BASIC 변수 관리 시스템
 * 
 * BASIC 인터프리터에서 사용되는 변수들을 관리합니다.
 * 숫자, 문자열, 정수, 배열 변수를 지원합니다.
 */

import { BasicError, ERROR_CODES } from '../utils/errors.js';

/**
 * 변수 타입
 */
export type VariableType = 'numeric' | 'string' | 'integer';

/**
 * 변수 값 타입
 */
export type VariableValue = number | string;

/**
 * 배열 정보
 */
export interface ArrayInfo {
  dimensions: number[];  // 각 차원의 크기
  data: VariableValue[]; // 실제 데이터 (1차원으로 평면화)
  type: VariableType;    // 배열 요소 타입
}

/**
 * 변수 정보
 */
export interface VariableInfo {
  name: string;
  type: VariableType;
  value?: VariableValue;
  array?: ArrayInfo;
  isArray: boolean;
}

/**
 * 변수 관리자
 */
export class VariableManager {
  private variables: Map<string, VariableInfo> = new Map();
  private readonly stringVariableSuffix = '$';
  private readonly integerVariableSuffix = '%';

  /**
   * 변수명으로부터 타입 추론
   */
  public inferVariableType(name: string): VariableType {
    if (name.endsWith(this.stringVariableSuffix)) {
      return 'string';
    } else if (name.endsWith(this.integerVariableSuffix)) {
      return 'integer';
    } else {
      return 'numeric';
    }
  }

  /**
   * 변수명 정규화 (대소문자 통일)
   */
  private normalizeName(name: string): string {
    return name.toUpperCase();
  }

  /**
   * 변수 존재 여부 확인
   */
  public hasVariable(name: string): boolean {
    return this.variables.has(this.normalizeName(name));
  }

  /**
   * 스칼라 변수 설정
   */
  public setVariable(name: string, value: VariableValue): void {
    const normalizedName = this.normalizeName(name);
    const inferredType = this.inferVariableType(name);
    
    // 타입 검증
    if (inferredType === 'string' && typeof value !== 'string') {
      throw new BasicError(
        `Type mismatch: cannot assign ${typeof value} to string variable ${name}`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name, expectedType: 'string', actualType: typeof value }
      );
    }
    
    if (inferredType !== 'string' && typeof value !== 'number') {
      throw new BasicError(
        `Type mismatch: cannot assign ${typeof value} to numeric variable ${name}`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name, expectedType: 'number', actualType: typeof value }
      );
    }
    
    // 정수 타입 변환
    if (inferredType === 'integer' && typeof value === 'number') {
      value = Math.floor(value);
    }
    
    // 기존 변수가 배열인 경우 오류
    const existing = this.variables.get(normalizedName);
    if (existing && existing.isArray) {
      throw new BasicError(
        `Cannot assign scalar value to array variable ${name}`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name }
      );
    }
    
    this.variables.set(normalizedName, {
      name: normalizedName,
      type: inferredType,
      value: value,
      isArray: false
    });
  }

  /**
   * 스칼라 변수 가져오기
   */
  public getVariable(name: string): VariableValue {
    const normalizedName = this.normalizeName(name);
    const variable = this.variables.get(normalizedName);
    
    if (!variable) {
      // BASIC에서는 초기화되지 않은 변수는 기본값을 가짐
      const type = this.inferVariableType(name);
      const defaultValue = this.getDefaultValue(type);
      this.setVariable(name, defaultValue);
      return defaultValue;
    }
    
    if (variable.isArray) {
      throw new BasicError(
        `Cannot access array variable ${name} without indices`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name }
      );
    }
    
    return variable.value!;
  }

  /**
   * 배열 변수 선언
   */
  public declareArray(name: string, dimensions: number[]): void {
    const normalizedName = this.normalizeName(name);
    const type = this.inferVariableType(name);
    
    // 차원 검증
    if (dimensions.length === 0 || dimensions.some(dim => dim < 0)) {
      throw new BasicError(
        `Invalid array dimensions for ${name}`,
        ERROR_CODES.SUBSCRIPT_OUT_OF_RANGE,
        undefined,
        { variableName: name, dimensions }
      );
    }
    
    // 기존 변수 확인
    if (this.variables.has(normalizedName)) {
      throw new BasicError(
        `Variable ${name} already declared`,
        ERROR_CODES.RUNTIME_ERROR,
        undefined,
        { variableName: name }
      );
    }
    
    // BASIC 배열은 0부터 시작하므로 실제 크기는 dimension + 1
    const actualDimensions = dimensions.map(dim => dim + 1);
    const totalSize = actualDimensions.reduce((acc, dim) => acc * dim, 1);
    
    const defaultValue = this.getDefaultValue(type);
    const data = new Array(totalSize).fill(defaultValue);
    
    this.variables.set(normalizedName, {
      name: normalizedName,
      type: type,
      isArray: true,
      array: {
        dimensions: actualDimensions,
        data: data,
        type: type
      }
    });
  }

  /**
   * 배열 요소 설정
   */
  public setArrayElement(name: string, indices: number[], value: VariableValue): void {
    const normalizedName = this.normalizeName(name);
    const variable = this.variables.get(normalizedName);
    
    if (!variable) {
      throw new BasicError(
        `Undefined array variable ${name}`,
        ERROR_CODES.UNDEFINED_VARIABLE,
        undefined,
        { variableName: name }
      );
    }
    
    if (!variable.isArray) {
      throw new BasicError(
        `Variable ${name} is not an array`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name }
      );
    }
    
    const array = variable.array!;
    
    // 차원 수 검증
    if (indices.length !== array.dimensions.length) {
      throw new BasicError(
        `Array ${name} requires ${array.dimensions.length} indices, got ${indices.length}`,
        ERROR_CODES.SUBSCRIPT_OUT_OF_RANGE,
        undefined,
        { variableName: name, expectedDimensions: array.dimensions.length, actualIndices: indices.length }
      );
    }
    
    // 인덱스 범위 검증
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const dimension = array.dimensions[i];
      if (index === undefined || dimension === undefined || index < 0 || index >= dimension) {
        throw new BasicError(
          `Array index ${index || 0} out of range for dimension ${i} of variable ${name} (0-${(dimension || 1) - 1})`,
          ERROR_CODES.SUBSCRIPT_OUT_OF_RANGE,
          undefined,
          { variableName: name, index: index || 0, dimension: i, maxIndex: (dimension || 1) - 1 }
        );
      }
    }
    
    // 타입 검증
    if (array.type === 'string' && typeof value !== 'string') {
      throw new BasicError(
        `Type mismatch: cannot assign ${typeof value} to string array ${name}`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name, expectedType: 'string', actualType: typeof value }
      );
    }
    
    if (array.type !== 'string' && typeof value !== 'number') {
      throw new BasicError(
        `Type mismatch: cannot assign ${typeof value} to numeric array ${name}`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name, expectedType: 'number', actualType: typeof value }
      );
    }
    
    // 정수 타입 변환
    if (array.type === 'integer' && typeof value === 'number') {
      value = Math.floor(value);
    }
    
    // 1차원 인덱스 계산
    const flatIndex = this.calculateFlatIndex(indices, array.dimensions);
    array.data[flatIndex] = value;
  }

  /**
   * 배열 요소 가져오기
   */
  public getArrayElement(name: string, indices: number[]): VariableValue {
    const normalizedName = this.normalizeName(name);
    const variable = this.variables.get(normalizedName);
    
    if (!variable) {
      throw new BasicError(
        `Undefined array variable ${name}`,
        ERROR_CODES.UNDEFINED_VARIABLE,
        undefined,
        { variableName: name }
      );
    }
    
    if (!variable.isArray) {
      throw new BasicError(
        `Variable ${name} is not an array`,
        ERROR_CODES.TYPE_MISMATCH,
        undefined,
        { variableName: name }
      );
    }
    
    const array = variable.array!;
    
    // 차원 수 검증
    if (indices.length !== array.dimensions.length) {
      throw new BasicError(
        `Array ${name} requires ${array.dimensions.length} indices, got ${indices.length}`,
        ERROR_CODES.SUBSCRIPT_OUT_OF_RANGE,
        undefined,
        { variableName: name, expectedDimensions: array.dimensions.length, actualIndices: indices.length }
      );
    }
    
    // 인덱스 범위 검증
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      const dimension = array.dimensions[i];
      if (index === undefined || dimension === undefined || index < 0 || index >= dimension) {
        throw new BasicError(
          `Array index ${index || 0} out of range for dimension ${i} of variable ${name} (0-${(dimension || 1) - 1})`,
          ERROR_CODES.SUBSCRIPT_OUT_OF_RANGE,
          undefined,
          { variableName: name, index: index || 0, dimension: i, maxIndex: (dimension || 1) - 1 }
        );
      }
    }
    
    // 1차원 인덱스 계산
    const flatIndex = this.calculateFlatIndex(indices, array.dimensions);
    return array.data[flatIndex];
  }

  /**
   * 변수 정보 가져오기
   */
  public getVariableInfo(name: string): VariableInfo | undefined {
    return this.variables.get(this.normalizeName(name));
  }

  /**
   * 모든 변수 목록 가져오기
   */
  public getAllVariables(): VariableInfo[] {
    return Array.from(this.variables.values());
  }

  /**
   * 변수 삭제
   */
  public deleteVariable(name: string): boolean {
    return this.variables.delete(this.normalizeName(name));
  }

  /**
   * 모든 변수 초기화
   */
  public clear(): void {
    this.variables.clear();
  }

  /**
   * 변수 개수
   */
  public size(): number {
    return this.variables.size;
  }

  /**
   * 타입별 기본값 반환
   */
  private getDefaultValue(type: VariableType): VariableValue {
    switch (type) {
      case 'string':
        return '';
      case 'integer':
        return 0;
      case 'numeric':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * 다차원 인덱스를 1차원 인덱스로 변환
   */
  private calculateFlatIndex(indices: number[], dimensions: number[]): number {
    let flatIndex = 0;
    let multiplier = 1;
    
    // 행 우선(row-major) 순서로 계산
    for (let i = dimensions.length - 1; i >= 0; i--) {
      flatIndex += indices[i] * multiplier;
      multiplier *= dimensions[i];
    }
    
    return flatIndex;
  }

  /**
   * 변수 덤프 (디버깅용)
   */
  public dump(): string {
    const lines: string[] = [];
    lines.push('=== Variable Dump ===');
    
    for (const [name, info] of this.variables.entries()) {
      if (info.isArray) {
        const array = info.array!;
        lines.push(`${name} (${info.type}[]): dimensions=[${array.dimensions.join(',')}]`);
      } else {
        lines.push(`${name} (${info.type}): ${info.value}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 메모리 사용량 계산
   */
  public getMemoryUsage(): number {
    let totalSize = 0;
    
    for (const info of this.variables.values()) {
      if (info.isArray) {
        totalSize += info.array!.data.length * 8; // 각 요소를 8바이트로 추정
      } else {
        totalSize += 8; // 스칼라 변수도 8바이트로 추정
      }
    }
    
    return totalSize;
  }
}