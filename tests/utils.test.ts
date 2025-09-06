/**
 * Utility Functions Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  toHex, 
  splitWord, 
  joinBytes, 
  isValidByte, 
  isValidWord, 
  clampByte, 
  clampWord,
  formatMemoryLine,
  EventEmitter
} from '../src/utils/index.js';

describe('Utility Functions', () => {
  describe('toHex', () => {
    it('should convert numbers to hex strings', () => {
      expect(toHex(0)).toBe('0x00');
      expect(toHex(15)).toBe('0x0F');
      expect(toHex(255)).toBe('0xFF');
      expect(toHex(256, 4)).toBe('0x0100');
    });
  });
  
  describe('splitWord', () => {
    it('should split 16-bit values into low and high bytes', () => {
      expect(splitWord(0x1234)).toEqual([0x34, 0x12]);
      expect(splitWord(0xABCD)).toEqual([0xCD, 0xAB]);
      expect(splitWord(0x00FF)).toEqual([0xFF, 0x00]);
    });
  });
  
  describe('joinBytes', () => {
    it('should combine low and high bytes into 16-bit value', () => {
      expect(joinBytes(0x34, 0x12)).toBe(0x1234);
      expect(joinBytes(0xCD, 0xAB)).toBe(0xABCD);
      expect(joinBytes(0xFF, 0x00)).toBe(0x00FF);
    });
  });
  
  describe('validation functions', () => {
    it('should validate byte values', () => {
      expect(isValidByte(0)).toBe(true);
      expect(isValidByte(128)).toBe(true);
      expect(isValidByte(255)).toBe(true);
      expect(isValidByte(-1)).toBe(false);
      expect(isValidByte(256)).toBe(false);
      expect(isValidByte(1.5)).toBe(false);
    });
    
    it('should validate word values', () => {
      expect(isValidWord(0)).toBe(true);
      expect(isValidWord(32768)).toBe(true);
      expect(isValidWord(65535)).toBe(true);
      expect(isValidWord(-1)).toBe(false);
      expect(isValidWord(65536)).toBe(false);
      expect(isValidWord(1.5)).toBe(false);
    });
  });
  
  describe('clamping functions', () => {
    it('should clamp byte values', () => {
      expect(clampByte(-10)).toBe(0);
      expect(clampByte(128)).toBe(128);
      expect(clampByte(300)).toBe(255);
      expect(clampByte(1.8)).toBe(1);
    });
    
    it('should clamp word values', () => {
      expect(clampWord(-100)).toBe(0);
      expect(clampWord(32768)).toBe(32768);
      expect(clampWord(70000)).toBe(65535);
      expect(clampWord(1.8)).toBe(1);
    });
  });
  
  describe('formatMemoryLine', () => {
    it('should format memory data correctly', () => {
      const data = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64, 0x21]);
      const result = formatMemoryLine(0x1000, data, 0, 12);
      expect(result).toBe('0x1000: 48 65 6C 6C 6F 20 57 6F 72 6C 64 21 | Hello World!');
    });
  });
});

describe('EventEmitter', () => {
  let emitter: EventEmitter;
  
  beforeEach(() => {
    emitter = new EventEmitter();
  });
  
  it('should emit events to listeners', () => {
    let called = false;
    let data: any = null;
    
    emitter.on('test', (value: any) => {
      called = true;
      data = value;
    });
    
    emitter.emit('test', 'hello');
    
    expect(called).toBe(true);
    expect(data).toBe('hello');
  });
  
  it('should remove listeners', () => {
    let called = false;
    const listener = () => { called = true; };
    
    emitter.on('test', listener);
    emitter.off('test', listener);
    emitter.emit('test');
    
    expect(called).toBe(false);
  });
  
  it('should handle multiple listeners', () => {
    let count = 0;
    
    emitter.on('test', () => count++);
    emitter.on('test', () => count++);
    emitter.on('test', () => count++);
    
    emitter.emit('test');
    
    expect(count).toBe(3);
  });
});