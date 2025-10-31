// DOM Elements
const loginSection = document.getElementById('login-section');
const gameSection = document.getElementById('game-section');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const username = document.getElementById('username');
const password = document.getElementById('password');
const message = document.getElementById('message');
const cells = document.querySelectorAll('.cell');
const numbers = document.querySelectorAll('.number');
const checkBtn = document.getElementById('check-btn');
const resetBtn = document.getElementById('reset-btn');
const bestTimeDisplay = document.getElementById('bestTime');
const currentTimeDisplay = document.getElementById('currentTime');

// Timer variables
let startTime;
let timerInterval;
let currentTime = 0;

// Game State
let selectedCell = null;
let gameBoard = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
];
let currentUser = null;

// Local Storage Keys
const USERS_KEY = 'sudoku_users';
const PROGRESS_KEY = 'sudoku_progress';
const SCORES_KEY = 'sudoku_scores';
const HISTORY_KEY = 'sudoku_history';

// Initialize local storage if needed
if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify([
        { 
            username: 'admin', 
            password: 'admin123', 
            bestTime: null,
            gamesPlayed: 0,
            gamesWon: 0,
            totalTime: 0
        }
    ]));
}
if (!localStorage.getItem(PROGRESS_KEY)) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({}));
}
if (!localStorage.getItem(SCORES_KEY)) {
    localStorage.setItem(SCORES_KEY, JSON.stringify({}));
}
if (!localStorage.getItem(HISTORY_KEY)) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({}));
}

// Initialize tab functionality
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
    });
});

// Leaderboard functions
function updateStats() {
    if (!currentUser) return;

    const users = getUsers();
    const user = users.find(u => u.username === currentUser);
    if (!user) return;

    // Update stats display
    document.getElementById('fastest-time').textContent = user.bestTime ? formatTime(user.bestTime) : '--:--';
    document.getElementById('games-played').textContent = user.gamesPlayed || 0;
    document.getElementById('win-rate').textContent = user.gamesPlayed ? 
        Math.round((user.gamesWon / user.gamesPlayed) * 100) + '%' : '0%';
    document.getElementById('avg-time').textContent = user.gamesPlayed ? 
        formatTime(Math.round(user.totalTime / user.gamesPlayed)) : '--:--';
}

function updateGameHistory() {
    const historyContainer = document.getElementById('game-history');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const userHistory = history[currentUser] || [];

    historyContainer.innerHTML = '';

    // Show last 10 games
    userHistory.slice(-10).reverse().forEach(game => {
        const entry = document.createElement('div');
        entry.className = 'history-entry';
        entry.innerHTML = `
            <div class="date">${new Date(game.date).toLocaleDateString()}</div>
            <div class="time">${formatTime(game.time)}</div>
            <div class="result">${game.completed ? 'Completed' : 'Abandoned'}</div>
        `;
        historyContainer.appendChild(entry);
    });

    if (userHistory.length === 0) {
        historyContainer.innerHTML = '<div class="history-entry">No games played yet</div>';
    }
}

function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    const users = getUsers();
    
    // Sort users by best time (null times at the end)
    const sortedUsers = users
        .filter(user => user.bestTime !== null)
        .sort((a, b) => a.bestTime - b.bestTime);
    
    // Clear current leaderboard
    leaderboardList.innerHTML = '';
    
    // Add entries
    sortedUsers.forEach((user, index) => {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        if (user.username === currentUser) {
            entry.classList.add('current-user');
        }
        
        entry.innerHTML = `
            <span>${index + 1}</span>
            <span>${user.username}</span>
            <span>${formatTime(user.bestTime)}</span>
        `;
        
        leaderboardList.appendChild(entry);
    });

    // Update other stats
    updateStats();
    updateGameHistory();
}

function addGameToHistory(time, completed = true) {
    if (!currentUser) return;

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    if (!history[currentUser]) {
        history[currentUser] = [];
    }

    history[currentUser].push({
        date: new Date().toISOString(),
        time: time,
        completed: completed
    });

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // Update user statistics
    const users = getUsers();
    const user = users.find(u => u.username === currentUser);
    if (user) {
        user.gamesPlayed = (user.gamesPlayed || 0) + 1;
        if (completed) {
            user.gamesWon = (user.gamesWon || 0) + 1;
        }
        user.totalTime = (user.totalTime || 0) + time;
        saveUsers(users);
    }

    updateLeaderboard();
}

// Get users from local storage
function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

