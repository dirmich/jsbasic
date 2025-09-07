/**
 * 6502 BASIC 에뮬레이터 웹 인터페이스
 */

// 에뮬레이터 모듈 동적 import (개발 중이므로 임시 구현)
let BasicEmulator, Terminal, CPU6502, MemoryManager;

// 글로벌 변수
let emulator = null;
let isRunning = false;
let commandHistory = [];
let historyIndex = -1;

/**
 * 애플리케이션 초기화
 */
async function initializeApp() {
    try {
        // 모듈 로드 (실제로는 번들러를 통해 처리되어야 함)
        console.log('에뮬레이터 모듈 로딩 중...');
        
        // 임시로 mock 에뮬레이터 생성
        emulator = createMockEmulator();
        
        // UI 이벤트 설정
        setupEventHandlers();
        
        // 초기 상태 설정
        updateSystemInfo();
        
        console.log('6502 BASIC 에뮬레이터가 준비되었습니다.');
        
        // 환영 메시지 표시
        appendToTerminal('6502 BASIC INTERPRETER V1.1', 'system');
        appendToTerminal('JAVASCRIPT/TYPESCRIPT EMULATOR', 'system');
        appendToTerminal('', 'system');
        appendToTerminal('READY.', 'system');
        
    } catch (error) {
        console.error('초기화 실패:', error);
        appendToTerminal('ERROR: 에뮬레이터 초기화 실패', 'error');
    }
}

/**
 * Mock 에뮬레이터 생성 (실제 구현 전까지 사용)
 */
function createMockEmulator() {
    return {
        state: 'STOPPED',
        memory: new Array(65536).fill(0),
        program: [],
        variables: new Map(),
        
        // 상태 정보
        getStats() {
            return {
                uptime: Date.now() - startTime,
                memoryUsed: 1024,
                cpuCycles: 0
            };
        },
        
        // CPU 상태
        getCPU() {
            return {
                registers: {
                    A: 0x00,
                    X: 0x00,
                    Y: 0x00,
                    PC: 0x0000,
                    SP: 0xFF,
                    P: 0x00
                },
                flags: {
                    N: false, V: false, B: false, D: false,
                    I: false, Z: false, C: false
                }
            };
        },
        
        // 명령 처리
        async executeCommand(command) {
            const cmd = command.trim().toUpperCase();
            
            if (cmd === 'NEW') {
                this.program = [];
                this.variables.clear();
                return { output: 'NEW PROGRAM', type: 'system' };
            }
            
            if (cmd === 'LIST') {
                if (this.program.length === 0) {
                    return { output: '', type: 'output' };
                }
                const listing = this.program.map(line => 
                    `${line.number} ${line.text}`
                ).join('\n');
                return { output: listing, type: 'output' };
            }
            
            if (cmd === 'RUN') {
                if (this.program.length === 0) {
                    return { output: 'NO PROGRAM', type: 'system' };
                }
                
                // 간단한 프로그램 실행 시뮬레이션
                let output = '';
                for (const line of this.program) {
                    if (line.text.includes('PRINT')) {
                        const match = line.text.match(/PRINT\s+"([^"]+)"/);
                        if (match) {
                            output += match[1] + '\n';
                        }
                    }
                }
                return { output, type: 'output' };
            }
            
            if (cmd.startsWith('SAVE ')) {
                const filename = cmd.substring(5).replace(/"/g, '');
                try {
                    localStorage.setItem(`basic_program_${filename}`, 
                        JSON.stringify(this.program));
                    return { output: `SAVED "${filename}"`, type: 'system' };
                } catch (error) {
                    return { output: 'SAVE ERROR', type: 'error' };
                }
            }
            
            if (cmd.startsWith('LOAD ')) {
                const filename = cmd.substring(5).replace(/"/g, '');
                try {
                    const data = localStorage.getItem(`basic_program_${filename}`);
                    if (data) {
                        this.program = JSON.parse(data);
                        return { output: `LOADED "${filename}"`, type: 'system' };
                    } else {
                        return { output: `FILE NOT FOUND: "${filename}"`, type: 'error' };
                    }
                } catch (error) {
                    return { output: 'LOAD ERROR', type: 'error' };
                }
            }
            
            // 프로그램 라인인지 확인 (숫자로 시작)
            const lineMatch = command.match(/^(\d+)\s+(.*)/);
            if (lineMatch) {
                const lineNumber = parseInt(lineMatch[1]);
                const lineText = lineMatch[2];
                
                // 기존 라인 삭제 또는 업데이트
                this.program = this.program.filter(line => line.number !== lineNumber);
                
                if (lineText.trim()) {
                    this.program.push({ number: lineNumber, text: lineText });
                    this.program.sort((a, b) => a.number - b.number);
                }
                
                return { output: '', type: 'output' };
            }
            
            // 즉시 실행 명령
            if (cmd.includes('PRINT')) {
                const match = cmd.match(/PRINT\s+"([^"]+)"/);
                if (match) {
                    return { output: match[1], type: 'output' };
                }
                
                const mathMatch = cmd.match(/PRINT\s+(.+)/);
                if (mathMatch) {
                    try {
                        // 간단한 수식 계산
                        const expression = mathMatch[1].replace(/\s+/g, '');
                        const result = evaluateSimpleExpression(expression);
                        return { output: result.toString(), type: 'output' };
                    } catch (error) {
                        return { output: 'SYNTAX ERROR', type: 'error' };
                    }
                }
            }
            
            return { output: 'SYNTAX ERROR', type: 'error' };
        }
    };
}

