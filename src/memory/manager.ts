import type { 
  MemoryInterface, 
  MemoryBankInfo, 
  MemoryAccessLog, 
  MemoryMapEntry,
  MemoryProtection
} from '@/types/memory';
import { MemoryError } from '@/utils/errors';
import { EventEmitter } from '../utils/events.js';

/**
 * 메모리 관리자 이벤트 타입
 */
interface MemoryEvents {
  read: (address: number, value: number, bank?: string) => void;
  write: (address: number, value: number, oldValue: number, bank?: string) => void;
  bankSwitch: (oldBank: string, newBank: string) => void;
  protection: (address: number, operation: 'read' | 'write', protection: MemoryProtection) => void;
  [key: string]: (...args: any[]) => void;
}

/**
 * 6502 메모리 관리자
 * 
 * 6502 시스템의 메모리를 관리하는 클래스입니다:
 * - 64KB 선형 주소 공간 관리
 * - 메모리 뱅크 시스템 지원
 * - 읽기 전용/쓰기 보호 메모리 영역
 * - 메모리 맵핑 및 I/O 영역 처리
 * - 메모리 접근 추적 및 로깅
 * - DMA 및 고속 메모리 연산
 */
export class MemoryManager extends EventEmitter<MemoryEvents> implements MemoryInterface {
  private readonly memory: Uint8Array;
  private readonly memoryBanks = new Map<string, Uint8Array>();
  private readonly memoryMap = new Map<number, MemoryMapEntry>();
  private readonly protectedRegions = new Map<number, MemoryProtection>();
  private readonly accessLog: MemoryAccessLog[] = [];
  
  private currentBank = 'main';
  private readonly bankSize: number;
  private accessTracking = false;
  private enforceProtection = true;
  private maxLogSize = 1000;

  constructor(
    size: number = 65536,
    options: {
      enableBanking?: boolean;
      bankSize?: number;
      trackAccess?: boolean;
      enforceProtection?: boolean;
      maxLogSize?: number;
      protectInterruptVectors?: boolean;
    } = {}
  ) {
    super();
    
    if (size <= 0 || size > 0x10000) {
      throw new MemoryError(`Invalid memory size: ${size}. Must be between 1 and 65536.`, 'INVALID_SIZE');
    }

    this.memory = new Uint8Array(size);
    this.bankSize = options.bankSize || size;
    this.accessTracking = options.trackAccess || false;
    this.enforceProtection = options.enforceProtection !== false;
    this.maxLogSize = options.maxLogSize || 1000;

    // 메인 메모리 뱅크 등록
    this.memoryBanks.set('main', this.memory);

    // 기본 메모리 맵 설정 (테스트 모드에서는 인터럽트 벡터 보호 안함)
    this.setupDefaultMemoryMap(options.protectInterruptVectors !== false);

    console.log(`🧠 메모리 관리자 초기화: ${size}바이트, 뱅킹=${options.enableBanking}, 추적=${this.accessTracking}`);
  }

  // =================================================================
  // 기본 메모리 접근 메서드
  // =================================================================

  /**
   * 바이트 읽기 (별칭)
   * 
   * @param address 읽을 주소 (0x0000-0xFFFF)
   * @returns 읽은 바이트 값
   */
  public read(address: number): number {
    return this.readByte(address);
  }

  /**
   * 바이트 쓰기 (별칭)
   * 
   * @param address 쓸 주소 (0x0000-0xFFFF)
   * @param value 쓸 값 (0x00-0xFF)
   */
  public write(address: number, value: number): void {
    this.writeByte(address, value);
  }

