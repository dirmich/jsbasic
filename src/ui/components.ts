/**
 * UI 컴포넌트 클래스들
 * 
 * 6502 BASIC 에뮬레이터의 사용자 인터페이스 컴포넌트를 정의합니다.
 */

import { EventEmitter } from '../utils/events.js';

// DOM 유틸리티 함수들
function safeCreateElement(tagName: string): HTMLElement {
  if (typeof document !== 'undefined') {
    return document.createElement(tagName);
  }
  
  // Node.js 환경에서는 더미 객체 반환
  return {
    id: '',
    className: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => false,
      replace: () => {},
      length: 0,
      value: '',
      toString: () => '',
      item: () => null,
      forEach: () => {},
      entries: () => [][Symbol.iterator](),
      keys: () => [][Symbol.iterator](),
      values: () => [][Symbol.iterator]()
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    innerHTML: '',
    textContent: '',
    tagName: tagName.toUpperCase(),
    type: '',
    value: '',
    checked: false,
    onclick: null,
    oninput: null,
    onchange: null
  } as any;
}

/**
 * 기본 UI 컴포넌트 인터페이스
 */
export interface UIComponent {
  readonly id: string;
  readonly element: HTMLElement;
  render(): void;
  destroy(): void;
  isVisible(): boolean;
  show(): void;
  hide(): void;
}

/**
 * 컴포넌트 이벤트 타입
 */
export interface ComponentEvents extends Record<string, (...args: any[]) => void> {
  show: () => void;
  hide: () => void;
  render: () => void;
  destroy: () => void;
}

/**
 * 기본 UI 컴포넌트 추상 클래스
 */
export abstract class BaseComponent extends EventEmitter<ComponentEvents> implements UIComponent {
  protected _element: HTMLElement;
  protected _visible: boolean = true;

  constructor(
    public readonly id: string,
    elementTag: string = 'div'
  ) {
    super();
    
    this._element = safeCreateElement(elementTag);
    this._element.id = id;
    this._element.className = `component component-${id}`;
  }

  get element(): HTMLElement {
    return this._element;
  }

  abstract render(): void;

  destroy(): void {
    this.emit('destroy');
    if (this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
  }

  isVisible(): boolean {
    return this._visible;
  }

  show(): void {
    this._visible = true;
    this._element.style.display = '';
    this.emit('show');
  }

  hide(): void {
    this._visible = false;
    this._element.style.display = 'none';
    this.emit('hide');
  }

  protected addClass(className: string): void {
    this._element.classList.add(className);
  }

  protected removeClass(className: string): void {
    this._element.classList.remove(className);
  }

  protected hasClass(className: string): boolean {
    return this._element.classList.contains(className);
  }
}

/**
 * 터미널 컴포넌트
 */
export class TerminalComponent extends BaseComponent {
  private outputElement!: HTMLElement;
  private inputElement!: HTMLInputElement;
  private promptElement!: HTMLElement;
  private history: string[] = [];
  private historyIndex: number = -1;

  constructor(id: string = 'terminal') {
    super(id, 'div');
    this.addClass('terminal');
    this.createElements();
    this.setupEventListeners();
  }

  private createElements(): void {
    // 출력 영역
    this.outputElement = safeCreateElement('div');
    this.outputElement.className = 'terminal-output';
    this.outputElement.id = `${this.id}-output`;

    // 입력 영역 컨테이너
    const inputContainer = safeCreateElement('div');
    inputContainer.className = 'terminal-input-container';

    // 프롬프트
    this.promptElement = safeCreateElement('span');
    this.promptElement.className = 'terminal-prompt';
    this.promptElement.textContent = 'READY\n>';

    // 입력 필드
    this.inputElement = safeCreateElement('input') as HTMLInputElement;
    this.inputElement.type = 'text';
    this.inputElement.className = 'terminal-input';
    this.inputElement.id = `${this.id}-input`;

    inputContainer.appendChild(this.promptElement);
    inputContainer.appendChild(this.inputElement);

    this._element.appendChild(this.outputElement);
    this._element.appendChild(inputContainer);
  }

