import type { 
  CPUState, 
  CPUStateInfo,
  CPUDebugInfo, 
  BreakpointInfo, 
  WatchpointInfo,
  ExecutionTrace,
  DisassemblyInfo
} from '@/types/cpu';
import type { CPU6502 } from './cpu';
import { formatHex } from '@/utils/format';
import { EventEmitter } from '../utils/events.js';

/**
 * CPU 디버거 이벤트 타입
 */
interface DebuggerEvents {
  breakpoint: (info: BreakpointInfo) => void;
  watchpoint: (info: WatchpointInfo) => void;
  step: (trace: ExecutionTrace) => void;
  stateChange: (state: CPUStateInfo) => void;
  [key: string]: (...args: any[]) => void;
}

/**
 * 6502 CPU 디버거 (간소화 버전)
 * 
 * 기본적인 디버깅 기능을 제공합니다:
 * - 브레이크포인트
 * - CPU 상태 조회
 * - 기본적인 디스어셈블리
 */
export class CPUDebugger extends EventEmitter<DebuggerEvents> {
  private breakpoints = new Map<number, BreakpointInfo>();
  private watchpoints = new Map<number, WatchpointInfo>();
  private executionTrace: ExecutionTrace[] = [];
  private isDebugging = false;

  constructor(private cpu: CPU6502) {
    super();
  }

  /**
   * 디버깅 시작
   */
  startDebugging(): void {
    this.isDebugging = true;
    console.log('🔍 CPU 디버거 시작');
  }

  /**
   * 디버깅 중지
   */
  stopDebugging(): void {
    this.isDebugging = false;
    this.clearBreakpoints();
    this.clearWatchpoints();
    console.log('⏹️ CPU 디버거 중지');
  }

  /**
   * 브레이크포인트 설정 (조건부 브레이크포인트 지원)
   */
  setBreakpoint(address: number, condition?: string, name?: string): void {
    const breakpoint: BreakpointInfo = {
      address,
      enabled: true,
      hitCount: 0,
      lastHit: 0
    };
    
    if (condition !== undefined) {
      breakpoint.condition = condition;
    }
    if (name !== undefined) {
      breakpoint.name = name;
    } else {
      breakpoint.name = `BP_${formatHex(address, 4)}`;
    }
    
    this.breakpoints.set(address, breakpoint);
    console.log(`🔴 브레이크포인트 설정: ${breakpoint.name} at $${formatHex(address, 4)}`);
    if (condition) {
      console.log(`   조건: ${condition}`);
    }
  }

  /**
   * 조건부 브레이크포인트 설정
   */
  setConditionalBreakpoint(address: number, condition: string, name?: string): void {
    this.setBreakpoint(address, condition, name || `CBP_${formatHex(address, 4)}`);
  }

  /**
   * 임시 브레이크포인트 설정 (한 번만 실행되고 자동 제거)
   */
  setTemporaryBreakpoint(address: number, name?: string): void {
    const tempName = name || `TBP_${formatHex(address, 4)}`;
    this.setBreakpoint(address, `hitCount < 1`, tempName);
    console.log(`⏰ 임시 브레이크포인트 설정: ${tempName}`);
  }

  /**
   * 브레이크포인트 해제
   */
  removeBreakpoint(address: number): boolean {
    const removed = this.breakpoints.delete(address);
    if (removed) {
      console.log(`⚪ 브레이크포인트 해제: $${formatHex(address, 4)}`);
    }
    return removed;
  }

  /**
   * 모든 브레이크포인트 해제
   */
  clearBreakpoints(): void {
    this.breakpoints.clear();
    console.log('🔄 모든 브레이크포인트 해제');
  }


