/**
 * BASIC Interpreter Module
 * 
 * Microsoft 6502 BASIC 1.1 완전 호환 인터프리터 모듈입니다.
 * 구문 분석, 실행, 변수 관리, 내장 함수를 제공합니다.
 */

export { BasicInterpreter } from './interpreter.js';
export { Parser } from './parser.js';
export { Tokenizer } from './tokenizer.js';
export { VariableManager } from './variables.js';
export { FunctionLibrary } from './functions.js';

export const BASIC_MODULE_VERSION = '0.1.0';

console.log('BASIC module loaded - Microsoft 6502 BASIC interpreter ready');