  private setupEventListeners(): void {
    this.inputElement.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
          this.handleEnter();
          break;
        case 'ArrowUp':
          this.handleHistoryUp();
          e.preventDefault();
          break;
        case 'ArrowDown':
          this.handleHistoryDown();
          e.preventDefault();
          break;
      }
    });
  }

  private handleEnter(): void {
    const input = this.inputElement.value.trim();
    if (input) {
      this.addToHistory(input);
      this.appendOutput(`>${input}`, 'input');
      this.emit('command', input);
    }
    this.inputElement.value = '';
    this.historyIndex = -1;
  }

  private handleHistoryUp(): void {
    if (this.history.length === 0) return;
    
    if (this.historyIndex === -1) {
      this.historyIndex = this.history.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    
    this.inputElement.value = this.history[this.historyIndex] ?? '';
  }

  private handleHistoryDown(): void {
    if (this.historyIndex === -1 || this.history.length === 0) return;
    
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.inputElement.value = this.history[this.historyIndex] ?? '';
    } else {
      this.historyIndex = -1;
      this.inputElement.value = '';
    }
  }

  private addToHistory(command: string): void {
    this.history.push(command);
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  render(): void {
    this.emit('render');
  }

  appendOutput(text: string, type: 'output' | 'error' | 'input' = 'output'): void {
    const line = safeCreateElement('div');
    line.className = `terminal-line terminal-${type}`;
    line.textContent = text;
    this.outputElement.appendChild(line);
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }

  clearOutput(): void {
    this.outputElement.innerHTML = '';
  }

  setPrompt(prompt: string): void {
    this.promptElement.textContent = prompt;
  }

  focus(): void {
    this.inputElement.focus();
  }
}

/**
 * 메모리 뷰어 컴포넌트
 */
export class MemoryViewerComponent extends BaseComponent {
  private tableElement!: HTMLTableElement;
  private addressInput!: HTMLInputElement;
  private currentAddress: number = 0x0000;

  constructor(id: string = 'memory-viewer') {
    super(id, 'div');
    this.addClass('memory-viewer');
    this.createElements();
    this.setupEventListeners();
  }

  private createElements(): void {
    // 제어 패널
    const controls = safeCreateElement('div');
    controls.className = 'memory-controls';

    const addressLabel = safeCreateElement('label');
    addressLabel.textContent = 'Address: $';

    this.addressInput = safeCreateElement('input') as HTMLInputElement;
    this.addressInput.type = 'text';
    this.addressInput.value = '0000';
    this.addressInput.maxLength = 4;
    this.addressInput.className = 'address-input';

    const refreshButton = safeCreateElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.onclick = () => this.refresh();

    controls.appendChild(addressLabel);
    controls.appendChild(this.addressInput);
    controls.appendChild(refreshButton);

    // 메모리 테이블
    this.tableElement = safeCreateElement('table') as HTMLTableElement;
    this.tableElement.className = 'memory-table';

    this._element.appendChild(controls);
    this._element.appendChild(this.tableElement);
  }

  private setupEventListeners(): void {
    this.addressInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.updateAddress();
      }
    });

    this.addressInput.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      input.value = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
    });
  }

  private updateAddress(): void {
    const addressStr = this.addressInput.value;
    const address = parseInt(addressStr, 16);
    
    if (!isNaN(address) && address >= 0 && address <= 0xFFFF) {
      this.currentAddress = address;
      this.refresh();
    }
  }

  render(): void {
    this.refresh();
    this.emit('render');
  }

  refresh(): void {
    this.tableElement.innerHTML = '';
    
    // 헤더 생성
    const header = this.tableElement.createTHead();
    const headerRow = header.insertRow();
    headerRow.insertCell().textContent = 'Address';
    
    for (let i = 0; i < 16; i++) {
      headerRow.insertCell().textContent = i.toString(16).toUpperCase();
    }
    headerRow.insertCell().textContent = 'ASCII';

    // 데이터 행 생성
    const tbody = this.tableElement.createTBody();
    const baseAddress = this.currentAddress & 0xFFF0;

    for (let row = 0; row < 16; row++) {
      const tableRow = tbody.insertRow();
      const rowAddress = baseAddress + (row * 16);
      
      // 주소 컬럼
      const addressCell = tableRow.insertCell();
      addressCell.textContent = '$' + rowAddress.toString(16).toUpperCase().padStart(4, '0');
      addressCell.className = 'address-cell';

      let asciiText = '';
      
      // 데이터 컬럼들
      for (let col = 0; col < 16; col++) {
        const address = rowAddress + col;
        const cell = tableRow.insertCell();
        
        // 여기서는 임시로 0을 표시 (실제로는 메모리 매니저에서 읽어야 함)
        const value = 0; // memory.read(address)
        cell.textContent = value.toString(16).toUpperCase().padStart(2, '0');
        cell.className = 'data-cell';
        
        // ASCII 문자 생성
        const char = (value >= 32 && value <= 126) ? String.fromCharCode(value) : '.';
        asciiText += char;
      }

      // ASCII 컬럼
      const asciiCell = tableRow.insertCell();
      asciiCell.textContent = asciiText;
      asciiCell.className = 'ascii-cell';
    }
  }

  setMemory(memory: any): void {
    // 메모리 매니저 참조 설정
    // this.memory = memory;
    this.refresh();
  }

  jumpToAddress(address: number): void {
    this.currentAddress = address;
    this.addressInput.value = address.toString(16).toUpperCase().padStart(4, '0');
    this.refresh();
  }
}

