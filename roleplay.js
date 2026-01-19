/**
 * MoStudy Role Play Practice
 * Interactive FBLA role play practice with AI-generated scenarios and judging
 */

// ==================== CONFIGURATION ====================

const AI_API_ENDPOINT = "/api/ai/chat";
const AI_MODEL = "moonshotai/kimi-k2-0905";

// Timer configurations (in seconds)
const PLANNING_TIME = 20 * 60; // 20 minutes
const PRESENTATION_TIME = 7 * 60; // 7 minutes
const PRESENTATION_WARNING = 1 * 60; // 1 minute warning
const QA_READ_DELAY = 5; // 5 seconds
const QA_TIME = 1 * 60; // 1 minute

// ==================== JUDGE PERSONAS ====================

const JUDGE_POOL = [
    {
        id: 1,
        name: "Dr. Margaret Chen",
        title: "Professor of International Business",
        background: "20 years teaching at Harvard Business School, former trade consultant",
        style: "Analytical and detail-oriented, focuses on theoretical foundations and practical applications"
    },
    {
        id: 2,
        name: "Marcus Williams",
        title: "Senior VP of Global Operations",
        background: "Fortune 500 executive with experience in 15+ countries",
        style: "Results-driven, values clear communication and actionable strategies"
    },
    {
        id: 3,
        name: "Dr. Yuki Tanaka",
        title: "Cross-Cultural Business Consultant",
        background: "Expert in East-West business relations and cultural intelligence",
        style: "Emphasizes cultural awareness and relationship building"
    },
    {
        id: 4,
        name: "Robert Martinez",
        title: "International Trade Attorney",
        background: "Partner at global law firm, specializes in trade compliance",
        style: "Precise and methodical, focuses on legal and regulatory aspects"
    },
    {
        id: 5,
        name: "Sarah O'Brien",
        title: "Entrepreneurship Director",
        background: "Founded three successful international ventures",
        style: "Creative and encouraging, values innovative thinking and risk assessment"
    },
    {
        id: 6,
        name: "Dr. Kwame Asante",
        title: "Emerging Markets Economist",
        background: "World Bank advisor, expert in developing economies",
        style: "Data-focused, emphasizes economic analysis and market understanding"
    },
    {
        id: 7,
        name: "Jennifer Park",
        title: "Supply Chain Director",
        background: "Managed global logistics for major retail chains",
        style: "Practical and process-oriented, values operational efficiency"
    },
    {
        id: 8,
        name: "David Thompson",
        title: "Business Education Specialist",
        background: "15 years as FBLA advisor, state-level competition coordinator",
        style: "Student-focused, balances encouragement with constructive criticism"
    },
    {
        id: 9,
        name: "Dr. Aisha Patel",
        title: "Global Marketing Professor",
        background: "Authored textbooks on international marketing strategy",
        style: "Strategic thinker, emphasizes market positioning and branding"
    },
    {
        id: 10,
        name: "Michael Chang",
        title: "Venture Capitalist",
        background: "Invested in 50+ international startups",
        style: "Direct and pragmatic, focuses on scalability and market potential"
    }
];

// ==================== FBLA RUBRIC ====================

