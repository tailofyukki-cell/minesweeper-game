// ゲーム設定
const DIFFICULTIES = {
    easy: { rows: 9, cols: 9, mines: 10 },
    normal: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

// ゲーム状態
let gameState = {
    difficulty: null,
    rows: 0,
    cols: 0,
    totalMines: 0,
    board: [],
    revealed: [],
    flagged: [],
    gameOver: false,
    gameWon: false,
    firstClick: true,
    timer: 0,
    timerInterval: null,
    flagMode: false
};

// DOM要素
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const boardElement = document.getElementById('board');
const mineCountElement = document.getElementById('mine-count');
const timerElement = document.getElementById('timer');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const finalTimeElement = document.getElementById('final-time');
const flagModeBtn = document.getElementById('flag-mode-btn');

// イベントリスナー設定
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const difficulty = btn.dataset.difficulty;
        startGame(difficulty);
    });
});

document.getElementById('restart-btn').addEventListener('click', () => {
    startGame(gameState.difficulty);
});

document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('start');
});

document.getElementById('replay-btn').addEventListener('click', () => {
    startGame(gameState.difficulty);
});

document.getElementById('menu-btn').addEventListener('click', () => {
    showScreen('start');
});

flagModeBtn.addEventListener('click', () => {
    gameState.flagMode = !gameState.flagMode;
    updateFlagModeButton();
});

// 右クリックメニュー無効化
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// 画面切り替え
function showScreen(screen) {
    startScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    
    if (screen === 'start') {
        startScreen.classList.remove('hidden');
    } else if (screen === 'game') {
        gameScreen.classList.remove('hidden');
    } else if (screen === 'result') {
        resultScreen.classList.remove('hidden');
    }
}

// ゲーム開始
function startGame(difficulty) {
    gameState.difficulty = difficulty;
    const config = DIFFICULTIES[difficulty];
    gameState.rows = config.rows;
    gameState.cols = config.cols;
    gameState.totalMines = config.mines;
    gameState.gameOver = false;
    gameState.gameWon = false;
    gameState.firstClick = true;
    gameState.timer = 0;
    gameState.flagMode = false;
    
    // タイマー停止
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // ボード初期化
    initializeBoard();
    
    // UI更新
    updateMineCount();
    updateTimer();
    updateFlagModeButton();
    renderBoard();
    
    showScreen('game');
}

// ボード初期化
function initializeBoard() {
    gameState.board = [];
    gameState.revealed = [];
    gameState.flagged = [];
    
    for (let i = 0; i < gameState.rows; i++) {
        gameState.board[i] = [];
        gameState.revealed[i] = [];
        gameState.flagged[i] = [];
        for (let j = 0; j < gameState.cols; j++) {
            gameState.board[i][j] = 0;
            gameState.revealed[i][j] = false;
            gameState.flagged[i][j] = false;
        }
    }
}

// 地雷配置(初手セーフ保証)
function placeMines(firstRow, firstCol) {
    let minesPlaced = 0;
    const safeZone = getSafeZone(firstRow, firstCol);
    
    while (minesPlaced < gameState.totalMines) {
        const row = Math.floor(Math.random() * gameState.rows);
        const col = Math.floor(Math.random() * gameState.cols);
        
        // 既に地雷があるか、セーフゾーンならスキップ
        if (gameState.board[row][col] === -1 || safeZone.has(`${row},${col}`)) {
            continue;
        }
        
        gameState.board[row][col] = -1;
        minesPlaced++;
    }
    
    // 数字を計算
    calculateNumbers();
}

// セーフゾーン取得(初手とその周囲)
function getSafeZone(row, col) {
    const safeZone = new Set();
    safeZone.add(`${row},${col}`);
    
    // 周囲8マスもセーフゾーンに追加
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                safeZone.add(`${nr},${nc}`);
            }
        }
    }
    
    return safeZone;
}

// 周囲の地雷数を計算
function calculateNumbers() {
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            if (gameState.board[i][j] === -1) continue;
            
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = i + dr;
                    const nc = j + dc;
                    if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                        if (gameState.board[nr][nc] === -1) {
                            count++;
                        }
                    }
                }
            }
            gameState.board[i][j] = count;
        }
    }
}

