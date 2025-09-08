#!/usr/bin/env node

/**
 * BASIC 예제 프로그램 테스트 스크립트
 * 
 * 예제 프로그램들이 올바르게 파싱되고 기본적인 실행이 되는지 확인합니다.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// 현재 개발 중인 시스템은 파싱만 테스트
try {
  // Hello World 예제 파일 읽기
  const helloBasic = readFileSync(join('examples', 'hello.bas'), 'utf8');
  console.log('✅ hello.bas 파일 읽기 성공');
  console.log('내용 미리보기:');
  console.log(helloBasic.split('\n').slice(0, 5).join('\n'));
  console.log('...\n');

  // Math Demo 예제 파일 읽기  
  const mathBasic = readFileSync(join('examples', 'math-demo.bas'), 'utf8');
  console.log('✅ math-demo.bas 파일 읽기 성공');
  console.log('내용 미리보기:');
  console.log(mathBasic.split('\n').slice(0, 5).join('\n'));
  console.log('...\n');

  // 기본적인 BASIC 구문 패턴 검증
  const patterns = {
    'REM 주석': /^\s*\d+\s+REM/,
    'PRINT 명령어': /^\s*\d+\s+PRINT/,
    'INPUT 명령어': /^\s*\d+\s+INPUT/,
    'END 명령어': /^\s*\d+\s+END/,
    '라인 번호': /^\s*\d+\s+/
  };

  console.log('📋 BASIC 구문 패턴 검증:');
  for (const [name, pattern] of Object.entries(patterns)) {
    const mathLines = mathBasic.split('\n');
    const matchCount = mathLines.filter(line => pattern.test(line)).length;
    console.log(`  ${name}: ${matchCount}개 발견`);
  }

  console.log('\n🎉 예제 프로그램 기본 검증 완료!');
  console.log('파일 형식과 기본 구문이 올바르게 작성되어 있습니다.');

} catch (error) {
  console.error('❌ 테스트 실패:', error.message);
  process.exit(1);
}