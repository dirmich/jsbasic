/**
 * Input/Output System Type Definitions
 */

// I/O Device types
export enum DeviceType {
  KEYBOARD = 'KEYBOARD',
  DISPLAY = 'DISPLAY',
  PRINTER = 'PRINTER',
  DISK = 'DISK',
  SERIAL = 'SERIAL',
  JOYSTICK = 'JOYSTICK',
  SOUND = 'SOUND'
}

// I/O Device interface
export interface IODevice {
  id: string;
  type: DeviceType;
  name: string;
  baseAddress: number;
  size: number;
  
  // Core operations
  read(offset: number): number;
  write(offset: number, value: number): void;
  reset(): void;
  
  // Device-specific operations
  isReady(): boolean;
  getStatus(): number;
  interrupt?(): void;
}

// Keyboard device
export interface KeyboardDevice extends IODevice {
  type: DeviceType.KEYBOARD;
  
  // Keyboard specific
  keyPressed(keyCode: number): void;
  keyReleased(keyCode: number): void;
  isKeyDown(keyCode: number): boolean;
  getLastKey(): number;
  clearBuffer(): void;
}

// Display device (text mode)
export interface DisplayDevice extends IODevice {
  type: DeviceType.DISPLAY;
  
  // Display properties
  width: number;
  height: number;
  cursorX: number;
  cursorY: number;
  
  // Display operations
  clear(): void;
  setCursor(x: number, y: number): void;
  putChar(char: number): void;
  putString(text: string): void;
  scroll(): void;
  getBuffer(): Uint8Array;
  setBuffer(buffer: Uint8Array): void;
}

// Serial device
export interface SerialDevice extends IODevice {
  type: DeviceType.SERIAL;
  
  // Serial configuration
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'NONE' | 'EVEN' | 'ODD';
  
  // Serial operations
  send(data: number[]): void;
  receive(): number[];
  isTransmitting(): boolean;
  isReceiving(): boolean;
  setBaudRate(rate: number): void;
}

// Sound device
export interface SoundDevice extends IODevice {
  type: DeviceType.SOUND;
  
  // Sound properties
  channels: number;
  sampleRate: number;
  
  // Sound operations
  playTone(frequency: number, duration: number, channel?: number): void;
  playNoise(duration: number, channel?: number): void;
  setVolume(volume: number, channel?: number): void;
  stopSound(channel?: number): void;
  stopAllSounds(): void;
}

// I/O System interface
export interface IOSystem {
  devices: Map<string, IODevice>;
  
  // Device management
  addDevice(device: IODevice): void;
  removeDevice(deviceId: string): void;
  getDevice(deviceId: string): IODevice | undefined;
  getDeviceByType(type: DeviceType): IODevice[];
  
  // I/O operations
  read(address: number): number;
  write(address: number, value: number): void;
  
  // System operations
  reset(): void;
  update(): void;
  
  // Event handling
  handleInterrupt(deviceId: string): void;
  
  // Device discovery
  scanDevices(): IODevice[];
  getDeviceInfo(deviceId: string): DeviceInfo | undefined;
}

// Device information
export interface DeviceInfo {
  id: string;
  type: DeviceType;
  name: string;
  description: string;
  baseAddress: number;
  size: number;
  version: string;
  manufacturer: string;
  capabilities: string[];
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
}

// I/O Event types
export interface IOEvent {
  type: 'DEVICE_ADDED' | 'DEVICE_REMOVED' | 'DEVICE_ERROR' | 'INTERRUPT';
  deviceId: string;
  timestamp: number;
  data?: any;
}

// I/O Configuration
export interface IOConfig {
  autoScanDevices?: boolean;
  enableInterrupts?: boolean;
  defaultDevices?: {
    keyboard?: Partial<KeyboardDevice>;
    display?: Partial<DisplayDevice>;
    serial?: Partial<SerialDevice>;
    sound?: Partial<SoundDevice>;
  };
  
  // Address mapping
  addressMap?: {
    [address: number]: string; // address -> device ID
  };
}