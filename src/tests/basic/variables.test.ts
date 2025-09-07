/**
 * 변수 관리 시스템 테스트
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { VariableManager } from '../../basic/variables.js';
import { BasicError, ERROR_CODES } from '../../utils/errors.js';

describe('변수 관리 시스템', () => {
  let varManager: VariableManager;

  beforeEach(() => {
    varManager = new VariableManager();
  });

  describe('변수 타입 추론', () => {
    test('문자열 변수 타입 추론', () => {
      expect(varManager.inferVariableType('NAME$')).toBe('string');
      expect(varManager.inferVariableType('MESSAGE$')).toBe('string');
    });

    test('정수 변수 타입 추론', () => {
      expect(varManager.inferVariableType('COUNT%')).toBe('integer');
      expect(varManager.inferVariableType('INDEX%')).toBe('integer');
    });

    test('숫자 변수 타입 추론', () => {
      expect(varManager.inferVariableType('X')).toBe('numeric');
      expect(varManager.inferVariableType('VALUE')).toBe('numeric');
      expect(varManager.inferVariableType('PI')).toBe('numeric');
    });
  });

  describe('스칼라 변수 관리', () => {
    test('숫자 변수 설정 및 가져오기', () => {
      varManager.setVariable('X', 42);
      expect(varManager.getVariable('X')).toBe(42);
      expect(varManager.hasVariable('X')).toBe(true);
    });

    test('문자열 변수 설정 및 가져오기', () => {
      varManager.setVariable('NAME$', 'JOHN');
      expect(varManager.getVariable('NAME$')).toBe('JOHN');
      expect(varManager.hasVariable('NAME$')).toBe(true);
    });

    test('정수 변수 설정 및 가져오기', () => {
      varManager.setVariable('COUNT%', 10.7);
      expect(varManager.getVariable('COUNT%')).toBe(10); // 소수점 버림
    });

    test('변수명 대소문자 구분 안 함', () => {
      varManager.setVariable('x', 100);
      expect(varManager.getVariable('X')).toBe(100);
      expect(varManager.getVariable('x')).toBe(100);
    });

    test('초기화되지 않은 변수는 기본값 반환', () => {
      expect(varManager.getVariable('UNDEFINED_NUM')).toBe(0);
      expect(varManager.getVariable('UNDEFINED_STR$')).toBe('');
      expect(varManager.getVariable('UNDEFINED_INT%')).toBe(0);
    });

    test('타입 불일치 에러', () => {
      expect(() => {
        varManager.setVariable('NAME$', 42);
      }).toThrow(BasicError);

      expect(() => {
        varManager.setVariable('COUNT', 'HELLO');
      }).toThrow(BasicError);
    });
  });

  describe('배열 변수 관리', () => {
    test('1차원 배열 선언 및 사용', () => {
      varManager.declareArray('ARR', [10]);
      
      varManager.setArrayElement('ARR', [5], 42);
      expect(varManager.getArrayElement('ARR', [5])).toBe(42);
      
      // 기본값 확인
      expect(varManager.getArrayElement('ARR', [0])).toBe(0);
      expect(varManager.getArrayElement('ARR', [10])).toBe(0);
    });

    test('2차원 배열 선언 및 사용', () => {
      varManager.declareArray('MATRIX', [3, 4]);
      
      varManager.setArrayElement('MATRIX', [1, 2], 99);
      expect(varManager.getArrayElement('MATRIX', [1, 2])).toBe(99);
      
      // 다른 요소는 기본값
      expect(varManager.getArrayElement('MATRIX', [0, 0])).toBe(0);
      expect(varManager.getArrayElement('MATRIX', [3, 4])).toBe(0);
    });

    test('문자열 배열', () => {
      varManager.declareArray('NAMES$', [5]);
      
      varManager.setArrayElement('NAMES$', [0], 'JOHN');
      varManager.setArrayElement('NAMES$', [1], 'JANE');
      
      expect(varManager.getArrayElement('NAMES$', [0])).toBe('JOHN');
      expect(varManager.getArrayElement('NAMES$', [1])).toBe('JANE');
      expect(varManager.getArrayElement('NAMES$', [2])).toBe(''); // 기본값
    });

    test('배열 인덱스 범위 검사', () => {
      varManager.declareArray('ARR', [10]);
      
      expect(() => {
        varManager.getArrayElement('ARR', [11]);
      }).toThrow(BasicError);

      expect(() => {
        varManager.setArrayElement('ARR', [-1], 42);
      }).toThrow(BasicError);
    });

    test('배열 차원 수 검사', () => {
      varManager.declareArray('ARR', [10]);
      
      expect(() => {
        varManager.getArrayElement('ARR', [1, 2]);
      }).toThrow(BasicError);

      expect(() => {
        varManager.setArrayElement('ARR', []);
      }).toThrow(BasicError);
    });

    test('정의되지 않은 배열 접근', () => {
      expect(() => {
        varManager.getArrayElement('UNDEFINED', [0]);
      }).toThrow(BasicError);
    });

    test('스칼라 변수를 배열로 접근', () => {
      varManager.setVariable('X', 42);
      
      expect(() => {
        varManager.getArrayElement('X', [0]);
      }).toThrow(BasicError);
    });

    test('배열 변수를 스칼라로 접근', () => {
      varManager.declareArray('ARR', [10]);
      
      expect(() => {
        varManager.getVariable('ARR');
      }).toThrow(BasicError);
    });

    test('이미 선언된 변수 중복 선언', () => {
      varManager.setVariable('X', 42);
      
      expect(() => {
        varManager.declareArray('X', [10]);
      }).toThrow(BasicError);
    });
  });

  describe('변수 관리 기능', () => {
    test('변수 정보 가져오기', () => {
      varManager.setVariable('X', 42);
      varManager.declareArray('ARR$', [5]);
      
      const scalarInfo = varManager.getVariableInfo('X');
      expect(scalarInfo?.name).toBe('X');
      expect(scalarInfo?.type).toBe('numeric');
      expect(scalarInfo?.isArray).toBe(false);
      expect(scalarInfo?.value).toBe(42);
      
      const arrayInfo = varManager.getVariableInfo('ARR$');
      expect(arrayInfo?.name).toBe('ARR$');
      expect(arrayInfo?.type).toBe('string');
      expect(arrayInfo?.isArray).toBe(true);
      expect(arrayInfo?.array?.dimensions).toEqual([6]); // 5 + 1
    });

    test('모든 변수 목록 가져오기', () => {
      varManager.setVariable('X', 10);
      varManager.setVariable('Y$', 'HELLO');
      varManager.declareArray('ARR%', [3]);
      
      const allVars = varManager.getAllVariables();
      expect(allVars).toHaveLength(3);
      
      const names = allVars.map(v => v.name);
      expect(names).toContain('X');
      expect(names).toContain('Y$');
      expect(names).toContain('ARR%');
    });

    test('변수 삭제', () => {
      varManager.setVariable('X', 42);
      expect(varManager.hasVariable('X')).toBe(true);
      
      expect(varManager.deleteVariable('X')).toBe(true);
      expect(varManager.hasVariable('X')).toBe(false);
      
      expect(varManager.deleteVariable('NONEXISTENT')).toBe(false);
    });

    test('모든 변수 초기화', () => {
      varManager.setVariable('X', 10);
      varManager.setVariable('Y$', 'HELLO');
      varManager.declareArray('ARR', [5]);
      
      expect(varManager.size()).toBe(3);
      
      varManager.clear();
      expect(varManager.size()).toBe(0);
      expect(varManager.hasVariable('X')).toBe(false);
    });

    test('변수 개수', () => {
      expect(varManager.size()).toBe(0);
      
      varManager.setVariable('X', 1);
      expect(varManager.size()).toBe(1);
      
      varManager.setVariable('Y', 2);
      expect(varManager.size()).toBe(2);
      
      varManager.declareArray('ARR', [10]);
      expect(varManager.size()).toBe(3);
    });
  });

  describe('복잡한 배열 테스트', () => {
    test('3차원 배열', () => {
      varManager.declareArray('CUBE', [2, 3, 4]);
      
      varManager.setArrayElement('CUBE', [1, 2, 3], 123);
      expect(varManager.getArrayElement('CUBE', [1, 2, 3])).toBe(123);
      
      // 유효한 최대 인덱스
      expect(varManager.getArrayElement('CUBE', [2, 3, 4])).toBe(0);
      
      // 인덱스 범위 초과 확인
      expect(() => {
        varManager.getArrayElement('CUBE', [3, 3, 4]);
      }).toThrow(BasicError);
    });

    test('큰 배열', () => {
      varManager.declareArray('BIG', [100, 100]);
      
      varManager.setArrayElement('BIG', [50, 75], 9999);
      expect(varManager.getArrayElement('BIG', [50, 75])).toBe(9999);
      
      // 기본값 확인
      expect(varManager.getArrayElement('BIG', [0, 0])).toBe(0);
      expect(varManager.getArrayElement('BIG', [99, 99])).toBe(0);
    });
  });

  describe('에러 상황', () => {
    test('잘못된 배열 차원', () => {
      expect(() => {
        varManager.declareArray('INVALID', []);
      }).toThrow(BasicError);

      expect(() => {
        varManager.declareArray('NEGATIVE', [-1]);
      }).toThrow(BasicError);
    });

    test('배열 타입 불일치', () => {
      varManager.declareArray('NUMS', [10]);
      varManager.declareArray('STRS$', [10]);
      
      expect(() => {
        varManager.setArrayElement('NUMS', [0], 'HELLO');
      }).toThrow(BasicError);

      expect(() => {
        varManager.setArrayElement('STRS$', [0], 42);
      }).toThrow(BasicError);
    });
  });

  describe('메모리 및 디버깅', () => {
    test('메모리 사용량 계산', () => {
      const initialUsage = varManager.getMemoryUsage();
      
      varManager.setVariable('X', 42);
      varManager.declareArray('ARR', [100]);
      
      const finalUsage = varManager.getMemoryUsage();
      expect(finalUsage).toBeGreaterThan(initialUsage);
    });

    test('변수 덤프', () => {
      varManager.setVariable('X', 42);
      varManager.setVariable('NAME$', 'TEST');
      varManager.declareArray('ARR', [5]);
      
      const dump = varManager.dump();
      expect(dump).toContain('X (numeric): 42');
      expect(dump).toContain('NAME$ (string): TEST');
      expect(dump).toContain('ARR (numeric[]): dimensions=[6]');
    });
  });
});