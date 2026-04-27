'use strict';

/* ================================================
   設定 — 角色 & 預設資料
   ================================================ */
const CHARS = [
  { id: 'shinchan', name: '小新', img: 'images/shinchan.png' },
  { id: 'kazama',   name: '風間', img: 'images/kazama.png' },
  { id: 'masao',    name: '正男', img: 'images/masao.png' },
  { id: 'bo',       name: '阿呆', img: 'images/bo.png' },
  { id: 'nene',     name: '妮妮', img: 'images/nene.png' },
];

const DEFAULT_DATA = [8, 5, 10, 1, 7];

/* ================================================
   錯誤訊息（可愛語氣）
   ================================================ */
const MSGS = {
  notMin: [
    '哎呀～這個不是最小的！再找找看！😅',
    '嗯嗯～要找最小的那個才對喔！🤔',
    '不對不對！最小的在哪裡呢？👀',
    '再試試看！找出數字最小的角色！💫',
    '哞哞～仔細看看哪個數字最小！🌟',
  ],
  clickFirst: [
    '先點選角色，再拖曳喔！😄',
    '要先點角色才能拖！試試看！✨',
    '按一下角色先，再把他拖過來！🎯',
  ],
  wrongSlot: [
    '哎呀～插入的位置不對耶！再想想！😅',
    '不太對喔！比比看前後的數字大小再決定！🤔',
    '嗯嗯～想想要插在誰的前面～🌟',
    '再試看看！遇到比自己大的數字就插在它前面！',
  ],
  notFirst: [
    '要拿有標示的第一個角色喔！😄',
    '插入排序法要從第一個開始！看看那個在閃爍的！✨',
  ],
};

/* ================================================
   APP 狀態
   ================================================ */
let selState = null;   // 選擇排序法狀態
let insState = null;   // 插入排序法狀態
let dragId   = null;   // 目前正在拖曳的 item id

/* ================================================
   音效系統（Web Audio API，無需外部檔案）
   ================================================ */
let _ac = null;
function _getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  return _ac;
}
function _resume() {
  try {
    const ac = _getAC();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch(e) { return null; }
}

/* 點選角色：軽快彈音 */
function sfxClick() {
  const ac = _resume(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(500, ac.currentTime);
  o.frequency.linearRampToValueAtTime(700, ac.currentTime + 0.08);
  g.gain.setValueAtTime(0.22, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  o.start(); o.stop(ac.currentTime + 0.15);
}

/* 拖曳開始：短促 whoosh */
function sfxDrag() {
  const ac = _resume(); if (!ac) return;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.1), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1-i/d.length) * 0.28;
  const src = ac.createBufferSource(), flt = ac.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.setValueAtTime(900, ac.currentTime);
  flt.frequency.linearRampToValueAtTime(2800, ac.currentTime + 0.1);
  flt.Q.value = 0.7;
  src.buffer = buf; src.connect(flt); flt.connect(ac.destination);
  src.start();
}

/* 放入成功： thud + 高音閃光 */
function sfxDrop() {
  const ac = _resume(); if (!ac) return;
  const o1 = ac.createOscillator(), g1 = ac.createGain();
  o1.connect(g1); g1.connect(ac.destination);
  o1.type = 'sine';
  o1.frequency.setValueAtTime(200, ac.currentTime);
  o1.frequency.exponentialRampToValueAtTime(70, ac.currentTime + 0.2);
  g1.gain.setValueAtTime(0.4, ac.currentTime);
  g1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.24);
  o1.start(); o1.stop(ac.currentTime + 0.24);
  const o2 = ac.createOscillator(), g2 = ac.createGain();
  o2.connect(g2); g2.connect(ac.destination);
  o2.type = 'triangle';
  o2.frequency.setValueAtTime(880, ac.currentTime + 0.05);
  o2.frequency.linearRampToValueAtTime(1200, ac.currentTime + 0.24);
  g2.gain.setValueAtTime(0, ac.currentTime);
  g2.gain.linearRampToValueAtTime(0.18, ac.currentTime + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  o2.start(); o2.stop(ac.currentTime + 0.3);
}

/* 完成排序：上升四音 */
function sfxWin() {
  const ac = _resume(); if (!ac) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = 'triangle';
    const t = ac.currentTime + i * 0.13;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.start(t); o.stop(t + 0.38);
  });
}

