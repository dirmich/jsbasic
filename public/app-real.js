/**
 * 6502 BASIC 에뮬레이터 웹 인터페이스 (실제 에뮬레이터 연동)
 */

import { WebEmulator } from './main.js';

// 글로벌 변수
let webEmulator = null;
let isRunning = false;
let commandHistory = [];
let historyIndex = -1;

/**
 * 애플리케이션 초기화
 */
async function initializeApp() {
    try {
        console.log('6502 BASIC 에뮬레이터 초기화 중...');
        
        // 웹 에뮬레이터 생성
        webEmulator = new WebEmulator(
            {
                containerId: 'terminal',
                autoFocus: true,
                enablePersistence: true,
                theme: 'dark'
            },
            {
                onOutput: (text, type) => {
                    console.log(`[${type}] ${text}`);
                },
                onStateChange: (state) => {
                    console.log(`State changed: ${state}`);
                    updatePowerButton(state !== 'STOPPED');
                },
                onCommand: (command) => {
                    addToHistory(command);
                }
            }
        );
        
        // 이벤트 핸들러 설정
        setupUIEventHandlers();
        
        console.log('✅ 6502 BASIC 에뮬레이터가 준비되었습니다.');
        
    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        showError('에뮬레이터 초기화에 실패했습니다: ' + error.message);
    }
}

/**
 * UI 이벤트 핸들러 설정
 */
function setupUIEventHandlers() {
    // 전원 버튼
    const powerBtn = document.getElementById('power-btn');
    powerBtn.addEventListener('click', togglePower);
    
    // 제어 버튼들
    document.getElementById('clear-btn').addEventListener('click', clearTerminal);
    document.getElementById('restart-btn').addEventListener('click', restartEmulator);
    
    // 사이드바 컨트롤들
    document.getElementById('memory-view-btn').addEventListener('click', viewMemory);
    document.getElementById('list-btn').addEventListener('click', () => executeCommand('LIST'));
    document.getElementById('new-btn').addEventListener('click', () => executeCommand('NEW'));
    document.getElementById('run-btn').addEventListener('click', () => executeCommand('RUN'));
    
    // 키보드 단축키
    document.addEventListener('keydown', handleGlobalKeyboard);
    
    // 도움말 모달
    setupHelpModal();
    
    // 터미널 히스토리 처리 (추가 구현)
    setupTerminalHistory();
}

/**
 * 터미널 히스토리 설정
 */
function setupTerminalHistory() {
    const terminalInput = document.getElementById('terminal-input');
    
    terminalInput.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                navigateHistory(-1);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                navigateHistory(1);
                break;
        }
    });
}

/**
 * 명령어 히스토리에 추가
 */
function addToHistory(command) {
    if (command.trim() && commandHistory[commandHistory.length - 1] !== command) {
        commandHistory.push(command);
        if (commandHistory.length > 100) {
            commandHistory.shift();
        }
    }
    historyIndex = -1;
}

/**
 * 히스토리 탐색
 */
function navigateHistory(direction) {
    const terminalInput = document.getElementById('terminal-input');
    
    if (direction === -1) { // Up
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
        }
    } else { // Down
        if (historyIndex > 0) {
            historyIndex--;
            terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            terminalInput.value = '';
        }
    }
}

/**
 * 명령어 실행
 */
async function executeCommand(command) {
    if (webEmulator) {
        await webEmulator.runCommand(command);
    }
}

/**
 * 전역 키보드 처리
 */
function handleGlobalKeyboard(e) {
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        clearTerminal();
    }
    
    if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        if (isRunning) {
            webEmulator?.runCommand('STOP');
        }
    }
}

/**
 * 전원 토글
 */
function togglePower() {
    if (!webEmulator) return;
    
    if (isRunning) {
        webEmulator.dispose();
        updatePowerButton(false);
        showSystemMessage('시스템이 정지되었습니다');
    } else {
        webEmulator.restart();
        updatePowerButton(true);
        showSystemMessage('시스템이 시작되었습니다');
    }
}

