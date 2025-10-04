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
let inputWaitingCallback = null;
let inputWaitingVariable = null;

/**
 * 애플리케이션 초기화
 */
async function initializeApp() {
    try {
        // 모듈 로드
        console.log('에뮬레이터 모듈 로딩 중...');

        // WebEmulator 사용 (예제 브라우저 포함)
        if (window.WebEmulator) {
            console.log('WebEmulator를 사용합니다');
            const webEmulator = new window.WebEmulator();
            await webEmulator.initialize();
            isRunning = true;

            // WebEmulator를 글로벌 emulator로 설정
            emulator = webEmulator;

            // 터미널 출력 이벤트 리스너 설정
            const terminal = webEmulator.getTerminal();
            if (terminal) {
                terminal.on('output', (data) => {
                    if (data && data.text) {
                        // WebEmulator가 이미 DOM 업데이트를 처리하므로
                        // 여기서는 추가 처리가 필요 없음
                    }
                });
            }

            console.log('WebEmulator 초기화 완료 (예제 브라우저 포함)');
        }
        // System6502 또는 BasicEmulator 사용 (fallback)
        else if (window.System6502) {
            console.log('System6502를 사용합니다');
            const system = new window.System6502();
            await system.initialize();
            system.start();
            isRunning = true;

            // System6502를 래핑하여 executeCommand 제공
            emulator = {
                system: system,
                terminal: system.getTerminal ? system.getTerminal() : null,
                basic: system.getBasic ? system.getBasic() : null,
                cpu: system.getCPU ? system.getCPU() : null,
                memory: system.getMemory ? system.getMemory() : null,
                program: [],
                variables: new Map(),
                _terminalListenerAttached: false,

                // 터미널 이벤트 리스너 초기화
                initTerminalListener() {
                    if (this.terminal && !this._terminalListenerAttached) {
                        this.terminal.on('output', (data) => {
                            console.log('[app.js] Terminal output received:', data);
                            if (data && data.text) {
                                appendToTerminal(data.text, 'output');
                            }
                        });
                        this._terminalListenerAttached = true;
                        console.log('[app.js] Terminal listener registered');
                    }
                },

                async executeCommand(command) {
                    // 터미널 리스너 초기화 (최초 1회만)
                    this.initTerminalListener();

                    const cmd = command.trim().toUpperCase();
                    const trimmedCommand = command.trim();

                    // 라인 번호가 있는 명령인지 확인
                    const lineMatch = trimmedCommand.match(/^(\d+)\s*(.*)/);
                    if (lineMatch) {
                        // 터미널을 통해 라인 번호가 있는 명령 전달
                        if (this.terminal) {
                            this.terminal.emit('command', trimmedCommand);
                            return { output: '', type: 'output' };
                        }
                        return { output: 'NO TERMINAL', type: 'error' };
                    }

                    // 즉시 실행 명령어 처리
                    switch (cmd) {
                        case 'NEW':
                            // 터미널을 통해 NEW 명령 전달
                            if (this.terminal) {
                                this.terminal.emit('command', 'NEW');
                                return { output: '', type: 'output' };
                            }
                            return { output: 'NO TERMINAL', type: 'error' };

                        case 'LIST':
                            // 터미널을 통해 LIST 명령 전달
                            if (this.terminal) {
                                this.terminal.emit('command', 'LIST');
                                return { output: '', type: 'output' };
                            }
                            return { output: 'NO TERMINAL', type: 'error' };

                        case 'RUN':
                            // 터미널을 통해 RUN 명령 전달
                            if (this.terminal) {
                                this.terminal.emit('command', 'RUN');
                                return { output: '', type: 'output' };
                            }
                            return { output: 'NO TERMINAL', type: 'error' };

                        default:
                            // 터미널이 있으면 터미널로 전달
                            if (this.terminal) {
                                this.terminal.emit('command', command);
                                return { output: '', type: 'output' };
                            }
                            return { output: '?SYNTAX ERROR', type: 'error' };
                    }
                },

                // 프로그램 실행
                async runProgram() {
                    this.variables.clear();
                    let pc = 0;

                    while (pc < this.program.length) {
                        const line = this.program[pc];
                        const upperText = line.text.toUpperCase();

                        try {
                            if (upperText.startsWith('PRINT ')) {
                                const printContent = line.text.substring(6).trim();
                                let output = '';

                                if (printContent.startsWith('"') && printContent.endsWith('"')) {
                                    output = printContent.substring(1, printContent.length - 1);
                                } else if (this.variables.has(printContent)) {
                                    output = String(this.variables.get(printContent));
                                } else {
                                    const num = parseFloat(printContent);
                                    output = isNaN(num) ? printContent : String(num);
                                }

                                appendToTerminal(output, 'output');
                            } else if (upperText.startsWith('LET ')) {
                                const letMatch = line.text.substring(4).match(/^([A-Z][A-Z0-9]*)\s*=\s*(.+)/);
                                if (letMatch) {
                                    const varName = letMatch[1];
                                    const expression = letMatch[2].trim();

                                    let value;
                                    if (expression.startsWith('"') && expression.endsWith('"')) {
                                        value = expression.substring(1, expression.length - 1);
                                    } else if (this.variables.has(expression)) {
                                        value = this.variables.get(expression);
                                    } else {
                                        value = parseFloat(expression);
                                        if (isNaN(value)) value = expression;
                                    }

                                    this.variables.set(varName, value);
                                }
                            } else if (upperText.startsWith('INPUT ')) {
                                const varName = upperText.substring(6).trim();
                                // INPUT 대기 상태 설정
                                await this.waitForInput(varName);
                            } else if (upperText === 'END' || upperText === 'STOP') {
                                break;
                            } else if (upperText.startsWith('REM ')) {
                                // 주석은 무시
                            }

                            pc++;
                        } catch (error) {
                            throw new Error(`Line ${line.number}: ${error.message}`);
                        }
                    }
                },

                // INPUT 대기 함수
                async waitForInput(varName) {
                    return new Promise((resolve) => {
                        // 새 줄에 INPUT 프롬프트 표시
                        setTimeout(() => {
                            appendToTerminal(`? ${varName}`, 'system');
                        }, 10);
                        inputWaitingCallback = (value) => {
                            const num = parseFloat(value);
                            this.variables.set(varName, isNaN(num) ? value : num);
                            inputWaitingCallback = null;
                            inputWaitingVariable = null;
                            resolve();
                        };
                        inputWaitingVariable = varName;
                        // 프롬프트 변경
                        const prompt = document.getElementById('terminal-prompt');
                        if (prompt) {
                            prompt.textContent = '? ';
                        }
                    });
                },

                getStats() {
                    return system.getStats ? system.getStats() : {
                        uptime: Date.now() - startTime,
                        memoryUsed: 1024,
                        cpuCycles: 0
                    };
                },

                getCPU() {
                    if (this.cpu && this.cpu.getState) {
                        const state = this.cpu.getState();
                        const P = state.P || 0;
                        return {
                            registers: {
                                A: state.A || 0,
                                X: state.X || 0,
                                Y: state.Y || 0,
                                PC: state.PC || 0,
                                SP: state.SP || 0xFF,
                                P: P
                            },
                            flags: {
                                N: (P & 0x80) !== 0,
                                V: (P & 0x40) !== 0,
                                B: (P & 0x10) !== 0,
                                D: (P & 0x08) !== 0,
                                I: (P & 0x04) !== 0,
                                Z: (P & 0x02) !== 0,
                                C: (P & 0x01) !== 0
                            }
                        };
                    }
                    return {
                        registers: { A: 0, X: 0, Y: 0, PC: 0, SP: 0xFF, P: 0 },
                        flags: { N: false, V: false, B: false, D: false, I: false, Z: false, C: false }
                    };
                },

                // INPUT 대기 함수
                async waitForInput(varName) {
                    return new Promise((resolve) => {
                        // 새 줄에 INPUT 프롬프트 표시
                        setTimeout(() => {
                            appendToTerminal(`? ${varName}`, 'system');
                        }, 10);
                        inputWaitingCallback = (value) => {
                            const num = parseFloat(value);
                            this.variables.set(varName, isNaN(num) ? value : num);
                            inputWaitingCallback = null;
                            inputWaitingVariable = null;
                            resolve();
                        };
                        inputWaitingVariable = varName;
                        // 프롬프트 변경
                        const prompt = document.getElementById('terminal-prompt');
                        if (prompt) {
                            prompt.textContent = '? ';
                        }
                    });
                }
            };
        } else if (window.BasicEmulator) {
            console.log('BasicEmulator를 사용합니다');
            const basicEmulator = new window.BasicEmulator();
            basicEmulator.start();
            isRunning = true;

            // BasicEmulator를 래핑
            emulator = {
                emulator: basicEmulator,
                terminal: basicEmulator.getTerminal(),
                program: [],
                variables: new Map(),
                dataValues: [],
                dataPointer: 0,
                _terminalListenerAttached: false,

                // 터미널 이벤트 리스너 초기화
                initTerminalListener() {
                    if (this.terminal && !this._terminalListenerAttached) {
                        this.terminal.on('output', (data) => {
                            console.log('[app.js] Terminal output received:', data);
                            if (data && data.text) {
                                appendToTerminal(data.text, 'output');
                            }
                        });
                        this._terminalListenerAttached = true;
                        console.log('[app.js] Terminal listener registered');
                    }
                },

                async executeCommand(command) {
                    // 터미널 리스너 초기화 (최초 1회만)
                    this.initTerminalListener();

                    const cmd = command.trim().toUpperCase();
                    const trimmedCommand = command.trim();

                    // 라인 번호가 있는 명령인지 확인
                    const lineMatch = trimmedCommand.match(/^(\d+)\s*(.*)/);
                    if (lineMatch) {
                        // 터미널을 통해 라인 번호가 있는 명령 전달
                        if (this.terminal) {
                            this.terminal.emit('command', trimmedCommand);
                            return { output: '', type: 'output' };
                        }
                        return { output: 'NO TERMINAL', type: 'error' };
                    }

                    // 즉시 실행 명령어 처리
                    switch (cmd) {
                        case 'NEW':
                            // 터미널을 통해 NEW 명령 전달
                            if (this.terminal) {
                                this.terminal.emit('command', 'NEW');
                                return { output: '', type: 'output' };
                            }
                            return { output: 'NO TERMINAL', type: 'error' };

                        case 'LIST':
                            // 터미널을 통해 LIST 명령 전달
                            if (this.terminal) {
                                this.terminal.emit('command', 'LIST');
                                return { output: '', type: 'output' };
                            }
                            return { output: 'NO TERMINAL', type: 'error' };

                        case 'RUN':
                            // 터미널을 통해 RUN 명령 전달
                            if (this.terminal) {
                                this.terminal.emit('command', 'RUN');
                                return { output: '', type: 'output' };
                            }
                            return { output: 'NO TERMINAL', type: 'error' };

                        default:
                            // 터미널로 명령 전달
                            if (this.terminal) {
                                this.terminal.emit('command', command);
                                return { output: '', type: 'output' };
                            }
                            return { output: '?SYNTAX ERROR', type: 'error' };
                    }
                },

                // 프로그램 실행
                async runProgram() {
                    this.dataPointer = 0;
                    this.variables.clear();
                    let pc = 0;

                    while (pc < this.program.length) {
                        const line = this.program[pc];
                        const upperText = line.text.toUpperCase();

                        try {
                            if (upperText.startsWith('PRINT ')) {
                                const printContent = line.text.substring(6).trim();
                                let output = '';

                                // 간단한 PRINT 처리
                                if (printContent.startsWith('"') && printContent.endsWith('"')) {
                                    output = printContent.substring(1, printContent.length - 1);
                                } else if (this.variables.has(printContent)) {
                                    output = String(this.variables.get(printContent));
                                } else {
                                    const num = parseFloat(printContent);
                                    output = isNaN(num) ? printContent : String(num);
                                }

                                appendToTerminal(output, 'output');
                            } else if (upperText.startsWith('LET ')) {
                                const letMatch = line.text.substring(4).match(/^([A-Z][A-Z0-9]*)\s*=\s*(.+)/);
                                if (letMatch) {
                                    const varName = letMatch[1];
                                    const expression = letMatch[2].trim();

                                    let value;
                                    if (expression.startsWith('"') && expression.endsWith('"')) {
                                        value = expression.substring(1, expression.length - 1);
                                    } else if (this.variables.has(expression)) {
                                        value = this.variables.get(expression);
                                    } else {
                                        value = parseFloat(expression);
                                        if (isNaN(value)) value = expression;
                                    }

                                    this.variables.set(varName, value);
                                }
                            } else if (upperText.startsWith('INPUT ')) {
                                const varName = upperText.substring(6).trim();
                                // INPUT 대기 상태 설정
                                await this.waitForInput(varName);
                            } else if (upperText.startsWith('READ ')) {
                                const varNames = upperText.substring(5).split(',');
                                for (const varName of varNames) {
                                    if (this.dataPointer < this.dataValues.length) {
                                        this.variables.set(varName.trim(), this.dataValues[this.dataPointer++]);
                                    } else {
                                        throw new Error('OUT OF DATA');
                                    }
                                }
                            } else if (upperText === 'END' || upperText === 'STOP') {
                                break;
                            } else if (upperText.startsWith('REM ')) {
                                // 주석은 무시
                            } else if (upperText.startsWith('DATA ')) {
                                // DATA는 이미 처리됨
                            } else if (upperText.startsWith('FOR ')) {
                                // FOR 루프는 간단히 건너뛰기
                                const nextIndex = this.program.findIndex((l, i) => i > pc && l.text.toUpperCase().startsWith('NEXT'));
                                if (nextIndex >= 0) {
                                    pc = nextIndex;
                                    continue;
                                }
                            }

                            pc++;
                        } catch (error) {
                            throw new Error(`Line ${line.number}: ${error.message}`);
                        }
                    }
                },

                // INPUT 대기 함수
                async waitForInput(varName) {
                    return new Promise((resolve) => {
                        // 새 줄에 INPUT 프롬프트 표시
                        setTimeout(() => {
                            appendToTerminal(`? ${varName}`, 'system');
                        }, 10);
                        inputWaitingCallback = (value) => {
                            const num = parseFloat(value);
                            this.variables.set(varName, isNaN(num) ? value : num);
                            inputWaitingCallback = null;
                            inputWaitingVariable = null;
                            resolve();
                        };
                        inputWaitingVariable = varName;
                        // 프롬프트 변경
                        const prompt = document.getElementById('terminal-prompt');
                        if (prompt) {
                            prompt.textContent = '? ';
                        }
                    });
                },

                getStats() {
                    return basicEmulator.getStats();
                },

                getCPU() {
                    return basicEmulator.getCPU();
                }
            };
        } else {
            console.log('실제 에뮬레이터를 찾을 수 없어 Mock을 사용합니다');
            // 임시로 mock 에뮬레이터 생성
            emulator = createMockEmulator();
        }
        
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
                    return { output: 'NO PROGRAM', type: 'output' };
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
            const lineMatch = command.match(/^(\d+)\s*(.*)/);  // \s* 로 변경 (공백이 없을 수도 있음)
            if (lineMatch) {
                const lineNumber = parseInt(lineMatch[1]);
                const lineText = lineMatch[2] || '';  // 빈 라인도 허용

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
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const restartBtn = document.getElementById('restart-btn');

    // 터미널 입력 처리
    terminalInput.addEventListener('keydown', handleKeyDown);
    terminalInput.addEventListener('keyup', updateCursor);

    // 컨트롤 버튼들
    powerBtn.addEventListener('click', togglePower);
    copyBtn.addEventListener('click', copyTerminalContent);
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

    // 예제 프로그램 로더 설정
    setupExampleLoader();
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
            // handleCommand에서 이미 입력창을 비우므로 여기서는 제거
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
 * @param {string} command - 실행할 명령어
 * @param {boolean} silent - true이면 터미널에 입력/출력 표시 안함
 */
async function handleCommand(command, silent = false) {
    if (!command.trim()) return;

    // INPUT 대기 중인 경우
    if (inputWaitingCallback) {
        // 입력값만 표시 (프롬프트 없이)
        if (!silent) {
            appendToTerminal(command, 'output');
        }

        // 입력창 비우기
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.value = '';
        }

        // 콜백 실행
        inputWaitingCallback(command);

        // 프롬프트 원래대로
        const prompt = document.getElementById('terminal-prompt');
        if (prompt) {
            prompt.textContent = 'READY. ';
        }
        return;
    }

    // 명령어 히스토리에 추가 (silent 모드가 아닐 때만)
    if (!silent) {
        commandHistory.push(command);
        if (commandHistory.length > 100) {
            commandHistory.shift();
        }
        historyIndex = -1;

        // 입력 표시
        appendToTerminal(`${getCurrentPrompt()}${command}`, 'input');
    }

    try {
        const result = await emulator.executeCommand(command);
        if (result.output && !silent) {
            appendToTerminal(result.output, result.type);
        }
    } catch (error) {
        if (!silent) {
            appendToTerminal(`ERROR: ${error.message}`, 'error');
        }
        console.error(`Command error (${command}):`, error);
    }

    // UI 업데이트
    updateSystemInfo();
    updateCPUInfo();
    updateProgramDisplay();

    // 입력창 비우기 (silent 모드가 아닐 때만)
    if (!silent) {
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.value = '';
        }
    }
}

/**
 * 명령어 실행 (버튼/예제 로더에서 호출)
 * @param {string} command - 실행할 명령어
 * @param {boolean} silent - true이면 조용히 실행 (기본값: false)
 */
async function executeCommand(command, silent = false) {
    const terminalInput = document.getElementById('terminal-input');
    if (!silent) {
        terminalInput.value = command;
    }
    await handleCommand(command, silent);
    if (!silent) {
        terminalInput.value = '';
    }
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
 * 터미널 내용 복사
 */
async function copyTerminalContent() {
    const output = document.getElementById('terminal-output');
    const text = output.innerText;

    try {
        // Clipboard API 사용 (최신 브라우저)
        await navigator.clipboard.writeText(text);

        // 복사 버튼 피드백
        const copyBtn = document.getElementById('copy-btn');
        const originalTitle = copyBtn.title;
        copyBtn.title = '복사 완료!';
        copyBtn.textContent = '✓';

        setTimeout(() => {
            copyBtn.title = originalTitle;
            copyBtn.textContent = '📋';
        }, 1500);
    } catch (err) {
        // 폴백: execCommand 사용 (구형 브라우저)
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            appendToTerminal('터미널 내용이 복사되었습니다', 'system');
        } catch (e) {
            appendToTerminal('복사 실패: ' + e.message, 'error');
        }

        document.body.removeChild(textArea);
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

    try {
        const cpu = emulator.getCPU();

        if (!cpu || !cpu.registers) return;

        // 안전하게 레지스터 값 가져오기
        const regA = (cpu.registers.A || 0);
        const regX = (cpu.registers.X || 0);
        const regY = (cpu.registers.Y || 0);
        const regPC = (cpu.registers.PC || 0);
        const regSP = (cpu.registers.SP || 0xFF);
        const regP = (cpu.registers.P || 0);

        document.getElementById('reg-a').textContent = `$${regA.toString(16).padStart(2, '0').toUpperCase()}`;
        document.getElementById('reg-x').textContent = `$${regX.toString(16).padStart(2, '0').toUpperCase()}`;
        document.getElementById('reg-y').textContent = `$${regY.toString(16).padStart(2, '0').toUpperCase()}`;
        document.getElementById('reg-pc').textContent = `$${regPC.toString(16).padStart(4, '0').toUpperCase()}`;
        document.getElementById('reg-sp').textContent = `$${regSP.toString(16).padStart(2, '0').toUpperCase()}`;
        document.getElementById('reg-p').textContent = `$${regP.toString(16).padStart(2, '0').toUpperCase()}`;

        // 플래그 업데이트
        if (cpu.flags) {
            updateFlag('flag-n', cpu.flags.N);
            updateFlag('flag-v', cpu.flags.V);
            updateFlag('flag-b', cpu.flags.B);
            updateFlag('flag-d', cpu.flags.D);
            updateFlag('flag-i', cpu.flags.I);
            updateFlag('flag-z', cpu.flags.Z);
            updateFlag('flag-c', cpu.flags.C);
        }
    } catch (error) {
        console.error('CPU 정보 업데이트 오류:', error);
    }
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
 * 예제 프로그램 로더 설정
 */
function setupExampleLoader() {
    const exampleSelect = document.getElementById('example-select');
    const loadExampleBtn = document.getElementById('load-example-btn');
    const exampleDescription = document.getElementById('example-description');

    // 예제 설명
    const exampleDescriptions = {
        'hello.bas': '간단한 Hello World 프로그램',
        'hello-world.bas': '확장된 Hello World 프로그램 - 반복문과 변수 사용',
        'calculator.bas': '기본적인 사칙연산 계산기',
        'guess-game.bas': '1부터 100까지의 숫자를 맞추는 게임',
        'loops-and-arrays.bas': '반복문과 배열 사용법 데모',
        'math-demo.bas': '수학 연산 데모 프로그램',
        'math-functions.bas': '다양한 수학 함수 사용 예제',
        'multiplication-table.bas': '구구단 출력 프로그램',
        'prime-numbers.bas': '소수를 찾아서 출력하는 프로그램',
        'tic-tac-toe.bas': '틱택토 게임 구현',
        'sorting.bas': '배열 정렬 알고리즘 구현',
        'address-book.bas': '간단한 주소록 프로그램'
    };

    // 예제 선택 시 설명 표시
    if (exampleSelect) {
        exampleSelect.addEventListener('change', () => {
            const selectedExample = exampleSelect.value;
            if (selectedExample && exampleDescriptions[selectedExample]) {
                exampleDescription.textContent = exampleDescriptions[selectedExample];
            } else {
                exampleDescription.textContent = '예제를 선택하면 설명이 표시됩니다.';
            }
        });
    }

    // 예제 로드 버튼 클릭
    if (loadExampleBtn) {
        loadExampleBtn.addEventListener('click', async () => {
            const selectedExample = exampleSelect.value;
            if (!selectedExample) {
                appendToTerminal('예제를 선택해주세요', 'error');
                return;
            }

            try {
                appendToTerminal(`예제 "${selectedExample}" 로드 중...`, 'system');

                // 예제 파일 가져오기
                const response = await fetch(`examples/${selectedExample}`);
                if (!response.ok) {
                    throw new Error('예제 파일을 로드할 수 없습니다');
                }

                const programText = await response.text();
                console.log(`예제 파일 내용 (${selectedExample}):`, programText);

                // NEW 명령으로 기존 프로그램 지우기 (조용히)
                await executeCommand('NEW', true);

                // 프로그램 라인별로 입력 (조용히)
                const lines = programText.split('\n');
                let loadedLines = 0;
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine) {
                        // 라인 번호가 있고 그 뒤에 명령어가 있는 경우만 입력
                        // 라인 번호만 있는 줄(예: "460 ")은 건너뛰기
                        if (/^\d+\s+\S/.test(trimmedLine)) {
                            await executeCommand(trimmedLine, true);
                            loadedLines++;
                        }
                    }
                }

                appendToTerminal(`예제 "${selectedExample}" 로드 완료 (${loadedLines}줄)`, 'system');
                appendToTerminal('RUN 명령으로 실행하세요', 'system');

                // 프로그램 표시 업데이트 (LIST는 화면에 표시)
                await executeCommand('LIST', false);

            } catch (error) {
                appendToTerminal(`예제 로드 실패: ${error.message}`, 'error');
            }
        });
    }
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