const FBLA_RUBRIC = {
    categories: [
        {
            name: "Understanding of Role Play & Problem Definition",
            maxPoints: 10,
            levels: [
                { range: "0", description: "No description or role play synopsis provided; no problems defined" },
                { range: "1-6", description: "Describes and provides role play synopsis OR defines the problem(s)" },
                { range: "7-8", description: "Describes and provides role play synopsis AND defines the problem(s)" },
                { range: "9-10", description: "Demonstrates expertise of role play synopsis and problem definition" }
            ]
        },
        {
            name: "Alternatives & Pros/Cons Analysis",
            maxPoints: 20,
            levels: [
                { range: "0", description: "No alternatives identified" },
                { range: "1-9", description: "Alternatives given but pros and/or cons not analyzed" },
                { range: "10-16", description: "At least two alternatives with pros and cons analyzed" },
                { range: "17-20", description: "Multiple alternatives with multiple pros and cons analyzed for each" }
            ]
        },
        {
            name: "Solution & Implementation",
            maxPoints: 20,
            levels: [
                { range: "0", description: "No solution identified" },
                { range: "1-9", description: "Solution provided, but implementation plan not developed" },
                { range: "10-16", description: "Logical solution and implementation plan provided" },
                { range: "17-20", description: "Feasible solution and implementation plan developed; necessary resources identified" }
            ]
        },
        {
            name: "Knowledge Area Application",
            maxPoints: 20,
            levels: [
                { range: "0", description: "No knowledge areas demonstrated" },
                { range: "1-9", description: "One or two knowledge areas demonstrated" },
                { range: "10-16", description: "Three knowledge areas demonstrated" },
                { range: "17-20", description: "Four or more knowledge areas demonstrated" }
            ]
        },
        {
            name: "Organization & Clarity",
            maxPoints: 10,
            levels: [
                { range: "0", description: "Competitor(s) did not appear prepared" },
                { range: "1-6", description: "Prepared, but flow not logical" },
                { range: "7-8", description: "Logical sequence" },
                { range: "9-10", description: "Logical sequence; statements well organized" }
            ]
        },
        {
            name: "Delivery Skills",
            maxPoints: 10,
            levels: [
                { range: "0", description: "Did not demonstrate confidence, body language, eye contact, or voice projection" },
                { range: "1-6", description: "Demonstrated 1-2 skills" },
                { range: "7-8", description: "Demonstrated 3 skills" },
                { range: "9-10", description: "Demonstrated all skills, enhancing presentation" }
            ]
        },
        {
            name: "Question Handling",
            maxPoints: 10,
            levels: [
                { range: "0", description: "Unable to answer questions" },
                { range: "1-6", description: "Does not completely answer questions" },
                { range: "7-8", description: "Completely answers questions" },
                { range: "9-10", description: "Interacts with judges while answering questions" }
            ]
        }
    ],
    totalPoints: 100
};

// ==================== APPLICATION STATE ====================

let appState = {
    // Event data
    currentEvent: null,
    eventExamples: [],
    
    // Generated content
    generatedScenario: null,
    qaQuestions: [],
    
    // User input
    notes: "",
    mainTranscript: "",
    qaTranscript: "",
    
    // Judging
    selectedJudges: [],
    judgeResults: [],
    
    // Timers
    planningTimeLeft: PLANNING_TIME,
    presentationTimeLeft: PRESENTATION_TIME,
    qaTimeLeft: QA_TIME,
    currentTimer: null,
    
    // Speech recognition
    recognition: null,
    isRecording: false
};

// ==================== EVENT CATALOG ====================

// Dynamic event manifest - easily extensible
const EVENT_MANIFEST = [
    {
        id: "international-business",
        title: "International Business",
        description: "Explore global trade, cross-cultural business practices, and international market strategies",
        icon: "🌍",
        color: "bg-orange-600",
        dataPath: "data/roleplay/international-business/",
        overviewFile: "International_Business_eventoverview.md",
        examplesFolder: "examples/",
        exampleCount: 8 // Number of example files
    }
    // Add more events here as they become available
    // {
    //     id: "public-speaking",
    //     title: "Public Speaking",
    //     ...
    // }
];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadEventCatalog();
    initializeSpeechRecognition();
}

function loadEventCatalog() {
    const eventGrid = document.getElementById('event-grid');
    if (!eventGrid) return;
    
    eventGrid.innerHTML = '';
    
    EVENT_MANIFEST.forEach(event => {
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-lg transition cursor-pointer group";
        card.onclick = () => selectEvent(event);
        
        card.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-14 h-14 rounded-xl ${event.color} flex items-center justify-center text-2xl shadow-sm">
                    ${event.icon}
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-600 transition">${event.title}</h3>
                    <p class="text-slate-500 text-sm mb-3">${event.description}</p>
                    <div class="flex items-center gap-4 text-xs text-slate-400">
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            7 min presentation
                        </span>
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            ${event.exampleCount} examples
                        </span>
                    </div>
                </div>
                <svg class="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        `;
        
        eventGrid.appendChild(card);
    });
}

// ==================== EVENT SELECTION & SCENARIO GENERATION ====================

async function selectEvent(event) {
    appState.currentEvent = event;
    
    // Show generation screen
    showScreen('scenario-generation-screen');
    
    try {
        // Load example role plays
        await loadEventExamples(event);
        
        // Generate new scenario
        await generateScenario();
        
        // Select random judges
        selectJudges();
        
        // Show planning screen and start timer
        showScreen('planning-screen');
        displayScenario();
        startPlanningTimer();
        
    } catch (error) {
        console.error('Error starting session:', error);
        
        // Determine error type
        let errorMsg = 'Failed to generate scenario. ';
        
        if (error.message.includes('AI service')) {
            errorMsg += 'The AI service is currently unavailable. Please try again in a moment.';
        } else if (error.message.includes('403') || error.message.includes('Preflight')) {
            errorMsg += 'Connection error with AI service. Please check your network or try again later.';
        } else if (error.message.includes('No examples')) {
            errorMsg += 'No training examples found for this event.';
        } else {
            errorMsg += error.message || 'Please check your internet connection and try again.';
        }
        
        // Show error notification
        showErrorNotification(errorMsg);
        
        // Return to event selection after a delay
        setTimeout(() => {
            showScreen('event-selection-screen');
        }, 3000);
    }
}

