/**
 * VOLTPY SMM BOT - NİHAİ ANA DOSYA
 * Özellikler: Ağırlıklı Olasılık (Kumar Mantığı), Canlı Senkronizasyon, Yükleme Perdesi Kontrolü
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

// 2. TELEGRAM & BAŞLANGIÇ VERİLERİ
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

// 3. 📡 CANLI VERİ DİNLEME (ONVALUE)
if (userId) {
    const userRef = ref(db, 'users/' + userId);
    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Eğer çark dönmüyorsa verileri güncelle (Çakışmayı önlemek için)
            if (!isSpinning) {
                balance = data.balance || 0;
                currentEnergy = data.energy || 0;
                updateUI();
                
                // İlk veri geldiğinde yükleme perdesini kaldır
                if (!firstDataLoaded) {
                    const overlay = document.getElementById('loading-overlay');
                    if (overlay) {
                        overlay.style.opacity = '0';
                        setTimeout(() => overlay.style.display = 'none', 500);
                    }
                    firstDataLoaded = true;
                }
            }
        }
    });
}

// 4. 🎲 ÇARK SİSTEMİ (Profesyonel Olasılık Ayarları)
const rewards = [
    { text: "BOŞ", type: "lose", val: 0, weight: 45 },      // %45 İhtimal (Zarar)
    { text: "5 💰", type: "coin", val: 5, weight: 20 },     // %20 İhtimal
    { text: "20 💰", type: "coin", val: 20, weight: 15 },   // %15 İhtimal
    { text: "TEKRAR", type: "free", val: 100, weight: 10 }, // %10 İhtimal (Başa baş)
    { text: "50 💰", type: "coin", val: 50, weight: 5 },    // %5 İhtimal
    { text: "100 💰", type: "coin", val: 100, weight: 3 },  // %3 İhtimal
    { text: "1000 💰", type: "coin", val: 1000, weight: 1 },// %1 İHTİMAL (BÜYÜK ÖDÜL)
    { text: "FULL EN", type: "energy", val: 500, weight: 1 } // %1 İhtimal
];

// Olasılığa göre ödül seçen fonksiyon
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
        if (isSpinning || balance < 100) {
            if (balance < 100) alert("Bakiyen yetersiz! Tıklayarak coin kazanabilirsin.");
            return;
        }

        balance -= 100;
        isSpinning = true;
        updateUI();
        bulutaYaz(); // Harcamayı hemen işle

        const prizeIdx = getWeightedPrize();
        const prize = rewards[prizeIdx];
        
        // Çarkın milimetrik hesaplanması
        const segmentAngle = 360 / rewards.length;
        // 5 tam tur + hedefin açısı (Hizalama için segmentin ortasına denk getiriyoruz)
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
            bulutaYaz(); // Ödülü hemen işle
            
            if (prize.type === "lose") {
                alert("😔 Şansına küs! Çok yakındı...");
            } else {
                alert(`🎉 TEBRİKLER! ${prize.text} KAZANDIN!`);
            }
        }, 5000);
    };
}

// 5. ✍️ BULUTA YAZMA FONKSİYONU
function bulutaYaz() {
    if (!userId) return;
    set(ref(db, 'users/' + userId), {
        balance: balance,
        energy: currentEnergy,
        username: backupName,
        lastUpdate: Date.now()
    }).catch(err => console.error("Kayıt Hatası:", err));
}

// 6. ARAYÜZ GÜNCELLEME
function updateUI() {
    const b = document.getElementById('balance');
    const et = document.getElementById('energy-text');
    const eb = document.getElementById('energy-bar');
    
    if (b) b.textContent = balance;
    if (et) et.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (eb) eb.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

// 7. TAPPER SİSTEMİ
const tapBtn = document.getElementById('tap-button');
if (tapBtn) {
    tapBtn.addEventListener('pointerdown', (e) => {
        if (currentEnergy > 0) {
            balance++;
            currentEnergy--;
            updateUI();
            bulutaYaz();

            // +1 Efekti
            const p = document.createElement('div');
            p.innerText = '+1'; p.className = 'plus-one';
            p.style.left = `${e.clientX}px`; p.style.top = `${e.clientY}px`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 800);

            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// 8. ÇARK ÇİZİMİ (Canvas)
function drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const arc = (2 * Math.PI) / rewards.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < rewards.length; i++) {
        const angle = i * arc - (Math.PI / 2); // 12 yönünden başlat
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

// 9. MARKET SİSTEMİ
window.buyItem = function(name, price) {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            bulutaYaz();
            alert("✅ Siparişiniz işleme alındı!");
        }
    } else {
        alert("❌ Yetersiz bakiye!");
    }
};

// 10. NAVİGASYON VE BAŞLATMA
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

    // Market İçeriğini Bas
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
