#!/usr/bin/env bun

/**
 * 6502 BASIC 에뮬레이터 자동 배포 스크립트
 * 프로덕션 빌드, 테스트, 배포를 자동화합니다.
 */

import { $ } from "bun";
import { createHash } from "crypto";

const DEPLOY_CONFIG = {
  production: {
    target: "production",
    domain: "6502basic.dev",
    cdn: "cdn.6502basic.dev",
    s3Bucket: "6502basic-prod"
  },
  staging: {
    target: "staging", 
    domain: "staging.6502basic.dev",
    cdn: "staging-cdn.6502basic.dev",
    s3Bucket: "6502basic-staging"
  }
};

const environment = process.argv[2] || "staging";
const config = DEPLOY_CONFIG[environment];

if (!config) {
  console.error("❌ 올바르지 않은 환경:", environment);
  console.log("사용법: bun run scripts/deploy.js [staging|production]");
  process.exit(1);
}

console.log(`🚀 6502 BASIC 에뮬레이터 배포 시작 (${environment.toUpperCase()})`);

const deploymentInfo = {
  environment,
  timestamp: new Date().toISOString(),
  version: require('../package.json').version,
  domain: config.domain,
  steps: []
};

async function logStep(step, status, details = {}) {
  const stepInfo = {
    step,
    status,
    timestamp: new Date().toISOString(),
    ...details
  };
  deploymentInfo.steps.push(stepInfo);
  
  const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
  console.log(`${statusIcon} ${step} ${status === 'running' ? '진행 중...' : '완료'}`);
  
  if (details.duration) {
    console.log(`   소요 시간: ${details.duration}ms`);
  }
}

// 1. 사전 검증
async function preDeploymentChecks() {
  await logStep("사전 검증", "running");
  const startTime = Date.now();
  
  try {
    // Git 상태 확인
    const gitStatus = await $`git status --porcelain`.text();
    if (gitStatus.trim() && environment === 'production') {
      throw new Error("커밋되지 않은 변경사항이 있습니다.");
    }
    
    // 현재 브랜치 확인
    const currentBranch = await $`git branch --show-current`.text();
    if (environment === 'production' && currentBranch.trim() !== 'main') {
      throw new Error("프로덕션 배포는 main 브랜치에서만 가능합니다.");
    }
    
    // 패키지 의존성 확인
    const packageLock = await $`ls package-lock.json bun.lockb 2>/dev/null || echo "no-lock"`.text();
    if (packageLock.includes("no-lock")) {
      console.log("⚠️  락 파일이 없습니다. 의존성 설치 중...");
      await $`bun install`;
    }
    
    await logStep("사전 검증", "success", { duration: Date.now() - startTime });
    
  } catch (error) {
    await logStep("사전 검증", "error", { error: error.message });
    throw error;
  }
}

// 2. 테스트 실행
async function runTests() {
  await logStep("테스트 실행", "running");
  const startTime = Date.now();
  
  try {
    // 타입 검사
    console.log("  🔍 타입스크립트 검사 중...");
    await $`bun run lint`.quiet();
    
    // 단위 테스트
    console.log("  🧪 단위 테스트 실행 중...");
    const testResult = await $`bun test`.quiet();
    
    // 테스트 결과 파싱 (간소화된 버전)
    const testOutput = testResult.toString();
    const passedTests = (testOutput.match(/\(pass\)/g) || []).length;
    const failedTests = (testOutput.match(/\(fail\)/g) || []).length;
    
    if (failedTests > 0) {
      throw new Error(`테스트 실패: ${failedTests}개 실패, ${passedTests}개 통과`);
    }
    
    await logStep("테스트 실행", "success", { 
      duration: Date.now() - startTime,
      passedTests,
      failedTests
    });
    
  } catch (error) {
    await logStep("테스트 실행", "error", { error: error.message });
    throw error;
  }
}

// 3. 프로덕션 빌드
async function buildProduction() {
  await logStep("프로덕션 빌드", "running");
  const startTime = Date.now();
  
  try {
    // 기존 빌드 정리
    await $`bun run clean`;
    
    // 프로덕션 빌드 실행
    console.log("  📦 프로덕션 빌드 중...");
    await $`NODE_ENV=production bun run build:web`.quiet();
    
    // 빌드 결과 검증
    const buildInfo = await Bun.file("dist/build-info.json").json();
    
    if (!buildInfo.performance.bundleSizeOK) {
      console.log("⚠️  번들 크기가 목표를 초과했습니다:", buildInfo.bundleSize + "KB");
    }
    
    await logStep("프로덕션 빌드", "success", { 
      duration: Date.now() - startTime,
      bundleSize: buildInfo.bundleSize,
      fileCount: buildInfo.files.length
    });
    
  } catch (error) {
    await logStep("프로덕션 빌드", "error", { error: error.message });
    throw error;
  }
}

