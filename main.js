/**
 * VOLTPY SMM BOT - MAIN.JS (V5 - BACKGROUND SYNC)
 */

// 1. TELEGRAM SDK VE PARAMETRELER
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

const urlParams = new URLSearchParams(window.location.search);
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const userId = urlParams.get('uid'); // Python'dan gelen ID
const backupName = urlParams.get('name') || "Oyuncu";
const maxEnergy = 500;

// --- KRİTİK: SENKRONİZASYON AYARLARI ---
// Buraya Ngrok'tan aldığın HTTPS linkini yazmalısın!
const SERVER_URL = "https://senin-ngrok-linkin.ngrok-free.app/save"; 
let lastSavedBalance = balance;
let syncTimer = null;
let isSpinning = false;
let autoClickActive = false;

// 2. ÖDÜLLER (10 Dilim)
const rewards = [
    { text: "BOŞ", type: "lose", val: 0 },
    { text: "20 💰", type: "coin", val: 20 },
    { text: "50 💰", type: "coin", val: 50 },
    { text: "100 💰", type: "coin", val: 100 },
    { text: "250 💰", type: "coin", val: 250 },
    { text: "500 💰", type: "coin", val: 500 },
    { text: "1000 💰", type: "coin", val: 1000 },
    { text: "FULL EN", type: "energy", val: 500 },
    { text: "AUTO", type: "auto", val: 0 },
    { text: "TEKRAR", type: "free", val: 100 }
];

// 3. ELEMENTLER
const elements = {
    balance: document.getElementById('balance'),
    energyText: document.getElementById('energy-text'),
    energyBar: document.getElementById('energy-bar'),
    tapButton: document.getElementById('tap-button'),
    username: document.getElementById('username'),
    marketList: document.getElementById('market-list'),
    spinBtn: document.getElementById('spin-button'),
    wheel: document.getElementById('lucky-wheel'),
    navBtns: document.querySelectorAll('.nav-btn'),
    screens: document.querySelectorAll('.screen')
};

// 4. SESSİZ ARKA PLAN KAYDI (FETCH)
function syncWithServer() {
    // Eğer bakiye değişmediyse isteği iptal et
    if (balance === lastSavedBalance) return;

    fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            uid: userId,
            balance: balance,
            energy: currentEnergy
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === "ok") {
            lastSavedBalance = balance;
            console.log("📡 Bulutla eşitlendi...");
        }
    })
    .catch(err => console.error("📡 Senkronizasyon hatası:", err));
}

// 5. BAŞLAT
function init() {
    if (elements.username) {
        elements.username.textContent = tg.initDataUnsafe?.user?.first_name || backupName;
    }
    createWheel();
    setupNavigation();
    loadMarket();
    updateUI();
    
    // Her 10 saniyede bir ne olur ne olmaz kaydet
    setInterval(syncWithServer, 10000);
}

// 6. TIKLAMA VE AKILLI SENKRONİZE
function handleTap(e) {
    if (e) e.preventDefault();
    if (autoClickActive || currentEnergy <= 0) return;

    currentEnergy--;
    balance++;
    updateUI();

    // +1 Animasyonu
    const plusOne = document.createElement('div');
    plusOne.innerText = '+1';
    plusOne.className = 'plus-one';
    const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
    const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);
    plusOne.style.left = `${x}px`;
    plusOne.style.top = `${y}px`;
    document.body.appendChild(plusOne);
    setTimeout(() => plusOne.remove(), 800);

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    // --- KRİTİK: Kullanıcı tıkı bırakınca 1.5 saniye sonra sessizce kaydet ---
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncWithServer, 1500);
}

// 7. ÇARK (KAZAN SAYFASI)
function createWheel() {
    if (!elements.wheel) return;
    const deg = 360 / rewards.length;
    rewards.forEach((r, i) => {
        const seg = document.createElement('div');
        seg.className = 'segment';
        seg.style.transform = `rotate(${i * deg}deg) skewY(${90 - deg}deg)`;
        const span = document.createElement('span');
        span.innerText = r.text;
        span.style.transform = `skewY(-${90 - deg}deg) rotate(${deg / 2}deg)`;
        seg.appendChild(span);
        elements.wheel.appendChild(seg);
    });
}

if (elements.spinBtn) {
    elements.spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;
        balance -= 100;
        isSpinning = true;
        updateUI();
        
        const rotation = Math.floor(Math.random() * 3600) + 1800;
        elements.wheel.style.transform = `rotate(${rotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            const actualDeg = rotation % 360;
            const rewardIdx = Math.floor((360 - actualDeg) / (360 / rewards.length)) % rewards.length;
            const prize = rewards[rewardIdx];
            
            if (prize.type === "coin") balance += prize.val;
            if (prize.type === "energy") currentEnergy = prize.val;
            if (prize.type === "free") balance += 100;
            
            alert(`🎁 Sonuç: ${prize.text}`);
            updateUI();
            syncWithServer(); // Çark durunca anında kaydet
        }, 4000);
    };
}

// 8. MARKET
function loadMarket() {
    const items = [
        { name: "100 Instagram Takipçi", price: 5000 },
        { name: "500 Instagram Beğeni", price: 3000 }
    ];
    elements.marketList.innerHTML = items.map(i => `
        <div class="market-item">
            <div class="item-details"><h3>${i.name}</h3></div>
            <button class="buy-btn" onclick="processBuy('${i.name}', ${i.price})">${i.price} 💰</button>
        </div>
    `).join('');
}

window.processBuy = (name, price) => {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            syncWithServer(); // Satın alınca anında kaydet
        }
    } else { alert("Bakiye yetersiz!"); }
};

// 9. UI VE NAVİGASYON
function setupNavigation() {
    elements.navBtns.forEach(btn => {
        btn.onclick = () => {
            const target = btn.getAttribute('data-target');
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            elements.screens.forEach(s => {
                s.classList.remove('active');
                if (s.id === target) s.classList.add('active');
            });
            syncWithServer(); // Sayfa değiştirince kaydet
        };
    });
}

function updateUI() {
    if (elements.balance) elements.balance.textContent = balance;
    if (elements.energyText) elements.energyText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (elements.energyBar) elements.energyBar.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
}

if (elements.tapButton) elements.tapButton.addEventListener('pointerdown', handleTap);

init();