/* 錯誤操作：下降 buzz */
function sfxError() {
  const ac = _resume(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(320, ac.currentTime);
  o.frequency.linearRampToValueAtTime(180, ac.currentTime + 0.16);
  g.gain.setValueAtTime(0.13, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
  o.start(); o.stop(ac.currentTime + 0.18);
}

/* ================================================
   工具函式
   ================================================ */
function randMsg(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseData(str) {
  return str
    .split(/[\s,、，]+/)
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n > 0 && n <= 99)
    .slice(0, 5);
}

function randData(n = 5) {
  const pool = [];
  while (pool.length < n) {
    const v = Math.floor(Math.random() * 19) + 1;
    if (!pool.includes(v)) pool.push(v);
  }
  return pool;
}

function buildItems(data) {
  return data.map((val, i) => ({
    id:   `item${i}`,
    val,
    name: CHARS[i % CHARS.length].name,
    img:  CHARS[i % CHARS.length].img,
  }));
}

/* ── 角色卡片 HTML ── */
function charCard(item, opts = {}) {
  const {
    selected    = false,
    highlighted = false,
    draggable   = false,
    justPlaced  = false,
  } = opts;

  let cls = 'char-card';
  if (selected)    cls += ' selected';
  if (highlighted) cls += ' highlighted';
  if (justPlaced)  cls += ' just-placed';

  /* 從圖片路徑取得角色 id（例如 images/masao.png → masao） */
  const charId = item.img.replace('images/', '').replace('.png', '');

  return `
    <div class="${cls}"
         data-id="${item.id}"
         data-val="${item.val}"
         data-charid="${charId}"
         draggable="${draggable}"
         id="card-${item.id}">
      <div class="char-wrapper">
        <img src="${item.img}" alt="${item.name}" class="char-img" draggable="false">
        <span class="char-num">${item.val}</span>
      </div>
      <span class="char-name">${item.name}</span>
    </div>`;
}

/* ================================================
   Toast
   ================================================ */
let _toastTimer = null;

function showToast(msg, type = 'error') {
  if (type === 'error') sfxError();
  const el   = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const txt  = document.getElementById('toast-msg');

  el.className = `show ${type}`;
  icon.textContent = type === 'error' ? '😅' : '✅';
  txt.textContent  = msg;

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'hidden'; }, 3200);
}

/* ================================================
   Celebration
   ================================================ */
function showCelebration(onClose) {
  const el = document.getElementById('celebration');
  el.classList.remove('hidden');
  sfxWin();
  spawnConfetti();

  /* 1 秒後自動關閉，關閉後執行 onClose（顯示再玩一次按鈕）*/
  setTimeout(() => {
    el.classList.add('hidden');
    if (onClose) onClose();
  }, 1000);
}

function spawnConfetti() {
  const c = document.getElementById('confetti-container');
  c.innerHTML = '';
  const COLORS = ['#FF8C42','#FFE066','#52B788','#5BAFD6','#FF7BAC','#A78BFA','#FF5252'];
  for (let i = 0; i < 110; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const dur = (1.4 + Math.random() * 2.2).toFixed(2);
    const del = (Math.random() * 0.9).toFixed(2);
    const w   = (8 + Math.random() * 10).toFixed(0);
    p.style.cssText = `
      left:${(Math.random()*100).toFixed(1)}vw;
      width:${w}px; height:${w}px;
      background:${COLORS[Math.floor(Math.random()*COLORS.length)]};
      border-radius:${Math.random()>0.5?'50%':'3px'};
      animation-duration:${dur}s;
      animation-delay:${del}s;`;
    c.appendChild(p);
  }
}

/* ================================================
   ── NAVIGATION ──
   ================================================ */
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');

  if      (page === 'home')      renderHome();
  else if (page === 'selection') renderSelPage();
  else if (page === 'insertion') renderInsPage();
  else if (page === 'scratch')   renderScratchPage();
}