function showErrorNotification(message) {
    const errorHtml = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="this.remove();">
            <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 450px; text-align: center; box-shadow: 0 20px 25px rgba(0,0,0,0.15);">
                <div style="width: 3rem; height: 3rem; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #dc2626;">
                    <svg xmlns="http://www.w3.org/2000/svg" style="width: 1.5rem; height: 1.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem;">Unable to Start Session</h3>
                <p style="color: #6b7280; margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.5;">${escapeHtml(message)}</p>
                <button onclick="this.closest('[style*=position]').remove();" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">
                    Dismiss
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorHtml);
}

async function loadEventExamples(event) {
    const examples = [];
    const basePath = event.dataPath + event.examplesFolder;
    
    // Load all example files
    for (let i = 1; i <= event.exampleCount; i++) {
        try {
            const response = await fetch(`${basePath}roleplay-example-${i}.md`);
            if (response.ok) {
                const content = await response.text();
                examples.push(content);
            }
        } catch (e) {
            console.warn(`Could not load example ${i}:`, e);
        }
    }
    
    if (examples.length === 0) {
        throw new Error('No examples found for this event');
    }
    
    appState.eventExamples = examples;
    
    // Also load event overview
    try {
        const overviewResponse = await fetch(event.dataPath + event.overviewFile);
        if (overviewResponse.ok) {
            appState.eventOverview = await overviewResponse.text();
        }
    } catch (e) {
        console.warn('Could not load event overview:', e);
    }
}

async function generateScenario() {
    // Animate progress bar
    const progressBar = document.getElementById('generation-progress');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 15, 90);
        progressBar.style.width = progress + '%';
    }, 500);
    
    try {
        // Select 2-3 random examples to use as reference
        const shuffled = [...appState.eventExamples].sort(() => Math.random() - 0.5);
        const selectedExamples = shuffled.slice(0, Math.min(3, shuffled.length));
        
        const systemPrompt = `You are an expert FBLA Role Play scenario designer. Your task is to create a NEW, UNIQUE role play scenario for the ${appState.currentEvent.title} event.

IMPORTANT RULES:
1. Create a completely NEW scenario - do not copy the examples
2. The scenario must be realistic and professionally challenging
3. Include: Background Information, Scenario, Other Useful Information, and Requirements sections
4. Make the scenario appropriately complex for high school competitors
5. Include specific details that competitors can analyze and address
6. Output ONLY the scenario content in a clean, readable format
7. Do NOT include any meta-commentary or explanations

FORMAT YOUR OUTPUT EXACTLY LIKE THIS:

**ROLE PLAY SITUATION**

**Background Information**
[2-3 paragraphs describing the company/organization context]

**Scenario**
[1-2 paragraphs describing the specific challenge or situation]

**Other Useful Information**
• [Bullet point 1]
• [Bullet point 2]
• [Bullet point 3]

**Requirements**
Your team must address the following during the presentation:
• [Requirement 1]
• [Requirement 2]
• [Requirement 3]
• [Requirement 4]`;

        const userPrompt = `Here are example ${appState.currentEvent.title} role plays for reference. Create a completely NEW and DIFFERENT scenario that tests similar skills but with a unique situation:

${selectedExamples.map((ex, i) => `--- EXAMPLE ${i + 1} ---\n${ex}\n`).join('\n')}

Now create a brand new, original ${appState.currentEvent.title} role play scenario.`;

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]);
        
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        
        appState.generatedScenario = response;
        
    } catch (error) {
        clearInterval(progressInterval);
        console.error('Scenario generation error:', error);
        throw error;
    }
}

function selectJudges() {
    // Randomly select 3 judges from the pool
    const shuffled = [...JUDGE_POOL].sort(() => Math.random() - 0.5);
    appState.selectedJudges = shuffled.slice(0, 3);
}

// ==================== DISPLAY FUNCTIONS ====================

function showScreen(screenId) {
    const screens = [
        'event-selection-screen',
        'scenario-generation-screen',
        'planning-screen',
        'recording-screen',
        'qa-screen',
        'judging-screen'
    ];
    
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            if (id === screenId) {
                screen.classList.remove('hidden');
            } else {
                screen.classList.add('hidden');
            }
        }
    });
}

