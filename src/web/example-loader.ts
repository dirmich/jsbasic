/**
 * Example Loader
 *
 * Handles loading and executing example BASIC programs
 */

import type { ExampleProgram } from './examples-metadata';
import { getExampleById } from './examples-metadata';
import type { WebEmulator } from './web-emulator';
import type { ExampleBrowser } from './components/example-browser';

export interface LoadOptions {
  autoRun?: boolean;
  showInfo?: boolean;
  clearScreen?: boolean;
}

export class ExampleLoader {
  private currentExample: ExampleProgram | null = null;
  private loadingCache: Map<string, string> = new Map();

  constructor(
    private webEmulator: WebEmulator,
    private exampleBrowser: ExampleBrowser
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 로드 액션
    this.exampleBrowser.on('load', (exampleId: string) => {
      this.loadExample(exampleId, { showInfo: true });
    });

    // 실행 액션
    this.exampleBrowser.on('run', (exampleId: string) => {
      this.runExample(exampleId);
    });

    // 코드 보기 액션
    this.exampleBrowser.on('view', (exampleId: string) => {
      this.viewCode(exampleId);
    });
  }

  /**
   * 예제 프로그램 로드
   */
  async loadExample(exampleId: string, options: LoadOptions = {}): Promise<void> {
    const example = getExampleById(exampleId);
    if (!example) {
      throw new Error(`Example not found: ${exampleId}`);
    }

    try {
      // 로딩 시작
      this.showLoadingState(example);

      // 예제 코드 가져오기
      const code = await this.fetchExampleCode(example.filename);

      // 에뮬레이터 준비
      if (options.clearScreen !== false) {
        this.webEmulator.clearScreen();
      }

      // 프로그램 로드
      await this.webEmulator.loadProgram(code);

      // 현재 예제 저장
      this.currentExample = example;

      // 정보 표시
      if (options.showInfo) {
        this.showExampleInfo(example);
      }

      // 자동 실행
      if (options.autoRun) {
        await this.webEmulator.run();
      }

      this.hideLoadingState();
    } catch (error) {
      this.hideLoadingState();
      this.showError(example, error);
      throw error;
    }
  }

  /**
   * 예제 프로그램 실행
   */
  async runExample(exampleId: string): Promise<void> {
    await this.loadExample(exampleId, {
      autoRun: true,
      showInfo: true,
      clearScreen: true
    });
  }

  /**
   * 예제 코드 보기
   */
  async viewCode(exampleId: string): Promise<void> {
    const example = getExampleById(exampleId);
    if (!example) {
      throw new Error(`Example not found: ${exampleId}`);
    }

    try {
      const code = await this.fetchExampleCode(example.filename);
      this.showCodeViewer(example, code);
    } catch (error) {
      this.showError(example, error);
      throw error;
    }
  }

  /**
   * 예제 코드 가져오기 (캐싱 지원)
   */
  private async fetchExampleCode(filename: string): Promise<string> {
    // 캐시 확인
    if (this.loadingCache.has(filename)) {
      return this.loadingCache.get(filename)!;
    }

    try {
      const response = await fetch(filename);
      if (!response.ok) {
        throw new Error(`Failed to load example: ${response.statusText}`);
      }

      const code = await response.text();

      // 캐시에 저장
      this.loadingCache.set(filename, code);

      return code;
    } catch (error) {
      throw new Error(`Failed to fetch example file: ${filename}`);
    }
  }

  /**
   * 예제 정보 표시
   */
  private showExampleInfo(example: ExampleProgram): void {
    const terminal = this.webEmulator.getTerminal();
    if (!terminal) return;

    terminal.writeLine('');
    terminal.writeLine('═'.repeat(60));
    terminal.writeLine(`📚 ${example.title}`);
    terminal.writeLine('─'.repeat(60));
    terminal.writeLine(`📝 ${example.description}`);
    terminal.writeLine(`🏷️  카테고리: ${example.category}`);
    terminal.writeLine(`📊 난이도: ${example.difficulty}`);
    if (example.tags.length > 0) {
      terminal.writeLine(`🔖 태그: ${example.tags.join(', ')}`);
    }
    terminal.writeLine('═'.repeat(60));
    terminal.writeLine('');
  }

  /**
   * 코드 뷰어 표시
   */
  private showCodeViewer(example: ExampleProgram, code: string): void {
    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'code-viewer-modal';
    modal.innerHTML = `
      <div class="code-viewer-overlay"></div>
      <div class="code-viewer-content">
        <div class="code-viewer-header">
          <h3>📄 ${example.title}</h3>
          <button class="btn-close" aria-label="닫기">✕</button>
        </div>
        <div class="code-viewer-body">
          <pre><code>${this.escapeHtml(code)}</code></pre>
        </div>
        <div class="code-viewer-footer">
          <button class="btn-copy">📋 복사</button>
          <button class="btn-load-code">📥 로드</button>
          <button class="btn-run-code">▶️ 실행</button>
        </div>
      </div>
    `;

    // 이벤트 리스너
    const closeBtn = modal.querySelector('.btn-close') as HTMLButtonElement;
    const overlay = modal.querySelector('.code-viewer-overlay') as HTMLElement;
    const copyBtn = modal.querySelector('.btn-copy') as HTMLButtonElement;
    const loadBtn = modal.querySelector('.btn-load-code') as HTMLButtonElement;
    const runBtn = modal.querySelector('.btn-run-code') as HTMLButtonElement;

    const closeModal = () => {
      modal.remove();
    };

    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);

    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(code);
      copyBtn.textContent = '✓ 복사됨';
      setTimeout(() => {
        copyBtn.textContent = '📋 복사';
      }, 2000);
    });

    loadBtn?.addEventListener('click', async () => {
      await this.loadExample(example.id, { showInfo: true });
      closeModal();
    });

    runBtn?.addEventListener('click', async () => {
      await this.runExample(example.id);
      closeModal();
    });

    // ESC 키로 닫기
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    document.body.appendChild(modal);
  }

  /**
   * 로딩 상태 표시
   */
  private showLoadingState(example: ExampleProgram): void {
    const terminal = this.webEmulator.getTerminal();
    if (!terminal) return;

    terminal.writeLine(`Loading ${example.title}...`);
  }

  /**
   * 로딩 상태 숨기기
   */
  private hideLoadingState(): void {
    // 필요시 로딩 인디케이터 제거
  }

  /**
   * 에러 표시
   */
  private showError(example: ExampleProgram, error: unknown): void {
    const terminal = this.webEmulator.getTerminal();
    if (!terminal) return;

    const message = error instanceof Error ? error.message : String(error);
    terminal.writeLine('');
    terminal.writeLine(`ERROR: Failed to load ${example.title}`);
    terminal.writeLine(`Reason: ${message}`);
    terminal.writeLine('');
  }

  /**
   * HTML 이스케이프
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 현재 로드된 예제 정보
   */
  getCurrentExample(): ExampleProgram | null {
    return this.currentExample;
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.loadingCache.clear();
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.loadingCache.clear();
    this.currentExample = null;
  }
}
