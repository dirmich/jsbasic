/**
 * System Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { System6502 } from '../src/index.js';
import type { SystemConfig } from '../src/types/index.js';

describe('System6502', () => {
  let system: System6502;
  
  beforeEach(() => {
    system = new System6502();
  });
  
  it('should create a system with default configuration', () => {
    expect(system).toBeDefined();
    
    const config = system.getConfig();
    expect(config.cpu.clockSpeed).toBe(1000000);
    expect(config.memory.size).toBe(65536);
    expect(config.basic.maxLineNumber).toBe(65535);
  });
  
  it('should create a system with custom configuration', () => {
    const customConfig: Partial<SystemConfig> = {
      cpu: {
        clockSpeed: 2000000,
        enableDebug: true,
        breakOnInvalidOpcode: false
      },
      memory: {
        size: 32768,
        enforceReadOnly: false,
        trackAccess: true
      }
    };
    
    const customSystem = new System6502(customConfig);
    const config = customSystem.getConfig();
    
    expect(config.cpu.clockSpeed).toBe(2000000);
    expect(config.cpu.enableDebug).toBe(true);
    expect(config.cpu.breakOnInvalidOpcode).toBe(false);
    expect(config.memory.size).toBe(32768);
    expect(config.memory.enforceReadOnly).toBe(false);
    expect(config.memory.trackAccess).toBe(true);
  });
  
  it('should initialize without errors', async () => {
    await expect(system.initialize()).resolves.toBeUndefined();
  });
  
  it('should manage system state correctly', () => {
    const initialState = system.getState();
    expect(initialState.running).toBe(false);
    expect(initialState.paused).toBe(false);
    expect(initialState.debugging).toBe(false);
    
    system.start();
    let state = system.getState();
    expect(state.running).toBe(true);
    
    system.pause();
    state = system.getState();
    expect(state.paused).toBe(true);
    
    system.resume();
    state = system.getState();
    expect(state.paused).toBe(false);
    
    system.stop();
    state = system.getState();
    expect(state.running).toBe(false);
    expect(state.paused).toBe(false);
  });
  
  it('should handle multiple start/stop cycles', () => {
    system.start();
    expect(system.getState().running).toBe(true);
    
    // Starting again should not throw
    system.start();
    expect(system.getState().running).toBe(true);
    
    system.stop();
    expect(system.getState().running).toBe(false);
    
    system.start();
    expect(system.getState().running).toBe(true);
    
    system.stop();
    expect(system.getState().running).toBe(false);
  });
  
  afterEach(() => {
    // Clean up any running systems
    system.stop();
  });
});