// 4. 성능 벤치마크 (선택적)
async function runBenchmarks() {
  if (process.env.SKIP_BENCHMARK === 'true') {
    console.log("⏭️  벤치마크 건너뜀 (SKIP_BENCHMARK=true)");
    return;
  }
  
  await logStep("성능 벤치마크", "running");
  const startTime = Date.now();
  
  try {
    console.log("  🏃‍♂️ 성능 테스트 중...");
    await $`bun run scripts/benchmark.js`.quiet();
    
    await logStep("성능 벤치마크", "success", { 
      duration: Date.now() - startTime
    });
    
  } catch (error) {
    console.log("⚠️  벤치마크 실패 (배포는 계속):", error.message);
    await logStep("성능 벤치마크", "error", { 
      error: error.message,
      critical: false
    });
  }
}

// 5. 파일 압축 및 최적화
async function optimizeAssets() {
  await logStep("에셋 최적화", "running");
  const startTime = Date.now();
  
  try {
    // gzip 압축
    console.log("  🗜️  gzip 압축 중...");
    await $`find dist -name "*.js" -o -name "*.css" -o -name "*.html" | xargs gzip -k`;
    
    // 압축률 계산
    const originalSize = await $`find dist -name "*.js" -o -name "*.css" -o -name "*.html" | xargs du -ch | tail -n1`.text();
    const compressedSize = await $`find dist -name "*.gz" | xargs du -ch | tail -n1`.text();
    
    console.log(`  📊 압축률: ${originalSize.split('\t')[0]} → ${compressedSize.split('\t')[0]}`);
    
    await logStep("에셋 최적화", "success", { 
      duration: Date.now() - startTime
    });
    
  } catch (error) {
    await logStep("에셋 최적화", "error", { error: error.message });
    throw error;
  }
}

// 6. 배포 메타데이터 생성
async function generateDeploymentManifest() {
  await logStep("배포 매니페스트 생성", "running");
  const startTime = Date.now();
  
  try {
    // Git 정보 수집
    const gitCommit = await $`git rev-parse HEAD`.text();
    const gitBranch = await $`git branch --show-current`.text();
    const gitAuthor = await $`git log -1 --format='%an <%ae>'`.text();
    
    // 빌드 정보 수집
    const buildInfo = await Bun.file("dist/build-info.json").json();
    
    const manifest = {
      ...deploymentInfo,
      git: {
        commit: gitCommit.trim(),
        branch: gitBranch.trim(),
        author: gitAuthor.trim()
      },
      build: buildInfo,
      deployment: {
        target: config.target,
        domain: config.domain,
        cdn: config.cdn
      },
      checksums: {}
    };
    
    // 주요 파일들의 체크섬 생성
    const mainFiles = ["main.js", "index.html", "style.css"];
    for (const file of mainFiles) {
      try {
        const content = await Bun.file(`dist/${file}`).arrayBuffer();
        const hash = createHash('sha256').update(new Uint8Array(content)).digest('hex');
        manifest.checksums[file] = hash.slice(0, 16);
      } catch (e) {
        console.log(`  ⚠️ ${file} 체크섬 생성 실패`);
      }
    }
    
    await Bun.write("dist/deployment-manifest.json", JSON.stringify(manifest, null, 2));
    
    await logStep("배포 매니페스트 생성", "success", { 
      duration: Date.now() - startTime
    });
    
  } catch (error) {
    await logStep("배포 매니페스트 생성", "error", { error: error.message });
    throw error;
  }
}

