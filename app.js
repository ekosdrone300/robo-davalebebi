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

// Screens
const welcomeScreen = document.getElementById('welcome-screen');
const studentDashboard = document.getElementById('student-dashboard');
const teacherDashboard = document.getElementById('teacher-dashboard');

// --- მასწავლებლის ავტორიზაცია ---
document.getElementById('btn-teacher-login').addEventListener('click', () => {
    const pass = document.getElementById('teacher-pass').value;
    const errorMsg = document.getElementById('teacher-error');
    
    if (pass === 'admin2004') {
        welcomeScreen.classList.add('hidden');
        teacherDashboard.classList.remove('hidden');
    } else {
        errorMsg.innerText = "❌ არასწორი პაროლი!";
    }
});

document.getElementById('btn-logout-teacher').addEventListener('click', () => {
    teacherDashboard.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    document.getElementById('teacher-pass').value = "";
    document.getElementById('teacher-error').innerText = "";
});

// --- მოსწავლის ავტორიზაცია ---
const emailInput = document.getElementById('student-email');
const passInput = document.getElementById('student-pass');

// 1. Google-ით
document.getElementById('btn-google-login').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => {
        if(err.code !== 'auth/popup-closed-by-user') alert(err.message);
    });
});

// 2. ელ-ფოსტით რეგისტრაცია
document.getElementById('btn-email-register').addEventListener('click', () => {
    if(!emailInput.value || !passInput.value) return alert("შეავსეთ ორივე ველი!");
    createUserWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .catch(err => alert("შეცდომა: " + err.message));
});

// 3. ელ-ფოსტით შესვლა
document.getElementById('btn-email-login').addEventListener('click', () => {
    if(!emailInput.value || !passInput.value) return alert("შეავსეთ ორივე ველი!");
    signInWithEmailAndPassword(auth, emailInput.value, passInput.value)
        .catch(err => alert("არასწორი პაროლი ან მაილი."));
});

// 4. სტუდენტის გასვლა
document.getElementById('btn-logout-student').addEventListener('click', () => {
    signOut(auth);
});

// Auth State მსმენელი მოსწავლეებისთვის
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-name').innerText = user.displayName || user.email.split('@')[0];
        
        // ეკრანების ცვლილება
        welcomeScreen.classList.add('hidden');
        teacherDashboard.classList.add('hidden');
        studentDashboard.classList.remove('hidden');

        // ბაზის ლოგიკა
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            document.getElementById('student-score').innerText = userSnap.data().score || 0;
        } else {
            await setDoc(userRef, {
                name: user.displayName || user.email,
                role: "student",
                score: 0
            });
            document.getElementById('student-score').innerText = 0;
        }
    } else {
        currentUser = null;
        // ვაბრუნებთ საწყის ეკრანზე
        studentDashboard.classList.add('hidden');
        if(teacherDashboard.classList.contains('hidden')) {
            welcomeScreen.classList.remove('hidden');
        }
        emailInput.value = "";
        passInput.value = "";
    }
});

// --- წრედის სიმულატორი (მოსწავლისთვის) ---
let selectedPin = null;
let selectedPinElement = null;
let connections = []; 

const pins = document.querySelectorAll('.pin');
const svgLayer = document.getElementById('wires-svg');
const statusMsg = document.getElementById('status-message');

function drawWire(element1, element2) {
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
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    
    svgLayer.appendChild(line);
}

pins.forEach(pin => {
    pin.addEventListener('click', (e) => {
        const pinId = pin.getAttribute('data-id');

        if (!selectedPin) {
            selectedPin = pinId;
            selectedPinElement = e.target;
            pin.classList.add('selected');
            statusMsg.style.color = '#475569';
            statusMsg.innerText = "აირჩიე მეორე პინი...";
        } else if (selectedPin !== pinId) {
            connections.push({ from: selectedPin, to: pinId });
            drawWire(selectedPinElement, e.target);
            document.querySelector('.pin.selected').classList.remove('selected');
            statusMsg.innerText = "";
            selectedPin = null;
            selectedPinElement = null;
        }
    });
});

document.getElementById('btn-check').addEventListener('click', async () => {
    const hasPower = connections.some(c => 
        (c.from === 'pin-13' && c.to === 'led-anode') || (c.from === 'led-anode' && c.to === 'pin-13')
    );
    const hasGND = connections.some(c => 
        (c.from === 'pin-gnd' && c.to === 'led-cathode') || (c.from === 'led-cathode' && c.to === 'pin-gnd')
    );

    if (hasPower && hasGND) {
        statusMsg.style.color = '#16a34a';
        statusMsg.innerText = "🎉 ყოჩაღ! წრედი სწორად არის აწყობილი. +10 ქულა!";
        
        if (currentUser) {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { score: increment(10) });
            const scoreDisplay = document.getElementById('student-score');
            scoreDisplay.innerText = parseInt(scoreDisplay.innerText) + 10;
        }
    } else {
        statusMsg.style.color = '#dc2626';
        statusMsg.innerText = "❌ შეცდომაა! გადაამოწმე პოლარობა (+ და -).";
    }
});

document.getElementById('btn-clear').addEventListener('click', () => {
    connections = [];
    selectedPin = null;
    selectedPinElement = null;
    pins.forEach(p => p.classList.remove('selected'));
    svgLayer.innerHTML = '';
    statusMsg.innerText = "";
});