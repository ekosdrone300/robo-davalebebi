// ==========================================
// 1. FIREBASE კონფიგურაცია
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAX2oHqZruzwKmlzQdLX9oWLhBXY2dHHSY",
  authDomain: "robo-davalebebi.firebaseapp.com",
  databaseURL: "https://robo-davalebebi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "robo-davalebebi",
  storageBucket: "robo-davalebebi.firebasestorage.app",
  messagingSenderId: "197021374320",
  appId: "1:197021374320:web:ff61414420114ae62e61b5"
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
let app, auth, db;
if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
}

const TEACHER_SECRET_CODE = "ROBO2026";

const COMPONENT_CATALOG = {
    arduino: {
        title: "Arduino Uno",
        color: "#00979D",
        icon: "fa-microchip",
        pins: ["5V", "GND", "D13", "D12", "D11", "D10", "D9", "A0"]
    },
    led_red: {
        title: "წითელი LED",
        color: "#ef4444",
        icon: "fa-lightbulb",
        pins: ["+ Anode (გრძელი)", "- Cathode (მოკლე)"]
    },
    led_green: {
        title: "მწვანე LED",
        color: "#10b981",
        icon: "fa-lightbulb",
        pins: ["+ Anode (გრძელი)", "- Cathode (მოკლე)"]
    },
    resistor: {
        title: "რეზისტორი 220Ω",
        color: "#d97706",
        icon: "fa-grip-lines",
        pins: ["ტერმინალი 1", "ტერმინალი 2"]
    },
    ultrasonic: {
        title: "HC-SR04 სენსორი",
        color: "#3b82f6",
        icon: "fa-eye",
        pins: ["VCC (5V)", "TRIG", "ECHO", "GND"]
    },
    servo: {
        title: "Servo ძრავი",
        color: "#a855f7",
        icon: "fa-gear",
        pins: ["Signal (PWM)", "VCC (5V)", "GND"]
    }
};

let currentUser = null;
let currentTask = null;
let canvasNodes = [];
let wireConnections = [];
let selectedPinInfo = null;
let isLastCodeValid = false;
let quizQuestionCounter = 0;

// ==========================================
// 2. ინიციალიზაცია და დემო დავალებები
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    initDemoDataIfNeeded();
    setupEventListeners();

    if (isFirebaseConfigured) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) loginUserSuccess({ uid: user.uid, ...userDoc.data() });
            } else {
                showAuthScreen();
            }
        });
    } else {
        const savedUser = localStorage.getItem('robolab_current_user');
        if (savedUser) loginUserSuccess(JSON.parse(savedUser));
    }
});

function initDemoDataIfNeeded() {
    if (!localStorage.getItem('robolab_tasks_v3')) {
        const demoTasks = [
            {
                id: 'task_1',
                title: 'ამოცანა #1: წითელი LED ნათურის აციმციმება (Blink)',
                type: 'circuit_code',
                points: 15,
                desc: '1) დაფაზე დაამატეთ Arduino Uno, წითელი LED და რეზისტორი.\n2) ხაზით შეაერთეთ Arduino-ს D13 პინი ნათურის + Anode პინთან, ხოლო - Cathode შეაერთეთ GND-სთან.\n3) დაწერეთ კოდი pinMode, digitalWrite და delay ბრძანებების გამოყენებით.',
                starterCode: 'void setup() {\n  // დააკონფიგურირეთ მე-13 პინი\n  \n}\n\nvoid loop() {\n  // აანთეთ და ჩააქრეთ ნათურა\n  \n}',
                requiredKeywords: 'pinMode, digitalWrite, delay',
                simUrl: '',
                questions: []
            },
            {
                id: 'task_quiz_1',
                title: 'ტესტი #1: Arduino-ს და ელექტრონიკის საფუძვლები',
                type: 'quiz',
                points: 20,
                desc: 'უპასუხეთ ქვემოთ მოცემულ თეორიულ კითხვებს. ტესტის დასრულებისთანავე სისტემა ავტომატურად დაგიწერთ ქულას!',
                starterCode: '',
                requiredKeywords: '',
                simUrl: '',
                questions: [
                    {
                        questionText: 'რომელი ბრძანება გამოიყენება Arduino-ში პინის რეჟიმის (INPUT / OUTPUT) განსასაზღვრად?',
                        options: ['digitalWrite()', 'pinMode()', 'analogRead()', 'Serial.begin()'],
                        correctIndex: 1
                    },
                    {
                        questionText: 'რამდენი ვოლტია Arduino Uno-ს სტანდარტული ლოგიკური HIGH სიგნალის ძაბვა?',
                        options: ['12V', '3.3V', '5V', '220V'],
                        correctIndex: 2
                    },
                    {
                        questionText: 'LED ნათურის რომელ ფეხს (ტერმინალს) უერთდება დადებითი (+) მუხტი?',
                        options: ['ანოდს (+ Anode, გრძელი ფეხი)', 'კათოდს (- Cathode, მოკლე ფეხი)', 'ორივეს ერთდროულად', 'არ აქვს მნიშვნელობა'],
                        correctIndex: 0
                    },
                    {
                        questionText: 'რამდენ წამს უდრის დაყოვნების ბრძანება delay(2000); ?',
                        options: ['200 წამს', '20 წამს', '0.2 წამს', '2 წამს'],
                        correctIndex: 3
                    }
                ]
            }
        ];
        localStorage.setItem('robolab_tasks_v3', JSON.stringify(demoTasks));
    }
}

