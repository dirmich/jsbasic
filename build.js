#!/usr/bin/env bun

/**
 * 6502 BASIC 에뮬레이터 빌드 스크립트
 * Bun 번들러를 사용하여 TypeScript 모듈들을 웹용으로 번들링합니다.
 */

import { $ } from "bun";

const BUILD_DIR = "dist";
const PUBLIC_DIR = "public";

console.log("🚀 6502 BASIC 에뮬레이터 빌드 시작...");

try {
  // 빌드 디렉토리 정리
  console.log("📁 빌드 디렉토리 정리 중...");
  await $`rm -rf ${BUILD_DIR}`;
  await $`mkdir -p ${BUILD_DIR}`;

  // 정적 파일 복사
  console.log("📋 정적 파일 복사 중...");
  await $`cp ${PUBLIC_DIR}/index.html ${BUILD_DIR}/`;
  await $`cp ${PUBLIC_DIR}/style.css ${BUILD_DIR}/`;

  // TypeScript 에뮬레이터 번들링
  console.log("📦 에뮬레이터 모듈 번들링 중...");
  
  const buildResult = await Bun.build({
    entrypoints: ["./src/web/main.ts"], // 웹용 엔트리포인트
    outdir: BUILD_DIR,
    format: "esm",
    target: "browser",
    minify: process.env.NODE_ENV === "production",
    sourcemap: "external",
    external: [], // 모든 의존성 포함
  });

  if (!buildResult.success) {
    console.error("❌ 빌드 실패:", buildResult.logs);
    process.exit(1);
  }

  console.log("✅ 빌드 완료!");
  console.log(`📂 빌드 결과: ${BUILD_DIR}/`);
  
  // 빌드 결과 요약
  const stats = await $`ls -la ${BUILD_DIR}`.text();
  console.log("\n📊 빌드 결과:");
  console.log(stats);

} catch (error) {
  console.error("❌ 빌드 중 오류 발생:", error);
  process.exit(1);
}