/**
 * 6502 CPU Emulator Module
 * 
 * 완전한 6502 CPU 에뮬레이터 모듈입니다.
 * 151개의 공식 명령어와 13가지 주소 지정 모드를 지원합니다.
 */

export { CPU6502 } from './cpu.js';
export { InstructionSet } from './instructions.js';
export { AddressingModes } from './addressing.js';
export { Opcodes } from './opcodes.js';

export const CPU_MODULE_VERSION = '0.1.0';

console.log('CPU module loaded - 6502 CPU emulator ready');