// Save users to local storage
function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Login Functionality
loginBtn.addEventListener('click', () => {
    // Clear previous field errors
    clearFieldErrors();

    const users = getUsers();
    const userByName = users.find(u => u.username === username.value);

    if (!userByName) {
        // Username not found
        showFieldError('username', 'Incorrect username');
        showMessage('Login failed: incorrect username', 'error');
        return;
    }

    if (userByName.password !== password.value) {
        // Password mismatch
        showFieldError('password', 'Incorrect password');
        showMessage('Login failed: incorrect password', 'error');
        return;
    }

    // Successful login
    currentUser = userByName.username;
    clearFieldErrors();
    // Determine if this user is a returning user (has played or has saved progress)
    const progressStore = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    const hasProgress = !!progressStore[currentUser];
    const isReturning = (userByName.gamesPlayed && userByName.gamesPlayed > 0) || hasProgress;

    loginSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    loadUserProgress();
    updateBestTime();
    updateLeaderboard();
    initGame();

    // Show welcome-back animation for returning users
    if (isReturning) {
        showWelcomeBack(currentUser);
    }
});

registerBtn.addEventListener('click', () => {
    // clear old field errors
    clearFieldErrors();

    if (username.value && password.value) {
        const users = getUsers();
        if (users.some(u => u.username === username.value)) {
            showMessage('Username already exists', 'error');
            return;
        }
        users.push({
            username: username.value,
            password: password.value,
            bestTime: null
        });
        saveUsers(users);
        showMessage('Registration successful! You can now login.', 'success');
        username.value = '';
        password.value = '';
    } else {
        showMessage('Please enter both username and password', 'error');
    }
});

logoutBtn.addEventListener('click', () => {
    loginSection.classList.remove('hidden');
    gameSection.classList.add('hidden');
    resetGame();
});

// Game Functionality
function initGame() {
    // Initialize with some numbers
    const initialBoard = generateValidBoard();
    // Remove some numbers to create puzzle
    createPuzzle(initialBoard);
    updateDisplay();
}

function generateValidBoard() {
    // Generate a valid 3x3 Sudoku solution
    const board = [
        [1, 2, 3],
        [2, 3, 1],
        [3, 1, 2]
    ];
    return board;
}

function createPuzzle(board) {
    // Copy the solution
    gameBoard = board.map(row => [...row]);
    
    // Remove some numbers randomly
    const cellsToRemove = 4; // Adjust difficulty by changing this number
    for (let i = 0; i < cellsToRemove; i++) {
        const row = Math.floor(Math.random() * 3);
        const col = Math.floor(Math.random() * 3);
        if (gameBoard[row][col] !== 0) {
            gameBoard[row][col] = 0;
        } else {
            i--; // Try again if cell was already empty
        }
    }
}

function updateDisplay() {
    cells.forEach(cell => {
        const [row, col] = cell.dataset.cell.split('-').map(Number);
        const value = gameBoard[row][col];
        cell.textContent = value || '';
        cell.classList.toggle('filled', value !== 0);
    });
}

// Cell Selection
cells.forEach(cell => {
    cell.addEventListener('click', () => {
        cells.forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        selectedCell = cell;
    });
});

// Number Input
numbers.forEach(btn => {
    btn.addEventListener('click', () => {
        if (selectedCell) {
            const [row, col] = selectedCell.dataset.cell.split('-').map(Number);
            const number = parseInt(btn.dataset.number);
            gameBoard[row][col] = number;
            updateDisplay();
        }
    });
});

// Check Solution
function checkSolution() {
    // Check rows
    for (let row of gameBoard) {
        const numbers = row.filter(n => n !== 0);
        if (new Set(numbers).size !== numbers.length) return false;
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
        const numbers = gameBoard.map(row => row[col]).filter(n => n !== 0);
        if (new Set(numbers).size !== numbers.length) return false;
    }

    // Check if board is complete
    const isFull = gameBoard.every(row => row.every(cell => cell !== 0));
    return isFull;
}

checkBtn.addEventListener('click', () => {
    if (checkSolution()) {
        stopTimer();
        // Show success message and math celebration
        showMessage('Congratulations! Puzzle solved correctly!', 'success');
        showMathCelebration();

        // Record the completed game
        addGameToHistory(currentTime, true);
        saveBestTime();
    } else {
        message.textContent = 'Not quite right. Keep trying!';
        message.style.color = '#f44336';
    }
});

// --- Field error helpers ---
function showFieldError(fieldId, text) {
    const el = document.getElementById(`${fieldId}-error`);
    const input = document.getElementById(fieldId);
    if (el) el.textContent = text;
    if (input) input.classList.add('error');
}

function clearFieldErrors() {
    ['username', 'password'].forEach(id => {
        const el = document.getElementById(`${id}-error`);
        const input = document.getElementById(id);
        if (el) el.textContent = '';
        if (input) input.classList.remove('error');
    });
}

