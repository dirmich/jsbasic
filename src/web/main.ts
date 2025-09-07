/**
 * 웹용 메인 엔트리포인트
 * 6502 BASIC 에뮬레이터의 모든 모듈을 웹 환경에서 사용할 수 있도록 내보냅니다.
 */

// 코어 모듈들
export { BasicEmulator, EmulatorState } from '../system/emulator.js';
export { Terminal, TerminalState } from '../io/terminal.js';
export { CPU6502 } from '../cpu/cpu.js';
export { MemoryManager } from '../memory/manager.js';
export { BasicInterpreter } from '../basic/interpreter.js';
export { Parser } from '../basic/parser.js';
export { VariableManager } from '../basic/variables.js';

// 유틸리티
export { EventEmitter } from '../utils/events.js';
export { BasicError } from '../utils/errors.js';

// 웹 특화 컴포넌트
export { WebEmulator } from './web-emulator.js';

/**
 * 전역 객체에 에뮬레이터 바인딩
 */
declare global {
  interface Window {
    BasicEmulator: typeof BasicEmulator;
    WebEmulator: typeof WebEmulator;
    CPU6502: typeof CPU6502;
    MemoryManager: typeof MemoryManager;
    Terminal: typeof Terminal;
  }
}

// 브라우저 환경에서 전역 접근 가능하도록 설정
if (typeof window !== 'undefined') {
  const modules = await import('./main.js');
  Object.assign(window, modules);
}