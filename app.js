import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAX2oHqZruzwKmlzQdLX9oWLhBXY2dHHSY",
    authDomain: "robo-davalebebi.firebaseapp.com",
    databaseURL: "https://robo-davalebebi-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "robo-davalebebi",
    storageBucket: "robo-davalebebi.firebasestorage.app",
    messagingSenderId: "197021374320",
    appId: "1:197021374320:web:ff61414420114ae62e61b5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let isTaskSolved = false;

const welcomeScreen = document.getElementById('welcome-screen');
const studentDashboard = document.getElementById('student-dashboard');
const teacherDashboard = document.getElementById('teacher-dashboard');
const studentAuthError = document.getElementById('student-auth-error');

function safeListener(id, eventType, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventType, callback);
}

// =================== მასწავლებლის პანელი ===================
safeListener('btn-teacher-login', 'click', () => {
    const pass = document.getElementById('teacher-pass').value;
    const errorMsg = document.getElementById('teacher-error');
    if (pass === 'admin2004') {
        welcomeScreen.classList.add('hidden');
        teacherDashboard.classList.remove('hidden');
        loadTasks(); 
    } else {
        errorMsg.innerText = "❌ არასწორი პაროლი!";
    }
});

safeListener('btn-logout-teacher', 'click', () => {
    teacherDashboard.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    document.getElementById('teacher-pass').value = "";
    document.getElementById('teacher-error').innerText = "";
});

// -- დავალებების ბაზის მართვა --
const addTaskForm = document.getElementById('add-task-form');
const taskStatusMsg = document.getElementById('task-status-msg');
const tasksList = document.getElementById('tasks-list');

async function loadTasks() {
    if (!tasksList) return;
    tasksList.innerHTML = '<p style="color: #64748b;">იტვირთება მონაცემები...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        tasksList.innerHTML = '';
        if (querySnapshot.empty) {
            tasksList.innerHTML = '<p style="color: #64748b;">ბაზაში ჯერ არ არის დავალებები.</p>';
            return;
        }
        querySnapshot.forEach((docSnap) => {
            const task = docSnap.data();
            const div = document.createElement('div');
            div.className = 'task-card';
            div.innerHTML = `
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <div class="badge badge-points">🏆 ${task.points} ქულა</div>
                <button class="secondary-btn delete-task-btn" data-id="${docSnap.id}">🗑 წაშლა</button>
            `;
            tasksList.appendChild(div);
        });
        document.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = e.target.getAttribute('data-id');
                if (confirm('ნამდვილად გსურთ ამ დავალების წაშლა?')) {
                    await deleteDoc(doc(db, "tasks", taskId));
                    loadTasks(); 
                }
            });
        });
    } catch (err) {
        tasksList.innerHTML = `<p style="color: red;">შეცდომა: ${err.message}</p>`;
    }
}

// ტაბების გადართვა (წრედი / ტესტი)
let currentTaskType = 'circuit';
const typeCircuitBtn = document.getElementById('type-circuit');
const typeQuizBtn = document.getElementById('type-quiz');
const configCircuit = document.getElementById('circuit-config');
const configQuiz = document.getElementById('quiz-config');

if (typeCircuitBtn && typeQuizBtn) {
    typeCircuitBtn.addEventListener('click', () => {
        currentTaskType = 'circuit';
        typeCircuitBtn.classList.add('active');
        typeQuizBtn.classList.remove('active');
        configCircuit.classList.remove('hidden');
        configQuiz.classList.add('hidden');
    });

    typeQuizBtn.addEventListener('click', () => {
        currentTaskType = 'quiz';
        typeQuizBtn.classList.add('active');
        typeCircuitBtn.classList.remove('active');
        configQuiz.classList.remove('hidden');
        configCircuit.classList.add('hidden');
    });
}

