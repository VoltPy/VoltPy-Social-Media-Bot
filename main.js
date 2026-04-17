/**
 * VOLTPY SMM BOT - MAIN.JS (FULL SENKRONİZE SÜRÜM)
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

// 2. TELEGRAM & KULLANICI AYARLARI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid'); 
const backupName = urlParams.get('name') || "Oyuncu";

// GÜVENLİK DUVARI
if (!userId || tg.platform === "unknown" || tg.platform === undefined) {
    document.body.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:white;text-align:center;padding:20px;"><div><h1>🛑 ERİŞİM ENGELLENDİ</h1><p>Lütfen Telegram botu üzerinden giriş yapın.</p></div></div>`;
    throw new Error("Sadece Telegram girişi.");
}

// Global Değişkenler (Firebase'den gelecek değerlerle güncellenecek)
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const maxEnergy = 500;
let isSpinning = false;

// 3. 📡 CANLI DİNLEME (REAL-TIME LISTENER)
// Bu kısım sayesinde bulutta veri değiştiği an ekranın güncellenir.
const userRef = ref(db, 'users/' + userId);
onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        // Eğer kullanıcı şu an bir işlem (çark çevirme vs) yapmıyorsa veriyi eşitle
        if (!isSpinning) {
            balance = data.balance || 0;
            currentEnergy = data.energy || 0;
            updateUI();
            console.log("🔄 Bulut ile senkronize edildi!");
        }
    }
});

// 4. ✍️ BULUTA YAZMA FONKSİYONU
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
    const b = document.getElementById('balance');
    const et = document.getElementById('energy-text');
    const eb = document.getElementById('energy-bar');
    
    if (b) b.textContent = balance;
    if (et) et.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (eb) eb.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

// 6. TAPPER (TIKLAMA) SİSTEMİ
const tapBtn = document.getElementById('tap-button');
if (tapBtn) {
    tapBtn.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();
            bulutaYaz(); // Anlık Kayıt

            // +1 Efekti
            const p = document.createElement('div');
            p.innerText = '+1'; p.className = 'plus-one';
            p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 800);

            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        } else {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        }
    });
}

// 7. ŞANS ÇARKI (CANVAS)
const rewards = [
    { text: "BOŞ", type: "lose", val: 0 }, { text: "20 💰", type: "coin", val: 20 },
    { text: "50 💰", type: "coin", val: 50 }, { text: "100 💰", type: "coin", val: 100 },
    { text: "250 💰", type: "coin", val: 250 }, { text: "500 💰", type: "coin", val: 500 },
    { text: "1000 💰", type: "coin", val: 1000 }, { text: "FULL EN", type: "energy", val: 500 },
    { text: "5 💰", type: "coin", val: 5 }, { text: "TEKRAR", type: "free", val: 100 }
];

let currentRotation = 0;

function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;

    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2) - (arc / 2);
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
        ctx.font = "bold 14px Arial";
        ctx.fillText(rewards[i].text, radius - 15, 5);
        ctx.restore();
    }
}

const spinBtn = document.getElementById('spin-button');
if (spinBtn) {
    spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;
        
        balance -= 100;
        isSpinning = true;
        updateUI();
        bulutaYaz();

        const prizeIdx = Math.floor(Math.random() * rewards.length);
        const prize = rewards[prizeIdx];
        const targetRotation = currentRotation + 1440 + (360 - (prizeIdx * (360 / rewards.length)));
        currentRotation = targetRotation;

        const canvas = document.getElementById('wheel-canvas');
        canvas.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            if (prize.type === "coin") balance += prize.val;
            if (prize.type === "energy") currentEnergy = maxEnergy;
            if (prize.type === "free") balance += 100;
            updateUI();
            bulutaYaz();
            alert(`🎁 Kazancın: ${prize.text}`);
        }, 4000);
    };
}

// 8. MARKET & GLOBAL FONKSİYONLAR
window.buyItem = function(name, price) {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            bulutaYaz();
            alert("✅ Sipariş başarılı!");
        }
    } else {
        alert("❌ Bakiye yetersiz!");
    }
};

// 9. BAŞLATMA VE NAVİGASYON
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        const target = btn.getAttribute('data-target');
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

function init() {
    const userDisplay = document.getElementById('username');
    if (userDisplay) userDisplay.textContent = tg.initDataUnsafe?.user?.first_name || backupName;
    
    // Market Ürünlerini Listele
    const mList = document.getElementById('market-list');
    if (mList) {
        const items = [
            { n: "100 Instagram Takipçi", p: 5000 },
            { n: "500 Instagram Beğeni", p: 3000 },
            { n: "100 TikTok Takipçi", p: 2500 }
        ];
        mList.innerHTML = items.map(i => `
            <div class="market-item">
                <span>${i.n}</span>
                <button class="buy-btn" onclick="buyItem('${i.n}', ${i.p})">${i.p} 💰</button>
            </div>
        `).join('');
    }
    
    updateUI();
    drawWheel();
}

init();
