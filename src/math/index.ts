/**
 * Math Package Module
 * 
 * 6502 BASIC 수학 패키지 모듈입니다.
 * 부동소수점, 삼각함수, 유틸리티 함수를 제공합니다.
 */

export { BasicFloat, FloatUtils } from './float.js';
export { TrigonometricFunctions } from './trig.js';
export { MathUtils, NumberConversion, type NumberTypeInfo } from './utils.js';

export const MATH_MODULE_VERSION = '0.1.0';

console.log('Math module loaded - 6502 BASIC math package ready');