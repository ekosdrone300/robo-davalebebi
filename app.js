import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

// UI ელემენტები
const btnLogin = document.getElementById('btn-login');
const userNameDisplay = document.getElementById('user-name');
const scoreDisplay = document.getElementById('student-score');
const statusMsg = document.getElementById('status-message');

// სამუშაო სივრცის ელემენტები დასამალად
const workspaceEl = document.querySelector('.workspace');
const headerEl = document.querySelector('header');

// ვქმნით შეტყობინებას არაავტორიზებული მომხმარებლებისთვის
const loginMessageEl = document.createElement('div');
loginMessageEl.innerHTML = `
    <h2 style="font-size: 1.8rem; margin-bottom: 10px; color: #1e293b;">🔒 სისტემაში შესვლა აუცილებელია</h2>
    <p style="font-size: 1.1rem; color: #475569;">დავალებების სანახავად და ქულების დასაგროვებლად, გთხოვთ შეხვიდეთ თქვენი Google ანგარიშით მარცხენა პანელიდან.</p>
`;
loginMessageEl.style.textAlign = 'center';
loginMessageEl.style.marginTop = '80px';
// ვამატებთ ამ შეტყობინებას მთავარ კონტეინერში
document.querySelector('.content').appendChild(loginMessageEl);


// ავტორიზაციის ლოგიკა და ეკრანის მართვა
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userNameDisplay.innerText = user.displayName;
        btnLogin.innerText = "გასვლა";
        
        // მომხმარებელი შესულია: ვაჩენთ დავალებებს და ვმალავთ შეტყობინებას
        workspaceEl.style.display = 'flex';
        headerEl.style.display = 'flex';
        loginMessageEl.style.display = 'none';
        
        btnLogin.onclick = () => auth.signOut();

        // ბაზიდან ქულების წამოღება
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            scoreDisplay.innerText = userSnap.data().score || 0;
        } else {
            // ახალი მოსწავლის დარეგისტრირება ბაზაში
            await setDoc(userRef, {
                name: user.displayName,
                role: "student",
                score: 0
            });
            scoreDisplay.innerText = 0;
        }
    } else {
        currentUser = null;
        userNameDisplay.innerText = "სტუმარი";
        scoreDisplay.innerText = "0";
        btnLogin.innerText = "შესვლა";
        
        // მომხმარებელი არ არის შესული: ვმალავთ დავალებებს და ვაჩენთ შეტყობინებას
        workspaceEl.style.display = 'none';
        headerEl.style.display = 'none';
        loginMessageEl.style.display = 'block';
        
        btnLogin.onclick = () => {
            signInWithPopup(auth, provider).catch(err => {
                // ვაიგნორებთ შეცდომას, თუ ბავშვმა ფანჯარა უბრალოდ გათიშა
                if(err.code !== 'auth/popup-closed-by-user') {
                    console.error(err);
                }
            });
        };
    }
});

// --- წრედის სიმულატორი და ხაზების ხატვა ---
let selectedPin = null;
let selectedPinElement = null;
let connections = []; 

const pins = document.querySelectorAll('.pin');
const svgLayer = document.getElementById('wires-svg');

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

// დავალების შემოწმება
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
            const currentScore = parseInt(scoreDisplay.innerText);
            scoreDisplay.innerText = currentScore + 10;
        }
    } else {
        statusMsg.style.color = '#dc2626';
        statusMsg.innerText = "❌ შეცდომაა! გადაამოწმე პოლარობა (+ და -).";
    }
});

// გასუფთავება
document.getElementById('btn-clear').addEventListener('click', () => {
    connections = [];
    selectedPin = null;
    selectedPinElement = null;
    pins.forEach(p => p.classList.remove('selected'));
    svgLayer.innerHTML = '';
    statusMsg.innerText = "";
});