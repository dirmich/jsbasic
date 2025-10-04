/**
 * File System Implementation
 *
 * 파일 I/O 시스템 (OPEN, CLOSE, PRINT#, INPUT#)
 */

import { BasicError, ERROR_CODES } from '@/utils/errors';

/**
 * 파일 오픈 모드
 */
export type FileMode = 'INPUT' | 'OUTPUT' | 'APPEND' | 'RANDOM';

/**
 * 파일 핸들 인터페이스
 */
export interface FileHandle {
  fileNumber: number;
  filename: string;
  mode: FileMode;
  recordLength?: number;
  content: string;
  position: number;
  isOpen: boolean;
}

/**
 * FileSystem 클래스
 *
 * BASIC 파일 I/O 작업 관리
 */
export class FileSystem {
  private handles: Map<number, FileHandle> = new Map();
  private readonly storage: Storage | null;

  constructor() {
    // 브라우저 환경인지 확인
    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      // Node.js 환경에서는 storage 없음 (메모리만 사용)
      this.storage = null;
    }
  }

  /**
   * OPEN: 파일 열기
   */
  open(mode: FileMode, fileNumber: number, filename: string, recordLength?: number): void {
    // 파일 번호 검증
    if (fileNumber < 1 || fileNumber > 255) {
      throw new BasicError(
        'Bad file number',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    // 이미 열린 파일 번호인지 확인
    if (this.handles.has(fileNumber)) {
      throw new BasicError(
        'File already open',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    // 파일 내용 로드
    let content = '';

    if (mode === 'INPUT' || mode === 'APPEND') {
      // 기존 파일 읽기
      content = this.loadFile(filename) || '';

      if (mode === 'INPUT' && content === '') {
        throw new BasicError(
          'File not found',
          ERROR_CODES.ILLEGAL_FUNCTION_CALL
        );
      }
    }

    // 파일 핸들 생성
    const handle: FileHandle = recordLength !== undefined ? {
      fileNumber,
      filename,
      mode,
      recordLength,
      content,
      position: mode === 'APPEND' ? content.length : 0,
      isOpen: true
    } : {
      fileNumber,
      filename,
      mode,
      content,
      position: mode === 'APPEND' ? content.length : 0,
      isOpen: true
    };

    this.handles.set(fileNumber, handle);
  }

  /**
   * CLOSE: 파일 닫기
   */
  close(fileNumber?: number): void {
    if (fileNumber === undefined) {
      // CLOSE without parameters - close all files
      for (const handle of this.handles.values()) {
        this.closeHandle(handle);
      }
      this.handles.clear();
      return;
    }

    const handle = this.handles.get(fileNumber);
    if (!handle) {
      throw new BasicError(
        'Bad file number',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    this.closeHandle(handle);
    this.handles.delete(fileNumber);
  }

  /**
   * PRINT#: 파일에 데이터 쓰기
   */
  print(fileNumber: number, data: string): void {
    const handle = this.handles.get(fileNumber);

    if (!handle) {
      throw new BasicError(
        'Bad file number',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    if (handle.mode === 'INPUT') {
      throw new BasicError(
        'Input past end of file',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    // 데이터 쓰기
    if (handle.mode === 'OUTPUT') {
      // OUTPUT 모드: 현재 위치에 덮어쓰기
      handle.content = handle.content.substring(0, handle.position) + data;
      handle.position += data.length;
    } else if (handle.mode === 'APPEND') {
      // APPEND 모드: 끝에 추가
      handle.content += data;
      handle.position = handle.content.length;
    } else if (handle.mode === 'RANDOM') {
      // RANDOM 모드: recordLength 단위로 쓰기
      const recordLength = handle.recordLength || 128;
      const recordIndex = Math.floor(handle.position / recordLength);
      const paddedData = data.padEnd(recordLength, ' ').substring(0, recordLength);

      const before = handle.content.substring(0, recordIndex * recordLength);
      const after = handle.content.substring((recordIndex + 1) * recordLength);
      handle.content = before + paddedData + after;

      handle.position = (recordIndex + 1) * recordLength;
    }
  }

  /**
   * INPUT#: 파일에서 데이터 읽기
   */
  input(fileNumber: number): string {
    const handle = this.handles.get(fileNumber);

    if (!handle) {
      throw new BasicError(
        'Bad file number',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    if (handle.mode !== 'INPUT') {
      throw new BasicError(
        'Bad file mode',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    // 파일 끝 체크
    if (handle.position >= handle.content.length) {
      throw new BasicError(
        'Input past end of file',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    // 줄 단위 읽기 (개행 문자까지)
    const newlineIndex = handle.content.indexOf('\n', handle.position);

    let line: string;
    if (newlineIndex === -1) {
      // 마지막 줄
      line = handle.content.substring(handle.position);
      handle.position = handle.content.length;
    } else {
      line = handle.content.substring(handle.position, newlineIndex);
      handle.position = newlineIndex + 1;
    }

    return line;
  }

  /**
   * EOF: 파일 끝 도달 여부
   */
  isEOF(fileNumber: number): boolean {
    const handle = this.handles.get(fileNumber);

    if (!handle) {
      throw new BasicError(
        'Bad file number',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    return handle.position >= handle.content.length;
  }

  /**
   * LOC: 현재 파일 위치
   */
  getPosition(fileNumber: number): number {
    const handle = this.handles.get(fileNumber);

    if (!handle) {
      throw new BasicError(
        'Bad file number',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    return handle.position;
  }

  /**
   * LOF: 파일 크기
   */
  getLength(fileNumber: number): number {
    const handle = this.handles.get(fileNumber);

    if (!handle) {
      throw new BasicError(
        'Bad file number',
        ERROR_CODES.ILLEGAL_FUNCTION_CALL
      );
    }

    return handle.content.length;
  }

  /**
   * 내부 메서드: 파일 핸들 닫기 및 저장
   */
  private closeHandle(handle: FileHandle): void {
    if (!handle.isOpen) return;

    // OUTPUT/APPEND/RANDOM 모드면 파일 저장
    if (handle.mode === 'OUTPUT' || handle.mode === 'APPEND' || handle.mode === 'RANDOM') {
      this.saveFile(handle.filename, handle.content);
    }

    handle.isOpen = false;
  }

  /**
   * 내부 메서드: 파일 로드 (localStorage 또는 메모리)
   */
  private loadFile(filename: string): string | null {
    if (this.storage) {
      const key = `basic_file_${filename}`;
      return this.storage.getItem(key);
    }

    // Node.js 환경에서는 메모리 캐시 사용 (향후 확장 가능)
    return null;
  }

  /**
   * 내부 메서드: 파일 저장 (localStorage 또는 메모리)
   */
  private saveFile(filename: string, content: string): void {
    if (this.storage) {
      const key = `basic_file_${filename}`;
      this.storage.setItem(key, content);
    }

    // Node.js 환경에서는 저장 스킵 (향후 파일 시스템 구현 가능)
  }

  /**
   * 디버그: 열린 파일 목록
   */
  getOpenFiles(): FileHandle[] {
    return Array.from(this.handles.values());
  }

  /**
   * 리셋: 모든 파일 닫기
   */
  reset(): void {
    for (const handle of this.handles.values()) {
      this.closeHandle(handle);
    }
    this.handles.clear();
  }
}
