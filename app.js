// --- CATALOG ---
const catalog = [
    {
        id: "fbla-cps-2025-2026",
        title: "Computer Problem Solving",
        description: "FBLA Objective Test • 2025-2026 Guidelines",
        timeLimitSeconds: 3000,
        file: "data/fbla-computer-problem-solving.json",
        color: "bg-blue-600",
        icon: "💻"
    },
    {
        id: "fbla-cyber-2025-2026",
        title: "Cybersecurity",
        description: "FBLA Objective Test • Network Security & Defense",
        timeLimitSeconds: 3000,
        file: "data/cybersecurity.json",
        color: "bg-emerald-600",
        icon: "🔒"
    },
    {
        id: "fbla-it-2025-2026",
        title: "Introduction to Information Technology",
        description: "FBLA Objective Test • IT Basics & Systems",
        timeLimitSeconds: 3000,
        file: "data/intro-to-it.json",
        color: "bg-indigo-600",
        icon: "🌐"
    },
    {
        id: "fbla-law-2025-2026",
        title: "Business Law",
        description: "FBLA Objective Test • Legal Environment",
        timeLimitSeconds: 3000,
        file: "data/business-law.json",
        color: "bg-slate-700",
        icon: "⚖️"
    },
    {
        id: "fbla-ent-2025-2026",
        title: "Entrepreneurship",
        description: "FBLA Objective Test • Business Creation",
        timeLimitSeconds: 3000,
        file: "data/entrepreneurship.json",
        color: "bg-amber-600",
        icon: "🚀"
    },
    {
        id: "fbla-accounting-2025-2026",
        title: "Accounting",
        description: "FBLA Objective Test • Financial Statements & Transactions",
        timeLimitSeconds: 3000,
        file: "data/accounting.json",
        color: "bg-green-600",
        icon: "📊"
    },
    {
        id: "fbla-banking-2025-2026",
        title: "Banking & Financial Systems",
        description: "FBLA Objective Test • Banking Operations & Regulations",
        timeLimitSeconds: 3000,
        file: "data/banking-financial-systems.json",
        color: "bg-cyan-600",
        icon: "🏦"
    },
    {
        id: "fbla-ethics-2025-2026",
        title: "Business Ethics",
        description: "FBLA Objective Test • Ethics & Professional Conduct",
        timeLimitSeconds: 3000,
        file: "data/business-ethics.json",
        color: "bg-purple-600",
        icon: "🤝"
    },
    {
        id: "fbla-datascience-ai-2025-2026",
        title: "Data Science & AI",
        description: "FBLA Objective Test • Data Analysis & Machine Learning",
        timeLimitSeconds: 3000,
        file: "data/data-science-ai.json",
        color: "bg-rose-600",
        icon: "🤖"
    },
    {
        id: "fbla-intl-business-2025-2026",
        title: "International Business",
        description: "FBLA Objective Test • Global Trade & Cross-Cultural Business",
        timeLimitSeconds: 3000,
        file: "data/international-business.json",
        color: "bg-orange-600",
        icon: "🌍"
    }
];

// --- APP STATE ---
let currentTest = null;
let questionsSource = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let startTime;
let finalTimeStr = "";
let timeLeft = 3000;
let userAnswers = [];
let flaggedQuestions = [];