function displayScenario() {
    const container = document.getElementById('scenario-content');
    if (!container || !appState.generatedScenario) return;
    
    // Convert markdown-style formatting to HTML
    let html = appState.generatedScenario
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-slate-800">$1</strong>')
        .replace(/\n\n/g, '</p><p class="mb-4">')
        .replace(/• /g, '<li class="ml-4 mb-1">')
        .replace(/\n(?=<li)/g, '</li>')
        .replace(/<\/li>(?![\s\S]*<li)/g, '</li></ul>')
        .replace(/<li/g, (match, offset, str) => {
            const before = str.substring(0, offset);
            if (!before.includes('<ul') || before.lastIndexOf('</ul>') > before.lastIndexOf('<ul')) {
                return '<ul class="list-disc mb-4">' + match;
            }
            return match;
        });
    
    container.innerHTML = `<div class="prose prose-slate max-w-none"><p class="mb-4">${html}</p></div>`;
}

function updateCharCount() {
    const input = document.getElementById('note-card-input');
    const counter = document.getElementById('char-count');
    if (input && counter) {
        counter.textContent = `${input.value.length}/300`;
        appState.notes = input.value;
    }
}

// ==================== TIMER FUNCTIONS ====================

function startPlanningTimer() {
    appState.planningTimeLeft = PLANNING_TIME;
    updatePlanningTimerDisplay();
    
    // Show session timer in header
    const sessionTimer = document.getElementById('session-timer');
    if (sessionTimer) sessionTimer.classList.remove('hidden');
    
    appState.currentTimer = setInterval(() => {
        appState.planningTimeLeft--;
        updatePlanningTimerDisplay();
        
        if (appState.planningTimeLeft <= 0) {
            clearInterval(appState.currentTimer);
            startPresentation();
        }
    }, 1000);
}

function updatePlanningTimerDisplay() {
    const minutes = Math.floor(appState.planningTimeLeft / 60);
    const seconds = appState.planningTimeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const planningTimer = document.getElementById('planning-timer');
    const sessionTimer = document.getElementById('session-timer');
    
    if (planningTimer) planningTimer.textContent = timeStr;
    if (sessionTimer) sessionTimer.textContent = timeStr;
    
    // Warning states
    if (appState.planningTimeLeft <= 60 && appState.planningTimeLeft > 0) {
        if (planningTimer) planningTimer.classList.add('text-amber-600');
    }
}

function startPresentationTimer() {
    appState.presentationTimeLeft = PRESENTATION_TIME;
    updatePresentationTimerDisplay();
    
    appState.currentTimer = setInterval(() => {
        appState.presentationTimeLeft--;
        updatePresentationTimerDisplay();
        
        // 1-minute warning
        if (appState.presentationTimeLeft === PRESENTATION_WARNING) {
            showPresentationWarning();
        }
        
        if (appState.presentationTimeLeft <= 0) {
            endMainPresentation();
        }
    }, 1000);
}

function updatePresentationTimerDisplay() {
    const minutes = Math.floor(appState.presentationTimeLeft / 60);
    const seconds = appState.presentationTimeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const recordingTimer = document.getElementById('recording-timer');
    const sessionTimer = document.getElementById('session-timer');
    
    if (recordingTimer) recordingTimer.textContent = timeStr;
    if (sessionTimer) sessionTimer.textContent = timeStr;
    
    // Warning states
    if (appState.presentationTimeLeft <= 60) {
        if (recordingTimer) {
            recordingTimer.classList.add('timer-warning');
        }
    }
}

function showPresentationWarning() {
    const status = document.getElementById('recording-status');
    if (status) {
        status.innerHTML = `
            <div class="w-3 h-3 rounded-full bg-amber-500 recording-indicator"></div>
            <span class="font-semibold">1 minute remaining!</span>
        `;
        status.classList.remove('bg-blue-50', 'text-blue-700');
        status.classList.add('bg-amber-50', 'text-amber-700');
    }
}

function startQATimer() {
    appState.qaTimeLeft = QA_TIME;
    updateQATimerDisplay();
    
    appState.currentTimer = setInterval(() => {
        appState.qaTimeLeft--;
        updateQATimerDisplay();
        
        if (appState.qaTimeLeft <= 0) {
            endQARecording();
        }
    }, 1000);
}

function updateQATimerDisplay() {
    const minutes = Math.floor(appState.qaTimeLeft / 60);
    const seconds = appState.qaTimeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const qaTimer = document.getElementById('qa-timer');
    const sessionTimer = document.getElementById('session-timer');
    
    if (qaTimer) qaTimer.textContent = timeStr;
    if (sessionTimer) sessionTimer.textContent = timeStr;
    
    // Warning when time is low
    if (appState.qaTimeLeft <= 15) {
        if (qaTimer) qaTimer.classList.add('timer-critical');
    }
}