function initSidebar() {
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
  });
}

/* ================================================
   ── 首頁 ──
   ================================================ */
function renderHome() {
  document.getElementById('page-home').innerHTML = `
    <div class="page-header">
      <h1 class="page-title">🎒 演算法教室</h1>
      <p class="page-subtitle">和小新的朋友們一起學習排序演算法！</p>
    </div>
    <div class="home-content">

      <div class="info-card">
        <div class="card-tag">📖 演算法介紹</div>
        <h2 class="card-title">什麼是演算法？</h2>
        <div class="card-body">
          <p>演算法簡單的說就是<strong>解決問題的方法</strong>！</p>
          <p>演算法是一個可以交由電腦進行計算的具體步驟，它是一組有限運算規則的集合，包含問題精確的
             <em>輸入</em>、<em>處理</em>、<em>輸出</em>。</p>
          <p>在資訊科技領域中，不同的演算法都必須能夠精確解決問題。執行不同的演算法也要評估<strong>效能差異</strong>，以便選用適當的演算法。</p>
        </div>
      </div>

      <div class="info-card">
        <div class="card-tag">🔢 排序演算法</div>
        <h2 class="card-title">什麼是排序演算法？</h2>
        <div class="card-body">
          <p>將資料依順序排列是我們經常需要處理的問題。</p>
          <p>例如：考試成績從高到低排列、電話簿裡的名字按字母排列……這些都需要排序演算法！</p>
        </div>
        <div class="sort-cards">
          <a href="#" class="sort-card blue-card" data-page="selection" id="home-sel">
            <span class="sort-card-icon">🔍</span>
            <span class="sort-card-name">選擇排序法</span>
            <span class="sort-card-desc">每次從未排序中找最小的</span>
          </a>
          <a href="#" class="sort-card green-card" data-page="insertion" id="home-ins">
            <span class="sort-card-icon">📌</span>
            <span class="sort-card-name">插入排序法</span>
            <span class="sort-card-desc">逐一取出插入正確位置</span>
          </a>
        </div>
      </div>

    </div>`;

  document.querySelectorAll('#page-home [data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.page); });
  });
}

/* ================================================
   ══════════════════════════════
   選擇排序法
   ══════════════════════════════
   ================================================ */
function initSel(data) {
  const items = buildItems(data);
  selState = {
    data:        [...data],
    items,
    unsorted:    [...items],
    sorted:      [],
    round:       1,
    selected:    null,   // 目前已點選的 item id
    lastPlaced:  null,   // 剛放入已排序的 item id（wobble）
    phase:       'play', // 'play' | 'roundDone' | 'done'
  };
}

function findMin(arr) {
  return arr.reduce((m, i) => i.val < m.val ? i : m);
}

