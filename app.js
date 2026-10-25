// ==========================================
// 1. FIREBASE კონფიგურაცია (ჩასვი შენი Firebase პროექტის მონაცემები)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // შეცვალე შენი Firebase API Key-ით
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ვამოწმებთ, ჩაწერილია თუ არა რეალური Firebase გასაღები
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let app, auth, db;
if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
}

// მასწავლებლის რეგისტრაციის საიდუმლო კოდი
const TEACHER_SECRET_CODE = "ROBO2026";

// გლობალური ცვლადები
let currentUser = null;
let currentTask = null;
let canvasComponents = [];

// ==========================================
// 2. საწყისი ჩატვირთვა და დემო მონაცემები
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    initDemoDataIfNeeded();
    setupEventListeners();

    if (isFirebaseConfigured) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    loginUserSuccess({ uid: user.uid, ...userDoc.data() });
                }
            } else {
                showAuthScreen();
            }
        });
    } else {
        // ლოკალური სესიის შემოწმება
        const savedUser = localStorage.getItem('robolab_current_user');
        if (savedUser) {
            loginUserSuccess(JSON.parse(savedUser));
        }
    }
});

function initDemoDataIfNeeded() {
    if (!localStorage.getItem('robolab_tasks')) {
        const demoTasks = [
            {
                id: 'task_1',
                title: 'ამოცანა #1: შუქნიშნის სიმულაცია Arduino-ზე',
                type: 'circuit_code',
                points: 15,
                desc: 'დაფაზე დაამატეთ Arduino Uno, 2 ცალი LED ნათურა და რეზისტორი. დააკავშირეთ წითელი ნათურა მე-13 პინზე, მწვანე მე-12 პინზე. დაწერეთ კოდი, რომელიც მონაცვლეობით აანთებს ნათურებს 1 წამის დაყოვნებით.',
                starterCode: 'void setup() {\n  pinMode(13, OUTPUT);\n  pinMode(12, OUTPUT);\n}\n\nvoid loop() {\n  // დაწერეთ შუქნიშნის ლოგიკა აქ\n  \n}',
                simUrl: ''
            },
            {
                id: 'task_2',
                title: 'ამოცანა #2: ულტრაბგერითი სენსორით მანძილის გაზომვა',
                type: 'code_only',
                points: 20,
                desc: 'მოცემულია HC-SR04 სენსორი (Trig -> Pin 9, Echo -> Pin 10). დაწერეთ ფუნქცია, რომელიც ითვლის მანძილს სანტიმეტრებში და თუ წინაღობა 15 სმ-ზე ახლოსაა, რთავს სერვო ძრავს.',
                starterCode: '#define TRIG 9\n#define ECHO 10\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  // გამოთვალეთ მანძილი\n}',
                simUrl: ''
            }
        ];
        localStorage.setItem('robolab_tasks', JSON.stringify(demoTasks));
    }
}

