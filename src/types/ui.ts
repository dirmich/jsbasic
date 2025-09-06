/**
 * User Interface Type Definitions
 */

// UI Component types
export enum UIComponentType {
  TERMINAL = 'TERMINAL',
  CODE_EDITOR = 'CODE_EDITOR',
  DEBUGGER = 'DEBUGGER',
  MEMORY_VIEWER = 'MEMORY_VIEWER',
  REGISTER_VIEWER = 'REGISTER_VIEWER',
  DISASSEMBLER = 'DISASSEMBLER',
  FILE_BROWSER = 'FILE_BROWSER',
  SETTINGS = 'SETTINGS'
}

// Base UI Component
export interface UIComponent {
  id: string;
  type: UIComponentType;
  title: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Component lifecycle
  mount(container: HTMLElement): void;
  unmount(): void;
  render(): void;
  update(data?: any): void;
  
  // Event handling
  addEventListener(event: string, handler: Function): void;
  removeEventListener(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
}

// Terminal component
export interface TerminalComponent extends UIComponent {
  type: UIComponentType.TERMINAL;
  
  // Terminal properties
  rows: number;
  cols: number;
  fontSize: number;
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  cursorColor: string;
  
  // Terminal operations
  write(text: string): void;
  writeLine(text: string): void;
  clear(): void;
  setCursor(row: number, col: number): void;
  getCursor(): { row: number; col: number };
  getContent(): string;
  setPrompt(prompt: string): void;
  
  // Input handling
  onInput(callback: (input: string) => void): void;
  onKeyPress(callback: (key: string, keyCode: number) => void): void;
}

// Code editor component
export interface CodeEditorComponent extends UIComponent {
  type: UIComponentType.CODE_EDITOR;
  
  // Editor properties
  language: 'basic' | 'assembly' | 'javascript';
  theme: 'light' | 'dark';
  lineNumbers: boolean;
  wordWrap: boolean;
  tabSize: number;
  
  // Editor operations
  setValue(content: string): void;
  getValue(): string;
  insertText(text: string): void;
  setReadOnly(readonly: boolean): void;
  undo(): void;
  redo(): void;
  find(text: string): void;
  replace(find: string, replace: string): void;
  
  // Line operations
  gotoLine(line: number): void;
  getCurrentLine(): number;
  setBreakpoint(line: number): void;
  removeBreakpoint(line: number): void;
  getBreakpoints(): number[];
  
  // Event callbacks
  onChange(callback: (content: string) => void): void;
  onSave(callback: (content: string) => void): void;
}

// Memory viewer component
export interface MemoryViewerComponent extends UIComponent {
  type: UIComponentType.MEMORY_VIEWER;
  
  // Viewer properties
  baseAddress: number;
  bytesPerRow: number;
  totalRows: number;
  showAscii: boolean;
  showAddresses: boolean;
  
  // Viewer operations
  setMemory(memory: Uint8Array): void;
  updateMemory(address: number, value: number): void;
  gotoAddress(address: number): void;
  refresh(): void;
  
  // Highlighting
  highlightByte(address: number, color?: string): void;
  highlightRange(start: number, end: number, color?: string): void;
  clearHighlights(): void;
}

// Register viewer component
export interface RegisterViewerComponent extends UIComponent {
  type: UIComponentType.REGISTER_VIEWER;
  
  // Register display
  showHex: boolean;
  showDecimal: boolean;
  showBinary: boolean;
  showFlags: boolean;
  
  // Register operations
  updateRegisters(registers: any): void;
  highlightRegister(register: string, color?: string): void;
  clearHighlights(): void;
}

// Application state
export interface ApplicationState {
  cpu: {
    registers: any;
    memory: Uint8Array;
    running: boolean;
    breakpoints: number[];
  };
  
  basic: {
    program: string;
    variables: Map<string, any>;
    currentLine: number;
  };
  
  ui: {
    activeComponents: UIComponentType[];
    theme: 'light' | 'dark';
    fontSize: number;
    layout: 'tabs' | 'windows' | 'panels';
  };
  
  files: {
    currentFile?: string;
    recentFiles: string[];
    savedPrograms: Map<string, string>;
  };
}

// UI Manager interface
export interface UIManager {
  components: Map<string, UIComponent>;
  state: ApplicationState;
  
  // Component management
  createComponent(type: UIComponentType, config?: any): UIComponent;
  addComponent(component: UIComponent): void;
  removeComponent(componentId: string): void;
  getComponent(componentId: string): UIComponent | undefined;
  showComponent(componentId: string): void;
  hideComponent(componentId: string): void;
  
  // Layout management
  setLayout(layout: 'tabs' | 'windows' | 'panels'): void;
  resizeComponent(componentId: string, width: number, height: number): void;
  moveComponent(componentId: string, x: number, y: number): void;
  
  // State management
  updateState(updates: Partial<ApplicationState>): void;
  getState(): ApplicationState;
  saveState(): void;
  loadState(): void;
  
  // Event handling
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
  
  // Theme and appearance
  setTheme(theme: 'light' | 'dark'): void;
  setFontSize(size: number): void;
  
  // File operations
  loadFile(filename: string): Promise<string>;
  saveFile(filename: string, content: string): Promise<void>;
  showFileDialog(mode: 'open' | 'save'): Promise<string | null>;
}