  /**
   * 바이트 읽기
   * 
   * @param address 읽을 주소 (0x0000-0xFFFF)
   * @returns 읽은 바이트 값
   */
  public readByte(address: number): number {
    this.validateAddress(address);
    
    // 보호 영역 확인
    this.checkProtection(address, 'read');
    
    // 메모리 맵 확인
    const mapped = this.checkMemoryMap(address, 'read');
    if (mapped !== undefined) {
      return mapped;
    }

    // 현재 뱅크에서 읽기
    const bank = this.memoryBanks.get(this.currentBank);
    if (!bank) {
      throw new MemoryError(`Memory bank not found: ${this.currentBank}`, 'BANK_NOT_FOUND');
    }

    const value = bank[address % bank.length] ?? 0;
    
    // 접근 추적
    if (this.accessTracking) {
      this.logAccess(address, 'read', value);
    }

    // 이벤트 발생
    this.emit('read', address, value, this.currentBank);

    return value;
  }

  /**
   * 바이트 쓰기
   * 
   * @param address 쓸 주소 (0x0000-0xFFFF)
   * @param value 쓸 값 (0x00-0xFF)
   */
  public writeByte(address: number, value: number): void {
    this.validateAddress(address);
    this.validateByte(value);
    
    // 보호 영역 확인
    this.checkProtection(address, 'write');
    
    // 메모리 맵 확인
    if (this.checkMemoryMap(address, 'write', value)) {
      return; // 매핑된 영역에서 처리됨
    }

    // 현재 뱅크에서 쓰기
    const bank = this.memoryBanks.get(this.currentBank);
    if (!bank) {
      throw new MemoryError(`Memory bank not found: ${this.currentBank}`, 'BANK_NOT_FOUND');
    }

    const oldValue = bank[address % bank.length] ?? 0;
    bank[address % bank.length] = value;
    
    // 접근 추적
    if (this.accessTracking) {
      this.logAccess(address, 'write', value, oldValue);
    }

    // 이벤트 발생
    this.emit('write', address, value, oldValue, this.currentBank);
  }

  /**
   * 워드 읽기 (리틀 엔디언)
   * 
   * @param address 읽을 주소
   * @returns 읽은 16비트 값
   */
  public readWord(address: number): number {
    const low = this.readByte(address);
    const high = this.readByte((address + 1) & 0xFFFF);
    return low | (high << 8);
  }

  /**
   * 워드 쓰기 (리틀 엔디언)
   * 
   * @param address 쓸 주소
   * @param value 쓸 16비트 값
   */
  public writeWord(address: number, value: number): void {
    this.validateWord(value);
    this.writeByte(address, value & 0xFF);
    this.writeByte((address + 1) & 0xFFFF, (value >> 8) & 0xFF);
  }

  /**
   * 메모리 블록 읽기
   * 
   * @param address 시작 주소
   * @param length 읽을 바이트 수
   * @returns 읽은 데이터 배열
   */
  public getBytes(address: number, length: number): Uint8Array {
    this.validateAddress(address);
    
    if (length <= 0) {
      throw new MemoryError(`Invalid length: ${length}`, 'INVALID_LENGTH');
    }

    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.readByte((address + i) & 0xFFFF);
    }
    
