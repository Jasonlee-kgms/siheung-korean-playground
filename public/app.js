// 2026 시흥 AI+X 미래교육 페스타 - Zone 2 국어 놀이터 스크립트
// [초고속 STT 보정 + 원터치 추천 단어 칩 + Gemini & 로컬 하이브리드 엔진]

// ==========================================
// [1] 사운드 시스템 (Web Audio API)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playTone(freq, type, duration, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) { console.warn(e); }
    }, delay * 1000);
  }
  correct() {
    this.init();
    this.playTone(523.25, 'sine', 0.15, 0);
    this.playTone(659.25, 'sine', 0.15, 0.1);
    this.playTone(783.99, 'sine', 0.25, 0.2);
  }
  wrong() {
    this.init();
    this.playTone(220, 'triangle', 0.25, 0);
    this.playTone(196, 'triangle', 0.35, 0.15);
  }
  tick() {
    this.init();
    this.playTone(800, 'sine', 0.05, 0);
  }
  fanfare() {
    this.init();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.playTone(freq, 'triangle', 0.3, i * 0.12);
    });
  }
  golden() {
    this.init();
    [659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      this.playTone(freq, 'sine', 0.3, i * 0.08);
    });
  }
}
const sfx = new SoundFX();

// ==========================================
// [2] 퀴즈 데이터셋
// ==========================================
const QUIZ_DATA = {
  elem: [
    {
      idiom: "일석이조",
      title: "학교 대청소 시간",
      textA: "오늘 교실 대청소를 하면서 바닥에 떨어진 지우개를 3개나 주웠다. 짝꿍한테 돌려주고 칭찬도 듣고 교실도 깨끗해졌으니 완전 일석이조다! 기분이 날아갈 것 같았다.",
      textB: "대청소 시간에 교실을 정돈하며 잃어버린 학용품을 발견했습니다. 환경이 쾌적해지고 친구를 도울 수 있어 일석이조의 유익함을 느낀 보람찬 하루였습니다.",
      humanChoice: "A",
      explanation: "A가 사람의 글입니다! '지우개 3개', '기분이 날아갈 것 같았다' 등 구체적인 경험과 자연스러운 감정이 살아있어요. B는 AI 특유의 훈화 말씀 같은 정형화된 표현입니다."
    },
    {
      idiom: "동문서답",
      title: "엄마와의 저녁 대화",
      textA: "질문의 본질을 벗어나 엉뚱하게 대답하는 태도를 동문서답이라고 합니다. 부모님의 질문에 엉뚱한 대답을 하면 가족 간 소통을 저해할 수 있으므로 주의해야 합니다.",
      textB: "엄마가 '오늘 학원 숙제 다 끝냈니?'라고 물어보셨는데 너무 찔려서 '오늘 급식에 돈가스 나왔는데 진짜 맛있었어!'라고 동문서답을 해버렸다. 등짝 맞을 뻔했다.",
      humanChoice: "B",
      explanation: "B가 사람의 글입니다! 숙제 질문에 돈가스 얘기를 꺼내며 '등짝 맞을 뻔했다'는 생생하고 유쾌한 현실 에피소드는 AI가 흉내 내기 어려운 인간만의 유머입니다."
    },
    {
      idiom: "작심삼일",
      title: "새해 줄넘기 운동 계획",
      textA: "새해를 맞아 매일 줄넘기 500개씩 하겠다고 다짐했다. 그런데 날씨가 너무 춥고 발목도 시려워서 딱 사흘째 되는 날 전기장판 속에 누워버렸다. 역시 작심삼일은 과학이다.",
      textB: "새해 목표로 규칙적인 줄넘기 운동을 설정하였으나, 결심이 오래가지 못하고 3일 만에 중단되는 작심삼일을 경험했습니다. 앞으로는 꾸준한 실천 의지가 필요합니다.",
      humanChoice: "A",
      explanation: "A가 사람의 글입니다! '전기장판 속에 누워버렸다', '작심삼일은 과학이다'라는 학생다운 현실적이고 재치 있는 표현이 돋보입니다."
    }
  ],
  middle: [
    {
      idiom: "온고지신",
      title: "AI 시대와 역사 공부",
      textA: "옛것을 익혀 새것을 안다는 온고지신처럼, AI 시대를 살아가는 우리는 과거의 고전 문학과 철학을 깊이 배워야 비로소 기술을 올바르게 이끄는 주인이 될 수 있습니다.",
      textB: "챗GPT로 옛날 역사 퀴즈를 풀다가 틀린 답이 나와서 황당했다. 책에서 읽었던 옛 역사를 내가 직접 알고 있어야 AI가 엉뚱한 거짓말을 할 때 바로잡을 수 있다는 걸 깨달았다. 온고지신이 따로 없다.",
      humanChoice: "B",
      explanation: "B가 사람의 글입니다! 직접 AI를 쓰면서 겪은 오류(환각 현상) 경험을 바탕으로 비판적 사고를 이끌어낸 생생한 학생의 성찰 글입니다. A는 전형적인 AI 논술문입니다."
    },
    {
      idiom: "역지사지",
      title: "모둠 과제와 친구의 사정",
      textA: "수행평가 모둠 과제에서 한 친구가 계속 연락을 안 받아서 엄청 화가 났다. 다음 날 따지려고 했는데 그 친구가 동생이 많이 아파서 병원에 다녀왔다고 했다. 내 입장만 생각했던 게 부끄러웠다. 역지사지는 참 어렵다.",
      textB: "상대방의 입장에서 생각해보는 역지사지의 태도는 협동 학습에서 갈등을 해결하는 핵심 요소입니다. 타인의 사정을 배려하지 않으면 원활한 소통을 이루기 어렵습니다.",
      humanChoice: "A",
      explanation: "A가 사람의 글입니다! 화가 났다가 진실을 알고 부끄러움을 느끼는 솔직한 심리 변화 묘사는 인간 고유의 감정선입니다."
    },
    {
      idiom: "다다익선",
      title: "동아리 축제 부스 준비",
      textA: "축제 부스에 쓸 사은품은 많을수록 좋다는 생각에 다다익선이라는 말처럼 기념품 수량을 넉넉하게 준비하여 참가자들에게 배부하였습니다.",
      textB: "축제 때 뽑기 상품으로 젤리를 준비했는데 친구들이 벌떼처럼 몰려와서 30분 만에 털렸다. '상품은 다다익선이라니까!'라며 담당 친구한테 잔소리를 퍼부었다. 내년엔 박스째로 사야겠다.",
      humanChoice: "B",
      explanation: "B가 사람의 글입니다! '벌떼처럼 몰려왔다', '30분 만에 털렸다', '잔소리를 퍼부었다' 같은 구체적 어휘와 생동감이 넘칩니다."
    }
  ]
};

