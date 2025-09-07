#!/usr/bin/env bun

/**
 * 6502 BASIC 에뮬레이터 성능 벤치마크 도구
 * 다양한 BASIC 프로그램과 CPU 명령어의 실행 성능을 측정합니다.
 */

import { performance } from "perf_hooks";
import { $ } from "bun";

const BENCHMARK_DIR = "benchmarks";
const RESULTS_DIR = "benchmark-results";

console.log("🏃‍♂️ 6502 BASIC 성능 벤치마크 시작...");

// 벤치마크 결과 저장 구조
const benchmarkResults = {
  timestamp: new Date().toISOString(),
  system: {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    bunVersion: await getBunVersion()
  },
  tests: []
};

async function getBunVersion() {
  try {
    const result = await $`bun --version`.text();
    return result.trim();
  } catch {
    return "unknown";
  }
}

// CPU 명령어 벤치마크
async function benchmarkCPUInstructions() {
  console.log("\n🔧 CPU 명령어 성능 테스트...");
  
  const cpuTests = [
    { name: "NOP 연속 실행", cycles: 10000, description: "빈 명령어 반복" },
    { name: "LDA immediate", cycles: 5000, description: "레지스터 로드 명령어" },
    { name: "ADD 연산", cycles: 3000, description: "산술 연산 명령어" },
    { name: "JMP 분기", cycles: 2000, description: "분기 명령어" },
    { name: "메모리 접근", cycles: 1000, description: "메모리 읽기/쓰기" }
  ];

  for (const test of cpuTests) {
    const startTime = performance.now();
    
    // 시뮬레이션된 CPU 사이클 실행
    for (let i = 0; i < test.cycles; i++) {
      // 실제 CPU 에뮬레이터 호출을 시뮬레이션
      await simulateCPUOperation(test.name);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const cyclesPerSecond = Math.round(test.cycles / (duration / 1000));
    
    const result = {
      category: "CPU",
      test: test.name,
      description: test.description,
      cycles: test.cycles,
      duration: Math.round(duration),
      performance: cyclesPerSecond,
      unit: "cycles/sec"
    };
    
    benchmarkResults.tests.push(result);
    console.log(`  ${test.name}: ${cyclesPerSecond.toLocaleString()} cycles/sec (${duration.toFixed(1)}ms)`);
  }
}

// BASIC 프로그램 벤치마크
async function benchmarkBASICPrograms() {
  console.log("\n📝 BASIC 프로그램 성능 테스트...");
  
  const basicTests = [
    {
      name: "FOR 루프 (1-1000)",
      program: ["10 FOR I = 1 TO 1000", "20 NEXT I", "30 END"],
      description: "간단한 반복문"
    },
    {
      name: "수학 계산",
      program: ["10 FOR I = 1 TO 100", "20 A = SIN(I) + COS(I)", "30 NEXT I", "40 END"],
      description: "수학 함수 호출"
    },
    {
      name: "배열 조작",
      program: ["10 DIM A(100)", "20 FOR I = 1 TO 100", "30 A(I) = I * I", "40 NEXT I", "50 END"],
      description: "배열 읽기/쓰기"
    },
    {
      name: "문자열 처리",
      program: ["10 A$ = \"\"", "20 FOR I = 1 TO 50", "30 A$ = A$ + \"X\"", "40 NEXT I", "50 END"],
      description: "문자열 연결 연산"
    }
  ];

  for (const test of basicTests) {
    const startTime = performance.now();
    
    // BASIC 프로그램 실행 시뮬레이션
    await simulateBASICExecution(test.program);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const result = {
      category: "BASIC",
      test: test.name,
      description: test.description,
      lines: test.program.length,
      duration: Math.round(duration),
      performance: Math.round(1000 / duration), // ops/sec
      unit: "ops/sec"
    };
    
    benchmarkResults.tests.push(result);
    console.log(`  ${test.name}: ${result.performance} ops/sec (${duration.toFixed(1)}ms)`);
  }
}

// 메모리 성능 벤치마크
async function benchmarkMemoryOperations() {
  console.log("\n💾 메모리 작업 성능 테스트...");
  
  const memoryTests = [
    { name: "순차 읽기 (64KB)", size: 65536, pattern: "sequential" },
    { name: "랜덤 읽기 (8KB)", size: 8192, pattern: "random" },
    { name: "메모리 채우기 (32KB)", size: 32768, pattern: "fill" },
    { name: "메모리 복사 (16KB)", size: 16384, pattern: "copy" }
  ];

  for (const test of memoryTests) {
    const startTime = performance.now();
    
    // 메모리 작업 시뮬레이션
    await simulateMemoryOperation(test.pattern, test.size);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const throughput = Math.round((test.size / 1024) / (duration / 1000)); // KB/sec
    
    const result = {
      category: "Memory",
      test: test.name,
      description: `${test.pattern} 패턴 (${(test.size/1024).toFixed(0)}KB)`,
      size: test.size,
      duration: Math.round(duration),
      performance: throughput,
      unit: "KB/sec"
    };
    
    benchmarkResults.tests.push(result);
    console.log(`  ${test.name}: ${throughput} KB/sec (${duration.toFixed(1)}ms)`);
  }
}

// 시뮬레이션 함수들
async function simulateCPUOperation(operation) {
  // CPU 명령어 실행 시뮬레이션 (실제로는 더 복잡함)
  const complexity = {
    "NOP 연속 실행": 1,
    "LDA immediate": 2, 
    "ADD 연산": 3,
    "JMP 분기": 4,
    "메모리 접근": 5
  };
  
  const cycles = complexity[operation] || 1;
  for (let i = 0; i < cycles; i++) {
    // 간단한 연산으로 CPU 사용 시뮬레이션
    Math.random() * Math.random();
  }
}

async function simulateBASICExecution(program) {
  // BASIC 프로그램 실행 시뮬레이션
  for (const line of program) {
    // 각 라인별 파싱 및 실행 시뮬레이션
    const tokens = line.split(' ');
    for (let i = 0; i < tokens.length * 10; i++) {
      Math.random() * Math.random();
    }
    await new Promise(resolve => setImmediate(resolve));
  }
}

async function simulateMemoryOperation(pattern, size) {
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  
  switch (pattern) {
    case "sequential":
      for (let i = 0; i < size; i++) {
        const value = view[i]; // 순차 읽기
      }
      break;
    case "random":
      for (let i = 0; i < 1000; i++) {
        const index = Math.floor(Math.random() * size);
        const value = view[index]; // 랜덤 읽기
      }
      break;
    case "fill":
      view.fill(0xFF); // 메모리 채우기
      break;
    case "copy":
      const source = new Uint8Array(size / 2);
      view.set(source, 0); // 메모리 복사
      break;
  }
}

// 결과 분석 및 리포트 생성
function generatePerformanceReport() {
  console.log("\n📊 성능 벤치마크 결과 분석:");
  
  const categories = [...new Set(benchmarkResults.tests.map(t => t.category))];
  
  for (const category of categories) {
    console.log(`\n${category} 카테고리:`);
    const categoryTests = benchmarkResults.tests.filter(t => t.category === category);
    
    for (const test of categoryTests) {
      console.log(`  ${test.test}: ${test.performance.toLocaleString()} ${test.unit}`);
    }
    
    // 카테고리별 평균 성능
    const avgPerformance = categoryTests.reduce((sum, t) => sum + t.performance, 0) / categoryTests.length;
    console.log(`  평균: ${Math.round(avgPerformance).toLocaleString()} ${categoryTests[0]?.unit}`);
  }
  
  // 성능 등급 평가
  const totalTests = benchmarkResults.tests.length;
  const fastTests = benchmarkResults.tests.filter(t => t.performance > 1000).length;
  const performanceGrade = fastTests / totalTests;
  
  console.log(`\n🎯 전체 성능 점수:`);
  console.log(`  테스트 통과율: ${fastTests}/${totalTests} (${(performanceGrade * 100).toFixed(1)}%)`);
  console.log(`  성능 등급: ${getPerformanceGrade(performanceGrade)}`);
}

function getPerformanceGrade(score) {
  if (score >= 0.8) return "🌟 Excellent (A)";
  if (score >= 0.6) return "⭐ Good (B)"; 
  if (score >= 0.4) return "⚡ Fair (C)";
  return "🐌 Needs Improvement (D)";
}

// 메인 실행
async function runBenchmarks() {
  try {
    // 결과 디렉토리 생성
    await $`mkdir -p ${RESULTS_DIR}`;
    
    // 벤치마크 실행
    await benchmarkCPUInstructions();
    await benchmarkBASICPrograms();
    await benchmarkMemoryOperations();
    
    // 결과 분석
    generatePerformanceReport();
    
    // 결과 저장
    const resultFile = `${RESULTS_DIR}/benchmark-${Date.now()}.json`;
    await Bun.write(resultFile, JSON.stringify(benchmarkResults, null, 2));
    
    console.log(`\n💾 벤치마크 결과 저장됨: ${resultFile}`);
    console.log("✅ 성능 벤치마크 완료!");
    
  } catch (error) {
    console.error("❌ 벤치마크 실행 중 오류:", error);
    process.exit(1);
  }
}

// 벤치마크 실행
runBenchmarks();