/**
 * 전원 버튼 상태 업데이트
 */
function updatePowerButton(running) {
    isRunning = running;
    const powerBtn = document.getElementById('power-btn');
    
    if (running) {
        powerBtn.classList.add('active');
        powerBtn.title = '전원 끄기';
    } else {
        powerBtn.classList.remove('active');
        powerBtn.title = '전원 켜기';
    }
}

/**
 * 터미널 지우기
 */
function clearTerminal() {
    if (webEmulator) {
        webEmulator.clearTerminal();
    }
}

/**
 * 에뮬레이터 재시작
 */
function restartEmulator() {
    if (webEmulator) {
        webEmulator.restart();
        showSystemMessage('시스템이 재시작되었습니다');
    }
}

/**
 * 메모리 보기
 */
function viewMemory() {
    const addressInput = document.getElementById('memory-address');
    const address = parseInt(addressInput.value || '0', 16);
    
    if (!webEmulator || address < 0 || address >= 65536) {
        showError('유효하지 않은 메모리 주소입니다');
        return;
    }
    
    try {
        const memoryData = webEmulator.getMemoryData(address, 256);
        displayMemoryData(address, memoryData);
    } catch (error) {
        showError('메모리 읽기 실패: ' + error.message);
    }
}

/**
 * 메모리 데이터 표시
 */
function displayMemoryData(startAddress, data) {
    const display = document.getElementById('memory-display');
    let output = '';
    
    for (let i = 0; i < 16; i++) {
        const addr = (startAddress + i * 16) & 0xFFFF;
        let line = addr.toString(16).padStart(4, '0').toUpperCase() + ':';
        
        for (let j = 0; j < 16; j++) {
            const index = i * 16 + j;
            if (index < data.length) {
                line += ' ' + data[index].toString(16).padStart(2, '0').toUpperCase();
            } else {
                line += ' 00';
            }
        }
        
        output += line + '\n';
    }
    
    display.textContent = output;
}

/**
 * 도움말 모달 설정
 */
function setupHelpModal() {
    const helpModal = document.getElementById('help-modal');
    const modalClose = document.getElementById('modal-close');
    const helpLink = document.querySelector('.footer-link[href="#"]');
    
    helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        helpModal.classList.add('show');
    });
    
    modalClose.addEventListener('click', () => {
        helpModal.classList.remove('show');
    });
    
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });
}

/**
 * 시스템 메시지 표시
 */
function showSystemMessage(message) {
    console.log('[SYSTEM]', message);
    // 추가적인 UI 피드백 구현 가능
}

/**
 * 에러 메시지 표시
 */
function showError(message) {
    console.error('[ERROR]', message);
    // 추가적인 UI 피드백 구현 가능
}

/**
 * 프로그램 리스트 업데이트
 */
function updateProgramList() {
    if (!webEmulator) return;
    
    try {
        const program = webEmulator.getCurrentProgram();
        const display = document.getElementById('program-display');
        
        if (program && program.statements && program.statements.length > 0) {
            const listing = program.statements
                .filter(stmt => stmt.lineNumber)
                .sort((a, b) => a.lineNumber - b.lineNumber)
                .map(stmt => `${stmt.lineNumber.toString().padStart(3)} ${stmt.type}`)
                .join('\n');
            
            display.textContent = listing;
        } else {
            display.textContent = '프로그램이 없습니다';
        }
    } catch (error) {
        console.error('프로그램 리스트 업데이트 실패:', error);
    }
}

/**
 * 주기적 업데이트
 */
function startPeriodicUpdates() {
    setInterval(() => {
        if (webEmulator && isRunning) {
            updateProgramList();
        }
    }, 2000);
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    startPeriodicUpdates();
    
    // 디버깅용
    window.webEmulator = webEmulator;
});