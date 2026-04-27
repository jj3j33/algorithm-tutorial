
/* ================================================
   ══════════════════════════════
   Scratch 程式邏輯演示 (至高精確版)
   ══════════════════════════════
   ================================================ */
let scState = {
  data: [8, 5, 10, 1, 7],
  unsorted: [],
  sorted: [],
  dataPos: 1,
  minPos: 1,
  phase: 'searching', 
  subStep: 'idle', // 'idle' | 'question' | 'result' | 'update_min' | 'increment'
  lastAnswer: null,    
  isRunning: false,
  isPaused: false,
  delay: 800,
  timer: null,
  freezePtrs: false,
  frozenXData: 0,
  frozenXMin: 0,
  displayVar: { d: 1, m: 1 },
  history: [] // 儲存歷史狀態
};

function renderScratchPage() {
  try {
    const container = document.getElementById('page-scratch');
    if (!container) return;

    if (scState.unsorted.length === 0 && scState.sorted.length === 0) {
      fullResetAll();
    }

    container.innerHTML = `
      <div class="page-header" style="background: linear-gradient(135deg, #2D3436 0%, #636E72 100%);">
        <h1 class="page-title">🎬 選擇排序法：程式邏輯演示</h1>
        <p class="page-subtitle">觀察標籤指標的精確變化過程</p>
      </div>

      <div class="scratch-container">
        <!-- 資料自定義工具列 -->
        <div class="scratch-toolbar" style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center; background: #f1f2f6; padding: 12px 20px; border-radius: 12px; border: 1px solid #dfe4ea;">
          <span style="font-weight: 900; color: #2f3542; font-size: 0.9rem;">🔢 自定義資料：</span>
          <input type="text" id="sc-input" value="${scState.data.join(', ')}" style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #ced4da; font-weight: 700;">
          <button class="btn btn-grey" id="sc-apply-data" style="padding: 8px 16px; font-size: 0.9rem;">更新資料</button>
        </div>

        <main class="demo-column">
          <div class="shiro-stage">
            
            <div style="display: flex; width: 100%; align-items: flex-start; justify-content: space-between; gap: 20px;">
               <div class="logic-hint-box" id="logic-hint"></div>
               <div class="variable-display" style="width: auto;">
                 <div class="var-box">
                   <span class="var-label">資料位置</span>
                   <span class="var-val" id="val-pos">1</span>
                 </div>
                 <div class="var-box">
                   <span class="var-label">最小值位置</span>
                   <span class="var-val" id="val-min">1</span>
                 </div>
               </div>
            </div>

            <div id="scratch-arena">
               <div class="zone unsorted-zone" style="position:relative;">
                 <div class="zone-label">📦 未排序資料清單</div>
                 
                 <div id="ptr-min" class="pointer" style="bottom: 210px;">
                   <span class="ptr-tag" style="background: #E63946;">最小值位置</span>
                   <span class="ptr-arrow" style="color: #E63946;">▼</span>
                 </div>
                 <div id="ptr-data" class="pointer" style="bottom: 175px;">
                   <span class="ptr-tag" style="background: #FF8C1A;">資料位置</span>
                   <span class="ptr-arrow" style="color: #FF8C1A;">▼</span>
                 </div>

                 <div class="zone-body" id="sc-unsorted" style="padding-top: 100px; gap: 15px;"></div>
               </div>

               <div class="zone sorted-zone">
                 <div class="zone-label">✅ 已排序資料清單</div>
                 <div class="zone-body" id="sc-sorted" style="justify-content: flex-start; padding-left: 20px;"></div>
               </div>
            </div>

            <div id="sc-next-round-container" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display:none;">
              <button class="btn btn-orange" id="sc-next-round" style="padding: 12px 30px;">下一回合 →</button>
            </div>
          </div>

          <div class="demo-footer">
            <button class="btn btn-back" id="sc-back">🔙 返回練習區</button>
            <div class="footer-controls">
              <button class="btn btn-grey" id="sc-undo">↩️ 上一步</button>
              <button class="btn btn-grey" id="sc-reset-round">🔄 重置回合</button>
              <button class="btn btn-grey" id="sc-reset-all">🧹 全部重置</button>
              <button class="btn btn-yellow" id="sc-step">⏭️ 單步執行</button>
              <button class="btn btn-orange" id="sc-play">▶️ 自動播放</button>
            </div>
          </div>
        </main>
      </div>
    `;

    document.getElementById('sc-back').onclick  = () => { pauseScratch(); navigateTo('selection'); };
    document.getElementById('sc-undo').onclick  = () => { undoStep(); };
    document.getElementById('sc-reset-round').onclick = () => { resetRoundOnly(); };
    document.getElementById('sc-reset-all').onclick = () => { fullResetAll(); };
    document.getElementById('sc-step').onclick  = () => { manualStep(); };
    document.getElementById('sc-play').onclick  = () => { togglePlayScratch(); };
    document.getElementById('sc-next-round').onclick = () => { nextRoundInit(); };

    // 新增：處理自定義資料輸入
    document.getElementById('sc-apply-data').onclick = () => {
      const input = document.getElementById('sc-input').value;
      const d = input.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n) && n !== 0);
      if (d.length < 2 || d.length > 8) {
        alert("請輸入 2~8 個數字（以逗號或空格分隔）");
        return;
      }
      scState.data = [...d];
      fullResetAll(true); // 強制全文重置
    };

    renderScratchGame();
    setTimeout(updatePointers, 50); 
  } catch (err) { alert("ERROR: " + err.message); }
}

