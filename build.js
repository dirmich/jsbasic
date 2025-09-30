#!/usr/bin/env bun

/**
 * 6502 BASIC 에뮬레이터 프로덕션 빌드 스크립트
 * Bun 번들러를 사용하여 TypeScript 모듈들을 웹용으로 번들링하고 최적화합니다.
 */

import { $ } from "bun";
import { createHash } from "crypto";

const BUILD_DIR = "dist";
const PUBLIC_DIR = "public";
const ASSETS_DIR = "assets";
const EXAMPLES_DIR = "examples";

const isProduction = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV === "development";

console.log(`🚀 6502 BASIC 에뮬레이터 빌드 시작... (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);

try {
  // 빌드 디렉토리 정리
  console.log("📁 빌드 디렉토리 정리 중...");
  await $`rm -rf ${BUILD_DIR}`;
  await $`mkdir -p ${BUILD_DIR}`;
  await $`mkdir -p ${BUILD_DIR}/examples`;
  await $`mkdir -p ${BUILD_DIR}/docs`;

  // 정적 파일 복사
  console.log("📋 정적 파일 복사 중...");
  await $`cp ${PUBLIC_DIR}/index.html ${BUILD_DIR}/`;
  await $`cp ${PUBLIC_DIR}/style.css ${BUILD_DIR}/`;
  await $`cp ${PUBLIC_DIR}/app.js ${BUILD_DIR}/`;
  
  // 에셋 파일 복사 (있는 경우)
  try {
    await $`cp -r ${ASSETS_DIR}/* ${BUILD_DIR}/`;
    console.log("📄 에셋 파일 복사 완료");
  } catch (e) {
    console.log("📄 에셋 파일 없음 (선택사항)");
  }

  // 예제 프로그램 복사
  console.log("🎮 예제 프로그램 복사 중...");
  await $`cp -r ${EXAMPLES_DIR}/* ${BUILD_DIR}/examples/`;
  
  // 문서 복사
  console.log("📚 문서 복사 중...");
  await $`cp docs/*.md ${BUILD_DIR}/docs/`;
  await $`cp README.md ${BUILD_DIR}/`;

  // TypeScript 에뮬레이터 번들링
  console.log("📦 에뮬레이터 모듈 번들링 중...");
  
  const buildConfig = {
    entrypoints: ["./src/web/main.ts"], // 웹용 엔트리포인트
    outdir: BUILD_DIR,
    format: "esm",
    target: "browser",
    minify: isProduction,
    sourcemap: isProduction ? "none" : "external",
    splitting: true, // 코드 분할 활성화
    external: [], // 모든 의존성 포함
    
    // 최적화 옵션
    define: {
      "process.env.NODE_ENV": isProduction ? '"production"' : '"development"',
      "DEBUG": isProduction ? "false" : "true",
      "__VERSION__": `"${require('./package.json').version}"`,
      "__BUILD_TIME__": `"${new Date().toISOString()}"`
    },
    
    // 프로덕션 최적화
    ...(isProduction && {
      drop: ["console", "debugger"], // 프로덕션에서 console.log 제거
      loader: {
        ".png": "dataurl",
        ".jpg": "dataurl", 
        ".gif": "dataurl",
        ".svg": "text"
      }
    })
  };
  
  const buildResult = await Bun.build(buildConfig);

  if (!buildResult.success) {
    console.error("❌ 빌드 실패:", buildResult.logs);
    process.exit(1);
  }
  
  // 번들 크기 분석 및 최적화 보고서
  const bundleFiles = buildResult.outputs;
  let totalSize = 0;
  const bundleAnalysis = [];
  
  console.log("\n📊 번들 분석:");
  for (const output of bundleFiles) {
    const file = Bun.file(output.path);
    const sizeBytes = file.size;  // size는 속성, 함수가 아님
    const sizeKB = sizeBytes / 1024;
    totalSize += sizeKB;
    
    const fileName = output.path.split('/').pop();
    bundleAnalysis.push({
      file: fileName,
      size: sizeKB,
      compressed: sizeBytes
    });
    
    console.log(`  ${fileName}: ${sizeKB.toFixed(1)}KB`);
  }
  console.log(`  총 크기: ${totalSize.toFixed(1)}KB`);

  // 성능 목표 체크
  const performanceCheck = {
    bundleSizeOK: totalSize < 500, // 500KB 미만
    fileCountOK: bundleFiles.length <= 10, // 파일 개수 제한
    mainBundleOK: bundleAnalysis.find(b => b.file.includes('main'))?.size < 200
  };
  
  console.log("\n🎯 성능 목표 달성도:");
  console.log(`  번들 크기 (< 500KB): ${performanceCheck.bundleSizeOK ? '✅' : '❌'} ${totalSize.toFixed(1)}KB`);
  console.log(`  파일 개수 (≤ 10개): ${performanceCheck.fileCountOK ? '✅' : '❌'} ${bundleFiles.length}개`);
  console.log(`  메인 번들 (< 200KB): ${performanceCheck.mainBundleOK ? '✅' : '❌'}`);

  // 빌드 메타데이터 생성
  const buildMetadata = {
    version: require('./package.json').version,
    buildTime: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    bundleSize: totalSize,
    files: bundleAnalysis,
    performance: performanceCheck
  };

  await Bun.write(`${BUILD_DIR}/build-info.json`, JSON.stringify(buildMetadata, null, 2));

  // 파일 해시 생성 (캐싱을 위한)
  if (isProduction) {
    console.log("\n🔒 파일 해시 생성 중...");
    for (const output of bundleFiles) {
      const content = await Bun.file(output.path).arrayBuffer();
      const hash = createHash('sha256').update(new Uint8Array(content)).digest('hex').slice(0, 8);
      const fileName = output.path.split('/').pop();
      console.log(`  ${fileName}: ${hash}`);
    }
  }

  console.log("✅ 빌드 완료!");
  console.log(`📂 빌드 결과: ${BUILD_DIR}/`);
  
  // 빌드 결과 요약
  const stats = await $`ls -la ${BUILD_DIR}`.text();
  console.log("\n📊 빌드 결과:");
  console.log(stats);
  
  // 압축 추천
  if (isProduction && totalSize > 100) {
    console.log("\n💡 배포 최적화 팁:");
    console.log("  - gzip 압축으로 ~70% 크기 감소 가능");
    console.log("  - Brotli 압축으로 ~75% 크기 감소 가능");
    console.log("  - CDN 캐싱으로 로딩 시간 단축 가능");
  }

} catch (error) {
  console.error("❌ 빌드 중 오류 발생:", error);
  process.exit(1);
}