// --- DOM ELEMENTS ---
const startScreen = document.getElementById('start-screen');
const quizInterface = document.getElementById('quiz-interface');
const reviewScreen = document.getElementById('review-screen');
const resultsScreen = document.getElementById('results-screen');
const timerDisplay = document.getElementById('timer-display');
const reviewTimer = document.getElementById('review-timer');
const reviewNavBtn = document.getElementById('review-nav-btn');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressBar = document.getElementById('progress-bar');
const questionTracker = document.getElementById('question-tracker');
const categoryBadge = document.getElementById('category-badge');
const flagBtn = document.getElementById('flag-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

const jsonUpload = document.getElementById('json-upload');
const catalogGrid = document.getElementById('catalog-grid');
const testDetailsContainer = document.getElementById('test-details-container');

// Details Elements
const selectedTestIcon = document.getElementById('selected-test-icon');
const selectedTestTitle = document.getElementById('selected-test-title');
const selectedTestDescription = document.getElementById('selected-test-description');
const selectedTestCount = document.getElementById('selected-test-count');
const selectedTestTime = document.getElementById('selected-test-time');
const testCategoryTags = document.getElementById('test-category-tags');

const startError = document.getElementById('start-error');

// --- UI INIT ---
function initializeApp() {
    // Verify DOM elements exist
    if (!catalogGrid || !startScreen) {
        console.error("Required DOM elements not found. Retrying...");
        setTimeout(initializeApp, 100);
        return;
    }
    initializeTheme();
    renderCatalog();
    setupEventListeners();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// --- THEME SYSTEM ---
function initializeTheme() {
    const savedTheme = localStorage.getItem('motest-theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('motest-theme', theme);
    updateThemeIcons(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function updateThemeIcons(theme) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }
}

function setupEventListeners() {
    if (jsonUpload) {
        jsonUpload.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const raw = JSON.parse(text);
                const test = normalizeTestData(raw, file.name.replace(/\.json$/i, ""));
                validateQuestions(test.questions);
                setCurrentTest(test, { 
                    sourceLabel: "Upload", 
                    description: "Custom uploaded test file.",
                    icon: "📂",
                    color: "text-blue-600"
                });
            } catch (err) {
                alert("Upload failed. Please check your JSON format."); 
                console.error(err);
            } finally {
                jsonUpload.value = "";
            }
        });
    }

    // Search/Filter Listeners
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');

    if (searchInput) searchInput.addEventListener('input', filterResults);
    if (statusFilter) statusFilter.addEventListener('change', filterResults);
    if (categoryFilter) categoryFilter.addEventListener('change', filterResults);
}

// --- KEYBOARD LISTENERS ---
document.addEventListener('keydown', (e) => {
    if (quizInterface && !quizInterface.classList.contains('hidden')) {
        if (e.key >= '1' && e.key <= '4') {
            const position = parseInt(e.key, 10) - 1; // 0-3 for positions 1-4
            const buttons = optionsContainer.children;
            if (position < buttons.length) {
                // Get the original index from the button at this visual position
                const originalIdx = parseInt(buttons[position].dataset.originalIdx);
                selectAnswer(originalIdx);
            }
        }
        if (e.key === 'Enter') {
            nextQuestion();
        }
    }
});

function closeTestDetails() {
    if (testDetailsContainer) testDetailsContainer.classList.add('hidden');
    if (testDetailsContainer) testDetailsContainer.classList.remove('fade-in-up');
    if (catalogGrid) catalogGrid.classList.remove('hidden');
    if (catalogGrid) catalogGrid.classList.add('fade-in-page');
    currentTest = null;
}
window.closeTestDetails = closeTestDetails;