/**
 * CPU 상태 컴포넌트
 */
export class CPUStatusComponent extends BaseComponent {
  private registerElements: { [key: string]: HTMLElement } = {};
  private flagElements: { [key: string]: HTMLElement } = {};

  constructor(id: string = 'cpu-status') {
    super(id, 'div');
    this.addClass('cpu-status');
    this.createElements();
  }

  private createElements(): void {
    const title = safeCreateElement('h3');
    title.textContent = '6502 CPU Status';
    this._element.appendChild(title);

    // 레지스터 섹션
    const registersSection = safeCreateElement('div');
    registersSection.className = 'registers-section';
    
    const registersTitle = safeCreateElement('h4');
    registersTitle.textContent = 'Registers';
    registersSection.appendChild(registersTitle);

    const registers = ['A', 'X', 'Y', 'SP', 'PC'];
    registers.forEach(reg => {
      const regDiv = safeCreateElement('div');
      regDiv.className = 'register';
      
      const label = safeCreateElement('span');
      label.className = 'register-label';
      label.textContent = `${reg}:`;
      
      const value = safeCreateElement('span');
      value.className = 'register-value';
      value.id = `${this.id}-${reg}`;
      value.textContent = '$00';
      
      regDiv.appendChild(label);
      regDiv.appendChild(value);
      registersSection.appendChild(regDiv);
      
      this.registerElements[reg] = value;
    });

    // 플래그 섹션
    const flagsSection = safeCreateElement('div');
    flagsSection.className = 'flags-section';
    
    const flagsTitle = safeCreateElement('h4');
    flagsTitle.textContent = 'Status Flags';
    flagsSection.appendChild(flagsTitle);

    const flags = [
      { name: 'N', description: 'Negative' },
      { name: 'V', description: 'Overflow' },
      { name: 'B', description: 'Break' },
      { name: 'D', description: 'Decimal' },
      { name: 'I', description: 'Interrupt' },
      { name: 'Z', description: 'Zero' },
      { name: 'C', description: 'Carry' }
    ];

    flags.forEach(flag => {
      const flagDiv = safeCreateElement('div');
      flagDiv.className = 'flag';
      
      const checkbox = safeCreateElement('input') as HTMLInputElement;
      checkbox.type = 'checkbox';
      checkbox.disabled = true;
      checkbox.id = `${this.id}-flag-${flag.name}`;

      const label = safeCreateElement('label') as HTMLLabelElement;
      label.htmlFor = checkbox.id;
      label.textContent = `${flag.name} (${flag.description})`;
      
      flagDiv.appendChild(checkbox);
      flagDiv.appendChild(label);
      flagsSection.appendChild(flagDiv);
      
      this.flagElements[flag.name] = checkbox;
    });

    this._element.appendChild(registersSection);
    this._element.appendChild(flagsSection);
  }

  render(): void {
    this.emit('render');
  }

  updateRegisters(registers: { A: number; X: number; Y: number; SP: number; PC: number }): void {
    if (this.registerElements.A) this.registerElements.A.textContent = '$' + registers.A.toString(16).toUpperCase().padStart(2, '0');
    if (this.registerElements.X) this.registerElements.X.textContent = '$' + registers.X.toString(16).toUpperCase().padStart(2, '0');
    if (this.registerElements.Y) this.registerElements.Y.textContent = '$' + registers.Y.toString(16).toUpperCase().padStart(2, '0');
    if (this.registerElements.SP) this.registerElements.SP.textContent = '$' + registers.SP.toString(16).toUpperCase().padStart(2, '0');
    if (this.registerElements.PC) this.registerElements.PC.textContent = '$' + registers.PC.toString(16).toUpperCase().padStart(4, '0');
  }

  updateFlags(flags: { N: boolean; V: boolean; B: boolean; D: boolean; I: boolean; Z: boolean; C: boolean }): void {
    Object.keys(flags).forEach(flag => {
      const element = this.flagElements[flag] as HTMLInputElement;
      if (element) {
        element.checked = flags[flag as keyof typeof flags];
      }
    });
  }
}