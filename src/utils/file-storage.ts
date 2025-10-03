/**
 * 파일 저장소 유틸리티
 *
 * localStorage를 활용한 BASIC 프로그램 저장/로드 시스템
 */

import type { Statement } from '../basic/ast.js';

const STORAGE_PREFIX = 'basic_program_';
const FILE_LIST_KEY = 'basic_file_list';

export interface ProgramFile {
  filename: string;
  statements: Statement[];
  savedAt: number;
  size: number;
}

export interface FileMetadata {
  filename: string;
  savedAt: number;
  size: number;
}

/**
 * 파일 저장소 클래스
 */
export class FileStorage {
  private storage: Storage | null = null;

  constructor() {
    // 브라우저 환경에서만 localStorage 사용
    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    }
  }

  /**
   * 프로그램 저장
   */
  save(filename: string, statements: Statement[]): void {
    if (!this.storage) {
      throw new Error('File storage not available (not in browser environment)');
    }

    const programFile: ProgramFile = {
      filename: filename,
      statements: statements,
      savedAt: Date.now(),
      size: JSON.stringify(statements).length
    };

    const key = STORAGE_PREFIX + filename;
    this.storage.setItem(key, JSON.stringify(programFile));

    // 파일 목록 업데이트
    this.updateFileList(filename);
  }

  /**
   * 프로그램 로드
   */
  load(filename: string): Statement[] {
    if (!this.storage) {
      throw new Error('File storage not available (not in browser environment)');
    }

    const key = STORAGE_PREFIX + filename;
    const data = this.storage.getItem(key);

    if (!data) {
      throw new Error(`File not found: ${filename}`);
    }

    try {
      const programFile = JSON.parse(data) as ProgramFile;
      return programFile.statements;
    } catch (error) {
      throw new Error(`Failed to load file: ${filename}`);
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  exists(filename: string): boolean {
    if (!this.storage) {
      return false;
    }

    const key = STORAGE_PREFIX + filename;
    return this.storage.getItem(key) !== null;
  }

  /**
   * 파일 삭제
   */
  delete(filename: string): void {
    if (!this.storage) {
      throw new Error('File storage not available (not in browser environment)');
    }

    const key = STORAGE_PREFIX + filename;
    this.storage.removeItem(key);

    // 파일 목록에서 제거
    this.removeFromFileList(filename);
  }

  /**
   * 저장된 파일 목록 조회
   */
  listFiles(): FileMetadata[] {
    if (!this.storage) {
      return [];
    }

    const fileListData = this.storage.getItem(FILE_LIST_KEY);
    if (!fileListData) {
      return [];
    }

    try {
      return JSON.parse(fileListData) as FileMetadata[];
    } catch (error) {
      return [];
    }
  }

  /**
   * 파일 메타데이터 조회
   */
  getFileInfo(filename: string): FileMetadata | null {
    if (!this.storage) {
      return null;
    }

    const key = STORAGE_PREFIX + filename;
    const data = this.storage.getItem(key);

    if (!data) {
      return null;
    }

    try {
      const programFile = JSON.parse(data) as ProgramFile;
      return {
        filename: programFile.filename,
        savedAt: programFile.savedAt,
        size: programFile.size
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 모든 파일 삭제
   */
  clear(): void {
    if (!this.storage) {
      return;
    }

    const files = this.listFiles();
    for (const file of files) {
      const key = STORAGE_PREFIX + file.filename;
      this.storage.removeItem(key);
    }

    this.storage.removeItem(FILE_LIST_KEY);
  }

  /**
   * 파일 목록 업데이트 (내부 메서드)
   */
  private updateFileList(filename: string): void {
    if (!this.storage) {
      return;
    }

    const files = this.listFiles();
    const existingIndex = files.findIndex(f => f.filename === filename);

    const fileInfo = this.getFileInfo(filename);
    if (!fileInfo) {
      return;
    }

    if (existingIndex >= 0) {
      files[existingIndex] = fileInfo;
    } else {
      files.push(fileInfo);
    }

    this.storage.setItem(FILE_LIST_KEY, JSON.stringify(files));
  }

  /**
   * 파일 목록에서 제거 (내부 메서드)
   */
  private removeFromFileList(filename: string): void {
    if (!this.storage) {
      return;
    }

    const files = this.listFiles();
    const filteredFiles = files.filter(f => f.filename !== filename);
    this.storage.setItem(FILE_LIST_KEY, JSON.stringify(filteredFiles));
  }
}

/**
 * 싱글톤 인스턴스
 */
export const fileStorage = new FileStorage();