// ==================== SPEECH RECOGNITION ====================

function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    appState.recognition = new SpeechRecognition();
    appState.recognition.continuous = true;
    appState.recognition.interimResults = true;
    appState.recognition.lang = 'en-US';
    
    appState.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        updateTranscript(finalTranscript, interimTranscript);
    };
    
    appState.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            // Restart recognition
            if (appState.isRecording) {
                appState.recognition.start();
            }
        }
    };
    
    appState.recognition.onend = () => {
        // Restart if still supposed to be recording
        if (appState.isRecording) {
            try {
                appState.recognition.start();
            } catch (e) {
                console.warn('Could not restart recognition:', e);
            }
        }
    };
}

function startRecording(target) {
    if (!appState.recognition) {
        console.error('Speech recognition not available');
        return;
    }
    
    appState.isRecording = true;
    appState.recordingTarget = target; // 'main' or 'qa'
    
    try {
        appState.recognition.start();
    } catch (e) {
        console.warn('Recognition already started:', e);
    }
}

function stopRecording() {
    appState.isRecording = false;
    
    if (appState.recognition) {
        try {
            appState.recognition.stop();
        } catch (e) {
            console.warn('Could not stop recognition:', e);
        }
    }
}

function updateTranscript(finalText, interimText) {
    const target = appState.recordingTarget;
    
    if (target === 'main') {
        appState.mainTranscript += finalText;
        const container = document.getElementById('main-transcript');
        if (container) {
            container.innerHTML = `
                <span class="text-slate-800">${escapeHtml(appState.mainTranscript)}</span>
                <span class="text-slate-400 italic">${escapeHtml(interimText)}</span>
            `;
            container.scrollTop = container.scrollHeight;
        }
    } else if (target === 'qa') {
        appState.qaTranscript += finalText;
        const container = document.getElementById('qa-transcript');
        if (container) {
            container.innerHTML = `
                <span class="text-slate-800">${escapeHtml(appState.qaTranscript)}</span>
                <span class="text-slate-400 italic">${escapeHtml(interimText)}</span>
            `;
            container.scrollTop = container.scrollHeight;
        }
    }
}

// ==================== PHASE TRANSITIONS ====================

function startPresentation() {
    // Stop planning timer
    clearInterval(appState.currentTimer);
    
    // Save notes
    const noteInput = document.getElementById('note-card-input');
    if (noteInput) {
        appState.notes = noteInput.value;
    }
    
    // Show recording screen
    showScreen('recording-screen');
    
    // Display notes (read-only)
    const notesDisplay = document.getElementById('notes-display');
    if (notesDisplay) {
        notesDisplay.textContent = appState.notes || 'No notes taken.';
    }
    
    // Reset transcript
    appState.mainTranscript = "";
    
    // Start recording and timer
    startRecording('main');
    startPresentationTimer();
}

function endMainPresentation() {
    clearInterval(appState.currentTimer);
    stopRecording();
    
    // Generate Q&A questions based on transcript
    generateQAQuestions();
}

async function generateQAQuestions() {
    showScreen('qa-screen');
    
    // Show loading state
    const questionsList = document.getElementById('questions-list');
    if (questionsList) {
        questionsList.innerHTML = `
            <div class="flex items-center gap-3 text-indigo-600">
                <div class="ai-loading-spinner w-5 h-5"></div>
                <span>Generating follow-up questions...</span>
            </div>
        `;
    }
    
    try {
        const systemPrompt = `You are an FBLA competition judge asking follow-up questions after a role play presentation.

CRITICAL RULES:
1. Provide feedback in the third person. Never introduce yourself.
2. Generate exactly 2-3 follow-up questions based on the presentation
3. Questions should probe deeper into the presented solutions
4. Questions should be challenging but fair
5. Output ONLY a JSON array of questions, nothing else

Example output format:
["How would the proposed solution account for currency fluctuation risks?", "What specific timeline would be realistic for implementation?"]`;

        const userPrompt = `The participant just presented the following response to a ${appState.currentEvent.title} role play scenario:

SCENARIO:
${appState.generatedScenario}

PARTICIPANT'S PRESENTATION TRANSCRIPT:
${appState.mainTranscript || "(No verbal response recorded)"}

Generate 2-3 probing follow-up questions a judge would ask.`;

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], true);
        
        // Parse questions
        let questions;
        try {
            questions = JSON.parse(response);
        } catch {
            // Try to extract array from response
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                questions = JSON.parse(match[0]);
            } else {
                questions = [
                    "Could you elaborate on the implementation timeline for your proposed solution?",
                    "What resources would be needed to execute your plan effectively?"
                ];
            }
        }
        
        appState.qaQuestions = questions;
        displayQAQuestions();
        startQAReadDelay();
        
    } catch (error) {
        console.error('Error generating Q&A questions:', error);
        // Use fallback questions
        appState.qaQuestions = [
            "Could you elaborate on the key challenges you identified?",
            "What would be your first step in implementing the proposed solution?"
        ];
        displayQAQuestions();
        startQAReadDelay();
    }
}