// ==========================================
// [3] 게임 전역 상태
// ==========================================
const state = {
  mode: 'elem',
  totalScore: 0,
  stage1Score: 0,
  stage2Score: 0,
  scoreEntry: null,
  savingScore: false,
  
  // Gemini API
  geminiApiKey: localStorage.getItem('gemini_api_key') || '',
  forceLocal: localStorage.getItem('force_local') === 'true',
  isGeminiActive: false,

  // 고품질 보이스 엔진
  availableVoices: [],
  selectedVoiceURI: localStorage.getItem('selected_voice_uri') || '',
  speechSynth: window.speechSynthesis,

  // Stage 0
  cameraStream: null,
  ageRequest: null,
  cameraAttempt: 0,
  gameAttempt: 0,
  
  // Stage 1
  stage1Questions: [],
  currentQIndex: 0,
  quizOpen: false,
  qTimer: null,
  qTimeLeft: 35,
  
  // Stage 2
  battleTurn: 1,
  turnOpen: false,
  maxTurns: 5,
  targetChar: "시",
  usedWords: new Set(),
  bTimer: null,
  bTimeLeft: 10,
  chanceUsed: false,
  isListening: false,
  microphoneStarting: false,
  recognition: null,
  speechChoiceExtraMs: 0,
  turnStartTime: null,
  turnElapsedMs: 0,

  // 마이크 오디오 미터
  micStream: null,
  audioMeterCtx: null,
  analyser: null
};

// ==========================================
// [4] DOM 캐싱
// ==========================================
const dom = {
  viewHome: document.getElementById('view-home'),
  viewStage0: document.getElementById('view-stage0'),
  viewStage1: document.getElementById('view-stage1'),
  viewStage2: document.getElementById('view-stage2'),
  viewResult: document.getElementById('view-result'),
  viewLeaderboard: document.getElementById('view-leaderboard'),
  
  totalScoreDisplay: document.getElementById('total-score'),
  stageBadge: document.getElementById('stage-badge'),
  aiEngineStatus: document.getElementById('ai-engine-status'),
  btnConfig: document.getElementById('btn-config'),
  btnSound: document.getElementById('btn-sound'),
  btnHome: document.getElementById('btn-home'),

  // Stage 0
  videoFeed: document.getElementById('webcam-video'),
  canvasFeed: document.getElementById('webcam-canvas'),
  scanLaser: document.getElementById('scan-laser-line'),
  btnCaptureScan: document.getElementById('btn-capture-scan'),
  btnSkipScan: document.getElementById('btn-skip-scan'),
  scanResultCard: document.getElementById('scan-result-card'),
  scanAgeTitle: document.getElementById('scan-age-title'),
  scanGreetingText: document.getElementById('scan-greeting-text'),
  scanNotice: document.getElementById('scan-notice'),
  cameraStatus: document.getElementById('camera-status'),
  viewfinder: document.getElementById('camera-viewfinder'),
  btnRetryCamera: document.getElementById('btn-retry-camera'),
  btnConfirmAge: document.getElementById('btn-confirm-age'),
  btnToggleModeManual: document.getElementById('btn-toggle-mode-manual'),
  
  // Stage 1
  qTimerBar: document.getElementById('quiz-timer-bar'),
  qNumber: document.getElementById('quiz-number'),
  qIdiomTag: document.getElementById('quiz-idiom-tag'),
  qCardA: document.getElementById('card-a'),
  qCardB: document.getElementById('card-b'),
  qTextA: document.getElementById('card-text-a'),
  qTextB: document.getElementById('card-text-b'),
  qFeedback: document.getElementById('quiz-feedback'),
  qFeedbackTitle: document.getElementById('feedback-title'),
  qFeedbackDesc: document.getElementById('feedback-desc'),
  btnNextQuiz: document.getElementById('btn-next-quiz'),
  
  // Stage 2
  bTimerBar: document.getElementById('battle-timer-bar'),
  bTurnDisplay: document.getElementById('battle-turn-text'),
  bTimeDisplay: document.getElementById('battle-time-text'),
  targetCharBadge: document.getElementById('target-char'),
  targetVariantsText: document.getElementById('target-variants'),
  aiSpeechText: document.getElementById('ai-speech-text'),
  aiAvatarContainer: document.getElementById('ai-avatar-container'),
  btnMic: document.getElementById('btn-mic'),
  micStatusText: document.getElementById('mic-status-text'),
  speechLiveText: document.getElementById('speech-live-text'),
  micMeterFill: document.getElementById('mic-meter-fill'),
  speechChoices: document.getElementById('speech-choices'),
  speechChoiceButtons: document.getElementById('speech-choice-buttons'),
  btnChance: document.getElementById('btn-chance'),
  btnTextFallback: document.getElementById('btn-text-fallback'),
  micTroubleHint: document.getElementById('mic-trouble-hint'),
  
  // 모달들
  configModal: document.getElementById('config-modal'),
  geminiApiKeyInput: document.getElementById('gemini-api-key-input'),
  toggleForceLocal: document.getElementById('toggle-force-local'),
  voiceSelectDropdown: document.getElementById('voice-select-dropdown'),
  btnTestVoice: document.getElementById('btn-test-voice'),
  btnSaveConfig: document.getElementById('btn-save-config'),
  btnCloseConfig: document.getElementById('btn-close-config'),

  textModal: document.getElementById('text-input-modal'),
  textModalInput: document.getElementById('text-modal-input'),
  btnSubmitText: document.getElementById('btn-submit-text'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  
  // 결과 & 랭킹
  finalScoreDisplay: document.getElementById('final-score-val'),
  resScoreStage1: document.getElementById('res-score-s1'),
  resScoreStage2: document.getElementById('res-score-s2'),
  tierBadgeDisplay: document.getElementById('tier-badge-text'),
  nicknameInput: document.getElementById('nickname-input'),
  btnSaveRank: document.getElementById('btn-save-rank'),
  rankSaveStatus: document.getElementById('rank-save-status'),
  rankingStatus: document.getElementById('game-ranking-status'),
  btnRestart: document.getElementById('btn-restart'),
  rankingTableBody: document.getElementById('ranking-table-body'),
  btnLeaderboardBack: document.getElementById('btn-lb-back'),
  confettiCanvas: document.getElementById('confetti-canvas')
};

// ==========================================
// [5] 고품질 음성 합성 (Natural TTS)
// ==========================================
function populateVoiceList() {
  if (!state.speechSynth) return;
  const allVoices = state.speechSynth.getVoices();
  const koVoices = allVoices.filter(v => v.lang.includes('ko') || v.lang.includes('KR'));
  state.availableVoices = koVoices.length > 0 ? koVoices : allVoices;

  if (dom.voiceSelectDropdown) {
    dom.voiceSelectDropdown.innerHTML = "";
    state.availableVoices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = v.name;
      if (v.voiceURI === state.selectedVoiceURI) opt.selected = true;
      dom.voiceSelectDropdown.appendChild(opt);
    });
  }

  if (!state.selectedVoiceURI && state.availableVoices.length > 0) {
    const bestVoice = state.availableVoices.find(v => 
      v.name.includes('SunHi') || v.name.includes('Natural') || v.name.includes('Online')
    ) || state.availableVoices.find(v => v.name.includes('Google')) || state.availableVoices[0];
    
    if (bestVoice) {
      state.selectedVoiceURI = bestVoice.voiceURI;
      if (dom.voiceSelectDropdown) dom.voiceSelectDropdown.value = bestVoice.voiceURI;
    }
  }
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = populateVoiceList;
  populateVoiceList();
}