function fullResetAll(keepCurrent = true) {
  pauseScratch();
  if (!keepCurrent) {
    scState.data = [8, 5, 10, 1, 7];
  }
  const d = scState.data;
  if (typeof buildItems === 'function') scState.unsorted = buildItems(d);
  scState.sorted = [];
  scState.freezePtrs = false;
  scState.history = []; // 清空歷史
  nextRoundInit();
}

function resetRoundOnly() {
  pauseScratch();
  scState.dataPos = 1;
  scState.minPos = 1;
  scState.displayVar = { d: 1, m: 1 };
  scState.phase = 'searching';
  scState.subStep = 'idle';
  scState.lastAnswer = null;
  scState.freezePtrs = false;
  scState.history = []; // 清空歷史
  renderScratchGame();
  setTimeout(updatePointers, 50);
}

function nextRoundInit() {
  saveHistory(); // 進入下一回合前儲存，允許回退到搬運完的狀態
  scState.dataPos = 1;
  scState.minPos = 1;
  scState.displayVar = { d: 1, m: 1 };
  scState.phase = 'searching';
  scState.subStep = 'idle';
  scState.lastAnswer = null;
  scState.freezePtrs = false;
  renderScratchGame();
  setTimeout(updatePointers, 50);
}

function renderScratchGame() {
  const u = document.getElementById('sc-unsorted');
  const s = document.getElementById('sc-sorted');
  if (!u || !s) return;

  const minIdx = scState.minPos - 1;
  const isFound = scState.phase === 'found';

  u.innerHTML = scState.unsorted.map((item, idx) => {
    let cls = 'char-card';
    if (idx === minIdx) cls += ' min-target';
    const draggable = (isFound && idx === minIdx) ? "true" : "false";
    return `
      <div class="${cls}" data-id="${item.id}" draggable="${draggable}">
        <div class="char-wrapper">
          <img src="${item.img}" alt="${item.name}" class="char-img" draggable="false">
          <span class="char-num">${item.val}</span>
        </div>
        <span class="char-name">${item.name}</span>
      </div>`;
  }).join('');

  s.innerHTML = scState.sorted.map(item => charCard(item)).join('');
  if (isFound) {
    s.innerHTML += `
      <div class="drop-zone drop-ready" id="sc-drop" style="min-width: 90px; height: 130px; border: 2px dashed #E63946; background: rgba(230, 57, 70, 0.05); display: flex; align-items: center; justify-content: center; border-radius: 12px; margin-left: 10px;">
        <span style="color: #E63946; font-size: 0.7rem; font-weight: 700;">放入最小值</span>
      </div>`;
  }

  updateHint();
  document.getElementById('val-pos').textContent = scState.dataPos;
  document.getElementById('val-min').textContent = scState.minPos;

  const isActive = (scState.phase === 'searching');
  document.getElementById('sc-step').disabled = !isActive;
  document.getElementById('sc-play').disabled = !isActive;
  document.getElementById('sc-undo').disabled = (scState.history.length === 0);
  document.getElementById('sc-next-round-container').style.display = (scState.phase === 'dragged' ? 'block' : 'none');

  updatePointers();
  bindDragEvents();
}