function displayQAQuestions() {
    const questionsList = document.getElementById('questions-list');
    if (!questionsList) return;
    
    questionsList.innerHTML = appState.qaQuestions.map((q, i) => `
        <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-sm font-bold">${i + 1}</span>
            <p class="text-indigo-800">${escapeHtml(q)}</p>
        </div>
    `).join('');
}

function startQAReadDelay() {
    let countdown = QA_READ_DELAY;
    const countdownDisplay = document.getElementById('read-countdown');
    
    const interval = setInterval(() => {
        countdown--;
        if (countdownDisplay) countdownDisplay.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(interval);
            startQARecording();
        }
    }, 1000);
}

function startQARecording() {
    // Hide delay message, show recording section
    const delaySection = document.getElementById('qa-read-delay');
    const recordingSection = document.getElementById('qa-recording-section');
    
    if (delaySection) delaySection.classList.add('hidden');
    if (recordingSection) recordingSection.classList.remove('hidden');
    
    // Reset Q&A transcript
    appState.qaTranscript = "";
    
    // Start recording and timer
    startRecording('qa');
    startQATimer();
}

function endQARecording() {
    clearInterval(appState.currentTimer);
    stopRecording();
    
    // Move to judging
    startJudging();
}

// ==================== JUDGING ====================

async function startJudging() {
    showScreen('judging-screen');
    
    // Show loading state
    const loadingSection = document.getElementById('judging-loading');
    const resultsSection = document.getElementById('judging-results');
    
    if (loadingSection) loadingSection.classList.remove('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');
    
    appState.judgeResults = [];
    
    // Run all three judges in parallel
    const judgePromises = appState.selectedJudges.map((judge, index) => 
        runJudgeEvaluation(judge, index)
    );
    
    try {
        await Promise.all(judgePromises);
        displayJudgingResults();
    } catch (error) {
        console.error('Error during judging:', error);
        // Show partial results if available
        if (appState.judgeResults.length > 0) {
            displayJudgingResults();
        } else {
            alert('Error during evaluation. Please try again.');
            showScreen('event-selection-screen');
        }
    }
}

