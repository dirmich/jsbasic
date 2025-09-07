/**
 * 포맷팅 유틸리티 함수들
 * 
 * 숫자, 메모리 주소, 바이너리 데이터 등을 다양한 형식으로 포맷팅하는 함수들을 제공합니다.
 */

/**
 * 숫자를 16진수 문자열로 변환
 * 
 * @param value 변환할 숫자
 * @param digits 자릿수 (기본값: 자동 결정)
 * @param prefix 접두사 추가 여부 (기본값: false)
 * @returns 16진수 문자열
 */
export function formatHex(
  value: number, 
  digits?: number, 
  prefix: boolean = false
): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid value for hex formatting: ${value}`);
  }

  // 자릿수 자동 결정
  if (digits === undefined) {
    if (value <= 0xFF) digits = 2;
    else if (value <= 0xFFFF) digits = 4;
    else if (value <= 0xFFFFFF) digits = 6;
    else digits = 8;
  }

  const hexString = value.toString(16).toUpperCase().padStart(digits, '0');
  return prefix ? `0x${hexString}` : hexString;
}

/**
 * 숫자를 2진수 문자열로 변환
 * 
 * @param value 변환할 숫자
 * @param digits 자릿수 (기본값: 8)
 * @param prefix 접두사 추가 여부 (기본값: false)
 * @returns 2진수 문자열
 */
export function formatBinary(
  value: number, 
  digits: number = 8, 
  prefix: boolean = false
): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid value for binary formatting: ${value}`);
  }

  const binaryString = value.toString(2).padStart(digits, '0');
  return prefix ? `0b${binaryString}` : binaryString;
}

/**
 * 숫자를 부호 있는 형태로 포맷팅
 * 
 * @param value 8비트 부호 없는 값
 * @returns 부호 있는 값 (-128 ~ +127)
 */
export function formatSigned8(value: number): number {
  if (value > 127) {
    return value - 256;
  }
  return value;
}

/**
 * 숫자를 부호 있는 16비트 형태로 포맷팅
 * 
 * @param value 16비트 부호 없는 값
 * @returns 부호 있는 값 (-32768 ~ +32767)
 */
export function formatSigned16(value: number): number {
  if (value > 32767) {
    return value - 65536;
  }
  return value;
}

/**
 * 메모리 주소를 포맷팅
 * 
 * @param address 메모리 주소
 * @param format 포맷 형식 ('$XXXX', '0xXXXX', 'XXXX')
 * @returns 포맷된 주소 문자열
 */
export function formatAddress(
  address: number, 
  format: '$XXXX' | '0xXXXX' | 'XXXX' = '$XXXX'
): string {
  const hex = formatHex(address, 4);
  
  switch (format) {
    case '$XXXX':
      return `$${hex}`;
    case '0xXXXX':
      return `0x${hex}`;
    case 'XXXX':
      return hex;
    default:
      return `$${hex}`;
  }
}

/**
 * 바이트 값을 포맷팅
 * 
 * @param value 바이트 값
 * @param format 포맷 형식
 * @returns 포맷된 바이트 문자열
 */
export function formatByte(
  value: number, 
  format: '$XX' | '0xXX' | 'XX' = '$XX'
): string {
  const hex = formatHex(value, 2);
  
  switch (format) {
    case '$XX':
      return `$${hex}`;
    case '0xXX':
      return `0x${hex}`;
    case 'XX':
      return hex;
    default:
      return `$${hex}`;
  }
}

/**
 * CPU 플래그를 문자열로 포맷팅
 * 
 * @param flags 플래그 객체
 * @returns 플래그 문자열 (예: "NV-BDIZC")
 */
export function formatCPUFlags(flags: {
  N?: boolean;
  V?: boolean;
  B?: boolean;
  D?: boolean;
  I?: boolean;
  Z?: boolean;
  C?: boolean;
}): string {
  return [
    flags.N ? 'N' : 'n',
    flags.V ? 'V' : 'v',
    '-', // unused bit
    flags.B ? 'B' : 'b',
    flags.D ? 'D' : 'd',
    flags.I ? 'I' : 'i',
    flags.Z ? 'Z' : 'z',
    flags.C ? 'C' : 'c'
  ].join('');
}

/**
 * 메모리 덤프 라인 포맷팅
 * 
 * @param address 시작 주소
 * @param data 데이터 배열
 * @param bytesPerLine 한 줄당 바이트 수
 * @param showAscii ASCII 표시 여부
 * @returns 포맷된 덤프 라인
 */
export function formatMemoryDumpLine(
  address: number,
  data: Uint8Array,
  bytesPerLine: number = 16,
  showAscii: boolean = true
): string {
  const addressStr = formatAddress(address, '$XXXX');
  
  // 16진수 부분
  const hexParts: string[] = [];
  const asciiParts: string[] = [];
  
  for (let i = 0; i < bytesPerLine; i++) {
    if (i < data.length) {
      const byte = data[i];
      hexParts.push(formatHex(byte, 2));
      
      // ASCII 변환 (출력 가능한 문자만)
      if (showAscii) {
        if (byte >= 32 && byte <= 126) {
          asciiParts.push(String.fromCharCode(byte));
        } else {
          asciiParts.push('.');
        }
      }
    } else {
      hexParts.push('  ');
      if (showAscii) {
        asciiParts.push(' ');
      }
    }
  }
  
  // 4바이트마다 공백 추가
  const formattedHex = hexParts
    .map((hex, index) => (index > 0 && index % 4 === 0) ? ` ${hex}` : hex)
    .join(' ');
  
  let result = `${addressStr}: ${formattedHex}`;
  
  if (showAscii) {
    result += ` |${asciiParts.join('')}|`;
  }
  
  return result;
}