function updateHint() {
  const box = document.getElementById('logic-hint');
  if (!box) return;

  if (scState.phase === 'done') {
    box.innerHTML = '✨ 恭喜完成選擇排序法！🎉';
    return;
  }
  if (scState.phase === 'found') {
    box.innerHTML = '✨ 搜尋完成！請搬運紅標籤指向的最小值。';
    return;
  }
  if (scState.phase === 'dragged') {
    box.innerHTML = '✅ 搬運完成！準備開始下一回合。';
    return;
  }

  if (scState.subStep === 'idle') {
    box.innerHTML = '';
    return;
  }

  // 使用快照
  const dIdx = scState.displayVar.d;
  const mIdx = scState.displayVar.m;
  const dVal = scState.unsorted[dIdx - 1]?.val || '?';
  const mVal = scState.unsorted[mIdx - 1]?.val || '?';

  if (scState.subStep === 'question') {
    box.innerHTML = `問：第 ${dIdx} 項 (<span class="logic-val">${dVal}</span>) < 第 ${mIdx} 項 (<span class="logic-val">${mVal}</span>) ?`;
  } else if (scState.subStep === 'result') {
    const ansCls = scState.lastAnswer === 'Yes' ? 'yes' : 'no';
    box.innerHTML = `問：第 ${dIdx} 項 (<span class="logic-val">${dVal}</span>) < 第 ${mIdx} 項 (<span class="logic-val">${mVal}</span>) ? <span class="logic-ans ${ansCls}">${scState.lastAnswer}</span>`;
  } else if (scState.subStep === 'update_min') {
    box.innerHTML = `問：第 ${dIdx} 項 (<span class="logic-val">${dVal}</span>) < 第 ${mIdx} 項 (<span class="logic-val">${mVal}</span>) ? <span class="logic-ans yes">Yes</span> ⮕ 將最小值位置設為 <span class="logic-target-pos">${dIdx}</span>`;
  } else if (scState.subStep === 'increment') {
    // 當 DataPos 增加時的文字顯示
    box.innerHTML = `⮕ <span class="logic-action">將資料位置改變 1</span>`;
  }
}

function updatePointers() {
  if (scState.freezePtrs) {
    const pD = document.getElementById('ptr-data');
    const pM = document.getElementById('ptr-min');
    if (pD) pD.style.left = scState.frozenXData + 'px';
    if (pM) pM.style.left = scState.frozenXMin + 'px';
    return;
  }

  const cards = document.querySelectorAll('#sc-unsorted .char-card');
  const ptrData = document.getElementById('ptr-data');
  const ptrMin  = document.getElementById('ptr-min');
  if (!ptrData || !ptrMin || cards.length === 0) return;

  const getX = (idx) => {
    if (idx > scState.unsorted.length) {
       const last = cards[cards.length - 1];
       return last.offsetLeft + last.offsetWidth + 30;
    }
    const card = cards[idx - 1];
    return card ? (card.offsetLeft + card.offsetWidth / 2) : 0;
  };

  ptrData.style.left = getX(scState.dataPos) + 'px';
  ptrMin.style.left  = getX(scState.minPos) + 'px';
}

function saveHistory() {
  const snapshot = {
    unsorted: [...scState.unsorted.map(item => ({...item}))],
    sorted: [...scState.sorted.map(item => ({...item}))],
    dataPos: scState.dataPos,
    minPos: scState.minPos,
    phase: scState.phase,
    subStep: scState.subStep,
    lastAnswer: scState.lastAnswer,
    freezePtrs: scState.freezePtrs,
    frozenXData: scState.frozenXData,
    frozenXMin: scState.frozenXMin,
    displayVar: { ...scState.displayVar }
  };
  scState.history.push(snapshot);
  if (scState.history.length > 50) scState.history.shift(); // 限制歷史長度
}

function undoStep() {
  if (scState.history.length === 0) return;
  pauseScratch();
  const lastState = scState.history.pop();
  
  scState.unsorted = lastState.unsorted;
  scState.sorted = lastState.sorted;
  scState.dataPos = lastState.dataPos;
  scState.minPos = lastState.minPos;
  scState.phase = lastState.phase;
  scState.subStep = lastState.subStep;
  scState.lastAnswer = lastState.lastAnswer;
  scState.freezePtrs = lastState.freezePtrs;
  scState.frozenXData = lastState.frozenXData;
  scState.frozenXMin = lastState.frozenXMin;
  scState.displayVar = lastState.displayVar;

  renderScratchGame();
  setTimeout(updatePointers, 50);
}

