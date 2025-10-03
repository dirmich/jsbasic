/**
 * 그래픽 시스템 통합 테스트
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BasicEmulator } from '../src/system/emulator';
import { Parser } from '../src/basic/parser';

describe('Graphics Integration', () => {
  let emulator: BasicEmulator;

  beforeEach(() => {
    emulator = new BasicEmulator();
  });

  test('should initialize graphics engine', () => {
    const graphicsEngine = emulator.getGraphicsEngine();
    expect(graphicsEngine).toBeDefined();

    const pixelBuffer = emulator.getPixelBuffer();
    expect(pixelBuffer).toBeDefined();
    expect(pixelBuffer.getWidth()).toBe(320);
    expect(pixelBuffer.getHeight()).toBe(200);
  });

  test('should parse SCREEN command', () => {
    const parser = new Parser('SCREEN 1');
    const program = parser.parseProgram();

    expect(program.statements.length).toBe(1);
    expect(program.statements[0]?.type).toBe('ScreenStatement');
  });

  test('should parse PSET command', () => {
    const parser = new Parser('PSET (10, 20), 15');
    const program = parser.parseProgram();

    expect(program.statements.length).toBe(1);
    expect(program.statements[0]?.type).toBe('PsetStatement');
  });

  test('should parse LINE command', () => {
    const parser = new Parser('LINE (0, 0)-(100, 100), 3');
    const program = parser.parseProgram();

    expect(program.statements.length).toBe(1);
    expect(program.statements[0]?.type).toBe('LineStatement');
  });

  test('should parse CIRCLE command', () => {
    const parser = new Parser('CIRCLE (160, 100), 50, 14');
    const program = parser.parseProgram();

    expect(program.statements.length).toBe(1);
    expect(program.statements[0]?.type).toBe('CircleStatement');
  });

  test('should execute PSET command', async () => {
    const interpreter = emulator['basicInterpreter'];
    const parser = new Parser('PSET (10, 20), 15');
    const program = parser.parseProgram();

    await interpreter.run(program);

    const pixelBuffer = emulator.getPixelBuffer();
    const color = pixelBuffer.getPixel(10, 20);
    expect(color).toBe(15);
  });

  test('should execute LINE command', async () => {
    const interpreter = emulator['basicInterpreter'];
    const parser = new Parser('LINE (0, 0)-(10, 0), 3');
    const program = parser.parseProgram();

    await interpreter.run(program);

    const pixelBuffer = emulator.getPixelBuffer();
    // 선의 시작점과 끝점 확인
    expect(pixelBuffer.getPixel(0, 0)).toBe(3);
    expect(pixelBuffer.getPixel(10, 0)).toBe(3);
  });

  test('should execute COLOR command', async () => {
    const interpreter = emulator['basicInterpreter'];
    const parser = new Parser('COLOR 15, 1, 8');
    const program = parser.parseProgram();

    await interpreter.run(program);

    const graphicsEngine = emulator.getGraphicsEngine();
    const state = graphicsEngine.getState();
    expect(state.foregroundColor).toBe(15);
    expect(state.backgroundColor).toBe(1);
    expect(state.borderColor).toBe(8);
  });

  test('should execute CIRCLE command', async () => {
    const interpreter = emulator['basicInterpreter'];
    const parser = new Parser('CIRCLE (160, 100), 5, 14');
    const program = parser.parseProgram();

    await interpreter.run(program);

    const graphicsEngine = emulator.getGraphicsEngine();
    const state = graphicsEngine.getState();
    // lastX, lastY가 원의 중심으로 업데이트되었는지 확인
    expect(state.lastX).toBe(160);
    expect(state.lastY).toBe(100);
  });

  test('should change screen mode', async () => {
    const interpreter = emulator['basicInterpreter'];
    const parser = new Parser('SCREEN 2');
    const program = parser.parseProgram();

    await interpreter.run(program);

    const graphicsEngine = emulator.getGraphicsEngine();
    const mode = graphicsEngine.getScreenMode();
    expect(mode.mode).toBe(2);
    expect(mode.width).toBe(640);
    expect(mode.height).toBe(200);
  });
});