// --- Math celebration ---
function showMathCelebration() {
    const container = document.getElementById('math-celebration');
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('hidden');
    container.setAttribute('aria-hidden', 'false');

    // Prepare an offscreen canvas to render the letters 'CM' and sample pixel points
    const rect = container.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(180, Math.floor(rect.height));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw big 'CM' text to sample points
    ctx.clearRect(0, 0, width, height);
    const fontSize = Math.floor(height * 0.72);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CM', width / 2, height / 2 + fontSize * 0.05);

    // Sample points where text was drawn (alpha > threshold)
    const img = ctx.getImageData(0, 0, width, height).data;
    const points = [];
    const sampleStep = 6; // increases makes fewer points
    for (let y = 0; y < height; y += sampleStep) {
        for (let x = 0; x < width; x += sampleStep) {
            const idx = (y * width + x) * 4;
            if (img[idx + 3] > 128) {
                points.push({ x, y });
            }
        }
    }

    if (points.length === 0) {
        // Fallback simple celebration if sampling failed
        const fallbackSymbols = ['π','Σ','√','∞','≈','∑','θ','∆','∫','±'];
        for (let i = 0; i < 20; i++) {
            const span = document.createElement('span');
            span.className = 'math-symbol';
            span.textContent = fallbackSymbols[Math.floor(Math.random() * fallbackSymbols.length)];
            span.style.left = (10 + Math.random() * 80) + '%';
            span.style.top = (30 + Math.random() * 50) + '%';
            span.style.fontSize = (18 + Math.random() * 32) + 'px';
            container.appendChild(span);
        }
        setTimeout(() => {
            container.classList.add('hidden');
            container.innerHTML = '';
            container.setAttribute('aria-hidden', 'true');
        }, 3800);
        return;
    }

    // Shuffle points and pick a limited number
    for (let i = points.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [points[i], points[j]] = [points[j], points[i]];
    }
    const count = Math.min(220, points.length);
    const chosen = points.slice(0, count);

    const symbols = ['π','Σ','√','∞','≈','∑','θ','∆','∫','±','α','β','γ','λ','∂'];

    // Create symbol elements at random starting positions (bottom area)
    const spans = [];
    for (let i = 0; i < chosen.length; i++) {
        const p = chosen[i];
        const span = document.createElement('span');
        span.className = 'math-symbol';
        span.textContent = symbols[Math.floor(Math.random() * symbols.length)];

        // start near bottom at random x
        const startLeft = Math.random() * (rect.width - 20);
        const startTop = rect.height - 10 + Math.random() * 40; // slightly below
        span.style.left = startLeft + 'px';
        span.style.top = startTop + 'px';
        span.style.fontSize = (14 + Math.random() * 26) + 'px';
        span.style.opacity = '0';
        container.appendChild(span);
        spans.push({ el: span, target: p });
    }

    // Trigger an initial floating reveal (fade in + float) then move to letter targets
    // Small random delays make motion organic
    spans.forEach((s, i) => {
        const delay = Math.random() * 500; // ms
        setTimeout(() => {
            s.el.style.transition = `opacity 300ms ease, transform 1200ms cubic-bezier(.2,.9,.2,1)`;
            s.el.style.opacity = '1';
            s.el.style.transform = `translateY(-${80 + Math.random() * 60}px) rotate(${(-30 + Math.random() * 60)}deg)`;
        }, delay);
    });

    // After a short float, converge to the sampled 'CM' points
    setTimeout(() => {
        spans.forEach((s, i) => {
            const target = s.target;
            // map canvas coords to container coords
            const tx = (target.x / width) * rect.width;
            const ty = (target.y / height) * rect.height;

            // apply transition and move
            const dur = 900 + Math.random() * 800; // ms
            s.el.style.transition = `left ${dur}ms cubic-bezier(.2,.9,.2,1), top ${dur}ms cubic-bezier(.2,.9,.2,1), transform ${dur}ms ease, opacity 600ms ease`;
            // set final position and scale down slightly
            s.el.style.left = tx + 'px';
            s.el.style.top = ty + 'px';
            s.el.style.transform = `translateY(0) scale(${0.8 + Math.random() * 0.4}) rotate(${(-20 + Math.random() * 40)}deg)`;
        });

        // show a clean big 'CM' briefly on top
        const finalText = document.createElement('div');
        finalText.className = 'math-final-text';
        finalText.textContent = 'CM';
        container.appendChild(finalText);

        // Remove everything after a short delay
        setTimeout(() => {
            container.classList.add('hidden');
            container.innerHTML = '';
            container.setAttribute('aria-hidden', 'true');
        }, 2200);
    }, 900);
}