// ==========================================
// 3. ავტორიზაცია და მასწავლებლის ფორმები
// ==========================================
function setupEventListeners() {
    document.getElementById('reg-role').addEventListener('change', (e) => {
        const secretGroup = document.getElementById('teacher-secret-group');
        secretGroup.classList.toggle('hidden', e.target.value !== 'teacher');
    });

    // მასწავლებლის პანელში დავალების ტიპის გადართვა (კოდი vs ტესტი)
    document.getElementById('task-type').addEventListener('change', (e) => {
        const type = e.target.value;
        const codeFields = document.getElementById('code-task-fields');
        const quizFields = document.getElementById('quiz-builder-fields');

        if (type === 'quiz') {
            codeFields.classList.add('hidden');
            quizFields.classList.remove('hidden');
            // თუ ჯერ არცერთი კითხვა არ დევს, ავტომატურად დავამატოთ 1 კითხვის ბლოკი
            if (document.querySelectorAll('.quiz-question-card').length === 0) {
                addQuizQuestionBlock();
            }
        } else {
            codeFields.classList.remove('hidden');
            quizFields.classList.add('hidden');
        }
    });

    document.getElementById('ws-code-editor').addEventListener('input', () => {
        isLastCodeValid = false;
        document.getElementById('editor-wrapper').classList.remove('code-error', 'code-valid');
    });

    // რეგისტრაცია
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;
        const secret = document.getElementById('reg-secret').value;

        if (role === 'teacher' && secret !== TEACHER_SECRET_CODE) {
            showToast('მასწავლებლის კოდი არასწორია! (კოდი: ROBO2026)', 'danger');
            return;
        }

        if (isFirebaseConfigured) {
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                const userData = { name, email, role };
                await setDoc(doc(db, "users", cred.user.uid), userData);
                showToast('რეგისტრაცია წარმატებით დასრულდა!');
            } catch (err) {
                showToast('შეცდომა: ' + err.message, 'danger');
            }
        } else {
            const users = JSON.parse(localStorage.getItem('robolab_users') || '[]');
            if (users.find(u => u.email === email)) {
                showToast('ეს ელ-ფოსტა უკვე დაკავებულია!', 'danger');
                return;
            }
            const newUser = { uid: 'user_' + Date.now(), name, email, password, role };
            users.push(newUser);
            localStorage.setItem('robolab_users', JSON.stringify(users));
            localStorage.setItem('robolab_current_user', JSON.stringify(newUser));
            loginUserSuccess(newUser);
        }
    });

    // შესვლა
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (isFirebaseConfigured) {
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                showToast('არასწორი ელ-ფოსტა ან პაროლი!', 'danger');
            }
        } else {
            const users = JSON.parse(localStorage.getItem('robolab_users') || '[]');
            const found = users.find(u => u.email === email && u.password === password);
            if (found) {
                localStorage.setItem('robolab_current_user', JSON.stringify(found));
                loginUserSuccess(found);
            } else {
                showToast('მომხმარებელი ვერ მოიძებნა!', 'danger');
            }
        }
    });

    // გასვლა
    document.getElementById('logout-btn').addEventListener('click', async () => {
        if (isFirebaseConfigured) await signOut(auth);
        else {
            localStorage.removeItem('robolab_current_user');
            showAuthScreen();
        }
    });

    // დავალების შექმნა (მასწავლებელი)
    document.getElementById('create-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('task-type').value;
        let questions = [];

        if (type === 'quiz') {
            const qCards = document.querySelectorAll('.quiz-question-card');
            if (qCards.length === 0) {
                showToast('გთხოვთ დაამატოთ მინიმუმ 1 კითხვა ტესტში!', 'danger');
                return;
            }

            for (const card of qCards) {
                const qId = card.dataset.qid;
                const questionText = card.querySelector('.qq-text-input').value.trim();
                const optInputs = card.querySelectorAll('.qq-opt-input');
                const options = Array.from(optInputs).map(inp => inp.value.trim());
                const checkedRadio = card.querySelector(`input[name="correct_${qId}"]:checked`);

                if (!questionText || options.some(o => !o)) {
                    showToast('გთხოვთ შეავსოთ ყველა კითხვა და ოთხივე სავარაუდო პასუხი!', 'danger');
                    return;
                }

                questions.push({
                    questionText,
                    options,
                    correctIndex: Number(checkedRadio.value)
                });
            }
        }

        const newTask = {
            id: 'task_' + Date.now(),
            title: document.getElementById('task-title').value,
            type,
            points: Number(document.getElementById('task-points').value),
            desc: document.getElementById('task-desc').value,
            starterCode: type === 'quiz' ? '' : document.getElementById('task-starter-code').value,
            requiredKeywords: type === 'quiz' ? '' : document.getElementById('task-required-keywords').value.trim(),
            simUrl: type === 'quiz' ? '' : document.getElementById('task-sim-url').value.trim(),
            questions
        };

        if (isFirebaseConfigured) {
            await addDoc(collection(db, "tasks"), newTask);
        } else {
            const tasks = JSON.parse(localStorage.getItem('robolab_tasks_v3') || '[]');
            tasks.unshift(newTask);
            localStorage.setItem('robolab_tasks_v3', JSON.stringify(tasks));
        }

        showToast('დავალება წარმატებით გამოქვეყნდა!');
        e.target.reset();
        document.getElementById('quiz-questions-container').innerHTML = '';
        document.getElementById('code-task-fields').classList.remove('hidden');
        document.getElementById('quiz-builder-fields').classList.add('hidden');
        loadTeacherTasks();
    });
}