function speakAI(text, onEnd = null) {
  if (!state.speechSynth) {
    if (onEnd) onEnd();
    return;
  }
  state.speechSynth.cancel();

  const cleanText = text.replace(/["']/g, '').replace(/(\b\w+다)!/g, '$1.');
  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = 'ko-KR';

  if (state.selectedVoiceURI) {
    const matched = state.availableVoices.find(v => v.voiceURI === state.selectedVoiceURI);
    if (matched) utter.voice = matched;
  }

  utter.rate = 1.0;
  utter.pitch = 1.0;

  if (onEnd) {
    const attempt = state.gameAttempt;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      if (attempt === state.gameAttempt) onEnd();
    };
    const fallback = setTimeout(finish, Math.max(2400, cleanText.length * 130));
    utter.onend = finish;
    utter.onerror = finish;
  }
  state.speechSynth.speak(utter);
}

// ==========================================
// [6] AI 캐릭터 SVG 렌더러
// ==========================================
function setCharacterMood(mood = 'idle') {
  dom.aiAvatarContainer.dataset.mood = mood;
}

function triggerConfetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = dom.confettiCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  
  const pieces = [];
  const colors = ['#ffce57', '#263eb2', '#ffb8c7', '#80bda0'];
  for (let i = 0; i < 36; i++) {
    pieces.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 18 - 4,
      size: Math.random() * 9 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      vRot: Math.random() * 10 - 5
    });
  }
  
  let frame = 0;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45;
      p.rot += p.vRot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    frame++;
    if (frame < 75) requestAnimationFrame(update);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  update();
}

function showView(viewElement) {
  if (viewElement !== dom.viewResult) clearTimeout(victoryDanceTimer);
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  viewElement.classList.add('active');
  document.getElementById('game-status').hidden = viewElement === dom.viewHome || viewElement === dom.viewLeaderboard;
  dom.btnHome.hidden = viewElement === dom.viewHome;
  viewElement.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// ==========================================
// [7] Gemini API
// ==========================================
function updateEngineStatus() {
  if (state.forceLocal || !state.geminiApiKey) {
    state.isGeminiActive = false;
    dom.aiEngineStatus.textContent = "현재 오프라인 모드";
  } else {
    state.isGeminiActive = true;
    dom.aiEngineStatus.textContent = "현재 Gemini 사용 모드";
  }
}

const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const ageErrorMessages = {
  missing_key: '사진을 찍었어요. 운영 설정에서 Gemini API 키를 저장하면 나이를 추정할 수 있어요.',
  offline: '사진을 찍었어요. 운영 설정에서 오프라인 모드를 끄면 나이를 추정할 수 있어요.',
  key_rejected: '사진을 찍었어요. Gemini API 키 또는 프로젝트 권한을 운영 설정에서 확인해 주세요.',
  rate_limit: '사진을 찍었어요. Gemini 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.',
  timeout: '사진을 찍었어요. Gemini 응답이 늦어지고 있어요. 다시 시도하거나 난이도를 직접 골라 주세요.',
  no_face: '사진에서 얼굴을 뚜렷하게 확인하기 어려워요. 얼굴을 화면 가운데에 두고 다시 찍어 주세요.',
  bad_response: '사진을 찍었어요. Gemini가 나이 추정 결과를 돌려주지 않았어요. 다시 시도하거나 난이도를 직접 골라 주세요.',
  connection: '사진을 찍었어요. Gemini에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.'
};

async function analyzeAgeWithGemini(base64Image, signal) {
  if (state.forceLocal) return { error: 'offline' };
  if (!state.geminiApiKey) return { error: 'missing_key' };
  const prompt = '얼굴이 한 명이고 뚜렷하면 사진 속 대략적인 나이를 정수 age로 답하세요. 얼굴이 없거나 가려졌거나 여러 명이면 age를 0으로 답하세요.';

  const timeout = AbortSignal.timeout(18000);
  try {
    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': state.geminiApiKey },
      signal: AbortSignal.any([signal, timeout]),
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', required: ['age'], properties: { age: { type: 'INTEGER' } } },
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 429) return { error: 'rate_limit' };
      if ([401, 403].includes(response.status) || data?.error?.details?.some(detail => detail.reason === 'API_KEY_INVALID')) {
        return { error: 'key_rejected' };
      }
      return { error: 'bad_response' };
    }
    const rawText = data?.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('');
    let age;
    try { age = JSON.parse(rawText)?.age; } catch { return { error: 'bad_response' }; }
    if (age === 0) return { error: 'no_face' };
    if (!Number.isInteger(age) || age < 1 || age > 120) return { error: 'bad_response' };
    return { age, mode: age < 13 ? 'elem' : 'middle' };
  } catch {
    return { error: timeout.aborted ? 'timeout' : 'connection' };
  }
}