// ფორმის გაგზავნა ბაზაში
if (addTaskForm) {
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value;
        const desc = document.getElementById('task-desc').value;
        const points = parseInt(document.getElementById('task-points').value);

        let taskData = {
            title: title,
            description: desc,
            points: points,
            type: currentTaskType,
            createdAt: new Date()
        };

        // მონაცემების ფორმირება ტიპის მიხედვით
        if (currentTaskType === 'circuit') {
            const selectedTools = ['arduino']; // Arduino ყოველთვის არის
            document.querySelectorAll('.tool-cb:checked').forEach(cb => selectedTools.push(cb.value));
            
            taskData.tools = selectedTools;
            taskData.correctRule = document.getElementById('task-rule').value;
        } else {
            taskData.options = [
                document.getElementById('quiz-opt1').value,
                document.getElementById('quiz-opt2').value,
                document.getElementById('quiz-opt3').value
            ];
            taskData.correctOption = document.getElementById('quiz-correct').value;
        }

        taskStatusMsg.style.color = '#1e293b';
        taskStatusMsg.innerText = "იგზავნება...";

        try {
            await addDoc(collection(db, "tasks"), taskData);
            taskStatusMsg.style.color = '#16a34a';
            taskStatusMsg.innerText = "✅ დავალება წარმატებით დაემატა ბაზაში!";
            addTaskForm.reset();
            loadTasks(); 
            setTimeout(() => { taskStatusMsg.innerText = ""; }, 4000);
        } catch (err) {
            taskStatusMsg.style.color = '#dc2626';
            taskStatusMsg.innerText = "❌ შეცდომა: " + err.message;
        }
    });
}

