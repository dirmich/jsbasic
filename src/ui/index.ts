/**
 * User Interface Module
 * 
 * 6502 BASIC 에뮬레이터 사용자 인터페이스 모듈입니다.
 * 터미널, 메모리 뷰어, CPU 상태 등의 컴포넌트를 제공합니다.
 */

export { 
  BaseComponent, 
  TerminalComponent, 
  MemoryViewerComponent, 
  CPUStatusComponent,
  type UIComponent,
  type ComponentEvents 
} from './components.js';

export const UI_MODULE_VERSION = '0.1.0';

console.log('UI module loaded - 6502 BASIC UI components ready');