/* ── 選擇排序法頁面 ── */
function renderSelPage() {
  const container = document.getElementById('page-selection');
  if (!selState) initSel([...DEFAULT_DATA]);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">🔍 選擇排序法</h1>
      <p class="page-subtitle">每次從未排序中找最小的，加到已排序的最後！</p>
    </div>
    <div class="sort-page">
      <div class="data-bar">
        <span class="data-label">📝 原始資料：</span>
        <input id="sel-input" class="data-input" type="text"
               value="${selState.data.join(', ')}" placeholder="輸入 2～5 個數字">
        <button class="btn btn-yellow" id="sel-rand">🎲 隨機</button>
        <button class="btn btn-grey"   id="sel-reset">🔄 重設</button>
      </div>
      <div id="sel-game"></div>
      <div class="steps-panel" id="sel-steps">
        <div class="steps-header" id="sel-steps-hdr">
          <span class="steps-title">📋 選擇排序法的流程步驟</span>
          <span class="steps-arrow">▲</span>
        </div>
        <div class="steps-body">
          <div class="step">
            <div class="step-n">1</div>
            <div class="step-t">先從未排序的原始資料中找到第一個最小的元素，將它加到已排序數列的第一項。</div>
          </div>
          <div class="step">
            <div class="step-n">2</div>
            <div class="step-t">接著從未排序的原始資料中找到最小的元素。</div>
          </div>
          <div class="step">
            <div class="step-n">3</div>
            <div class="step-t">將此元素加到已排序數列的最後一項。</div>
          </div>
          <div class="step">
            <div class="step-n">4</div>
            <div class="step-t">重複第 2、3 點的步驟，直到原始資料全部處理完成。</div>
          </div>
        </div>
      </div>
      <div class="scratch-btn-container" style="margin-top: 16px; display: flex; justify-content: center;">
        <button class="btn" id="go-scratch" style="background: #2D3436; color: white; border-radius: 12px; padding: 12px 24px; font-weight: 900; box-shadow: var(--sh-sm);">
          🎬 觀看 Scratch 程式邏輯 (小白演示)
        </button>
      </div>
    </div>`;

  /* ── 綁定資料列事件 ── */
  document.getElementById('sel-rand').addEventListener('click', () => {
    const d = randData(5);
    document.getElementById('sel-input').value = d.join(', ');
    initSel(d);
    renderSelGame();
  });

  document.getElementById('sel-reset').addEventListener('click', () => {
    const d = parseData(document.getElementById('sel-input').value);
    if (d.length < 2) { showToast('請輸入 2～5 個數字喔！😄'); return; }
    initSel(d);
    renderSelGame();
  });

  document.getElementById('sel-steps-hdr').addEventListener('click', () => {
    document.getElementById('sel-steps').classList.toggle('collapsed');
  });

  document.getElementById('go-scratch')?.addEventListener('click', () => {
    navigateTo('scratch');
  });

  renderSelGame();
}

/* ── 渲染選擇排序法遊戲區 ── */
function renderSelGame() {
  const g = document.getElementById('sel-game');
  if (!g) return;

  const s     = selState;
  const total = s.items.length;

  /* 完成狀態 */
  if (s.phase === 'done') {
    g.innerHTML = `
      <div class="round-badge done-badge">
        🎉 排序完成！
        <span class="round-hint">所有資料已從小到大排好了！</span>
      </div>
      <div class="arena">
        <!-- 未排序區（空白） -->
        <div class="zone unsorted-zone">
          <div class="zone-label">📦 未排序</div>
          <div class="zone-body"></div>
        </div>
        <!-- 已排序區 -->
        <div class="zone sorted-zone">
          <div class="zone-label">✅ 已排序</div>
          <div class="zone-body">
            ${s.sorted.map(i => charCard(i, { justPlaced: i.id === s.lastPlaced })).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-orange next-btn btn-hidden" id="sel-retry">🎮 再玩一次</button>`;
    /* 1 秒動畫結束後，顯示「再玩一次」按鈕 */
    showCelebration(() => {
      const retryBtn = document.getElementById('sel-retry');
      if (retryBtn) {
        retryBtn.classList.remove('btn-hidden');
        retryBtn.onclick = () => { initSel(s.data); renderSelGame(); };
      }
    });
    return;
  }

  const isDone  = s.phase === 'roundDone';
  const minItem = s.unsorted.length > 0 ? findMin(s.unsorted) : null;

  let hintText = '';
  if (isDone) {
    hintText = `第 ${s.round} 回合完成！`;
  } else if (!s.selected) {
    hintText = `點選最小值的角色（先點選，再拖到已排序區）`;
  } else {
    const selItem = s.unsorted.find(i => i.id === s.selected);
    hintText = `把「${selItem ? selItem.name : ''}」拖到已排序區！`;
  }

  /* 已排序區的拖放目標 */
  const dropZoneHTML = !isDone ? `
    <div class="drop-zone ${s.selected ? 'drop-ready' : ''}" id="sel-drop">
      <span class="drop-icon">${s.selected ? '⬇' : '📥'}</span>
      <span class="drop-hint">${s.selected ? '拖來這裡！' : '先點選角色'}</span>
    </div>` : '';

  g.innerHTML = `
    <div class="round-badge">
      第 ${s.round} / ${total} 回合
      <span class="round-hint">${hintText}</span>
    </div>
    <div class="arena">
      <!-- 未排序區 -->
      <div class="zone unsorted-zone">
        <div class="zone-label">📦 未排序</div>
        <div class="zone-body" id="sel-unsorted">
          ${s.unsorted.map(item => charCard(item, {
            selected:  item.id === s.selected,
            draggable: !isDone && item.id === s.selected,
          })).join('')}
        </div>
      </div>
      <!-- 已排序區 -->
      <div class="zone sorted-zone">
        <div class="zone-label">✅ 已排序</div>
        <div class="zone-body" id="sel-sorted">
          ${s.sorted.map(i => charCard(i, { justPlaced: i.id === s.lastPlaced })).join('')}
          ${dropZoneHTML}
        </div>
      </div>
    </div>
    ${isDone ? `<button class="btn btn-orange next-btn" id="sel-next">下一回合 →</button>` : ''}`;

  bindSelEvents();
}

