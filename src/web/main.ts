/**
 * 웹용 메인 엔트리포인트
 * 6502 BASIC 에뮬레이터의 모든 모듈을 웹 환경에서 사용할 수 있도록 내보냅니다.
 */

// 메인 시스템
import { System6502 } from '../index.js';

// 코어 모듈들
import { BasicEmulator, EmulatorState } from '../system/emulator.js';
import { Terminal, TerminalState } from '../io/terminal.js';
import { CPU6502 } from '../cpu/cpu.js';
import { MemoryManager } from '../memory/manager.js';
import { BasicInterpreter } from '../basic/interpreter.js';
import { Parser } from '../basic/parser.js';
import { VariableManager } from '../basic/variables.js';

// 유틸리티
import { EventEmitter } from '../utils/events.js';
import { BasicError } from '../utils/errors.js';

// Export 선언
export { System6502 };
export { BasicEmulator, EmulatorState };
export { Terminal, TerminalState };
export { CPU6502 };
export { MemoryManager };
export { BasicInterpreter };
export { Parser };
export { VariableManager };
export { EventEmitter };
export { BasicError };

/**
 * 전역 객체에 에뮬레이터 바인딩
 */
declare global {
  interface Window {
    System6502: typeof System6502;
    BasicEmulator: typeof BasicEmulator;
    CPU6502: typeof CPU6502;
    MemoryManager: typeof MemoryManager;
    Terminal: typeof Terminal;
  }
}

// 브라우저 환경에서 전역 접근 가능하도록 설정
if (typeof window !== 'undefined') {
  window.System6502 = System6502;
  window.BasicEmulator = BasicEmulator;
  window.CPU6502 = CPU6502;
  window.MemoryManager = MemoryManager;
  window.Terminal = Terminal;

  console.log('6502 BASIC Emulator modules loaded on window object');
}