/**
 * 간단한 수식 계산기
 */
function evaluateSimpleExpression(expr) {
    // 매우 간단한 구현 - 실제로는 더 복잡한 파서 필요
    try {
        return eval(expr);
    } catch {
        throw new Error('Invalid expression');
    }
}

let startTime = Date.now();

/**
 * 이벤트 핸들러 설정
 */
function setupEventHandlers() {
    const terminalInput = document.getElementById('terminal-input');
    const powerBtn = document.getElementById('power-btn');
    const clearBtn = document.getElementById('clear-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    // 터미널 입력 처리
    terminalInput.addEventListener('keydown', handleKeyDown);
    terminalInput.addEventListener('keyup', updateCursor);
    
    // 컨트롤 버튼들
    powerBtn.addEventListener('click', togglePower);
    clearBtn.addEventListener('click', clearTerminal);
    restartBtn.addEventListener('click', restartEmulator);
    
    // 사이드바 컨트롤들
    document.getElementById('memory-view-btn').addEventListener('click', viewMemory);
    document.getElementById('list-btn').addEventListener('click', () => executeCommand('LIST'));
    document.getElementById('new-btn').addEventListener('click', () => executeCommand('NEW'));
    document.getElementById('run-btn').addEventListener('click', () => executeCommand('RUN'));
    
    // 모달 처리
    const helpModal = document.getElementById('help-modal');
    const modalClose = document.getElementById('modal-close');
    
    document.querySelector('.footer-link[href="#"]').addEventListener('click', (e) => {
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
    
    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            clearTerminal();
        }
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            if (isRunning) {
                stopExecution();
            }
        }
    });
    
    // 터미널 클릭 시 입력 포커스
    document.getElementById('terminal').addEventListener('click', () => {
        terminalInput.focus();
    });
}

/**
 * 키보드 입력 처리
 */
async function handleKeyDown(e) {
    const terminalInput = e.target;
    
    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            await handleCommand(terminalInput.value);
            terminalInput.value = '';
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            navigateHistory(-1);
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            navigateHistory(1);
            break;
            
        case 'Tab':
            e.preventDefault();
            // 자동완성 기능 (나중에 구현)
            break;
    }
}

/**
 * 명령어 처리
 */