/* ── 選擇排序法事件綁定 ── */
function bindSelEvents() {
  const s = selState;

  /* 下一回合 */
  if (s.phase === 'roundDone') {
    document.getElementById('sel-next')?.addEventListener('click', () => {
      s.round++;
      s.phase    = 'play';
      s.selected = null;
      s.lastPlaced = null;
      renderSelGame();
    });
    return;
  }

  /* 點選未排序角色 */
  document.querySelectorAll('#sel-unsorted .char-card').forEach(card => {
    card.addEventListener('click', () => {
      const id   = card.dataset.id;
      const item = s.unsorted.find(i => i.id === id);
      if (!item) return;

      /* 點已選的 → 取消選取 */
      if (s.selected === id) {
        s.selected = null;
        renderSelGame();
        return;
      }

      const minItem = findMin(s.unsorted);
      if (item.id !== minItem.id) {
        showToast(randMsg(MSGS.notMin));
        return;
      }

      sfxClick();
      s.selected = id;
      renderSelGame();
    });

    /* 嘗試直接拖未選取的角色 */
    card.addEventListener('dragstart', e => {
      const id = card.dataset.id;
      if (id !== s.selected) {
        e.preventDefault();
        if (!s.selected) {
          showToast(randMsg(MSGS.clickFirst));
        } else {
          showToast(randMsg(MSGS.notMin));
        }
        return;
      }
      dragId = id;
      e.dataTransfer.setData('text/plain', id);
      sfxDrag();
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      dragId = null;
      card.classList.remove('dragging');
    });
  });

  /* 已排序區的放置目標 */
  const dropZone = document.getElementById('sel-drop');
  if (!dropZone) return;

  dropZone.addEventListener('dragover', e => {
    if (!s.selected) return;
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (!id || id !== s.selected) return;

    const idx = s.unsorted.findIndex(i => i.id === id);
    if (idx === -1) return;

    const [moved] = s.unsorted.splice(idx, 1);
    s.sorted.push(moved);
    s.lastPlaced = moved.id;
    s.selected   = null;
    sfxDrop();
    s.phase      = s.unsorted.length === 0 ? 'done' : 'roundDone';
    renderSelGame();
  });
}

/* ================================================
   ══════════════════════════════
   插入排序法
   ══════════════════════════════
   ================================================ */
function initIns(data) {
  const items = buildItems(data);
  insState = {
    data:       [...data],
    items,
    unsorted:   [...items],
    sorted:     [],
    round:      1,
    lastPlaced: null,
    phase:      'play',
  };
}

/** 找出正確插入位置（返回 0-based index） */
function correctSlot(sorted, val) {
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].val > val) return i;
  }
  return sorted.length;
}

