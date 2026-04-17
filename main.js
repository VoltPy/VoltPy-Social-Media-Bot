/**
 * VOLTPY SMM BOT - NİHAİ ANA DOSYA (V3 - HATA DÜZELTİLMİŞ)
 * Geliştirici: Berke (VoltPy)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. FIREBASE YAPILANDIRMASI
const firebaseConfig = {
    apiKey: "AIzaSyCumZ1RBi32yLpwvDFkb1Y7RbUPyZAOwYQ",
    authDomain: "voltpy1.firebaseapp.com",
    databaseURL: "https://voltpy1-default-rtdb.firebaseio.com",
    projectId: "voltpy1",
    storageBucket: "voltpy1.firebasestorage.app",
    messagingSenderId: "1027898071391",
    appId: "1:1027898071391:web:95909c9c9fe3dc54103eea",
    measurementId: "G-X6250NC6PW"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. TELEGRAM VE BAŞLANGIÇ AYARLARI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

// Global Değişkenler
let balance = 0;
let currentEnergy = 0;
const maxEnergy = 500;
let isSpinning = false;
let firstDataLoaded = false;

// 3. 📡 CANLI VERİ DİNLEME VE PERDE KONTROLÜ
if (userId) {
    const userRef = ref(db, 'users/' + userId);

    // ACİL DURUM ÇIKIŞI: Eğer Firebase 5 saniye içinde cevap vermezse perdeyi zorla kaldır
    setTimeout(() => {
        if (!firstDataLoaded) {
            console.warn("⚠️ Firebase yavaş yanıt verdi, acil durum açılışı yapılıyor.");
            removeOverlay();
            firstDataLoaded = true;
        }
    }, 5000);

    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Mevcut kullanıcı verileri
            if (!isSpinning) {
                balance = data.balance || 0;
                currentEnergy = data.energy || 0;
                updateUI();
            }
        } else {
            // YENİ KULLANICI: Firebase'de kaydı yoksa varsayılanlarla başlat
            balance = 100;
            currentEnergy = 500;
            updateUI();
            bulutaYaz(); // İlk kaydı oluştur
        }

        // Veri (boş veya dolu) ulaştığı anda perdeyi kaldır
        if (!firstDataLoaded) {
            removeOverlay();
            firstDataLoaded = true;
        }
    });
}

function removeOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500);
    }
}

// 4. ✍️ BULUTA YAZMA
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        username: backupName,
        lastUpdate: Date.now()
    }).catch(err => console.error("❌ Kayıt Hatası:", err));
}

// 5. ARAYÜZ GÜNCELLEME
function updateUI() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('energy-text').textContent = `${currentEnergy} / ${maxEnergy}`;
    document.getElementById('energy-bar').style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

// 6. TAPPER (TIKLAMA)
const tapBtn = document.getElementById('tap-button');
if (tapBtn) {
    tapBtn.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();
            bulutaYaz();

            const p = document.createElement('div');
            p.innerText = '+1'; p.className = 'plus-one';
            p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 800);

            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// 7. 🎲 KUMARBAZ ÇARKI (Ağırlıklı Olasılık)
const rewards = [
    { text: "BOŞ", type: "lose", val: 0, weight: 45 },      // %45 Kayıp
    { text: "5 💰", type: "coin", val: 5, weight: 20 },     // %20
    { text: "20 💰", type: "coin", val: 20, weight: 15 },   // %15
    { text: "TEKRAR", type: "free", val: 100, weight: 10 }, // %10
    { text: "50 💰", type: "coin", val: 50, weight: 5 },    // %5
    { text: "100 💰", type: "coin", val: 100, weight: 3 },  // %3
    { text: "1000 💰", type: "coin", val: 1000, weight: 1 },// %1 (BÜYÜK ÖDÜL)
    { text: "FULL EN", type: "energy", val: 500, weight: 1 } // %1
];

function getWeightedPrize() {
    let totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < rewards.length; i++) {
        if (random < rewards[i].weight) return i;
        random -= rewards[i].weight;
    }
    return 0;
}

let currentRotation = 0;
const spinBtn = document.getElementById('spin-button');

if (spinBtn) {
    spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;
        
        balance -= 100;
        isSpinning = true;
        updateUI();
        bulutaYaz();

        const prizeIdx = getWeightedPrize();
        const prize = rewards[prizeIdx];
        
        const segmentAngle = 360 / rewards.length;
        const targetAngle = (360 - (prizeIdx * segmentAngle)); 
        const totalSpin = currentRotation + 1800 + targetAngle; 
        
        currentRotation = totalSpin;

        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.2, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            if (prize.type === "coin") balance += prize.val;
            if (prize.type === "energy") currentEnergy = maxEnergy;
            if (prize.type === "free") balance += 100;
            
            updateUI();
            bulutaYaz();
            alert(prize.type === "lose" ? "😔 Şansına küs!" : `🎉 TEBRİKLER! ${prize.text}`);
        }, 5000);
    };
}

// 8. ÇARK ÇİZİMİ
function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;

    ctx.clearRect(0,0, canvas.width, canvas.height);

    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, angle, angle + arc);
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#1e293b';
        ctx.fill();
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
        ctx.font = "bold 13px Arial";
        ctx.fillText(rewards[i].text, radius - 15, 5);
        ctx.restore();
    }
}

// 9. MARKET
window.buyItem = function(name, price) {
    if (balance >= price) {
        if (confirm(`${name} alınsın mı?`)) {
            balance -= price;
            updateUI();
            bulutaYaz();
            alert("✅ İşlem başarılı!");
        }
    } else { alert("❌ Yetersiz bakiye!"); }
};

// 10. NAVİGASYON
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if(target === "earn") drawWheel();
    };
});

// Başlat
document.getElementById('username').textContent = tg.initDataUnsafe?.user?.first_name || backupName;
drawWheel();
updateUI();