async function handleCommand(command) {
    if (!command.trim()) return;
    
    // 명령어 히스토리에 추가
    commandHistory.push(command);
    if (commandHistory.length > 100) {
        commandHistory.shift();
    }
    historyIndex = -1;
    
    // 입력 표시
    appendToTerminal(`${getCurrentPrompt()}${command}`, 'input');
    
    try {
        const result = await emulator.executeCommand(command);
        if (result.output) {
            appendToTerminal(result.output, result.type);
        }
    } catch (error) {
        appendToTerminal(`ERROR: ${error.message}`, 'error');
    }
    
    // UI 업데이트
    updateSystemInfo();
    updateCPUInfo();
    updateProgramDisplay();
}

/**
 * 명령어 실행 (버튼에서 호출)
 */
async function executeCommand(command) {
    const terminalInput = document.getElementById('terminal-input');
    terminalInput.value = command;
    await handleCommand(command);
    terminalInput.value = '';
}

/**
 * 명령어 히스토리 탐색
 */
function navigateHistory(direction) {
    const terminalInput = document.getElementById('terminal-input');
    
    if (direction === -1) { // Up arrow
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
        }
    } else { // Down arrow
        if (historyIndex > 0) {
            historyIndex--;
            terminalInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
        } else if (historyIndex === 0) {
            historyIndex--;
            terminalInput.value = '';
        }
    }
}

/**
 * 터미널에 텍스트 추가
 */
function appendToTerminal(text, type = 'output') {
    const output = document.getElementById('terminal-output');
    const lines = text.split('\n');
    
    lines.forEach(line => {
        const div = document.createElement('div');
        div.className = `terminal-line ${type}`;
        div.textContent = line;
        output.appendChild(div);
    });
    
    // 스크롤을 맨 아래로
    output.scrollTop = output.scrollHeight;
}

/**
 * 현재 프롬프트 반환
 */
function getCurrentPrompt() {
    return document.getElementById('terminal-prompt').textContent;
}

/**
 * 커서 업데이트
 */
function updateCursor() {
    const terminalInput = document.getElementById('terminal-input');
    const cursor = document.getElementById('cursor');
    
    // 커서 위치는 CSS로 처리되므로 여기서는 표시/숨김만 처리
    cursor.style.display = terminalInput.value.length > 0 ? 'none' : 'inline';
}

/**
 * 전원 토글
 */
function togglePower() {
    const powerBtn = document.getElementById('power-btn');
    
    if (isRunning) {
        // 전원 끄기
        isRunning = false;
        powerBtn.classList.remove('active');
        powerBtn.title = '전원 켜기';
        
        appendToTerminal('SYSTEM STOPPED', 'system');
        updateSystemStatus('정지');
        
    } else {
        // 전원 켜기
        isRunning = true;
        powerBtn.classList.add('active');
        powerBtn.title = '전원 끄기';
        startTime = Date.now();
        
        clearTerminal();
        appendToTerminal('6502 BASIC INTERPRETER V1.1', 'system');
        appendToTerminal('JAVASCRIPT/TYPESCRIPT EMULATOR', 'system');
        appendToTerminal('', 'system');
        appendToTerminal('READY.', 'system');
        updateSystemStatus('실행중');
    }
}

/**
 * 터미널 지우기
 */
function clearTerminal() {
    const output = document.getElementById('terminal-output');
    output.innerHTML = '';
}

/**
 * 에뮬레이터 재시작
 */
function restartEmulator() {
    if (emulator) {
        emulator.program = [];
        emulator.variables.clear();
        
        clearTerminal();
        appendToTerminal('SYSTEM RESTARTED', 'system');
        appendToTerminal('', 'system');
        appendToTerminal('READY.', 'system');
        
        updateSystemInfo();
        updateCPUInfo();
        updateProgramDisplay();
    }
}

/**
 * 실행 중지
 */
function stopExecution() {
    appendToTerminal('BREAK', 'system');
    appendToTerminal('READY.', 'system');
}

/**
 * 시스템 정보 업데이트
 */
