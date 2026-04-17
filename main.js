/**
 * VOLTPY SMM BOT - MAIN.JS (V2 - AUTOMATIC & ADVANCED WHEEL)
 */

// 1. TELEGRAM SDK BAĞLANTISI
const tg = window.Telegram?.WebApp || {};
if (tg.expand) tg.expand();
if (tg.ready) tg.ready();

// 2. VERİLERİ URL PARAMETRELERİNDEN ÇEK
const urlParams = new URLSearchParams(window.location.search);
let balance = parseInt(urlParams.get('bal')) || 0;
let currentEnergy = parseInt(urlParams.get('en')) || 500;
const backupName = urlParams.get('name') || "Oyuncu";
const maxEnergy = 500;
let isSpinning = false;
let autoClickActive = false;

// 3. ÖDÜL LİSTESİ (10 Dilim)
const rewards = [
    { text: "BOŞ", type: "lose", value: 0 },
    { text: "20 💰", type: "coin", value: 20 },
    { text: "50 💰", type: "coin", value: 50 },
    { text: "100 💰", type: "coin", value: 100 },
    { text: "250 💰", type: "coin", value: 250 },
    { text: "500 💰", type: "coin", value: 500 },
    { text: "1000 💰", type: "coin", value: 1000 },
    { text: "FULL ENERJİ", type: "energy", value: 500 },
    { text: "AUTO CLICK", type: "auto", value: 0 },
    { text: "BİR DAHA", type: "free", value: 100 }
];

// 4. ELEMENTLERİ SEÇ
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

// 5. BAŞLATMA
function init() {
    if (elements.username) {
        const tgName = tg.initDataUnsafe?.user?.first_name;
        elements.username.textContent = tgName || backupName;
    }

    createWheel();
    setupNavigation();
    loadMarket();
    updateUI();
}

// 6. OTOMATİK KAYIT (Backend'e Veri Gönderme)
function autoSave(action = "sync", extra = "") {
    const data = JSON.stringify({
        action: action,
        balance: balance,
        energy: currentEnergy,
        item: extra
    });

    if (tg.sendData) {
        tg.sendData(data); // Telegram WebApp'i kapatıp veriyi bota iletir
    } else {
        console.log("Otomatik Kayıt (Simüle):", data);
    }
}

// 7. ÇARK OLUŞTURMA
function createWheel() {
    if (!elements.wheel) return;
    const deg = 360 / rewards.length;
    
    rewards.forEach((reward, i) => {
        const segment = document.createElement('div');
        segment.className = 'segment';
        // Dilimi döndür ve yamultarak pasta dilimi şekli ver
        segment.style.transform = `rotate(${i * deg}deg) skewY(${90 - deg}deg)`;
        
        const span = document.createElement('span');
        span.innerText = reward.text;
        // Metni dilimin içinde düzelt
        span.style.transform = `skewY(-${90 - deg}deg) rotate(${deg / 2}deg)`;
        
        segment.appendChild(span);
        elements.wheel.appendChild(segment);
    });
}

// 8. ÇARK ÇEVİRME MANTIĞI
if (elements.spinBtn) {
    elements.spinBtn.onclick = () => {
        if (isSpinning || balance < 100) return;

        balance -= 100;
        updateUI();
        isSpinning = true;

        // Rastgele dönüş (en az 5 tam tur + rastgele açı)
        const randomRotation = Math.floor(Math.random() * 3600) + 1800;
        elements.wheel.style.transform = `rotate(${randomRotation}deg)`;

        setTimeout(() => {
            isSpinning = false;
            const actualDeg = randomRotation % 360;
            // Oku (tepedeki işaretçiyi) gösteren ödülü bul
            const rewardIndex = Math.floor((360 - actualDeg) / (360 / rewards.length)) % rewards.length;
            const prize = rewards[rewardIndex];

            processPrize(prize);
        }, 4000);
    };
}

function processPrize(prize) {
    let msg = "";
    if (prize.type === "coin") {
        balance += prize.value;
        msg = `${prize.value} Coin kazandın!`;
    } else if (prize.type === "energy") {
        currentEnergy = prize.value;
        msg = "Enerjin tamamen doldu!";
    } else if (prize.type === "auto") {
        startAutoClick();
        msg = "Auto Click aktif! Enerji bitene kadar otomatik tıklar.";
    } else if (prize.type === "free") {
        balance += 100; // Bedeli iade et
        msg = "Ücretsiz bir hak daha kazandın!";
    } else if (prize.type === "lose") {
        msg = "Maalesef bu sefer boş geldi.";
    }

    alert(`🎁 ${msg}`);
    updateUI();
    autoSave("wheel_spin", prize.text);
}

// 9. AUTO CLICK (ENERJİ BİTENE KADAR)
function startAutoClick() {
    if (autoClickActive) return;
    autoClickActive = true;

    const interval = setInterval(() => {
        if (currentEnergy > 0) {
            currentEnergy--;
            balance++;
            updateUI();
            // Görsel efekt için butonu hafifçe titret
            if(elements.tapButton) elements.tapButton.style.transform = "scale(0.95)";
            setTimeout(() => { if(elements.tapButton) elements.tapButton.style.transform = "scale(1)"; }, 50);
        } else {
            clearInterval(interval);
            autoClickActive = false;
            autoSave("auto_click_finished");
        }
    }, 80); // Saniyede ~12 tık
}

// 10. TIKLAMA VE +1 EFEKTİ
function handleTap(e) {
    if (e) e.preventDefault();
    if (autoClickActive) return; // Auto click varken manuel tıkı kapatabilirsin

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

// 11. NAVİGASYON VE OTOMATİK SENKRONİZE
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
            
            // Her menü değişiminde verileri sessizce bot tarafına bildir (isteğe bağlı)
            // autoSave("menu_nav"); 
        };
    });
}

function loadMarket() {
    if (!elements.marketList) return;
    const items = [
        { name: "100 Instagram Takipçi", price: 5000 },
        { name: "500 Instagram Beğeni", price: 3000 }
    ];
    elements.marketList.innerHTML = items.map(item => `
        <div class="market-item">
            <div class="item-details"><h3>${item.name}</h3></div>
            <button class="buy-btn" onclick="buyItem('${item.name}', ${item.price})">${item.price} 💰</button>
        </div>
    `).join('');
}

window.buyItem = (name, price) => {
    if (balance >= price) {
        if (confirm(`${name} satın alınsın mı?`)) {
            balance -= price;
            updateUI();
            autoSave("purchase", name);
        }
    } else {
        alert("Yetersiz bakiye!");
    }
};

function updateUI() {
    if (elements.balance) elements.balance.textContent = balance;
    if (elements.energyText) elements.energyText.textContent = `${currentEnergy} / ${maxEnergy}`;
    if (elements.energyBar) {
        elements.energyBar.style.width = `${(currentEnergy / maxEnergy) * 100}%`;
    }
}

if (elements.tapButton) elements.tapButton.addEventListener('pointerdown', handleTap);

init();
