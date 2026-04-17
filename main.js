/* --- VOLTPY SMM BOT | FULL STABLE UI V3 --- */
:root {
    --bg-color: #0f172a; 
    --card-bg: #1e293b;
    --accent-color: #00ff88; /* Volt Yeşili */
    --text-color: #f8fafc;
    --hint-color: #94a3b8;
    --gold: #fbbf24;
}

/* Temel Sıfırlama */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    /* Metin seçimini ve mobil gecikmeleri kapat */
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

body {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    width: 100vw;
    height: 100vh;
    overflow: hidden; /* Sayfanın kaymasını engelle */
}

#app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    position: relative;
}

/* --- ÜST PANEL --- */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: rgba(15, 23, 42, 0.95);
    z-index: 1000;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.user-info { display: flex; align-items: center; gap: 10px; font-weight: 700; }
.user-info i { color: var(--accent-color); font-size: 22px; }

.balance-container {
    background: var(--card-bg);
    padding: 8px 14px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    border: 1px solid rgba(0, 255, 136, 0.2);
}
.balance-container i { color: var(--gold); }

/* --- EKRAN YÖNETİMİ --- */
.screen {
    display: none;
    flex: 1;
    flex-direction: column;
    padding: 20px;
    overflow-y: auto;
    width: 100%;
    align-items: center;
}