  /**
   * 브레이크포인트 목록 반환
   */
  getBreakpoints(): BreakpointInfo[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * 워치포인트 목록 반환
   */
  getWatchpoints(): WatchpointInfo[] {
    return Array.from(this.watchpoints.values());
  }

  /**
   * CPU 상태 정보 반환
   */
  getCPUState(): CPUDebugInfo {
    const debugInfo = this.cpu.getDebugInfo();
    return {
      ...debugInfo,
      breakpoints: this.getBreakpoints()
    };
  }

  /**
   * 메모리 덤프
   */
  dumpMemory(start: number, length: number = 16): string {
    const lines: string[] = [];
    
    for (let addr = start; addr < start + length; addr += 16) {
      const lineAddr = `${formatHex(addr, 4)}:`;
      const bytes: string[] = [];
      const chars: string[] = [];
      
      for (let i = 0; i < 16 && addr + i < start + length; i++) {
        try {
          const byte = this.cpu.read(addr + i);
          bytes.push(formatHex(byte, 2));
          chars.push(byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.');
        } catch {
          bytes.push('??');
          chars.push('?');
        }
      }
      
      // 16바이트 미만인 경우 공백으로 채우기
      while (bytes.length < 16) {
        bytes.push('  ');
        chars.push(' ');
      }
      
      lines.push(`${lineAddr} ${bytes.join(' ')} |${chars.join('')}|`);
    }
    
    return lines.join('\n');
  }

  /**
   * CPU 정보 출력
   */
  printCPUInfo(): void {
    const info = this.getCPUState();
    
    console.log('\n=== CPU 상태 ===');
    console.log(`PC: $${formatHex(info.registers.PC, 4)}  A: $${formatHex(info.registers.A)}  X: $${formatHex(info.registers.X)}  Y: $${formatHex(info.registers.Y)}`);
    console.log(`SP: $${formatHex(info.registers.SP)}  P: ${this.formatFlags(info.flags)}`);
    console.log(`사이클: ${info.cycleCount}  명령어: ${info.instructionCount}  정지: ${info.isHalted}`);
    console.log('================\n');
  }

  /**
   * 플래그 포맷팅
   */
  private formatFlags(flags: any): string {
    if (typeof flags === 'object' && flags !== null) {
      const flagStr = [
        flags.negative ? 'N' : 'n',
        flags.overflow ? 'V' : 'v', 
        '-',
        flags.break ? 'B' : 'b',
        flags.decimal ? 'D' : 'd',
        flags.interrupt ? 'I' : 'i',
        flags.zero ? 'Z' : 'z',
        flags.carry ? 'C' : 'c'
      ].join('');
      return flagStr;
    }
    return '????????';
  }

  // === 고급 워치포인트 기능 ===

  /**
   * 메모리 워치포인트 설정
   */
  setWatchpoint(address: number, type: 'read' | 'write' | 'both' | 'access' = 'both', condition?: string, name?: string): void {
    const watchpoint: WatchpointInfo = {
      address,
      type,
      enabled: true,
      hitCount: 0,
      lastValue: this.cpu.memory.read(address)
    };
    
    if (condition) {
      watchpoint.condition = condition;
    }
    if (name) {
      watchpoint.name = name;
    } else {
      watchpoint.name = `WP_${formatHex(address, 4)}`;
    }
    
    this.watchpoints.set(address, watchpoint);
    console.log(`👁️ 워치포인트 설정: ${watchpoint.name} at $${formatHex(address, 4)} (${type})`);
  }

  /**
   * 워치포인트 해제
   */
  removeWatchpoint(address: number): boolean {
    const removed = this.watchpoints.delete(address);
    if (removed) {
      console.log(`⚪ 워치포인트 해제: $${formatHex(address, 4)}`);
    }
    return removed;
  }

  /**
   * 모든 워치포인트 해제
   */
  clearWatchpoints(): void {
    this.watchpoints.clear();
    console.log('🧹 모든 워치포인트 해제');
  }

  // === 실행 추적 및 분석 기능 ===

  /**
   * 실행 추적 시작
   */
  startTracing(maxEntries: number = 100): void {
    this.executionTrace = [];
    this.isDebugging = true;
    console.log(`📊 실행 추적 시작 (최대 ${maxEntries}개 엔트리)`);
  }

  /**
   * 실행 추적 중지
   */
  stopTracing(): ExecutionTrace[] {
    const trace = [...this.executionTrace];
    this.executionTrace = [];
    console.log(`📊 실행 추적 중지 (${trace.length}개 엔트리 수집)`);
    return trace;
  }

  /**
   * 성능 프로파일링
   */
  getPerformanceProfile(): {
    totalInstructions: number;
    totalCycles: number;
    avgCyclesPerInstruction: number;
    instructionFrequency: Record<string, number>;
    addressHotspots: Array<{address: number, count: number}>;
  } {
    const profile = {
      totalInstructions: this.executionTrace.length,
      totalCycles: this.executionTrace.reduce((sum, trace) => sum + trace.cycles, 0),
      avgCyclesPerInstruction: 0,
      instructionFrequency: {} as Record<string, number>,
      addressHotspots: [] as Array<{address: number, count: number}>
    };

    if (profile.totalInstructions > 0) {
      profile.avgCyclesPerInstruction = profile.totalCycles / profile.totalInstructions;
    }

    // 명령어 빈도 분석
    const addrCount = new Map<number, number>();
    for (const trace of this.executionTrace) {
      const instruction = trace.instruction || 'UNKNOWN';
      profile.instructionFrequency[instruction] = (profile.instructionFrequency[instruction] || 0) + 1;
      
      // 주소별 실행 빈도
      addrCount.set(trace.address, (addrCount.get(trace.address) || 0) + 1);
    }

    // 핫스팟 정렬 (상위 10개)
    profile.addressHotspots = Array.from(addrCount.entries())
      .map(([address, count]) => ({address, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return profile;
  }

  /**
   * 디버깅 상태 확인
   */
  isDebuggingActive(): boolean {
    return this.isDebugging;
  }

  /**
   * 종합 디버그 정보 반환
   */
  getComprehensiveDebugInfo(): {
    cpu: CPUDebugInfo;
    breakpoints: BreakpointInfo[];
    watchpoints: WatchpointInfo[];
    profile: any;
    traceLength: number;
  } {
    const cpuDebugInfo = this.cpu.getDebugInfo();
    return {
      cpu: {
        registers: cpuDebugInfo.registers,
        flags: cpuDebugInfo.flags,
        cycleCount: cpuDebugInfo.cycleCount,
        instructionCount: cpuDebugInfo.instructionCount,
        isHalted: cpuDebugInfo.isHalted,
        pendingInterrupts: cpuDebugInfo.pendingInterrupts,
        lastInstruction: cpuDebugInfo.lastInstruction ?? 'N/A'
      },
      breakpoints: Array.from(this.breakpoints.values()),
      watchpoints: Array.from(this.watchpoints.values()),
      profile: this.getPerformanceProfile(),
      traceLength: this.executionTrace.length
    };
  }
}