async function runJudgeEvaluation(judge, index) {
    const judgeProgressItems = document.querySelectorAll('#judge-progress > div');
    
    try {
        const systemPrompt = `You are ${judge.name}, ${judge.title}. ${judge.background}. Your evaluation style: ${judge.style}.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. Provide ALL feedback in the THIRD PERSON. Never say "I", "As a judge", "As ${judge.name}", or introduce yourself.
2. Write feedback as if writing a professional score report about "the participant" or "the presenter"
3. MANDATORY QUALITY CHECK: If the transcript is under 50 words, irrelevant, nonsensical, or describes delegating the task to someone else, you MUST assign a failing score (below 20%) for professionalism and overall performance.
4. Be fair but rigorous - this is a competition
5. Output ONLY valid JSON matching the schema below

RUBRIC CATEGORIES AND POINT RANGES:
${FBLA_RUBRIC.categories.map(c => `- ${c.name}: 0-${c.maxPoints} points`).join('\n')}

OUTPUT THIS EXACT JSON SCHEMA:
{
    "scores": {
        "understanding": <0-10>,
        "alternatives": <0-20>,
        "solution": <0-20>,
        "knowledge": <0-20>,
        "organization": <0-10>,
        "delivery": <0-10>,
        "questions": <0-10>
    },
    "total": <sum of all scores>,
    "categoryFeedback": {
        "understanding": "<1-2 sentence feedback>",
        "alternatives": "<1-2 sentence feedback>",
        "solution": "<1-2 sentence feedback>",
        "knowledge": "<1-2 sentence feedback>",
        "organization": "<1-2 sentence feedback>",
        "delivery": "<1-2 sentence feedback>",
        "questions": "<1-2 sentence feedback>"
    },
    "overallFeedback": "<2-3 sentence overall assessment>",
    "strengthHighlight": "<one key strength>",
    "improvementArea": "<one area needing most improvement>"
}`;

        const userPrompt = `SCENARIO PRESENTED:
${appState.generatedScenario}

MAIN PRESENTATION TRANSCRIPT (7 minutes):
${appState.mainTranscript || "(No verbal response recorded - this should significantly impact scores)"}

Q&A RESPONSE TRANSCRIPT (1 minute):
Questions asked: ${appState.qaQuestions.join(' | ')}
Response: ${appState.qaTranscript || "(No response recorded - this should impact the questions score)"}

Evaluate this ${appState.currentEvent.title} role play performance using the official FBLA rubric. Remember to write in third person and never identify yourself.`;

        const response = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], true);
        
        // Parse the response
        let evaluation;
        try {
            evaluation = JSON.parse(response);
        } catch {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                evaluation = JSON.parse(match[0]);
            } else {
                throw new Error('Could not parse judge response');
            }
        }
        
        appState.judgeResults[index] = {
            judge: judge,
            evaluation: evaluation
        };
        
        // Update progress indicator
        if (judgeProgressItems[index]) {
            judgeProgressItems[index].innerHTML = `
                <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm text-green-600">Judge ${index + 1}</span>
            `;
        }
        
    } catch (error) {
        console.error(`Error with judge ${index + 1}:`, error);
        
        // Create fallback evaluation
        appState.judgeResults[index] = {
            judge: judge,
            evaluation: {
                scores: {
                    understanding: 5,
                    alternatives: 10,
                    solution: 10,
                    knowledge: 10,
                    organization: 5,
                    delivery: 5,
                    questions: 5
                },
                total: 50,
                categoryFeedback: {
                    understanding: "Evaluation could not be completed fully.",
                    alternatives: "Evaluation could not be completed fully.",
                    solution: "Evaluation could not be completed fully.",
                    knowledge: "Evaluation could not be completed fully.",
                    organization: "Evaluation could not be completed fully.",
                    delivery: "Evaluation could not be completed fully.",
                    questions: "Evaluation could not be completed fully."
                },
                overallFeedback: "The evaluation encountered an error. Please try again for a complete assessment.",
                strengthHighlight: "Unable to determine",
                improvementArea: "Unable to determine"
            },
            error: true
        };
        
        if (judgeProgressItems[index]) {
            judgeProgressItems[index].innerHTML = `
                <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span class="text-sm text-amber-600">Judge ${index + 1}</span>
            `;
        }
    }
}