/* ── 插入排序法頁面 ── */
function renderInsPage() {
  const container = document.getElementById('page-insertion');
  if (!insState) initIns([...DEFAULT_DATA]);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">📌 插入排序法</h1>
      <p class="page-subtitle">逐一取出元素，插入已排序數列的正確位置！</p>
    </div>
    <div class="sort-page">
      <div class="data-bar">
        <span class="data-label">📝 原始資料：</span>
        <input id="ins-input" class="data-input" type="text"
               value="${insState.data.join(', ')}" placeholder="輸入 2～5 個數字">
        <button class="btn btn-yellow" id="ins-rand">🎲 隨機</button>
        <button class="btn btn-grey"   id="ins-reset">🔄 重設</button>
      </div>
      <div id="ins-game"></div>
      <div class="steps-panel" id="ins-steps">
        <div class="steps-header" id="ins-steps-hdr">
          <span class="steps-title">📋 插入排序法的流程步驟</span>
          <span class="steps-arrow">▲</span>
        </div>
        <div class="steps-body">
          <div class="step">
            <div class="step-n">1</div>
            <div class="step-t">先從未排序的原始資料中，取出第 1 個元素加到已排序數列中的第一項。</div>
          </div>
          <div class="step">
            <div class="step-n">2</div>
            <div class="step-t">接著從未排序的原始資料中逐一取出元素。</div>
          </div>
          <div class="step">
            <div class="step-n">3</div>
            <div class="step-t">由前往後和已排序數列元素比較，遇到大於自己的元素就插入此元素之前；否則插入在已排序數列的最後一項。</div>
          </div>
          <div class="step">
            <div class="step-n">4</div>
            <div class="step-t">重複第 2、3 點的步驟，直到原始資料全部處理完成。</div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('ins-rand').addEventListener('click', () => {
    const d = randData(5);
    document.getElementById('ins-input').value = d.join(', ');
    initIns(d);
    renderInsGame();
  });

  document.getElementById('ins-reset').addEventListener('click', () => {
    const d = parseData(document.getElementById('ins-input').value);
    if (d.length < 2) { showToast('請輸入 2～5 個數字喔！😄'); return; }
    initIns(d);
    renderInsGame();
  });

  document.getElementById('ins-steps-hdr').addEventListener('click', () => {
    document.getElementById('ins-steps').classList.toggle('collapsed');
  });

  renderInsGame();
}

/* ── 渲染插入排序法遊戲區 ── */
function renderInsGame() {
  const g = document.getElementById('ins-game');
  if (!g) return;

  const s     = insState;
  const total = s.items.length;

  /* 完成狀態 */
  if (s.phase === 'done') {
    g.innerHTML = `
      <div class="round-badge done-badge">
        🎉 排序完成！
        <span class="round-hint">所有資料已從小到大排好了！</span>
      </div>
      <div class="arena">
        <!-- 未排序區（空白） -->
        <div class="zone unsorted-zone">
          <div class="zone-label">📦 未排序</div>
          <div class="zone-body"></div>
        </div>
        <!-- 已排序區 -->
        <div class="zone sorted-zone">
          <div class="zone-label">✅ 已排序</div>
          <div class="zone-body">
            ${s.sorted.map(i => charCard(i, { justPlaced: i.id === s.lastPlaced })).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-orange next-btn btn-hidden" id="ins-retry">🎮 再玩一次</button>`;
    showCelebration(() => {
      const retryBtn = document.getElementById('ins-retry');
      if (retryBtn) {
        retryBtn.classList.remove('btn-hidden');
        retryBtn.onclick = () => { initIns(s.data); renderInsGame(); };
      }
    });
    return;
  }

  const isDone     = s.phase === 'roundDone';
  const activeItem = s.unsorted[0];
  const cs         = correctSlot(s.sorted, activeItem.val);

  let hintText = '';
  if (isDone) {
    hintText = `第 ${s.round} 回合完成！`;
  } else if (s.sorted.length === 0) {
    hintText = `把「${activeItem.name}」拖到已排序區！`;
  } else {
    hintText = `把「${activeItem.name}（${activeItem.val}）」插入到正確的位置！`;
  }

  /* 建立已排序區的插槽 HTML */
  let sortedHTML = '';
  if (isDone) {
    /* roundDone：保留 slot 結構（readonly），間距與 play 狀態一致 */
    for (let i = 0; i <= s.sorted.length; i++) {
      sortedHTML += `<div class="ins-slot ins-slot-readonly"></div>`;
      if (i < s.sorted.length) {
        sortedHTML += charCard(s.sorted[i], { justPlaced: s.sorted[i].id === s.lastPlaced });
      }
    }
  } else {
    for (let i = 0; i <= s.sorted.length; i++) {
      sortedHTML += `<div class="ins-slot" data-slot="${i}" id="ins-slot-${i}"></div>`;
      if (i < s.sorted.length) {
        sortedHTML += charCard(s.sorted[i]);
      }
    }
  }

  g.innerHTML = `
    <div class="round-badge">
      第 ${s.round} / ${total} 回合
      <span class="round-hint">${hintText}</span>
    </div>
    <div class="arena">
      <!-- 未排序區 -->
      <div class="zone unsorted-zone">
        <div class="zone-label">📦 未排序</div>
        <div class="zone-body" id="ins-unsorted">
          ${s.unsorted.map((item, idx) => charCard(item, {
            highlighted: idx === 0 && !isDone,
            draggable:   idx === 0 && !isDone,
          })).join('')}
        </div>
      </div>
      <!-- 已排序區 -->
      <div class="zone sorted-zone">
        <div class="zone-label">✅ 已排序</div>
        <div class="zone-body" id="ins-sorted">
          ${sortedHTML}
        </div>
      </div>
    </div>
    ${isDone ? `<button class="btn btn-orange next-btn" id="ins-next">下一回合 →</button>` : ''}`;

  /* 把正確插槽 index 存到遊戲區，供事件讀取 */
  g.dataset.cs = cs;

  bindInsEvents();
}

