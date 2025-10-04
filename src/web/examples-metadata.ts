/**
 * Example Programs Metadata
 *
 * Metadata for all example BASIC programs available in the emulator
 */

export interface ExampleProgram {
  id: string;
  title: string;
  category: 'basic' | 'graphics' | 'audio' | 'games' | 'demos' | 'math' | 'tools';
  description: string;
  filename: string;
  author?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail?: string;
}

export const EXAMPLE_PROGRAMS: ExampleProgram[] = [
  // Basic 카테고리
  {
    id: 'hello-world',
    title: 'Hello World',
    category: 'basic',
    description: '첫 번째 BASIC 프로그램 - 화면에 텍스트 출력',
    filename: 'examples/hello-world.bas',
    difficulty: 'beginner',
    tags: ['print', 'beginner', 'tutorial']
  },
  {
    id: 'hello',
    title: 'Simple Hello',
    category: 'basic',
    description: '간단한 Hello 프로그램',
    filename: 'examples/hello.bas',
    difficulty: 'beginner',
    tags: ['print', 'beginner']
  },
  {
    id: 'loops-and-arrays',
    title: 'Loops and Arrays',
    category: 'basic',
    description: 'FOR 루프와 배열 사용법 학습',
    filename: 'examples/loops-and-arrays.bas',
    difficulty: 'beginner',
    tags: ['loop', 'array', 'for', 'tutorial']
  },
  {
    id: 'string-functions',
    title: 'String Functions',
    category: 'basic',
    description: '문자열 함수 사용법 (LEFT$, RIGHT$, MID$, LEN)',
    filename: 'examples/string-functions.bas',
    difficulty: 'intermediate',
    tags: ['string', 'functions', 'text']
  },

  // Graphics 카테고리
  {
    id: 'graphics-demo',
    title: 'Graphics Demo',
    category: 'graphics',
    description: '기본 그래픽 명령어 데모 (PSET, LINE, CIRCLE)',
    filename: 'examples/graphics-demo.bas',
    difficulty: 'beginner',
    tags: ['graphics', 'pset', 'line', 'circle']
  },
  {
    id: 'graphics-extended',
    title: 'Extended Graphics',
    category: 'graphics',
    description: '확장 그래픽 기능 데모 (PAINT, GET, PUT)',
    filename: 'examples/graphics-extended.bas',
    difficulty: 'intermediate',
    tags: ['graphics', 'paint', 'sprite', 'animation']
  },
  {
    id: 'pixel-art',
    title: 'Pixel Art',
    category: 'graphics',
    description: 'PSET으로 픽셀 아트 그리기',
    filename: 'examples/pixel-art.bas',
    difficulty: 'beginner',
    tags: ['graphics', 'pset', 'art', 'pixel']
  },
  {
    id: 'sprite-demo',
    title: 'Sprite Demo',
    category: 'graphics',
    description: 'GET/PUT을 사용한 스프라이트 애니메이션',
    filename: 'examples/sprite-demo.bas',
    difficulty: 'intermediate',
    tags: ['graphics', 'sprite', 'animation', 'get', 'put']
  },
  {
    id: 'ascii-art',
    title: 'ASCII Art',
    category: 'graphics',
    description: 'ASCII 문자로 그림 그리기',
    filename: 'examples/graphics/ascii-art.bas',
    difficulty: 'beginner',
    tags: ['graphics', 'ascii', 'text', 'art']
  },
  {
    id: 'star-pattern',
    title: 'Star Pattern',
    category: 'graphics',
    description: '별 패턴 그리기',
    filename: 'examples/star-pattern.bas',
    difficulty: 'intermediate',
    tags: ['graphics', 'pattern', 'star', 'animation']
  },
  {
    id: 'fractal-tree',
    title: 'Fractal Tree',
    category: 'graphics',
    description: '재귀를 이용한 프랙탈 나무 그리기',
    filename: 'examples/fractal-tree.bas',
    difficulty: 'advanced',
    tags: ['graphics', 'fractal', 'recursion', 'tree']
  },

  // Audio 카테고리
  {
    id: 'audio-demo',
    title: 'Audio Demo',
    category: 'audio',
    description: 'SOUND와 PLAY 명령어 기본 사용법',
    filename: 'examples/audio-demo.bas',
    difficulty: 'beginner',
    tags: ['audio', 'sound', 'play', 'music']
  },

  // Games 카테고리
  {
    id: 'guess-game',
    title: 'Guess the Number',
    category: 'games',
    description: '숫자 맞추기 게임',
    filename: 'examples/guess-game.bas',
    difficulty: 'beginner',
    tags: ['game', 'random', 'input', 'loop']
  },
  {
    id: 'guess-number',
    title: 'Number Guessing Game',
    category: 'games',
    description: '1부터 100까지 숫자 맞추기',
    filename: 'examples/games/guess-number.bas',
    difficulty: 'beginner',
    tags: ['game', 'random', 'logic']
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    category: 'games',
    description: '틱택토 게임',
    filename: 'examples/games/tic-tac-toe.bas',
    difficulty: 'intermediate',
    tags: ['game', 'board', 'strategy', 'ai']
  },

  // Demos 카테고리
  {
    id: 'bouncing-ball',
    title: 'Bouncing Ball',
    category: 'demos',
    description: '화면에서 튀어다니는 공 애니메이션',
    filename: 'examples/bouncing-ball.bas',
    difficulty: 'intermediate',
    tags: ['animation', 'physics', 'graphics', 'circle']
  },
  {
    id: 'phase11-complete',
    title: 'Phase 11 Complete Demo',
    category: 'demos',
    description: 'Phase 11의 모든 기능을 보여주는 종합 데모',
    filename: 'examples/phase11-complete.bas',
    difficulty: 'advanced',
    tags: ['demo', 'comprehensive', 'graphics', 'audio']
  },
  {
    id: 'performance-test',
    title: 'Performance Test',
    category: 'demos',
    description: '에뮬레이터 성능 테스트',
    filename: 'examples/performance-test.bas',
    difficulty: 'intermediate',
    tags: ['benchmark', 'performance', 'test']
  },

  // Math 카테고리
  {
    id: 'math-demo',
    title: 'Math Functions Demo',
    category: 'math',
    description: '수학 함수 사용법 (SIN, COS, TAN, SQR, ABS)',
    filename: 'examples/math-demo.bas',
    difficulty: 'beginner',
    tags: ['math', 'functions', 'trigonometry']
  },
  {
    id: 'math-functions',
    title: 'Advanced Math Functions',
    category: 'math',
    description: '고급 수학 함수와 계산',
    filename: 'examples/math-functions.bas',
    difficulty: 'intermediate',
    tags: ['math', 'functions', 'advanced']
  },
  {
    id: 'multiplication-table',
    title: 'Multiplication Table',
    category: 'math',
    description: '구구단 출력',
    filename: 'examples/multiplication-table.bas',
    difficulty: 'beginner',
    tags: ['math', 'table', 'multiplication', 'loop']
  },
  {
    id: 'prime-numbers',
    title: 'Prime Numbers',
    category: 'math',
    description: '소수 찾기 알고리즘',
    filename: 'examples/prime-numbers.bas',
    difficulty: 'intermediate',
    tags: ['math', 'prime', 'algorithm']
  },

  // Tools 카테고리
  {
    id: 'calculator',
    title: 'Calculator',
    category: 'tools',
    description: '간단한 계산기 프로그램',
    filename: 'examples/calculator.bas',
    difficulty: 'beginner',
    tags: ['calculator', 'math', 'input']
  },
  {
    id: 'address-book',
    title: 'Address Book',
    category: 'tools',
    description: '간단한 주소록 프로그램',
    filename: 'examples/address-book.bas',
    difficulty: 'intermediate',
    tags: ['database', 'file', 'crud', 'array']
  },
  {
    id: 'file-io-demo',
    title: 'File I/O Demo',
    category: 'tools',
    description: '파일 입출력 기능 데모',
    filename: 'examples/file-io-demo.bas',
    difficulty: 'intermediate',
    tags: ['file', 'io', 'storage']
  }
];