function displayJudgingResults() {
    const loadingSection = document.getElementById('judging-loading');
    const resultsSection = document.getElementById('judging-results');
    
    if (loadingSection) loadingSection.classList.add('hidden');
    if (resultsSection) resultsSection.classList.remove('hidden');
    
    // Calculate total score (average of all judges)
    const validResults = appState.judgeResults.filter(r => r && r.evaluation);
    const totalScore = Math.round(
        validResults.reduce((sum, r) => sum + (r.evaluation.total || 0), 0) / validResults.length
    );
    
    document.getElementById('total-score').textContent = totalScore;
    
    // Render judge cards
    const judgeCardsContainer = document.getElementById('judge-cards');
    judgeCardsContainer.innerHTML = appState.judgeResults.map((result, i) => {
        const judge = result.judge;
        const score = result.evaluation.total || 0;
        const scoreColor = score >= 70 ? 'text-green-600' : (score >= 50 ? 'text-amber-600' : 'text-red-600');
        const scoreBg = score >= 70 ? 'bg-green-50' : (score >= 50 ? 'bg-amber-50' : 'bg-red-50');
        
        return `
            <div class="judge-card bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-lg">
                        ${judge.name.charAt(0)}
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800">${judge.name}</h4>
                        <p class="text-slate-500 text-xs">${judge.title}</p>
                    </div>
                </div>
                <div class="${scoreBg} rounded-lg p-4 text-center mb-4">
                    <div class="${scoreColor} text-3xl font-bold">${score}</div>
                    <div class="text-slate-500 text-sm">out of 100</div>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-slate-600">${escapeHtml(result.evaluation.strengthHighlight || 'N/A')}</span>
                    </div>
                    <div class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span class="text-slate-600">${escapeHtml(result.evaluation.improvementArea || 'N/A')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Show first judge's scoresheet by default
    showJudgeSheet(0);
}

function showJudgeSheet(index) {
    // Update tab styles
    [0, 1, 2].forEach(i => {
        const tab = document.getElementById(`tab-judge-${i + 1}`);
        if (tab) {
            if (i === index) {
                tab.className = 'flex-1 py-3 px-4 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 bg-blue-50';
            } else {
                tab.className = 'flex-1 py-3 px-4 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50';
            }
        }
    });
    
    const result = appState.judgeResults[index];
    if (!result) return;
    
    const evaluation = result.evaluation;
    const container = document.getElementById('scoresheet-content');
    
    const scoreKeys = ['understanding', 'alternatives', 'solution', 'knowledge', 'organization', 'delivery', 'questions'];
    const maxScores = [10, 20, 20, 20, 10, 10, 10];
    
    container.innerHTML = `
        <div class="mb-6">
            <h4 class="font-bold text-slate-800 mb-2">Overall Assessment</h4>
            <p class="text-slate-600">${escapeHtml(evaluation.overallFeedback || 'No overall feedback available.')}</p>
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-slate-200">
                        <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                        <th class="text-center py-3 px-4 text-sm font-semibold text-slate-700 w-24">Score</th>
                        <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">Feedback</th>
                    </tr>
                </thead>
                <tbody>
                    ${FBLA_RUBRIC.categories.map((cat, i) => {
                        const key = scoreKeys[i];
                        const score = evaluation.scores?.[key] || 0;
                        const maxScore = maxScores[i];
                        const percentage = (score / maxScore) * 100;
                        const barColor = percentage >= 70 ? 'bg-green-500' : (percentage >= 50 ? 'bg-amber-500' : 'bg-red-500');
                        
                        return `
                            <tr class="rubric-row border-b border-slate-100">
                                <td class="py-4 px-4">
                                    <div class="font-medium text-slate-800 text-sm">${cat.name}</div>
                                </td>
                                <td class="py-4 px-4 text-center">
                                    <div class="font-bold text-slate-800">${score}/${maxScore}</div>
                                    <div class="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                        <div class="${barColor} h-1.5 rounded-full" style="width: ${percentage}%"></div>
                                    </div>
                                </td>
                                <td class="py-4 px-4 text-sm text-slate-600">${escapeHtml(evaluation.categoryFeedback?.[key] || 'N/A')}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="bg-slate-50">
                        <td class="py-4 px-4 font-bold text-slate-800">Total</td>
                        <td class="py-4 px-4 text-center font-bold text-xl text-blue-600">${evaluation.total || 0}/100</td>
                        <td class="py-4 px-4"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

// ==================== SESSION MANAGEMENT ====================

function startNewSession() {
    // Reset all state
    appState = {
        currentEvent: null,
        eventExamples: [],
        generatedScenario: null,
        qaQuestions: [],
        notes: "",
        mainTranscript: "",
        qaTranscript: "",
        selectedJudges: [],
        judgeResults: [],
        planningTimeLeft: PLANNING_TIME,
        presentationTimeLeft: PRESENTATION_TIME,
        qaTimeLeft: QA_TIME,
        currentTimer: null,
        recognition: appState.recognition, // Keep recognition instance
        isRecording: false
    };
    
    // Hide session timer
    const sessionTimer = document.getElementById('session-timer');
    if (sessionTimer) sessionTimer.classList.add('hidden');
    
    // Return to event selection
    showScreen('event-selection-screen');
}

// ==================== UTILITY FUNCTIONS ====================

async function callAI(messages, expectJson = false) {
    const requestBody = {
        messages: messages,
        temperature: expectJson ? 0 : 0.7
    };
    
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(AI_API_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });
            
            // If rate limited, retry with backoff
            if (response.status === 429) {
                if (attempt < maxRetries) {
                    const backoffMs = Math.min(8000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                    continue;
                }
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API error (${response.status}): ${errorData.error || response.statusText}`);
            }
            
            const data = await response.json();
            
            // Handle response format
            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content;
            }
            
            throw new Error('Invalid API response format');
            
        } catch (error) {
            lastError = error;
            console.warn(`AI call attempt ${attempt + 1} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Exponential backoff before retry
                const backoffMs = Math.min(8000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }
    
    // All retries exhausted
    if (lastError) {
        throw new Error(`AI service unavailable: ${lastError.message}`);
    }
    
    throw new Error('AI service unavailable');
}

function escapeHtml(text) {
    if (!text) return '';
    const str = String(text);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Make functions available globally
window.selectEvent = selectEvent;
window.startPresentation = startPresentation;
window.endMainPresentation = endMainPresentation;
window.endQARecording = endQARecording;
window.showJudgeSheet = showJudgeSheet;
window.startNewSession = startNewSession;
window.updateCharCount = updateCharCount;