// ボード描画
function renderBoard() {
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${gameState.cols}, 30px)`;
    boardElement.style.gridTemplateRows = `repeat(${gameState.rows}, 30px)`;
    
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            // クリックイベント
            cell.addEventListener('click', () => handleCellClick(i, j));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellRightClick(i, j);
            });
            
            // 長押し対応(スマホ)
            let pressTimer;
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                pressTimer = setTimeout(() => {
                    handleCellRightClick(i, j);
                }, 500);
            });
            cell.addEventListener('touchend', (e) => {
                e.preventDefault();
                clearTimeout(pressTimer);
            });
            cell.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
            
            updateCell(cell, i, j);
            boardElement.appendChild(cell);
        }
    }
}

// セル更新
function updateCell(cell, row, col) {
    cell.className = 'cell';
    cell.textContent = '';
    
    if (gameState.flagged[row][col]) {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
    } else if (gameState.revealed[row][col]) {
        cell.classList.add('revealed');
        const value = gameState.board[row][col];
        
        if (value === -1) {
            cell.classList.add('mine');
            cell.textContent = '💣';
        } else if (value > 0) {
            cell.textContent = value;
            cell.dataset.count = value;
        }
    }
}

// セルクリック処理
function handleCellClick(row, col) {
    if (gameState.gameOver || gameState.gameWon) return;
    if (gameState.flagged[row][col]) return;
    if (gameState.revealed[row][col]) return;
    
    // 旗モードの場合は旗を立てる
    if (gameState.flagMode) {
        handleCellRightClick(row, col);
        return;
    }
    
    // 初手の場合、地雷配置
    if (gameState.firstClick) {
        placeMines(row, col);
        gameState.firstClick = false;
        startTimer();
    }
    
    // 地雷を踏んだ
    if (gameState.board[row][col] === -1) {
        gameOver(false);
        return;
    }
    
    // マスを開く
    revealCell(row, col);
    
    // 勝利判定
    checkWin();
}

// セル右クリック処理(旗)
function handleCellRightClick(row, col) {
    if (gameState.gameOver || gameState.gameWon) return;
    if (gameState.revealed[row][col]) return;
    
    gameState.flagged[row][col] = !gameState.flagged[row][col];
    updateMineCount();
    
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    updateCell(cell, row, col);
}

// セルを開く(連鎖処理含む)
function revealCell(row, col) {
    if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) return;
    if (gameState.revealed[row][col]) return;
    if (gameState.flagged[row][col]) return;
    
    gameState.revealed[row][col] = true;
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    updateCell(cell, row, col);
    
    // 周囲に地雷がない場合、連鎖オープン
    if (gameState.board[row][col] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                revealCell(row + dr, col + dc);
            }
        }
    }
}

// 勝利判定
function checkWin() {
    let unrevealedCount = 0;
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            if (!gameState.revealed[i][j] && gameState.board[i][j] !== -1) {
                unrevealedCount++;
            }
        }
    }
    
    if (unrevealedCount === 0) {
        gameOver(true);
    }
}

// ゲーム終了
function gameOver(won) {
    gameState.gameOver = true;
    gameState.gameWon = won;
    
    // タイマー停止
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // すべての地雷を表示
    if (!won) {
        for (let i = 0; i < gameState.rows; i++) {
            for (let j = 0; j < gameState.cols; j++) {
                if (gameState.board[i][j] === -1) {
                    gameState.revealed[i][j] = true;
                    const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                    updateCell(cell, i, j);
                }
            }
        }
    }
    
    // 結果表示
    setTimeout(() => {
        showResult(won);
    }, 500);
}

// 結果表示
function showResult(won) {
    if (won) {
        resultTitle.textContent = '🎉 クリア!';
        resultTitle.className = 'win';
        resultMessage.textContent = 'おめでとうございます!';
    } else {
        resultTitle.textContent = '💥 ゲームオーバー';
        resultTitle.className = 'lose';
        resultMessage.textContent = '地雷を踏んでしまいました...';
    }
    
    finalTimeElement.textContent = gameState.timer;
    showScreen('result');
}

// 残り地雷数更新
function updateMineCount() {
    let flagCount = 0;
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            if (gameState.flagged[i][j]) flagCount++;
        }
    }
    mineCountElement.textContent = gameState.totalMines - flagCount;
}

// タイマー開始
function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timer++;
        updateTimer();
    }, 1000);
}

// タイマー更新
function updateTimer() {
    timerElement.textContent = gameState.timer;
}

// 旗モードボタン更新
function updateFlagModeButton() {
    if (gameState.flagMode) {
        flagModeBtn.textContent = '🚩 旗モード: ON';
        flagModeBtn.style.background = '#ffd700';
        flagModeBtn.style.color = '#333';
    } else {
        flagModeBtn.textContent = '🚩 旗モード: OFF';
        flagModeBtn.style.background = '#667eea';
        flagModeBtn.style.color = 'white';
    }
}

// 初期画面表示
showScreen('start');