// 카테고리별 그룹화 헬퍼
export function getExamplesByCategory(category: string): ExampleProgram[] {
  if (category === 'all') {
    return EXAMPLE_PROGRAMS;
  }
  return EXAMPLE_PROGRAMS.filter(ex => ex.category === category);
}

// 검색 헬퍼
export function searchExamples(query: string): ExampleProgram[] {
  const lowerQuery = query.toLowerCase();
  return EXAMPLE_PROGRAMS.filter(ex =>
    ex.title.toLowerCase().includes(lowerQuery) ||
    ex.description.toLowerCase().includes(lowerQuery) ||
    ex.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// 난이도별 필터링
export function getExamplesByDifficulty(difficulty: ExampleProgram['difficulty']): ExampleProgram[] {
  return EXAMPLE_PROGRAMS.filter(ex => ex.difficulty === difficulty);
}

// ID로 예제 찾기
export function getExampleById(id: string): ExampleProgram | undefined {
  return EXAMPLE_PROGRAMS.find(ex => ex.id === id);
}

// 카테고리 목록
export const CATEGORIES = [
  { id: 'all', label: '전체', icon: '📚' },
  { id: 'basic', label: '기초', icon: '📖' },
  { id: 'graphics', label: '그래픽', icon: '🎨' },
  { id: 'audio', label: '오디오', icon: '🎵' },
  { id: 'games', label: '게임', icon: '🎮' },
  { id: 'demos', label: '데모', icon: '✨' },
  { id: 'math', label: '수학', icon: '🔢' },
  { id: 'tools', label: '도구', icon: '🛠️' }
] as const;

// 난이도 라벨
export const DIFFICULTY_LABELS = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급'
} as const;