function manualStep() {
  if (scState.phase !== 'searching') return;
  saveHistory(); // 執行前儲存狀態
  
  if (scState.subStep === 'idle') {
    scState.displayVar = { d: scState.dataPos, m: scState.minPos };
    scState.subStep = 'question';
  } else if (scState.subStep === 'question') {
    const dVal = scState.unsorted[scState.dataPos - 1]?.val;
    const mVal = scState.unsorted[scState.minPos - 1]?.val;
    scState.lastAnswer = (dVal < mVal) ? 'Yes' : 'No';
    scState.subStep = 'result';
  } else if (scState.subStep === 'result') {
    if (scState.lastAnswer === 'Yes') {
      scState.subStep = 'update_min';
      scState.minPos = scState.dataPos; // 更新最小值位置並移動標籤
      if (typeof sfxClick === 'function') sfxClick();
    } else {
      scState.subStep = 'increment'; 
      scState.dataPos++; // 進入此階段時立即加 1，讓標籤同步移動
    }
  } else if (scState.subStep === 'update_min') {
    scState.subStep = 'increment';
    scState.dataPos++; // 進入此階段時立即加 1，讓標籤同步移動
  } else if (scState.subStep === 'increment') {
    // 檢查是否跑完，並準備進入下一個循環或結束
    if (scState.dataPos > scState.unsorted.length) {
      scState.phase = 'found';
      pauseScratch();
      setTimeout(() => {
        const pD = document.getElementById('ptr-data');
        const pM = document.getElementById('ptr-min');
        if (pD && pM) {
          scState.freezePtrs = true;
          scState.frozenXData = parseFloat(pD.style.left);
          scState.frozenXMin  = parseFloat(pM.style.left);
        }
      }, 100);
    } else {
      scState.displayVar = { d: scState.dataPos, m: scState.minPos };
      scState.subStep = 'question';
    }
  }

  renderScratchGame();
}

function togglePlayScratch() {
  if (scState.phase !== 'searching') return;
  if (scState.isRunning && !scState.isPaused) pauseScratch();
  else {
    scState.isRunning = true; scState.isPaused = false;
    document.getElementById('sc-play').textContent = '⏸️ 暫停';
    autoStep();
  }
}

function autoStep() {
  if (scState.isPaused || scState.phase !== 'searching') return;
  manualStep();
  if (scState.phase === 'searching') scState.timer = setTimeout(autoStep, scState.delay);
  else document.getElementById('sc-play').textContent = '▶️ 自動播放';
}

function pauseScratch() {
  scState.isPaused = true;
  if (scState.timer) clearTimeout(scState.timer);
  const btn = document.getElementById('sc-play');
  if (btn) btn.textContent = '▶️ 自動播放';
}

function bindDragEvents() {
  const minCard = document.querySelector('#sc-unsorted .min-target[draggable="true"]');
  const dropZone = document.getElementById('sc-drop');
  if (!minCard || !dropZone) return;

  minCard.ondragstart = e => {
    e.dataTransfer.setData('text/plain', minCard.dataset.id);
    minCard.classList.add('dragging');
    if (typeof sfxDrag === 'function') sfxDrag();
  };
  minCard.ondragend = () => minCard.classList.remove('dragging');

  dropZone.ondragover = e => e.preventDefault();
  dropZone.ondrop = e => {
    e.preventDefault();
    saveHistory(); // 搬運前儲存狀態
    const id = e.dataTransfer.getData('text/plain');
    const idx = scState.unsorted.findIndex(i => i.id === id);
    if (idx !== -1) {
      const [moved] = scState.unsorted.splice(idx, 1);
      scState.sorted.push(moved);
      scState.phase = scState.unsorted.length === 0 ? 'done' : 'dragged';
      if (typeof sfxDrop === 'function') sfxDrop();
      renderScratchGame();
      if (scState.phase === 'done' && typeof showCelebration === 'function') {
        showCelebration(() => { pauseScratch(); });
      }
    }
  };
}
