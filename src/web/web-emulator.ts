/**
 * 웹 환경용 에뮬레이터 래퍼
 * 브라우저 환경에 최적화된 기능들을 제공합니다.
 */

import { BasicEmulator, EmulatorState } from '../system/emulator.js';
import { Terminal, TerminalState } from '../io/terminal.js';
import { EventEmitter } from '../utils/events.js';
import { VirtualKeyboard } from '../mobile/virtual-keyboard.js';
import { MobilePerformanceMonitor } from '../mobile/performance-metrics.js';
import { ExampleBrowser } from './components/example-browser.js';
import { ExampleLoader } from './example-loader.js';
import { GraphicsEngine } from '../graphics/graphics-engine.js';
import { AudioEngine } from '../audio/audio-engine.js';
import { PixelBuffer } from '../graphics/pixel-buffer.js';
import { ColorManager } from '../graphics/color-manager.js';
import { DisplayManager } from '../graphics/display-manager.js';
import { SCREEN_MODES } from '../types/graphics.js';

export interface WebEmulatorConfig {
  containerId: string;
  autoFocus?: boolean;
  enablePersistence?: boolean;
  theme?: 'dark' | 'light';
}

export interface WebEmulatorCallbacks {
  onOutput?: (text: string, type: 'output' | 'error' | 'system') => void;
  onStateChange?: (state: EmulatorState) => void;
  onCommand?: (command: string) => void;
}

interface WebEmulatorEvents extends Record<string, (...args: any[]) => void> {
  initialized: () => void;
  error: (error: Error) => void;
  stateChange: (event: { oldState: EmulatorState; newState: EmulatorState }) => void;
  output: (event: { text: string; type: 'output' | 'error' | 'system' }) => void;
}

/**
 * 웹 환경용 에뮬레이터 클래스
 */
export class WebEmulator extends EventEmitter<WebEmulatorEvents> {
  private emulator: BasicEmulator;
  private container: HTMLElement;
  private config: WebEmulatorConfig;
  private callbacks: WebEmulatorCallbacks;

  // DOM 요소들
  private terminalOutput: HTMLElement | null = null;
  private terminalInput: HTMLInputElement | null = null;
  private systemInfoElements: Map<string, HTMLElement> = new Map();
  private graphicsCanvas: HTMLCanvasElement | null = null;
  private graphicsContext: CanvasRenderingContext2D | null = null;
  private graphicsContainer: HTMLElement | null = null;

  // 모바일 컴포넌트
  private virtualKeyboard: VirtualKeyboard | null = null;
  private performanceMonitor: MobilePerformanceMonitor | null = null;

  // 예제 시스템
  private exampleBrowser: ExampleBrowser | null = null;
  private exampleLoader: ExampleLoader | null = null;

  // 그래픽 및 오디오 엔진
  private graphicsEngine: GraphicsEngine | null = null;
  private audioEngine: AudioEngine | null = null;
  private displayManager: DisplayManager | null = null;

  // 상태 관리
  private isInitialized = false;
  private updateInterval: number | null = null;
  private animationFrameId: number | null = null;
  private graphicsVisible = false;

