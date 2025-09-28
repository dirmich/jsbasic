#!/usr/bin/env bun

// 테스트 디버깅 스크립트
import { BasicEmulator, EmulatorState } from './src/system/emulator.js';

async function testEmulator() {
  const emulator = new BasicEmulator();
  const terminal = emulator.getTerminal();

  emulator.start();

  // NEW 명령 테스트
  console.log('\n=== NEW 명령 테스트 ===');
  await terminal.emit('command', 'NEW');

  let history = terminal.getHistory();
  console.log('History after NEW:', history.map(h => h.content));

  // 프로그램 입력 및 RUN 테스트
  console.log('\n=== 프로그램 입력 및 RUN 테스트 ===');
  await terminal.emit('command', '10 PRINT "TEST"');
  await terminal.emit('command', '20 END');

  history = terminal.getHistory();
  console.log('History after program input:', history.map(h => h.content));

  await terminal.emit('command', 'RUN');

  // 약간의 대기 시간
  await new Promise(resolve => setTimeout(resolve, 100));

  history = terminal.getHistory();
  console.log('History after RUN:', history.map(h => h.content));

  // SAVE 테스트
  console.log('\n=== SAVE 테스트 ===');

  // localStorage 모킹
  global.localStorage = {
    setItem: (key, value) => {
      console.log(`localStorage.setItem called: ${key}`);
    },
    getItem: (key) => null,
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
  };

  await terminal.emit('command', 'SAVE "test"');

  history = terminal.getHistory();
  console.log('History after SAVE:', history.map(h => h.content));

  emulator.stop();
}

testEmulator().catch(console.error);