    return result;
  }

  /**
   * 메모리 블록 쓰기
   * 
   * @param address 시작 주소
   * @param data 쓸 데이터
   */
  public setBytes(address: number, data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      this.writeByte((address + i) & 0xFFFF, data[i] ?? 0);
    }
  }

  /**
   * 메모리 초기화
   * 
   * @param value 초기화할 값 (기본값: 0x00)
   */
  public clear(value: number = 0x00): void {
    this.validateByte(value);
    
    const bank = this.memoryBanks.get(this.currentBank);
    if (bank) {
      bank.fill(value);
      console.log(`🧽 메모리 뱅크 '${this.currentBank}' 초기화: 0x${value.toString(16).padStart(2, '0')}`);
    }
  }

  // =================================================================
  // 메모리 뱅킹 시스템
  // =================================================================

  /**
   * 메모리 뱅크 생성
   * 
   * @param name 뱅크 이름
   * @param size 뱅크 크기 (기본값: bankSize)
   */
  public createBank(name: string, size?: number): void {
    if (this.memoryBanks.has(name)) {
      throw new MemoryError(`Memory bank already exists: ${name}`, 'BANK_EXISTS');
    }

    const bankSize = size || this.bankSize;
    const bank = new Uint8Array(bankSize);
    this.memoryBanks.set(name, bank);
    
    console.log(`🏦 메모리 뱅크 생성: '${name}' (${bankSize}바이트)`);
  }

  /**
   * 메모리 뱅크 전환
   * 
   * @param name 전환할 뱅크 이름
   */
  public switchBank(name: string): void {
    if (!this.memoryBanks.has(name)) {
      throw new MemoryError(`Memory bank not found: ${name}`, 'BANK_NOT_FOUND');
    }

    const oldBank = this.currentBank;
    this.currentBank = name;
    
    this.emit('bankSwitch', oldBank, name);
    console.log(`🔄 메모리 뱅크 전환: '${oldBank}' → '${name}'`);
  }

  /**
   * 현재 뱅크 이름 반환
   */
  public getCurrentBank(): string {
    return this.currentBank;
  }

  /**
   * 모든 뱅크 정보 반환
   */
  public getBankInfo(): MemoryBankInfo[] {
    return Array.from(this.memoryBanks.entries()).map(([name, bank]) => ({
      name,
      size: bank.length,
      isCurrent: name === this.currentBank
    }));
  }

  /**
   * 뱅크 삭제
   * 
   * @param name 삭제할 뱅크 이름
   */
  public deleteBank(name: string): void {
    if (name === 'main') {
      throw new MemoryError('Cannot delete main memory bank', 'CANNOT_DELETE_MAIN');
    }

    if (name === this.currentBank) {
      throw new MemoryError('Cannot delete current memory bank', 'CANNOT_DELETE_CURRENT');
    }

    if (!this.memoryBanks.has(name)) {
      throw new MemoryError(`Memory bank not found: ${name}`, 'BANK_NOT_FOUND');
    }

    this.memoryBanks.delete(name);
    console.log(`🗑️ 메모리 뱅크 삭제: '${name}'`);
  }

  // =================================================================
  // 메모리 보호 시스템
  // =================================================================

  /**
   * 메모리 보호 설정
   * 
   * @param startAddress 시작 주소
   * @param endAddress 끝 주소
   * @param protection 보호 설정
   */
  public setProtection(
    startAddress: number,
    endAddress: number,
    protection: MemoryProtection
  ): void {
    this.validateAddress(startAddress);
    this.validateAddress(endAddress);

    if (startAddress > endAddress) {
      throw new MemoryError('Start address must be <= end address', 'INVALID_RANGE');
    }

    for (let addr = startAddress; addr <= endAddress; addr++) {
      this.protectedRegions.set(addr, protection);
    }

    console.log(`🛡️ 메모리 보호 설정: $${startAddress.toString(16).padStart(4, '0')}-$${endAddress.toString(16).padStart(4, '0')} (${protection.readable ? 'R' : '-'}${protection.writable ? 'W' : '-'})`);
  }

  /**
   * 메모리 보호 해제
   * 
   * @param startAddress 시작 주소
   * @param endAddress 끝 주소
   */
  public clearProtection(startAddress: number, endAddress: number): void {
    this.validateAddress(startAddress);
    this.validateAddress(endAddress);

    for (let addr = startAddress; addr <= endAddress; addr++) {
      this.protectedRegions.delete(addr);
    }

    console.log(`🔓 메모리 보호 해제: $${startAddress.toString(16).padStart(4, '0')}-$${endAddress.toString(16).padStart(4, '0')}`);
  }

  /**
   * 보호된 영역인지 확인
   */
  public isProtected(address: number): MemoryProtection | undefined {
    return this.protectedRegions.get(address);
  }

  /**
   * 보호 강제 여부 설정
   */
  public setEnforceProtection(enforce: boolean): void {
    this.enforceProtection = enforce;
    console.log(`🛡️ 메모리 보호 강제: ${enforce ? '활성화' : '비활성화'}`);
  }

  // =================================================================
  // 메모리 맵핑 시스템
  // =================================================================

  /**
   * 메모리 맵 항목 추가
   * 
   * @param startAddress 시작 주소
   * @param endAddress 끝 주소
   * @param entry 맵 항목
   */
  public addMemoryMap(
    startAddress: number,
    endAddress: number,
    entry: MemoryMapEntry
  ): void {
    this.validateAddress(startAddress);
    this.validateAddress(endAddress);

    for (let addr = startAddress; addr <= endAddress; addr++) {
      this.memoryMap.set(addr, entry);
    }

    console.log(`🗺️ 메모리 맵 추가: $${startAddress.toString(16).padStart(4, '0')}-$${endAddress.toString(16).padStart(4, '0')} → ${entry.name}`);
  }

  /**
   * 메모리 맵 항목 제거
   */
  public removeMemoryMap(startAddress: number, endAddress: number): void {
    for (let addr = startAddress; addr <= endAddress; addr++) {
      this.memoryMap.delete(addr);
    }
  }

  /**
   * 메모리 맵 확인 (읽기)
   */
  private checkMemoryMap(address: number, operation: 'read', value?: number): number | undefined;
  private checkMemoryMap(address: number, operation: 'write', value: number): boolean;
  private checkMemoryMap(address: number, operation: 'read' | 'write', value?: number): number | boolean | undefined {
    const entry = this.memoryMap.get(address);
    if (!entry) {
      return operation === 'read' ? undefined : false;
    }

    if (operation === 'read' && entry.readHandler) {
      return entry.readHandler(address);
    }

    if (operation === 'write' && entry.writeHandler && value !== undefined) {
      entry.writeHandler(address, value);
      return true;
    }

    return operation === 'read' ? undefined : false;
  }

  // =================================================================
  // 접근 추적 및 로깅
  // =================================================================

  /**
   * 메모리 접근 추적 활성화/비활성화
   */
  public setAccessTracking(enabled: boolean): void {
    this.accessTracking = enabled;
    if (!enabled) {
      this.accessLog.length = 0;
    }
    console.log(`📊 메모리 접근 추적: ${enabled ? '활성화' : '비활성화'}`);
  }

  /**
   * 접근 로그에 항목 추가
   */
  private logAccess(
    address: number,
    operation: 'read' | 'write',
    value: number,
    oldValue?: number
  ): void {
    const logEntry: MemoryAccessLog = {
      timestamp: Date.now(),
      address,
      operation,
      value,
      bank: this.currentBank
    };
    
    if (oldValue !== undefined) {
      logEntry.oldValue = oldValue;
    }

    this.accessLog.push(logEntry);

    // 로그 크기 제한
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog.shift();
    }
  }

  /**
   * 접근 로그 반환
   */
  public getAccessLog(count?: number): MemoryAccessLog[] {
    if (count && count < this.accessLog.length) {
      return this.accessLog.slice(-count);
    }
    return [...this.accessLog];
  }

  /**
   * 접근 로그 초기화
   */
  public clearAccessLog(): void {
    this.accessLog.length = 0;
    console.log('📊 메모리 접근 로그 초기화');
  }

  /**
   * 로그 크기 설정
   */
  public setMaxLogSize(size: number): void {
    this.maxLogSize = Math.max(0, size);
    
    // 기존 로그 크기 조정
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog.splice(0, this.accessLog.length - this.maxLogSize);
    }
  }

  // =================================================================
  // DMA 및 고속 메모리 연산
  // =================================================================

  /**
   * 메모리 블록 복사 (DMA 시뮬레이션)
   * 
   * @param srcAddress 소스 시작 주소
   * @param destAddress 대상 시작 주소
   * @param length 복사할 바이트 수
   */
  public copyMemory(srcAddress: number, destAddress: number, length: number): void {
    this.validateAddress(srcAddress);
    this.validateAddress(destAddress);

    if (length <= 0) {
      throw new MemoryError(`Invalid length: ${length}`, 'INVALID_LENGTH');
    }

    // 겹치는 영역 처리
    if (srcAddress < destAddress && srcAddress + length > destAddress) {
      // 뒤에서부터 복사 (역방향)
      for (let i = length - 1; i >= 0; i--) {
        const value = this.readByte((srcAddress + i) & 0xFFFF);
        this.writeByte((destAddress + i) & 0xFFFF, value);
      }
    } else {
      // 앞에서부터 복사 (정방향)
      for (let i = 0; i < length; i++) {
        const value = this.readByte((srcAddress + i) & 0xFFFF);
        this.writeByte((destAddress + i) & 0xFFFF, value);
      }
    }

    console.log(`📦 메모리 복사: $${srcAddress.toString(16).padStart(4, '0')} → $${destAddress.toString(16).padStart(4, '0')} (${length}바이트)`);
  }

  /**
   * 메모리 블록 채우기
   * 
   * @param address 시작 주소
   * @param length 채울 바이트 수
   * @param value 채울 값
   */
  public fillMemory(address: number, length: number, value: number): void {
    this.validateAddress(address);
    this.validateByte(value);

    if (length <= 0) {
      throw new MemoryError(`Invalid length: ${length}`, 'INVALID_LENGTH');
    }

    for (let i = 0; i < length; i++) {
      this.writeByte((address + i) & 0xFFFF, value);
    }

    console.log(`🎨 메모리 채우기: $${address.toString(16).padStart(4, '0')} (${length}바이트) = $${value.toString(16).padStart(2, '0')}`);
  }

  /**
   * 메모리 패턴 검색
   * 
   * @param pattern 검색할 패턴
   * @param startAddress 검색 시작 주소
   * @param endAddress 검색 종료 주소
   * @returns 패턴이 발견된 주소들
   */
  public searchPattern(
    pattern: Uint8Array,
    startAddress: number = 0,
    endAddress: number = 0xFFFF
  ): number[] {
    const results: number[] = [];
    
    if (pattern.length === 0) {
      return results;
    }

    for (let addr = startAddress; addr <= endAddress - pattern.length + 1; addr++) {
      let matches = true;
      
      for (let i = 0; i < pattern.length; i++) {
        if (this.readByte((addr + i) & 0xFFFF) !== pattern[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        results.push(addr);
      }
    }

    return results;
  }

  // =================================================================
  // 유효성 검사 및 유틸리티
  // =================================================================

  /**
   * 주소 유효성 검사
   */
  private validateAddress(address: number): void {
    if (!Number.isInteger(address) || address < 0 || address > 0xFFFF) {
      throw new MemoryError(`Invalid address: 0x${address.toString(16)}`, 'INVALID_ADDRESS');
    }
  }

  /**
   * 바이트 값 유효성 검사
   */
  private validateByte(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xFF) {
      throw new MemoryError(`Invalid byte value: ${value}`, 'INVALID_VALUE');
    }
  }

  /**
   * 워드 값 유효성 검사
   */
  private validateWord(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) {
      throw new MemoryError(`Invalid word value: ${value}`, 'INVALID_VALUE');
    }
  }

  /**
   * 메모리 보호 확인
   */
  private checkProtection(address: number, operation: 'read' | 'write'): void {
    if (!this.enforceProtection) {
      return;
    }

    const protection = this.protectedRegions.get(address);
    if (!protection) {
      return;
    }

    if (operation === 'read' && !protection.readable) {
      this.emit('protection', address, operation, protection);
      throw new MemoryError(`Read access denied at address 0x${address.toString(16).padStart(4, '0')}`, 'ACCESS_DENIED');
    }

    if (operation === 'write' && !protection.writable) {
      this.emit('protection', address, operation, protection);
      throw new MemoryError(`Write access denied at address 0x${address.toString(16).padStart(4, '0')}`, 'ACCESS_DENIED');
    }
  }

  // =================================================================
  // 기본 메모리 맵 설정
  // =================================================================

  /**
   * 6502 시스템의 기본 메모리 맵 설정
   */
  private setupDefaultMemoryMap(protectInterruptVectors: boolean = true): void {
    // 제로 페이지 (0x0000-0x00FF)
    this.addMemoryMap(0x0000, 0x00FF, {
      name: 'Zero Page',
      description: '제로 페이지 메모리 (고속 접근)',
      type: 'ram'
    });

    // 스택 (0x0100-0x01FF)  
    this.addMemoryMap(0x0100, 0x01FF, {
      name: 'Stack',
      description: '시스템 스택',
      type: 'ram'
    });

    // 인터럽트 벡터 (0xFFFA-0xFFFF)
    this.addMemoryMap(0xFFFA, 0xFFFF, {
      name: 'Interrupt Vectors',
      description: '인터럽트 벡터 테이블',
      type: 'rom'
    });

    // ROM 영역을 읽기 전용으로 설정 (테스트 모드에서는 선택적)
    if (protectInterruptVectors) {
      this.setProtection(0xFFFA, 0xFFFF, {
        readable: true,
        writable: false,
        description: 'Interrupt vectors (read-only)'
      });
    }
  }

  // =================================================================
  // 디버깅 및 정보 메서드
  // =================================================================

  /**
   * 메모리 덤프 생성
   * 
   * @param startAddress 시작 주소
   * @param length 덤프할 바이트 수
   * @param bytesPerLine 한 줄당 바이트 수
   */
  public dump(
    startAddress: number = 0,
    length: number = 256,
    bytesPerLine: number = 16
  ): string {
    const lines: string[] = [];
    
    for (let addr = startAddress; addr < startAddress + length; addr += bytesPerLine) {
      const lineAddress = `${addr.toString(16).padStart(4, '0').toUpperCase()}:`;
      const hexBytes: string[] = [];
      const asciiBytes: string[] = [];
      
      for (let i = 0; i < bytesPerLine; i++) {
        const currentAddr = addr + i;
        if (currentAddr >= startAddress + length) break;
        
        try {
          const byte = this.readByte(currentAddr) ?? 0;
          hexBytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
          asciiBytes.push(byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.');
        } catch {
          hexBytes.push('??');
          asciiBytes.push('?');
        }
      }
      
      // 16바이트 미만인 경우 공백으로 채우기
      while (hexBytes.length < bytesPerLine) {
        hexBytes.push('  ');
        asciiBytes.push(' ');
      }
      
      const hexPart = hexBytes.join(' ');
      const asciiPart = asciiBytes.join('');
      lines.push(`${lineAddress} ${hexPart} |${asciiPart}|`);
    }
    
    return lines.join('\n');
  }

  /**
   * 메모리 사용량 통계
   */
  public getMemoryStats(): {
    totalSize: number;
    bankCount: number;
    protectedRegions: number;
    mappedRegions: number;
    accessLogSize: number;
    currentBank: string;
  } {
    // 보호된 지역의 총 바이트 수 계산
    let totalProtectedBytes = 0;
    for (const [address, protection] of this.protectedRegions) {
      // 각 보호된 주소 범위를 계산 (범위 끝 주소는 별도 저장되지 않으므로 1바이트로 가정)
      totalProtectedBytes += 1;
    }
    
    return {
      totalSize: this.memory.length,
      bankCount: this.memoryBanks.size,
      protectedRegions: totalProtectedBytes,
      mappedRegions: this.memoryMap.size,
      accessLogSize: this.accessLog.length,
      currentBank: this.currentBank
    };
  }

  /**
   * 메모리 사용률 반환
   */
  public getUsage(): number {
    const totalSize = this.memory.length;
    let usedBytes = 0;
    
    // 0이 아닌 바이트 개수를 센다
    for (let i = 0; i < totalSize; i++) {
      if (this.memory[i] !== 0) {
        usedBytes++;
      }
    }
    
    return (usedBytes / totalSize) * 100; // 퍼센트로 반환
  }

  /**
   * 메모리 상태 초기화
   */
  public reset(): void {
    // 모든 뱅크의 메모리를 클리어
    for (const bank of this.memoryBanks.values()) {
      bank.fill(0x00);
    }
    this.clearAccessLog();
    this.switchBank('main');
    console.log('🔄 메모리 관리자 리셋 완료');
  }

  /**
   * 내부 메모리 배열 반환 (디스어셈블러 등에서 사용)
   */
  public getData(): Uint8Array {
    return this.memory;
  }
}