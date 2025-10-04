/**
 * Example Browser Component
 *
 * UI component for browsing, searching, and loading example programs
 */

import type { ExampleProgram } from '../examples-metadata';
import {
  EXAMPLE_PROGRAMS,
  CATEGORIES,
  DIFFICULTY_LABELS,
  getExamplesByCategory,
  searchExamples
} from '../examples-metadata';

export class ExampleBrowser {
  private container: HTMLElement;
  private currentCategory: string = 'all';
  private currentFilter: string = '';
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.initialize();
  }

  private initialize(): void {
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="example-browser">
        <div class="example-header">
          <h2>📚 예제 프로그램</h2>
          <div class="example-search">
            <input
              type="search"
              class="search-input"
              placeholder="🔍 검색..."
              aria-label="예제 검색"
            />
          </div>
        </div>

        <div class="example-categories">
          ${this.renderCategories()}
        </div>

        <div class="example-list">
          ${this.renderExampleList()}
        </div>
      </div>
    `;
  }

  private renderCategories(): string {
    return CATEGORIES.map(cat => `
      <button
        class="category ${cat.id === this.currentCategory ? 'active' : ''}"
        data-category="${cat.id}"
        aria-label="${cat.label} 카테고리"
      >
        <span class="category-icon">${cat.icon}</span>
        <span class="category-label">${cat.label}</span>
      </button>
    `).join('');
  }

  private renderExampleList(): string {
    const examples = this.getFilteredExamples();

    if (examples.length === 0) {
      return `
        <div class="no-results">
          <p>검색 결과가 없습니다.</p>
        </div>
      `;
    }

    return examples.map(ex => this.renderExampleCard(ex)).join('');
  }

  private renderExampleCard(example: ExampleProgram): string {
    const icon = this.getExampleIcon(example);
    const difficultyLabel = DIFFICULTY_LABELS[example.difficulty];
    const categoryLabel = CATEGORIES.find(c => c.id === example.category)?.label || example.category;

    return `
      <div class="example-card" data-id="${example.id}">
        <div class="example-thumbnail">
          <span class="thumbnail-icon">${icon}</span>
        </div>
        <div class="example-info">
          <h3 class="example-title">${example.title}</h3>
          <p class="example-description">${example.description}</p>
          <div class="example-meta">
            <span class="difficulty difficulty-${example.difficulty}">${difficultyLabel}</span>
            <span class="category-badge">${categoryLabel}</span>
            ${example.tags.slice(0, 2).map(tag =>
              `<span class="tag">#${tag}</span>`
            ).join('')}
          </div>
        </div>
        <div class="example-actions">
          <button class="btn-action btn-load" data-action="load" title="프로그램 로드">
            📋 로드
          </button>
          <button class="btn-action btn-run" data-action="run" title="프로그램 실행">
            ▶️ 실행
          </button>
          <button class="btn-action btn-view" data-action="view" title="코드 보기">
            👁️ 코드
          </button>
        </div>
      </div>
    `;
  }

  private getExampleIcon(example: ExampleProgram): string {
    const iconMap: Record<string, string> = {
      'basic': '📖',
      'graphics': '🎨',
      'audio': '🎵',
      'games': '🎮',
      'demos': '✨',
      'math': '🔢',
      'tools': '🛠️'
    };
    return iconMap[example.category] || '📄';
  }

  private getFilteredExamples(): ExampleProgram[] {
    let examples = getExamplesByCategory(this.currentCategory);

    if (this.currentFilter) {
      examples = searchExamples(this.currentFilter);
      if (this.currentCategory !== 'all') {
        examples = examples.filter(ex => ex.category === this.currentCategory);
      }
    }

    return examples;
  }

  private attachEventListeners(): void {
    // 카테고리 버튼
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const categoryBtn = target.closest('.category') as HTMLElement;

      if (categoryBtn) {
        const category = categoryBtn.dataset.category;
        if (category) {
          this.setCategory(category);
        }
      }
    });

    // 액션 버튼 (로드, 실행, 코드 보기)
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionBtn = target.closest('.btn-action') as HTMLElement;

      if (actionBtn) {
        const card = actionBtn.closest('.example-card') as HTMLElement;
        const exampleId = card?.dataset.id;
        const action = actionBtn.dataset.action;

        if (exampleId && action) {
          this.handleAction(action, exampleId);
        }
      }
    });

    // 검색 입력
    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.setFilter(query);
      });
    }
  }

  private setCategory(category: string): void {
    if (this.currentCategory === category) return;

    this.currentCategory = category;
    this.updateUI();
  }

  private setFilter(query: string): void {
    this.currentFilter = query;
    this.updateUI();
  }

  private updateUI(): void {
    // 카테고리 버튼 업데이트
    const categories = this.container.querySelectorAll('.category');
    categories.forEach(btn => {
      const category = (btn as HTMLElement).dataset.category;
      if (category === this.currentCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 예제 리스트 업데이트
    const listContainer = this.container.querySelector('.example-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderExampleList();
    }
  }

  private handleAction(action: string, exampleId: string): void {
    this.emit(action, exampleId);
  }

  // 이벤트 리스너 관리
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      callback(...args);
    });
  }

  // 예제 정보 가져오기
  getExampleInfo(exampleId: string): ExampleProgram | undefined {
    return EXAMPLE_PROGRAMS.find(ex => ex.id === exampleId);
  }

  // 현재 필터 상태 가져오기
  getCurrentFilter(): { category: string; query: string } {
    return {
      category: this.currentCategory,
      query: this.currentFilter
    };
  }

  // UI 초기화
  reset(): void {
    this.currentCategory = 'all';
    this.currentFilter = '';
    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    this.updateUI();
  }

  // 컴포넌트 제거
  destroy(): void {
    this.listeners.clear();
    this.container.innerHTML = '';
  }
}
