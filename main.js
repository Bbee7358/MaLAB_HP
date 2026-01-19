(() => {
  const canvas = document.getElementById("introCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  // DPR対応
  const state = {
    w: 0,
    h: 0,
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    lines: [],
    lastT: 0
  };

  function resize() {
    state.w = canvas.clientWidth;
    state.h = canvas.clientHeight;

    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  // 光のライン（点が動き、軌跡を描く）
  function makeLine() {
    const speed = 60 + Math.random() * 140; // px/s
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * state.w,
      y: Math.random() * state.h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 1.2 + Math.random() * 1.8, // 秒
      width: 0.8 + Math.random() * 1.8,
      glow: 0.35 + Math.random() * 0.55
    };
  }

  function ensureLines() {
    const target = Math.max(14, Math.min(28, Math.floor(state.w / 60)));
    while (state.lines.length < target) state.lines.push(makeLine());
    while (state.lines.length > target) state.lines.pop();
  }

  // 画面端で反射＋少し方向を変える
  function bounce(line) {
    let bounced = false;
    if (line.x < 0) { line.x = 0; line.vx *= -1; bounced = true; }
    if (line.x > state.w) { line.x = state.w; line.vx *= -1; bounced = true; }
    if (line.y < 0) { line.y = 0; line.vy *= -1; bounced = true; }
    if (line.y > state.h) { line.y = state.h; line.vy *= -1; bounced = true; }

    if (bounced) {
      // 反射時に少しだけ方向を揺らす
      const jitter = (Math.random() - 0.5) * 0.35;
      const cos = Math.cos(jitter);
      const sin = Math.sin(jitter);
      const vx = line.vx * cos - line.vy * sin;
      const vy = line.vx * sin + line.vy * cos;
      line.vx = vx;
      line.vy = vy;
    }
  }

  function draw(t) {
    if (!state.lastT) state.lastT = t;
    const dt = Math.min(0.033, (t - state.lastT) / 1000);
    state.lastT = t;

    // 黒に近い透明で塗って残像を作る（光が歩き回る感じ）
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, state.w, state.h);

    // 軽いビネット
    const g = ctx.createRadialGradient(
      state.w * 0.5, state.h * 0.5, Math.min(state.w, state.h) * 0.05,
      state.w * 0.5, state.h * 0.5, Math.max(state.w, state.h) * 0.75
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.w, state.h);

    // ライン描画
    for (let i = 0; i < state.lines.length; i++) {
      const line = state.lines[i];

      const x0 = line.x;
      const y0 = line.y;

      line.x += line.vx * dt;
      line.y += line.vy * dt;
      bounce(line);

      line.life += dt;
      if (line.life > line.maxLife) {
        state.lines[i] = makeLine();
        continue;
      }

      // 線の色（白〜少し青寄り）
      const alpha = Math.max(0, 1 - (line.life / line.maxLife));
      ctx.lineWidth = line.width;
      ctx.lineCap = "round";

      // グロー
      ctx.shadowBlur = 18;
      ctx.shadowColor = `rgba(140, 190, 255, ${line.glow * alpha})`;

      ctx.strokeStyle = `rgba(255,255,255,${0.55 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(line.x, line.y);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(draw);
  }

  // 初期化
  resize();
  ensureLines();

  // 初期フレームを黒で塗ってから開始（チラつき防止）
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, state.w, state.h);

  requestAnimationFrame(draw);

  window.addEventListener("resize", () => {
    resize();
    ensureLines();
  }, { passive: true });
})();





(() => {
  const layer = document.getElementById("commentLayer");
  if (!layer) return;

  // 架空コメント（演出用：後で差し替え前提）
  const comments = [
    "それ、わかる", "言っても変わらない気がする", "誰かに届いてほしい", "このままでいいのかな",
    "見てるだけで終わりがち", "現実に戻ったら忘れそう", "ここに書いたら少し楽になった",
    "声ってどこに消えるんだろう", "本音は言えない", "気づいてほしい", "それでも言いたい",
    "共感だけで終わってしまう", "変わるきっかけって何だろう", "安心して話せる場所がほしい",
    "流れていくのが早すぎる", "拾ってくれる人がいるといい"
  ];
  const handles = ["@anon", "@voice", "@student", "@observer", "@note", "@someone", "@user"];

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randi = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function formatAgo() {
    const m = randi(0, 59);
    return m === 0 ? "たった今" : `${m}分前`;
  }
  function formatLikes() {
    const base = Math.random() < 0.12 ? randi(120, 980) : randi(0, 120);
    return base;
  }

  function createEl() {
    const el = document.createElement("div");
    el.className = "comment";

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${pick(handles)} ・ ${formatAgo()} ・ ♡${formatLikes()}`;

    const text = document.createElement("span");
    text.textContent = pick(comments);

    el.appendChild(meta);
    el.appendChild(text);
    return el;
  }

  // コメント個体（= 声の赤ちゃん）
  const agents = [];
  let lastT = 0;
  let running = true;
  let spawnTimer = null;

  function spawn() {
    if (!running) return;

    const el = createEl();
    layer.appendChild(el);

    const vw = layer.clientWidth || window.innerWidth;
    const vh = layer.clientHeight || window.innerHeight;

    // まず計測
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.opacity = "0";
    el.style.transform = "translate3d(0,0,0) scale(0.85)";
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const pad = 12;
    const maxX = Math.max(pad, vw - w - pad);
    const maxY = Math.max(pad, vh - h - pad);

    // 初期位置（中央寄り）
    let x = rand(pad, maxX);
    let y = rand(pad, maxY);

    x = clamp(x, pad, maxX);
    y = clamp(y, pad, maxY);

    // 初速（ランダムだが滑らか）
    const speed = rand(26, 64); // px/s
    const ang = rand(0, Math.PI * 2);
    let vx = Math.cos(ang) * speed;
    let vy = Math.sin(ang) * speed;

    // “性格”パラメータ（個体差＝単一感を消す）
    const life = rand(6.0, 10.5);            // 秒：生まれて消えるまで
    const wander = rand(0.8, 1.8);           // 方向の揺れ強さ
    const turnSmooth = rand(0.8, 1.8);       // 方向転換の滑らかさ
    const maxSpeed = rand(70, 120);          // px/s
    const baseScale = rand(0.92, 1.08);      // 個体ごとサイズ差

    agents.push({
      el, x, y, vx, vy, w, h,
      age: 0,
      life,
      wander,
      turnSmooth,
      maxSpeed,
      baseScale,
      // “経験”の揺らぎを作るための内部位相（滑らかなノイズの代用）
      phase1: rand(0, 1000),
      phase2: rand(0, 1000),
      pad
    });
  }

  // 生成ループ（不規則に生まれる）
  function startSpawnLoop() {
    const initial = Math.min(10, Math.max(6, Math.floor((window.innerWidth || 1000) / 180)));
    for (let i = 0; i < initial; i++) setTimeout(spawn, i * randi(80, 160));

    const tick = () => {
      spawn();
      spawnTimer = setTimeout(tick, rand(220, 640)); // 密度：小さいほど増える
    };
    tick();
  }

  function stopSpawnLoop() {
    if (spawnTimer) clearTimeout(spawnTimer);
    spawnTimer = null;
  }

  // ライフサイクル（0..1）に応じて見た目を変える
  function styleByLife(agent, t01) {
    // 誕生→成長→経験→老い→消滅
    // 出現：0..0.15 / 成長：0.15..0.35 / 経験：0.35..0.8 / 老い：0.8..0.92 / 消滅：0.92..1
    let opacity = 0.0;
    let scale = 0.85;
    let blur = 0;

    if (t01 < 0.15) {
      // 誕生
      const k = t01 / 0.15;
      opacity = 0.15 + 0.85 * k;
      scale = 0.82 + 0.18 * k;
    } else if (t01 < 0.35) {
      // 成長
      const k = (t01 - 0.15) / 0.20;
      opacity = 0.92;
      scale = 1.0 + 0.06 * k;
    } else if (t01 < 0.8) {
      // 経験（安定して存在）
      opacity = 0.92;
      scale = 1.06;
    } else if (t01 < 0.92) {
      // 老い（少しぼやける）
      const k = (t01 - 0.8) / 0.12;
      opacity = 0.92 - 0.20 * k;
      scale = 1.06 - 0.04 * k;
      blur = 0.5 + 1.2 * k;
    } else {
      // 消滅
      const k = (t01 - 0.92) / 0.08;
      opacity = 0.72 * (1 - k);
      scale = (1.02 - 0.08 * k);
      blur = 1.8 + 2.0 * k;
    }

    const finalScale = scale * agent.baseScale;
    agent.el.style.opacity = String(opacity);
    agent.el.style.transform = `translate3d(0,0,0) scale(${finalScale})`;
    agent.el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : "none";
  }

  // 物理更新（滑らかに縦横無尽）
  function update(t) {
    if (!running) return;
    if (!lastT) lastT = t;
    const dt = Math.min(0.033, (t - lastT) / 1000); // 最大33ms
    lastT = t;

    const vw = layer.clientWidth || window.innerWidth;
    const vh = layer.clientHeight || window.innerHeight;

    for (let i = agents.length - 1; i >= 0; i--) {
      const a = agents[i];
      a.age += dt;
      const t01 = a.age / a.life;

      // 終了
      if (t01 >= 1) {
        a.el.remove();
        agents.splice(i, 1);
        continue;
      }

      // “経験”の不規則さ：sin/cosで滑らかな方向揺れ（カクカクしない）
      a.phase1 += dt * rand(0.6, 1.2);
      a.phase2 += dt * rand(0.35, 0.9);

      const nx = Math.sin(a.phase1 * 2.1) + 0.6 * Math.sin(a.phase2 * 3.7);
      const ny = Math.cos(a.phase1 * 1.9) + 0.6 * Math.cos(a.phase2 * 3.1);

      // 年齢によって動きも変化（赤ちゃん→元気→落ち着く）
      let energy = 1.0;
      if (t01 < 0.2) energy = 0.75 + (t01 / 0.2) * 0.45;          // 生まれてだんだん元気
      else if (t01 < 0.8) energy = 1.2;                           // 経験期：活発
      else energy = 1.2 - ((t01 - 0.8) / 0.2) * 0.6;              // 老いて落ち着く

      // 加速度（滑らか）
      const ax = nx * 40 * a.wander * energy;
      const ay = ny * 40 * a.wander * energy;

      // 近すぎるコメント同士が散る（自然な分散）
      let repX = 0, repY = 0;
      const repelRadius = 140;   // この距離以内だと散る
      const repelStrength = 18;  // 強すぎると暴れるので控えめ

      for (let j = 0; j < agents.length; j++) {
        if (agents[j] === a) continue;
        const b = agents[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);

        if (d > 0 && d < repelRadius) {
            const k = (repelRadius - d) / repelRadius; // 近いほど強い
            repX += (dx / d) * k;
            repY += (dy / d) * k;
        }
      }

      // 斥力を加速度へ反映
      const ax2 = ax + repX * repelStrength;
      const ay2 = ay + repY * repelStrength;

      // 壁に近づくと自然に押し戻す（切れない＆不自然な跳ね返りを減らす）
      const pad = a.pad;
      const minX = pad, minY = pad;
      const maxX = Math.max(pad, vw - a.w - pad);
      const maxY = Math.max(pad, vh - a.h - pad);

      const edgeSoft = 140; // 近づいたら効く距離
      const centerPull = 55; // 画面内に戻る力

      const leftDist = a.x - minX;
      const rightDist = maxX - a.x;
      const topDist = a.y - minY;
      const bottomDist = maxY - a.y;

      let ex = 0, ey = 0;
      if (leftDist < edgeSoft) ex += (edgeSoft - leftDist) / edgeSoft;
      if (rightDist < edgeSoft) ex -= (edgeSoft - rightDist) / edgeSoft;
      if (topDist < edgeSoft) ey += (edgeSoft - topDist) / edgeSoft;
      if (bottomDist < edgeSoft) ey -= (edgeSoft - bottomDist) / edgeSoft;

      // 端に寄るほど中心へ戻す
      const bax = ex * centerPull;
      const bay = ey * centerPull;

      // 速度更新
      a.vx += (ax2 + bax) * dt;
      a.vy += (ay2 + bay) * dt;

      // 減衰（滑らかさの鍵：急加速しすぎない）
      const damping = 0.92 + 0.05 * (1 - energy / 1.2); // 年齢で少し変える
      a.vx *= damping;
      a.vy *= damping;

      // 速度上限
      const sp = Math.hypot(a.vx, a.vy);
      const cap = a.maxSpeed * energy;
      if (sp > cap) {
        a.vx = (a.vx / sp) * cap;
        a.vy = (a.vy / sp) * cap;
      }

      // 位置更新
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // 万一はみ出したら“やさしく反射”
      if (a.x < minX) { a.x = minX; a.vx *= -0.65; }
      if (a.x > maxX) { a.x = maxX; a.vx *= -0.65; }
      if (a.y < minY) { a.y = minY; a.vy *= -0.65; }
      if (a.y > maxY) { a.y = maxY; a.vy *= -0.65; }

      a.el.style.left = `${a.x}px`;
      a.el.style.top = `${a.y}px`;

      // 見た目（生命の物語）
      styleByLife(a, t01);
    }

    requestAnimationFrame(update);
  }

  // 表示中は負荷を抑える
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      stopSpawnLoop();
    } else {
      running = true;
      startSpawnLoop();
      lastT = 0;
      requestAnimationFrame(update);
    }
  });

  startSpawnLoop();
  requestAnimationFrame(update);
})();






// ===== Lightbox =====
(() => {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const closeBtn = document.querySelector(".lightbox-close");

  if (!lightbox || !lightboxImg) return;

  // サムネクリックで開く
  document.querySelectorAll(".gallery .thumb").forEach(thumb => {
    thumb.addEventListener("click", (e) => {
      e.preventDefault();
      const img = thumb.querySelector("img");
      if (!img) return;

      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
      lightbox.classList.add("active");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });

  // 閉じる共通処理
  const close = () => {
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  };

  // ✕ ボタン
  closeBtn.addEventListener("click", close);

  // 背景クリックで閉じる
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  // ESCキーで閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
      close();
    }
  });
})();



(() => {
  const el = document.getElementById("introQuestion");
  if (!el) return;

  const show = () => {
    el.classList.add("is-font-ready");
  };

  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "KaisotaiUP"')
      .then(show)
      .catch(show);
  } else {
    show();
  }
})();