  constructor(config: WebEmulatorConfig, callbacks: WebEmulatorCallbacks = {}) {
    super();
    
    this.config = config;
    this.callbacks = callbacks;
    
    // 컨테이너 요소 찾기
    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container element with id '${config.containerId}' not found`);
    }
    
    this.container = container;
    this.emulator = new BasicEmulator();
    
    this.initialize();
  }

  /**
   * 웹 에뮬레이터 초기화
   */
  private initialize(): void {
    try {
      // DOM 요소들 찾기
      this.findDOMElements();

      // 그래픽 및 오디오 엔진 초기화
      this.initializeGraphicsAndAudio();

      // 모바일 환경 감지 및 초기화
      this.initializeMobile();

      // 예제 브라우저 초기화
      this.initializeExampleBrowser();

      // 이벤트 핸들러 설정
      this.setupEventHandlers();

      // 에뮬레이터 시작
      this.emulator.start();

      // 주기적 업데이트 시작
      this.startPeriodicUpdate();

      this.isInitialized = true;
      this.emit('initialized');

      console.log('🎮 WebEmulator initialized successfully');

    } catch (error) {
      console.error('❌ WebEmulator initialization failed:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * DOM 요소들 찾기
   */
  private findDOMElements(): void {
    this.terminalOutput = document.getElementById('terminal-output');
    this.terminalInput = document.getElementById('terminal-input') as HTMLInputElement;

    // 그래픽 요소들
    this.graphicsCanvas = document.getElementById('graphics-canvas') as HTMLCanvasElement;
    this.graphicsContainer = document.getElementById('graphics-container');

    if (this.graphicsCanvas) {
      this.graphicsContext = this.graphicsCanvas.getContext('2d', {
        alpha: false,
        desynchronized: true // 성능 향상
      });
    }

    // 시스템 정보 요소들
    const systemInfoSelectors = [
      'cpu-status', 'memory-status', 'uptime',
      'reg-a', 'reg-x', 'reg-y', 'reg-pc', 'reg-sp', 'reg-p'
    ];

    systemInfoSelectors.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.systemInfoElements.set(id, element);
      }
    });
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    console.log('[WebEmulator] Setting up event handlers...');

    // 에뮬레이터 이벤트
    this.emulator.on('stateChange', (event: any) => {
      this.callbacks.onStateChange?.(event.to);
      this.emit('stateChange', { oldState: event.from, newState: event.to });
    });

    // 터미널 이벤트
    const terminal = this.emulator.getTerminal();
    console.log('[WebEmulator] Terminal obtained:', terminal);
    console.log('[WebEmulator] Setting up terminal output listener...');

    terminal.on('output', (event) => {
      console.log('[WebEmulator] Terminal output event received:', event);
      this.displayOutput(event.text, event.type);
      this.callbacks.onOutput?.(event.text, event.type);
    });

    console.log('[WebEmulator] Terminal output listener registered');
    
    // 키보드 이벤트
    if (this.terminalInput) {
      this.terminalInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
      
      if (this.config.autoFocus !== false) {
        this.terminalInput.focus();
      }
    }
    
    // 터미널 클릭 시 포커스
    if (this.terminalOutput?.parentElement) {
      this.terminalOutput.parentElement.addEventListener('click', () => {
        this.terminalInput?.focus();
      });
    }
  }

  /**
   * 키보드 이벤트 처리
   */
  private async handleKeyDown(e: KeyboardEvent): Promise<void> {
    const input = e.target as HTMLInputElement;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        const command = input.value;
        input.value = '';

        if (command.trim()) {
          console.log('[WebEmulator] Command entered:', command);
          this.callbacks.onCommand?.(command);
          await this.executeCommand(command);
        }
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault();
        // 명령어 히스토리 처리 (나중에 구현)
        break;
        
      case 'Tab':
        e.preventDefault();
        // 자동완성 (나중에 구현)
        break;
    }
  }

  /**
   * 명령어 실행
   */
  private async executeCommand(command: string): Promise<void> {
    try {
      console.log('[WebEmulator] executeCommand called:', command);
      const terminal = this.emulator.getTerminal();
      console.log('[WebEmulator] Terminal obtained:', terminal);

      // 명령어를 터미널에 직접 전달 (command 이벤트 발생)
      // 결과는 터미널 output 이벤트로 표시됨
      console.log('[WebEmulator] Emitting command to terminal');
      terminal.emit('command', command);
      console.log('[WebEmulator] Command emitted');

    } catch (error) {
      console.error('[WebEmulator] Command execution error:', error);
      this.displayOutput(`ERROR: ${error}`, 'error');
    }
  }

  /**
   * 터미널 출력 표시
   */
  private displayOutput(text: string, type: 'input' | 'output' | 'error' | 'system'): void {
    console.log('[WebEmulator] displayOutput called:', { text, type, hasTerminalOutput: !!this.terminalOutput });

    if (!this.terminalOutput) {
      console.error('[WebEmulator] terminalOutput element not found!');
      return;
    }

    const lines = text.split('\n');
    console.log('[WebEmulator] Lines to display:', lines);

    lines.forEach(line => {
      const div = document.createElement('div');
      div.className = `terminal-line ${type}`;
      div.textContent = line;
      this.terminalOutput!.appendChild(div);
      console.log('[WebEmulator] Line added to terminal:', line);
    });

    // 스크롤을 맨 아래로
    this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
  }

  /**
   * 시스템 정보 업데이트
   */
  private updateSystemInfo(): void {
    const stats = this.emulator.getStats();
    const cpu = this.emulator.getCPU();
    const state = this.emulator.getState();

    // 시스템 상태
    const cpuElement = this.systemInfoElements.get('cpu-status');
    if (cpuElement) {
      cpuElement.textContent = `CPU: ${state === EmulatorState.RUNNING_BASIC ? '실행중' : '정지'}`;
    }

    const memoryElement = this.systemInfoElements.get('memory-status');
    if (memoryElement) {
      memoryElement.textContent = `메모리: ${Math.floor(stats.memoryUsed / 1024)}KB`;
    }

    const uptimeElement = this.systemInfoElements.get('uptime');
    if (uptimeElement) {
      const uptimeSeconds = Math.floor(stats.uptime / 1000);
      uptimeElement.textContent = `가동시간: ${uptimeSeconds}s`;
    }

    // 그래픽 모드 체크
    if (this.graphicsEngine && this.graphicsContainer) {
      const screenMode = this.graphicsEngine.getScreenMode();
      const shouldShowGraphics = screenMode !== 0;

      if (shouldShowGraphics !== this.graphicsVisible) {
        this.graphicsVisible = shouldShowGraphics;
        this.graphicsContainer.style.display = shouldShowGraphics ? 'flex' : 'none';
        console.log(`🖼️ Graphics display: ${shouldShowGraphics ? 'ON' : 'OFF'} (mode ${screenMode})`);
      }
    }

    // CPU 레지스터 (실제 구현에서는 CPU 상태를 가져와야 함)
    const debugInfo = cpu?.getDebugInfo?.() || {
      registers: { A: 0, X: 0, Y: 0, PC: 0, SP: 0xFF, P: 0 },
      flags: { N: false, V: false, B: false, D: false, I: false, Z: false, C: false }
    };

    ['A', 'X', 'Y', 'PC', 'SP', 'P'].forEach(reg => {
      const element = this.systemInfoElements.get(`reg-${reg.toLowerCase()}`);
      if (element) {
        const value = debugInfo.registers[reg as keyof typeof debugInfo.registers] || 0;
        const format = reg === 'PC' ? 4 : 2;
        element.textContent = `$${value.toString(16).padStart(format, '0').toUpperCase()}`;
      }
    });
  }

  /**
   * 주기적 업데이트 시작
   */
  private startPeriodicUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = window.setInterval(() => {
      this.updateSystemInfo();
    }, 1000);

    // 그래픽 업데이트 시작 (60 FPS 목표)
    this.startGraphicsUpdate();
  }

  /**
   * 그래픽 업데이트 시작 (requestAnimationFrame 사용)
   */
  private startGraphicsUpdate(): void {
    // 이전 애니메이션 프레임 취소
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // requestAnimationFrame을 사용한 렌더링 루프
    const render = () => {
      if (this.graphicsVisible) {
        this.renderGraphics();
      }
      // 다음 프레임 예약 (브라우저가 최적화)
      this.animationFrameId = requestAnimationFrame(render);
    };

    // 첫 프레임 시작
    this.animationFrameId = requestAnimationFrame(render);
  }

  /**
   * 그래픽 업데이트 중지
   */
  private stopGraphicsUpdate(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 그래픽 렌더링
   */
  private renderGraphics(): void {
    if (!this.graphicsContext || !this.graphicsCanvas) {
      return;
    }

    const pixelBuffer = this.emulator.getPixelBuffer();
    const colorManager = this.emulator.getColorManager();

    const bufferWidth = pixelBuffer.getWidth();
    const bufferHeight = pixelBuffer.getHeight();

    // Canvas 크기 조정 (필요한 경우)
    if (this.graphicsCanvas.width !== bufferWidth * 2 ||
        this.graphicsCanvas.height !== bufferHeight * 2) {
      this.graphicsCanvas.width = bufferWidth * 2; // 2배 스케일링
      this.graphicsCanvas.height = bufferHeight * 2;
    }

    // ImageData 생성
    const imageData = this.graphicsContext.createImageData(bufferWidth, bufferHeight);
    const data = imageData.data;

    // PixelBuffer 데이터를 ImageData로 변환
    for (let y = 0; y < bufferHeight; y++) {
      for (let x = 0; x < bufferWidth; x++) {
        const colorIndex = pixelBuffer.getPixel(x, y);
        const rgb = colorManager.getRGB(colorIndex);

        const index = (y * bufferWidth + x) * 4;
        data[index] = rgb.r;
        data[index + 1] = rgb.g;
        data[index + 2] = rgb.b;
        data[index + 3] = 255; // 알파 채널
      }
    }

    // 임시 캔버스에 ImageData 그리기
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bufferWidth;
    tempCanvas.height = bufferHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);

      // 메인 캔버스에 2배 확대해서 그리기 (nearest-neighbor 스케일링)
      this.graphicsContext.imageSmoothingEnabled = false;
      this.graphicsContext.drawImage(
        tempCanvas,
        0, 0, bufferWidth, bufferHeight,
        0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height
      );
    }
  }

  /**
   * 그래픽 화면 표시/숨기기
   */
  toggleGraphics(show?: boolean): void {
    if (show !== undefined) {
      this.graphicsVisible = show;
    } else {
      this.graphicsVisible = !this.graphicsVisible;
    }

    if (this.graphicsContainer) {
      this.graphicsContainer.style.display = this.graphicsVisible ? 'block' : 'none';
    }

    // 첫 렌더링
    if (this.graphicsVisible) {
      this.renderGraphics();
    }
  }

  /**
   * 스크린샷 저장
   */
  saveScreenshot(): void {
    if (!this.graphicsCanvas) {
      return;
    }

    this.graphicsCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  /**
   * 터미널 지우기
   */
  clearTerminal(): void {
    if (this.terminalOutput) {
      this.terminalOutput.innerHTML = '';
    }
  }

  /**
   * 에뮬레이터 재시작
   */
  restart(): void {
    this.clearTerminal();
    this.emulator.stop();
    this.emulator.start();
  }

  /**
   * 명령어 실행 (외부에서 호출)
   */
  async runCommand(command: string): Promise<void> {
    await this.executeCommand(command);
  }

  /**
   * 현재 프로그램 가져오기
   */
  getCurrentProgram(): any {
    return this.emulator.getBasicInterpreter().getCurrentProgram();
  }

  /**
   * 메모리 내용 가져오기
   */
  getMemoryData(address: number, length: number = 256): number[] {
    const memory = this.emulator.getMemoryManager();
    const data: number[] = [];
    
    for (let i = 0; i < length; i++) {
      try {
        data.push(memory.read(address + i));
      } catch {
        data.push(0);
      }
    }
    
    return data;
  }

  /**
   * 모바일 환경 감지 및 초기화
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  }

  /**
   * 모바일 컴포넌트 초기화
   */
  private initializeMobile(): void {
    if (!this.isMobileDevice()) {
      console.log('💻 Desktop mode - mobile features disabled');
      return;
    }

    console.log('📱 Mobile mode - initializing mobile features');

    // 가상 키보드 초기화
    const keyboardContainer = document.getElementById('keyboard-container');
    if (keyboardContainer) {
      this.virtualKeyboard = new VirtualKeyboard(keyboardContainer, {
        layout: 'default',
        theme: this.config.theme === 'dark' ? 'dark' : 'light',
        hapticFeedback: true,
        soundFeedback: false,
        keyHeight: 44,
        keySpacing: 4
      });

      // 가상 키보드 이벤트 처리
      this.virtualKeyboard.on('keypress', (key: string) => {
        this.handleVirtualKey(key);
      });

      // 자동으로 키보드 표시
      this.virtualKeyboard.show();
    }

    // 성능 모니터 초기화
    this.performanceMonitor = new MobilePerformanceMonitor({
      minFPS: 30,
      maxMemory: 500,
      maxTouchLatency: 100,
      maxRenderTime: 16.67
    });

    // 성능 경고 처리
    this.performanceMonitor.on('warning', (warning) => {
      console.warn(`⚠️ Performance warning: ${warning.message}`);
    });

    // 성능 모니터링 시작
    this.performanceMonitor.startMonitoring();
  }

  /**
   * 가상 키보드 입력 처리
   */
  private handleVirtualKey(key: string): void {
    if (!this.terminalInput) return;

    const input = this.terminalInput;

    if (key === '\b') {
      // Backspace
      input.value = input.value.slice(0, -1);
    } else if (key === '\n') {
      // Enter
      const command = input.value;
      input.value = '';
      if (command.trim()) {
        this.executeCommand(command);
      }
    } else {
      // 일반 문자
      input.value += key;
    }

    // 입력 필드에 포커스 유지
    input.focus();
  }

  /**
   * 가상 키보드 표시/숨김
   */
  toggleVirtualKeyboard(): void {
    if (this.virtualKeyboard) {
      this.virtualKeyboard.toggle();
    }
  }

  /**
   * 가상 키보드 레이아웃 변경
   */
  setVirtualKeyboardLayout(layout: 'default' | 'basic' | 'numeric' | 'symbols'): void {
    if (this.virtualKeyboard) {
      this.virtualKeyboard.setLayout(layout);
    }
  }

  /**
   * 성능 메트릭 가져오기
   */
  getPerformanceMetrics() {
    if (this.performanceMonitor) {
      return this.performanceMonitor.getMetrics();
    }
    return null;
  }

  /**
   * 그래픽 및 오디오 엔진 초기화
   */
  private initializeGraphicsAndAudio(): void {
    try {
      console.log('🎨 Initializing graphics and audio engines...');

      // 그래픽 엔진 초기화
      if (this.graphicsCanvas) {
        console.log('📐 Canvas found:', this.graphicsCanvas.width, 'x', this.graphicsCanvas.height);

        // 기본 화면 모드 (320x200, 16색)
        const defaultMode = SCREEN_MODES[1];
        if (!defaultMode) {
          throw new Error('Default screen mode not found in SCREEN_MODES[1]');
        }
        console.log('📺 Screen mode:', defaultMode.width, 'x', defaultMode.height, defaultMode.colors, 'colors');

        // PixelBuffer와 ColorManager 생성
        const pixelBuffer = new PixelBuffer(
          defaultMode.width,
          defaultMode.height
        );
        console.log('🎨 PixelBuffer created');

        const colorManager = new ColorManager();
        console.log('🎨 ColorManager created');

        // GraphicsEngine 생성 (올바른 인자 전달)
        this.graphicsEngine = new GraphicsEngine(pixelBuffer, colorManager);
        console.log('🎨 GraphicsEngine created');

        // DisplayManager 생성 (Canvas에 렌더링)
        this.displayManager = new DisplayManager(
          this.graphicsCanvas,
          pixelBuffer,
          colorManager,
          defaultMode
        );
        console.log('🎨 DisplayManager created');

        // BasicEmulator의 interpreter에 연결
        const interpreter = this.emulator.getBasicInterpreter();
        if (interpreter) {
          interpreter.setGraphicsEngine(this.graphicsEngine);
          console.log('🎨 Graphics engine connected to interpreter');
        } else {
          console.warn('⚠️ Interpreter not found - graphics engine not connected');
        }

        // 렌더링 루프 시작
        this.startRenderLoop();
      } else {
        console.warn('⚠️ Graphics canvas not found - graphics disabled');
      }

      // 오디오 엔진 초기화
      console.log('🔊 Initializing audio engine...');
      this.audioEngine = new AudioEngine();
      console.log('🔊 AudioEngine created');

      const interpreter = this.emulator.getBasicInterpreter();
      if (interpreter) {
        interpreter.setAudioEngine(this.audioEngine);
        console.log('🔊 Audio engine connected to interpreter');
      } else {
        console.warn('⚠️ Interpreter not found - audio engine not connected');
      }

      console.log('✅ Graphics and audio engines initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize graphics/audio engines:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * 그래픽 렌더링 루프 시작
   */
  private startRenderLoop(): void {
    const render = () => {
      // DisplayManager가 있으면 전체 화면 렌더링
      // TODO: 최적화 - markDirty() 기반 부분 렌더링으로 전환
      if (this.displayManager && this.graphicsVisible) {
        this.displayManager.render();
      }

      // 다음 프레임 예약
      this.animationFrameId = requestAnimationFrame(render);
    };

    // 렌더링 루프 시작
    render();
    console.log('🎬 Render loop started');
  }

  /**
   * 그래픽 렌더링 루프 중지
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      console.log('🛑 Render loop stopped');
    }
  }

  /**
   * 예제 브라우저 초기화
   */
  private initializeExampleBrowser(): void {
    const browserContainer = document.getElementById('example-browser');
    if (!browserContainer) {
      console.log('⚠️ Example browser container not found - skipping initialization');
      return;
    }

    try {
      this.exampleBrowser = new ExampleBrowser(browserContainer);
      this.exampleLoader = new ExampleLoader(this, this.exampleBrowser);
      console.log('📚 Example browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize example browser:', error);
    }
  }

  /**
   * BASIC 프로그램 로드
   */
  async loadProgram(code: string): Promise<void> {
    try {
      // 현재 프로그램 초기화 (NEW 명령)
      await this.executeCommand('NEW');

      // 각 라인을 파싱하여 프로그램에 추가
      const lines = code.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue; // 빈 라인 스킵

        // 라인 번호가 있는지 확인
        const hasLineNumber = /^\d+/.test(trimmedLine);

        if (hasLineNumber) {
          // 라인 번호가 있으면 프로그램에 추가 (REM 포함)
          await this.executeCommand(trimmedLine);
        } else if (!trimmedLine.startsWith('REM') && !trimmedLine.startsWith("'")) {
          // 라인 번호 없이 REM이 아닌 경우만 즉시 실행
          await this.executeCommand(trimmedLine);
        }
      }
    } catch (error) {
      console.error('Failed to load program:', error);
      throw error;
    }
  }

  /**
   * 프로그램 실행
   */
  async run(): Promise<void> {
    await this.executeCommand('RUN');
  }

  /**
   * 화면 지우기
   */
  clearScreen(): void {
    this.clearTerminal();
  }

  /**
   * 터미널 객체 가져오기
   */
  getTerminal(): Terminal {
    return this.emulator.getTerminal();
  }

  /**
   * 예제 로더 가져오기
   */
  getExampleLoader(): ExampleLoader | null {
    return this.exampleLoader;
  }

  /**
   * 정리
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // requestAnimationFrame 정리
    this.stopGraphicsUpdate();

    // 모바일 컴포넌트 정리
    if (this.virtualKeyboard) {
      this.virtualKeyboard.destroy();
      this.virtualKeyboard = null;
    }

    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
      this.performanceMonitor = null;
    }

    this.emulator.stop();
    this.removeAllListeners();
  }

  /**
   * Public API: BasicEmulator 메서드들을 노출
   */

  /**
   * 통계 정보 가져오기
   */
  getStats() {
    return this.emulator.getStats();
  }

  /**
   * CPU 가져오기
   */
  getCPU() {
    return this.emulator.getCPU();
  }

  /**
   * 상태 가져오기
   */
  getState() {
    return this.emulator.getState();
  }

  /**
   * 메모리 매니저 가져오기
   */
  getMemory() {
    return this.emulator.getMemory();
  }

  /**
   * 터미널 가져오기
   */
  getTerminal() {
    return this.emulator.getTerminal();
  }

  /**
   * BASIC 인터프리터 가져오기
   */
  getBasicInterpreter() {
    return this.emulator.getBasicInterpreter();
  }

  /**
   * 디버깅 정보
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      emulatorState: this.emulator.getState(),
      emulatorDebugInfo: this.emulator.getDebugInfo()
    };
  }
}