import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
let isTaskSolved = false; // ჩამკეტი, რომ ქულები უსასრულოდ არ დაიწეროს

const welcomeScreen = document.getElementById('welcome-screen');
const studentDashboard = document.getElementById('student-dashboard');
const teacherDashboard = document.getElementById('teacher-dashboard');
const studentAuthError = document.getElementById('student-auth-error');

function safeListener(id, eventType, callback) {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventType, callback);
}

// --- მასწავლებლის პანელი ---
safeListener('btn-teacher-login', 'click', () => {
    const pass = document.getElementById('teacher-pass').value;
    const errorMsg = document.getElementById('teacher-error');
    if (pass === 'admin2004') {
        welcomeScreen.classList.add('hidden');
        teacherDashboard.classList.remove('hidden');
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

// --- მოსწავლის ავტორიზაცია ---
const emailInput = document.getElementById('student-email');
const passInput = document.getElementById('student-pass');

safeListener('btn-google-login', 'click', () => {
    studentAuthError.innerText = "";
    signInWithPopup(auth, provider).catch(err => {
        if (err.code !== 'auth/popup-closed-by-user') studentAuthError.innerText = "ავტორიზაციის შეცდომა.";
    });
});

safeListener('btn-email-register', 'click', () => {
    if (!emailInput.value || !passInput.value) {
        studentAuthError.innerText = "შეავსეთ ორივე ველი!";
        return;
    }
    createUserWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .catch(err => studentAuthError.innerText = "რეგისტრაცია ვერ მოხერხდა: " + err.message);
});

safeListener('btn-email-login', 'click', () => {
    if (!emailInput.value || !passInput.value) {
        studentAuthError.innerText = "შეავსეთ ორივე ველი!";
        return;
    }
    signInWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .catch(() => studentAuthError.innerText = "არასწორი ელ-ფოსტა ან პაროლი.");
});

safeListener('btn-logout-student', 'click', () => {
    signOut(auth).then(() => {
        document.getElementById('btn-clear')?.click(); // ასუფთავებს დაფას გამოსვლისას
    });
});

// --- Firebase ექაუნთის მსმენელი (არეგულირებს პირად კაბინეტს) ---
onAuthStateChanged(auth, async (user) => {
    const scoreDisplay = document.getElementById('student-score');
    
    if (user) {
        currentUser = user;
        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-name').innerText = displayName;
        
        studentAuthError.innerText = ""; // შეცდომის გასუფთავება
        welcomeScreen.classList.add('hidden');
        teacherDashboard.classList.add('hidden');
        studentDashboard.classList.remove('hidden');

        // ქულების მკაცრი წაკითხვა უშუალოდ მომხმარებლის UID-დან
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            scoreDisplay.innerText = userSnap.data().score || 0;
        } else {
            await setDoc(userRef, {
                name: displayName,
                email: user.email,
                role: "student",
                score: 0
            });
            scoreDisplay.innerText = 0;
        }
    } else {
        // გამოსვლისას ვასუფთავებთ ყველაფერს, რომ სხვა მომხმარებელზე არ გადავიდეს
        currentUser = null;
        isTaskSolved = false;
        if (scoreDisplay) scoreDisplay.innerText = "0";
        document.getElementById('user-name').innerText = "სტუმარი";
        
        studentDashboard.classList.add('hidden');
        if (teacherDashboard.classList.contains('hidden')) {
            welcomeScreen.classList.remove('hidden');
        }
        
        if (emailInput) emailInput.value = "";
        if (passInput) passInput.value = "";
    }
});

// --- წრედის სიმულატორი ---
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
        if (isTaskSolved) return; // თუ დავალება შესრულებულია, ახალს ვეღარ შეაერთებს სანამ არ გაასუფთავებს

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
    if (isTaskSolved) {
        if (statusMsg) {
            statusMsg.style.color = '#eab308';
            statusMsg.innerText = "⚠️ ეს დავალება უკვე ჩაბარებული გაქვს!";
        }
        return;
    }

    const hasPower = connections.some(c => 
        (c.from === 'pin-13' && c.to === 'led-anode') || (c.from === 'led-anode' && c.to === 'pin-13')
    );
    const hasGND = connections.some(c => 
        (c.from === 'pin-gnd' && c.to === 'led-cathode') || (c.from === 'led-cathode' && c.to === 'pin-gnd')
    );

    if (hasPower && hasGND) {
        isTaskSolved = true; // ვკეტავთ დავალებას რომ ქულა 100-ჯერ არ დაემატოს
        
        if (statusMsg) {
            statusMsg.style.color = '#16a34a';
            statusMsg.innerText = "🎉 ყოჩაღ! წრედი სწორად არის აწყობილი. დაგერიცხა +10 ქულა!";
        }
        
        if (currentUser) {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { score: increment(10) });
            
            const scoreDisplay = document.getElementById('student-score');
            if (scoreDisplay) {
                scoreDisplay.innerText = parseInt(scoreDisplay.innerText) + 10;
            }
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
    isTaskSolved = false; // ვხსნით ჩამკეტს გასუფთავებისას
    pins.forEach(p => p.classList.remove('selected'));
    if(svgLayer) svgLayer.innerHTML = '';
    if(statusMsg) statusMsg.innerText = "დაფა გასუფთავდა.";
});