async function getGeminiWordReply(playerWord, lastChar) {
  if (!state.isGeminiActive) return null;
  const prompt = `당신은 2026 시흥 AI 페스타 부스의 '뽀랭이'입니다.
한국어 끝말잇기 게임을 진행 중입니다.
- 플레이어 단어: '${playerWord}'
- 이어받을 끝 글자: '${lastChar}' (두음법칙 변환 인정)
- 플레이어 모드: '${state.mode === 'elem' ? '초등학생' : '중학생'}'
규칙:
1. 반드시 '${lastChar}'(또는 두음법칙)로 시작하는 한국어 표준 명사 1개 제시.
2. 륨, 튬, 듐, 늼, 쁨 같은 한방 단어 절대 금지.
3. 재치 있는 1문장 대사.
JSON:
{
  "word": "단어",
  "reaction": "'${playerWord}'이라니 제법이구나! 내 차례는 '단어'다!",
  "mood": "idle" | "nervous" | "amazed"
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': state.geminiApiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });
    clearTimeout(timeout);
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(rawText);
  } catch (e) {
    return null;
  }
}

// ==========================================
// [8] 웹캠 제어
// ==========================================
async function startWebcam() {
  stopWebcam();
  const attempt = ++state.cameraAttempt;
  const status = dom.cameraStatus;
  status.hidden = false;
  status.textContent = '카메라를 준비하고 있어요.';
  dom.scanNotice.textContent = '';
  dom.scanResultCard.classList.remove('active');
  dom.btnRetryCamera.hidden = true;
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = '카메라를 쓰려면 크롬에서 HTTPS로 시작하는 게임 주소를 열어 주세요.';
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });
    if (attempt !== state.cameraAttempt) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    state.cameraStream = stream;
    dom.videoFeed.srcObject = stream;
    await dom.videoFeed.play();
    if (attempt !== state.cameraAttempt) return;
    status.hidden = true;
    dom.viewfinder.classList.add('ready');
    dom.btnCaptureScan.disabled = false;
  } catch (err) {
    if (attempt !== state.cameraAttempt) return;
    stopWebcam();
    status.hidden = false;
    status.textContent = {
      NotAllowedError: '카메라 권한이 꺼져 있어요. 주소창 왼쪽의 사이트 설정에서 카메라를 허용해 주세요.',
      NotReadableError: '카메라를 열 수 없어요. 카메라를 쓰는 다른 앱을 닫거나 크롬북의 카메라 스위치를 확인해 주세요.',
      NotFoundError: '연결된 카메라를 찾지 못했어요.'
    }[err.name] || '카메라를 켤 수 없어요. 건너뛰고 난이도를 직접 고를 수 있어요.';
    dom.btnRetryCamera.hidden = false;
  }
}

function stopWebcam() {
  state.cameraAttempt++;
  state.ageRequest?.abort();
  state.ageRequest = null;
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  dom.videoFeed.srcObject = null;
  dom.canvasFeed.hidden = true;
  dom.canvasFeed.width = 0;
  dom.canvasFeed.height = 0;
  dom.viewfinder.classList.remove('ready', 'captured');
  dom.scanLaser.classList.remove('scanning');
  dom.btnCaptureScan.disabled = true;
  dom.btnCaptureScan.textContent = '사진 찍기';
}

function captureWebcamFrame() {
  const video = dom.videoFeed;
  const canvas = dom.canvasFeed;
  if (!video.videoWidth || video.readyState < 2) return null;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.hidden = false;
  dom.viewfinder.classList.add('captured');
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return dataUrl.split(',')[1];
}

// ==========================================
// [9] 초고속 STT & 추천 단어 원터치 칩
// ==========================================
async function initHardwareMicMeter() {
  try {
    if (!state.micStream) {
      const attempt = state.gameAttempt;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (attempt !== state.gameAttempt || !dom.viewStage2.classList.contains('active') || state.micStream) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      state.micStream = stream;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!state.audioMeterCtx) state.audioMeterCtx = new AudioCtx();
    if (state.audioMeterCtx.state === 'suspended') await state.audioMeterCtx.resume();
    if (!state.micStream || state.analyser) return;

    const source = state.audioMeterCtx.createMediaStreamSource(state.micStream);
    const analyser = state.audioMeterCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    state.analyser = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function updateMeter() {
      if (state.analyser !== analyser) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      const percent = Math.min(100, Math.round((avg / 60) * 100));
      
      dom.micMeterFill.style.width = `${percent}%`;
      requestAnimationFrame(updateMeter);
    }
    updateMeter();
  } catch (err) {
    showMicTroubleGuide("마이크를 사용할 수 없어요. 키보드로 입력해 줘.");
  }
}

function stopHardwareMicMeter() {
  state.micStream?.getTracks().forEach(track => track.stop());
  state.micStream = null;
  state.analyser = null;
  dom.micMeterFill.style.width = '0%';
}

function showMicTroubleGuide(msg) {
  dom.micTroubleHint.style.display = 'block';
  dom.micTroubleHint.textContent = msg;
}

function clearSpeechChoices() {
  dom.speechChoices.hidden = true;
  dom.speechChoiceButtons.replaceChildren();
}

function koreanSoundDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (const [index, char] of Array.from(left).entries()) {
    const current = [index + 1];
    const code = char.charCodeAt(0) - 0xac00;
    for (const [otherIndex, other] of Array.from(right).entries()) {
      const otherCode = other.charCodeAt(0) - 0xac00;
      const initial = Math.floor(code / 588) === Math.floor(otherCode / 588) ? 0 : .36;
      const vowel = Math.floor(code / 28) % 21 === Math.floor(otherCode / 28) % 21 ? 0 : .44;
      const final = code % 28 === otherCode % 28 ? 0 : .22;
      current.push(Math.min(current[otherIndex] + 1, previous[otherIndex + 1] + 1, previous[otherIndex] + initial + vowel + final));
    }
    previous = current;
  }
  return previous[right.length];
}

function showSpeechChoices(result) {
  const recognized = Array.from(new Set(Array.from(result, item => item.transcript.replace(/[^가-힣]/g, '')).filter(Boolean)));
  if (!recognized.length) {
    dom.micStatusText.textContent = '잘 듣지 못했어요. 다시 말하거나 직접 입력해 줘.';
    return;
  }
  const starts = getInitialVariants(state.targetChar);
  const playable = word => word.length >= 2 && starts.includes(word[0])
    && !state.usedWords.has(word) && !WORD_DICTIONARY.killerEndChars.includes(word.slice(-1));
  const alternatives = recognized.filter(playable);
  const similar = Array.from(ALL_WORDS).filter(word => playable(word) && !alternatives.includes(word))
    .map(word => ({
      word,
      distance: Math.min(...recognized.map((heard, index) => koreanSoundDistance(heard, word) + index * .05))
    }))
    .filter(({ distance }) => distance <= .85)
    .sort((left, right) => left.distance - right.distance);
  const candidates = [...alternatives, ...similar.map(({ word }) => word)].slice(0, 5);
  clearSpeechChoices();
  dom.speechLiveText.textContent = `이렇게 들렸어 · ${recognized[0]}`;
  dom.micStatusText.textContent = candidates.length
    ? ''
    : '비슷한 단어를 찾지 못했어요. 다시 말하거나 직접 입력해 줘.';
  if (!candidates.length) return;
  if (!state.speechChoiceExtraMs) {
    state.speechChoiceExtraMs = Math.max(0, battleElapsedTime() - 5000);
  }
  for (const word of candidates) {
    const button = document.createElement('button');
    button.className = 'btn-secondary';
    button.textContent = word;
    button.addEventListener('click', () => {
      clearSpeechChoices();
      processPlayerWord(word);
    });
    dom.speechChoiceButtons.appendChild(button);
  }
  dom.speechChoices.hidden = false;
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showMicTroubleGuide("이 브라우저에서는 키보드로 단어를 입력해 줘.");
    return;
  }
  
  const rec = new SpeechRecognition();
  rec.lang = 'ko-KR';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 5;

  rec.onstart = () => {
    if (!state.turnOpen || !state.microphoneStarting) {
      rec.abort();
      return;
    }
    state.microphoneStarting = false;
    state.isListening = true;
    dom.btnMic.disabled = false;
    startBattleTimer();
    if (!state.analyser) initHardwareMicMeter();
    dom.btnMic.classList.add('listening');
    dom.btnMic.textContent = "듣는 중 · 멈추기";
    dom.micStatusText.textContent = "단어를 또박또박 말해 줘.";
    dom.speechLiveText.textContent = "";
    clearSpeechChoices();
    if (dom.micTroubleHint) dom.micTroubleHint.style.display = 'none';
  };

  rec.onresult = (e) => {
    if (!state.turnOpen) return;
    const result = e.results[e.results.length - 1];
    if (result.isFinal) {
      showSpeechChoices(result);
    } else {
      dom.speechLiveText.textContent = result[0].transcript;
    }
  };

  rec.onerror = (e) => {
    if (!state.turnOpen || e.error === 'aborted') return;
    state.microphoneStarting = false;
    state.isListening = false;
    dom.btnMic.classList.remove('listening');
    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) {
      pauseBattleTimer();
      showMicTroubleGuide("마이크를 사용할 수 없어요. 키보드로 입력해 줘.");
    } else if (e.error === 'network') {
      pauseBattleTimer();
      showMicTroubleGuide("음성 인식 연결이 끊겼어요. 키보드로 입력해 줘.");
    } else {
      dom.micStatusText.textContent = "잘 듣지 못했어요. 다시 말해 줘.";
    }
  };

  rec.onend = () => {
    state.microphoneStarting = false;
    state.isListening = false;
    dom.btnMic.disabled = !state.turnOpen;
    dom.btnTextFallback.disabled = !state.turnOpen;
    dom.btnMic.classList.remove('listening');
    dom.btnMic.textContent = "마이크로 말하기";
  };

  state.recognition = rec;

  dom.btnMic.addEventListener('click', () => {
    if (!state.turnOpen || state.microphoneStarting) return;
    if (state.isListening) {
      try { state.recognition.stop(); } catch(err){}
    } else {
      state.microphoneStarting = true;
      dom.btnMic.disabled = true;
      dom.micStatusText.textContent = '마이크를 켜는 중이에요.';
      try {
        state.recognition.start();
      } catch {
        state.microphoneStarting = false;
        dom.btnMic.disabled = false;
        dom.micStatusText.textContent = '마이크를 다시 누르거나 키보드로 입력해 줘.';
      }
    }
  });
}

// ==========================================
// [10] 초기화 & 이벤트 리스너
// ==========================================
function initApp() {
  rankings.startRetry();
  document.getElementById('btn-replay-dance').addEventListener('click', playVictoryDance);
  updateEngineStatus();
  setCharacterMood('idle');

  // 설정
  dom.btnConfig.addEventListener('click', () => {
    dom.geminiApiKeyInput.value = state.geminiApiKey;
    dom.toggleForceLocal.checked = state.forceLocal;
    populateVoiceList();
    dom.configModal.showModal();
  });
  dom.btnCloseConfig.addEventListener('click', () => dom.configModal.close());

  dom.btnTestVoice.addEventListener('click', () => {
    const selected = dom.voiceSelectDropdown.value;
    state.selectedVoiceURI = selected;
    speakAI("안녕하세요. 2026 시흥 페스타의 뽀랭이입니다.");
  });

  dom.btnSaveConfig.addEventListener('click', () => {
    state.geminiApiKey = dom.geminiApiKeyInput.value.trim();
    state.forceLocal = dom.toggleForceLocal.checked;
    state.selectedVoiceURI = dom.voiceSelectDropdown.value;
    localStorage.setItem('gemini_api_key', state.geminiApiKey);
    localStorage.setItem('force_local', state.forceLocal);
    localStorage.setItem('selected_voice_uri', state.selectedVoiceURI);
    updateEngineStatus();
    dom.configModal.close();
  });

  // 사운드 & 홈
  dom.btnSound.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    dom.btnSound.textContent = sfx.enabled ? '효과음 켜짐' : '효과음 꺼짐';
    dom.btnSound.setAttribute('aria-pressed', sfx.enabled);
  });
  dom.btnHome.addEventListener('click', () => {
    if (confirm("처음 화면으로 돌아갈까요?")) {
      stopWebcam();
      resetGame();
      showView(dom.viewHome);
    }
  });

  // Stage 0
  document.getElementById('btn-start-camera-scan').addEventListener('click', () => {
    sfx.init();
    dom.stageBadge.textContent = "1 / 3 · AI 나이 예측";
    document.getElementById('scan-instruction').textContent = state.isGeminiActive
      ? "사진을 찍으면 Gemini로 보내요. AI가 나이를 추정해 초등·중등 난이도를 추천해요."
      : "지금은 오프라인 모드예요. 사진 없이 건너뛰고 원하는 난이도를 고를 수 있어요.";
    dom.btnCaptureScan.textContent = "사진 찍기";
    dom.scanLaser.classList.remove('scanning');
    dom.scanResultCard.classList.remove('active');
    showView(dom.viewStage0);
    startWebcam();
  });

  dom.btnCaptureScan.addEventListener('click', async () => {
    const attempt = state.cameraAttempt;
    sfx.init();
    dom.scanResultCard.classList.remove('active');
    dom.scanNotice.textContent = '';
    let base64Img;
    try { base64Img = captureWebcamFrame(); } catch {}
    if (!base64Img) {
      dom.scanNotice.textContent = '카메라 영상이 아직 준비되지 않았어요. 화면이 보인 뒤 다시 눌러 주세요.';
      return;
    }
    dom.scanLaser.classList.add('scanning');
    dom.btnCaptureScan.disabled = true;
    dom.btnCaptureScan.textContent = '나이 추정 중…';
    dom.scanNotice.textContent = state.isGeminiActive ? '사진을 찍었어요. AI가 나이를 추정하고 있어요.' : '';
    const request = new AbortController();
    state.ageRequest = request;
    const result = await analyzeAgeWithGemini(base64Img, request.signal);
    if (attempt !== state.cameraAttempt) return;

    state.ageRequest = null;
    dom.scanLaser.classList.remove('scanning');
    dom.btnCaptureScan.disabled = false;
    dom.btnCaptureScan.textContent = "다시 찍기";

    state.mode = result?.mode ?? 'elem';
    const modeLabel = state.mode === 'elem' ? '초등' : '중등';
    dom.scanNotice.textContent = ageErrorMessages[result.error] || '나이 추정을 마쳤어요.';
    dom.scanAgeTitle.textContent = result.age ? `Gemini 추천 · ${modeLabel}` : `선택한 난이도 · ${modeLabel}`;
    dom.scanGreetingText.textContent = result.age
      ? `AI가 추정한 나이 · 약 ${result.age}세. 원하는 난이도로 바꿀 수 있어.`
      : '사진 분석 없이 시작해요. 원하는 난이도로 바꿀 수 있어.';
    dom.scanResultCard.classList.add('active');

    setCharacterMood('idle');
    if (result.age) sfx.correct();
  });
  dom.btnRetryCamera.addEventListener('click', startWebcam);

  dom.btnToggleModeManual.addEventListener('click', () => {
    state.mode = (state.mode === 'elem') ? 'middle' : 'elem';
    dom.scanAgeTitle.textContent = `선택한 난이도 · ${state.mode === 'elem' ? '초등' : '중등'}`;
    sfx.tick();
  });

  dom.btnConfirmAge.addEventListener('click', () => {
    stopWebcam();
    startGame();
  });
  dom.btnSkipScan.addEventListener('click', () => {
    stopWebcam();
    state.mode = 'elem';
    dom.btnRetryCamera.hidden = true;
    dom.cameraStatus.hidden = false;
    dom.cameraStatus.textContent = '사진 없이 시작해요.';
    dom.scanNotice.textContent = '';
    dom.scanAgeTitle.textContent = '선택한 난이도 · 초등';
    dom.scanGreetingText.textContent = '초등 또는 중등 난이도를 골라 줘.';
    dom.scanResultCard.classList.add('active');
    dom.btnConfirmAge.focus();
  });

  // 랭킹
  document.getElementById('btn-view-leaderboard').addEventListener('click', () => {
    showView(dom.viewLeaderboard);
    loadGameLeaderboard();
  });
  dom.btnLeaderboardBack.addEventListener('click', () => showView(dom.viewHome));

  // Stage 1
  dom.qCardA.addEventListener('click', () => handleQuizChoice('A'));
  dom.qCardB.addEventListener('click', () => handleQuizChoice('B'));
  dom.btnNextQuiz.addEventListener('click', nextQuizStep);

  // Stage 2
  setupSpeechRecognition();
  dom.btnChance.addEventListener('click', useHintChance);
  dom.btnTextFallback.addEventListener('click', () => {
    if (!state.turnOpen) return;
    if (state.microphoneStarting || state.isListening) {
      state.microphoneStarting = false;
      try { state.recognition.abort(); } catch {}
    }
    dom.textModalInput.value = "";
    dom.textModal.showModal();
    startBattleTimer();
  });
  dom.btnCloseModal.addEventListener('click', () => dom.textModal.close());
  dom.btnSubmitText.addEventListener('click', () => {
    const val = dom.textModalInput.value.trim();
    if (val) {
      dom.textModal.close();
      processPlayerWord(val);
    }
  });
  dom.textModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) dom.btnSubmitText.click();
  });

  // 랭킹 저장 & 재시작
  dom.btnSaveRank.addEventListener('click', saveNicknameRanking);
  dom.nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) dom.btnSaveRank.click();
  });
  dom.btnRestart.addEventListener('click', () => {
    resetGame();
    showView(dom.viewHome);
  });
}

function resetGame() {
  state.gameAttempt++;
  clearTimeout(victoryDanceTimer);
  state.scoreEntry = null;
  state.savingScore = false;
  state.speechSynth?.cancel();
  state.quizOpen = false;
  closePlayerTurn();
  stopHardwareMicMeter();
  clearInterval(state.qTimer);
  if (state.recognition && state.isListening) {
    try { state.recognition.stop(); } catch(e){}
  }
  state.totalScore = 0;
  state.stage1Score = 0;
  state.stage2Score = 0;
  state.currentQIndex = 0;
  state.battleTurn = 1;
  state.usedWords.clear();
  state.chanceUsed = false;
  dom.totalScoreDisplay.textContent = "0";
  dom.btnChance.textContent = "힌트 1회";
}

function startGame() {
  resetGame();
  sfx.init();
  const pool = [...QUIZ_DATA[state.mode]];
  pool.sort(() => Math.random() - 0.5);
  state.stage1Questions = pool.slice(0, 2);
  startStage1();
}

// ==========================================
// [Stage 1] 글 판별 퀴즈
// ==========================================
function startStage1() {
  dom.stageBadge.textContent = `2 / 3 · 글 찾기 (${state.mode === 'elem' ? '초등' : '중등'})`;
  showView(dom.viewStage1);
  loadQuizQuestion(0);
}

function loadQuizQuestion(index) {
  state.currentQIndex = index;
  const q = state.stage1Questions[index];
  
  dom.qNumber.textContent = `${index + 1} / 2 문제`;
  dom.qIdiomTag.textContent = `${q.idiom} · ${q.title}`;
  dom.qTextA.textContent = q.textA;
  dom.qTextB.textContent = q.textB;
  
  dom.qCardA.classList.remove('selected-correct', 'selected-wrong');
  dom.qCardB.classList.remove('selected-correct', 'selected-wrong');
  setQuizChoices(true);
  dom.qFeedback.classList.remove('show');
  dom.btnNextQuiz.style.display = 'none';

  clearInterval(state.qTimer);
  state.qTimeLeft = 35;
  dom.qTimerBar.style.width = '100%';
  
  const startTime = Date.now();
  state.qTimer = setInterval(() => {
    state.qTimeLeft = Math.max(0, 35 - Math.floor((Date.now() - startTime) / 1000));
    dom.qTimerBar.style.width = `${(state.qTimeLeft / 35) * 100}%`;
    if (state.qTimeLeft <= 5) sfx.tick();
    if (state.qTimeLeft <= 0) {
      clearInterval(state.qTimer);
      handleQuizTimeout();
    }
  }, 200);
}

function handleQuizChoice(choice) {
  if (!state.quizOpen) return;
  clearInterval(state.qTimer);
  setQuizChoices(false);
  
  const q = state.stage1Questions[state.currentQIndex];
  const isCorrect = (choice === q.humanChoice);
  const selectedCard = (choice === 'A') ? dom.qCardA : dom.qCardB;
  const correctCard = (q.humanChoice === 'A') ? dom.qCardA : dom.qCardB;
  
  let earned = 0;
  if (isCorrect) {
    sfx.correct();
    selectedCard.classList.add('selected-correct');
    earned = 100;
    if (state.qTimeLeft >= 30) {
      earned += 20;
      dom.qFeedbackTitle.textContent = `정답! 빠르게 골라서 +${earned}점`;
    } else {
      dom.qFeedbackTitle.textContent = `정답! +${earned}점`;
    }
    triggerConfetti();
  } else {
    sfx.wrong();
    selectedCard.classList.add('selected-wrong');
    correctCard.classList.add('selected-correct');
    dom.qFeedbackTitle.textContent = `정답은 ‘${q.humanChoice === 'A' ? '가' : '나'}’ 글이야.`;
  }

  state.stage1Score += earned;
  state.totalScore += earned;
  dom.totalScoreDisplay.textContent = state.totalScore;

  showQuizFeedback(q);
}

function setQuizChoices(enabled) {
  state.quizOpen = enabled;
  dom.qCardA.querySelector('button').disabled = !enabled;
  dom.qCardB.querySelector('button').disabled = !enabled;
}

function showQuizFeedback(question) {
  dom.qFeedbackDesc.textContent = question.explanation
    .replace(/^[AB]가 사람의 글입니다! /, '')
    .replaceAll('A는', '‘가’ 글은')
    .replaceAll('B는', '‘나’ 글은');
  dom.qFeedback.classList.add('show');
  dom.btnNextQuiz.style.display = 'block';
  dom.btnNextQuiz.textContent = state.currentQIndex === 0 ? "다음 문제 →" : "끝말잇기 시작 →";
}

function handleQuizTimeout() {
  sfx.wrong();
  setQuizChoices(false);
  const q = state.stage1Questions[state.currentQIndex];
  const correctCard = (q.humanChoice === 'A') ? dom.qCardA : dom.qCardB;
  correctCard.classList.add('selected-correct');

  dom.qFeedbackTitle.textContent = `시간이 다 됐어. 정답은 ‘${q.humanChoice === 'A' ? '가' : '나'}’ 글이야.`;
  showQuizFeedback(q);
}

function nextQuizStep() {
  if (state.currentQIndex === 0) loadQuizQuestion(1);
  else startStage2();
}

// ==========================================
// [Stage 2] 음성 끝말잇기 배틀
// ==========================================
function startStage2() {
  dom.stageBadge.textContent = "3 / 3 · 끝말잇기";
  showView(dom.viewStage2);
  
  state.battleTurn = 1;
  state.usedWords.clear();
  setCharacterMood('idle');
  dom.bTurnDisplay.textContent = '1 / 5 차례';
  dom.bTimeDisplay.textContent = '10초 · 대기 중';
  dom.bTimerBar.style.width = '100%';
  dom.targetCharBadge.textContent = '–';
  dom.targetVariantsText.textContent = '';
  dom.micStatusText.textContent = '뽀랭이가 먼저 말해요.';
  dom.speechLiveText.textContent = '';

  const starters = ["시흥", "국어", "미래", "로봇", "사자성어"];
  const startWord = starters[Math.floor(Math.random() * starters.length)];
  state.usedWords.add(startWord);

  const introMsg = `반가워. 난 뽀랭이야. 첫 단어는 '${startWord}'로 시작한다.`;
  dom.aiSpeechText.textContent = `"${introMsg}"`;
  speakAI(introMsg, () => {
    preparePlayerTurn(startWord.slice(-1));
  });
}

function preparePlayerTurn(lastChar) {
  state.turnOpen = true;
  state.targetChar = lastChar;
  dom.bTurnDisplay.textContent = `${state.battleTurn} / ${state.maxTurns} 차례`;
  dom.targetCharBadge.textContent = lastChar;

  const variants = getInitialVariants(lastChar);
  if (variants.length > 1) {
    dom.targetVariantsText.textContent = `‘${variants.join('’ 또는 ‘')}’로 시작할 수 있어.`;
  } else {
    dom.targetVariantsText.textContent = "";
  }

  state.speechChoiceExtraMs = 0;
  dom.speechLiveText.textContent = "";
  dom.btnMic.classList.remove('listening');
  dom.micStatusText.textContent = state.recognition
    ? '마이크로 말하기를 누르면 10초가 시작돼요.'
    : '키보드로 입력을 누르면 10초가 시작돼요.';
  dom.btnMic.disabled = !state.recognition;
  dom.btnTextFallback.disabled = false;
  dom.btnChance.disabled = state.chanceUsed;
  clearSpeechChoices();

  clearInterval(state.bTimer);
  state.bTimer = null;
  state.bTimeLeft = 10;
  dom.bTimerBar.style.width = '100%';
  dom.bTimeDisplay.textContent = '10초 · 대기 중';
  state.turnStartTime = null;
  state.turnElapsedMs = 0;
}

function battleElapsedTime() {
  return state.turnElapsedMs + (state.turnStartTime === null ? 0 : Date.now() - state.turnStartTime);
}

function pauseBattleTimer() {
  state.turnElapsedMs = battleElapsedTime();
  state.turnStartTime = null;
  clearInterval(state.bTimer);
  state.bTimer = null;
  dom.bTimeDisplay.textContent = `${state.bTimeLeft}초 · 대기 중`;
}

function startBattleTimer() {
  if (!state.turnOpen || state.turnStartTime !== null) return;
  state.turnStartTime = Date.now();
  dom.bTimeDisplay.textContent = `${state.bTimeLeft}초 남음`;
  state.bTimer = setInterval(() => {
    const previous = state.bTimeLeft;
    state.bTimeLeft = Math.max(0, Math.min(10, 10 - Math.floor((battleElapsedTime() - state.speechChoiceExtraMs) / 1000)));
    dom.bTimerBar.style.width = `${(state.bTimeLeft / 10) * 100}%`;
    dom.bTimeDisplay.textContent = `${state.bTimeLeft}초 남음`;
    if (state.bTimeLeft !== previous && state.bTimeLeft <= 3) sfx.tick();
    if (state.bTimeLeft === 0) handleBattleTimeout();
  }, 200);
}

function closePlayerTurn() {
  state.turnOpen = false;
  clearInterval(state.bTimer);
  state.bTimer = null;
  if (state.isListening || state.microphoneStarting) {
    try { state.recognition.abort(); } catch (error) {}
  }
  state.microphoneStarting = false;
  if (dom.textModal.open) dom.textModal.close();
  dom.btnMic.disabled = true;
  dom.btnTextFallback.disabled = true;
  dom.btnChance.disabled = true;
  clearSpeechChoices();
}

async function processPlayerWord(rawWord) {
  if (!state.turnOpen) return;
  const word = rawWord.replace(/[^가-힣]/g, '');
  if (!word || word.length < 2) {
    dom.micStatusText.textContent = "두 글자 이상의 한글 단어를 말하거나 입력해 줘.";
    return;
  }

  const firstChar = word[0];
  const validVariants = getInitialVariants(state.targetChar);
  if (!validVariants.includes(firstChar)) {
    sfx.wrong();
    dom.micStatusText.textContent = `‘${validVariants.join('’ 또는 ‘')}’로 시작해 줘.`;
    return;
  }

  if (state.usedWords.has(word)) {
    sfx.wrong();
    dom.micStatusText.textContent = `‘${word}’는 이미 썼어. 다른 단어를 골라 줘.`;
    return;
  }

  // 한방 단어 방어
  const lastChar = word.slice(-1);
  if (WORD_DICTIONARY.killerEndChars.includes(lastChar)) {
    sfx.wrong();
    setCharacterMood('nervous');
    const defenseMsg = `앗! '${word}'의 끝 글자 '${lastChar}'(은)는 너무 강력한 반칙 마법이야. 다른 단어로 다시 말해줘.`;
    dom.aiSpeechText.textContent = `"${defenseMsg}"`;
    speakAI(defenseMsg);
    return;
  }

  closePlayerTurn();
  dom.micStatusText.textContent = "뽀랭이 차례예요.";
  state.usedWords.add(word);
  
  let turnScore = 50;
  if (word.length === 3) turnScore = 100;
  if (word.length >= 4) turnScore = 150;
  if (battleElapsedTime() < 6000) turnScore += 20;

  let isGolden = false;
  if (WORD_DICTIONARY.goldenWords.includes(word)) {
    isGolden = true;
    turnScore += 150;
    triggerConfetti();
    sfx.golden();
  } else {
    sfx.correct();
  }

  state.stage2Score += turnScore;
  state.totalScore += turnScore;
  dom.totalScoreDisplay.textContent = state.totalScore;

  if (isGolden) {
    setCharacterMood('amazed');
    const praise = `대단해! '${word}'(은)는 시흥과 RAS의 황금 단어야.`;
    dom.aiSpeechText.textContent = `"${praise}"`;
    speakAI(praise, () => executeAITurn(word.slice(-1), word));
  } else if (word.length >= 3) {
    setCharacterMood('nervous');
    const msg = `'${word}'이라니! 제법인데? 식은땀이 나네.`;
    dom.aiSpeechText.textContent = `"${msg}"`;
    speakAI(msg, () => executeAITurn(word.slice(-1), word));
  } else {
    setCharacterMood('idle');
    const msg = `좋아, '${word}'!`;
    dom.aiSpeechText.textContent = `"${msg}"`;
    speakAI(msg, () => executeAITurn(word.slice(-1), word));
  }
}

async function executeAITurn(playerLastChar, playerWord) {
  const attempt = state.gameAttempt;
  if (state.battleTurn >= state.maxTurns) {
    finishGame(true);
    return;
  }

  state.battleTurn++;

  let replyObj = await getGeminiWordReply(playerWord, playerLastChar);
  if (attempt !== state.gameAttempt) return;
  const variants = getInitialVariants(playerLastChar);
  const canReply = word => typeof word === 'string' && word.length >= 2
    && variants.includes(word[0]) && !state.usedWords.has(word)
    && !WORD_DICTIONARY.killerEndChars.includes(word.slice(-1));

  let candidate = null;
  let replyText = "";
  let mood = "idle";

  if (canReply(replyObj?.word) && typeof replyObj.reaction === 'string') {
    candidate = replyObj.word;
    replyText = replyObj.reaction;
    mood = replyObj.mood || "idle";
  }

  if (!candidate) {
    const replies = Array.from(ALL_WORDS).filter(canReply);
    if (!replies.length) {
      const message = '뽀랭이가 이을 단어를 찾지 못했어. 네가 이겼어!';
      dom.aiSpeechText.textContent = message;
      speakAI(message, () => finishGame(true));
      return;
    }
    const playableReplies = replies.filter(word => {
      const starts = getInitialVariants(word.slice(-1));
      return Array.from(ALL_WORDS).some(next => next !== word && next.length >= 2
        && starts.includes(next[0]) && !state.usedWords.has(next)
        && !WORD_DICTIONARY.killerEndChars.includes(next.slice(-1)));
    });
    const pool = playableReplies.length ? playableReplies : replies;
    candidate = pool[Math.floor(Math.random() * pool.length)];
    replyText = `내 차례다. '${candidate}'!`;
    mood = "idle";
  }

  state.usedWords.add(candidate);
  setCharacterMood(mood);
  dom.aiSpeechText.textContent = `"${replyText}"`;
  
  setTimeout(() => {
    if (attempt !== state.gameAttempt) return;
    speakAI(replyText, () => {
      preparePlayerTurn(candidate.slice(-1));
    });
  }, 300);
}

function handleBattleTimeout() {
  closePlayerTurn();
  dom.micStatusText.textContent = "시간이 다 됐어요.";
  sfx.wrong();
  setCharacterMood('idle');
  const timeoutMsg = "아쉽게도 10초가 지났구나. 그래도 멋진 승부였어.";
  dom.aiSpeechText.textContent = `"${timeoutMsg}"`;
  speakAI(timeoutMsg, () => finishGame(false));
}

function useHintChance() {
  if (state.chanceUsed) return;
  state.chanceUsed = true;
  dom.btnChance.disabled = true;
  dom.btnChance.textContent = "힌트 사용 완료";

  const variants = getInitialVariants(state.targetChar);
  const candidate = Array.from(ALL_WORDS).find(w => variants.includes(w[0]) && !state.usedWords.has(w));
  
  if (candidate) {
    const hintMsg = `힌트야. '${candidate[0]}'로 시작하는 '${candidate}' 단어는 어때?`;
    dom.aiSpeechText.textContent = `"${hintMsg}"`;
    speakAI(hintMsg);
  } else {
    alert("사용 가능한 추천 단어가 없습니다. 마음껏 외쳐보세요!");
  }
}

// ==========================================
// [11] 결과 및 랭킹
// ==========================================
let victoryDanceTimer;

function playVictoryDance() {
  clearTimeout(victoryDanceTimer);
  const avatar = document.querySelector('.victory-avatar');
  avatar.dataset.frame = 'ready';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const leftStep = [['hop', 75], ['left', 180], ['land', 85], ['close', 45]];
  const rightStep = [['hop', 75], ['right', 180], ['land', 85], ['close', 45]];
  const phrase = [...leftStep, ...rightStep, ...leftStep, ...rightStep];
  const frames = [
    ['ready', 140], ['close', 90],
    ...phrase, ...phrase, ...phrase, ...phrase,
    ['land', 130], ['close', 140], ['ready', 0]
  ];
  let index = 0;
  function nextFrame() {
    const [frame, duration] = frames[index++];
    avatar.dataset.frame = frame;
    if (duration) victoryDanceTimer = setTimeout(nextFrame, duration);
  }
  nextFrame();
}

function finishGame(isWin) {
  stopHardwareMicMeter();
  document.getElementById('ai-victory').hidden = isWin;
  if (isWin) {
    sfx.fanfare();
    triggerConfetti();
    state.totalScore += 50;
    dom.totalScoreDisplay.textContent = state.totalScore;
  }
  
  dom.stageBadge.textContent = "내 기록";
  document.getElementById('win-bonus').hidden = !isWin;
  dom.nicknameInput.value = '';
  dom.nicknameInput.disabled = false;
  dom.btnSaveRank.disabled = false;
  dom.btnSaveRank.textContent = '내 점수 올리기';
  dom.rankSaveStatus.textContent = '';
  dom.finalScoreDisplay.textContent = `${state.totalScore}`;
  dom.resScoreStage1.textContent = `${state.stage1Score}점`;
  dom.resScoreStage2.textContent = `${state.stage2Score}점`;

  let tier = "새싹 도전자";
  if (state.totalScore >= 850) tier = "국어 놀이터 달인";
  else if (state.totalScore >= 700) tier = "말놀이 고수";
  else if (state.totalScore >= 500) tier = "반짝 도전자";
  dom.tierBadgeDisplay.textContent = tier;
  
  showView(dom.viewResult);
  if (!isWin) playVictoryDance();
}

async function saveNicknameRanking() {
  if (state.savingScore || !dom.viewResult.classList.contains('active')) return;
  const nick = dom.nicknameInput.value.trim().normalize('NFC');
  if (!rankings.validNickname(nick)) {
    dom.rankSaveStatus.textContent = '한글, 영문, 숫자로 시작하는 1~8글자 별명을 써 줘.';
    dom.nicknameInput.focus();
    return;
  }

  const attempt = state.gameAttempt;
  const record = state.scoreEntry ??= {
    id: crypto.randomUUID(),
    nickname: nick,
    score: state.totalScore,
    mode: state.mode === 'elem' ? '초등' : '중등'
  };
  state.savingScore = true;
  dom.nicknameInput.disabled = true;
  dom.btnSaveRank.disabled = true;
  dom.btnSaveRank.textContent = '올리는 중…';
  dom.rankSaveStatus.textContent = '';
  try {
    const records = await rankings.save(record);
    if (attempt !== state.gameAttempt) return;
    sfx.correct();
    dom.rankingStatus.textContent = rankings.localMode ? '이 브라우저에 점수를 저장했어요.' : '구글 시트에 점수를 등록했어요.';
    renderLeaderboard(records, record.id);
    showView(dom.viewLeaderboard);
  } catch (error) {
    if (attempt !== state.gameAttempt) return;
    if (['invalid_record', 'id_conflict'].includes(error.code)) {
      state.scoreEntry = null;
      dom.nicknameInput.disabled = false;
      dom.rankSaveStatus.textContent = '이 기록을 등록할 수 없어요. 별명을 확인한 뒤 다시 시도해 줘.';
    } else if (error.code === 'not_configured') {
      dom.rankSaveStatus.textContent = '구글 시트 연결 설정이 필요해요. 운영 선생님에게 알려 줘.';
    } else {
      dom.rankSaveStatus.textContent = '아직 등록을 확인하지 못했어요. 다시 눌러 확인하거나 연결이 돌아올 때까지 기다려 줘.';
    }
  } finally {
    if (attempt === state.gameAttempt) {
      state.savingScore = false;
      dom.btnSaveRank.disabled = false;
      dom.btnSaveRank.textContent = '내 점수 올리기';
    }
  }
}

async function loadGameLeaderboard() {
  dom.rankingStatus.textContent = '순위를 불러오는 중이에요.';
  try {
    const records = await rankings.list();
    dom.rankingStatus.textContent = rankings.localMode ? '이 브라우저의 기록이에요.' : '';
    renderLeaderboard(records);
  } catch (error) {
    dom.rankingStatus.textContent = error.code === 'not_configured'
      ? '구글 시트 연결 설정이 필요해요.' : '순위를 불러오지 못했어요. 잠시 뒤 다시 열어 줘.';
  }
}

function renderLeaderboard(records, highlightId = '') {
  dom.rankingTableBody.innerHTML = "";

  if (records.length === 0) {
    dom.rankingTableBody.innerHTML = '<tr><td colspan="5" class="empty-cell">아직 올라온 기록이 없어요.</td></tr>';
    return;
  }

  records.slice(0, 10).forEach((entry, idx) => {
    const rank = idx + 1;
    const tr = document.createElement('tr');
    if (rank === 1) tr.classList.add('rank-top-1');
    if (highlightId && entry.id === highlightId) tr.classList.add('rank-my');

    for (const value of [`${rank}위`, entry.nickname, entry.mode, `${entry.score}점`, rankings.formatDate(entry.date)]) {
      tr.insertCell().textContent = value;
    }
    dom.rankingTableBody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', initApp);
