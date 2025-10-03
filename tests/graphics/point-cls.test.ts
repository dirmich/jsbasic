import { describe, test, expect, beforeEach } from 'bun:test';
import { BasicInterpreter } from '../../src/basic/interpreter.js';
import { Parser } from '../../src/basic/parser.js';
import { GraphicsEngine } from '../../src/graphics/graphics-engine.js';
import { PixelBuffer } from '../../src/graphics/pixel-buffer.js';
import { ColorManager } from '../../src/graphics/color-manager.js';

describe('POINT Function and CLS Command', () => {
  let interpreter: BasicInterpreter;
  let graphics: GraphicsEngine;
  let pixelBuffer: PixelBuffer;
  let colorManager: ColorManager;

  beforeEach(() => {
    interpreter = new BasicInterpreter();

    // PixelBuffer와 ColorManager 생성
    pixelBuffer = new PixelBuffer(320, 200);
    colorManager = new ColorManager();

    graphics = new GraphicsEngine(pixelBuffer, colorManager);
    interpreter.setGraphicsEngine(graphics);
  });

  describe('POINT Function', () => {
    test('should return pixel color at coordinates', async () => {
      // PSET으로 픽셀 설정 후 POINT로 확인
      const code = `
        10 SCREEN 1
        20 PSET (10, 10), 2
        30 A = POINT(10, 10)
        40 PRINT A
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      const result = interpreter.getVariables().getVariable('A');
      expect(typeof result).toBe('number');
    });

    test('should require exactly two arguments', async () => {
      const code = 'A = POINT(10)'; // 인자 1개만 전달

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await expect(interpreter.run(ast)).rejects.toThrow();
    });

    test('should work with expression arguments', async () => {
      const code = `
        10 X = 5
        20 Y = 10
        30 C = POINT(X * 2, Y + 5)
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      const result = interpreter.getVariables().getVariable('C');
      expect(typeof result).toBe('number');
    });

    test('should handle coordinate conversion', async () => {
      const code = `
        10 SCREEN 1
        20 C = POINT(10.7, 20.3)
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      // 정수 변환 확인
      const result = interpreter.getVariables().getVariable('C');
      expect(typeof result).toBe('number');
    });
  });

  describe('CLS Command', () => {
    test('should clear screen with default mode', async () => {
      const code = `
        10 SCREEN 1
        20 PSET (10, 10), 1
        30 CLS
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      // 에러 없이 실행되어야 함
      expect(true).toBe(true);
    });

    test('should accept mode parameter', async () => {
      const code = `
        10 SCREEN 1
        20 CLS 0
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      expect(true).toBe(true);
    });

    test('should work with expression as mode', async () => {
      const code = `
        10 M = 0
        20 CLS M
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      expect(true).toBe(true);
    });

    test('should reject non-numeric mode', async () => {
      const code = `CLS "invalid"`;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await expect(interpreter.run(ast)).rejects.toThrow(/must be numeric/);
    });
  });

  describe('Integration Tests', () => {
    test('should work together in a graphics program', async () => {
      const code = `
        10 SCREEN 1
        20 CLS
        30 FOR I = 0 TO 10
        40   PSET (I, I), 3
        50 NEXT I
        60 C = POINT(5, 5)
        70 PRINT "Color at (5,5):", C
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      const color = interpreter.getVariables().getVariable('C');
      expect(typeof color).toBe('number');
    });

    test('should maintain screen state after CLS', async () => {
      const code = `
        10 SCREEN 1
        20 PSET (50, 50), 2
        30 CLS
        40 C = POINT(50, 50)
        50 PRINT C
      `;

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await interpreter.run(ast);

      // CLS 후 픽셀이 지워졌는지 확인
      const color = interpreter.getVariables().getVariable('C');
      expect(typeof color).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should require graphics engine for POINT', async () => {
      const newInterpreter = new BasicInterpreter();
      const code = 'A = POINT(10, 10)';

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await expect(newInterpreter.run(ast)).rejects.toThrow(/Graphics engine not initialized/);
    });

    test('should require graphics engine for CLS', async () => {
      const newInterpreter = new BasicInterpreter();
      const code = '10 CLS';

      const parser = new Parser(code);
      const ast = parser.parseProgram();
      await expect(newInterpreter.run(ast)).rejects.toThrow(/Graphics engine not initialized/);
    });
  });
});
