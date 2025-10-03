/**
 * Graphics System Type Definitions
 */

// Screen modes
export interface ScreenMode {
  mode: number;
  width: number;
  height: number;
  colors: number;
  textRows: number;
  textCols: number;
  pixelAspectRatio: number;
  description: string;
}

// Color definitions
export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Graphics state
export interface GraphicsState {
  currentMode: ScreenMode;
  foregroundColor: number;
  backgroundColor: number;
  borderColor: number;
  lastX: number;
  lastY: number;
}

// Drawing primitives
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Graphics commands
export type LineStyle = 'B' | 'BF' | undefined;

export interface LineOptions {
  color?: number;
  style?: LineStyle;
}

export interface CircleOptions {
  color?: number;
  startAngle?: number;
  endAngle?: number;
  aspect?: number;
}

export interface PaintOptions {
  paintColor?: number;
  borderColor?: number;
}

// Graphics engine interface
export interface GraphicsEngineInterface {
  // Screen mode
  setScreenMode(mode: number): void;
  getScreenMode(): ScreenMode;

  // Basic drawing
  pset(x: number, y: number, color?: number): void;
  preset(x: number, y: number, color?: number): void;
  line(x1: number, y1: number, x2: number, y2: number, options?: LineOptions): void;
  circle(centerX: number, centerY: number, radius: number, options?: CircleOptions): void;
  paint(x: number, y: number, options?: PaintOptions): void;

  // Color management
  setColor(foreground?: number, background?: number, border?: number): void;
  getPixel(x: number, y: number): number;

  // Screen management
  cls(mode?: number): void;

  // State
  getState(): GraphicsState;
  setState(state: GraphicsState): void;
}

// Display manager interface
export interface DisplayManagerInterface {
  // Rendering
  render(): void;
  renderDirty(): void;
  swap(): void;

  // Buffer management
  clear(color?: number): void;
  getBuffer(): PixelBufferInterface;

  // Canvas access
  getCanvas(): HTMLCanvasElement;
  getContext(): CanvasRenderingContext2D;
}

// Pixel buffer interface
export interface PixelBufferInterface {
  setPixel(x: number, y: number, color: number): void;
  getPixel(x: number, y: number): number;
  clear(color?: number): void;
  getWidth(): number;
  getHeight(): number;
  getData(): Uint8Array;
}

// Color manager interface
export interface ColorManagerInterface {
  getColorString(colorIndex: number): string;
  getRGB(colorIndex: number): RGB;
  setPalette(palette: string[]): void;
  getPalette(): string[];
  validateColor(color: number): number;
}

// Standard screen modes
export const SCREEN_MODES: Record<number, ScreenMode> = {
  0: {
    mode: 0,
    width: 640,
    height: 400,
    colors: 16,
    textRows: 25,
    textCols: 80,
    pixelAspectRatio: 1.0,
    description: 'Text mode 80x25'
  },
  1: {
    mode: 1,
    width: 320,
    height: 200,
    colors: 4,
    textRows: 25,
    textCols: 40,
    pixelAspectRatio: 1.2,
    description: 'Low resolution graphics 320x200, 4 colors'
  },
  2: {
    mode: 2,
    width: 640,
    height: 200,
    colors: 2,
    textRows: 25,
    textCols: 80,
    pixelAspectRatio: 2.4,
    description: 'Medium resolution graphics 640x200, 2 colors'
  },
  7: {
    mode: 7,
    width: 320,
    height: 200,
    colors: 16,
    textRows: 25,
    textCols: 40,
    pixelAspectRatio: 1.2,
    description: 'EGA graphics 320x200, 16 colors'
  },
  9: {
    mode: 9,
    width: 640,
    height: 350,
    colors: 16,
    textRows: 25,
    textCols: 80,
    pixelAspectRatio: 1.37,
    description: 'EGA graphics 640x350, 16 colors'
  }
};

// CGA 16-color palette
export const CGA_PALETTE: string[] = [
  '#000000', // 0: Black
  '#0000AA', // 1: Blue
  '#00AA00', // 2: Green
  '#00AAAA', // 3: Cyan
  '#AA0000', // 4: Red
  '#AA00AA', // 5: Magenta
  '#AA5500', // 6: Brown
  '#AAAAAA', // 7: Light Gray
  '#555555', // 8: Dark Gray
  '#5555FF', // 9: Light Blue
  '#55FF55', // 10: Light Green
  '#55FFFF', // 11: Light Cyan
  '#FF5555', // 12: Light Red
  '#FF55FF', // 13: Light Magenta
  '#FFFF55', // 14: Yellow
  '#FFFFFF'  // 15: White
];

// Dirty rect tracking
export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DirtyRectTrackerInterface {
  markDirty(x: number, y: number, width: number, height: number): void;
  getDirtyRegions(): DirtyRect[];
  clear(): void;
  isEmpty(): boolean;
}
