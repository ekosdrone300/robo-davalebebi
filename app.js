import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

// ავტორიზაციის ლოგიკა
const btnLogin = document.getElementById('btn-login');
const userNameDisplay = document.getElementById('user-name');

btnLogin.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => alert(error.message));
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        userNameDisplay.innerText = user.displayName;
        btnLogin.innerText = "გასვლა";
        btnLogin.onclick = () => auth.signOut();
    } else {
        userNameDisplay.innerText = "სტუმარი";
        btnLogin.innerText = "შესვლა";
        btnLogin.onclick = () => signInWithPopup(auth, provider);
    }
});

// --- წრედის სიმულატორი და ხაზების ხატვა ---
let selectedPin = null;
let selectedPinElement = null;
let connections = []; 

const pins = document.querySelectorAll('.pin');
const statusMsg = document.getElementById('status-message');
const svgLayer = document.getElementById('wires-svg');

// ხაზის დახატვის ფუნქცია
function drawWire(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    const svgRect = svgLayer.getBoundingClientRect();

    const x1 = rect1.left + rect1.width / 2 - svgRect.left;
    const y1 = rect1.top + rect1.height / 2 - svgRect.top;
    const x2 = rect2.left + rect2.width / 2 - svgRect.left;
    const y2 = rect2.top + rect2.height / 2 - svgRect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#3b82f6'); 
    line.setAttribute('stroke-width', '4');
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
            statusMsg.style.color = '#334155';
            statusMsg.innerText = "აირჩიე მეორე პინი შესაერთებლად...";
        } else if (selectedPin !== pinId) {
            connections.push({ from: selectedPin, to: pinId });
            drawWire(selectedPinElement, e.target);

            document.querySelector('.pin.selected').classList.remove('selected');
            statusMsg.style.color = 'green';
            statusMsg.innerText = `შეერთდა: ${selectedPin} ➡️ ${pinId}`;
            
            selectedPin = null;
            selectedPinElement = null;
        }
    });
});

// დავალების შემოწმება
document.getElementById('btn-check').addEventListener('click', () => {
    const hasPower = connections.some(c => 
        (c.from === 'pin-13' && c.to === 'led-anode') || (c.from === 'led-anode' && c.to === 'pin-13')
    );
    const hasGND = connections.some(c => 
        (c.from === 'pin-gnd' && c.to === 'led-cathode') || (c.from === 'led-cathode' && c.to === 'pin-gnd')
    );

    if (hasPower && hasGND) {
        statusMsg.style.color = 'green';
        statusMsg.innerText = "🎉 ყოჩაღ! წრედი სწორად არის აწყობილი.";
    } else {
        statusMsg.style.color = 'red';
        statusMsg.innerText = "❌ შეცდომაა! გადაამოწმე პოლარობა და სცადე თავიდან.";
    }
});

document.getElementById('btn-clear').addEventListener('click', () => {
    connections = [];
    selectedPin = null;
    selectedPinElement = null;
    pins.forEach(p => p.classList.remove('selected'));
    svgLayer.innerHTML = '';
    statusMsg.innerText = "დაფა გასუფთავდა.";
});