function updateSystemInfo() {
    if (!emulator) return;
    
    const stats = emulator.getStats();
    const uptimeSeconds = Math.floor(stats.uptime / 1000);
    
    document.querySelector('.cpu-status').textContent = 
        `CPU: ${isRunning ? '실행중' : '정지'}`;
    document.querySelector('.memory-status').textContent = 
        `메모리: ${Math.floor(stats.memoryUsed / 1024)}KB`;
    document.querySelector('.uptime').textContent = 
        `가동시간: ${uptimeSeconds}s`;
}

/**
 * CPU 정보 업데이트
 */
function updateCPUInfo() {
    if (!emulator) return;
    
    const cpu = emulator.getCPU();
    
    document.getElementById('reg-a').textContent = `$${cpu.registers.A.toString(16).padStart(2, '0').toUpperCase()}`;
    document.getElementById('reg-x').textContent = `$${cpu.registers.X.toString(16).padStart(2, '0').toUpperCase()}`;
    document.getElementById('reg-y').textContent = `$${cpu.registers.Y.toString(16).padStart(2, '0').toUpperCase()}`;
    document.getElementById('reg-pc').textContent = `$${cpu.registers.PC.toString(16).padStart(4, '0').toUpperCase()}`;
    document.getElementById('reg-sp').textContent = `$${cpu.registers.SP.toString(16).padStart(2, '0').toUpperCase()}`;
    document.getElementById('reg-p').textContent = `$${cpu.registers.P.toString(16).padStart(2, '0').toUpperCase()}`;
    
    // 플래그 업데이트
    updateFlag('flag-n', cpu.flags.N);
    updateFlag('flag-v', cpu.flags.V);
    updateFlag('flag-b', cpu.flags.B);
    updateFlag('flag-d', cpu.flags.D);
    updateFlag('flag-i', cpu.flags.I);
    updateFlag('flag-z', cpu.flags.Z);
    updateFlag('flag-c', cpu.flags.C);
}

/**
 * CPU 플래그 업데이트
 */
function updateFlag(flagId, active) {
    const flagElement = document.getElementById(flagId);
    if (active) {
        flagElement.classList.add('active');
    } else {
        flagElement.classList.remove('active');
    }
}

/**
 * 프로그램 목록 업데이트
 */
function updateProgramDisplay() {
    if (!emulator) return;
    
    const display = document.getElementById('program-display');
    
    if (emulator.program.length === 0) {
        display.textContent = '프로그램이 없습니다';
        return;
    }
    
    const listing = emulator.program.map(line => 
        `${line.number.toString().padStart(3)} ${line.text}`
    ).join('\n');
    
    display.textContent = listing;
}

/**
 * 메모리 보기
 */
function viewMemory() {
    const addressInput = document.getElementById('memory-address');
    const address = parseInt(addressInput.value, 16) || 0;
    
    if (!emulator || address < 0 || address >= 65536) {
        document.getElementById('memory-display').textContent = 'Invalid address';
        return;
    }
    
    let display = '';
    for (let i = 0; i < 16; i++) {
        const addr = (address + i * 16) & 0xFFFF;
        let line = addr.toString(16).padStart(4, '0').toUpperCase() + ':';
        
        for (let j = 0; j < 16; j++) {
            const byteAddr = (addr + j) & 0xFFFF;
            const value = emulator.memory[byteAddr] || 0;
            line += ' ' + value.toString(16).padStart(2, '0').toUpperCase();
        }
        
        display += line + '\n';
    }
    
    document.getElementById('memory-display').textContent = display;
}

/**
 * 시스템 상태 업데이트
 */
function updateSystemStatus(status) {
    document.querySelector('.cpu-status').textContent = `CPU: ${status}`;
}

/**
 * 주기적 업데이트
 */
function startPeriodicUpdates() {
    setInterval(() => {
        if (isRunning) {
            updateSystemInfo();
        }
    }, 1000);
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    startPeriodicUpdates();
});