// Reset Game
// Timer Functions
function startTimer() {
    startTime = Date.now() - currentTime;
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimer() {
    currentTime = Date.now() - startTime;
    currentTimeDisplay.textContent = formatTime(currentTime);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Progress Management
function saveProgress() {
    if (!currentUser) return;
    
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    progress[currentUser] = {
        board: gameBoard,
        time: currentTime,
        date: new Date().toISOString()
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    showMessage('Progress saved!', 'success');
}

function loadUserProgress() {
    if (!currentUser) return;
    
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    const userProgress = progress[currentUser];
    
    if (userProgress) {
        gameBoard = userProgress.board;
        currentTime = userProgress.time;
        updateDisplay();
        showMessage('Progress loaded!', 'success');
        startTimer();
    } else {
        resetGame();
    }
}

function updateBestTime() {
    if (!currentUser) return;
    
    const users = getUsers();
    const user = users.find(u => u.username === currentUser);
    if (user && user.bestTime) {
        bestTimeDisplay.textContent = `Best Time: ${formatTime(user.bestTime)}`;
    } else {
        bestTimeDisplay.textContent = 'No best time yet';
    }
}

function saveBestTime() {
    if (!currentUser) return;
    
    const users = getUsers();
    const user = users.find(u => u.username === currentUser);
    if (user) {
        if (!user.bestTime || currentTime < user.bestTime) {
            const previous = user.bestTime;
            user.bestTime = currentTime;
            saveUsers(users);
            updateBestTime();
            updateLeaderboard();
            // Show high-score popup with emoji
            showHighScorePopup(user.username, currentTime, previous);
            showMessage('New best time!', 'success');
        }
    }
}

// High-score popup helper
function showHighScorePopup(usernameStr, timeMs, previousTime) {
    const popup = document.getElementById('highscore-popup');
    if (!popup) return;
    const box = popup.querySelector('.highscore-box');
    const timeEl = popup.querySelector('#highscore-time');
    const emoji = popup.querySelector('.highscore-emoji');
    if (!box || !timeEl) return;

    timeEl.textContent = formatTime(timeMs);

    // Show popup
    popup.classList.remove('hidden');
    popup.setAttribute('aria-hidden', 'false');
    // small delay to allow CSS transition
    requestAnimationFrame(() => box.classList.add('show'));

    // Create a few tiny confetti dots around the popup
    const confettiCount = 8;
    const confettiEls = [];
    for (let i = 0; i < confettiCount; i++) {
        const c = document.createElement('div');
        c.className = 'highscore-confetti';
        // random color from accent palette
        const colors = ['#7b6cff', '#00d4ff', '#ffd166', '#ff6b6b', '#9be15d'];
        c.style.background = colors[i % colors.length];
        // random position near the box
        const left = (50 + (Math.random() * 220 - 110));
        const top = (20 + Math.random() * 14);
        c.style.left = `calc(50% + ${left / 10}px)`;
        c.style.top = `${top}px`;
        popup.appendChild(c);
        confettiEls.push(c);
    }

    // Auto-dismiss after short time
    setTimeout(() => {
        box.classList.remove('show');
        // animate confetti fade
        confettiEls.forEach(el => el.style.opacity = '0');
        setTimeout(() => {
            popup.classList.add('hidden');
            popup.setAttribute('aria-hidden', 'true');
            // cleanup confetti
            confettiEls.forEach(el => el.remove());
        }, 420);
    }, 1800);
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
    setTimeout(() => {
        message.textContent = '';
        message.className = 'message';
    }, 3000);
}

function resetGame() {
    selectedCell = null;
    cells.forEach(cell => {
        cell.classList.remove('selected');
    });
    stopTimer();
    currentTime = 0;
    currentTimeDisplay.textContent = formatTime(0);
    initGame();
    startTimer();
    message.textContent = '';
}

// Welcome-back overlay
function showWelcomeBack(name) {
    const overlay = document.getElementById('welcome-overlay');
    const box = overlay && overlay.querySelector('.welcome-box');
    if (!overlay || !box) return;

    // Create a small math glyph randomly
    const glyphs = ['π','Σ','√','∞','≈','∑','θ','∆'];
    const glyph = document.createElement('span');
    glyph.className = 'welcome-glyph';
    glyph.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];

    // Set the message
    box.innerHTML = '';
    box.appendChild(glyph);
    const text = document.createElement('span');
    text.textContent = `Welcome back, ${name}!`;
    box.appendChild(text);

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');

    // Animate in
    requestAnimationFrame(() => {
        box.classList.add('show');
    });

    // Auto-dismiss after a short interval
    setTimeout(() => {
        box.classList.remove('show');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            box.innerHTML = '';
        }, 420);
    }, 1800);
}

// Event Listeners
resetBtn.addEventListener('click', resetGame);
logoutBtn.addEventListener('click', () => {
    stopTimer();
    saveProgress();
    currentUser = null;
    loginSection.classList.remove('hidden');
    gameSection.classList.add('hidden');
    username.value = '';
    password.value = '';
});
