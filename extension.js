(async () => {
  const KEY = "__gachaForgeSound";
  if (window[KEY]) window[KEY].dispose();

  const HOST_TAG = "MARINARA-CAPABILITY-GACHA-FORGE";
  const api = typeof marinara !== "undefined" && marinara ? marinara : null;
  const cleanups = [];
  const later = (fn) => cleanups.push(fn);
  const timers = new Set();
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.add(id); return id; };

  /* =========================================================
   * 소리 목록 (그룹 / 이름)
   * ========================================================= */
  const SOUND_LIST = [
    ["UI", [
      ["click", "기본 버튼"], ["confirm", "확인·결정"], ["back", "뒤로·취소"], ["tab", "탭·필터"],
      ["toggle", "켜기/끄기"], ["error", "잠김·불가"], ["popup", "팝업 열림"], ["whoosh", "화면 전환"],
      ["deal", "목록 촤르륵"], ["page", "대사 넘김"], ["tick", "대사 타자음"],
    ]],
    ["소환", [
      ["pullPress", "소환 버튼"], ["charge", "소환 차지"], ["flash", "섬광"], ["flip", "카드 뒤집기"],
      ["reveal3", "★3 공개"], ["reveal4", "★4 공개"], ["reveal5", "★5 공개"], ["rays", "★5 빛줄기"],
    ]],
    ["전투", [
      ["sortie", "출격·전투 시작"], ["skillSelect", "스킬 선택"], ["turn", "턴 시작"], ["hit", "타격"],
      ["crit", "치명타"], ["hitFire", "타격·불"], ["hitWater", "타격·물"], ["hitWind", "타격·바람"],
      ["hitEarth", "타격·대지"], ["hitLight", "타격·빛"], ["hitDark", "타격·어둠"], ["heal", "회복"],
      ["shield", "방어막"], ["shieldBreak", "방어 깨짐"], ["charged", "기 모으기"], ["ko", "쓰러짐"],
      ["enrage", "보스 분노"], ["victory", "승리"], ["defeat", "패배"],
    ]],
    ["보상·성장", [
      ["coin", "구매·재화"], ["reward", "보상 획득"], ["drop", "아이템 드롭"], ["levelUp", "레벨 업·강화"],
      ["equip", "장착"], ["potion", "물약·회복 사용"], ["unlock", "해금"], ["delete", "삭제"],
    ]],
    ["획득", [
      ["aether", "에테르 획득"], ["glimmer", "글리머 획득"], ["funds", "자금 획득"], ["vigorGain", "활력 회복"],
      ["spend", "재화 사용"], ["relic", "유물 획득"], ["rune", "시길·룬 획득"], ["insight", "통찰 획득"],
    ]],
    ["스토리 연출", [
      ["notice", "시스템 알림 [ ]"], ["affection", "호감도 알림"], ["letter", "편지·연락 도착"], ["glitch", "버그·글리치"],
    ]],
  ];

  /* =========================================================
   * 장르 테마 · 스토리 분위기 · 상황별 배경음
   * ========================================================= */
  const THEMES = [
    ["auto", "자동"], ["otome", "오토메·로판"], ["hunter", "헌터·액션"], ["daily", "일상·힐링"], ["fantasy", "정통 판타지"], ["dark", "다크·호러"],
  ];
  const MOODS = [
    ["calm", "평온"], ["happy", "밝음"], ["comedy", "코믹"], ["romance", "설렘"], ["sad", "슬픔"],
    ["tense", "긴장"], ["mystery", "신비"], ["dark", "집착·광기"], ["glitch", "버그·글리치"],
  ];
  const SITUATIONS = [["lobby", "로비·메뉴"], ["summon", "소환"], ["battle", "전투"], ...MOODS.map(([k, l]) => ["story_" + k, "스토리 · " + l])];
  const SIT_LABEL = Object.fromEntries(SITUATIONS);
  const THEME_LABEL = Object.fromEntries(THEMES);

  /* =========================================================
   * 설정 (마리나라 확장 저장소에 저장 → 기기 간 동기화, 실패 시 localStorage)
   * ========================================================= */
  const DEFAULTS = {
    master: 0.8, sfxOn: true, sfxVol: 0.8, bgmOn: true, bgmVol: 0.4,
    storyMoodMode: "auto",
    theme: "auto",
    sounds: {},
    bgm: {},
    // 효과음
    groups: {},          // 그룹 이름 -> false면 그 그룹 전체 끔
    reverb: 0.32,        // 울림 양
    typingGap: 45,       // 타자음 최소 간격(ms)
    elemHits: true,      // 속성별 타격음 사용
    rewardChain: 6,      // 보상 아이템 연속 재생 최대 개수
    boom: 0.4,           // 효과음의 저음 '둥' 세기
    kick: 0.6,           // 배경음 킥·팀파니 세기
    duck: true,          // 큰 효과음 때 배경음 잠깐 줄이기
    duckAmount: 0.5,
    // 배경음
    bgmOutside: false,   // 가챠포지 밖에서도 로비 음악
    tempo: 1,
    melody: "auto", padInst: "auto", drums: "auto", leadInst: "auto",
    density: 1,
    fade: 0.6,
    // 분위기 감지
    sensitivity: 1,
    minHold: 12,
    moodEnabled: {},
    keywords: {},
    genreKeywords: {},
    // 버튼·화면
    openMode: "icon",         // 여는 방법: icon(가챠포지 안 아이콘) | floating(떠 있는 버튼) | both
    launcherPos: "br", launcherSize: 34, launcherOpacity: 0.8,
    iconTopbar: "beforeFs",   // 상단바 아이콘 위치: beforeFs | beforeSettings | end
    iconBattle: true,         // 전투 조작줄에도 아이콘
    iconStyle: "speaker",     // speaker | note | gear | wave
    launcherOffsetX: 0, launcherOffsetY: 0,
    hotkey: "alt+s",          // alt+s | alt+m | ctrl+shift+s | off
    // 고급
    lowPower: true,
    sleepSec: 8,
  };
  const LS = "gf-sound:v2";
  const MAPS = ["sounds", "bgm", "groups", "moodEnabled", "keywords", "genreKeywords"];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // 예전 버전에서 저장된 설정만 한 번 옮김(새로 설치·초기화한 설정에는 손대지 않음)
  function migrate(stored) {
    const c = { ...stored };
    if (c.schema >= 2) return c;
    if (!c.migratedV51) {
      const legacyHidden = !c.migratedV5 || !c.launcherPos || c.launcherPos === "hidden";
      const iconsOff = c.inGameIcon === false || (c.iconTopbar === "none" && c.iconBattle === false);
      c.openMode = iconsOff ? "floating" : legacyHidden ? "icon" : "both";
    }
    if (c.inGameIcon === false) { c.iconTopbar = "beforeFs"; c.iconBattle = false; }
    delete c.inGameIcon; delete c.migratedV5; delete c.migratedV51;
    if (c.iconTopbar === "none") c.iconTopbar = "beforeFs";
    if (!c.launcherPos || c.launcherPos === "hidden") c.launcherPos = "br";
    if (c.hotkey === true) c.hotkey = "alt+s"; else if (c.hotkey === false) c.hotkey = "off";
    c.schema = 2;
    return c;
  }
  function normalize(stored) {
    const c = { ...clone(DEFAULTS), ...(stored ? migrate(stored) : {}), schema: 2 };
    for (const k of MAPS) c[k] = { ...(c[k] || {}) };
    return c;
  }

  // 1) 이 기기 사본(localStorage)과 2) 서버 사본을 따로 읽음.
  //    서버를 못 읽어도 기본값으로 돌아가지 않고 이 기기 사본을 씀.
  let localStored = null, remoteStored = null, remoteOk = false;
  try { localStored = JSON.parse(localStorage.getItem(LS) || "null"); } catch {}
  try { if (api && api.storage) { const r = await api.storage.get(); remoteStored = r && r.cfg ? r.cfg : null; remoteOk = true; } } catch {}
  let cfg = normalize(remoteStored || localStored);
  // 서버와 마지막으로 맞춘 상태. 저장할 땐 이것과 비교해서 '내가 바꾼 칸'만 서버에 반영함
  let synced = clone(cfg);

  // 내가 바꾼 칸 찾기 (맵은 한 칸씩)
  function changedPaths(cur, base) {
    const out = [];
    for (const k of new Set([...Object.keys(cur), ...Object.keys(base)])) {
      if (MAPS.includes(k)) {
        const a = cur[k] || {}, b = base[k] || {};
        for (const sk of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[sk]) !== JSON.stringify(b[sk])) out.push([k, sk]);
      } else if (JSON.stringify(cur[k]) !== JSON.stringify(base[k])) out.push([k]);
    }
    return out;
  }
  function applyPaths(target, src, paths) {
    for (const [k, sk] of paths) {
      if (sk === undefined) { if (src[k] === undefined) delete target[k]; else target[k] = clone(src[k]); }
      else { target[k] = { ...(target[k] || {}) }; if (src[k] && src[k][sk] !== undefined) target[k][sk] = clone(src[k][sk]); else delete target[k][sk]; }
    }
    return target;
  }

  let saveTimer = 0, saving = null, fullOverwrite = false, onRemoteApplied = null;
  // 저장: 서버의 최신 설정을 먼저 받아서, 이 기기에서 바꾼 칸만 덮어씀
  // → 다른 기기·다른 탭이 오래된 설정을 통째로 덮어써 '초기화'처럼 보이던 문제 방지
  async function flush() {
    clearTimeout(saveTimer); saveTimer = 0;
    try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {}
    if (!api || !api.storage) return;
    if (saving) { await saving; }
    const paths = fullOverwrite ? null : changedPaths(cfg, synced);
    if (paths && !paths.length) return;
    saving = (async () => {
      try {
        let latest = null;
        if (!fullOverwrite) { const r = await api.storage.get(); latest = r && r.cfg ? normalize(r.cfg) : null; }
        const merged = fullOverwrite || !latest ? clone(cfg) : applyPaths(latest, cfg, paths);
        await api.storage.patch({ cfg: merged });
        remoteOk = true; fullOverwrite = false;
        const changedElsewhere = latest && changedPaths(merged, cfg).length;
        cfg = merged; synced = clone(merged);
        try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {}
        if (changedElsewhere && onRemoteApplied) onRemoteApplied();
      } catch { remoteOk = false; }
      finally { saving = null; updateSyncLabel(); }
    })();
    return saving;
  }
  const save = () => {
    clearTimeout(saveTimer);
    try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {}
    saveTimer = setTimeout(flush, 400);
  };
  // 다른 기기에서 바꾼 설정 불러오기 (내가 아직 저장 안 한 칸은 지킴)
  async function pullRemote() {
    if (!api || !api.storage || saving || saveTimer) return;
    try {
      const r = await api.storage.get(); remoteOk = true;
      if (!r || !r.cfg) { if (changedPaths(cfg, synced).length || !remoteStored) { fullOverwrite = !r || !r.cfg; flush(); } return; }
      const remote = normalize(r.cfg);
      const mine = changedPaths(cfg, synced);
      const next = applyPaths(clone(remote), cfg, mine);
      const differs = changedPaths(next, cfg).length;
      synced = remote; cfg = next;
      if (mine.length) save();
      if (differs && onRemoteApplied) onRemoteApplied();
    } catch { remoteOk = false; }
    updateSyncLabel();
  }
  let updateSyncLabel = () => {};
  // 서버를 못 읽고 시작했다면 연결되는 대로 바꾼 칸만 올림
  if (!remoteOk && api && api.storage) setTimeout(pullRemote, 3000);
  const sCfg = (name) => ({ on: true, vol: 1, pitch: 1, ...(cfg.sounds[name] || {}) });
  const bgmMode = (sit) => cfg.bgm[sit] || "synth";

  /* =========================================================
   * 오디오 그래프
   *   sfxBus / bgmBus → 압축기 → masterOut(전체 볼륨) → 스피커
   *   볼륨을 압축기 뒤에 둬야 슬라이더를 내렸을 때 압축기가 다시 키우지 않음
   * ========================================================= */
  let ctx = null, comp, masterOut, sfxBus, bgmBus, reverbIn, noiseBuf, wet, convolutionConnected = false;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6; comp.knee.value = 6; comp.ratio.value = 3; comp.attack.value = 0.002; comp.release.value = 0.15;
    masterOut = ctx.createGain();
    // 맨 끝 안전 리미터: 어떤 상황에서도 갑자기 튀는 큰 소리를 눌러줌
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.1;
    comp.connect(masterOut).connect(limiter).connect(ctx.destination);
    sfxBus = ctx.createGain();
    bgmBus = ctx.createGain(); bgmBus.gain.value = 0; bgmBus.connect(comp);

    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = cfg.reverb;
    reverbIn = ctx.createGain(); reverbIn.connect(conv).connect(wet);
    if (!cfg.lowPower) { wet.connect(comp); convolutionConnected = true; }

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    buildFxChains(); fxTheme = null; setSfxFx(activeTheme()); // 효과음 처리 회로는 처음에 한 번만 연결
    applyVolumes();
    return ctx;
  }
  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    masterOut.gain.setTargetAtTime(cfg.master * cfg.master, t, 0.03); // 귀에 맞게 제곱 곡선
    sfxBus.gain.setTargetAtTime(cfg.sfxOn ? cfg.sfxVol * cfg.sfxVol : 0, t, 0.03);
    if (wet) {
      if (cfg.lowPower && convolutionConnected) { wet.disconnect(); convolutionConnected = false; }
      else if (!cfg.lowPower && !convolutionConnected) { wet.connect(comp); convolutionConnected = true; }
      wet.gain.setTargetAtTime(cfg.lowPower ? 0 : cfg.reverb, t, 0.05);
    }
  }
  // 큰 효과음이 날 때 배경음을 잠깐 낮춤
  let duckUntil = 0;
  function duckBgm(sec = 1.4) {
    if (!cfg.duck || !ctx || !bgmActive) return;
    const t = ctx.currentTime, target = cfg.bgmVol * cfg.bgmVol;
    bgmBus.gain.cancelScheduledValues(t);
    bgmBus.gain.setTargetAtTime(target * (1 - cfg.duckAmount), t, 0.05);
    bgmBus.gain.setTargetAtTime(target, t + sec, 0.4);
    duckUntil = performance.now() + sec * 1000;
  }

  // 아무 소리도 안 날 땐 오디오 엔진을 재워서 배터리·CPU 아낌
  let lastSound = 0, unlocked = false, bgmActive = false;
  const touch = () => { lastSound = performance.now(); if (ctx && ctx.state === "suspended" && unlocked) ctx.resume().catch(() => {}); };
  every(() => {
    if (ctx && ctx.state === "running" && !bgmActive && performance.now() - lastSound > cfg.sleepSec * 1000) ctx.suspend().catch(() => {});
  }, 4000);

  const unlock = () => {
    const c = ensureCtx(); if (!c) return;
    if (c.state !== "running") c.resume().then(() => { unlocked = true; syncBgm(); }).catch(() => {});
    else unlocked = true;
    lastSound = performance.now();
    // iOS는 음악 파일 재생을 터치 순간에만 허락해서 여기서 바로 맞춤
    try { if (fileTrack.el && fileTrack.el.paused) fileTrack.el.play().catch(() => {}); } catch {}
  };
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);
  later(() => { document.removeEventListener("pointerdown", unlock, true); document.removeEventListener("keydown", unlock, true); });

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- 합성 도구 (P = 음높이 배율, V = 볼륨 배율) ---------- */
  let P = 1, V = 1, K = null, OUT = null; // K: 지금 소리에 적용할 테마 키트, OUT: 임시 출력(왜곡 등)
  function env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function route(g, pan, rev) {
    let out = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
    out.connect(OUT || sfxBus);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev * (K ? K.rev : 1); out.connect(s).connect(reverbIn); }
  }
  function osc({ f, to, type = "sine", at = 0, dur = 0.2, vol = 0.3, a = 0.004, rev = 0, lp, hp, q = 0.7, detune = 0, pan = 0, curve = "exp" }) {
    const t0 = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = K && f * P > 220 && K.wave[type] ? K.wave[type] : type; o.detune.value = detune;
    o.frequency.setValueAtTime(f * P, t0);
    if (to) curve === "lin" ? o.frequency.linearRampToValueAtTime(to * P, t0 + dur) : o.frequency.exponentialRampToValueAtTime(Math.max(20, to * P), t0 + dur);
    const g = ctx.createGain(); env(g, t0, a, vol * V, dur);
    let n = o;
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp * P; fl.Q.value = q; n.connect(fl); n = fl; }
    if (hp) { const fh = ctx.createBiquadFilter(); fh.type = "highpass"; fh.frequency.value = hp; n.connect(fh); n = fh; }
    n.connect(g); route(g, pan, rev);
    o.start(t0); o.stop(t0 + a + dur + 0.05);
  }
  function nz({ at = 0, dur = 0.2, vol = 0.3, type = "bandpass", f = 1000, to, q = 1, a = 0.003, rev = 0, pan = 0 }) {
    const t0 = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f * P, t0);
    if (to) fl.frequency.exponentialRampToValueAtTime(Math.max(30, to * P), t0 + dur);
    const g = ctx.createGain(); env(g, t0, a, vol * V, dur);
    s.connect(fl).connect(g); route(g, pan, rev);
    s.start(t0, Math.random()); s.stop(t0 + a + dur + 0.05);
  }
  // FM 벨: 실제 종·크리스털에 가까운 금속성 울림
  function fmBell(midi, at = 0, vol = 0.16, dur = 1.4, rev = 0.5, ratio = 3.5, index = 2.2, pan = 0) {
    if (K) { if (K.bellRatio) ratio = K.bellRatio; index *= K.bellIndex; dur *= K.bellDec; }
    const t0 = ctx.currentTime + at, fc = mtof(midi) * P;
    const car = ctx.createOscillator(); car.frequency.value = fc;
    const mod = ctx.createOscillator(); mod.frequency.value = fc * ratio;
    const mg = ctx.createGain(); mg.gain.setValueAtTime(fc * index, t0); mg.gain.exponentialRampToValueAtTime(fc * 0.05, t0 + dur);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain(); env(g, t0, 0.003, vol * V, dur);
    car.connect(g); route(g, pan, rev);
    car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.1); mod.stop(t0 + dur + 0.1);
  }
  const sparkle = (at = 0, n = 8, base = 88, vol = 0.05) => {
    for (let i = 0; i < n; i++) fmBell(base + [0, 3, 5, 7, 10, 12][i % 6] + (i > 5 ? 12 : 0), at + i * 0.04 + Math.random() * 0.02, vol, 0.35, 0.7, 2, 1, (Math.random() - 0.5) * 1.4);
  };
  const chord = (notes, at, vol, dur, type = "triangle", rev = 0.4, lp = 3000) => notes.forEach((m, i) => osc({ f: mtof(m), type, at, dur, vol, a: 0.01, rev, lp, detune: i % 2 ? 6 : -6 }));
  // 저음 '둥': 설정의 '둥 소리 세기'로 한꺼번에 조절. 너무 낮은 초저음은 스피커만 울려서 바닥을 50Hz로 제한
  const thump = (at = 0, vol = 0.45, from = 140, to = 45, dur = 0.22) => { const b = cfg.boom; if (b <= 0.01) return; osc({ f: from, to: Math.max(50, to), type: "sine", at, dur, vol: vol * b, a: 0.004 }); };

  /* ---------- 효과음 ---------- */
  const SYNTH = {
    // UI
    click: () => { osc({ f: 2200, to: 1300, dur: 0.035, vol: 0.12 }); nz({ dur: 0.02, vol: 0.05, type: "highpass", f: 5000 }); },
    confirm: () => { fmBell(84, 0, 0.1, 0.35, 0.25, 2, 0.8); fmBell(91, 0.06, 0.09, 0.5, 0.3, 2, 0.8); },
    back: () => { osc({ f: 900, to: 520, type: "triangle", dur: 0.09, vol: 0.12 }); nz({ dur: 0.06, vol: 0.03, f: 1200, to: 400 }); },
    tab: () => { osc({ f: 1500, dur: 0.04, vol: 0.09 }); osc({ f: 2250, at: 0.025, dur: 0.05, vol: 0.06 }); },
    toggle: () => { nz({ dur: 0.025, vol: 0.12, type: "bandpass", f: 3000, q: 3 }); osc({ f: 1100, dur: 0.05, vol: 0.06, type: "square", lp: 2500 }); },
    error: () => { osc({ f: 180, type: "square", dur: 0.09, vol: 0.06, lp: 900 }); osc({ f: 150, type: "square", at: 0.1, dur: 0.14, vol: 0.06, lp: 900 }); },
    popup: () => { osc({ f: 500, to: 1100, dur: 0.12, vol: 0.1 }); nz({ dur: 0.12, vol: 0.03, f: 2000, to: 6000, q: 2 }); },
    whoosh: () => nz({ dur: 0.28, vol: 0.09, f: 300, to: 3200, q: 1.2, a: 0.08 }),
    deal: () => { for (let i = 0; i < 5; i++) nz({ at: i * 0.035, dur: 0.05, vol: 0.05, f: 2500 + i * 300, q: 4, pan: -0.4 + i * 0.2 }); },
    page: () => { nz({ dur: 0.18, vol: 0.06, f: 1500, to: 4000, q: 0.8, a: 0.03 }); nz({ at: 0.06, dur: 0.06, vol: 0.03, type: "highpass", f: 6000 }); },
    tick: () => osc({ f: 1700 + Math.random() * 600, type: "square", dur: 0.015, vol: 0.022, lp: 4500 }),
    // 소환
    pullPress: () => { fmBell(88, 0, 0.12, 0.3, 0.3, 1.5, 1.2); fmBell(95, 0.07, 0.1, 0.6, 0.4, 1.5, 1.2); thump(0, 0.25, 90, 50, 0.2); },
    charge: () => {
      osc({ f: 80, to: 420, type: "sawtooth", dur: 1.15, vol: 0.07, a: 0.35, lp: 1100, q: 6, rev: 0.4, curve: "lin" });
      osc({ f: 160, to: 840, dur: 1.15, vol: 0.06, a: 0.4, rev: 0.4, curve: "lin" });
      nz({ dur: 1.15, vol: 0.05, f: 300, to: 7000, q: 3, a: 0.6, rev: 0.5 });
      for (let i = 0; i < 6; i++) fmBell(76 + i * 2, 0.15 + i * 0.15, 0.03 + i * 0.008, 0.25, 0.5, 2, 1);
    },
    flash: () => { nz({ dur: 0.7, vol: 0.22, type: "highpass", f: 1200, a: 0.002, rev: 0.7 }); nz({ dur: 0.25, vol: 0.25, type: "lowpass", f: 900, a: 0.002 }); thump(0, 0.6, 110, 32, 0.8); },
    flip: () => { nz({ dur: 0.08, vol: 0.1, f: 2200, to: 900, q: 1.5 }); osc({ f: 700, to: 1000, dur: 0.06, vol: 0.05 }); },
    reveal3: () => { fmBell(79, 0, 0.12, 0.8, 0.4, 3, 1.5); fmBell(83, 0.05, 0.1, 0.8, 0.4, 3, 1.5); },
    reveal4: () => { [76, 80, 83, 88].forEach((m, i) => fmBell(m, i * 0.06, 0.13, 1.2, 0.55, 3.5, 2, -0.3 + i * 0.2)); sparkle(0.22, 7, 90, 0.04); thump(0, 0.25, 100, 50, 0.4); },
    reveal5: () => {
      thump(0, 0.7, 90, 28, 1.4);
      nz({ dur: 1.6, vol: 0.06, type: "highpass", f: 5000, a: 0.25, rev: 0.9 });
      chord([60, 64, 67, 72], 0, 0.05, 2.4, "sawtooth", 0.6, 2200);
      [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => fmBell(m, i * 0.055, 0.15, 2, 0.75, 3.5, 2.4, -0.6 + i * 0.2));
      sparkle(0.35, 16, 93, 0.045);
    },
    rays: () => { sparkle(0, 10, 95, 0.04); osc({ f: 2000, to: 4000, dur: 0.9, vol: 0.02, a: 0.3, rev: 0.8 }); },
    // 전투
    sortie: () => {
      [[55, 0], [62, 0.12], [67, 0.24]].forEach(([m, t]) => { osc({ f: mtof(m), type: "sawtooth", at: t, dur: 0.22, vol: 0.06, lp: 2400, rev: 0.3 }); osc({ f: mtof(m - 12), type: "square", at: t, dur: 0.22, vol: 0.04, lp: 800 }); });
      chord([67, 71, 74], 0.36, 0.06, 0.8, "sawtooth", 0.5, 2600); thump(0.36, 0.5, 120, 40, 0.4); nz({ at: 0.36, dur: 0.5, vol: 0.06, type: "highpass", f: 5000, rev: 0.5 });
    },
    skillSelect: () => { osc({ f: 600, to: 1500, dur: 0.12, vol: 0.08, type: "triangle" }); nz({ dur: 0.1, vol: 0.04, f: 3000, q: 4 }); },
    turn: () => fmBell(81, 0, 0.07, 0.4, 0.3, 2, 0.6),
    hit: () => { nz({ dur: 0.1, vol: 0.3, type: "lowpass", f: 2500, a: 0.001 }); nz({ dur: 0.04, vol: 0.15, type: "highpass", f: 4000, a: 0.001 }); thump(0, 0.45, 180, 55, 0.18); },
    crit: () => {
      nz({ dur: 0.05, vol: 0.3, type: "highpass", f: 3500, a: 0.001 });
      nz({ at: 0.015, dur: 0.22, vol: 0.32, type: "lowpass", f: 3000, to: 500, a: 0.001 });
      osc({ f: 260, to: 45, type: "sawtooth", dur: 0.3, vol: 0.18, lp: 1500 });
      thump(0, 0.6, 200, 40, 0.3); fmBell(96, 0.02, 0.05, 0.3, 0.4, 5, 3);
    },
    hitFire: () => { SYNTH.hit(); for (let i = 0; i < 7; i++) nz({ at: 0.02 + Math.random() * 0.25, dur: 0.04, vol: 0.08, f: 1500 + Math.random() * 3000, q: 5 }); nz({ dur: 0.45, vol: 0.12, f: 400, to: 1800, a: 0.02 }); },
    hitWater: () => { SYNTH.hit(); for (let i = 0; i < 5; i++) osc({ f: 500 + Math.random() * 700, to: 1400 + Math.random() * 900, at: 0.02 + i * 0.04, dur: 0.06, vol: 0.05 }); nz({ dur: 0.35, vol: 0.1, type: "lowpass", f: 1800, to: 500, a: 0.01 }); },
    hitWind: () => { SYNTH.hit(); nz({ dur: 0.35, vol: 0.14, f: 600, to: 5000, q: 2, a: 0.03 }); nz({ at: 0.08, dur: 0.25, vol: 0.08, f: 4000, to: 900, q: 3 }); },
    hitEarth: () => { thump(0, 0.7, 120, 30, 0.4); nz({ dur: 0.5, vol: 0.2, type: "lowpass", f: 600, to: 150, a: 0.005 }); for (let i = 0; i < 4; i++) nz({ at: 0.05 + i * 0.05, dur: 0.05, vol: 0.06, f: 900 + Math.random() * 600, q: 4 }); },
    hitLight: () => { SYNTH.hit(); sparkle(0.02, 6, 96, 0.035); osc({ f: 1800, to: 3000, dur: 0.25, vol: 0.03, rev: 0.6 }); },
    hitDark: () => { SYNTH.hit(); osc({ f: 90, to: 50, type: "sawtooth", dur: 0.6, vol: 0.1, lp: 500, q: 8, rev: 0.4 }); nz({ dur: 0.5, vol: 0.06, f: 300, to: 120, q: 6, rev: 0.4 }); },
    heal: () => { [72, 76, 79, 84].forEach((m, i) => fmBell(m, i * 0.08, 0.07, 0.9, 0.6, 2, 0.7)); nz({ dur: 0.6, vol: 0.03, type: "highpass", f: 6000, a: 0.2, rev: 0.6 }); },
    shield: () => { osc({ f: 300, to: 900, type: "triangle", dur: 0.25, vol: 0.09, rev: 0.4 }); fmBell(86, 0.12, 0.07, 0.6, 0.5, 1.41, 3); },
    shieldBreak: () => { for (let i = 0; i < 9; i++) fmBell(88 + Math.floor(Math.random() * 14), i * 0.025, 0.05, 0.25, 0.4, 2.76, 4, Math.random() - 0.5); nz({ dur: 0.3, vol: 0.18, type: "highpass", f: 3000, a: 0.001 }); thump(0, 0.3, 160, 60, 0.2); },
    charged: () => { osc({ f: 200, to: 600, type: "sawtooth", dur: 0.6, vol: 0.05, lp: 1400, q: 8, a: 0.2, rev: 0.4, curve: "lin" }); nz({ dur: 0.6, vol: 0.04, f: 800, to: 3000, q: 6, a: 0.25 }); },
    ko: () => { osc({ f: 400, to: 60, type: "triangle", dur: 0.6, vol: 0.12, rev: 0.4 }); thump(0.25, 0.4, 90, 35, 0.4); nz({ at: 0.25, dur: 0.3, vol: 0.08, type: "lowpass", f: 800 }); },
    enrage: () => { osc({ f: 70, to: 55, type: "sawtooth", dur: 1.1, vol: 0.14, lp: 700, q: 4, a: 0.08, rev: 0.4 }); osc({ f: 73, to: 57, type: "sawtooth", dur: 1.1, vol: 0.1, lp: 700, a: 0.08 }); nz({ dur: 1.0, vol: 0.12, f: 400, to: 200, q: 2, a: 0.1, rev: 0.4 }); thump(0, 0.5, 80, 30, 0.8); },
    victory: () => {
      [[67, 0, 0.13], [72, 0.13, 0.13], [76, 0.26, 0.13], [79, 0.39, 0.2], [76, 0.6, 0.1], [79, 0.7, 0.1], [84, 0.82, 0.9]].forEach(([m, t, d]) => {
        osc({ f: mtof(m), type: "sawtooth", at: t, dur: d + 0.1, vol: 0.06, lp: 2800, rev: 0.4 });
        osc({ f: mtof(m), type: "square", at: t, dur: d + 0.1, vol: 0.03, lp: 1800, detune: 7 });
      });
      chord([48, 55, 60, 64], 0.82, 0.05, 1.4, "sawtooth", 0.6, 1800);
      thump(0.82, 0.5, 110, 40, 0.5); sparkle(0.9, 12, 91, 0.04);
    },
    defeat: () => {
      [[69, 0], [68, 0.35], [67, 0.7], [62, 1.05]].forEach(([m, t]) => osc({ f: mtof(m), type: "triangle", at: t, dur: 0.6, vol: 0.12, rev: 0.6, lp: 1500 }));
      chord([38, 45, 50], 1.05, 0.06, 2, "sawtooth", 0.6, 600);
    },
    // 보상·성장
    coin: () => { fmBell(95, 0, 0.09, 0.15, 0.2, 1, 0.5); fmBell(100, 0.06, 0.09, 0.45, 0.35, 1, 0.5); },
    reward: () => { [79, 83, 86, 91].forEach((m, i) => fmBell(m, i * 0.07, 0.1, 0.9, 0.5, 3.5, 1.8)); sparkle(0.25, 8, 93, 0.035); },
    drop: () => { osc({ f: 1200, to: 300, dur: 0.12, vol: 0.06 }); fmBell(91, 0.1, 0.08, 0.5, 0.4, 3, 1.5); },
    levelUp: () => { [67, 71, 74, 79, 83, 86, 91].forEach((m, i) => osc({ f: mtof(m), type: "square", at: i * 0.05, dur: 0.14, vol: 0.045, lp: 3000, rev: 0.4 })); fmBell(91, 0.38, 0.13, 1.4, 0.6, 3.5, 2); sparkle(0.4, 10, 93, 0.04); },
    equip: () => { nz({ dur: 0.06, vol: 0.18, f: 2600, q: 6 }); fmBell(74, 0.01, 0.08, 0.4, 0.2, 2.76, 5); nz({ at: 0.08, dur: 0.04, vol: 0.08, f: 3500, q: 6 }); },
    potion: () => { for (let i = 0; i < 6; i++) osc({ f: 400 + Math.random() * 500, to: 900 + Math.random() * 800, at: i * 0.06, dur: 0.07, vol: 0.05 }); SYNTH.heal(); },
    unlock: () => { nz({ dur: 0.05, vol: 0.15, f: 2000, q: 5 }); osc({ f: 300, to: 200, type: "square", at: 0.05, dur: 0.06, vol: 0.06, lp: 1500 }); [79, 84, 88].forEach((m, i) => fmBell(m, 0.15 + i * 0.07, 0.1, 0.9, 0.5)); },
    delete: () => { nz({ dur: 0.2, vol: 0.1, type: "lowpass", f: 1500, to: 300 }); osc({ f: 300, to: 120, type: "triangle", dur: 0.2, vol: 0.08 }); },
    // 획득
    aether: () => { [86, 91, 93, 98].forEach((m, i) => fmBell(m, i * 0.05, 0.08, 0.9, 0.7, 7.01, 1.4, -0.3 + i * 0.2)); osc({ f: 1400, to: 2800, dur: 0.5, vol: 0.025, a: 0.1, rev: 0.7 }); nz({ dur: 0.5, vol: 0.025, type: "highpass", f: 7000, a: 0.1, rev: 0.6 }); },
    glimmer: () => { sparkle(0, 6, 96, 0.05); fmBell(91, 0.05, 0.07, 0.6, 0.6, 2, 0.8); },
    funds: () => { for (let i = 0; i < 4; i++) { fmBell(93 + (i % 2) * 5, i * 0.055, 0.07, 0.2, 0.25, 1, 0.5, (Math.random() - 0.5) * 0.8); nz({ at: i * 0.055, dur: 0.03, vol: 0.05, f: 6000, q: 6 }); } },
    vigorGain: () => { osc({ f: 400, to: 900, dur: 0.35, vol: 0.06, a: 0.08, rev: 0.4 }); [76, 81].forEach((m, i) => fmBell(m, 0.15 + i * 0.08, 0.07, 0.6, 0.5, 2, 0.6)); },
    spend: () => { osc({ f: 1200, to: 700, dur: 0.08, vol: 0.06, type: "triangle" }); nz({ dur: 0.05, vol: 0.04, f: 4000, q: 4 }); },
    relic: () => { fmBell(62, 0, 0.12, 1.4, 0.6, 2.76, 4); fmBell(74, 0.08, 0.08, 1.1, 0.6, 2.76, 3); nz({ dur: 0.08, vol: 0.12, f: 2500, q: 6 }); },
    rune: () => { [81, 88, 84, 91].forEach((m, i) => fmBell(m, i * 0.07, 0.07, 0.8, 0.7, 5.4, 1.6, -0.3 + i * 0.2)); osc({ f: 220, to: 330, type: "triangle", dur: 0.6, vol: 0.04, a: 0.1, rev: 0.6 }); },
    insight: () => { nz({ dur: 0.2, vol: 0.05, f: 1500, to: 4000, q: 0.8, a: 0.03 }); [79, 83, 86].forEach((m, i) => fmBell(m, 0.08 + i * 0.07, 0.07, 0.7, 0.5, 2, 0.8)); },
    // 스토리 연출
    notice: () => { fmBell(96, 0, 0.09, 0.25, 0.3, 2, 0.6); fmBell(91, 0.09, 0.09, 0.5, 0.4, 2, 0.6); },
    affection: () => { [84, 88, 91, 96].forEach((m, i) => fmBell(m, i * 0.06, 0.08, 0.7, 0.6, 7.01, 1.2)); osc({ f: 660, to: 990, dur: 0.3, vol: 0.03, a: 0.05, rev: 0.6 }); sparkle(0.2, 5, 98, 0.03); },
    letter: () => { nz({ dur: 0.35, vol: 0.06, f: 600, to: 2500, q: 1, a: 0.1 }); nz({ at: 0.3, dur: 0.05, vol: 0.08, type: "lowpass", f: 900 }); fmBell(88, 0.35, 0.08, 0.6, 0.5, 2, 0.8); fmBell(93, 0.43, 0.07, 0.7, 0.5, 2, 0.8); },
    glitch: () => {
      for (let i = 0; i < 7; i++) {
        const at = i * 0.035 + Math.random() * 0.02;
        if (Math.random() < 0.5) osc({ f: 200 + Math.random() * 3000, type: "square", at, dur: 0.025, vol: 0.05, lp: 6000 });
        else nz({ at, dur: 0.03, vol: 0.08, type: "bandpass", f: 500 + Math.random() * 6000, q: 8 });
      }
      osc({ f: 60, to: 40, type: "sawtooth", dur: 0.3, vol: 0.06, lp: 400 });
    },
  };

  // 테마별 UI 소리 색깔 (같은 버튼이라도 장르마다 다르게)
  const FLAVOR = {
    otome: {
      click: () => fmBell(98, 0, 0.06, 0.18, 0.3, 7.01, 0.9),
      confirm: () => { [91, 96, 100].forEach((m, i) => fmBell(m, i * 0.05, 0.07, 0.5, 0.5, 7.01, 1)); },
      back: () => { fmBell(93, 0, 0.06, 0.25, 0.3, 7.01, 0.9); fmBell(86, 0.06, 0.06, 0.35, 0.3, 7.01, 0.9); },
      tab: () => fmBell(103, 0, 0.05, 0.15, 0.25, 7.01, 0.8),
      popup: () => { fmBell(96, 0, 0.07, 0.4, 0.5, 7.01, 1); sparkle(0.05, 4, 98, 0.03); },
      notice: () => { [96, 100, 103].forEach((m, i) => fmBell(m, i * 0.06, 0.07, 0.5, 0.6, 7.01, 1)); sparkle(0.12, 4, 100, 0.025); },
    },
    hunter: {
      click: () => { osc({ f: 1800, type: "square", dur: 0.025, vol: 0.05, lp: 5000 }); osc({ f: 2400, type: "square", at: 0.03, dur: 0.02, vol: 0.035, lp: 5000 }); },
      confirm: () => { osc({ f: 880, type: "square", dur: 0.06, vol: 0.05, lp: 4000 }); osc({ f: 1320, type: "square", at: 0.07, dur: 0.12, vol: 0.05, lp: 4000, rev: 0.2 }); },
      back: () => { osc({ f: 1100, to: 500, type: "square", dur: 0.08, vol: 0.05, lp: 3000 }); },
      tab: () => osc({ f: 2000, type: "square", dur: 0.02, vol: 0.04, lp: 5000 }),
      popup: () => { osc({ f: 300, to: 1600, type: "sawtooth", dur: 0.15, vol: 0.04, lp: 3000 }); nz({ dur: 0.15, vol: 0.04, f: 2000, to: 8000, q: 3 }); },
      notice: () => { osc({ f: 1046, type: "square", dur: 0.07, vol: 0.05, lp: 4000 }); osc({ f: 1568, type: "square", at: 0.08, dur: 0.07, vol: 0.05, lp: 4000 }); osc({ f: 2093, type: "square", at: 0.16, dur: 0.15, vol: 0.05, lp: 4000, rev: 0.3 }); },
      hit: () => { nz({ dur: 0.08, vol: 0.32, type: "lowpass", f: 3500, a: 0.001 }); nz({ dur: 0.03, vol: 0.2, type: "highpass", f: 5000, a: 0.001 }); thump(0, 0.55, 220, 45, 0.16); osc({ f: 120, to: 60, type: "sawtooth", dur: 0.12, vol: 0.08, lp: 900 }); },
    },
    daily: {
      click: () => osc({ f: 900, to: 1100, type: "sine", dur: 0.05, vol: 0.09 }),
      confirm: () => { [72, 76, 79].forEach((m, i) => osc({ f: mtof(m + 12), type: "sine", at: i * 0.06, dur: 0.25, vol: 0.07, rev: 0.3 })); },
      back: () => osc({ f: 700, to: 450, type: "sine", dur: 0.1, vol: 0.08 }),
      tab: () => osc({ f: 1200, type: "triangle", dur: 0.04, vol: 0.06 }),
      popup: () => { osc({ f: 400, to: 800, type: "sine", dur: 0.08, vol: 0.08 }); osc({ f: 800, to: 1200, at: 0.05, dur: 0.06, vol: 0.05 }); },
      notice: () => { osc({ f: mtof(84), type: "sine", dur: 0.3, vol: 0.08, rev: 0.3 }); osc({ f: mtof(88), type: "sine", at: 0.1, dur: 0.4, vol: 0.07, rev: 0.3 }); },
    },
    dark: {
      click: () => { osc({ f: 900, to: 600, type: "triangle", dur: 0.05, vol: 0.08, rev: 0.4 }); },
      confirm: () => { fmBell(69, 0, 0.09, 0.8, 0.7, 2.76, 3); },
      popup: () => { nz({ dur: 0.3, vol: 0.05, f: 200, to: 1200, q: 3, rev: 0.6 }); },
      notice: () => { fmBell(81, 0, 0.08, 0.8, 0.8, 2.76, 2); fmBell(80, 0.15, 0.06, 0.9, 0.8, 2.76, 2); },
    },
  };


  /* =========================================================
   * 장르 테마별 사운드 키트
   *  1) KIT: 모든 효과음에 공통으로 입히는 테마 색 (음높이, 종소리 재질, 파형, 울림)
   *  2) 테마별 효과음 체인 (헌터 왜곡, 일상 테이프, 다크 어둡게, 오토메 반짝)
   *  3) SIGNATURE: ★공개·치명타·승리 같은 큰 소리는 테마마다 따로 작곡
   * ========================================================= */
  const KIT = {
    fantasy: { shift: 0, bellRatio: 0, bellIndex: 1, bellDec: 1, wave: {}, rev: 1 },
    otome:   { shift: 5, bellRatio: 7.01, bellIndex: 0.55, bellDec: 1.3, wave: { sawtooth: "triangle", square: "sine" }, rev: 1.35 },
    hunter:  { shift: 0, bellRatio: 1.0, bellIndex: 2.6, bellDec: 0.45, wave: { sine: "square", triangle: "sawtooth" }, rev: 0.55 },
    daily:   { shift: 2, bellRatio: 4.0, bellIndex: 0.35, bellDec: 0.4, wave: { sawtooth: "triangle", square: "triangle" }, rev: 0.45 },
    dark:    { shift: -4, bellRatio: 2.76, bellIndex: 1.8, bellDec: 1.9, wave: { square: "sawtooth" }, rev: 1.8 },
  };

  // 테마별 효과음 체인: sfxBus → (테마 처리) → 압축기
  let fxTheme = null;
  function curve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); } return c; }
  // 테마별 처리 회로를 처음에 한 번만 만들어 두고, 바꿀 땐 끊지 않고 볼륨만 부드럽게 넘김(끊으면 '탁·쾅' 튀는 소리가 남)
  let fxChains = null;
  function buildFxChains() {
    fxChains = {};
    const filt = (type, f, g = 0, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = g; b.Q.value = q; return b; };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const chain = (name, wire) => { const inp = gain(0); sfxBus.connect(inp); wire(inp); fxChains[name] = inp; };
    chain("fantasy", (i) => i.connect(comp));
    chain("hunter", (i) => { // 살짝 찌그러진 디지털 질감 + 또렷한 고음
      const dry = gain(0.75), sh = ctx.createWaveShaper(), wetG = gain(0.4), hs = filt("highshelf", 3500, 4);
      sh.curve = curve(14); sh.oversample = "2x";
      i.connect(dry).connect(hs); i.connect(sh).connect(wetG).connect(hs); hs.connect(comp);
    });
    chain("daily", (i) => { const lp = filt("lowpass", 7000), ls = filt("lowshelf", 250, 3); i.connect(ls).connect(lp).connect(comp); }); // 따뜻한 테이프
    chain("dark", (i) => { const lp = filt("lowpass", 4200), send = gain(0.35); i.connect(lp).connect(comp); lp.connect(send).connect(reverbIn); }); // 어둡고 깊게
    chain("otome", (i) => { const hs = filt("highshelf", 6000, 4), send = gain(0.15); i.connect(hs).connect(comp); hs.connect(send).connect(reverbIn); }); // 반짝이게
  }
  function setSfxFx(theme) {
    if (!ctx || fxTheme === theme) return;
    if (!fxChains) buildFxChains();
    fxTheme = theme;
    const t = ctx.currentTime;
    for (const k in fxChains) { const g = fxChains[k].gain; g.cancelScheduledValues(t); g.setTargetAtTime(k === (fxChains[theme] ? theme : "fantasy") ? 1 : 0, t, 0.03); }
  }

  // 시그니처 효과음용 도구
  const pluck = (m, at = 0, vol = 0.1, dur = 0.7, pan = 0, rev = 0.45) => { osc({ f: mtof(m), type: "triangle", at, dur, vol, a: 0.002, lp: 3800, rev, pan }); osc({ f: mtof(m) * 2, at, dur: dur * 0.3, vol: vol * 0.3, a: 0.002, rev, pan }); };
  const gliss = (notes, at, step, vol, dur = 0.8) => notes.forEach((m, i) => pluck(m, at + i * step, vol, dur, -0.6 + (1.2 * i) / Math.max(1, notes.length - 1)));
  const musicbox = (m, at = 0, vol = 0.1, dur = 1.1, pan = 0) => fmBell(m, at, vol, dur, 0.6, 7.01, 0.9, pan);
  const marimba = (m, at = 0, vol = 0.13, pan = 0) => { fmBell(m, at, vol, 0.32, 0.15, 4, 0.5, pan); osc({ f: mtof(m), at, dur: 0.18, vol: vol * 0.6, a: 0.002 }); };
  const heartbeat = (at = 0, vol = 0.4) => { thump(at, vol, 75, 38, 0.16); thump(at + 0.2, vol * 0.75, 70, 36, 0.2); };
  const choir = (notes, at, dur, vol = 0.03, rev = 0.8) => notes.forEach((m, i) => { osc({ f: mtof(m), at, dur, vol, a: dur * 0.35, rev, detune: (i % 2 ? 9 : -9) }); osc({ f: mtof(m), type: "triangle", at, dur, vol: vol * 0.5, a: dur * 0.4, rev, lp: 1400, detune: (i % 2 ? -5 : 5) }); });
  const toll = (m, at = 0, vol = 0.18, dur = 3.2) => { fmBell(m, at, vol, dur, 0.9, 2.76, 4); fmBell(m + 12, at, vol * 0.4, dur * 0.6, 0.9, 2.76, 2); thump(at, vol * 0.8, 60, 35, 0.6); };
  const riser = (at, dur, vol = 0.08) => { osc({ f: 150, to: 1800, type: "sawtooth", at, dur, vol, a: dur * 0.8, lp: 2500, q: 5, curve: "lin" }); nz({ at, dur, vol: vol * 0.8, f: 400, to: 9000, q: 2, a: dur * 0.85 }); };
  const synthChord = (notes, at, dur, vol = 0.05, lp = 2600) => notes.forEach((m, i) => { osc({ f: mtof(m), type: "sawtooth", at, dur, vol, a: 0.01, lp, rev: 0.35, detune: i % 2 ? 8 : -8 }); });
  const blips = (at, n, base = 84, gap = 0.035, vol = 0.04) => { for (let i = 0; i < n; i++) osc({ f: mtof(base + Math.floor(Math.random() * 24)), type: "square", at: at + i * gap, dur: 0.025, vol, lp: 6000 }); };
  function withDist(k, fn) { // 이 소리만 강하게 찌그러뜨림
    const sh = ctx.createWaveShaper(); sh.curve = curve(k); const g = ctx.createGain(); g.gain.value = 0.55;
    sh.connect(g).connect(sfxBus); const prev = OUT; OUT = sh;
    try { fn(); } finally { OUT = prev; }
    setTimeout(() => { try { sh.disconnect(); g.disconnect(); } catch {} }, 4000);
  }
  const C5PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

  const SIGNATURE = {
    otome: {
      charge: () => { gliss([72, 76, 79, 84, 88, 91], 0, 0.14, 0.06, 0.6); choir([64, 67, 72], 0, 1.2, 0.025); nz({ dur: 1.1, vol: 0.03, type: "highpass", f: 6000, a: 0.6, rev: 0.7 }); },
      flash: () => { nz({ dur: 0.9, vol: 0.12, type: "highpass", f: 3000, a: 0.25, rev: 0.9 }); [84, 88, 91, 96].forEach((m) => musicbox(m, 0.2, 0.06, 1.4)); thump(0.2, 0.2, 90, 50, 0.4); },
      reveal3: () => { musicbox(84, 0, 0.11); musicbox(88, 0.08, 0.1); },
      reveal4: () => { gliss([72, 76, 79, 84, 88], 0, 0.045, 0.08); [84, 88, 91].forEach((m, i) => musicbox(m, 0.25 + i * 0.08, 0.1, 1.3)); sparkle(0.3, 6, 96, 0.03); },
      reveal5: () => {
        gliss(C5PENTA, 0, 0.04, 0.09, 1);
        choir([60, 64, 67, 72, 76], 0.1, 2.6, 0.03);
        [84, 88, 91, 96, 100].forEach((m, i) => musicbox(m, 0.45 + i * 0.09, 0.11, 1.8, -0.5 + i * 0.25));
        heartbeat(0.45, 0.3); sparkle(0.6, 18, 96, 0.035);
      },
      hit: () => { nz({ dur: 0.06, vol: 0.18, type: "bandpass", f: 2500, q: 1.5, a: 0.001 }); musicbox(91, 0.01, 0.05, 0.4); thump(0, 0.25, 160, 70, 0.12); },
      crit: () => { nz({ dur: 0.25, vol: 0.14, f: 800, to: 7000, q: 2, a: 0.01 }); [91, 96, 100].forEach((m, i) => musicbox(m, 0.08 + i * 0.03, 0.08, 0.7)); thump(0.08, 0.35, 180, 50, 0.2); sparkle(0.12, 8, 98, 0.03); },
      sortie: () => { gliss([67, 72, 76, 79, 84], 0, 0.06, 0.08); [79, 84, 88].forEach((m) => musicbox(m, 0.35, 0.09, 1.2)); },
      victory: () => {
        const mel = [[72, 0], [76, 0.18], [79, 0.36], [84, 0.54], [83, 0.78], [84, 0.9]];
        mel.forEach(([m, t]) => { osc({ f: mtof(m), at: t, dur: 0.35, vol: 0.07, a: 0.02, rev: 0.5 }); musicbox(m + 12, t, 0.05, 0.6); });
        gliss(C5PENTA, 0.9, 0.035, 0.07); choir([60, 64, 67, 72], 0.9, 2, 0.03); sparkle(1.1, 14, 96, 0.035);
      },
      defeat: () => { [84, 83, 79, 76, 72, 71].forEach((m, i) => musicbox(m, i * (0.22 + i * 0.06), 0.08 - i * 0.008, 1)); osc({ f: 500, to: 380, at: 1.6, dur: 0.8, vol: 0.03, rev: 0.6 }); },
      levelUp: () => { [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => osc({ f: mtof(m), at: i * 0.06, dur: 0.25, vol: 0.06, a: 0.01, rev: 0.4 })); musicbox(96, 0.45, 0.1, 1.4); sparkle(0.45, 10, 98, 0.03); },
      aether: () => { [96, 100, 103, 108].forEach((m, i) => musicbox(m, i * 0.05, 0.07, 1.2, -0.3 + i * 0.2)); nz({ dur: 0.6, vol: 0.025, type: "highpass", f: 8000, a: 0.15, rev: 0.8 }); },
      affection: () => { heartbeat(0, 0.28); [84, 88, 91, 88, 96].forEach((m, i) => musicbox(m, 0.35 + i * 0.12, 0.08, 0.9)); sparkle(0.9, 6, 100, 0.03); },
    },
    hunter: {
      charge: () => withDist(6, () => { riser(0, 1.15, 0.09); osc({ f: 110, to: 220, type: "square", dur: 1.15, vol: 0.05, lp: 900, a: 0.3, curve: "lin" }); blips(0.6, 10, 84, 0.05, 0.03); }),
      flash: () => withDist(10, () => { thump(0, 0.8, 120, 28, 0.9); nz({ dur: 0.6, vol: 0.3, type: "lowpass", f: 2500, to: 200, a: 0.001 }); nz({ dur: 0.15, vol: 0.2, type: "highpass", f: 5000, a: 0.001 }); }),
      reveal3: () => { osc({ f: 1568, type: "square", dur: 0.05, vol: 0.05, lp: 5000 }); osc({ f: 2093, type: "square", at: 0.06, dur: 0.1, vol: 0.05, lp: 5000 }); },
      reveal4: () => { riser(0, 0.3, 0.06); withDist(8, () => thump(0.3, 0.5, 130, 40, 0.4)); synthChord([57, 64, 69, 72], 0.3, 0.9, 0.05); blips(0.3, 6, 88, 0.03, 0.03); },
      reveal5: () => {
        riser(0, 0.5, 0.09);
        withDist(12, () => { thump(0.5, 0.9, 140, 26, 1.4); nz({ at: 0.5, dur: 0.8, vol: 0.25, type: "lowpass", f: 1800, to: 150, a: 0.001 }); });
        synthChord([45, 52, 57, 64, 69], 0.5, 2.2, 0.055, 3200);
        blips(0.55, 18, 84, 0.03, 0.035);
        [81, 88, 93].forEach((m, i) => osc({ f: mtof(m), type: "square", at: 0.9 + i * 0.12, dur: 0.12, vol: 0.05, lp: 5000, rev: 0.3 }));
      },
      hit: () => withDist(8, () => { nz({ dur: 0.08, vol: 0.32, type: "lowpass", f: 3500, a: 0.001 }); thump(0, 0.55, 220, 45, 0.16); }),
      crit: () => withDist(14, () => { nz({ dur: 0.18, vol: 0.25, f: 6000, to: 600, q: 1.2, a: 0.001 }); thump(0.05, 0.8, 240, 35, 0.35); nz({ at: 0.05, dur: 0.3, vol: 0.25, type: "lowpass", f: 2200, to: 300 }); fmBell(98, 0.05, 0.05, 0.5, 0.3, 1.41, 6); }),
      sortie: () => { for (let i = 0; i < 4; i++) osc({ f: i % 2 ? 660 : 880, type: "square", at: i * 0.16, dur: 0.14, vol: 0.045, lp: 3500 }); withDist(10, () => thump(0.66, 0.7, 120, 30, 0.6)); synthChord([45, 52, 57], 0.66, 1, 0.05); },
      victory: () => { [[57, 64, 69], [60, 67, 72], [62, 69, 74], [64, 71, 76]].forEach((c, i) => synthChord(c, i * 0.2, 0.22, 0.05, 3500)); synthChord([57, 64, 69, 76], 0.85, 1.4, 0.055, 3800); [1046, 1568, 2093].forEach((f, i) => osc({ f, type: "square", at: 1.0 + i * 0.1, dur: 0.1, vol: 0.04, lp: 5000 })); withDist(8, () => thump(0.85, 0.6, 120, 35, 0.5)); },
      defeat: () => { osc({ f: 900, to: 40, type: "sawtooth", dur: 1.4, vol: 0.08, lp: 2000 }); blips(0, 8, 70, 0.07, 0.03); nz({ at: 1.2, dur: 0.4, vol: 0.06, type: "lowpass", f: 600 }); },
      levelUp: () => { [69, 72, 76, 81, 84, 88, 93].forEach((m, i) => osc({ f: mtof(m), type: "square", at: i * 0.035, dur: 0.09, vol: 0.045, lp: 5000 })); osc({ f: 1760, type: "square", at: 0.3, dur: 0.25, vol: 0.045, lp: 5000, rev: 0.3 }); },
      aether: () => { for (let i = 0; i < 8; i++) osc({ f: mtof(84 + i * 2), type: "square", at: i * 0.03, dur: 0.05, vol: 0.035, lp: 6000 }); osc({ f: 2000, to: 4000, dur: 0.3, vol: 0.02, a: 0.05 }); },
      affection: () => { osc({ f: 1318, type: "square", dur: 0.08, vol: 0.04, lp: 5000 }); osc({ f: 1760, type: "square", at: 0.09, dur: 0.18, vol: 0.04, lp: 5000, rev: 0.3 }); },
    },
    daily: {
      charge: () => { osc({ f: 400, to: 1800, dur: 1.1, vol: 0.06, a: 0.05, curve: "lin" }); for (let i = 0; i < 4; i++) marimba(72 + i * 4, 0.2 + i * 0.22, 0.08); },
      flash: () => { nz({ dur: 0.04, vol: 0.25, type: "highpass", f: 3000, a: 0.001 }); nz({ at: 0.05, dur: 0.06, vol: 0.18, type: "bandpass", f: 1500, q: 3 }); [79, 84, 88].forEach((m, i) => marimba(m, 0.15 + i * 0.03, 0.08)); },
      reveal3: () => { marimba(79, 0, 0.12); marimba(84, 0.1, 0.12); },
      reveal4: () => { nz({ dur: 0.15, vol: 0.18, type: "highpass", f: 2000, a: 0.002 }); [72, 76, 79, 84].forEach((m, i) => marimba(m, 0.1 + i * 0.08, 0.12)); },
      reveal5: () => {
        nz({ dur: 0.25, vol: 0.28, type: "highpass", f: 1500, a: 0.001 }); thump(0, 0.3, 160, 60, 0.15);
        for (let i = 0; i < 14; i++) nz({ at: 0.15 + Math.random() * 0.5, dur: 0.03, vol: 0.06, type: "bandpass", f: 3000 + Math.random() * 4000, q: 6 });
        [72, 76, 79, 84, 79, 84, 88, 91].forEach((m, i) => marimba(m, 0.2 + i * 0.09, 0.12, -0.5 + i * 0.14));
        [0.95, 1.2].forEach((t) => nz({ at: t, dur: 0.06, vol: 0.12, type: "bandpass", f: 1800, q: 2 }));
      },
      hit: () => { osc({ f: 320, to: 120, dur: 0.12, vol: 0.18, a: 0.002 }); nz({ dur: 0.03, vol: 0.12, type: "bandpass", f: 1800, q: 4 }); },
      crit: () => { osc({ f: 900, to: 160, dur: 0.18, vol: 0.18, a: 0.002 }); nz({ dur: 0.04, vol: 0.2, type: "bandpass", f: 2400, q: 5 }); osc({ f: 200, to: 600, at: 0.12, dur: 0.25, vol: 0.06, a: 0.01 }); },
      sortie: () => { for (let i = 0; i < 6; i++) osc({ f: i % 2 ? 1900 : 2200, at: i * 0.05, dur: 0.05, vol: 0.05 }); [0.35, 0.5].forEach((t) => nz({ at: t, dur: 0.05, vol: 0.12, type: "bandpass", f: 1800, q: 2 })); },
      victory: () => { [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.5], [84, 0.62]].forEach(([m, t]) => marimba(m, t, 0.13)); [0.75, 0.9, 1.05].forEach((t) => nz({ at: t, dur: 0.05, vol: 0.1, type: "bandpass", f: 1800, q: 2 })); [60, 64, 67].forEach((m) => osc({ f: mtof(m), type: "triangle", at: 0.75, dur: 1, vol: 0.05, rev: 0.3 })); },
      defeat: () => { [[58, 0, 0.35], [57, 0.4, 0.35], [56, 0.8, 0.9]].forEach(([m, t, d]) => osc({ f: mtof(m), to: mtof(m) * 0.97, type: "sawtooth", at: t, dur: d, vol: 0.07, lp: 900, a: 0.03 })); },
      levelUp: () => { [72, 74, 76, 79, 81, 84, 88].forEach((m, i) => marimba(m, i * 0.05, 0.1)); marimba(91, 0.4, 0.13); },
      aether: () => { [88, 91, 96].forEach((m, i) => marimba(m, i * 0.06, 0.1)); },
      affection: () => { osc({ f: 500, to: 900, dur: 0.08, vol: 0.08 }); [84, 88, 91].forEach((m, i) => marimba(m, 0.1 + i * 0.07, 0.09)); },
    },
    dark: {
      charge: () => { choir([45, 46, 52], 0, 1.2, 0.04, 0.9); osc({ f: 55, to: 110, type: "sawtooth", dur: 1.15, vol: 0.08, lp: 400, a: 0.4, curve: "lin" }); for (let i = 0; i < 6; i++) nz({ at: i * 0.18, dur: 0.15, vol: 0.03, type: "bandpass", f: 900 + Math.random() * 1500, q: 12, rev: 0.6 }); },
      flash: () => { nz({ dur: 0.08, vol: 0.35, type: "highpass", f: 1500, a: 0.001 }); nz({ at: 0.05, dur: 2.2, vol: 0.18, type: "lowpass", f: 300, to: 60, a: 0.05, rev: 0.6 }); },
      reveal3: () => toll(62, 0, 0.12, 2),
      reveal4: () => { toll(57, 0, 0.15, 2.6); choir([57, 60, 63, 66], 0.1, 2, 0.03); },
      reveal5: () => {
        nz({ dur: 1.0, vol: 0.1, type: "highpass", f: 2000, a: 0.9, rev: 0.8 }); // 거꾸로 빨려 들어오는 소리
        toll(45, 1.0, 0.22, 4); toll(57, 1.0, 0.12, 3.5);
        choir([45, 48, 51, 54, 57], 1.0, 3, 0.035);
        heartbeat(1.6, 0.35); heartbeat(2.6, 0.3);
      },
      hit: () => { thump(0, 0.5, 120, 40, 0.25); nz({ dur: 0.25, vol: 0.15, type: "lowpass", f: 900, a: 0.002, rev: 0.4 }); },
      crit: () => { thump(0, 0.7, 140, 30, 0.4); nz({ dur: 0.5, vol: 0.12, type: "bandpass", f: 700, to: 300, q: 4, a: 0.01, rev: 0.5 }); fmBell(64, 0.05, 0.08, 1.4, 0.8, 2.76, 4); },
      sortie: () => { [0, 0.3, 0.45].forEach((t, i) => thump(t, 0.6 - i * 0.1, 90, 40, 0.4)); osc({ f: 110, type: "sawtooth", at: 0.6, dur: 1.4, vol: 0.06, lp: 600, a: 0.15, rev: 0.6 }); osc({ f: 164.8, type: "sawtooth", at: 0.6, dur: 1.4, vol: 0.04, lp: 600, a: 0.15, rev: 0.6 }); },
      victory: () => { choir([45, 48, 52], 0, 1.2, 0.04); choir([45, 49, 52, 57], 1.1, 2.2, 0.04); toll(57, 1.1, 0.12, 3); },
      defeat: () => { choir([40, 41, 46, 47], 0, 2.5, 0.04); heartbeat(0.3, 0.4); heartbeat(1.1, 0.3); thump(2.0, 0.15, 60, 35, 0.3); },
      levelUp: () => { [60, 62, 64, 66, 68, 70, 72].forEach((m, i) => fmBell(m + 12, i * 0.09, 0.07, 1.2, 0.8, 2.76, 2.5)); },
      aether: () => { [91, 92, 98].forEach((m, i) => fmBell(m, i * 0.07, 0.06, 1.4, 0.9, 3.5, 1.5)); },
      affection: () => { heartbeat(0, 0.35); [76, 75, 72, 75].forEach((m, i) => fmBell(m + 12, 0.4 + i * 0.18, 0.06, 1.0, 0.7, 7.01, 0.8)); },
    },
  };

  /* ---------- 내 소리 파일 (IndexedDB, 이 기기 전용) ---------- */
  const DB = "gf-sound-files", ST = "files";
  let dbp = null;
  const idb = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const idbReq = async (mode, fn) => { const d = await idb(); return new Promise((res, rej) => { const tx = d.transaction(ST, mode); const q = fn(tx.objectStore(ST)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); };
  const idbGet = (k) => idbReq("readonly", (s) => s.get(k)).catch(() => null);
  const idbPut = (k, v) => idbReq("readwrite", (s) => s.put(v, k));
  const idbDel = (k) => idbReq("readwrite", (s) => s.delete(k)).catch(() => {});
  const idbKeys = () => idbReq("readonly", (s) => s.getAllKeys()).catch(() => []);

  const customNames = new Map(); // "sfx:hit" / "bgm:battle" -> 파일 이름
  const sfxBuffers = new Map();  // 처음 쓸 때 한 번만 디코딩해서 보관
  async function loadCustomIndex() {
    const keys = await idbKeys();
    customNames.clear();
    for (const k of keys || []) { const rec = await idbGet(k); if (rec) customNames.set(k, rec.name); }
  }
  async function getSfxBuffer(name) {
    if (sfxBuffers.has(name)) return sfxBuffers.get(name);
    const rec = await idbGet("sfx:" + name); if (!rec) return null;
    const ab = await rec.blob.arrayBuffer();
    const buf = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)).catch(() => null);
    if (buf) sfxBuffers.set(name, buf);
    return buf;
  }

  /* ---------- 재생 ---------- */
  const lastPlay = new Map();
  const GROUP_OF = Object.fromEntries(SOUND_LIST.flatMap(([g, list]) => list.map(([k]) => [k, g])));
  const BIG = new Set(["reveal4", "reveal5", "victory", "defeat", "levelUp", "sortie", "enrage", "flash", "affection", "unlock"]);
  function play(name, gap = 60, opts = {}) {
    if (!ctx || !unlocked) return;
    if (!opts.force && (!cfg.sfxOn || !gfVisible())) return;
    if (!opts.force && cfg.groups[GROUP_OF[name]] === false) return;
    if (!cfg.elemHits && /^hit[A-Z]/.test(name)) name = "hit";
    const sc = sCfg(name);
    if (!opts.force && !sc.on) return;
    if (BIG.has(name)) duckBgm(name === "reveal5" || name === "victory" ? 2.2 : 1.3);
    const now = performance.now();
    if (!opts.force && now - (lastPlay.get(name) || 0) < gap) return;
    lastPlay.set(name, now);
    touch();
    // 미리 듣기는 효과음이 꺼져 있어도 들리게
    if (opts.force && (!cfg.sfxOn || cfg.sfxVol < 0.05)) sfxBus.gain.setTargetAtTime(0.5, ctx.currentTime, 0.01), setTimeout(applyVolumes, 2500);
    if (customNames.has("sfx:" + name)) {
      getSfxBuffer(name).then((buf) => {
        if (!buf) return;
        const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = sc.pitch;
        const g = ctx.createGain(); g.gain.value = sc.vol * sc.vol;
        s.connect(g).connect(sfxBus); s.start();
      });
      return;
    }
    const th = activeTheme();
    setSfxFx(th);
    const sig = SIGNATURE[th] && SIGNATURE[th][name];
    const fl = FLAVOR[th];
    const fn = sig || (fl && fl[name]) || SYNTH[name];
    const kit = sig ? null : KIT[th] || KIT.fantasy;
    try { K = kit; P = sc.pitch * (kit ? Math.pow(2, kit.shift / 12) : 1); V = sc.vol; fn && fn(); } catch {} finally { P = 1; V = 1; K = null; OUT = null; }
  }

  /* =========================================================
   * 가챠포지 화면 연결
   * ========================================================= */
  let host = null, root = null, rootMO = null, vnMO = null, vnEl = null;
  const gfVisible = () => {
    if (!host || !host.isConnected || document.hidden) return false;
    const r = host.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  };
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

  let lastAff = null, lastAffAt = 0;
  const AFF = { fire: "hitFire", water: "hitWater", wind: "hitWind", earth: "hitEarth", light: "hitLight", dark: "hitDark" };

  function onAnim(e) {
    const n = e.animationName || "", t = e.target;
    if (n === "rvSigilIn") return play("charge", 400);
    if (n === "rvFlash") return play("flash", 300);
    if (n === "rvFlarePop") {
      const card = t.closest && t.closest(".rv-card");
      const r = card ? (card.classList.contains("r5") ? 5 : card.classList.contains("r4") ? 4 : 3) : 3;
      return play("reveal" + r, r === 5 ? 250 : 90);
    }
    if (n === "rvRays") return play("rays", 300);
    if (n === "hitShake") {
      const box = t.closest && t.closest(".cbt") || t.parentElement;
      const crit = box && box.querySelector && box.querySelector(".crit");
      if (crit) return play("crit", 80);
      if (lastAff && performance.now() - lastAffAt < 4000 && AFF[lastAff]) return play(AFF[lastAff], 80);
      return play("hit", 70);
    }
    if (n === "charged") return play("charged", 1200);
    if (n === "shieldPop") return play("shield", 200);
    if (n === "slash") return play("hit", 70);
    if (n === "auraUp") return play("heal", 400);
    if (n === "cbt-hero-in") return play("turn", 500);
    if (n === "gf-grid-in" || /^gf-tr-deal/.test(n)) return play("deal", 600);
    if (/^gf-pop-(from|lift|to)$/.test(n)) return play("popup", 300);
    if (/^gf-tr-(from|in|swap|turn)|^gf-view-swap$|^gf-(farm|modes)-cut$/.test(n)) return play("whoosh", 400);
    if (n === "lab-in" || n === "q-in" || n === "est-in") return play("popup", 400);
  }

  // 버튼 종류별 소리
  const hasA = (b, ...attrs) => attrs.some((a) => b.hasAttribute(a));
  const anyAttr = (b, re) => { for (const a of b.getAttributeNames()) if (re.test(a)) return true; return false; };
  function buttonSound(b) {
    const label = ((b.getAttribute("aria-label") || "") + " " + (b.textContent || "")).trim().toLowerCase().slice(0, 60);
    if (b.disabled || b.getAttribute("aria-disabled") === "true" || b.classList.contains("locked")) return "error";
    if (hasA(b, "data-pull") || b.classList.contains("pull")) return "pullPress";
    if (b.classList.contains("cbt-act") || hasA(b, "data-act")) {
      const m = /--aff:\s*var\(--([a-z]+)\)/.exec(b.getAttribute("style") || "");
      lastAff = m ? m[1] : null; lastAffAt = performance.now();
      return "skillSelect";
    }
    if (hasA(b, "data-start", "data-tower-fight", "data-foe-go", "data-tower-enter", "data-supply-go", "data-unit-go") || /출격|전투 시작|fight|sortie/.test(label)) return "sortie";
    if (anyAttr(b, /^data-(back|cancel|summon-back|back-roster)|-close$|-cancel$|-x$/) || /^(◀|←)|뒤로|닫기|취소|^back|close|cancel/.test(label)) return "back";
    if (anyAttr(b, /-buy$|^data-buy|shop/) || /구매|buy|purchase/.test(label)) return "coin";
    if (anyAttr(b, /^data-(wlevel|level|upgrade|enhance)/) || /강화|레벨 ?업|level ?up|upgrade|enhance/.test(label)) return "levelUp";
    if (anyAttr(b, /^data-gear|equip/) || /장착|equip/.test(label)) return "equip";
    if (anyAttr(b, /^data-vigor-use|potion/) || /물약|potion/.test(label)) return "potion";
    if (anyAttr(b, /^data-unlock/) || /해금|unlock/.test(label)) return "unlock";
    if (hasA(b, "data-del") || /삭제|delete|remove/.test(label)) return "delete";
    if (hasA(b, "data-auto", "data-keep") || b.getAttribute("role") === "switch" || (b.hasAttribute("aria-pressed") && !b.classList.contains("chip"))) return "toggle";
    if (b.classList.contains("chip") || anyAttr(b, /^data-(tab|cat|rar|filter)/) || b.getAttribute("role") === "tab") return "tab";
    if (anyAttr(b, /^data-vn-/)) return "page";
    if (anyAttr(b, /-ok$|^data-(go|new|upload|story-write|claim|retry|pre-retry|tower-retry)/) || /확인|수령|받기|^ok|confirm|claim|시작/.test(label)) return "confirm";
    return "click";
  }
  function onClick(e) {
    const path = e.composedPath ? e.composedPath() : [];
    const b = path.find((n) => n && n.getAttribute && (n.tagName === "BUTTON" || n.getAttribute("role") === "button"));
    if (b) return play(buttonSound(b), 45);
    if (path.some((n) => n && n.classList && (n.classList.contains("vn-stage") || n.classList.contains("vn-text")))) play("page", 120);
  }

  // 클래스가 새로 붙는 순간 (쓰러짐, 분노, 방어 깨짐 등)
  const CLASS_SOUNDS = { dead: ["ko", 200], enraged: ["enrage", 1500], broken: ["shieldBreak", 200], turned: ["flip", 60], "drop-ok": ["drop", 150], acting: ["turn", 500], "is-actor": ["turn", 500], confirming: ["popup", 300] };
  /* ---------- 재화 변화 (상단바 에테르·자금·활력) ---------- */
  const CUR = { aether: "[data-bar-aether]", funds: "[data-bar-funds]", vigor: "[data-bar-vigor]" };
  const CUR_SEL = Object.values(CUR).join(",");
  const curLast = {};
  const parseNum = (s) => {
    const t = String(s || "").replace(/,/g, "").trim().toLowerCase();
    const m = /^([\d.]+)\s*([km])?/.exec(t); if (!m) return null;
    return parseFloat(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1);
  };
  function readCurrencies(silent) {
    if (!root) return;
    for (const k in CUR) {
      const el = root.querySelector(CUR[k]); if (!el) continue;
      const v = parseNum(el.textContent); if (v == null) continue;
      const prev = curLast[k];
      curLast[k] = v;
      if (silent || prev == null || v === prev) continue;
      if (v > prev) play(k === "vigor" ? "vigorGain" : k, 350);
      else if (k !== "vigor") play("spend", 300);
    }
  }

  /* ---------- 보상 아이템 그림이 새로 뜰 때 종류별 획득음 ---------- */
  const REWARD_CTX = /reward|loot|gain|claim|drop|prize|bonus|got|result|rs-|ul-|gift|mail|supply|clear/i;
  function itemKind(src) {
    const f = (src.split("/").pop() || "").replace(/\?.*$/, "");
    if (/item-aether/.test(f)) return "aether";
    if (/item-glimmer/.test(f)) return "glimmer";
    if (/item-(funds|coin)/.test(f)) return "funds";
    if (/item-vigor/.test(f)) return "potion";
    if (/item-relic/.test(f)) return "relic";
    if (/item-(sigil|tenet|doctrine|mandate)/.test(f)) return "rune";
    if (/item-insight/.test(f)) return "insight";
    if (/item-(rank|unit)/.test(f)) return "reward";
    return "drop";
  }
  function inRewardContext(el) {
    for (let n = el, i = 0; n && i < 8; n = n.parentElement, i++) {
      const c = (n.className && n.className.baseVal === undefined ? n.className : "") + " " + (n.getAttribute && (n.getAttribute("data-screen") || "") || "");
      if (REWARD_CTX.test(c)) return true;
    }
    return false;
  }
  let rewardQueue = [], rewardTimer = 0;
  function queueReward(kind) {
    if (rewardQueue.length < cfg.rewardChain && !rewardQueue.includes(kind)) rewardQueue.push(kind);
    if (rewardTimer) return;
    rewardTimer = setTimeout(function next() {
      const k = rewardQueue.shift();
      if (k) { play(k, 0); rewardTimer = setTimeout(next, 170); } else rewardTimer = 0;
    }, 120);
  }

  function onMutations(list) {
    let structural = false, curChanged = false;
    for (const m of list) {
      if (m.type === "attributes") {
        const cl = m.target.classList; if (!cl) continue;
        const old = " " + (m.oldValue || "") + " ";
        for (const c in CLASS_SOUNDS) if (cl.contains(c) && old.indexOf(" " + c + " ") < 0) play(CLASS_SOUNDS[c][0], CLASS_SOUNDS[c][1]);
        continue;
      }
      const tg = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (tg && tg.matches && tg.matches(CUR_SEL)) { curChanged = true; continue; }
      if (!m.addedNodes.length) continue;
      structural = true;
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1 || !n.matches) continue;
        if (n.matches(".ul-reward") || n.querySelector(".ul-reward")) play("reward", 600);
        else if (n.matches(".gx-up") || n.querySelector(".gx-up")) play("levelUp", 600);
        const arts = n.matches("img.item-art") ? [n] : n.querySelectorAll ? n.querySelectorAll("img.item-art") : [];
        if (arts.length && arts.length <= 12) for (const img of arts) if (inRewardContext(img)) queueReward(itemKind(img.getAttribute("src") || ""));
        if (n.querySelector && n.querySelector(CUR_SEL)) curChanged = true;
      }
    }
    if (curChanged) readCurrencies(false);
    if (structural) scheduleStructural();
  }

  let structTimer = 0;
  function scheduleStructural() {
    if (structTimer) return;
    structTimer = setTimeout(() => { structTimer = 0; try { onStructural(); } catch {} }, 220);
  }
  let resultSeen = null;
  /* ---------- 가챠포지 상단바·전투 조작줄에 소리 아이콘 넣기 ---------- */
  const ICONS = {
    speaker: '<path d="M11 5 6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path class="gfs-waves" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    note: '<path d="M9 18V5l11-2v13" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2"/><circle class="gfs-waves" cx="17" cy="16" r="3" stroke="currentColor" stroke-width="2"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="gfs-waves" d="M11 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    gear: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path class="gfs-waves" d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  };
  const iconSvg = () => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${ICONS[cfg.iconStyle] || ICONS.speaker}</svg>`;
  // 우리 버튼에만 적용되는 스타일 (가챠포지·다른 확장 버튼엔 영향 없음)
  const gameSheet = ("adoptedStyleSheets" in Document.prototype && "replaceSync" in CSSStyleSheet.prototype) ? new CSSStyleSheet() : null;
  if (gameSheet) gameSheet.replaceSync(`button[data-gfs]:not(.icon-button){display:inline-flex;align-items:center;justify-content:center;padding:calc(var(--f,16px)*0.35) calc(var(--f,16px)*0.55)}
    button[data-gfs]:not(.icon-button) svg{display:block;width:calc(var(--f,16px)*1.3);height:calc(var(--f,16px)*1.3)}
    button[data-gfs].gfs-muted .gfs-waves{opacity:.25}`);
  let iconSig = "";
  function makeGameButton(kind, native) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = (native ? "icon-button " : "") + "gf-sound-btn";
    b.dataset.gfs = kind;                      // 다른 버튼과 구분하는 고유 표시
    b.setAttribute("aria-label", "소리 설정");
    b.title = "소리 설정" + (cfg.hotkey !== "off" ? ` (${cfg.hotkey.toUpperCase()})` : "");
    b.innerHTML = iconSvg();
    // 우리 클릭이 가챠포지나 다른 확장의 클릭 처리로 번지지 않게 막음
    const stop = (e) => { e.stopPropagation(); };
    b.addEventListener("pointerdown", stop);
    b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); unlock(); popOpen ? closePopup() : openPopup(); });
    return b;
  }
  function placeIn(container, kind, native, ref, atEnd) {
    // 이미 들어가 있으면 그대로 둠 → 다른 확장이 같은 줄에 버튼을 넣어도 서로 자리싸움(무한 재배치)을 하지 않음
    if (container.querySelector(`:scope > button[data-gfs="${kind}"]`)) return;
    const b = makeGameButton(kind, native);
    if (atEnd || !ref || ref.parentNode !== container) container.appendChild(b);
    else container.insertBefore(b, ref);
  }
  function ensureGameButtons(force) {
    if (!root) return;
    const sig = [cfg.openMode, cfg.iconTopbar, cfg.iconBattle, cfg.iconStyle, cfg.hotkey].join("|");
    if (force || sig !== iconSig) { root.querySelectorAll("button[data-gfs]").forEach((b) => b.remove()); iconSig = sig; }
    if (cfg.openMode === "floating") return;
    if (gameSheet && !root.adoptedStyleSheets.includes(gameSheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, gameSheet];
    for (const fsb of root.querySelectorAll(".gf-fs-bar")) {
      const box = fsb.parentElement; if (!box) continue;
      const native = fsb.classList.contains("icon-button");
      if (native) { // 상단바
        const settingsBtn = [...box.children].find((c) => c.getAttribute && /settings/i.test(c.getAttribute("aria-label") || ""));
        if (cfg.iconTopbar === "end") placeIn(box, "top", true, null, true);
        else placeIn(box, "top", true, cfg.iconTopbar === "beforeSettings" && settingsBtn ? settingsBtn : fsb, false);
      } else if (cfg.iconBattle) { // 전투 조작줄
        placeIn(box, "battle", false, fsb, false);
      }
    }
    const muted = !cfg.sfxOn && !cfg.bgmOn;
    root.querySelectorAll("button[data-gfs]").forEach((b) => b.classList.toggle("gfs-muted", muted));
  }

  function onStructural() {
    ensureGameButtons();
    watchVn();
    const res = root && root.querySelector('[data-screen="result"] .rs-verdict h2');
    if (res && res !== resultSeen) {
      resultSeen = res;
      const win = /victory|승리/i.test(res.textContent || "");
      setTimeout(() => play(win ? "victory" : "defeat", 1500), 120);
      if (win) setTimeout(() => { if (root && root.querySelector('[data-screen="result"] [class*="reward"], [data-screen="result"] .ul-reward')) play("reward", 1500); }, 1400);
    } else if (!res) resultSeen = null;
    syncBgm();
  }

  function watchVn() {
    const el = root && root.querySelector(".vn-text");
    if (el === vnEl) return;
    vnMO && vnMO.disconnect(); vnMO = null; vnEl = el;
    if (!el) return;
    let lastLen = (el.textContent || "").length, doneTimer = 0;
    vnMO = new MutationObserver(() => {
      const len = (el.textContent || "").length;
      if (len > lastLen) play("tick", cfg.typingGap);
      lastLen = len;
      clearTimeout(doneTimer);
      doneTimer = setTimeout(() => analyzeLine(el), 700); // 한 줄이 다 찍힌 뒤 분위기 분석
    });
    vnMO.observe(el, { childList: true, characterData: true, subtree: true });
    analyzeLine(el);
  }

  // 최적화: 가챠포지가 안 보이면 화면 감시를 멈추고, 다시 보이면 이어서 감시
  let observing = false;
  const MO_OPTS = { childList: true, subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true };
  function observeRoot() { if (rootMO && root && !observing) { rootMO.observe(root, MO_OPTS); observing = true; } }
  function pauseWatch() {
    if (!observing) return;
    rootMO && rootMO.disconnect(); observing = false;
    vnMO && vnMO.disconnect(); vnMO = null; vnEl = null;
  }
  function resumeWatch() {
    if (observing || !root) return;
    observeRoot(); readCurrencies(true); onStructural();
  }
  function attach(h) {
    detach();
    host = h; root = h.shadowRoot;
    if (!root) return;
    root.addEventListener("animationstart", onAnim, true);
    root.addEventListener("click", onClick, true);
    rootMO = new MutationObserver(onMutations);
    observeRoot();
    readCurrencies(true);
    onStructural();
    ensureGameButtons();
  }
  function detach() {
    if (root) { root.removeEventListener("animationstart", onAnim, true); root.removeEventListener("click", onClick, true); }
    rootMO && rootMO.disconnect(); rootMO = null; observing = false;
    vnMO && vnMO.disconnect(); vnMO = null; vnEl = null;
    host = null; root = null;
  }
  // 가벼운 탐색: 일반 DOM은 live 컬렉션으로 바로, 못 찾을 때만 섀도 DOM까지 (10초에 한 번)
  const liveHosts = document.getElementsByTagName(HOST_TAG.toLowerCase());
  let lastDeepScan = 0;
  function findHost() {
    if (liveHosts.length) return liveHosts[0];
    const now = performance.now();
    if (now - lastDeepScan < 10000) return null;
    lastDeepScan = now;
    const walk = (node) => {
      for (const el of node.querySelectorAll("*")) {
        if (el.tagName === HOST_TAG) return el;
        if (el.shadowRoot) { const f = walk(el.shadowRoot); if (f) return f; }
      }
      return null;
    };
    try { return walk(document); } catch { return null; }
  }

  /* =========================================================
   * 스토리 분위기 감지 + 장르(테마) 자동 감지
   * ========================================================= */
  const LEX = {
    tense: ["긴장", "위험", "칼날", "칼을", "검을", "비명", "습격", "적이", "적들", "쫓", "도망", "위협", "싸움", "공격", "폭발", "함정", "살기", "경계", "괴물", "마물", "포효", "다급", "서둘러", "막아", "피해", "숨을 죽", "승급 시험", "대련", "결계", "danger", "attack", "enemy", "threat", "fight", "monster"],
    sad: ["눈물", "울었", "울고", "울음", "흐느", "슬픔", "슬프", "이별", "상실", "장례", "무덤", "그리움", "그리워", "외로", "아프", "후회", "미안해", "떠나", "잃었", "잃은", "죽음", "쓸쓸", "공허", "tears", "cried", "grief", "loss", "lonely", "farewell"],
    romance: ["설레", "두근", "심장이", "붉어", "붉게", "볼을", "귓가", "귀가 빨", "달아올", "손을 잡", "손끝", "손등", "이마에", "입맞", "키스", "포옹", "안아", "품에", "다정", "사랑", "좋아해", "데이트", "속눈썹", "숨결", "가까이", "시선을 피", "낮게 웃", "blush", "kiss", "embrace", "heartbeat", "love"],
    mystery: ["비밀", "수수께끼", "신비", "고대", "유적", "봉인", "의식", "속삭", "안개", "기묘", "낯선", "룬", "문양", "시길", "예언", "환영", "장막", "차원", "천문탑", "동쪽 날개", "점술", "secret", "ancient", "ritual", "mist", "strange", "rune", "prophecy"],
    happy: ["웃음", "웃었", "웃으", "미소", "축제", "기쁨", "기뻐", "신나", "즐거", "맛있", "환호", "박수", "축하", "반짝", "햇살", "산뜻", "명랑", "laugh", "festival", "joy", "cheer", "celebrat"],
    comedy: ["허둥", "당황", "버럭", "엉뚱", "투덜", "얼빠", "헛기침", "화들짝", "데굴", "뻘쭘", "푸핫", "풉", "하하하", "ㅋㅋ", "와하하", "어이없", "황당", "삐죽", "꽥", "바보", "멍청", "꼬르륵", "넘어졌", "awkward", "oops"],
    dark: ["집착", "광기", "가둬", "가두", "놓아주지", "놓지 않", "영원히", "내 거", "내 것", "소유", "사슬", "목줄", "감금", "죽여", "질투", "소름", "서늘", "웃음기가 사라", "빛이 없", "눈이 어둡", "피가", "피를", "핏", "저주", "희생", "금기", "어둠 마법", "호문쿨루스", "강제", "결속", "obsess", "mine", "forever", "cage", "curse"],
    glitch: ["오류", "에러", "error", "버그", "bug", "지지직", "치직", "지직", "깜빡", "뒤틀", "일그러", "노이즈", "잡음", "시스템", "재부팅", "로딩", "null", "undefined", "▒", "█", "▓"],
  };
  const GENRE = {
    otome: ["공략", "호감도", "오토메", "마법사", "아카데미", "아르카눔", "사역마", "요정", "무도회", "영애", "황태자", "공작", "마기스터", "어뎁트", "이니시에이트", "사랑의 요정", "편지가 도착"],
    hunter: ["헌터", "게이트", "던전", "각성", "길드", "마석", "s급", "a급", "레이드", "몬스터", "상태창", "협회", "균열", "브레이크", "랭커", "스탯"],
    daily: ["카페", "학교", "교실", "수업", "회사", "출근", "퇴근", "점심", "편의점", "산책", "방과후", "동아리", "알바", "아르바이트", "주말", "자취", "라면", "버스", "지하철"],
    fantasy: ["기사", "왕국", "드래곤", "용이", "모험", "엘프", "드워프", "마왕", "성검", "여관", "길드 의뢰", "영지", "성기사"],
    dark: ["좀비", "괴담", "살인", "시체", "폐가", "귀신", "악령", "실종", "피투성이", "공포", "의식의 제물"],
  };
  const MOOD_KEYS = Object.keys(LEX);
  const scores = Object.fromEntries(MOOD_KEYS.map((k) => [k, 0]));
  let storyMood = "calm", lastLine = "", lastMoodSwitch = 0, pendingMood = null, pendingCount = 0, lastStoryAt = 0;
  const genreScore = Object.fromEntries(Object.keys(GENRE).map((k) => [k, 0]));
  let guessedTheme = "fantasy", lastGenreScan = 0;

  const hits = (text, words) => { let n = 0; for (const w of words) if (w && text.includes(w)) n++; return n; };
  const wordCache = new Map();
  const userWords = (str) => {
    if (!str) return [];
    if (!wordCache.has(str)) wordCache.set(str, str.split(/[,\n]/).map((w) => w.trim().toLowerCase()).filter(Boolean));
    return wordCache.get(str);
  };
  let lastAnalysis = { line: "", at: 0 };
  const ZALGO = /[̀-ͯ҉]{2,}/;

  function detectGenre(force) {
    if (!root) return;
    const now = performance.now();
    if (!force && now - lastGenreScan < 20000) return;
    lastGenreScan = now;
    const text = (root.textContent || "").slice(0, 20000).toLowerCase();
    for (const g in GENRE) genreScore[g] = genreScore[g] * 0.7 + hits(text, GENRE[g]) + hits(text, userWords(cfg.genreKeywords[g])) * 2;
    let best = null, bs = 2.5;
    for (const g in genreScore) if (genreScore[g] > bs) { best = g; bs = genreScore[g]; }
    if (best && best !== guessedTheme) { guessedTheme = best; if (cfg.theme === "auto") { presetKey = null; syncBgm(); updateNowLabel(); try { applyThemeColors(); } catch {} } }
  }
  const activeTheme = () => (cfg.theme === "auto" ? guessedTheme : cfg.theme);

  function analyzeLine(el) {
    if (!el) return;
    const raw = el.textContent || "";
    const text = raw.toLowerCase();
    if (!text || text === lastLine) return;
    lastLine = text;
    // 대사 속 연출 신호 (시스템 알림, 호감도, 편지, 글리치)
    const trimmed = raw.trim();
    if (/편지가 도착|연락이 왔|통신 수정이|쪽지가|a letter/i.test(raw)) play("letter", 1500);
    else if (/^[\[【]/.test(trimmed) || /(좋아합니다|싫어합니다)\s*[\]】]/.test(raw)) play(/좋아합니다|호감|likes this/i.test(raw) ? "affection" : "notice", 800);
    const glitchy = ZALGO.test(raw) || /[▒█▓]{2,}|(.)\1{5,}/.test(raw) || /\b(error|null)\b|오류|지지직|치직/.test(text);
    if (glitchy) play("glitch", 1200);

    if (performance.now() - lastStoryAt > 60000) for (const k in scores) scores[k] = 0;
    lastStoryAt = performance.now();
    // 글리치는 순간 연출이라 금방 사라지고, 다른 분위기는 몇 줄에 걸쳐 쌓임
    for (const k of MOOD_KEYS) {
      const words = userWords(cfg.keywords[k]);
      scores[k] = scores[k] * (k === "glitch" ? 0.15 : 0.55) + Math.min(3, hits(text, LEX[k]) + hits(text, words) * 1.5);
      if (cfg.moodEnabled[k] === false) scores[k] = 0;
    }
    if (glitchy && cfg.moodEnabled.glitch !== false) scores.glitch += 2;
    lastAnalysis = { line: raw.trim().slice(0, 80), at: Date.now() };
    // 같은 줄에 설렘과 집착이 섞이면 어두운 쪽이 이김 (얀데레 장면)
    if (scores.dark > 0 && scores.romance > 0) scores.dark += 0.5;
    const sens = cfg.sensitivity || 1;
    let best = "calm", bestScore = 0.9 / sens;
    for (const k of MOOD_KEYS) if (scores[k] > bestScore) { best = k; bestScore = scores[k]; }
    detectGenre(false);
    if (best === storyMood) { pendingMood = null; pendingCount = 0; return; }
    if (best === pendingMood) pendingCount++; else { pendingMood = best; pendingCount = 1; }
    const strong = bestScore >= 2.2 / sens || best === "glitch";
    const hold = best === "glitch" ? 2500 : (strong ? 0.5 : 1) * cfg.minHold * 1000;
    if ((pendingCount >= 2 || strong) && performance.now() - lastMoodSwitch > hold) {
      storyMood = best; lastMoodSwitch = performance.now(); pendingMood = null; pendingCount = 0;
      syncBgm();
      // 글리치는 잠깐만: 다음 평범한 줄에서 빨리 원래대로
      if (best === "glitch") lastMoodSwitch -= 9000;
    }
  }

  // 여러 후보 중 하나라도 보이면 true (querySelector는 첫 번째만 봐서, 그게 숨겨져 있으면 놓침)
  const anyVis = (sel) => { for (const el of root.querySelectorAll(sel)) if (vis(el)) return true; return false; };
  // 전투 단서: 스킬 줄, 턴 순서·라운드, 적 지정(aim) 화면, Auto·배속 조작줄, 프리셋
  // (스토리 화면의 '자동 넘김' 버튼도 data-auto를 써서 그건 단서에서 뺌)
  const BATTLE_SEL = ".arena, [data-side-enemies], .cbt.enemy, .cbt-acts, .cbt-queue, [data-queue], [data-turn], .cbt-aim, .cbt-turn, .cbt-turn-slot, .cbt-presets, [data-speed]";
  function currentSituation() {
    if (!gfVisible() || !root) return cfg.bgmOutside && !document.hidden ? "lobby" : null;
    if (vis(root.querySelector(".reveal"))) return "summon";
    if (anyVis(BATTLE_SEL)) return "battle";
    if (vis(root.querySelector(".vn-text"))) return "story_" + (cfg.storyMoodMode === "auto" ? storyMood : cfg.storyMoodMode);
    return "lobby";
  }

  /* =========================================================
   * 배경음: 자동 생성 (상황별 프리셋)
   * ========================================================= */
  // 분위기별 기본 악곡 (코드 진행·빠르기·음 밀도)
  const BASE = {
    lobby:   { bpm: 84,  chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], pat: [0, 2, 1, 3, 2, 1, 3, 2], dens: 0.7, oct: 12, energy: 1 },
    summon:  { bpm: 90,  chords: [[62, 66, 69, 73], [64, 68, 71, 74], [62, 66, 69, 73], [64, 68, 71, 76]], pat: [0, 1, 2, 3, 2, 3, 1, 2], dens: 1, oct: 24, energy: 1 },
    battle:  { bpm: 132, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], pat: [0, 1, 2, 1, 0, 2, 1, 2], dens: 1, oct: 12, energy: 3 },
    calm:    { bpm: 68,  chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], pat: [0, 2, 3, 1], dens: 0.45, oct: 12, energy: 0 },
    happy:   { bpm: 112, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], pat: [0, 2, 1, 2, 0, 2, 1, 2], dens: 0.85, oct: 12, energy: 2 },
    comedy:  { bpm: 128, chords: [[60, 64, 67], [62, 65, 69], [64, 67, 71], [55, 59, 62]], pat: [0, 2, 0, 1, 2, 2, 1, 0], dens: 0.75, oct: 12, energy: 2, staccato: true },
    romance: { bpm: 72,  chords: [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 67]], pat: [0, 2, 3, 2, 1, 3], dens: 0.55, oct: 12, energy: 0 },
    sad:     { bpm: 60,  chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], pat: [0, 1, 2, 1], dens: 0.35, oct: 12, energy: 0 },
    tense:   { bpm: 110, chords: [[45, 48, 52], [46, 50, 53], [45, 48, 52], [44, 47, 52]], pat: [0, 0, 1, 0, 0, 2, 0, 1], dens: 1, oct: 12, energy: 2 },
    mystery: { bpm: 64,  chords: [[50, 53, 57, 64], [46, 50, 53, 57], [43, 46, 50, 52], [45, 49, 52, 55]], pat: [0, 3, 1, 2, 3, 0], dens: 0.5, oct: 24, energy: 0 },
    dark:    { bpm: 66,  chords: [[50, 53, 57], [49, 53, 56], [50, 53, 57], [46, 50, 53]], pat: [0, 2, 1, 2], dens: 0.4, oct: 24, energy: 1, minorBell: true },
    glitch:  { bpm: 96,  chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], pat: [0, 2, 1, 3, 2, 1, 3, 2], dens: 0.8, oct: 12, energy: 1, glitch: true },
  };
  // 장르별 악기·드럼 스타일
  const STYLE = {
    otome:   { tempo: 0.95, pad: "sine", cut: 1100, arp: { def: "musicbox", tense: "pluck", battle: "pluck", dark: "musicbox", comedy: "pluck" }, drums: { battle: "orch", tense: "pulse", happy: "bounce", comedy: "bounce", lobby: "soft" } },
    hunter:  { tempo: 1.08, pad: "sawtooth", cut: 1500, arp: { def: "square", calm: "epiano", romance: "epiano", sad: "epiano", mystery: "bell" }, drums: { battle: "battle", tense: "battle", lobby: "pulse", happy: "battle", comedy: "bounce", summon: "pulse", dark: "pulse" } },
    daily:   { tempo: 0.92, pad: "triangle", cut: 700, arp: { def: "epiano", comedy: "pluck", tense: "square", battle: "square" }, drums: { def: "lofi", sad: "none", mystery: "none", dark: "none", tense: "pulse", battle: "battle" } },
    fantasy: { tempo: 1, pad: "triangle", cut: 900, arp: { def: "pluck", mystery: "bell", summon: "bell", battle: "square", romance: "bell" }, drums: { battle: "orch", tense: "pulse", happy: "bounce", comedy: "bounce", lobby: "soft" } },
    dark:    { tempo: 0.9, pad: "sawtooth", cut: 600, arp: { def: "bell", battle: "square", tense: "square" }, drums: { battle: "battle", tense: "pulse", def: "none" } },
  };
  // 테마별 화성: 같은 곡이라도 테마마다 코드 색이 달라짐
  const minorize = (c) => c.map((m, i) => (i === 1 && c[1] - c[0] === 4 ? m - 1 : m));
  const CHORD_XFORM = {
    fantasy: (c) => c,
    otome: (c) => (c.length < 4 ? [...c, c[0] + 9] : c), // 6도를 더해 달콤하게
    daily: (c) => [...new Set([...c, c[0] + (c[1] - c[0] === 4 ? 11 : 10), c[0] + 14])].sort((a, b) => a - b).slice(0, 5), // 재즈풍 7·9화음
    hunter: (c) => minorize(c).map((m) => m - 2),
    dark: (c) => minorize(c).map((m) => m - 3),
  };
  // 테마별 리드 멜로디 악기
  const LEAD = {
    otome: { inst: "flute", dens: 0.5, oct: 12 },
    hunter: { inst: "lead", dens: 0.55, oct: 12 },
    daily: { inst: "epiano", dens: 0.4, oct: 12 },
    fantasy: { inst: "horn", dens: 0.45, oct: 0 },
    dark: { inst: "bell", dens: 0.25, oct: 12 },
  };
  function buildPreset(sit) {
    const mood = sit.startsWith("story_") ? sit.slice(6) : sit;
    const b = BASE[mood] || BASE.lobby;
    const st = STYLE[activeTheme()] || STYLE.fantasy;
    const drums = (st.drums[mood] !== undefined ? st.drums[mood] : st.drums.def) || (b.energy >= 3 ? "battle" : "none");
    let pad = st.pad, cut = st.cut;
    if (mood === "dark" || mood === "mystery") { cut = Math.min(cut, 700); }
    if (mood === "sad" || mood === "romance") pad = "sine";
    const p = { ...b, bpm: b.bpm * st.tempo * cfg.tempo, pad, cut, arp: st.arp[mood] || st.arp.def, drums };
    // 사용자가 고른 악기·드럼·밀도가 있으면 그걸로 덮어씀
    if (cfg.melody !== "auto") p.arp = cfg.melody;
    if (cfg.padInst !== "auto") p.pad = cfg.padInst;
    if (cfg.drums !== "auto") p.drums = cfg.drums;
    p.dens = Math.min(1, b.dens * cfg.density * (cfg.lowPower ? 0.6 : 1));
    const th = activeTheme();
    p.theme = th;
    p.chords = b.chords.map(CHORD_XFORM[th] || CHORD_XFORM.fantasy);
    const ld = LEAD[th] || LEAD.fantasy;
    p.lead = cfg.lowPower || mood === "glitch" ? null : { ...ld, dens: Math.min(0.9, ld.dens * (b.energy >= 2 ? 1.25 : b.energy === 0 ? 0.65 : 1) * cfg.density) };
    if (cfg.leadInst === "none") p.lead = null;
    else if (cfg.leadInst !== "auto" && p.lead) p.lead.inst = cfg.leadInst;
    p.mood = mood;
    return p;
  }
  let seqTimer = 0, nextTime = 0, step = 0, preset = null, presetKey = null, padNodes = [];
  let introLeft = 0; // 곡이 시작·전환된 직후 몇 칸은 드럼 없이 → 처음부터 '둥!' 하고 터지지 않게

  function stopPad(at, fade = 0.8) {
    for (const p of padNodes) { try { p.g.gain.cancelScheduledValues(at); p.g.gain.setTargetAtTime(0.0001, at, fade); p.o.stop(at + fade * 5); } catch {} }
    padNodes = [];
  }
  function startPad(ch, at, beat) {
    if (preset.pad === "none") { stopPad(at); return; } // 배경 화음 없음
    stopPad(at);
    for (const m of ch) for (const det of cfg.lowPower ? [0] : [-7, 7]) {
      const o = ctx.createOscillator(); o.type = preset.pad; o.frequency.value = mtof(m - 12); o.detune.value = det + (preset.glitch ? (Math.random() - 0.5) * 60 : 0);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = preset.cut;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(preset.pad === "sawtooth" ? 0.015 : 0.026, at + beat * 1.5);
      o.connect(f).connect(g).connect(bgmBus);
      const s = ctx.createGain(); s.gain.value = 0.5; g.connect(s).connect(reverbIn);
      o.start(at); padNodes.push({ o, g });
    }
  }
  function fmNote(freq, at, len, vol, ratio, index, rev) {
    const g = ctx.createGain(); env(g, at, 0.004, vol, len);
    g.connect(bgmBus); const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(reverbIn);
    const car = ctx.createOscillator(); car.frequency.value = freq;
    const mod = ctx.createOscillator(); mod.frequency.value = freq * ratio;
    const mg = ctx.createGain(); mg.gain.setValueAtTime(freq * index, at); mg.gain.exponentialRampToValueAtTime(freq * 0.05, at + len);
    mod.connect(mg).connect(car.frequency); car.connect(g);
    car.start(at); mod.start(at); car.stop(at + len + 0.1); mod.stop(at + len + 0.1);
  }
  function bgmNote(type, freq, at, len, vol) {
    if (type === "bell") return fmNote(freq, at, len, vol, 3.5, 1.5, 0.7);
    if (type === "musicbox") return fmNote(freq * 2, at, Math.max(len, 0.6), vol * 0.9, 7.01, 0.8, 0.6);
    if (type === "epiano") { fmNote(freq, at, len * 1.4, vol, 1, 0.9, 0.35); return; }
    const g = ctx.createGain(); g.connect(bgmBus); const r = ctx.createGain(); r.gain.value = 0.45; g.connect(r).connect(reverbIn);
    const o = ctx.createOscillator(); const f = ctx.createBiquadFilter(); f.type = "lowpass";
    if (type === "pluck") { // 하프·피치카토 느낌
      o.type = "triangle"; o.frequency.value = freq; f.frequency.setValueAtTime(4000, at); f.frequency.exponentialRampToValueAtTime(600, at + 0.3);
      env(g, at, 0.003, vol * 1.3, Math.min(len, 0.5));
    } else {
      o.type = type; o.frequency.value = freq; f.frequency.value = type === "square" ? 2200 : 3500;
      env(g, at, 0.008, vol, len);
    }
    o.connect(f).connect(g); o.start(at); o.stop(at + len + 0.1);
  }
  function kick(at, v = 0.3) { v *= cfg.kick; if (v <= 0.003) return; const o = ctx.createOscillator(); o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.12); const g = ctx.createGain(); g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2); o.connect(g).connect(bgmBus); o.start(at); o.stop(at + 0.22); }
  function hat(at, v = 0.03, len = 0.04) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + len); s.connect(f).connect(g).connect(bgmBus); s.start(at, Math.random()); s.stop(at + len + 0.02); }
  function snare(at, v = 0.08, freq = 1800, len = 0.15) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; const g = ctx.createGain(); g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + len); s.connect(f).connect(g).connect(bgmBus); s.start(at, Math.random()); s.stop(at + len + 0.02); }
  function bass(m, at, len, v = 0.1) { const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = mtof(m); const g = ctx.createGain(); env(g, at, 0.005, v, len); o.connect(g).connect(bgmBus); o.start(at); o.stop(at + len + 0.05); }
  function timpani(m, at, v = 0.18) { v *= cfg.kick; if (v <= 0.003) return; const o = ctx.createOscillator(); o.frequency.setValueAtTime(mtof(m) * 1.5, at); o.frequency.exponentialRampToValueAtTime(mtof(m), at + 0.08); const g = ctx.createGain(); env(g, at, 0.004, v, 0.6); o.connect(g).connect(bgmBus); const r = ctx.createGain(); r.gain.value = 0.4; g.connect(r).connect(reverbIn); o.start(at); o.stop(at + 0.7); }

  // 리드 멜로디: 비브라토가 들어간 플루트·신스 리드·호른 등
  let leadPrev = null;
  function leadNote(inst, freq, at, len, vol) {
    if (inst === "epiano") return fmNote(freq, at, len * 1.3, vol * 1.1, 1, 0.9, 0.35);
    if (inst === "bell") return fmNote(freq, at, len * 2, vol * 0.9, 2.76, 1.6, 0.8);
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = inst === "lead" ? 6 : 5; lg.gain.value = freq * (inst === "horn" ? 0.003 : 0.006);
    lfo.connect(lg).connect(o.frequency);
    o.frequency.value = freq;
    if (inst === "flute") { o.type = "sine"; f.type = "lowpass"; f.frequency.value = 4000; }
    else if (inst === "lead") { o.type = "square"; f.type = "lowpass"; f.frequency.value = 2400; vol *= 0.45; }
    else { o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 1100; vol *= 0.6; } // horn
    const a = inst === "horn" ? 0.08 : 0.04;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + a);
    g.gain.setValueAtTime(vol, at + Math.max(a, len * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(f).connect(g).connect(bgmBus); const r = ctx.createGain(); r.gain.value = 0.5; g.connect(r).connect(reverbIn);
    o.start(at); lfo.start(at); o.stop(at + len + 0.05); lfo.stop(at + len + 0.05);
  }
  function crackle(at, dur) { // 레코드 잡음 툭툭
    for (let i = 0; i < 3; i++) if (Math.random() < 0.6) { const t = at + Math.random() * dur, s2 = ctx.createBufferSource(); s2.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2500; const g = ctx.createGain(); g.gain.setValueAtTime(0.02 + Math.random() * 0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.008); s2.connect(f).connect(g).connect(bgmBus); s2.start(t, Math.random()); s2.stop(t + 0.01); }
  }
  function scheduleStep(at) {
    const beat = 60 / preset.bpm, eighth = beat / 2;
    const ch = preset.chords[Math.floor(step / 16) % preset.chords.length];
    const s = step % 16;
    const swing = preset.drums === "lofi" && s % 2 ? eighth * 0.18 : 0;
    const t = at + swing;
    if (s === 0) startPad(ch, at, beat);
    // 글리치: 가끔 음이 끊기거나 튀거나 되감기듯 반복
    if (preset.glitch && Math.random() < 0.18) {
      const r = Math.random();
      if (r < 0.4) { for (let i = 0; i < 3; i++) bgmNote("square", mtof(ch[0] + 24 + Math.floor(Math.random() * 12)), t + i * 0.03, 0.03, 0.02); }
      else if (r < 0.7) snare(t, 0.06, 500 + Math.random() * 5000, 0.05);
      else { step++; return; } // 한 칸 통째로 끊김
    }
    if (preset.arp !== "none" && (Math.random() < preset.dens || s % 4 === 0)) {
      let m = ch[preset.pat[s % preset.pat.length] % ch.length] + preset.oct;
      if (preset.minorBell && Math.random() < 0.15) m += 1; // 살짝 어긋난 불협음
      const short = preset.staccato || preset.drums === "battle" || preset.drums === "pulse" || preset.drums === "orch";
      const len = short ? eighth * 0.8 : eighth * 2.6;
      const vol = { bell: 0.05, musicbox: 0.045, square: 0.022, pluck: 0.05, epiano: 0.05 }[preset.arp] || 0.04;
      bgmNote(preset.arp, mtof(m) * (preset.glitch && Math.random() < 0.1 ? 1.03 : 1), t, len, vol);
    }
    // 리드 멜로디
    if (preset.lead && (s % 4 === 0 || (s % 4 === 2 && Math.random() < 0.5)) && Math.random() < preset.lead.dens) {
      const tones = ch.map((m) => m + 12 + preset.lead.oct);
      let m = tones[Math.floor(Math.random() * tones.length)];
      if (leadPrev != null) { // 너무 크게 뛰지 않게 가까운 음으로
        const near = tones.slice().sort((x, y) => Math.abs(x - leadPrev) - Math.abs(y - leadPrev));
        m = Math.random() < 0.7 ? near[Math.min(1, near.length - 1)] : near[0];
      }
      leadPrev = m;
      const len = (s % 4 === 0 ? beat * (Math.random() < 0.4 ? 2 : 1) : eighth) * 0.95;
      leadNote(preset.lead.inst, mtof(m), t, len, preset.theme === "dark" ? 0.035 : 0.045);
    }
    // 테마별 양념
    if (preset.theme === "otome" && s === 0) fmNote(mtof(ch[0] + 36), at, 1.4, 0.018, 7.01, 0.5, 0.8); // 마디 첫 박 '띵'
    if (preset.theme === "daily" && s % 4 === 0) crackle(at, beat * 2);
    if (introLeft <= 0 && preset.theme === "dark" && (s === 0 || s === 8) && /calm|mystery|dark|sad|lobby/.test(preset.mood)) { kick(at, 0.1); kick(at + beat * 0.45, 0.065); } // 심장 박동 (곡 시작 첫 마디엔 없음)
    if (preset.theme === "hunter" && (preset.drums === "battle" || preset.drums === "pulse")) hat(at + eighth / 2, 0.012, 0.025); // 16비트 하이햇
    if (introLeft > 0) { introLeft--; step++; return; } // 첫 마디는 멜로디·화음만 (위에서 이미 연주)
    switch (preset.drums) {
      case "battle": if (s % 2 === 0) bass(ch[0] - 24, at, beat * 0.8, 0.12); if (s % 4 === 0) kick(at); if (s % 8 === 4) snare(at); hat(at, s % 2 ? 0.02 : 0.035); break;
      case "orch": if (s % 4 === 0) timpani(ch[0] - 24, at, 0.2); if (s % 8 === 6) timpani(ch[0] - 17, at, 0.12); if (s % 2 === 0) bass(ch[0] - 24, at, beat * 0.7, 0.07); if (s % 4 === 2) snare(at, 0.03, 3000, 0.08); break;
      case "pulse": bass(ch[0] - 24, at, eighth * 0.7, 0.08); if (s % 8 === 0) kick(at, 0.25); if (s % 2) hat(at, 0.015); break;
      case "bounce": if (s % 4 === 0) { kick(at, 0.18); bass(ch[0] - 24, at, beat * 0.5, 0.09); } if (s % 4 === 2) { hat(at, 0.03, 0.06); bass(ch[2 % ch.length] - 24, at, beat * 0.4, 0.07); } break;
      case "soft": if (s % 8 === 0) bass(ch[0] - 24, at, beat * 3, 0.06); if (s % 4 === 2) hat(at, 0.008, 0.03); break;
      case "lofi":
        if (s % 8 === 0 || s === 11) kick(t, 0.16);
        if (s % 8 === 4) snare(t, 0.05, 1400, 0.2);
        if (s % 2 === 0) hat(t, 0.012, 0.03);
        if (s % 8 === 0) bass(ch[0] - 24, t, beat * 1.6, 0.07);
        if (s === 0) { const n = ctx.createBufferSource(); n.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 0.5; const g = ctx.createGain(); g.gain.value = 0.004; n.connect(f).connect(g).connect(bgmBus); n.start(at); n.stop(at + beat * 8); } // 레코드 잡음
        break;
    }
    step++;
  }
  let curKey = null;
  function startSynth(key) {
    if (!ctx) return;
    curKey = key;
    const pk = key + "|" + activeTheme();
    if (seqTimer && presetKey === pk) return;
    const changing = !!seqTimer;
    preset = buildPreset(key); presetKey = pk; step = 0; introLeft = 16;
    if (changing) { stopPad(ctx.currentTime, cfg.fade); nextTime = ctx.currentTime + Math.min(0.35, cfg.fade); return; }
    nextTime = ctx.currentTime + 0.1;
    seqTimer = setInterval(() => {
      if (!ctx || ctx.state !== "running") return;
      const e = 60 / preset.bpm / 2;
      if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // 탭이 잠시 멈췄다 돌아와도 몰아서 연주하지 않게
      while (nextTime < ctx.currentTime + 0.65) { scheduleStep(nextTime); nextTime += e; }
    }, 220);
    timers.add(seqTimer);
  }
  function stopSynth() {
    if (!seqTimer) return;
    clearInterval(seqTimer); timers.delete(seqTimer); seqTimer = 0; presetKey = null;
    if (ctx) stopPad(ctx.currentTime, 0.5);
  }

  /* ---------- 배경음: 내 파일 (상황별) ---------- */
  const fileTrack = { key: null, el: null, url: null, gain: null, node: null };
  async function playFile(sit) {
    if (fileTrack.key === sit) { if (fileTrack.el && fileTrack.el.paused) fileTrack.el.play().catch(() => {}); return true; }
    const rec = await idbGet("bgm:" + sit);
    if (!rec) return false;
    stopFile(cfg.fade + 0.2);
    const url = URL.createObjectURL(rec.blob);
    const el = new Audio(); el.src = url; el.loop = true; el.preload = "auto"; el.playsInline = true;
    const node = ctx.createMediaElementSource(el); const gain = ctx.createGain(); gain.gain.value = 0.0001;
    node.connect(gain).connect(bgmBus);
    Object.assign(fileTrack, { key: sit, el, url, gain, node });
    el.play().catch(() => {});
    gain.gain.setTargetAtTime(1, ctx.currentTime, cfg.fade);
    return true;
  }
  function stopFile(fade = 0.6) {
    if (!fileTrack.el) return;
    const { el, url, gain, node } = fileTrack;
    Object.assign(fileTrack, { key: null, el: null, url: null, gain: null, node: null });
    try { gain.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 3); } catch {}
    setTimeout(() => { try { el.pause(); node.disconnect(); } catch {} URL.revokeObjectURL(url); }, fade * 1000 + 200);
  }

  /* ---------- 상황에 맞춰 배경음 맞추기 ---------- */
  let currentSit = null, previewSit = null, battleLeaveAt = 0;
  async function syncBgm() {
    if (!host || !host.isConnected) { const h = findHost(); if (h && h !== host) attach(h); else if (!h && host) detach(); }
    if (host && root) { if (gfVisible()) resumeWatch(); else pauseWatch(); }
    if (previewSit) return; // 미리 듣는 중엔 건드리지 않음
    detectGenre(false);
    let sit = currentSituation();
    // 전투 중엔 화면이 잠깐 바뀌어도(스킬 고르기·적 지정·연출) 2초 동안은 전투 음악을 유지
    if (currentSit === "battle" && sit !== "battle" && sit !== "summon" && sit !== null) {
      if (!battleLeaveAt) battleLeaveAt = performance.now();
      if (performance.now() - battleLeaveAt < 2000) { sit = "battle"; setTimeout(() => syncBgm(), 2100); }
    } else battleLeaveAt = 0;
    currentSit = sit;
    updateNowLabel();
    const want = !!(sit && cfg.bgmOn && ctx && unlocked);
    if (ctx && performance.now() > duckUntil) bgmBus.gain.setTargetAtTime(want ? cfg.bgmVol * cfg.bgmVol : 0, ctx.currentTime, 0.5);
    if (!want) {
      if (bgmActive) { bgmActive = false; setTimeout(() => { if (!bgmActive && !previewSit) { stopSynth(); stopFile(); } }, 1500); }
      return;
    }
    bgmActive = true; touch();
    const mode = bgmMode(sit);
    if (mode === "off") { stopSynth(); stopFile(); return; }
    if (mode === "file" && customNames.has("bgm:" + sit)) { stopSynth(); await playFile(sit); return; }
    stopFile(); startSynth(sit);
  }
  every(() => { if (!document.hidden || bgmActive) syncBgm(); }, 4000);
  // 이 탭으로 돌아오면 다른 기기에서 바꾼 설정을 불러오고, 떠날 땐 대기 중인 설정을 바로 저장
  const onVis = () => { syncBgm(); if (document.hidden) { if (saveTimer) flush(); } else pullRemote(); };
  document.addEventListener("visibilitychange", onVis);
  later(() => document.removeEventListener("visibilitychange", onVis));

  /* =========================================================
   * 런처 버튼 + 커스텀 설정 팝업
   * ========================================================= */
  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
  const launcher = document.createElement("button");
  launcher.id = "gf-sound-launcher";
  launcher.type = "button";
  launcher.title = "가챠포지 소리 설정 (Alt+S)";
  launcher.setAttribute("aria-label", "가챠포지 소리");
  launcher.innerHTML = ICON;
  document.body.appendChild(launcher);
  later(() => launcher.remove());
  const LAUNCH_COLORS = { fantasy: ["rgba(16,21,31,.68)", "#F2C14E"], otome: ["rgba(238,111,160,.9)", "#FFFFFF"], hunter: ["rgba(7,12,20,.8)", "#22D3EE"], daily: ["rgba(255,251,244,.95)", "#E8964A"], dark: ["rgba(13,9,11,.85)", "#C2334D"] };
  function placeLauncher() {
    const size = cfg.launcherSize + "px", gx = 12 + (cfg.launcherOffsetX || 0) + "px", gy = 12 + (cfg.launcherOffsetY || 0) + "px";
    const pos = cfg.launcherPos;
    Object.assign(launcher.style, {
      position: "fixed", width: size, height: size, borderRadius: "50%", border: "0", padding: "0",
      background: LAUNCH_COLORS[activeTheme()][0], color: LAUNCH_COLORS[activeTheme()][1], placeItems: "center", cursor: "pointer",
      boxShadow: "0 4px 14px rgba(0,0,0,.25)",
      zIndex: "2147482000", opacity: String(cfg.launcherOpacity),
      top: pos[0] === "t" ? `calc(env(safe-area-inset-top) + ${gy})` : "auto",
      bottom: pos[0] === "b" ? `calc(env(safe-area-inset-bottom) + ${gy})` : "auto",
      right: pos[1] === "r" ? `calc(env(safe-area-inset-right) + ${gx})` : "auto",
      left: pos[1] === "l" ? `calc(env(safe-area-inset-left) + ${gx})` : "auto",
    });
    // 서랍이 숨긴 경우(display:none !important)는 건드리지 않음
    if (launcher.style.getPropertyPriority("display") !== "important") launcher.style.display = cfg.openMode === "icon" ? "none" : "grid";
  }
  placeLauncher();

  // 팝업은 <dialog>로 브라우저 최상위 레이어(top layer)에 띄움 → 가챠포지 전체 화면 위에도 보임
  const dlg = document.createElement("dialog");
  dlg.id = "gf-sound-dialog";
  dlg.setAttribute("role", "dialog");
  dlg.setAttribute("aria-label", "가챠포지 소리 설정");
  Object.assign(dlg.style, { padding: "0", margin: "0", border: "0", background: "transparent", width: "100vw", height: "100dvh", maxWidth: "100vw", maxHeight: "100dvh", inset: "0", overflow: "hidden", zIndex: "2147483600" });
  const dlgStyle = document.createElement("style");
  dlgStyle.textContent = "#gf-sound-dialog::backdrop{background:transparent}#gf-sound-dialog:not([open]){display:none}";
  document.head.appendChild(dlgStyle);
  const popHost = document.createElement("div");
  popHost.id = "gf-sound-popup";
  Object.assign(popHost.style, { width: "100%", height: "100%" });
  dlg.appendChild(popHost);
  document.body.appendChild(dlg);
  later(() => { try { dlg.open && dlg.close(); } catch {} dlg.remove(); dlgStyle.remove(); });
  const sr = popHost.attachShadow({ mode: "open" });

  /* ---------- 설정 값 읽기/쓰기 (경로: "groups.UI" 같은 형태) ---------- */
  const DEFAULT_TRUE_MAPS = new Set(["groups", "moodEnabled"]);
  function getCfg(path) {
    const [a, b] = path.split(".");
    if (b === undefined) return cfg[a];
    const v = (cfg[a] || {})[b];
    return v === undefined ? (DEFAULT_TRUE_MAPS.has(a) ? true : "") : v;
  }
  function setCfg(path, v) {
    const [a, b] = path.split(".");
    if (b === undefined) cfg[a] = v; else cfg[a] = { ...(cfg[a] || {}), [b]: v };
  }

  /* ---------- 작은 UI 조립 도구 ---------- */
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = {
    pct: (v) => Math.round(v * 100) + "%",
    x: (v) => Number(v).toFixed(2).replace(/0$/, "") + "×",
    ms: (v) => Math.round(v) + "ms",
    s: (v) => Number(v) + "초",
    sf: (v) => Number(v).toFixed(1) + "초",
    n: (v) => String(v),
    px: (v) => v + "px",
  };
  const range = (path, label, min, max, step, f = "pct", hint = "") => `
    <div class="ctl"><div class="ctl-top"><span>${label}</span><output data-out="${path}" data-fmt="${f}"></output></div>
      <input type="range" min="${min}" max="${max}" step="${step}" data-cfg="${path}" data-type="num">${hint ? `<small>${hint}</small>` : ""}</div>`;
  const toggle = (path, label, hint = "") => `
    <label class="ctl tg"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}</span><input type="checkbox" data-cfg="${path}" data-type="bool"><i></i></label>`;
  const select = (path, label, opts, hint = "") => `
    <div class="ctl sel"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}</span>
      <select data-cfg="${path}" data-type="str">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>`;
  const chips = (path, opts) => `<div class="chips">${opts.map(([v, l]) => `<button type="button" data-chip="${path}" data-val="${v}">${l}</button>`).join("")}</div>`;
  const textarea = (path, label, ph) => `<div class="ctl"><span class="lbl">${label}</span><textarea data-cfg="${path}" data-type="str" rows="2" placeholder="${esc(ph)}"></textarea></div>`;
  const card = (title, body, hint = "") => `<div class="card2"><h4>${title}</h4>${hint ? `<p class="hint">${hint}</p>` : ""}${body}</div>`;

  const INSTR = [["auto", "테마 따라"], ["none", "없음"], ["musicbox", "오르골"], ["bell", "종·크리스털"], ["pluck", "하프·피치카토"], ["epiano", "전자 피아노"], ["square", "8비트 신스"], ["sine", "부드러운 사인"], ["triangle", "플루트 같은 삼각파"]];
  const PADS = [["auto", "테마 따라"], ["none", "없음"], ["sine", "부드럽게"], ["triangle", "따뜻하게"], ["sawtooth", "선명하게(현악·신스)"]];
  const DRUMS = [["auto", "테마·상황 따라"], ["none", "없음"], ["soft", "잔잔한 박자"], ["lofi", "로파이"], ["orch", "오케스트라 팀파니"], ["battle", "배틀 드럼"], ["pulse", "긴박한 펄스"], ["bounce", "통통 튀는"]];
  const MOOD_HINT = { calm: "예: 차분, 고요, 잔잔", happy: "예: 소풍, 선물, 생일", comedy: "예: 꽈당, 엥?, 어버버", romance: "예: 손깍지, 고백, 두근", sad: "예: 작별, 흐느, 빈자리", tense: "예: 추격, 시험장, 결투", mystery: "예: 수정구, 장막, 계시", dark: "예: 독점, 가두다, 눈빛이 탁", glitch: "예: 화면이 멈, 문자 깨짐" };
  const GENRE_LABEL = { otome: "오토메·로판", hunter: "헌터·액션", daily: "일상·힐링", fantasy: "정통 판타지", dark: "다크·호러" };

  const soundRows = SOUND_LIST.map(([g, list]) => `
    <details class="grp"><summary><span>${g}</span><small>${list.length}개</small>
      <label class="mini-tg" title="이 그룹 전체 켜기/끄기"><input type="checkbox" data-cfg="groups.${g}" data-type="bool"><i></i></label></summary>
      ${list.map(([k, label]) => `
        <div class="snd" data-snd="${k}">
          <div class="snd-top"><label class="chk"><input type="checkbox" data-s="on"><span>${label}</span></label><button class="ib" data-play="${k}" title="미리 듣기">▶</button></div>
          <div class="snd-ctl"><span class="lab">볼륨</span><input type="range" min="0" max="1.5" step="0.05" data-s="vol"><span class="lab">음높이</span><input type="range" min="0.5" max="2" step="0.05" data-s="pitch"></div>
          <div class="snd-file"><em data-fname>기본 합성음</em><button class="sb" data-pick-sfx="${k}">내 파일</button><button class="sb ghost" data-clear-sfx="${k}">기본으로</button></div>
        </div>`).join("")}
    </details>`).join("");

  const sitRows = SITUATIONS.map(([k, label]) => `
    <div class="sit" data-sit="${k}">
      <div class="sit-top"><b>${label}</b>
        <select data-bgm-mode><option value="synth">자동 생성</option><option value="file">내 파일</option><option value="off">끄기</option></select>
        <button class="ib" data-play-bgm="${k}" title="12초 미리 듣기">▶</button></div>
      <div class="snd-file"><em data-fname>파일 없음</em><button class="sb" data-pick-bgm="${k}">파일 선택</button><button class="sb ghost" data-clear-bgm="${k}">✕</button></div>
    </div>`).join("");

  const TABS = [["basic", "기본"], ["sfx", "효과음"], ["bgm", "배경음"], ["mood", "분위기 감지"], ["view", "버튼·화면"], ["adv", "고급"]];
  const PANELS = {
    basic:
      card("볼륨", range("master", "전체 볼륨", 0, 1, 0.05) + toggle("sfxOn", "효과음 켜기") + range("sfxVol", "효과음 볼륨", 0, 1, 0.05) + toggle("bgmOn", "배경음 켜기") + range("bgmVol", "배경음 볼륨", 0, 1, 0.05)) +
      card("장르 테마 <small data-guess></small>", chips("theme", THEMES), "테마에 따라 배경음 악기와 버튼 소리가 바뀌어요. 자동은 화면 속 단어로 장르를 짐작해요.") +
      card("스토리 배경음 분위기", chips("storyMoodMode", [["auto", "자동 감지"], ...MOODS]), "자동 감지는 대사를 읽고 골라요. 세부 조절은 '분위기 감지' 탭에 있어요.") +
      card("어울림", toggle("duck", "효과음이 클 때 배경음 낮추기", "★5 공개·승리·레벨 업 같은 순간에 음악이 잠깐 비켜줘요") + range("duckAmount", "얼마나 낮출지", 0.1, 0.9, 0.05) + toggle("bgmOutside", "가챠포지 밖에서도 배경음", "다른 화면에서는 로비 음악이 계속 나와요")) +
      card("빠른 미리 듣기", `<div class="row-btns"><button class="sb" data-play="reveal5">★5 소환</button><button class="sb" data-play="crit">치명타</button><button class="sb" data-play="aether">에테르</button><button class="sb" data-play="affection">호감도</button><button class="sb" data-play="victory">승리</button></div>`),
    sfx:
      card("효과음 전체", range("boom", "둥 소리(저음 쿵) 세기", 0, 1.5, 0.05, "pct", "소환 공개·타격·출격 때 깔리는 저음이에요. 0%면 꺼져요") + range("reverb", "울림(리버브)", 0, 0.8, 0.02) + range("typingGap", "타자음 간격", 20, 150, 5, "ms", "숫자가 클수록 타자음이 드문드문 나요") + toggle("elemHits", "속성별 타격음", "불·물·바람·대지·빛·어둠 스킬마다 다른 타격음") + range("rewardChain", "보상 아이템 연속 재생", 1, 10, 1, "n", "보상 화면에서 최대 몇 종류까지 차례로 울릴지")) +
      card("소리별 설정", soundRows, "그룹 오른쪽 스위치로 묶음째 끌 수 있어요. 소리마다 볼륨·음높이·내 파일 교체가 돼요. 파일은 이 기기에만 저장돼요."),
    bgm:
      card("음악 스타일", range("tempo", "빠르기", 0.7, 1.4, 0.05, "x") + range("kick", "드럼 킥·팀파니 세기", 0, 1.5, 0.05, "pct", "배경음의 '둥둥' 박자 소리예요") + select("melody", "반주(아르페지오) 악기", INSTR, "화음을 쪼개 깔아주는 소리예요") + select("leadInst", "리드 멜로디 악기", [["auto", "테마 따라"], ["none", "없음"], ["flute", "플루트"], ["lead", "신스 리드"], ["epiano", "전자 피아노"], ["horn", "호른"], ["bell", "종"]], "위에서 노래하듯 흐르는 멜로디예요") + select("padInst", "배경 화음 음색", PADS) + select("drums", "드럼", DRUMS) + range("density", "음 밀도", 0.3, 1.5, 0.05, "x", "낮추면 여백이 많고 차분해져요") + range("fade", "곡 전환 페이드", 0.2, 4, 0.1, "sf")) +
      card("상황별 음악", sitRows, "상황마다 자동 생성·내 파일·끄기 중에 골라요. ▶는 12초 미리 듣기예요."),
    mood:
      card("감지 방식", range("sensitivity", "감도", 0.5, 2, 0.05, "x", "높이면 작은 단서에도 분위기가 바뀌어요") + range("minHold", "한 분위기 최소 유지 시간", 3, 60, 1, "s", "강한 장면은 이 시간의 절반만 지나도 바뀌어요")) +
      card("쓸 분위기", MOODS.filter(([k]) => k !== "calm").map(([k, l]) => toggle("moodEnabled." + k, l)).join(""), "끈 분위기는 자동 감지에서 고르지 않아요. 아무 분위기에도 안 맞으면 '평온'으로 돌아가요.") +
      card("분위기 단어 추가", MOODS.filter(([k]) => k !== "calm").map(([k, l]) => textarea("keywords." + k, l, MOOD_HINT[k])).join(""), "쉼표나 줄바꿈으로 구분해요. 내 세계관의 고유 단어(인물 이름, 장소, 주문 등)를 넣으면 더 잘 맞아요.") +
      card("장르 단어 추가", Object.keys(GENRE_LABEL).map((g) => textarea("genreKeywords." + g, GENRE_LABEL[g], "예: 세계관 고유 명사")).join(""), "테마 '자동'일 때 장르를 짐작하는 데 써요.") +
      card("지금 감지 상태", `<div class="meter" data-meter></div><p class="hint" data-lastline></p>`),
    view:
      card("여는 방법", chips("openMode", [["icon", "아이콘"], ["floating", "플로팅"], ["both", "둘 다"]]),
        "아이콘: 가챠포지 상단바와 전투 조작줄에 🔊이 들어가요. 플로팅: 화면 구석에 떠 있는 버튼으로 열어요(가챠포지 밖 화면에서도, 확장 서랍에도 담겨요).") +
      `<div data-show="icon">` + card("아이콘 설정",
        select("iconTopbar", "상단바 아이콘 위치", [["beforeFs", "전체 화면 아이콘 앞 (기본)"], ["beforeSettings", "게임 설정 아이콘 앞"], ["end", "맨 끝"]], "오른쪽 위 '월드·게임 설정·전체 화면' 아이콘 줄이에요") +
        toggle("iconBattle", "전투 조작줄에도 넣기", "Auto·배속·전체 화면 버튼 옆") +
        select("iconStyle", "아이콘 모양", [["speaker", "스피커"], ["note", "음표"], ["wave", "음파"], ["gear", "톱니"]]),
        "가챠포지 버튼과 같은 모양으로 들어가고, 전체 화면에서도 팝업이 열려요. 다른 확장이 같은 줄에 버튼을 넣어도 서로 밀어내지 않아요.") + `</div>` +
      `<div data-show="floating">` + card("플로팅 버튼 설정",
        select("launcherPos", "위치", [["br", "오른쪽 아래"], ["bl", "왼쪽 아래"], ["tr", "오른쪽 위"], ["tl", "왼쪽 위"]], "확장 서랍에 담겨 있으면 서랍이 우선이에요") +
        range("launcherOffsetX", "가로 간격", 0, 240, 4, "px", "다른 확장의 떠 있는 버튼과 겹치면 늘려요") + range("launcherOffsetY", "세로 간격", 0, 240, 4, "px") +
        range("launcherSize", "크기", 24, 52, 2, "px") + range("launcherOpacity", "불투명도", 0.2, 1, 0.05)) + `</div>` +
      card("단축키", select("hotkey", "설정 열기", [["alt+s", "Alt + S"], ["alt+m", "Alt + M"], ["ctrl+shift+s", "Ctrl + Shift + S"], ["off", "쓰지 않기"]], "다른 확장 단축키와 겹치면 바꾸거나 꺼요"), "Esc로 닫혀요."),
    adv:
      card("성능", toggle("lowPower", "저사양 모드", "울림 끄기, 음 밀도 낮추기, 화음 단순화") + range("sleepSec", "조용할 때 오디오 엔진 쉬기", 3, 60, 1, "s", "배경음이 꺼져 있을 때만 적용돼요")) +
      card("설정 백업", `<div class="row-btns"><button class="sb" data-act="export">설정 내보내기</button><button class="sb" data-act="import">설정 가져오기</button><button class="sb danger" data-act="reset">모두 초기화</button></div><p class="hint">내 소리 파일은 설정 파일에 들어가지 않아요(기기에 따로 저장).</p>`) +
      card("설정 저장", `<p class="hint" data-sync></p><div class="row-btns"><button class="sb" data-act="pull">다른 기기 설정 지금 불러오기</button></div>`) +
      card("정보", `<p class="hint" data-info></p>`),
  };

  sr.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .ov { position: fixed; inset: 0; background: var(--scrim); display: flex; align-items: center; justify-content: center; padding: 14px; font: 13px/1.45 system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: var(--fg); }
      .win { width: min(520px, 100%); height: min(86vh, 820px); display: flex; flex-direction: column; background: var(--win); border: 1px solid var(--ctl); border-radius: 18px; box-shadow: 0 24px 60px rgba(0,0,0,.55); overflow: hidden; }
      header { display: flex; align-items: center; gap: 8px; padding: 12px 14px 10px; }
      header h3 { margin: 0; font-size: 15px; flex: 1; letter-spacing: -.01em; }
      .now { font-size: 11px; color: var(--gold); background: var(--gold-bg); border-radius: 999px; padding: 3px 9px; white-space: nowrap; max-width: 55%; overflow: hidden; text-overflow: ellipsis; }
      .x { background: none; border: 0; color: var(--muted); font-size: 18px; cursor: pointer; padding: 2px 6px; }
      nav { display: flex; gap: 4px; padding: 0 10px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--ctl2); }
      nav::-webkit-scrollbar { display: none; }
      nav button { flex: 0 0 auto; background: none; color: var(--muted); border: 0; border-bottom: 2px solid transparent; padding: 9px 10px; cursor: pointer; font: inherit; }
      nav button[aria-selected="true"] { color: var(--fg-strong); border-bottom-color: var(--accent); font-weight: 600; }
      .body { overflow: auto; padding: 12px; background: var(--body); flex: 1; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
      section[hidden], [data-show][hidden] { display: none; }
      .card2 { background: var(--card); border: 1px solid var(--card-bd); border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }
      .card2 h4 { margin: 0 0 6px; font-size: 13px; }
      .card2 h4 small { color: var(--muted); font-weight: 400; }
      .hint { color: var(--muted); font-size: 11px; margin: 2px 0 8px; }
      .ctl { display: block; margin: 9px 0; }
      .ctl-top { display: flex; justify-content: space-between; align-items: baseline; }
      .ctl output { color: var(--gold); font-size: 12px; font-variant-numeric: tabular-nums; }
      .ctl small { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
      input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; margin: 10px 0 4px; border-radius: 999px; cursor: pointer;
        background: linear-gradient(to right, var(--accent) 0 var(--p, 50%), var(--ctl) var(--p, 50%) 100%); outline: none; }
      input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--win); border: 3px solid var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,.25); }
      input[type=range]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--win); border: 3px solid var(--accent); }
      input[type=range]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px var(--gold-bg); }
      .snd-ctl input[type=range] { margin: 6px 0; }
      .tg { display: flex; align-items: center; gap: 10px; cursor: pointer; }
      .tg > span { flex: 1; } .tg b { font-weight: 500; }
      .tg input, .mini-tg input { display: none; }
      .tg i, .mini-tg i { width: 36px; height: 20px; border-radius: 999px; background: var(--ctl); position: relative; flex: 0 0 auto; transition: background .15s; }
      .tg i::after, .mini-tg i::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--knob); transition: transform .15s, background .15s; }
      .tg input:checked + i, .mini-tg input:checked + i { background: var(--accent); }
      .tg input:checked + i::after, .mini-tg input:checked + i::after { transform: translateX(16px); background: #fff; }
      .mini-tg { display: inline-flex; margin-left: auto; } .mini-tg i { width: 30px; height: 17px; } .mini-tg i::after { width: 13px; height: 13px; } .mini-tg input:checked + i::after { transform: translateX(13px); }
      .sel { display: flex; align-items: center; gap: 10px; } .sel > span { flex: 1; } .sel b { font-weight: 500; }
      .lbl { display: block; margin-bottom: 3px; }
      select, textarea { background: var(--ctl2); color: var(--fg); border: 1px solid var(--ctl-bd); border-radius: 8px; padding: 5px 7px; font: inherit; font-size: 12px; }
      textarea { width: 100%; resize: vertical; min-height: 34px; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0; }
      .chips button { background: var(--ctl2); color: var(--fg); border: 0; border-radius: 999px; padding: 6px 11px; cursor: pointer; font: inherit; font-size: 12px; }
      .chips button[aria-pressed="true"] { background: var(--accent); color: var(--accent-fg); font-weight: 600; }
      .chips button:hover, .sb:hover, .ib:hover { filter: brightness(1.08); }
      .row-btns { display: flex; flex-wrap: wrap; gap: 6px; }
      .sb, .ib { background: var(--ctl); color: var(--fg); border: 0; border-radius: 7px; padding: 6px 10px; cursor: pointer; font: inherit; font-size: 12px; }
      .ib { padding: 4px 9px; } .ib.on { background: var(--accent); color: var(--accent-fg); }
      .sb.ghost { background: transparent; color: var(--muted); } .sb.danger { background: #3A2230; color: #FF9AA8; }
      .grp { border-top: 1px solid var(--ctl); padding: 2px 0; }
      .grp summary { cursor: pointer; padding: 8px 0; font-weight: 600; display: flex; align-items: center; gap: 6px; list-style: none; }
      .grp summary::-webkit-details-marker { display: none; }
      .grp summary::before { content: "▸"; color: var(--muted); transition: transform .15s; } .grp[open] summary::before { transform: rotate(90deg); }
      .grp summary small { color: var(--muted); font-weight: 400; }
      .snd, .sit { border-top: 1px dashed var(--ctl); padding: 8px 0; }
      .snd-top, .sit-top { display: flex; align-items: center; gap: 8px; } .sit-top b { flex: 1; font-weight: 500; }
      .chk { flex: 1; display: flex; align-items: center; gap: 6px; cursor: pointer; }
      .snd-ctl { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 6px; align-items: center; margin-top: 4px; }
      .lab { color: var(--muted); font-size: 11px; }
      .snd-file { display: flex; gap: 6px; align-items: center; margin-top: 5px; }
      .snd-file em { flex: 1; font-style: normal; color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .snd-file em.custom { color: var(--ok); }
      .meter { display: grid; grid-template-columns: 80px 1fr 34px; gap: 4px 8px; align-items: center; font-size: 12px; }
      .meter .bar { height: 7px; background: var(--ctl2); border-radius: 99px; overflow: hidden; }
      .meter .bar i { display: block; height: 100%; background: var(--accent); border-radius: 99px; transition: width .3s; }
      .meter .cur { color: var(--gold); font-weight: 600; }
      .meter span:nth-child(3n) { color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; }

      /* ---- 장르 테마별 색 ---- */
      .ov { --scrim: rgba(5,8,14,.58); --win: #111725; --body: #141B29; --card: #1A2232; --card-bd: #232C3E; --ctl: #2A3346; --ctl2: #222B3D; --ctl-bd: #2E384C;
            --fg: #E6EAF2; --fg-strong: #fff; --muted: #8D99AE; --knob: #AEB7C7; --accent: #F2603C; --accent-fg: #10151F; --gold: #F2C14E; --gold-bg: rgba(242,193,78,.12); --ok: #7BD389;
            --scroll: #3A4560; --scroll-h: #F2603C; --glow: 0 24px 60px rgba(0,0,0,.55); }
      .ov[data-theme="otome"] { --scrim: rgba(60,20,45,.35); --win: #FFF7FB; --body: #FDEFF5; --card: #FFFFFF; --card-bd: #F6D9E6; --ctl: #F7DCE8; --ctl2: #FBE6EF; --ctl-bd: #F0CADB;
            --fg: #4B2A3B; --fg-strong: #2E1424; --muted: #A6809A; --knob: #FFFFFF; --accent: #EE6FA0; --accent-fg: #FFFFFF; --gold: #C98A2E; --gold-bg: rgba(238,111,160,.12); --ok: #3FA66B;
            --scroll: #F2B8CF; --scroll-h: #EE6FA0; --glow: 0 24px 60px rgba(160,60,110,.25); }
      .ov[data-theme="hunter"] { --scrim: rgba(0,6,12,.6); --win: #070C14; --body: #0A1220; --card: #0E1828; --card-bd: #17304A; --ctl: #13263C; --ctl2: #0F2034; --ctl-bd: #1C3A5A;
            --fg: #D7F3FF; --fg-strong: #FFFFFF; --muted: #6E8FAA; --knob: #8FB3CC; --accent: #22D3EE; --accent-fg: #03121A; --gold: #7CF0FF; --gold-bg: rgba(34,211,238,.12); --ok: #4ADE80;
            --scroll: #1C3A5A; --scroll-h: #22D3EE; --glow: 0 0 0 1px rgba(34,211,238,.25), 0 24px 60px rgba(0,0,0,.6); }
      .ov[data-theme="daily"] { --scrim: rgba(40,30,20,.3); --win: #FFFBF4; --body: #F8F1E6; --card: #FFFFFF; --card-bd: #EADFCD; --ctl: #EFE5D6; --ctl2: #F4ECDF; --ctl-bd: #E3D5C0;
            --fg: #3F362C; --fg-strong: #241C14; --muted: #9A8B78; --knob: #FFFFFF; --accent: #E8964A; --accent-fg: #FFFFFF; --gold: #B9772F; --gold-bg: rgba(232,150,74,.13); --ok: #5A9E5F;
            --scroll: #DECDB4; --scroll-h: #E8964A; --glow: 0 24px 60px rgba(90,60,30,.22); }
      .ov[data-theme="fantasy"] { --accent: #F2603C; --gold: #F2C14E; }
      .ov[data-theme="dark"] { --scrim: rgba(0,0,0,.7); --win: #0D090B; --body: #120C10; --card: #1A1117; --card-bd: #2C1A24; --ctl: #2A1822; --ctl2: #21141B; --ctl-bd: #3A2230;
            --fg: #EBDCE2; --fg-strong: #FFF; --muted: #9A7F8B; --knob: #B79AA7; --accent: #C2334D; --accent-fg: #FFF2F4; --gold: #D9B98C; --gold-bg: rgba(194,51,77,.15); --ok: #8FBF7F;
            --scroll: #3A2230; --scroll-h: #C2334D; --glow: 0 0 40px rgba(194,51,77,.18), 0 24px 60px rgba(0,0,0,.7); }
      .win { box-shadow: var(--glow) !important; transition: background .25s, color .25s; }
      input[type=checkbox] { accent-color: var(--accent); }
      /* ---- 스크롤바 ---- */
      .body, textarea, nav { scrollbar-width: thin; scrollbar-color: var(--scroll) transparent; }
      .body::-webkit-scrollbar, textarea::-webkit-scrollbar { width: 10px; height: 10px; }
      .body::-webkit-scrollbar-track, textarea::-webkit-scrollbar-track { background: transparent; }
      .body::-webkit-scrollbar-thumb, textarea::-webkit-scrollbar-thumb { background: var(--scroll); border-radius: 999px; border: 3px solid var(--body); min-height: 40px; }
      textarea::-webkit-scrollbar-thumb { border-color: var(--ctl2); }
      .body::-webkit-scrollbar-thumb:hover, textarea::-webkit-scrollbar-thumb:hover { background: var(--scroll-h); }
      .body::-webkit-scrollbar-corner { background: transparent; }
    </style>
    <div class="ov">
      <div class="win" role="dialog" aria-label="가챠포지 소리 설정">
        <header><h3>🔊 가챠포지 소리</h3><span class="now" data-now>대기 중</span><button class="x" data-close aria-label="닫기">✕</button></header>
        <nav role="tablist">${TABS.map(([k, l], i) => `<button data-tab="${k}" aria-selected="${i === 0}">${l}</button>`).join("")}</nav>
        <div class="body">${TABS.map(([k], i) => `<section data-panel="${k}"${i ? " hidden" : ""}>${PANELS[k]}</section>`).join("")}</div>
      </div>
      <input type="file" accept="audio/*" hidden data-file>
      <input type="file" accept="application/json,.json" hidden data-import>
    </div>`;

  const $ = (q) => sr.querySelector(q);
  const $$ = (q) => sr.querySelectorAll(q);
  const fileInput = $("[data-file]");
  let pickTarget = null;

  function updateNowLabel() {
    const el = $("[data-now]"); if (!el) return;
    el.textContent = previewSit ? "미리 듣기 · " + SIT_LABEL[previewSit] : currentSit ? (SIT_LABEL[currentSit] || currentSit) + " · " + THEME_LABEL[activeTheme()] : "가챠포지 밖";
  }
  // 슬라이더 채워진 부분을 테마 색으로 칠함
  const paintRange = (el) => { const mn = +el.min, mx = +el.max, v = +el.value; el.style.setProperty("--p", ((v - mn) / (mx - mn || 1)) * 100 + "%"); };
  function syncOutputs() {
    $$("output[data-out]").forEach((o) => { o.textContent = fmt[o.dataset.fmt](getCfg(o.dataset.out)); });
    $$("input[type=range]").forEach(paintRange);
  }
  function syncUi() {
    $$("[data-cfg]").forEach((el) => {
      const v = getCfg(el.dataset.cfg);
      if (el.type === "checkbox") return;
      if (document.activeElement !== popHost || sr.activeElement !== el) el.value = v == null ? "" : String(v);
    });
    $$("[data-cfg][data-type='bool']").forEach((el) => { const v = getCfg(el.dataset.cfg); el.checked = v === true || (v === "" ? false : v !== false); });
    $$("[data-chip]").forEach((b) => b.setAttribute("aria-pressed", String(String(getCfg(b.dataset.chip)) === b.dataset.val)));
    $$("[data-show]").forEach((el) => { el.hidden = !(cfg.openMode === "both" || cfg.openMode === el.dataset.show); });
    const gs = $("[data-guess]"); if (gs) gs.textContent = cfg.theme === "auto" ? "· 지금 " + THEME_LABEL[guessedTheme] + "로 판단" : "";
    $$(".snd").forEach((row) => {
      const k = row.dataset.snd, sc = sCfg(k);
      row.querySelector('[data-s="on"]').checked = sc.on;
      row.querySelector('[data-s="vol"]').value = String(sc.vol);
      row.querySelector('[data-s="pitch"]').value = String(sc.pitch);
      const fn = customNames.get("sfx:" + k), em = row.querySelector("[data-fname]");
      em.textContent = fn || "기본 합성음"; em.classList.toggle("custom", !!fn);
    });
    $$(".sit").forEach((row) => {
      const k = row.dataset.sit;
      row.querySelector("[data-bgm-mode]").value = bgmMode(k);
      row.querySelector("[data-play-bgm]").classList.toggle("on", previewSit === k);
      const fn = customNames.get("bgm:" + k), em = row.querySelector("[data-fname]");
      em.textContent = fn || "파일 없음"; em.classList.toggle("custom", !!fn);
    });
    const info = $("[data-info]");
    const sy = $("[data-sync]");
    if (sy) sy.textContent = !api || !api.storage ? "이 기기에만 저장돼요." : remoteOk ? "✓ 마리나라 서버에 저장 중이에요. 다른 기기도 같은 설정을 써요." : "⚠ 지금 서버에 연결이 안 돼서 이 기기에만 저장 중이에요. 연결되면 바꾼 칸만 자동으로 올려요.";
    if (info) info.textContent = `효과음 ${SOUND_LIST.reduce((n, [, l]) => n + l.length, 0)}종 · 배경음 상황 ${SITUATIONS.length}가지 · 내 파일 ${customNames.size}개 · 오디오 ${ctx ? ctx.state : "꺼짐"} · 가챠포지 ${host ? "연결됨" : "찾는 중"}`;
    syncOutputs(); updateNowLabel(); applyThemeColors();
  }
  function applyThemeColors() {
    const th = activeTheme();
    const ov = $(".ov"); if (ov && ov.dataset.theme !== th) ov.dataset.theme = th;
    placeLauncher();
  }

  // 분위기 감지 실시간 표시 (탭이 열려 있을 때만 1초마다)
  function renderMeter() {
    const m = $("[data-meter]"); if (!m) return;
    const max = Math.max(3, ...MOOD_KEYS.map((k) => scores[k]));
    const cur = cfg.storyMoodMode === "auto" ? storyMood : cfg.storyMoodMode;
    m.innerHTML = [["calm", "평온"], ...MOODS.filter(([k]) => k !== "calm")].map(([k, l]) => {
      const v = k === "calm" ? 0 : scores[k] || 0;
      return `<span class="${k === cur ? "cur" : ""}">${k === cur ? "▶ " : ""}${l}</span><span class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></span><span>${v.toFixed(1)}</span>`;
    }).join("");
    const ll = $("[data-lastline]");
    if (ll) ll.textContent = lastAnalysis.line ? `마지막으로 읽은 대사: "${lastAnalysis.line}${lastAnalysis.line.length >= 80 ? "…" : ""}"` : "아직 읽은 대사가 없어요. 스토리를 진행하면 여기에 점수가 보여요.";
  }
  every(() => { if (popOpen && !$('[data-panel="mood"]').hidden) renderMeter(); }, 1000);

  let popOpen = false;
  function showDlg() {
    try { if (dlg.open) dlg.close(); dlg.showModal(); }
    catch { dlg.setAttribute("open", ""); Object.assign(dlg.style, { position: "fixed", display: "block" }); } // 아주 오래된 브라우저용
  }
  function openPopup() { unlock(); popOpen = true; showDlg(); syncUi(); renderMeter(); pullRemote(); }
  function closePopup() { popOpen = false; try { dlg.close(); } catch { dlg.removeAttribute("open"); } stopPreview(); }
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); closePopup(); }); // Esc
  // 팝업을 연 채로 전체 화면을 켜고 끄면 다시 맨 위로 올림
  const onFs = () => { if (popOpen) setTimeout(showDlg, 60); };
  document.addEventListener("fullscreenchange", onFs);
  document.addEventListener("webkitfullscreenchange", onFs);
  later(() => { document.removeEventListener("fullscreenchange", onFs); document.removeEventListener("webkitfullscreenchange", onFs); });
  launcher.addEventListener("click", (e) => { e.stopPropagation(); popOpen ? closePopup() : openPopup(); });
  $(".ov").addEventListener("pointerdown", (e) => { if (e.target === $(".ov")) closePopup(); });
  $("[data-close]").addEventListener("click", closePopup);
  const onKey = (e) => {
    if (popOpen && e.key === "Escape") return closePopup();
    const hk = cfg.hotkey;
    if (!hk || hk === "off" || e.repeat) return;
    const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing && !popOpen) return; // 글 쓰는 중엔 가로채지 않음
    const ok = hk === "alt+s" ? e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === "KeyS"
      : hk === "alt+m" ? e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === "KeyM"
      : hk === "ctrl+shift+s" ? (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.code === "KeyS" : false;
    if (ok) { e.preventDefault(); e.stopPropagation(); popOpen ? closePopup() : openPopup(); }
  };
  document.addEventListener("keydown", onKey);
  later(() => document.removeEventListener("keydown", onKey));

  // 배경음 미리 듣기 (가챠포지 밖에서도 들림)
  let previewTimer = 0;
  function stopPreview() {
    if (!previewSit) return;
    previewSit = null; clearTimeout(previewTimer);
    stopSynth(); stopFile(0.3);
    syncUi(); syncBgm();
  }
  async function previewBgm(sit) {
    unlock(); if (!ctx) return;
    if (previewSit === sit) return stopPreview();
    previewSit = sit; bgmActive = true; touch();
    bgmBus.gain.setTargetAtTime(Math.max(0.08, cfg.bgmVol * cfg.bgmVol), ctx.currentTime, 0.2);
    if (bgmMode(sit) === "file" && customNames.has("bgm:" + sit)) { stopSynth(); await playFile(sit); }
    else { stopFile(0.2); stopSynth(); startSynth(sit); }
    clearTimeout(previewTimer); previewTimer = setTimeout(stopPreview, 12000);
    syncUi();
  }
  // 설정을 바꿔도 곡을 처음부터 다시 시작하지 않고, 연주 중인 곡에 바로 반영(다음 음부터 새 설정)
  let refreshTimer = 0;
  function restartMusic() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (seqTimer && curKey) { preset = buildPreset(curKey); presetKey = curKey + "|" + activeTheme(); return; }
      if (previewSit) { const p = previewSit; previewSit = null; previewBgm(p); } else { presetKey = null; syncBgm(); }
    }, 120); // 슬라이더를 끄는 동안 수십 번 바뀌어도 한 번만 반영
  }

  // 설정 바뀔 때 엔진에 반영
  const MUSIC_KEYS = new Set(["tempo", "melody", "padInst", "drums", "leadInst", "density", "lowPower", "theme"]);
  function applyChange(path) {
    const top = path.split(".")[0];
    save(); applyVolumes(); syncOutputs();
    if (MUSIC_KEYS.has(top)) restartMusic();
    else if (top === "bgmOn" || top === "bgmVol" || top === "bgmOutside" || top === "storyMoodMode") {
      if (ctx && previewSit) bgmBus.gain.setTargetAtTime(cfg.bgmOn ? Math.max(0.08, cfg.bgmVol * cfg.bgmVol) : 0, ctx.currentTime, 0.05);
      else syncBgm();
    }
    if (top.startsWith("launcher")) placeLauncher();
    if (/^icon|^hotkey$|^sfxOn$|^bgmOn$|^openMode$/.test(top)) ensureGameButtons();
    if (top === "openMode") { placeLauncher(); syncUi(); }
    if (top === "theme") { detectGenre(true); setSfxFx(activeTheme()); syncUi(); }
    if (top === "keywords" || top === "genreKeywords") wordCache.clear();
  }

  const pick = (target) => { pickTarget = target; fileInput.value = ""; fileInput.click(); };
  sr.addEventListener("click", async (e) => {
    const t = e.target.closest ? e.target.closest("button") : null; if (!t) return;
    const d = t.dataset;
    if (d.tab) {
      $$("nav button").forEach((b) => b.setAttribute("aria-selected", String(b === t)));
      $$("section[data-panel]").forEach((s) => (s.hidden = s.dataset.panel !== d.tab));
      if (d.tab === "mood") renderMeter();
      $(".body").scrollTop = 0;
      return;
    }
    if (d.chip) { setCfg(d.chip, d.val); syncUi(); applyChange(d.chip); if (d.chip === "theme") play("confirm", 0, { force: true }); return; }
    if (d.play) { unlock(); setTimeout(() => play(d.play, 0, { force: true }), 30); return; }
    if (d.playBgm) return previewBgm(d.playBgm);
    if (d.pickSfx) return pick("sfx:" + d.pickSfx);
    if (d.pickBgm) return pick("bgm:" + d.pickBgm);
    if (d.clearSfx) { await idbDel("sfx:" + d.clearSfx); customNames.delete("sfx:" + d.clearSfx); sfxBuffers.delete(d.clearSfx); syncUi(); return; }
    if (d.clearBgm) {
      await idbDel("bgm:" + d.clearBgm); customNames.delete("bgm:" + d.clearBgm);
      if (fileTrack.key === d.clearBgm) stopFile();
      if (bgmMode(d.clearBgm) === "file") { cfg.bgm[d.clearBgm] = "synth"; save(); }
      syncUi(); syncBgm(); return;
    }
    if (d.act === "export") {
      const blob = new Blob([JSON.stringify({ kind: "gacha-forge-sound-settings", version: 4, cfg }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gacha-forge-sound-settings.json";
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return;
    }
    if (d.act === "pull") { await flush(); await pullRemote(); syncUi(); return; }
    if (d.act === "import") { const inp = $("[data-import]"); inp.value = ""; inp.click(); return; }
    if (d.act === "reset") {
      if (!confirm("소리 설정을 전부 처음으로 되돌릴까요? (내 소리 파일은 그대로 남아요)")) return;
      cfg = normalize(null); fullOverwrite = true; save(); applyVolumes(); placeLauncher(); restartMusic(); ensureGameButtons(); syncUi();
    }
  });
  sr.addEventListener("input", (e) => {
    const el = e.target;
    if (el.type === "range") paintRange(el);
    if (el.dataset.cfg) {
      const ty = el.dataset.type;
      const v = ty === "bool" ? el.checked : ty === "num" ? Number(el.value) : el.value;
      setCfg(el.dataset.cfg, v);
      if (ty === "str" && el.tagName === "TEXTAREA") { save(); wordCache.clear(); return; }
      applyChange(el.dataset.cfg);
      return;
    }
    if (el.dataset.s) {
      const k = el.closest(".snd").dataset.snd, sc = sCfg(k);
      sc[el.dataset.s] = el.type === "checkbox" ? el.checked : Number(el.value);
      cfg.sounds[k] = sc; save();
    }
  });
  sr.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.s && el.type === "range") { play(el.closest(".snd").dataset.snd, 0, { force: true }); return; }
    if (el.dataset.cfg === "sfxVol" || el.dataset.cfg === "reverb") { play("confirm", 0, { force: true }); return; }
    if (el.dataset.cfg === "boom") { play("hit", 0, { force: true }); return; } // 바꾼 둥 세기를 바로 들려줌
    if (el.hasAttribute("data-bgm-mode")) {
      const sit = el.closest(".sit").dataset.sit;
      cfg.bgm[sit] = el.value; save();
      if (el.value === "file" && !customNames.has("bgm:" + sit)) pick("bgm:" + sit);
      syncBgm();
    }
  });
  // 클릭이 그룹 접기/펴기로 번지지 않게
  $$(".mini-tg").forEach((l) => l.addEventListener("click", (e) => e.stopPropagation()));

  fileInput.addEventListener("change", async () => {
    const f = fileInput.files && fileInput.files[0]; if (!f || !pickTarget) return;
    const isBgm = pickTarget.startsWith("bgm:");
    const limit = isBgm ? 60 : 5;
    if (f.size > limit * 1024 * 1024) { alert(`${isBgm ? "배경음" : "효과음"} 파일은 ${limit}MB 이하로 넣어주세요.`); return; }
    try {
      await idbPut(pickTarget, { name: f.name, blob: f });
      customNames.set(pickTarget, f.name);
      if (!isBgm) { const k = pickTarget.slice(4); sfxBuffers.delete(k); setTimeout(() => play(k, 0, { force: true }), 50); }
      else { const sit = pickTarget.slice(4); cfg.bgm[sit] = "file"; save(); if (fileTrack.key === sit) stopFile(0.1); syncBgm(); }
    } catch { alert("이 기기에서는 파일을 저장하지 못했어요."); }
    syncUi();
  });
  $("[data-import]").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j || j.kind !== "gacha-forge-sound-settings" || !j.cfg) throw new Error();
      cfg = normalize(j.cfg); fullOverwrite = true;
      save(); applyVolumes(); placeLauncher(); restartMusic(); wordCache.clear(); syncUi();
    } catch { alert("가챠포지 소리 설정 파일이 아니에요."); }
  });

  /* =========================================================
   * 시작 / 정리
   * ========================================================= */
  // 다른 기기에서 바뀐 설정이 들어오면 소리·버튼·화면에 바로 반영
  onRemoteApplied = () => { applyVolumes(); placeLauncher(); ensureGameButtons(); restartMusic(); wordCache.clear(); if (popOpen) syncUi(); };
  updateSyncLabel = () => { if (popOpen) { const sy = $("[data-sync]"); if (sy) syncUi(); } };
  // 팝업을 열어 둔 동안엔 20초마다 다른 기기 변경 확인
  every(() => { if (popOpen && !document.hidden) pullRemote(); }, 20000);
  await loadCustomIndex().catch(() => {});
  syncUi();
  const h0 = findHost(); if (h0) attach(h0);

  function dispose() {
    if (saveTimer) flush(); // 저장 대기 중인 설정은 버리지 않고 바로 저장
    clearTimeout(structTimer); clearTimeout(previewTimer);
    for (const id of timers) clearInterval(id);
    stopSynth(); stopFile(0.1);
    try { root && root.querySelectorAll(".gf-sound-btn").forEach((b) => b.remove()); if (root && gameSheet) root.adoptedStyleSheets = root.adoptedStyleSheets.filter((x) => x !== gameSheet); } catch {}
    detach();
    for (const fn of cleanups.splice(0)) { try { fn(); } catch {} }
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    delete window[KEY];
  }
  window[KEY] = {
    dispose, open: openPopup,
    _last: () => [...lastPlay.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6).map((e) => e[0]),
    _tap: () => { ensureCtx(); const d = ctx.createMediaStreamDestination(); masterOut.connect(d); return d.stream; }, // 녹음·점검용
  };
  if (api && typeof api.onCleanup === "function") api.onCleanup(dispose);
})();