.screen.active {
    display: flex !important;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* --- ANA EKRAN (VOLT BUTONU) --- */
#home-screen { justify-content: space-around; padding-bottom: 110px; }

.coin-wrapper {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, var(--accent-color) 0%, #008844 100%);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 40px rgba(0, 255, 136, 0.25);
    cursor: pointer;
    transition: transform 0.05s;
}

.coin-wrapper:active { transform: scale(0.93); }

.coin-inner {
    width: 220px;
    height: 220px;
    border: 4px dashed rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.coin-inner i { font-size: 80px; color: white; }
.coin-inner span { font-size: 26px; font-weight: 900; color: white; letter-spacing: 2px; }

/* Enerji Barı */
.energy-section { width: 100%; max-width: 350px; }
.energy-info { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: bold; }
.energy-bar-container { height: 12px; background: var(--card-bg); border-radius: 20px; overflow: hidden; }
.energy-bar-fill { height: 100%; width: 100%; background: linear-gradient(90deg, var(--accent-color), #00ffcc); transition: width 0.3s linear; }

/* --- ŞANSLI VOLT (ÇARKIN DÜZELTİLDİĞİ KISIM) --- */
.wheel-box {
    position: relative;
    width: 300px;
    height: 300px;
    margin: 20px auto;
}

.wheel-pointer {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-top: 30px solid var(--accent-color);
    z-index: 100;
}

.wheel {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    position: relative;
    overflow: hidden; /* DIŞARI TAŞAN DİLİMLERİ KESER (KRİTİK!) */
    border: 8px solid var(--card-bg);
    background: var(--card-bg);
    transition: transform 4s cubic-bezier(0.15, 0, 0.15, 1);
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
}

.segment {
    position: absolute;
    width: 50%;
    height: 50%;
    left: 50%;
    top: 50%;
    transform-origin: 0 0; /* Dilimleri merkezden başlatır */
    display: flex;
    justify-content: center;
}

.segment:nth-child(odd) { background: #1e293b; }
.segment:nth-child(even) { background: #334155; }

.segment span {
    position: absolute;
    top: -110px; /* Yazıları merkeze yaklaştırır */
    left: 20px;
    transform: rotate(18deg); /* Yazıyı dilime göre dikleştirir */
    font-size: 10px;
    font-weight: 800;
    width: 60px;
    text-align: center;
    color: white;
}

/* --- BUTONLAR VE MARKET --- */
.action-btn {
    background: var(--accent-color);
    color: #000;
    border: none;
    padding: 16px;
    width: 100%;
    border-radius: 15px;
    font-weight: 900;
    font-size: 18px;
    cursor: pointer;
    margin-top: 15px;
    box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
}

.market-item {
    background: var(--card-bg);
    padding: 15px;
    border-radius: 15px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    width: 100%;
}

/* --- ALT MENÜ --- */
.bottom-nav {
    position: fixed;
    bottom: 0;
    width: 100%;
    max-width: 500px;
    display: flex;
    background: rgba(30, 41, 59, 0.98);
    padding: 12px 0 30px;
    border-radius: 20px 20px 0 0;
    backdrop-filter: blur(10px);
}

.nav-btn {
    flex: 1;
    background: none;
    border: none;
    color: var(--hint-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 11px;
}

.nav-btn i { font-size: 22px; }
.nav-btn.active { color: var(--accent-color); }

/* +1 Animasyonu */
.plus-one {
    position: fixed;
    color: var(--accent-color);
    font-size: 28px;
    font-weight: 900;
    pointer-events: none;
    animation: floatUp 0.8s ease-out forwards;
}

@keyframes floatUp {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-130px); }
}
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

// 4. SİSTEMİ BAŞLAT
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

// 5. OTOMATİK KAYIT (BACKEND SENKRONİZASYONU)
// Kullanıcıyı yormadan her önemli işlemde bota veri gönderir
function autoSave(reason = "sync", extra = "") {
    const data = JSON.stringify({
        action: reason,
        balance: balance,
        energy: currentEnergy,
        item: extra
    });

    if (tg.sendData) {
        tg.sendData(data); // Bu işlem Telegram'da mesaj olarak bota gider
    } else {
        console.log("AutoSave Log:", data);
    }
}

// 6. ÇARK MANTIĞI (DİNAMİK DİLİMLER)
function createWheel() {
    if (!elements.wheel) return;
    const deg = 360 / rewards.length;
    
    rewards.forEach((r, i) => {
        const seg = document.createElement('div');
        seg.className = 'segment';
        // Dilimi merkezden döndür ve CSS'teki üçgen yapısına uydur
        seg.style.transform = `rotate(${i * deg}deg) skewY(${90 - deg}deg)`;
        
        const span = document.createElement('span');
        span.innerText = r.text;
        // Metni dilimin içine düzgünce yerleştir
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

        // En az 5 tam tur + rastgele açı
        const randomRotation = Math.floor(Math.random() * 3600) + 1800;
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

// 7. AUTO CLICKER (ENERJİ BİTENE KADAR)
function startAutoClick() {
    if (autoClickActive) return;
    autoClickActive = true;

    const autoInterval = setInterval(() => {
        if (currentEnergy > 0) {
            currentEnergy--;
            balance++;
            updateUI();
            
            // Görsel efekt (buton hafif titrer)
            if(elements.tapButton) elements.tapButton.style.transform = "scale(0.96)";
            setTimeout(() => { if(elements.tapButton) elements.tapButton.style.transform = "scale(1)"; }, 50);
        } else {
            clearInterval(autoInterval);
            autoClickActive = false;
            autoSave("auto_click_end");
        }
    }, 100);
}

// 8. MANUEL TIKLAMA VE +1 EFEKTİ
function handleTap(e) {
    if (e) e.preventDefault();
    if (autoClickActive) return;

    if (currentEnergy > 0) {
        currentEnergy--;
        balance++;
        updateUI();

        // +1 Yazısı Oluştur
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

// 9. NAVİGASYON (MENÜLER ARASI GEÇİŞ)
function setupNavigation() {
    elements.navBtns.forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.getAttribute('data-target');
            
            // Aktif buton rengi
            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Aktif ekran gösterimi
            elements.screens.forEach(s => {
                s.classList.remove('active');
                if (s.id === targetId) s.classList.add('active');
            });

            // Menü değişiminde bakiye senkronize et (isteğe bağlı)
            // autoSave("nav_sync"); 
        };
    });
}

// 10. MARKET VE SATIN ALMA
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
        if (confirm(`${name} hizmetini başlatmak istiyor musun?`)) {
            balance -= price;
            updateUI();
            autoSave("purchase", name);
        }
    } else {
        alert("Üzgünüm, bakiye yetersiz!");
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

// SİSTEMİ ATEŞLE
init();
