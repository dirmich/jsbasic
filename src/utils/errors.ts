/**
 * 6502 BASIC 에뮬레이터 에러 클래스들
 * 
 * 시스템의 다양한 에러 상황을 처리하기 위한 전용 에러 클래스를 제공합니다.
 */

/**
 * 기본 에뮬레이터 에러
 */
export class EmulatorError extends Error {
  public readonly code: string;
  public readonly context?: any;

  constructor(message: string, code: string = 'EMULATOR_ERROR', context?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    
    // Error 스택 추적을 정확히 설정
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}


/**
 * 메모리 관련 에러
 */
export class MemoryError extends EmulatorError {
  constructor(message: string, code: string = 'MEMORY_ERROR', context?: any) {
    super(message, code, context);
  }
}

/**
 * BASIC 인터프리터 관련 에러
 */
export class BasicError extends EmulatorError {
  public readonly lineNumber?: number;

  constructor(message: string, code: string = 'BASIC_ERROR', lineNumber?: number, context?: any) {
    super(message, code, context);
    if (lineNumber !== undefined) {
      this.lineNumber = lineNumber;
    }
  }
}

/**
 * CPU 관련 에러
 */
export class CPUError extends EmulatorError {
  public address?: number;
  public instruction?: string;

  constructor(message: string, code: string = 'CPU_ERROR', address?: number, instruction?: string, context?: any) {
    super(message, code, context);
    if (address !== undefined) {
      this.address = address;
    }
    if (instruction !== undefined) {
      this.instruction = instruction;
    }
  }
}

/**
 * I/O 관련 에러
 */
export class IOError extends EmulatorError {
  constructor(message: string, code: string = 'IO_ERROR', context?: any) {
    super(message, code, context);
  }
}

/**
 * 수학 연산 관련 에러
 */
export class MathError extends EmulatorError {
  constructor(message: string, code: string = 'MATH_ERROR', context?: any) {
    super(message, code, context);
  }
}

/**
 * 시스템 관련 에러
 */
export class SystemError extends EmulatorError {
  constructor(message: string, code: string = 'SYSTEM_ERROR', context?: any) {
    super(message, code, context);
  }
}

/**
 * 에러 코드 상수
 */
export const ERROR_CODES = {
  // CPU 에러
  UNKNOWN_OPCODE: 'UNKNOWN_OPCODE',
  INVALID_ADDRESSING_MODE: 'INVALID_ADDRESSING_MODE',
  INVALID_INSTRUCTION: 'INVALID_INSTRUCTION',
  STACK_OVERFLOW: 'STACK_OVERFLOW',
  STACK_UNDERFLOW: 'STACK_UNDERFLOW',
  
  // 메모리 에러
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_VALUE: 'INVALID_VALUE',
  INVALID_SIZE: 'INVALID_SIZE',
  INVALID_LENGTH: 'INVALID_LENGTH',
  ACCESS_DENIED: 'ACCESS_DENIED',
  BANK_NOT_FOUND: 'BANK_NOT_FOUND',
  BANK_EXISTS: 'BANK_EXISTS',
  CANNOT_DELETE_MAIN: 'CANNOT_DELETE_MAIN',
  CANNOT_DELETE_CURRENT: 'CANNOT_DELETE_CURRENT',
  INVALID_RANGE: 'INVALID_RANGE',
  INVALID_WRITE_MODE: 'INVALID_WRITE_MODE',
  
  // BASIC 인터프리터 에러
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',
  STACK_OVERFLOW_BASIC: 'STACK_OVERFLOW_BASIC',
  UNDEFINED_VARIABLE: 'UNDEFINED_VARIABLE',
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  SUBSCRIPT_OUT_OF_RANGE: 'SUBSCRIPT_OUT_OF_RANGE',
  ILLEGAL_FUNCTION_CALL: 'ILLEGAL_FUNCTION_CALL',
  
  // I/O 에러
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  READ_ERROR: 'READ_ERROR',
  WRITE_ERROR: 'WRITE_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // 수학 연산 에러
  INVALID_OPERATION: 'INVALID_OPERATION',
  OVERFLOW: 'OVERFLOW',
  UNDERFLOW: 'UNDERFLOW',
  
  // 시스템 에러
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED'
} as const;

/**
 * 에러 유틸리티 함수들
 */
export class ErrorUtils {
  /**
   * 에러가 특정 타입인지 확인
   */
  static isErrorType<T extends EmulatorError>(
    error: unknown, 
    ErrorClass: new (...args: any[]) => T
  ): error is T {
    return error instanceof ErrorClass;
  }

  /**
   * 에러 코드로 에러인지 확인
   */
  static isErrorCode(error: unknown, code: string): boolean {
    return error instanceof EmulatorError && error.code === code;
  }

  /**
   * 에러를 사용자 친화적인 메시지로 변환
   */
  static formatUserMessage(error: EmulatorError): string {
    const baseMessage = error.message;
    
    if (error instanceof BasicError && error.lineNumber) {
      return `줄 ${error.lineNumber}: ${baseMessage}`;
    }
    
    return baseMessage;
  }

  /**
   * 에러 컨텍스트 정보 추출
   */
  static getErrorContext(error: EmulatorError): Record<string, any> {
    const context: Record<string, any> = {
      name: error.name,
      code: error.code,
      message: error.message
    };

    if (error instanceof BasicError && error.lineNumber) {
      context.lineNumber = error.lineNumber;
    }

    if (error.context) {
      context.additionalContext = error.context;
    }

    return context;
  }

  /**
   * 에러 체인 생성
   */
  static createErrorChain(originalError: Error, newMessage: string, newCode?: string): EmulatorError {
    const chainedError = new EmulatorError(
      newMessage, 
      newCode || 'CHAINED_ERROR',
      { originalError: originalError.message, stack: originalError.stack }
    );
    
    return chainedError;
  }

  /**
   * 개발 모드에서 상세한 에러 정보 출력
   */
  static logErrorDetails(error: EmulatorError, isDevelopment: boolean = false): void {
    if (isDevelopment) {
      console.group(`🚨 ${error.name}`);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      if (error.context) {
        console.error('Context:', error.context);
      }
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      console.groupEnd();
    } else {
      console.error(`${error.name}: ${error.message}`);
    }
  }
}

/**
 * 전역 에러 핸들러 설정
 */
export function setupGlobalErrorHandler(isDevelopment: boolean = false): void {
  if (typeof window !== 'undefined') {
    // 브라우저 환경
    window.addEventListener('error', (event) => {
      if (event.error instanceof EmulatorError) {
        ErrorUtils.logErrorDetails(event.error, isDevelopment);
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof EmulatorError) {
        ErrorUtils.logErrorDetails(event.reason, isDevelopment);
      }
    });
  } else if (typeof process !== 'undefined') {
    // Node.js 환경
    process.on('uncaughtException', (error) => {
      if (error instanceof EmulatorError) {
        ErrorUtils.logErrorDetails(error, isDevelopment);
      }
      // 치명적인 에러이므로 프로세스 종료
      if (!isDevelopment) {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason) => {
      if (reason instanceof EmulatorError) {
        ErrorUtils.logErrorDetails(reason, isDevelopment);
      }
    });
  }
}