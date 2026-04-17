/**
 * VOLTPY SMM BOT - MAIN.JS (V4 - ULTRA STABLE)
 * Manuel kayıt kaldırıldı, tüm sistem otomatik senkronize çalışır.
 */

// 1. TELEGRAM SDK VE BAŞLANGIÇ AYARLARI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

// URL parametrelerini oku (Python backend'den gelen garantili veriler)
const urlParams = new URLSearchParams(window.location.search);
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const userId = urlParams.get('uid'); // Python'dan gelen ID
const backupName = urlParams.get('name') || "Oyuncu";
const maxEnergy = 500;

let isSpinning = false;
let autoClickActive = false;

// 2. ÖDÜL LİSTESİ (10 Segment - Tam Liste)
const rewards = [
    { text: "BOŞ", type: "lose", val: 0 },
    { text: "20 💰", type: "coin", val: 20 },
    { text: "50 💰", type: "coin", val: 50 },
    { text: "100 💰", type: "coin", val: 100 },
    { text: "250 💰", type: "coin", val: 250 },
    { text: "500 💰", type: "coin", val: 500 },
    { text: "1000 💰", type: "coin", val: 1000 },
    { text: "FULL ENERJİ", type: "energy", val: 500 },
    { text: "AUTO CLICK", type: "auto", val: 0 },
    { text: "BİR DAHA", type: "free", val: 100 }
];

// 3. ELEMENTLERİ SEÇ
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

// 4. SİSTEMİ ATEŞLE (INIT)
function init() {
    // Kullanıcı ismini ayarla (Telegram SDK yoksa URL'den al)
    if (elements.username) {
        const name = tg.initDataUnsafe?.user?.first_name || backupName;
        elements.username.textContent = name;
    }

    createWheel();
    setupNavigation();
    loadMarket();
    updateUI();
}

// 5. OTOMATİK KAYIT (Backend Senkronizasyonu)
function autoSave(reason = "sync", extra = "") {
    const data = JSON.stringify({
        action: reason,
        balance: balance,
        energy: currentEnergy,
        item: extra,
        uid: userId // Python'ın kullanıcıyı bulması için kritik
    });

    if (tg.sendData) {
        tg.sendData(data); // Veriyi gönderir ve uygulamayı kapatabilir (Bot veriyi anında DB'ye işler)
    } else {
        console.log("Tarayıcı Modu Kayıt:", data);
    }
}

// 6. ÇARK MANTIĞI
function createWheel() {
    if (!elements.wheel) return;
    const deg = 360 / rewards.length;
    
    rewards.forEach((r, i) => {
        const seg = document.createElement('div');
        seg.className = 'segment';
        // SkewY ve Rotate ile kusursuz pasta dilimi oluşturma
        seg.style.transform = `rotate(${i * deg}deg) skewY(${90 - deg}deg)`;
        
        const span = document.createElement('span');
        span.innerText = r.text;
        // Metni dilime göre dikleştir
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

        const randomRotation = Math.floor(Math.random() * 3600) + 1800; // En az 5 tur
        elements.wheel.style.transform = `rotate(${randomRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            const actualDeg = randomRotation % 360;
            const rewardIndex = Math.floor((360 - actualDeg) / (360 / rewards.length)) % rewards.length;
            const prize = rewards[rewardIndex];

            handlePrize(prize);
        }, 4000);
    };
}

function handlePrize(prize) {
    if (prize.type === "coin") balance += prize.val;
    if (prize.type === "energy") currentEnergy = prize.val;
    if (prize.type === "free") balance += 100;
    if (prize.type === "auto") startAutoClick();
    
    updateUI();
    alert(`🎁 Sonuç: ${prize.text}`);
    autoSave("wheel_spin", prize.text);
}

// 7. AUTO CLICKER (Ödül Çıkarsa)
function startAutoClick() {
    if (autoClickActive) return;
    autoClickActive = true;

    const autoInterval = setInterval(() => {
        if (currentEnergy > 0) {
            currentEnergy--;
            balance++;
            updateUI();
            if(elements.tapButton) elements.tapButton.style.transform = "scale(0.96)";
            setTimeout(() => { if(elements.tapButton) elements.tapButton.style.transform = "scale(1)"; }, 50);
        } else {
            clearInterval(autoInterval);
            autoClickActive = false;
            autoSave("auto_click_end");
        }
    }, 100);
}

// 8. TIKLAMA VE +1 EFEKTİ
function handleTap(e) {
    if (e) e.preventDefault();
    if (autoClickActive) return;

    if (currentEnergy > 0) {
        currentEnergy--;
        balance++;
        updateUI();

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
    }
}

// 9. MENÜ NAVİGASYONU
function setupNavigation() {
    elements.navBtns.forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.getAttribute('data-target');
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            elements.screens.forEach(s => {
                s.classList.remove('active');
                if (s.id === targetId) s.classList.add('active');
            });
            // Menü değişiminde de arka planda veriyi kaydet (isteğe bağlı)
            // autoSave("nav_sync"); 
        };
    });
}

// 10. MARKET
function loadMarket() {
    if (!elements.marketList) return;
    const items = [
        { name: "100 Instagram Takipçi", price: 5000 },
        { name: "500 Instagram Beğeni", price: 3000 },
        { name: "1000 YouTube İzlenme", price: 10000 }
    ];
    elements.marketList.innerHTML = items.map(item => `
        <div class="market-item">
            <div class="item-details"><h3>${item.name}</h3></div>
            <button class="buy-btn" onclick="processBuy('${item.name}', ${item.price})">${item.price} 💰</button>
        </div>
    `).join('');
}

window.processBuy = (name, price) => {
    if (balance >= price) {
        if (confirm(`${name} siparişi verilsin mi?`)) {
            balance -= price;
            updateUI();
            autoSave("purchase", name);
        }
    } else {
        alert("Bakiye yetersiz!");
    }
};

// 11. UI GÜNCELLEME
function updateUI() {
    if (elements.balance) elements.balance.textContent = balance;
    if (elements.energyText) elements.energyText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (elements.energyBar) {
        elements.energyBar.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
    }
}

// OLAY DİNLEYİCİLERİ
if (elements.tapButton) elements.tapButton.addEventListener('pointerdown', handleTap);

// BAŞLAT
init();