// ==========================================
// 4. ტესტის კითხვების კონსტრუქტორი (მასწავლებლისთვის)
// ==========================================
window.addQuizQuestionBlock = function() {
    quizQuestionCounter++;
    const qId = quizQuestionCounter;
    const container = document.getElementById('quiz-questions-container');

    const card = document.createElement('div');
    card.className = 'quiz-question-card';
    card.id = `qq_card_${qId}`;
    card.dataset.qid = qId;

    const currentCount = container.querySelectorAll('.quiz-question-card').length + 1;

    card.innerHTML = `
        <div class="qq-header">
            <span class="qq-title"><i class="fa-solid fa-circle-question"></i> კითხვა #${currentCount}</span>
            <button type="button" onclick="removeQuizQuestionBlock(${qId})" class="btn btn-danger btn-xs">
                <i class="fa-solid fa-trash"></i> წაშლა
            </button>
        </div>
        <div class="input-group" style="margin-bottom: 0.5rem;">
            <input type="text" class="qq-text-input" placeholder="ჩაწერეთ კითხვის პირობა აქ..." required>
        </div>
        <small class="hint">მონიშნეთ მრგვალი ღილაკი იმ პასუხის გასწვრივ, რომელიც <strong>სწორია</strong>:</small>
        <div class="qq-options-grid">
            <div class="qq-option-item">
                <input type="radio" name="correct_${qId}" value="0" checked title="მონიშნეთ როგორც სწორი პასუხი">
                <input type="text" class="qq-opt-input" placeholder="სავარაუდო პასუხი A" required>
            </div>
            <div class="qq-option-item">
                <input type="radio" name="correct_${qId}" value="1" title="მონიშნეთ როგორც სწორი პასუხი">
                <input type="text" class="qq-opt-input" placeholder="სავარაუდო პასუხი B" required>
            </div>
            <div class="qq-option-item">
                <input type="radio" name="correct_${qId}" value="2" title="მონიშნეთ როგორც სწორი პასუხი">
                <input type="text" class="qq-opt-input" placeholder="სავარაუდო პასუხი C" required>
            </div>
            <div class="qq-option-item">
                <input type="radio" name="correct_${qId}" value="3" title="მონიშნეთ როგორც სწორი პასუხი">
                <input type="text" class="qq-opt-input" placeholder="სავარაუდო პასუხი D" required>
            </div>
        </div>
    `;

    container.appendChild(card);
    renumberQuizQuestions();
};

window.removeQuizQuestionBlock = function(qId) {
    const el = document.getElementById(`qq_card_${qId}`);
    if (el) el.remove();
    renumberQuizQuestions();
};

function renumberQuizQuestions() {
    const cards = document.querySelectorAll('.quiz-question-card');
    cards.forEach((card, idx) => {
        card.querySelector('.qq-title').innerHTML = `<i class="fa-solid fa-circle-question"></i> კითხვა #${idx + 1}`;
    });
}

function loginUserSuccess(user) {
    currentUser = user;
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('user-nav').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = user.name;
    document.getElementById('user-role-badge').textContent = user.role === 'teacher' ? 'მასწავლებელი' : 'მოსწავლე';

    if (user.role === 'teacher') {
        document.getElementById('teacher-dashboard').classList.remove('hidden');
        document.getElementById('student-dashboard').classList.add('hidden');
        loadTeacherTasks();
        loadAllSubmissions();
    } else {
        document.getElementById('student-dashboard').classList.remove('hidden');
        document.getElementById('teacher-dashboard').classList.add('hidden');
        loadStudentTasks();
        loadStudentResults();
    }
}

function showAuthScreen() {
    currentUser = null;
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('user-nav').classList.add('hidden');
    document.getElementById('teacher-dashboard').classList.add('hidden');
    document.getElementById('student-dashboard').classList.add('hidden');
}