// --- FUNCTIONS ---
function renderCatalog() {
    if (!catalogGrid) return;
    
    catalogGrid.innerHTML = '';
    catalog.forEach((item) => {
        const div = document.createElement('div');
        div.className = "bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer group flex flex-col h-full";
        div.onclick = () => loadCatalogTest(item);
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-xl ${item.color || 'bg-blue-600'} bg-opacity-10 text-2xl flex items-center justify-center">
                    ${item.icon || '📝'}
                </div>
                <span class="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Catalog</span>
            </div>
            <h3 class="font-bold text-slate-800 text-lg mb-2 group-hover:text-blue-600 transition">${item.title}</h3>
            <p class="text-slate-500 text-sm mb-4 line-clamp-2">${item.description}</p>
            <div class="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>100 Qs</span>
                <span>${Math.round(item.timeLimitSeconds / 60)} min</span>
            </div>
        `;
        catalogGrid.appendChild(div);
    });
}

async function loadCatalogTest(item) {
    try {
        showStartError("");
        const res = await fetch(item.file);
        if (!res.ok) throw new Error(`Failed to load ${item.file}`);
        const raw = await res.json();
        const test = normalizeTestData(raw, item.title);
        // Ensure meta description from catalog overwrites json if json is empty
        if(!test.description) test.description = item.description;
        
        validateQuestions(test.questions);
        setCurrentTest(test, { 
            sourceLabel: "Catalog",
            icon: item.icon,
            color: item.color,
            description: item.description 
        });
    } catch (err) {
        showStartError("Could not load the catalog test. Please try again.");
        console.error(err);
    }
}

function normalizeTestData(raw, fallbackTitle) {
    if (Array.isArray(raw)) {
        return {
            title: fallbackTitle || "Custom Test",
            description: "",
            timeLimitSeconds: 3000,
            questions: raw
        };
    }

    if (raw && Array.isArray(raw.questions)) {
        return {
            title: raw.title || fallbackTitle || "Custom Test",
            description: raw.description || "",
            timeLimitSeconds: Number.isFinite(raw.timeLimitSeconds) ? raw.timeLimitSeconds : 3000,
            questions: raw.questions
        };
    }

    throw new Error("Invalid test format");
}

function validateQuestions(questionsToCheck) {
    if (!Array.isArray(questionsToCheck) || questionsToCheck.length === 0) {
        throw new Error("No questions found");
    }

    questionsToCheck.forEach((q, idx) => {
        if (!q || typeof q.text !== 'string' || !Array.isArray(q.options)) {
            throw new Error(`Invalid question at index ${idx}`);
        }
        if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
            throw new Error(`Invalid correct answer index at ${idx}`);
        }
    });
}

function setCurrentTest(test, { sourceLabel, icon, color, description }) {
    currentTest = test;
    questionsSource = test.questions;

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.disabled = questionsSource.length === 0;
    
    // Toggle Views
    catalogGrid.classList.add('hidden');
    testDetailsContainer.classList.remove('hidden');
    testDetailsContainer.classList.add('fade-in-up');

    // Populate Details
    selectedTestTitle.textContent = test.title;
    selectedTestDescription.textContent = description || test.description || "No description available.";
    
    selectedTestIcon.textContent = icon || "📝";
    if (color) {
        selectedTestIcon.className = `text-3xl ${color.replace('bg-', 'text-')}`; // crude mapping, better to pass text color
    } else {
        selectedTestIcon.className = "text-3xl text-blue-600";
    }

    selectedTestCount.textContent = questionsSource.length;
    selectedTestTime.textContent = formatDuration(test.timeLimitSeconds || 3000);

    // Tags
    const counts = {};
    questionsSource.forEach(q => counts[q.category] = (counts[q.category] || 0) + 1);
    
    testCategoryTags.innerHTML = '';
    Object.keys(counts).sort().forEach(cat => {
        const span = document.createElement('span');
        span.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800";
        span.textContent = `${cat} (${counts[cat]})`;
        testCategoryTags.appendChild(span);
    });

    // Ensure start button is enabled
    const startBtnElem = document.getElementById('start-btn');
    if (startBtnElem) {
        startBtnElem.disabled = false;
    }

    showStartError("");
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    return `${minutes}m ${remainingSeconds}s`;
}

function showStartError(message) {
    if (!message) {
        startError.classList.add('hidden');
        startError.textContent = "";
        return;
    }
    startError.textContent = message;
    startError.classList.remove('hidden');
}

function startQuiz() {
    if (!currentTest || questionsSource.length === 0) {
        showStartError("Select a test before starting the exam.");
        return;
    }

    // Randomize entire pool and select up to 100 questions
    const shuffled = [...questionsSource].sort(() => Math.random() - 0.5);
    questions = shuffled.slice(0, 100);

    // Reset
    userAnswers = new Array(questions.length).fill(null);
    flaggedQuestions = new Array(questions.length).fill(false);
    currentQuestionIndex = 0;
    timeLeft = currentTest.timeLimitSeconds || 3000;
    startTime = Date.now();

    startScreen.classList.add('hidden');
    quizInterface.classList.remove('hidden');
    timerDisplay.classList.remove('hidden');
    reviewNavBtn.classList.remove('hidden');

    renderQuestion();
    startTimer();
}

function startTimer() {
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    timerDisplay.textContent = timeStr;
    reviewTimer.textContent = timeStr;

    if (timeLeft < 300) {
        timerDisplay.classList.remove('bg-blue-950/50', 'border-blue-800');
        timerDisplay.classList.add('bg-red-900/80', 'border-red-600', 'text-red-100');
    }
}

function renderQuestion() {
    const q = questions[currentQuestionIndex];

    questionText.textContent = `${currentQuestionIndex + 1}. ${q.text}`;
    categoryBadge.textContent = q.category;

    questionTracker.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    updateFlagButtonUI();

    optionsContainer.innerHTML = '';
    // Create shuffled indices for options
    const optionIndices = [...q.options.keys()].sort(() => Math.random() - 0.5);
    const optionMap = {}; // Maps shuffled position to original index
    
    optionIndices.forEach((originalIdx, shuffledIdx) => {
        optionMap[shuffledIdx] = originalIdx;
    });
    
    optionIndices.forEach((originalIdx, shuffledIdx) => {
        const opt = q.options[originalIdx];
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-4 sm:p-5 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center group outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 relative overflow-hidden";
        
        // Store the shuffled position for later reference
        btn.dataset.shuffledIdx = shuffledIdx;
        btn.dataset.originalIdx = originalIdx;

        if (userAnswers[currentQuestionIndex] === originalIdx) {
            btn.classList.add('border-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
            btn.classList.remove('border-slate-100');
        }

        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full border-2 border-slate-300 mr-4 flex items-center justify-center group-hover:border-blue-500 font-bold text-sm text-slate-400 shrink-0 bg-white transition-colors z-10">
                ${userAnswers[currentQuestionIndex] === originalIdx ? '<div class="w-4 h-4 bg-blue-600 rounded-full"></div>' : (shuffledIdx + 1)}
            </div>
            <span class="text-slate-700 font-medium text-base sm:text-lg z-10">${opt}</span>
        `;

        btn.onclick = () => selectAnswer(originalIdx);
        optionsContainer.appendChild(btn);
    });

    prevBtn.disabled = currentQuestionIndex === 0;

    if (currentQuestionIndex === questions.length - 1) {
        nextBtn.textContent = "Review Answers";
        nextBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        nextBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    } else {
        nextBtn.textContent = "Next";
        nextBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        nextBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
    }
}