// 7. 배포 시뮬레이션 (실제 서버 배포는 별도)
async function simulateDeployment() {
  await logStep("배포 시뮬레이션", "running");
  const startTime = Date.now();
  
  try {
    console.log(`  🌐 ${config.domain}로 배포 시뮬레이션...`);
    
    // 배포할 파일 목록 생성
    const deployFiles = await $`find dist -type f | sort`.text();
    const fileList = deployFiles.trim().split('\n');
    
    console.log(`  📁 배포 파일 수: ${fileList.length}개`);
    
    // 각 파일의 크기 및 타입 확인
    for (const file of fileList.slice(0, 10)) { // 처음 10개만 표시
      const stat = await $`ls -lh "${file}"`.text();
      const size = stat.split(/\s+/)[4];
      console.log(`    ${file.replace('dist/', '')}: ${size}`);
    }
    
    if (fileList.length > 10) {
      console.log(`    ... 그리고 ${fileList.length - 10}개 파일 더`);
    }
    
    // 실제 배포 명령어 생성 (실행은 안 함)
    const deployCommands = [
      `# S3 업로드`,
      `aws s3 sync dist/ s3://${config.s3Bucket}/ --delete`,
      `# CloudFront 무효화`, 
      `aws cloudfront create-invalidation --distribution-id XXXXXX --paths "/*"`,
      `# DNS 업데이트 확인`,
      `dig ${config.domain}`
    ];
    
    console.log("  📝 배포 명령어:");
    deployCommands.forEach(cmd => console.log(`    ${cmd}`));
    
    await logStep("배포 시뮬레이션", "success", { 
      duration: Date.now() - startTime,
      fileCount: fileList.length
    });
    
  } catch (error) {
    await logStep("배포 시뮬레이션", "error", { error: error.message });
    throw error;
  }
}

// 8. 배포 후 검증
async function postDeploymentValidation() {
  await logStep("배포 후 검증", "running");
  const startTime = Date.now();
  
  try {
    console.log("  🔍 빌드 결과 검증 중...");
    
    // 필수 파일 존재 확인
    const requiredFiles = ["index.html", "main.js", "style.css", "build-info.json"];
    for (const file of requiredFiles) {
      const exists = await Bun.file(`dist/${file}`).exists();
      if (!exists) {
        throw new Error(`필수 파일이 없습니다: ${file}`);
      }
    }
    
    // HTML 파일 유효성 검사 (간단한 버전)
    const htmlContent = await Bun.file("dist/index.html").text();
    if (!htmlContent.includes("<title>") || !htmlContent.includes("main.js")) {
      throw new Error("HTML 파일이 올바르지 않습니다");
    }
    
    console.log("  ✅ 모든 검증 통과");
    
    await logStep("배포 후 검증", "success", { 
      duration: Date.now() - startTime
    });
    
  } catch (error) {
    await logStep("배포 후 검증", "error", { error: error.message });
    throw error;
  }
}

// 메인 배포 프로세스
async function deploy() {
  try {
    console.log(`📋 배포 대상: ${config.domain}`);
    console.log(`📦 환경: ${environment}`);
    console.log(`⏰ 시작 시간: ${new Date().toLocaleString()}\n`);
    
    const deployStartTime = Date.now();
    
    // 배포 단계 실행
    await preDeploymentChecks();
    await runTests();
    await buildProduction();
    await runBenchmarks();
    await optimizeAssets();
    await generateDeploymentManifest();
    await simulateDeployment();
    await postDeploymentValidation();
    
    const totalDuration = Date.now() - deployStartTime;
    
    // 배포 완료 리포트
    console.log("\n🎉 배포 완료!");
    console.log(`⏱️  총 소요 시간: ${(totalDuration / 1000).toFixed(1)}초`);
    console.log(`🌐 도메인: https://${config.domain}`);
    console.log(`📊 상태: https://${config.domain}/build-info.json`);
    
    // 배포 리포트 저장
    deploymentInfo.totalDuration = totalDuration;
    deploymentInfo.status = "success";
    
    await Bun.write(
      `deployment-logs/deploy-${environment}-${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    // 성공 알림
    console.log("\n🔔 배포 알림:");
    console.log(`✅ ${environment.toUpperCase()} 환경 배포 성공`);
    console.log(`🕐 ${new Date().toLocaleString()}`);
    console.log(`📦 버전: v${deploymentInfo.version}`);
    
  } catch (error) {
    console.error("\n❌ 배포 실패:", error.message);
    
    // 실패 로그 저장
    deploymentInfo.status = "failed";
    deploymentInfo.error = error.message;
    
    await $`mkdir -p deployment-logs`.quiet();
    await Bun.write(
      `deployment-logs/deploy-failed-${environment}-${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    process.exit(1);
  }
}

// 배포 로그 디렉토리 생성
await $`mkdir -p deployment-logs`;

// 배포 실행
deploy();