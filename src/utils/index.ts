/**
 * Utility Functions Module
 * 
 * This module contains common utility functions used throughout the emulator.
 */

/**
 * Convert a number to hexadecimal string with padding
 */
export function toHex(value: number, padding: number = 2): string {
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
}

/**
 * Convert a 16-bit value to two 8-bit values (low, high)
 */
export function splitWord(value: number): [number, number] {
  return [value & 0xFF, (value >> 8) & 0xFF];
}

/**
 * Combine two 8-bit values into a 16-bit value
 */
export function joinBytes(low: number, high: number): number {
  return (high << 8) | low;
}

/**
 * Check if a number is within valid 8-bit range
 */
export function isValidByte(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xFF;
}

/**
 * Check if a number is within valid 16-bit range
 */
export function isValidWord(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xFFFF;
}

/**
 * Clamp a value to 8-bit range
 */
export function clampByte(value: number): number {
  return Math.max(0, Math.min(0xFF, Math.floor(value)));
}

/**
 * Clamp a value to 16-bit range
 */
export function clampWord(value: number): number {
  return Math.max(0, Math.min(0xFFFF, Math.floor(value)));
}

/**
 * Format a memory dump line
 */
export function formatMemoryLine(address: number, data: Uint8Array, offset: number = 0, bytesPerLine: number = 16): string {
  const lineData = data.slice(offset, offset + bytesPerLine);
  const hexPart = Array.from(lineData)
    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
  
  const asciiPart = Array.from(lineData)
    .map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.')
    .join('');
  
  return `${toHex(address, 4)}: ${hexPart.padEnd(bytesPerLine * 3 - 1)} | ${asciiPart}`;
}

/**
 * Simple event emitter implementation
 */
export class EventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();
  
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
  
  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      }
    }
  }
  
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

console.log('Utils module loaded');