// არსებული loadTasks ფუნქციის მცირე განახლება ბარათის დიზაინისთვის
async function loadTasks() {
    if (!tasksList) return;
    tasksList.innerHTML = '<p style="color: #64748b;">იტვირთება მონაცემები...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        tasksList.innerHTML = '';
        if (querySnapshot.empty) {
            tasksList.innerHTML = '<p style="color: #64748b;">ბაზაში ჯერ არ არის დავალებები.</p>';
            return;
        }
        querySnapshot.forEach((docSnap) => {
            const task = docSnap.data();
            const badgeType = task.type === 'quiz' ? '📝 ტესტი' : '🔌 წრედი';
            const div = document.createElement('div');
            div.className = 'task-card';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <h3>${task.title}</h3>
                    <span style="font-size: 0.8rem; background: #e2e8f0; padding: 3px 8px; border-radius: 4px;">${badgeType}</span>
                </div>
                <p>${task.description}</p>
                <div class="badge badge-points">🏆 ${task.points} ქულა</div>
                <button class="secondary-btn delete-task-btn" data-id="${docSnap.id}">🗑 წაშლა</button>
            `;
            tasksList.appendChild(div);
        });
        
        // წაშლის ლისენერები
        document.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('ნამდვილად გსურთ ამ დავალების წაშლა?')) {
                    await deleteDoc(doc(db, "tasks", e.target.getAttribute('data-id')));
                    loadTasks(); 
                }
            });
        });
    } catch (err) {
        tasksList.innerHTML = `<p style="color: red;">შეცდომა: ${err.message}</p>`;
    }
}
// =================== მოსწავლის ავტორიზაცია ===================
const emailInput = document.getElementById('student-email');
const passInput = document.getElementById('student-pass');

safeListener('btn-google-login', 'click', () => {
    studentAuthError.innerText = "";
    signInWithPopup(auth, provider).catch(err => {
        if (err.code !== 'auth/popup-closed-by-user') studentAuthError.innerText = "ავტორიზაციის შეცდომა.";
    });
});

safeListener('btn-email-register', 'click', () => {
    if (!emailInput.value || !passInput.value) return studentAuthError.innerText = "შეავსეთ ორივე ველი!";
    createUserWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .catch(err => studentAuthError.innerText = "რეგისტრაციის შეცდომა.");
});

safeListener('btn-email-login', 'click', () => {
    if (!emailInput.value || !passInput.value) return studentAuthError.innerText = "შეავსეთ ორივე ველი!";
    signInWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .catch(() => studentAuthError.innerText = "არასწორი ელ-ფოსტა ან პაროლი.");
});

safeListener('btn-logout-student', 'click', () => {
    signOut(auth).then(() => document.getElementById('btn-clear')?.click());
});

onAuthStateChanged(auth, async (user) => {
    const scoreDisplay = document.getElementById('student-score');
    if (user) {
        currentUser = user;
        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-name').innerText = displayName;
        
        studentAuthError.innerText = "";
        welcomeScreen.classList.add('hidden');
        teacherDashboard.classList.add('hidden');
        studentDashboard.classList.remove('hidden');

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            scoreDisplay.innerText = userSnap.data().score || 0;
        } else {
            await setDoc(userRef, { name: displayName, email: user.email, role: "student", score: 0 });
            scoreDisplay.innerText = 0;
        }
    } else {
        currentUser = null;
        isTaskSolved = false;
        if (scoreDisplay) scoreDisplay.innerText = "0";
        document.getElementById('user-name').innerText = "სტუმარი";
        
        studentDashboard.classList.add('hidden');
        if (teacherDashboard.classList.contains('hidden')) welcomeScreen.classList.remove('hidden');
        
        if (emailInput) emailInput.value = "";
        if (passInput) passInput.value = "";
    }
});

// =================== წრედის სიმულატორი ===================
let selectedPin = null;
let selectedPinElement = null;
let connections = []; 

const pins = document.querySelectorAll('.pin');
const svgLayer = document.getElementById('wires-svg');
const statusMsg = document.getElementById('status-message');

function drawWire(element1, element2) {
    if (!svgLayer) return;
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    const svgRect = svgLayer.getBoundingClientRect();

    const x1 = rect1.left + rect1.width / 2 - svgRect.left;
    const y1 = rect1.top + rect1.height / 2 - svgRect.top;
    const x2 = rect2.left + rect2.width / 2 - svgRect.left;
    const y2 = rect2.top + rect2.height / 2 - svgRect.top;

    const type1 = element1.getAttribute('data-type');
    const type2 = element2.getAttribute('data-type');
    const wireColor = (type1 === 'gnd' || type2 === 'gnd') ? '#1e293b' : '#dc2626';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', wireColor); 
    line.setAttribute('stroke-width', '5');
    line.setAttribute('stroke-linecap', 'round');
    
    svgLayer.appendChild(line);
}

pins.forEach(pin => {
    pin.addEventListener('click', (e) => {
        if (isTaskSolved) return;
        const pinId = pin.getAttribute('data-id');

        if (!selectedPin) {
            selectedPin = pinId;
            selectedPinElement = e.target;
            pin.classList.add('selected');
            if(statusMsg) {
                statusMsg.style.color = '#475569';
                statusMsg.innerText = "აირჩიე მეორე პინი...";
            }
        } else if (selectedPin !== pinId) {
            connections.push({ from: selectedPin, to: pinId });
            drawWire(selectedPinElement, e.target);
            document.querySelector('.pin.selected')?.classList.remove('selected');
            if(statusMsg) statusMsg.innerText = "";
            selectedPin = null;
            selectedPinElement = null;
        }
    });
});

safeListener('btn-check', 'click', async () => {
    if (isTaskSolved) return statusMsg && (statusMsg.style.color = '#eab308', statusMsg.innerText = "⚠️ ეს დავალება უკვე ჩაბარებული გაქვს!");

    const hasPower = connections.some(c => (c.from === 'pin-13' && c.to === 'led-anode') || (c.from === 'led-anode' && c.to === 'pin-13'));
    const hasGND = connections.some(c => (c.from === 'pin-gnd' && c.to === 'led-cathode') || (c.from === 'led-cathode' && c.to === 'pin-gnd'));

    if (hasPower && hasGND) {
        isTaskSolved = true; 
        if (statusMsg) {
            statusMsg.style.color = '#16a34a';
            statusMsg.innerText = "🎉 ყოჩაღ! წრედი სწორად არის აწყობილი. დაგერიცხა +10 ქულა!";
        }
        if (currentUser) {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { score: increment(10) });
            const scoreDisplay = document.getElementById('student-score');
            if (scoreDisplay) scoreDisplay.innerText = parseInt(scoreDisplay.innerText) + 10;
        }
    } else {
        if (statusMsg) {
            statusMsg.style.color = '#dc2626';
            statusMsg.innerText = "❌ შეცდომაა! გადაამოწმე პოლარობა (+ და -).";
        }
    }
});

safeListener('btn-clear', 'click', () => {
    connections = [];
    selectedPin = null;
    selectedPinElement = null;
    isTaskSolved = false; 
    pins.forEach(p => p.classList.remove('selected'));
    if(svgLayer) svgLayer.innerHTML = '';
    if(statusMsg) statusMsg.innerText = "დაფა გასუფთავდა.";
});