function selectAnswer(index) {
    userAnswers[currentQuestionIndex] = index;
    const buttons = optionsContainer.children;
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const indicator = btn.querySelector('div');
        const originalIdx = parseInt(btn.dataset.originalIdx);
        const shuffledIdx = parseInt(btn.dataset.shuffledIdx);

        if (originalIdx === index) {
            btn.classList.add('border-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
            btn.classList.remove('border-slate-100');
            indicator.innerHTML = '<div class="w-4 h-4 bg-blue-600 rounded-full"></div>';
        } else {
            btn.classList.remove('border-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
            btn.classList.add('border-slate-100');
            // Show the correct shuffled position number
            indicator.innerHTML = (shuffledIdx + 1);
        }
    }
}

function toggleFlag() {
    flaggedQuestions[currentQuestionIndex] = !flaggedQuestions[currentQuestionIndex];
    updateFlagButtonUI();
}

function updateFlagButtonUI() {
    if (flaggedQuestions[currentQuestionIndex]) {
        flagBtn.classList.add('text-orange-600', 'bg-orange-50', 'border-orange-200');
        flagBtn.classList.remove('text-slate-500', 'border-transparent');
        flagBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd" />
            </svg> Flagged
        `;
    } else {
        flagBtn.classList.remove('text-orange-600', 'bg-orange-50', 'border-orange-200');
        flagBtn.classList.add('text-slate-500', 'border-transparent');
        flagBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-8a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5-5 5h-11z" />
            </svg> Flag
        `;
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        showReviewScreen();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function showReviewScreen() {
    quizInterface.classList.add('hidden');
    reviewScreen.classList.remove('hidden');

    const grid = document.getElementById('review-grid');
    grid.innerHTML = '';

    questions.forEach((q, i) => {
        const btn = document.createElement('button');
        btn.textContent = i + 1;

        let classes = "grid-btn h-10 w-full rounded-md font-bold text-sm border ";

        if (userAnswers[i] !== null) {
            classes += "bg-blue-600 text-white border-blue-700";
        } else {
            classes += "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200";
        }

        if (flaggedQuestions[i]) {
            btn.innerHTML += '<span class="flag-dot"></span>';
            if (userAnswers[i] === null) {
                classes = "grid-btn h-10 w-full rounded-md font-bold text-sm border bg-orange-50 text-orange-800 border-orange-200";
                btn.innerHTML = (i + 1) + '<span class="flag-dot"></span>';
            }
        }

        btn.className = classes;
        btn.onclick = () => jumpToQuestion(i);
        grid.appendChild(btn);
    });
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    reviewScreen.classList.add('hidden');
    quizInterface.classList.remove('hidden');
    renderQuestion();
}

function returnToQuiz() {
    reviewScreen.classList.add('hidden');
    quizInterface.classList.remove('hidden');
}

function finishQuiz() {
    clearInterval(timerInterval);

    const endTime = Date.now();
    const timeDiff = endTime - startTime;
    const minutes = Math.floor(timeDiff / 60000);
    const seconds = ((timeDiff % 60000) / 1000).toFixed(0);
    finalTimeStr = `${minutes}m ${seconds}s`;

    score = 0;
    const categoryScores = {};

    questions.forEach((q, i) => {
        if (!categoryScores[q.category]) {
            categoryScores[q.category] = { correct: 0, total: 0 };
        }
        categoryScores[q.category].total++;

        if (userAnswers[i] === q.correct) {
            score++;
            categoryScores[q.category].correct++;
        }
    });

    reviewScreen.classList.add('hidden');
    quizInterface.classList.add('hidden');
    timerDisplay.classList.add('hidden');
    reviewNavBtn.classList.add('hidden');
    resultsScreen.classList.remove('hidden');

    document.getElementById('final-score').textContent = Math.round((score / questions.length) * 100) + "%";
    document.getElementById('score-details').textContent = `${score}/${questions.length}`;
    document.getElementById('time-taken-display').textContent = finalTimeStr;

    const breakdownContainer = document.getElementById('category-breakdown');
    breakdownContainer.innerHTML = '';

    const catFilter = document.getElementById('category-filter');
    catFilter.innerHTML = '<option value="all">All Categories</option>';

    const sortedCats = Object.keys(categoryScores).sort();

    for (const cat of sortedCats) {
        const stats = categoryScores[cat];
        const percentage = Math.round((stats.correct / stats.total) * 100);
        const barColor = percentage >= 70 ? 'bg-green-500' : (percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500');

        breakdownContainer.innerHTML += `
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-slate-700 text-sm truncate pr-2">${cat}</span>
                    <span class="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">${stats.correct}/${stats.total}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2">
                    <div class="${barColor} h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;

        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catFilter.appendChild(opt);
    }

    renderDetailedReview();
}

function renderDetailedReview() {
    const container = document.getElementById('detailed-review');
    container.innerHTML = '';

    questions.forEach((q, i) => {
        const userAnswerIdx = userAnswers[i];
        const isCorrect = userAnswerIdx === q.correct;
        const isUnanswered = userAnswerIdx === null;
        const isFlagged = flaggedQuestions[i];

        const card = document.createElement('div');
        card.className = "p-5 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md fade-in-up";
        card.style.animationDelay = `${i * 0.02}s`;

        card.dataset.status = isCorrect ? 'correct' : 'incorrect';
        if (isFlagged) card.dataset.flagged = 'true';
        card.dataset.category = q.category;
        card.dataset.text = q.text.toLowerCase();

        if (isCorrect) {
            card.classList.add('border-green-200', 'bg-green-50/30');
        } else {
            card.classList.add('border-red-200', 'bg-red-50/30');
        }

        const statusBadge = isCorrect
            ? `<span class="inline-flex items-center gap-1 text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded text-xs">✓ Correct</span>`
            : `<span class="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded text-xs">✗ Incorrect</span>`;

        const flagBadge = isFlagged ? `<span class="text-orange-500 ml-2" title="Flagged">●</span>` : '';

        const userAnswerText = isUnanswered ? `<span class="text-slate-400 italic">Skipped</span>` : q.options[userAnswerIdx];
        const correctAnswerText = q.options[q.correct];

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="font-mono text-slate-400 text-xs font-bold uppercase tracking-wider">Question ${i + 1} ${flagBadge}</span>
                ${statusBadge}
            </div>
            <p class="text-slate-800 font-semibold mb-4 text-lg">${q.text}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div class="p-3 rounded-lg ${isCorrect ? 'bg-green-100/50 border border-green-200' : 'bg-red-100/50 border border-red-200'}">
                    <span class="block text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Your Answer</span>
                    <span class="${isCorrect ? 'text-green-900' : 'text-red-900'} font-medium">${userAnswerText}</span>
                </div>
                ${!isCorrect ? `
                <div class="p-3 rounded-lg bg-green-100/50 border border-green-200">
                    <span class="block text-xs font-bold uppercase tracking-wide text-green-800 opacity-70 mb-1">Correct Answer</span>
                    <span class="text-green-900 font-medium">${correctAnswerText}</span>
                </div>` : ''}
            </div>
            <div class="mt-2 text-right">
                <span class="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">${q.category}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterResults() {
    const searchText = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const categoryValue = categoryFilter.value;

    const cards = document.querySelectorAll('#detailed-review > div');

    cards.forEach(card => {
        const text = card.dataset.text;
        const category = card.dataset.category;
        const status = card.dataset.status;
        const isFlagged = card.dataset.flagged === 'true';

        const matchesSearch = text.includes(searchText);
        const matchesCategory = categoryValue === 'all' || category === categoryValue;

        let matchesStatus = true;
        if (statusValue === 'incorrect') matchesStatus = status === 'incorrect';
        if (statusValue === 'correct') matchesStatus = status === 'correct';
        if (statusValue === 'flagged') matchesStatus = isFlagged;

        if (matchesSearch && matchesCategory && matchesStatus) {
            card.classList.remove('hidden');
            card.classList.add('fade-in-up');
        } else {
            card.classList.add('hidden');
            card.classList.remove('fade-in-up');
        }
    });
}

function returnHome() {
    // Reset state
    currentTest = null;
    questionsSource = [];
    questions = [];
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    flaggedQuestions = [];
    clearInterval(timerInterval);
    
    // Show start screen
    resultsScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    timerDisplay.classList.add('hidden');
    reviewNavBtn.classList.add('hidden');
    testDetailsContainer.classList.add('hidden');
    catalogGrid.classList.remove('hidden');
}
window.returnHome = returnHome;

function exportScore() {
    const percentage = Math.round((score / questions.length) * 100);
    const textContent = `FBLA Mock Exam Results\n\nTest: ${currentTest.title}\nScore: ${score}/${questions.length} (${percentage}%)\nTime Taken: ${finalTimeStr}\nQuestions: ${questions.length}\nDate: ${new Date().toLocaleDateString()}\n\nCategory Breakdown:\n`;
    
    const categoryScores = {};
    questions.forEach((q, i) => {
        if (!categoryScores[q.category]) {
            categoryScores[q.category] = { correct: 0, total: 0 };
        }
        categoryScores[q.category].total++;
        if (userAnswers[i] === q.correct) {
            categoryScores[q.category].correct++;
        }
    });
    
    let fullText = textContent;
    Object.keys(categoryScores).sort().forEach(cat => {
        const stats = categoryScores[cat];
        const percentage = Math.round((stats.correct / stats.total) * 100);
        fullText += `${cat}: ${stats.correct}/${stats.total} (${percentage}%)\n`;
    });
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FBLA_Mock_Exam_Results_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
window.exportScore = exportScore;