/* ── 插入排序法事件綁定 ── */
function bindInsEvents() {
  const s = insState;

  /* 下一回合 */
  if (s.phase === 'roundDone') {
    document.getElementById('ins-next')?.addEventListener('click', () => {
      s.round++;
      s.phase      = 'play';
      s.lastPlaced = null;
      renderInsGame();
    });
    return;
  }

  /* 第一個角色可拖曳 */
  const firstCard = document.querySelector('#ins-unsorted .char-card');
  if (!firstCard) return;

  firstCard.addEventListener('dragstart', e => {
    dragId = firstCard.dataset.id;
    e.dataTransfer.setData('text/plain', dragId);
    sfxDrag();
    firstCard.classList.add('dragging');
  });
  firstCard.addEventListener('dragend', () => {
    dragId = null;
    firstCard.classList.remove('dragging');
    document.querySelectorAll('.ins-slot').forEach(sl => sl.classList.remove('dragover'));
  });

  /* 非第一個角色：阻止拖曳並提示 */
  const otherCards = document.querySelectorAll('#ins-unsorted .char-card:not(:first-child)');
  otherCards.forEach(card => {
    card.addEventListener('dragstart', e => {
      e.preventDefault();
      showToast(randMsg(MSGS.notFirst));
    });
    card.addEventListener('click', () => showToast(randMsg(MSGS.notFirst)));
  });

  /* 插槽事件 */
  const g  = document.getElementById('ins-game');
  const cs = parseInt(g.dataset.cs);

  document.querySelectorAll('.ins-slot').forEach(slot => {
    const slotIdx = parseInt(slot.dataset.slot);

    slot.addEventListener('dragover', e => {
      e.preventDefault();
      document.querySelectorAll('.ins-slot').forEach(s2 => s2.classList.remove('dragover'));
      slot.classList.add('dragover');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));

    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('dragover');

      const id = e.dataTransfer.getData('text/plain') || dragId;
      if (!id) return;

      if (slotIdx !== cs) {
        showToast(randMsg(MSGS.wrongSlot));
        return;
      }

      /* 移動角色：從 unsorted 取出第一個，插入 sorted[cs] */
      sfxDrop();
      const item = s.unsorted.shift();
      s.sorted.splice(cs, 0, item);
      s.lastPlaced = item.id;
      s.phase      = s.unsorted.length === 0 ? 'done' : 'roundDone';
      renderInsGame();
    });
  });
}

/* ================================================
   初始化
   ================================================ */
function init() {
  initSidebar();
  navigateTo('home');
}

document.addEventListener('DOMContentLoaded', init);