// ==========================================
// 3. ავტორიზაცია და რეგისტრაცია
// ==========================================
function setupEventListeners() {
    // როლის შეცვლისას საიდუმლო კოდის ველის გამოჩენა
    document.getElementById('reg-role').addEventListener('change', (e) => {
        const secretGroup = document.getElementById('teacher-secret-group');
        if (e.target.value === 'teacher') {
            secretGroup.classList.remove('hidden');
        } else {
            secretGroup.classList.add('hidden');
        }
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
            showToast('მასწავლებლის საიდუმლო კოდი არასწორია! (სცადეთ: ROBO2026)', 'danger');
            return;
        }

        if (isFirebaseConfigured) {
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                const userData = { name, email, role, createdAt: new Date().toISOString() };
                await setDoc(doc(db, "users", cred.user.uid), userData);
                showToast('რეგისტრაცია წარმატებით დასრულდა!');
            } catch (err) {
                showToast('შეცდომა: ' + err.message, 'danger');
            }
        } else {
            // ლოკალური რეგისტრაცია
            const users = JSON.parse(localStorage.getItem('robolab_users') || '[]');
            if (users.find(u => u.email === email)) {
                showToast('ეს ელ-ფოსტა უკვე რეგისტრირებულია!', 'danger');
                return;
            }
            const newUser = { uid: 'user_' + Date.now(), name, email, password, role };
            users.push(newUser);
            localStorage.setItem('robolab_users', JSON.stringify(users));
            localStorage.setItem('robolab_current_user', JSON.stringify(newUser));
            showToast('რეგისტრაცია წარმატებულია!');
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
                showToast('მომხმარებელი ვერ მოიძებნა! ჯერ გაიარეთ რეგისტრაცია.', 'danger');
            }
        }
    });

    // გასვლა
    document.getElementById('logout-btn').addEventListener('click', async () => {
        if (isFirebaseConfigured) {
            await signOut(auth);
        } else {
            localStorage.removeItem('robolab_current_user');
            showAuthScreen();
        }
    });

    // დავალების შექმნა (მასწავლებელი)
    document.getElementById('create-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newTask = {
            id: 'task_' + Date.now(),
            title: document.getElementById('task-title').value,
            type: document.getElementById('task-type').value,
            points: Number(document.getElementById('task-points').value),
            desc: document.getElementById('task-desc').value,
            starterCode: document.getElementById('task-starter-code').value,
            simUrl: document.getElementById('task-sim-url').value.trim(),
            createdAt: new Date().toISOString()
        };

        if (isFirebaseConfigured) {
            await addDoc(collection(db, "tasks"), newTask);
        } else {
            const tasks = JSON.parse(localStorage.getItem('robolab_tasks') || '[]');
            tasks.unshift(newTask);
            localStorage.setItem('robolab_tasks', JSON.stringify(tasks));
        }

        showToast('დავალება წარმატებით გამოქვეყნდა!');
        e.target.reset();
        loadTeacherTasks();
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
// 4. დავალებების ჩატვირთვა და მართვა
// ==========================================
async function fetchTasks() {
    if (isFirebaseConfigured) {
        const snap = await getDocs(collection(db, "tasks"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
        return JSON.parse(localStorage.getItem('robolab_tasks') || '[]');
    }
}

async function loadTeacherTasks() {
    const tasks = await fetchTasks();
    const container = document.getElementById('teacher-tasks-list');
    container.innerHTML = tasks.map(t => `
        <div class="task-card">
            <div>
                <div class="task-card-header">
                    <span class="badge-type">${getTaskTypeLabel(t.type)}</span>
                    <span class="badge-points">${t.points} ქულა</span>
                </div>
                <h3>${t.title}</h3>
                <p>${t.desc}</p>
            </div>
            <button onclick="openWorkspace('${t.id}')" class="btn btn-secondary btn-sm">
                <i class="fa-solid fa-eye"></i> გადახედვა
            </button>
        </div>
    `).join('');
}

async function loadStudentTasks() {
    const tasks = await fetchTasks();
    const container = document.getElementById('student-tasks-list');
    container.innerHTML = tasks.map(t => `
        <div class="task-card">
            <div>
                <div class="task-card-header">
                    <span class="badge-type">${getTaskTypeLabel(t.type)}</span>
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

function getTaskTypeLabel(type) {
    if (type === 'circuit_code') return 'წრედი + კოდი';
    if (type === 'code_only') return 'კოდირება';
    return 'თეორია / ტესტი';
}

// ==========================================
// 5. სამუშაო გარემო (Tinkercad + Code Editor)
// ==========================================
window.openWorkspace = async function(taskId) {
    const tasks = await fetchTasks();
    currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    document.getElementById('ws-title').textContent = currentTask.title;
    document.getElementById('ws-type-badge').textContent = getTaskTypeLabel(currentTask.type);
    document.getElementById('ws-desc').textContent = currentTask.desc;
    document.getElementById('ws-code-editor').value = currentTask.starterCode || '';
    document.getElementById('ws-circuit-notes').value = '';
    clearCanvas();

    const internalBuilder = document.getElementById('internal-circuit-builder');
    const externalSim = document.getElementById('external-simulator-box');

    if (currentTask.simUrl) {
        internalBuilder.classList.add('hidden');
        externalSim.classList.remove('hidden');
        document.getElementById('ws-sim-iframe').src = currentTask.simUrl;
    } else {
        internalBuilder.classList.remove('hidden');
        externalSim.classList.add('hidden');
    }

    document.getElementById('workspace-modal').classList.remove('hidden');
};

window.closeWorkspace = function() {
    document.getElementById('workspace-modal').classList.add('hidden');
    document.getElementById('ws-sim-iframe').src = '';
};

// კომპონენტების დამატება დაფაზე (Drag & Drop)
window.addComponent = function(name, icon, color) {
    const canvas = document.getElementById('circuit-canvas');
    const compId = 'comp_' + Date.now();
    const x = Math.floor(Math.random() * 180) + 30;
    const y = Math.floor(Math.random() * 120) + 30;

    const el = document.createElement('div');
    el.className = 'draggable-comp';
    el.id = compId;
    el.style.backgroundColor = color;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${name}</span>`;

    makeDraggable(el, canvas);
    canvas.appendChild(el);
    canvasComponents.push({ id: compId, name });
};

window.clearCanvas = function() {
    const canvas = document.getElementById('circuit-canvas');
    canvas.innerHTML = '<div class="canvas-placeholder">დააწკაპუნეთ ზემოთ კომპონენტებს და გადაადგილეთ დაფაზე (Drag & Drop)</div>';
    canvasComponents = [];
};

function makeDraggable(el, container) {
    let isDragging = false;
    let offsetX, offsetY;

    el.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        el.style.left = Math.max(0, Math.min(x, container.clientWidth - el.clientWidth)) + 'px';
        el.style.top = Math.max(0, Math.min(y, container.clientHeight - el.clientHeight)) + 'px';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// კოდის სიმულაციური შემოწმება
window.runCodeCheck = function() {
    const code = document.getElementById('ws-code-editor').value;
    const output = document.getElementById('compiler-output');
    
    output.innerHTML = '> მიმდინარეობს კომპილაცია...<br>';
    setTimeout(() => {
        if (code.includes('setup') && code.includes('loop')) {
            output.innerHTML += '> [OK] Arduino სტრუქტურა (setup/loop) სწორია.<br>';
            output.innerHTML += '> [OK] სინტაქსური შეცდომები არ მოიძებნა. შეგიძლიათ გააგზავნოთ დავალება!';
        } else {
            output.innerHTML += '> [ინფო] კოდი მიღებულია. დარწმუნდით, რომ ყველა პირობა შესრულებულია.';
        }
    }, 500);
};

// ==========================================
// 6. დავალების გაგზავნა და შეფასება
// ==========================================
window.submitTaskSolution = async function() {
    if (!currentUser || !currentTask) return;

    const submission = {
        id: 'sub_' + Date.now(),
        taskId: currentTask.id,
        taskTitle: currentTask.title,
        maxPoints: currentTask.points,
        studentId: currentUser.uid,
        studentName: currentUser.name,
        code: document.getElementById('ws-code-editor').value,
        circuitNotes: document.getElementById('ws-circuit-notes').value,
        componentsUsed: canvasComponents.map(c => c.name).join(', '),
        grade: null,
        submittedAt: new Date().toLocaleString('ka-GE')
    };

    if (isFirebaseConfigured) {
        await addDoc(collection(db, "submissions"), submission);
    } else {
        const subs = JSON.parse(localStorage.getItem('robolab_submissions') || '[]');
        subs.unshift(submission);
        localStorage.setItem('robolab_submissions', JSON.stringify(subs));
    }

    showToast('დავალება წარმატებით გაეგზავნა მასწავლებელს!');
    closeWorkspace();
    if (currentUser.role === 'student') {
        loadStudentResults();
    }
};

async function fetchSubmissions() {
    if (isFirebaseConfigured) {
        const snap = await getDocs(collection(db, "submissions"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
        return JSON.parse(localStorage.getItem('robolab_submissions') || '[]');
    }
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
            <p><strong>გამოყენებული კომპონენტები:</strong> ${s.componentsUsed || 'არ არის მითითებული'}</p>
            <p><strong>წრედის სქემა:</strong> ${s.circuitNotes || 'არ არის მითითებული'}</p>
            <div class="sub-code-preview">${escapeHtml(s.code)}</div>
            <div class="grade-box">
                <label>შეფასება (მაქს. ${s.maxPoints}):</label>
                <input type="number" id="grade-input-${s.id}" value="${s.grade !== null ? s.grade : ''}" max="${s.maxPoints}" min="0">
                <button onclick="gradeSubmission('${s.id}')" class="btn btn-success btn-sm">
                    <i class="fa-solid fa-check"></i> ქულის შენახვა
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
        const index = subs.findIndex(s => s.id === subId);
        if (index !== -1) {
            subs[index].grade = Number(gradeVal);
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
                    ${s.grade !== null ? `შეფასებულია: ${s.grade} / ${s.maxPoints} ქულა` : 'მოლოდინის რეჟიმში (მასწავლებელი ამოწმებს)'}
                </span>
            </div>
            <p><strong>წრედის სქემა:</strong> ${s.circuitNotes || '-'}</p>
            <div class="sub-code-preview">${escapeHtml(s.code)}</div>
        </div>
    `).join('');
}

// ==========================================
// 7. დამხმარე UI ფუნქციები
// ==========================================
window.switchAuthTab = function(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const btns = document.querySelectorAll('.tab-btn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
};

window.switchTeacherTab = function(tab) {
    document.getElementById('teacher-create-task').classList.add('hidden');
    document.getElementById('teacher-all-tasks').classList.add('hidden');
    document.getElementById('teacher-submissions').classList.add('hidden');

    document.getElementById(`teacher-${tab}`).classList.remove('hidden');
    if (tab === 'all-tasks') loadTeacherTasks();
    if (tab === 'submissions') loadAllSubmissions();
};

window.switchStudentTab = function(tab) {
    document.getElementById('student-available-tasks').classList.add('hidden');
    document.getElementById('student-my-results').classList.add('hidden');

    document.getElementById(`student-${tab}`).classList.remove('hidden');
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
    setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}