/**
 * 실행 시간을 사람이 읽기 쉬운 형태로 포맷팅
 * 
 * @param milliseconds 밀리초
 * @returns 포맷된 시간 문자열
 */
export function formatExecutionTime(milliseconds: number): string {
  if (milliseconds < 1) {
    return `${(milliseconds * 1000).toFixed(0)}μs`;
  } else if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 포맷팅
 * 
 * @param bytes 바이트 수
 * @returns 포맷된 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = bytes / Math.pow(k, i);
  const formatted = i === 0 ? size.toString() : size.toFixed(1);
  
  return `${formatted} ${units[i]}`;
}

/**
 * 숫자를 천 단위 구분자와 함께 포맷팅
 * 
 * @param value 숫자
 * @param separator 구분자 (기본값: ',')
 * @returns 포맷된 숫자 문자열
 */
export function formatNumber(value: number, separator: string = ','): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * 퍼센트를 포맷팅
 * 
 * @param value 0-1 사이의 값 또는 퍼센트 값
 * @param decimals 소수점 자릿수
 * @param isAlreadyPercent 이미 퍼센트 값인지 여부
 * @returns 포맷된 퍼센트 문자열
 */
export function formatPercent(
  value: number, 
  decimals: number = 1, 
  isAlreadyPercent: boolean = false
): string {
  const percent = isAlreadyPercent ? value : value * 100;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * CPU 레지스터 상태를 포맷팅
 * 
 * @param registers 레지스터 객체
 * @returns 포맷된 레지스터 문자열
 */
export function formatCPURegisters(registers: {
  A?: number;
  X?: number;
  Y?: number;
  PC?: number;
  SP?: number;
  P?: number;
}): string {
  const parts: string[] = [];
  
  if (registers.A !== undefined) parts.push(`A=${formatByte(registers.A)}`);
  if (registers.X !== undefined) parts.push(`X=${formatByte(registers.X)}`);
  if (registers.Y !== undefined) parts.push(`Y=${formatByte(registers.Y)}`);
  if (registers.PC !== undefined) parts.push(`PC=${formatAddress(registers.PC)}`);
  if (registers.SP !== undefined) parts.push(`SP=${formatByte(registers.SP)}`);
  if (registers.P !== undefined) parts.push(`P=${formatByte(registers.P)}`);
  
  return parts.join(' ');
}

/**
 * 명령어 디스어셈블리를 포맷팅
 * 
 * @param address 명령어 주소
 * @param bytes 명령어 바이트들
 * @param mnemonic 명령어 이름
 * @param operand 피연산자
 * @returns 포맷된 디스어셈블리 문자열
 */
export function formatDisassembly(
  address: number,
  bytes: number[],
  mnemonic: string,
  operand: string = ''
): string {
  const addressStr = formatAddress(address);
  
  // 바이트들을 16진수로 변환 (최대 3바이트)
  const bytesStr = bytes
    .slice(0, 3)
    .map(b => formatHex(b, 2))
    .join(' ')
    .padEnd(8); // 3바이트 * 2문자 + 2공백 = 8문자
  
  // 명령어 조합
  const instruction = operand ? `${mnemonic} ${operand}` : mnemonic;
  
  return `${addressStr}  ${bytesStr}  ${instruction}`;
}

/**
 * 디버깅 정보를 테이블 형태로 포맷팅
 * 
 * @param data 테이블 데이터
 * @param headers 헤더 배열
 * @returns 포맷된 테이블 문자열
 */
export function formatTable(
  data: any[][],
  headers?: string[]
): string {
  if (data.length === 0) return '';
  
  // 각 컬럼의 최대 너비 계산
  const columnWidths: number[] = [];
  
  // 헤더가 있으면 먼저 계산
  if (headers) {
    headers.forEach((header, index) => {
      columnWidths[index] = Math.max(columnWidths[index] || 0, header.length);
    });
  }
  
  // 데이터 너비 계산
  data.forEach(row => {
    row.forEach((cell, index) => {
      const cellStr = String(cell);
      columnWidths[index] = Math.max(columnWidths[index] || 0, cellStr.length);
    });
  });
  
  const lines: string[] = [];
  
  // 헤더 출력
  if (headers) {
    const headerLine = headers
      .map((header, index) => header.padEnd(columnWidths[index]))
      .join(' | ');
    lines.push(headerLine);
    
    // 구분선
    const separatorLine = columnWidths
      .map(width => '-'.repeat(width))
      .join('-+-');
    lines.push(separatorLine);
  }
  
  // 데이터 출력
  data.forEach(row => {
    const dataLine = row
      .map((cell, index) => String(cell).padEnd(columnWidths[index]))
      .join(' | ');
    lines.push(dataLine);
  });
  
  return lines.join('\n');
}

/**
 * 색상 코드를 사용한 콘솔 출력 포맷팅 (Node.js)
 */
export const ConsoleColors = {
  // 색상 코드
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // 전경색
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // 배경색
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  
  // 헬퍼 함수들
  colorize: (text: string, color: string) => `${color}${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bright: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`
};

/**
 * 진행률 바 생성
 * 
 * @param progress 0-1 사이의 진행률
 * @param width 바의 너비 (기본값: 20)
 * @param showPercent 퍼센트 표시 여부
 * @returns 진행률 바 문자열
 */
export function formatProgressBar(
  progress: number,
  width: number = 20,
  showPercent: boolean = true
): string {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const filledWidth = Math.round(clampedProgress * width);
  const emptyWidth = width - filledWidth;
  
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  const bar = `[${filled}${empty}]`;
  
  if (showPercent) {
    const percent = formatPercent(clampedProgress, 1);
    return `${bar} ${percent}`;
  }
  
  return bar;
}