// ==========================================
// 5. დავალებების სია
// ==========================================
async function fetchTasks() {
    if (isFirebaseConfigured) {
        const snap = await getDocs(collection(db, "tasks"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return JSON.parse(localStorage.getItem('robolab_tasks_v3') || '[]');
}

function getTaskBadgeText(type) {
    if (type === 'circuit_code') return 'წრედი + კოდი';
    if (type === 'code_only') return 'კოდირება';
    return 'ტესტი (Quiz)';
}

async function loadTeacherTasks() {
    const tasks = await fetchTasks();
    document.getElementById('teacher-tasks-list').innerHTML = tasks.map(t => `
        <div class="task-card">
            <div>
                <div class="task-card-header">
                    <span class="badge-type">${getTaskBadgeText(t.type)}</span>
                    <span class="badge-points">${t.points} ქულა</span>
                </div>
                <h3>${t.title}</h3>
                <p>${t.desc}</p>
            </div>
            <button onclick="openWorkspace('${t.id}')" class="btn btn-secondary btn-sm">
                <i class="fa-solid fa-eye"></i> დავალების ნახვა
            </button>
        </div>
    `).join('');
}

async function loadStudentTasks() {
    const tasks = await fetchTasks();
    document.getElementById('student-tasks-list').innerHTML = tasks.map(t => `
        <div class="task-card">
            <div>
                <div class="task-card-header">
                    <span class="badge-type">${getTaskBadgeText(t.type)}</span>
                    <span class="badge-points">${t.points} ქულა</span>
                </div>
                <h3>${t.title}</h3>
                <p>${t.desc}</p>
            </div>
            <button onclick="openWorkspace('${t.id}')" class="btn btn-primary btn-block">
                <i class="fa-solid fa-play"></i> დავალების დაწყება
            </button>
        </div>
    `).join('');
}

// ==========================================
// 6. სამუშაო გარემოს გახსნა (კოდი/წრედი vs ტესტი)
// ==========================================
window.openWorkspace = async function(taskId) {
    const tasks = await fetchTasks();
    currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    document.getElementById('ws-title').textContent = currentTask.title;
    document.getElementById('ws-type-badge').textContent = getTaskBadgeText(currentTask.type);

    const codeCircuitBody = document.getElementById('workspace-code-circuit-body');
    const quizBody = document.getElementById('workspace-quiz-body');

    if (currentTask.type === 'quiz') {
        // ვრთავთ ტესტის რეჟიმს
        codeCircuitBody.classList.add('hidden');
        quizBody.classList.remove('hidden');
        document.getElementById('ws-quiz-desc').textContent = currentTask.desc;
        renderStudentQuizQuestions(currentTask.questions || []);
    } else {
        // ვრთავთ წრედის და კოდის რეჟიმს
        quizBody.classList.add('hidden');
        codeCircuitBody.classList.remove('hidden');

        document.getElementById('ws-desc').textContent = currentTask.desc;
        document.getElementById('ws-code-editor').value = currentTask.starterCode || '';
        
        isLastCodeValid = false;
        document.getElementById('editor-wrapper').classList.remove('code-error', 'code-valid');
        const out = document.getElementById('compiler-output');
        out.className = 'compiler-output';
        out.innerHTML = '> სისტემა მზადაა. დაწერეთ კოდი და დააჭირეთ „კოდის კომპილაციას“...';

        clearCanvas();
    }

    document.getElementById('workspace-modal').classList.remove('hidden');

    if (currentTask.type === 'circuit_code' && !currentTask.simUrl) {
        addComponent('arduino', 40, 40);
    }
};

function renderStudentQuizQuestions(questions) {
    const container = document.getElementById('student-quiz-questions');
    const letters = ['A', 'B', 'C', 'D'];

    container.innerHTML = questions.map((q, qIdx) => `
        <div class="student-q-card">
            <h4>${qIdx + 1}. ${escapeHtml(q.questionText)}</h4>
            <div class="student-options-list">
                ${q.options.map((opt, oIdx) => `
                    <label class="student-option-label">
                        <input type="radio" name="student_q_${qIdx}" value="${oIdx}">
                        <span><strong>${letters[oIdx]})</strong> ${escapeHtml(opt)}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');
}

window.closeWorkspace = function() {
    document.getElementById('workspace-modal').classList.add('hidden');
};

// ==========================================
// 7. პინების და მავთულების სისტემა (WIRING ENGINE)
// ==========================================
window.addComponent = function(typeKey, customX = null, customY = null) {
    const spec = COMPONENT_CATALOG[typeKey];
    if (!spec) return;

    document.getElementById('canvas-placeholder').classList.add('hidden');

    const layer = document.getElementById('components-layer');
    const nodeId = 'node_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    
    const count = canvasNodes.filter(n => n.typeKey === typeKey).length + 1;
    const displayTitle = count > 1 ? `${spec.title} #${count}` : spec.title;

    const x = customX !== null ? customX : Math.floor(Math.random() * 220) + 180;
    const y = customY !== null ? customY : Math.floor(Math.random() * 140) + 40;

    const nodeEl = document.createElement('div');
    nodeEl.className = 'circuit-node';
    nodeEl.id = nodeId;
    nodeEl.style.left = x + 'px';
    nodeEl.style.top = y + 'px';

    const pinsHtml = spec.pins.map(pinName => `
        <div class="pin-row" onclick="handlePinClick(event, '${nodeId}', '${displayTitle}', '${pinName}')">
            <span class="pin-dot" id="dot_${nodeId}_${pinName}" data-node="${nodeId}" data-pin="${pinName}"></span>
            <span class="pin-label">${pinName}</span>
        </div>
    `).join('');

    nodeEl.innerHTML = `
        <div class="node-header" style="background: ${spec.color}">
            <span><i class="fa-solid ${spec.icon}"></i> ${displayTitle}</span>
            <button class="node-delete-btn" onclick="removeComponent('${nodeId}')" title="წაშლა">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="node-pins">
            ${pinsHtml}
        </div>
    `;

    layer.appendChild(nodeEl);
    makeNodeDraggable(nodeEl);
    canvasNodes.push({ id: nodeId, typeKey, title: displayTitle });
};

window.removeComponent = function(nodeId) {
    const el = document.getElementById(nodeId);
    if (el) el.remove();
    canvasNodes = canvasNodes.filter(n => n.id !== nodeId);
    wireConnections = wireConnections.filter(w => w.fromNodeId !== nodeId && w.toNodeId !== nodeId);
    renderWires();
};

window.handlePinClick = function(e, nodeId, nodeTitle, pinName) {
    e.stopPropagation();
    const dotEl = document.getElementById(`dot_${nodeId}_${pinName}`);
    const statusBar = document.getElementById('wiring-status');

    if (!selectedPinInfo) {
        selectedPinInfo = { nodeId, nodeTitle, pinName, dotEl };
        dotEl.classList.add('selected-pin');
        statusBar.classList.add('active-wiring');
        statusBar.innerHTML = `<i class="fa-solid fa-bolt"></i> არჩეულია: <strong>${nodeTitle} [${pinName}]</strong> — ახლა დააწკაპუნეთ მეორე კომპონენტის პინს შესაერთებლად!`;
        return;
    }

    if (selectedPinInfo.nodeId === nodeId && selectedPinInfo.pinName === pinName) {
        selectedPinInfo.dotEl.classList.remove('selected-pin');
        selectedPinInfo = null;
        resetWiringStatusBar();
        return;
    }

    const wireColor = document.getElementById('wire-color').value;
    wireConnections.push({
        id: 'wire_' + Date.now(),
        fromNodeId: selectedPinInfo.nodeId,
        fromNodeTitle: selectedPinInfo.nodeTitle,
        fromPin: selectedPinInfo.pinName,
        toNodeId: nodeId,
        toNodeTitle: nodeTitle,
        toPin: pinName,
        color: wireColor
    });

    selectedPinInfo.dotEl.classList.remove('selected-pin');
    selectedPinInfo = null;
    resetWiringStatusBar();
    renderWires();
};

function resetWiringStatusBar() {
    const statusBar = document.getElementById('wiring-status');
    statusBar.classList.remove('active-wiring');
    statusBar.innerHTML = `<i class="fa-solid fa-plug"></i> <strong>ინსტრუქცია:</strong> დააწკაპუნეთ ერთ პინს (მაგ: D13) და შემდეგ მეორე პინს (მაგ: + Anode) მავთულის გასაბმელად. მავთულის წასაშლელად დააწკაპუნეთ თავად ხაზს.`;
}

function renderWires() {
    const svg = document.getElementById('wires-svg');
    const canvasRect = document.getElementById('circuit-canvas').getBoundingClientRect();
    svg.innerHTML = '';

    wireConnections.forEach(w => {
        const fromDot = document.getElementById(`dot_${w.fromNodeId}_${w.fromPin}`);
        const toDot = document.getElementById(`dot_${w.toNodeId}_${w.toPin}`);
        if (!fromDot || !toDot) return;

        const r1 = fromDot.getBoundingClientRect();
        const r2 = toDot.getBoundingClientRect();

        const x1 = r1.left - canvasRect.left + r1.width / 2;
        const y1 = r1.top - canvasRect.top + r1.height / 2;
        const x2 = r2.left - canvasRect.left + r2.width / 2;
        const y2 = r2.top - canvasRect.top + r2.height / 2;

        const dx = Math.abs(x2 - x1) * 0.45;
        const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', w.color);
        path.setAttribute('class', 'wire-line');
        path.setAttribute('title', 'დააწკაპუნეთ მავთულის წასაშლელად');
        path.addEventListener('click', () => {
            wireConnections = wireConnections.filter(item => item.id !== w.id);
            renderWires();
        });

        svg.appendChild(path);
    });

    const summary = wireConnections.map(w => `${w.fromNodeTitle}[${w.fromPin}] ➔ ${w.toNodeTitle}[${w.toPin}]`).join(' | ');
    document.getElementById('ws-circuit-notes').value = summary;
}

window.clearCanvas = function() {
    document.getElementById('components-layer').innerHTML = '';
    document.getElementById('wires-svg').innerHTML = '';
    document.getElementById('canvas-placeholder').classList.remove('hidden');
    document.getElementById('ws-circuit-notes').value = '';
    canvasNodes = [];
    wireConnections = [];
    selectedPinInfo = null;
    resetWiringStatusBar();
};

function makeNodeDraggable(nodeEl) {
    const header = nodeEl.querySelector('.node-header');
    const canvas = document.getElementById('circuit-canvas');
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - nodeEl.offsetLeft;
        offsetY = e.clientY - nodeEl.offsetTop;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        x = Math.max(0, Math.min(x, canvas.clientWidth - nodeEl.clientWidth));
        y = Math.max(0, Math.min(y, canvas.clientHeight - nodeEl.clientHeight));
        nodeEl.style.left = x + 'px';
        nodeEl.style.top = y + 'px';
        renderWires();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// ==========================================
// 8. მკაცრი C++ / ARDUINO კომპილატორი
// ==========================================
window.runCodeCheck = function() {
    const rawCode = document.getElementById('ws-code-editor').value;
    const output = document.getElementById('compiler-output');
    const wrapper = document.getElementById('editor-wrapper');

    const errors = validateArduinoCode(rawCode, currentTask?.requiredKeywords || '');

    if (errors.length > 0) {
        isLastCodeValid = false;
        wrapper.classList.remove('code-valid');
        wrapper.classList.add('code-error');
        output.className = 'compiler-output output-error';
        output.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation"></i> კომპილაციის შეცდომა (კოდი ვერ გაეშვა):</strong><br>` +
            errors.map(err => `✖ ${err}`).join('<br>');
        return false;
    } else {
        isLastCodeValid = true;
        wrapper.classList.remove('code-error');
        wrapper.classList.add('code-valid');
        output.className = 'compiler-output output-success';
        output.innerHTML = `<strong><i class="fa-solid fa-circle-check"></i> კომპილაცია წარმატებით დასრულდა!</strong><br>` +
            `✔ სინტაქსი და ფრჩხილების ბალანსი სწორია.<br>` +
            `✔ setup() და loop() ფუნქციები გამართულია.<br>` +
            `✔ ყველა სავალდებულო ბრძანება ადგილზეა. შეგიძლიათ გააგზავნოთ დავალება!`;
        return true;
    }
};

function validateArduinoCode(code, requiredKeywordsStr) {
    const errors = [];
    const cleanCode = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    if (!cleanCode.trim()) {
        errors.push("კოდის რედაქტორი ცარიელია!");
        return errors;
    }

    if (!/void\s+setup\s*\(\s*\)/.test(cleanCode)) {
        errors.push("კოდში არ მოიძებნა სავალდებულო ფუნქცია: <code>void setup()</code>");
    }
    if (!/void\s+loop\s*\(\s*\)/.test(cleanCode)) {
        errors.push("კოდში არ მოიძებნა სავალდებულო ფუნქცია: <code>void loop()</code>");
    }

    const openCurly = (cleanCode.match(/\{/g) || []).length;
    const closeCurly = (cleanCode.match(/\}/g) || []).length;
    if (openCurly !== closeCurly) {
        errors.push(`ფიგურული ფრჩხილების '{ }' რაოდენობა არ ემთხვევა (გახსნილია ${openCurly}, დახურულია ${closeCurly}).`);
    }

    const openParen = (cleanCode.match(/\(/g) || []).length;
    const closeParen = (cleanCode.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
        errors.push(`მრგვალი ფრჩხილების '( )' რაოდენობა არ ემთხვევა (გახსნილია ${openParen}, დახურულია ${closeParen}).`);
    }

    const lines = code.split('\n');
    const commonTypos = [
        { wrong: /\bpinmode\b/i, correct: "pinMode" },
        { wrong: /\bdigitalwrite\b/i, correct: "digitalWrite" },
        { wrong: /\bdigitalread\b/i, correct: "digitalRead" },
        { wrong: /\banalogwrite\b/i, correct: "analogWrite" },
        { wrong: /\banalogread\b/i, correct: "analogRead" },
        { wrong: /\bserial\.begin\b/i, correct: "Serial.begin" },
        { wrong: /\bserial\.print\b/i, correct: "Serial.print" }
    ];

    lines.forEach((rawLine, idx) => {
        const lineNum = idx + 1;
        const line = rawLine.replace(/\/\/.*$/, '').trim();
        if (!line) return;

        commonTypos.forEach(t => {
            if (t.wrong.test(line) && !line.includes(t.correct)) {
                errors.push(`ხაზი ${lineNum}: ბრძანება არასწორი რეგისტრით წერია. უნდა იყოს <code>${t.correct}</code>.`);
            }
        });

        const isControlOrPreprocessor =
            line.startsWith('#') ||
            line.endsWith('{') ||
            line.endsWith('}') ||
            /^void\s+/.test(line) ||
            /^if\s*\(/.test(line) ||
            /^else/.test(line) ||
            /^for\s*\(/.test(line) ||
            /^while\s*\(/.test(line);

        if (!isControlOrPreprocessor && !line.endsWith(';')) {
            errors.push(`ხაზი ${lineNum}: ბრძანების ბოლოს აკლია წერტილ-მძიმე <code>;</code> ("${escapeHtml(line)}")`);
        }

        if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*;?$/.test(line) && !line.startsWith('return') && !line.startsWith('break')) {
            errors.push(`ხაზი ${lineNum}: გაუგებარი ბრძანება ან არასწორი C++ სინტაქსი: "${escapeHtml(line)}"`);
        }
    });

    const loopMatch = cleanCode.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*?)\}/);
    if (loopMatch && loopMatch[1].trim().length === 0) {
        errors.push("<code>void loop()</code> ფუნქცია ცარიელია! დაწერეთ მოქმედების კოდი.");
    }

    if (requiredKeywordsStr) {
        const reqList = requiredKeywordsStr.split(',').map(k => k.trim()).filter(Boolean);
        reqList.forEach(kw => {
            if (!cleanCode.includes(kw)) {
                errors.push(`ამ დავალებაში აუცილებლად უნდა გამოიყენოთ ბრძანება: <code>${kw}</code>`);
            }
        });
    }

    return errors;
}

// ==========================================
// 9. დავალების გაგზავნა და ტესტის ავტომატური გასწორება
// ==========================================
window.submitTaskSolution = async function() {
    if (!currentUser || !currentTask) return;

    let submission = null;

    // A) თუ დავალება არის ტესტი (Quiz) -> პროგრამა თავად ასწორებს!
    if (currentTask.type === 'quiz') {
        const questions = currentTask.questions || [];
        let correctCount = 0;
        const detailsLog = [];

        for (let i = 0; i < questions.length; i++) {
            const selected = document.querySelector(`input[name="student_q_${i}"]:checked`);
            if (!selected) {
                showToast(`გთხოვთ მონიშნოთ პასუხი კითხვაზე #${i + 1}!`, 'danger');
                return;
            }
            const chosenIdx = Number(selected.value);
            const isCorrect = chosenIdx === questions[i].correctIndex;
            if (isCorrect) correctCount++;

            detailsLog.push(
                `${i + 1}) ${questions[i].questionText}\n` +
                `   მოსწავლის პასუხი: ${questions[i].options[chosenIdx]} ${isCorrect ? '✔ (სწორია)' : `✖ (არასწორია | სწორი იყო: ${questions[i].options[questions[i].correctIndex]})`}`
            );
        }

        // პროპორციული ქულის გამოთვლა
        const autoGrade = Math.round((correctCount / questions.length) * currentTask.points);

        submission = {
            id: 'sub_' + Date.now(),
            taskId: currentTask.id,
            taskTitle: currentTask.title,
            taskType: 'quiz',
            maxPoints: currentTask.points,
            studentId: currentUser.uid,
            studentName: currentUser.name,
            code: detailsLog.join('\n\n'),
            circuitNotes: `ავტომატური შედეგი: ${correctCount} სწორი პასუხი ${questions.length}-დან`,
            componentsUsed: 'თეორიული ტესტი',
            grade: autoGrade, // ქულა იწერება ავტომატურად!
            submittedAt: new Date().toLocaleString('ka-GE')
        };

        showToast(`ტესტი დასრულდა! სწორია ${correctCount}/${questions.length}. თქვენ მიიღეთ ${autoGrade} ქულა!`);
    } 
    // B) თუ დავალება არის წრედი ან კოდი
    else {
        const isCodeOk = window.runCodeCheck();
        if (!isCodeOk) {
            showToast('კოდში შეცდომებია! გთხოვთ გაასწოროთ წითლად მონიშნული შეცდომები გაგზავნამდე.', 'danger');
            return;
        }

        if (currentTask.type === 'circuit_code' && !currentTask.simUrl && wireConnections.length === 0) {
            showToast('წრედზე პინები არ არის შეერთებული! გააბით მავთულები კომპონენტებს შორის.', 'danger');
            return;
        }

        submission = {
            id: 'sub_' + Date.now(),
            taskId: currentTask.id,
            taskTitle: currentTask.title,
            taskType: currentTask.type,
            maxPoints: currentTask.points,
            studentId: currentUser.uid,
            studentName: currentUser.name,
            code: document.getElementById('ws-code-editor').value,
            circuitNotes: document.getElementById('ws-circuit-notes').value,
            componentsUsed: canvasNodes.map(c => c.title).join(', '),
            grade: null,
            submittedAt: new Date().toLocaleString('ka-GE')
        };

        showToast('ყოჩაღ! კოდი და წრედი წარმატებით გაეგზავნა მასწავლებელს!');
    }

    if (isFirebaseConfigured) {
        await addDoc(collection(db, "submissions"), submission);
    } else {
        const subs = JSON.parse(localStorage.getItem('robolab_submissions') || '[]');
        subs.unshift(submission);
        localStorage.setItem('robolab_submissions', JSON.stringify(subs));
    }

    closeWorkspace();
    if (currentUser.role === 'student') loadStudentResults();
};

async function fetchSubmissions() {
    if (isFirebaseConfigured) {
        const snap = await getDocs(collection(db, "submissions"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return JSON.parse(localStorage.getItem('robolab_submissions') || '[]');
}

async function loadAllSubmissions() {
    const subs = await fetchSubmissions();
    const container = document.getElementById('submissions-list');

    if (subs.length === 0) {
        container.innerHTML = '<p class="subtitle">ჯერ არცერთ მოსწავლეს არ გამოუგზავნია დავალება.</p>';
        return;
    }

    container.innerHTML = subs.map(s => `
        <div class="submission-card">
            <div class="sub-header">
                <div>
                    <strong>მოსწავლე: ${s.studentName}</strong> — <span>${s.taskTitle}</span>
                </div>
                <span class="subtitle">${s.submittedAt}</span>
            </div>
            <p><strong>ტიპი / კომპონენტები:</strong> ${s.componentsUsed || '-'}</p>
            <p style="color: var(--accent); margin-top:4px;"><strong>შედეგი / სქემა:</strong> ${s.circuitNotes || '-'}</p>
            <div class="sub-code-preview">${escapeHtml(s.code)}</div>
            <div class="grade-box">
                <label>შეფასება (მაქს. ${s.maxPoints}):</label>
                <input type="number" id="grade-input-${s.id}" value="${s.grade !== null ? s.grade : ''}" max="${s.maxPoints}" min="0">
                <button onclick="gradeSubmission('${s.id}')" class="btn btn-success btn-sm">
                    <i class="fa-solid fa-check"></i> ქულის განახლება
                </button>
            </div>
        </div>
    `).join('');
}

window.gradeSubmission = async function(subId) {
    const gradeVal = document.getElementById(`grade-input-${subId}`).value;
    if (gradeVal === '') return;

    if (isFirebaseConfigured) {
        await updateDoc(doc(db, "submissions", subId), { grade: Number(gradeVal) });
    } else {
        const subs = JSON.parse(localStorage.getItem('robolab_submissions') || '[]');
        const idx = subs.findIndex(s => s.id === subId);
        if (idx !== -1) {
            subs[idx].grade = Number(gradeVal);
            localStorage.setItem('robolab_submissions', JSON.stringify(subs));
        }
    }
    showToast('ქულა წარმატებით შეინახა!');
    loadAllSubmissions();
};

async function loadStudentResults() {
    const subs = await fetchSubmissions();
    const mySubs = subs.filter(s => s.studentId === currentUser.uid);
    const container = document.getElementById('student-results-list');

    if (mySubs.length === 0) {
        container.innerHTML = '<p class="subtitle">თქვენ ჯერ არ გაგიგზავნიათ შესრულებული დავალება.</p>';
        return;
    }

    container.innerHTML = mySubs.map(s => `
        <div class="submission-card">
            <div class="sub-header">
                <strong>${s.taskTitle}</strong>
                <span class="badge-points">
                    ${s.grade !== null ? `შეფასებულია: ${s.grade} / ${s.maxPoints} ქულა` : 'მოლოდინის რეჟიმში'}
                </span>
            </div>
            <p style="color: var(--accent);"><strong>დეტალები:</strong> ${s.circuitNotes || '-'}</p>
            <div class="sub-code-preview">${escapeHtml(s.code)}</div>
        </div>
    `).join('');
}

// UI Tabs
window.switchAuthTab = function(tab) {
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab === 'login');
    const btns = document.querySelectorAll('.tab-btn');
    btns[0].classList.toggle('active', tab === 'login');
    btns[1].classList.toggle('active', tab !== 'login');
};

window.switchTeacherTab = function(tab) {
    ['create-task', 'all-tasks', 'submissions'].forEach(t => {
        document.getElementById(`teacher-${t}`).classList.toggle('hidden', t !== tab);
    });
    if (tab === 'all-tasks') loadTeacherTasks();
    if (tab === 'submissions') loadAllSubmissions();
};

window.switchStudentTab = function(tab) {
    ['available-tasks', 'my-results'].forEach(t => {
        document.getElementById(`student-${t}`).classList.toggle('hidden', t !== tab);
    });
    if (tab === 'available-tasks') loadStudentTasks();
    if (tab === 'my-results') loadStudentResults();
};

function showToast(msg, type = 'primary') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'danger') toast.style.borderLeftColor = '#ef4444';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}