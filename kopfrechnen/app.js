(function () {
  'use strict';

  var SETTINGS_KEY = 'kopfrechnen.settings';
  var RUN_HISTORY_KEY = 'kopfrechnen.runHistory.v1';
  var RUN_HISTORY_LIMIT = 10;
  var MODE_MATH = 'math';
  var MODE_TIME = 'time';
  var DEFAULT_MATH_TASK_COUNT = 10;
  var DEFAULT_TIME_TASK_COUNT = 20;
  var FILTER_KEYS = ['add', 'subtract', 'multiply', 'divide', 'percent', 'power', 'square', 'sqrt', 'cube', 'eft'];
  var BASIC_FILTER_KEYS = ['add', 'subtract', 'multiply', 'divide'];
  var OP_FILTER_KEYS = {
    '+': 'add',
    '-': 'subtract',
    '×': 'multiply',
    '÷': 'divide'
  };
  var TERM_FILTER_KEYS = {
    square: 'square',
    sqrt: 'sqrt',
    cube: 'cube',
    power: 'power',
    percent: 'percent'
  };

  var LEVELS = {
    1: {
      name: 'Warm',
      steps: [1, 2],
      start: [2, 30],
      plain: [1, 20],
      termTypes: { plain: 100 },
      ops: { '+': 42, '-': 34, '×': 16, '÷': 8 },
      multiplyMax: 6,
      maxAbs: 240,
      baseTime: 10,
      stepTime: 2.5,
      flashMs: 1050,
      gapMs: 330
    },
    2: {
      name: 'Flow',
      steps: [2, 2],
      start: [3, 50],
      plain: [2, 50],
      termTypes: { plain: 86, square: 14 },
      ops: { '+': 30, '-': 26, '×': 30, '÷': 14 },
      multiplyMax: 9,
      maxAbs: 900,
      baseTime: 14,
      stepTime: 3.3,
      flashMs: 1250,
      gapMs: 420
    },
    3: {
      name: 'Fokus',
      steps: [2, 3],
      start: [5, 100],
      plain: [3, 100],
      termTypes: { plain: 72, square: 10, sqrt: 10, percent: 8 },
      ops: { '+': 26, '-': 22, '×': 32, '÷': 20 },
      multiplyMax: 12,
      maxAbs: 3200,
      baseTime: 18,
      stepTime: 4.5,
      flashMs: 1400,
      gapMs: 480
    },
    4: {
      name: 'Scharf',
      steps: [3, 4],
      start: [8, 160],
      plain: [5, 160],
      termTypes: { plain: 61, square: 10, sqrt: 10, cube: 7, power: 6, percent: 6 },
      ops: { '+': 23, '-': 20, '×': 34, '÷': 23 },
      multiplyMax: 16,
      maxAbs: 30000,
      baseTime: 24,
      stepTime: 6.2,
      flashMs: 1550,
      gapMs: 540
    },
    5: {
      name: 'Hart',
      steps: [4, 5],
      start: [10, 25],
      plain: [7, 250],
      termTypes: { plain: 62, square: 8, sqrt: 9, cube: 7, power: 6, percent: 8 },
      ops: { '+': 18, '-': 18, '×': 42, '÷': 22 },
      multiplyMax: 25,
      maxAbs: 250000,
      baseTime: 34,
      stepTime: 7.8,
      flashMs: 1700,
      gapMs: 600
    }
  };

  var TIME_LEVELS = {
    easy: {
      name: 'Einfach',
      shortName: 'Easy',
      order: 1,
      steps: [1, 2],
      maxMinutes: 150,
      stepSeconds: 7.5,
      increment: 5
    },
    medium: {
      name: 'Mittel',
      shortName: 'Medium',
      order: 2,
      steps: [2, 3],
      maxMinutes: 240,
      stepSeconds: 7.5,
      increment: 2
    },
    hard: {
      name: 'Schwer',
      shortName: 'Hard',
      order: 3,
      steps: [2, 4],
      maxMinutes: 360,
      stepSeconds: 7.25,
      increment: 1
    },
    expert: {
      name: 'Expert',
      shortName: 'Expert',
      order: 4,
      steps: [3, 5],
      maxMinutes: 540,
      stepSeconds: 7,
      increment: 1
    }
  };

  var TERM_COST = {
    plain: 0,
    square: 2.4,
    sqrt: 2.3,
    cube: 2.9,
    power: 3.2,
    percent: 3.4
  };

  var OP_COST = {
    '+': 0.8,
    '-': 1.1,
    '×': 2.7,
    '÷': 3
  };

  var PACING_LIMITS = {
    minFlashMs: 1000,
    maxFlashMs: 4500,
    minGapMs: 260,
    maxGapMs: 1500
  };

  var EFT_CHANCE = {
    1: 0.08,
    2: 0.10,
    3: 0.12,
    4: 0.14,
    5: 0.16
  };

  var EFT_TASKS = [
    { t: '2^21', r: 2097152 },
    { t: '2^22', r: 4194304 },
    { t: 'sin 0° -> number', r: 0 },
    { t: 'sin 0° -> degrees for corresponding cos function', r: 90 },
    { t: 'sin 30° -> number', r: 0.5 },
    { t: 'sin 45° -> number', r: 0.7 },
    { t: 'sin 60° -> number', r: 0.85 },
    { t: 'sin 90° -> number', r: 1 },
    { t: '4 × 3 × 7 × 13', r: 1092 },
    { t: '522 - 333', r: 189 },
    { t: '747 + 737', r: 1484, hint: 'Boeing lovers: 747 und 737 als bekannte Ankerzahlen speichern.' },
    { t: '319 + 320 + 321', r: 960 },
    { t: '7^3', r: 343, hint: 'Airbus lovers: 7^3 = 343.' },
    { t: '330 - 340 + 350', r: 340, hint: 'Airbus lovers: Die äußeren Zahlen mitteln sich zu 340.' },
    { t: '13% of 1300', r: 169 },
    { t: '12% of 1200', r: 144 },
    { t: '11% of 1100', r: 121 },
    { t: '14% of 1400', r: 196 },
    { t: '14% of 1600', r: 224 },
    { t: '75% of 1400', r: 1050 },
    { t: '40% of 620', r: 248 },
    { t: '56% of 1200', r: 672 },
    { t: '49% of 700', r: 343, hint: 'Airbus lovers: 49% = 50% - 1%.' },
    { t: '75% of 74', r: 55.5 },
    { t: '40% of 660', r: 264 },
    { t: '60% of 180', r: 108 },
    { t: '24% of 2300', r: 552 },
    { t: '23% of 2500', r: 575 },
    { t: '17% of 1400', r: 238 },
    { t: '35% of 1100', r: 385 },
    { t: '5% of 580', r: 29 },
    { t: '60% of 900', r: 540 },
    { t: '70% of 1300', r: 910 },
    { t: '40% of 4000', r: 1600 },
    { t: '2^6', r: 64 },
    { t: '7^4', r: 2401 },
    { t: '10^4', r: 10000 },
    { t: '2 × 4 × 7 × 12', r: 672 },
    { t: 'cubert(343)', r: 7 },
    { t: '27^2', r: 729 },
    { t: '99 × 13 - 99', r: 1188 },
    { t: '17^2 - 73', r: 216 },
    { t: '93 ÷ 3 + 93', r: 124 },
    { t: '56 × 3 ÷ 4', r: 42 },
    { t: '17 × 24 + 19', r: 427 },
    { t: '4^3', r: 64 },
    { t: '216 ÷ 3', r: 72 },
    { t: '653 + 32 - 416', r: 269 },
    { t: '234 ÷ 6', r: 39 },
    { t: 'sqrt(361)', r: 19 },
    { t: '10^3', r: 1000 },
    { t: '356 + 146 + 23', r: 525 },
    { t: '99 × 15 - 100', r: 1385 },
    { t: '333 + 81', r: 414 },
    { t: '2 ÷ 3 × 342', r: 513 },
    { t: '98 × 7', r: 686 },
    { t: '13 × 18', r: 234 },
    { t: '15 × 17', r: 255 },
    { t: '222 ÷ 6', r: 37 },
    { t: '14 × 17', r: 238 },
    { t: '96 ÷ 3 + 96', r: 128 },
    { t: '1150 ÷ 25', r: 46 },
    { t: '150 × 4.5', r: 675 },
    { t: '347 + 78', r: 425 },
    { t: '592 ÷ 8', r: 74 },
    { t: '333 + 87', r: 420 },
    { t: '323 ÷ 17', r: 19 },
    { t: '99 × 15 - 1000', r: 485 },
    { t: '14^2', r: 196 },
    { t: '864 ÷ 36', r: 24 },
    { t: '2832 ÷ 12', r: 236 },
    { t: '732 ÷ 6', r: 122 },
    { t: '14 × 18', r: 252 },
    { t: '32 + 96', r: 128 },
    { t: '58 + 23', r: 81 },
    { t: '19 - 27 + 36', r: 28 },
    { t: '1125 ÷ 5', r: 225 },
    { t: '294 ÷ 7', r: 42 },
    { t: 'cubert(27)', r: 3 },
    { t: 'cubert(512)', r: 8 },
    { t: '3 ÷ 4 × 216', r: 162 },
    { t: '4^4', r: 256 },
    { t: '292 ÷ 4', r: 73 },
    { t: '19 × 43', r: 817 },
    { t: '13 × 99 - 1000', r: 287 },
    { t: '421 - 340 + 303', r: 384 },
    { t: 'sqrt(1024)', r: 32 },
    { t: '1000 - 497', r: 503 },
    { t: '225 × 15', r: 3375 },
    { t: '17 × 18', r: 306 },
    { t: '146 × 9 - 18', r: 1296 },
    { t: '4.3 × 160', r: 688 },
    { t: '3^4', r: 81 },
    { t: '427 - 273', r: 154 },
    { t: '51 ÷ 3', r: 17 },
    { t: '17 × 19', r: 323 },
    { t: '208 ÷ 13', r: 16 },
    { t: 'cubert(216)', r: 6 },
    { t: '12 + 731 + 76', r: 819 },
    { t: 'sqrt(256)', r: 16 },
    { t: '504 ÷ 14', r: 36 },
    { t: '345 + 521 + 71', r: 937 },
    { t: '289 - 193 + 47', r: 143 },
    { t: '495 ÷ 9', r: 55 },
    { t: '16 × 18', r: 288 },
    { t: '184 ÷ 23', r: 8 },
    { t: '221 ÷ 13', r: 17 },
    { t: '333 + 88', r: 421 },
    { t: 'sqrt(64)', r: 8 },
    { t: '3744 ÷ 24', r: 156 },
    { t: '(146 - 18) × 9', r: 1152 },
    { t: 'sqrt(324)', r: 18 },
    { t: '2 ÷ 3 × 522', r: 348 },
    { t: '2 ÷ 3 × 351', r: 234 },
    { t: '19 × 16', r: 304 },
    { t: '16 × 41', r: 656 },
    { t: '216 ÷ (3/4)', r: 288 },
    { t: '26 × 34', r: 884 },
    { t: '5^3', r: 125 },
    { t: '36 × 7 - 105', r: 147 },
    { t: '36 × 6', r: 216 },
    { t: 'cubert(64)', r: 4 },
    { t: '530 - 282', r: 248 },
    { t: '374 × 76', r: 28424 },
    { t: '(153 - 47) × 7', r: 742 },
    { t: '420 ÷ (3/4)', r: 560 },
    { t: '13 × 16 - 201', r: 7 },
    { t: 'sqrt(169)', r: 13 },
    { t: '13 × 19 - 190', r: 57 },
    { t: '28 × 27', r: 756 },
    { t: '13 × 19 × 2', r: 494 },
    { t: '356 - 146 + 23', r: 234 },
    { t: '17 - 24 + 19', r: 12 },
    { t: '144 ÷ 12', r: 12 },
    { t: '17 × 19 - 23', r: 300 },
    { t: '21 + 137 + 366', r: 524 },
    { t: '75% of 56', r: 42 },
    { t: '4^6 - 4^4', r: 3840 },
    { t: '156 ÷ 13', r: 12 },
    { t: '17 × 14 ÷ 17 + 4', r: 18 },
    { t: '460 + 120 + 18', r: 598 },
    { t: '210 + 28', r: 238 },
    { t: '46 × 10', r: 460 },
    { t: '2 × 3 × 4 × 5', r: 120 },
    { t: '180 × 4.6', r: 828 },
    { t: '99 × 13', r: 1287 },
    { t: '99 × 11', r: 1089 },
    { t: '8^3 + 12 - 24', r: 500 },
    { t: '14 × 19', r: 266 },
    { t: '0.7 × 30', r: 21 },
    { t: '27% of 400', r: 108 },
    { t: '1/8 × 72 + 5', r: 14 },
    { t: '7% of 2100', r: 147 },
    { t: '42 × 6', r: 252 },
    { t: '1/4 of 96', r: 24 },
    { t: '296 - 74', r: 222 },
    { t: '296 - 75', r: 221 },
    { t: '150 + 96', r: 246 },
    { t: 'sqrt(225) × 5', r: 75 },
    { t: '0.5 × 150 + 8', r: 83 },
    { t: '52 × 3', r: 156 },
    { t: '2/3 of 342', r: 228 },
    { t: '6^3', r: 216 },
    { t: '146 - 8 × 9', r: 74 },
    { t: '285 - 24', r: 261 },
    { t: '16 × 49', r: 784 },
    { t: '69 × 4', r: 276 },
    { t: '84 × 3', r: 252 },
    { t: '19 - 23 + 17', r: 13 },
    { t: '75% of 76', r: 57 },
    { t: '312 - 67', r: 245 },
    { t: '0.9 × 720', r: 648 },
    { t: '72 ÷ 6 × 3', r: 36 },
    { t: '5% of 2500', r: 125 },
    { t: '5^3 + 12 - 36', r: 101 },
    { t: '121 ÷ 11 × 5', r: 55 },
    { t: '0.8 × 40 - 12 + 7', r: 27 },
    { t: '184 - 36', r: 148 },
    { t: '17 × 17', r: 289 },
    { t: '1024 - 83 + 7', r: 948 },
    { t: '1/3 × 81', r: 27 },
    { t: 'cubert(125)', r: 5 },
    { t: '288 ÷ 4', r: 72 },
    { t: '11% of 1500', r: 165 },
    { t: '78 + 89', r: 167 },
    { t: '1/4 × 64', r: 16 },
    { t: '6 × 20', r: 120 },
    { t: '(24 × 26) ÷ (24 × 2)', r: 13 },
    { t: '13 + 14 - 8', r: 19 },
    { t: '(23 × 26) ÷ (23 × 2)', r: 13 },
    { t: '21 × 10', r: 210 },
    { t: '19% of 1000', r: 190 },
    { t: '18^2', r: 324 },
    { t: '13^2', r: 169 },
    { t: '19^2', r: 361 },
    { t: '16^2', r: 256 },
    { t: '15^2', r: 225 },
    { t: '23^2', r: 529 },
    { t: '24^2', r: 576 },
    { t: '28^2', r: 784 },
    { t: '29^2', r: 841 },
    { t: '2^3', r: 8 },
    { t: '9^3', r: 729 },
    { t: '26^2', r: 676 },
    { t: '17^2', r: 289 },
    { t: '12^2', r: 144 },
    { t: '3^3', r: 27 },
    { t: '8^3', r: 512 },
    { t: '16 × 13', r: 208 },
    { t: '12 × 9', r: 108 },
    { t: '16 × 19', r: 304 },
    { t: '12 × 15', r: 180 },
    { t: '13 × 19', r: 247 },
    { t: '13 × 17', r: 221 },
    { t: '9 × 13', r: 117 },
    { t: '4 × 16', r: 64 },
    { t: '4^2', r: 16 },
    { t: '19 × 20', r: 380 },
    { t: '14 × 16', r: 224 },
    { t: '13 × 16', r: 208 },
    { t: '11 × 19', r: 209 },
    { t: '19 × 12', r: 228 },
    { t: '3 × 14', r: 42 },
    { t: '15 × 4', r: 60 },
    { t: '15 × 9', r: 135 },
    { t: '1/6 of 132', r: 22 },
    { t: '5 × 35', r: 175 },
    { t: '12% of 4800', r: 576 },
    { t: '17 - 24 + 29', r: 22 },
    { t: '165 × 2', r: 330, hint: 'Airbus lovers: 165 × 2 = 330.' },
    { t: '25 × 17', r: 425 },
    { t: '19 × 46', r: 874 },
    { t: '936 - 84 + 27', r: 879 },
    { t: '2/3 of 522', r: 348 },
    { t: '3/4 of 216', r: 162 },
    { t: '75% of 224', r: 168 },
    { t: '351 × 2/3', r: 234 },
    { t: '222 ÷ 3', r: 74 },
    { t: '9 - 14 + 17', r: 12 },
    { t: '3/4 × 56', r: 42 },
    { t: '18 × 16', r: 228 },
    { t: '432 ÷ 9', r: 48 },
    { t: '632 - 358', r: 274 },
    { t: '0.08 × 0.2', r: 0.016 },
    { t: 'sqrt(225) + 512', r: 527 },
    { t: '418 - 72', r: 346 },
    { t: 'sqrt(64) + 18', r: 26 },
    { t: '68 × 7', r: 476 },
    { t: '616 ÷ 8', r: 77 },
    { t: '18 × 32', r: 576 },
    { t: '0.2 × 760', r: 152 },
    { t: '75% of 1200', r: 900 },
    { t: '76 × 8', r: 608 },
    { t: '25^2', r: 625 },
    { t: '30^2', r: 900 },
    { t: '22^2', r: 484 },
    { t: 'sqrt(196)', r: 14 },
    { t: '14 × 14', r: 196 },
    { t: '7 × 12', r: 84 },
    { t: '2/3 × 552', r: 348 },
    { t: '2/3 × 351', r: 234 },
    { t: '374 + 76', r: 450 },
    { t: '1150 ÷ 46', r: 25 },
    { t: '2/3 × 381', r: 254 },
    { t: '17 × 19 - 123', r: 200 },
    { t: '420 ÷ 3/4', r: 560 },
    { t: '2/3 × 342', r: 228 },
    { t: '15 × 99 - 1000', r: 485 },
    { t: '3/4 × 216', r: 162 }
  ];

  var EFT_TASK_POOL = dedupeEftTasks(EFT_TASKS);

  var state = {
    mode: MODE_MATH,
    difficulty: 3,
    timeDifficulty: 'medium',
    taskCount: DEFAULT_MATH_TASK_COUNT,
    lastTaskCountByMode: {
      math: DEFAULT_MATH_TASK_COUNT,
      time: DEFAULT_TIME_TASK_COUNT
    },
    revealSolution: true,
    operatorFilter: defaultOperatorFilter(),
    currentIndex: 0,
    correctCount: 0,
    results: [],
    runId: null,
    runStartedAt: null,
    runFinishedAt: null,
    currentRunSaved: false,
    runHistory: [],
    currentTask: null,
    sequenceRun: 0,
    timerId: 0,
    deadline: 0,
    questionStartedAt: 0,
    inputShownAt: 0,
    answerInputRules: null,
    timeAnswerDigits: '',
    resolved: false,
    aborted: false
  };

  var els = {
    appTitle: document.getElementById('app-title'),
    setupPanel: document.getElementById('setup-panel'),
    setupForm: document.getElementById('setup-form'),
    modeButtons: Array.prototype.slice.call(document.querySelectorAll('[data-mode]')),
    mathDifficultyField: document.getElementById('math-difficulty-field'),
    timeDifficultyField: document.getElementById('time-difficulty-field'),
    timeDifficultyInputs: Array.prototype.slice.call(document.querySelectorAll('input[name="timeDifficulty"]')),
    operatorField: document.getElementById('operator-field'),
    timeOptions: document.getElementById('time-options'),
    revealSolution: document.getElementById('reveal-solution'),
    timeHelpToggle: document.getElementById('time-help-toggle'),
    timeHelpPanel: document.getElementById('time-help-panel'),
    taskCount: document.getElementById('task-count'),
    operatorInputs: Array.prototype.slice.call(document.querySelectorAll('input[name="operator"]')),
    trainingPanel: document.getElementById('training-panel'),
    currentNumber: document.getElementById('current-number'),
    totalNumber: document.getElementById('total-number'),
    liveScore: document.getElementById('live-score'),
    timerLabel: document.getElementById('timer-label'),
    timerValue: document.getElementById('timer-value'),
    timerBar: document.getElementById('timer-bar'),
    flashToken: document.getElementById('flash-token'),
    stageNote: document.getElementById('stage-note'),
    answerForm: document.getElementById('answer-form'),
    answerRow: document.querySelector('.answer-row'),
    answerInput: document.getElementById('answer-input'),
    timeAnswer: document.getElementById('time-answer'),
    timeDigitRow: document.getElementById('time-digit-row'),
    timeDigitInputs: Array.prototype.slice.call(document.querySelectorAll('[data-time-digit]')),
    skipRunButton: document.getElementById('skip-run-button'),
    restartRunButton: document.getElementById('restart-run-button'),
    feedbackPanel: document.getElementById('feedback-panel'),
    resultKicker: document.getElementById('result-kicker'),
    resultTitle: document.getElementById('result-title'),
    resultExpression: document.getElementById('result-expression'),
    resultAnswer: document.getElementById('result-answer'),
    resultTime: document.getElementById('result-time'),
    strategyText: document.getElementById('strategy-text'),
    nextButton: document.getElementById('next-button'),
    summaryPanel: document.getElementById('summary-panel'),
    summaryTitle: document.getElementById('summary-title'),
    summaryPercent: document.getElementById('summary-percent'),
    summaryCorrect: document.getElementById('summary-correct'),
    summaryAverage: document.getElementById('summary-average'),
    resultList: document.getElementById('result-list'),
    scorePill: document.querySelector('.score-pill'),
    historyCount: document.getElementById('history-count'),
    historyAverage: document.getElementById('history-average'),
    historyBest: document.getElementById('history-best'),
    historyList: document.getElementById('history-list'),
    historyExport: document.getElementById('history-export'),
    historyClear: document.getElementById('history-clear'),
    exportJson: document.getElementById('export-json'),
    exportCsv: document.getElementById('export-csv'),
    restartButton: document.getElementById('restart-button')
  };

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function weightedChoice(weights) {
    var entries = Object.keys(weights);
    var total = entries.reduce(function (sum, key) {
      return sum + weights[key];
    }, 0);
    var roll = Math.random() * total;

    for (var i = 0; i < entries.length; i += 1) {
      roll -= weights[entries[i]];
      if (roll <= 0) {
        return entries[i];
      }
    }

    return entries[entries.length - 1];
  }

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = randInt(0, i);
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function isInteger(value) {
    return Number.isFinite(value) && Math.round(value) === value;
  }

  function formatNumber(value) {
    return String(Math.round(value));
  }

  function formatSeconds(value) {
    return value.toFixed(value >= 10 ? 0 : 1).replace('.', ',') + 's';
  }

  function normalizeMode(value) {
    return value === MODE_TIME ? MODE_TIME : MODE_MATH;
  }

  function normalizeTimeDifficulty(value) {
    return TIME_LEVELS[value] ? value : 'medium';
  }

  function isTimeMode() {
    return state.mode === MODE_TIME;
  }

  function isTimeTask(task) {
    return Boolean(task && task.isTime);
  }

  function getDefaultTaskCount(mode) {
    return normalizeMode(mode) === MODE_TIME ? DEFAULT_TIME_TASK_COUNT : DEFAULT_MATH_TASK_COUNT;
  }

  function readTaskCountInput() {
    return clamp(parseInt(els.taskCount.value || String(getDefaultTaskCount(state.mode)), 10), 1, 100);
  }

  function storeCurrentTaskCount() {
    state.taskCount = readTaskCountInput();
    state.lastTaskCountByMode[state.mode] = state.taskCount;
  }

  function setMode(mode, options) {
    var nextMode = normalizeMode(mode);
    var opts = options || {};

    if (!opts.skipStore) {
      storeCurrentTaskCount();
    }

    state.mode = nextMode;
    state.taskCount = state.lastTaskCountByMode[nextMode] || getDefaultTaskCount(nextMode);
    els.taskCount.value = state.taskCount;
    syncModeControls();

    if (!opts.skipSave) {
      saveSettings();
    }
  }

  function syncModeControls() {
    var timeMode = isTimeMode();

    if (els.appTitle) {
      els.appTitle.textContent = timeMode ? 'Uhrzeitrechnen' : 'Kopfrechnen';
    }

    els.modeButtons.forEach(function (button) {
      var active = button.getAttribute('data-mode') === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (els.mathDifficultyField) {
      els.mathDifficultyField.hidden = timeMode;
    }
    if (els.timeDifficultyField) {
      els.timeDifficultyField.hidden = !timeMode;
    }
    if (els.operatorField) {
      els.operatorField.hidden = timeMode;
    }
    if (els.timeOptions) {
      els.timeOptions.hidden = !timeMode;
    }
    if (els.revealSolution) {
      els.revealSolution.checked = state.revealSolution;
    }

    els.timeDifficultyInputs.forEach(function (input) {
      input.checked = input.value === state.timeDifficulty;
    });
  }

  function defaultOperatorFilter() {
    var filter = {};
    FILTER_KEYS.forEach(function (key) {
      filter[key] = true;
    });
    return filter;
  }

  function copyOperatorFilter(filter) {
    var normalized = normalizeOperatorFilter(filter);
    var copy = {};
    FILTER_KEYS.forEach(function (key) {
      copy[key] = normalized[key];
    });
    return copy;
  }

  function normalizeOperatorFilter(filter) {
    var normalized = {};
    FILTER_KEYS.forEach(function (key) {
      normalized[key] = !filter || filter[key] !== false;
    });

    if (!hasActiveBasicOperator(normalized)) {
      normalized.add = true;
    }

    return normalized;
  }

  function hasActiveBasicOperator(filter) {
    return BASIC_FILTER_KEYS.some(function (key) {
      return Boolean(filter[key]);
    });
  }

  function readOperatorFilterFromForm() {
    var filter = {};

    if (!els.operatorInputs.length) {
      return defaultOperatorFilter();
    }

    FILTER_KEYS.forEach(function (key) {
      filter[key] = false;
    });

    els.operatorInputs.forEach(function (input) {
      filter[input.value] = input.checked;
    });

    return normalizeOperatorFilter(filter);
  }

  function applyOperatorFilterToForm(filter) {
    var normalized = normalizeOperatorFilter(filter);

    els.operatorInputs.forEach(function (input) {
      input.checked = normalized[input.value] !== false;
    });

    syncOperatorControls();
  }

  function syncOperatorControls() {
    var basicInputs = els.operatorInputs.filter(function (input) {
      return input.hasAttribute('data-basic-operator');
    });
    var checkedBasics = basicInputs.filter(function (input) {
      return input.checked;
    });

    if (!checkedBasics.length && basicInputs.length) {
      basicInputs[0].checked = true;
      checkedBasics = [basicInputs[0]];
    }

    basicInputs.forEach(function (input) {
      input.disabled = input.checked && checkedBasics.length === 1;
    });
  }

  function getActiveOps(level, filter) {
    var cfg = LEVELS[level];
    var normalized = normalizeOperatorFilter(filter || state.operatorFilter);
    var active = {};

    Object.keys(cfg.ops).forEach(function (op) {
      if (normalized[OP_FILTER_KEYS[op]]) {
        active[op] = cfg.ops[op];
      }
    });

    if (!Object.keys(active).length) {
      active['+'] = 100;
    }

    return active;
  }

  function getActiveTermTypes(level, filter) {
    var cfg = LEVELS[level];
    var normalized = normalizeOperatorFilter(filter || state.operatorFilter);
    var active = {
      plain: cfg.termTypes.plain || 100
    };

    Object.keys(cfg.termTypes).forEach(function (type) {
      if (type !== 'plain' && normalized[TERM_FILTER_KEYS[type]]) {
        active[type] = cfg.termTypes[type];
      }
    });

    return active;
  }

  function dedupeEftTasks(tasks) {
    var seen = {};
    return tasks.filter(function (task) {
      var key = normalizeEftKey(task.t) + '=' + String(task.r);
      if (seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function normalizeEftKey(text) {
    return String(text)
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/×/g, 'x')
      .replace(/÷/g, '/')
      .replace(/³/g, '3')
      .replace(/²/g, '2');
  }

  function decimalPlaces(value) {
    var text = String(value);
    if (text.indexOf('e-') !== -1) {
      return parseInt(text.split('e-')[1], 10);
    }
    var dot = text.indexOf('.');
    return dot === -1 ? 0 : text.length - dot - 1;
  }

  function formatAnswer(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'leer';
    }
    return String(value).replace('.', ',');
  }

  function formatResultAnswer(result, value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'leer';
    }
    if (result && result.mode === MODE_TIME) {
      return formatClock(value);
    }
    return formatAnswer(value);
  }

  function getEftTolerance(task) {
    if (!task || !task.isEft) {
      return 0;
    }

    var precision = task.answerPrecision || 0;
    if (precision <= 0) {
      return 0.0000001;
    }

    return Math.pow(10, -precision) / 2 + 0.0000001;
  }

  function getAnswerInputRules(task) {
    if (isTimeTask(task)) {
      return {
        type: MODE_TIME,
        allowDecimal: false,
        digitLimit: 4,
        maxLength: 5
      };
    }

    var answer = task ? task.answer : 0;
    var allowDecimal = decimalPlaces(answer) > 0;
    var digitLimit = Math.max(6, countAnswerDigits(answer));

    return {
      allowDecimal: allowDecimal,
      digitLimit: digitLimit,
      maxLength: digitLimit + (allowDecimal ? 1 : 0)
    };
  }

  function countAnswerDigits(value) {
    var precision = decimalPlaces(value);
    var text = precision > 0
      ? Math.abs(Number(value)).toFixed(precision)
      : String(Math.abs(Math.round(Number(value) || 0)));
    var digits = text.match(/\d/g);

    return digits ? digits.length : 1;
  }

  function sanitizeAnswerInput(value, rules) {
    var inputRules = rules || getAnswerInputRules(state.currentTask);
    var text = String(value || '');
    var cleaned = '';
    var digitCount = 0;
    var hasDecimal = false;

    if (inputRules.type === MODE_TIME) {
      return sanitizeTimeAnswerInput(text);
    }

    for (var i = 0; i < text.length; i += 1) {
      var ch = text.charAt(i);

      if (/\d/.test(ch)) {
        if (digitCount < inputRules.digitLimit) {
          cleaned += ch;
          digitCount += 1;
        }
        continue;
      }

      if (
        inputRules.allowDecimal &&
        (ch === ',' || ch === '.') &&
        !hasDecimal &&
        digitCount > 0
      ) {
        cleaned += ch;
        hasDecimal = true;
      }
    }

    return cleaned;
  }

  function configureAnswerInput(task) {
    var rules = getAnswerInputRules(task);

    state.answerInputRules = rules;
    els.answerInput.value = '';
    state.timeAnswerDigits = '';

    if (isTimeTask(task)) {
      els.answerInput.setAttribute('inputmode', 'numeric');
      els.answerInput.setAttribute('maxlength', String(rules.maxLength));
      els.answerInput.setAttribute('pattern', '[0-9:]*');
      if (els.answerRow) {
        els.answerRow.hidden = true;
      }
      if (els.timeAnswer) {
        els.timeAnswer.hidden = false;
      }
      clearTimeAnswerFields();
      return;
    }

    if (els.answerRow) {
      els.answerRow.hidden = false;
    }
    if (els.timeAnswer) {
      els.timeAnswer.hidden = true;
    }
    els.answerInput.setAttribute('inputmode', rules.allowDecimal ? 'decimal' : 'numeric');
    els.answerInput.setAttribute('maxlength', String(rules.maxLength));
    els.answerInput.setAttribute('pattern', rules.allowDecimal ? '[0-9]+([,.][0-9]+)?' : '[0-9]*');
  }

  function handleAnswerInput() {
    var rules = state.answerInputRules || getAnswerInputRules(state.currentTask);
    var sanitized = sanitizeAnswerInput(els.answerInput.value, rules);

    if (els.answerInput.value !== sanitized) {
      els.answerInput.value = sanitized;
    }

    if (rules.type === MODE_TIME) {
      fillTimeDigitsFrom(0, sanitized, false);
    }
  }

  function sanitizeTimeAnswerInput(value) {
    var text = String(value || '');
    var cleaned = '';
    var digitCount = 0;
    var hasColon = false;

    for (var i = 0; i < text.length; i += 1) {
      var ch = text.charAt(i);

      if (/\d/.test(ch)) {
        if (digitCount < 4) {
          cleaned += ch;
          digitCount += 1;
        }
        continue;
      }

      if (ch === ':' && !hasColon && digitCount > 0 && digitCount <= 2) {
        cleaned += ch;
        hasColon = true;
      }
    }

    return cleaned;
  }

  function getTimeAnswerDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 4);
  }

  function getTimeDigitIndex(input) {
    return els.timeDigitInputs.indexOf(input);
  }

  function getTimeDigitValues() {
    return els.timeDigitInputs.map(function (input) {
      return getTimeAnswerDigits(input.value).slice(0, 1);
    });
  }

  function syncTimeAnswerState(forceInvalid) {
    var values = getTimeDigitValues();
    var complete = values.every(Boolean);
    var digits = values.join('');
    var invalid = complete && parseTimeAnswer(digits) === null;

    state.timeAnswerDigits = digits;
    els.answerInput.value = complete ? digits : '';

    if (els.timeDigitRow) {
      els.timeDigitRow.classList.toggle('is-invalid', Boolean(forceInvalid) || invalid);
    }
    els.timeDigitInputs.forEach(function (input) {
      input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    });
  }

  function clearTimeAnswerFields() {
    state.timeAnswerDigits = '';
    els.answerInput.value = '';
    els.timeDigitInputs.forEach(function (input) {
      input.value = '';
      input.setAttribute('aria-invalid', 'false');
    });
    if (els.timeDigitRow) {
      els.timeDigitRow.classList.remove('is-invalid');
    }
  }

  function focusTimeDigit(index) {
    var input = els.timeDigitInputs[clamp(index, 0, Math.max(0, els.timeDigitInputs.length - 1))];

    if (!input) {
      return;
    }

    try {
      input.focus({ preventScroll: true });
    } catch (error) {
      input.focus();
    }
    if (typeof input.select === 'function') {
      input.select();
    }
  }

  function setTimeDigitAt(index, digit, advance) {
    var input = els.timeDigitInputs[index];

    if (!input || !/^\d$/.test(String(digit))) {
      return;
    }

    input.value = String(digit);
    syncTimeAnswerState(false);
    if (advance && index < els.timeDigitInputs.length - 1) {
      focusTimeDigit(index + 1);
    }
  }

  function fillTimeDigitsFrom(startIndex, value, focusAfter) {
    var digits = getTimeAnswerDigits(value);
    var index = startIndex;
    var lastIndex;

    if (!digits) {
      syncTimeAnswerState(false);
      return;
    }

    for (var i = 0; i < digits.length && index < els.timeDigitInputs.length; i += 1) {
      els.timeDigitInputs[index].value = digits.charAt(i);
      lastIndex = index;
      index += 1;
    }

    syncTimeAnswerState(false);
    if (focusAfter !== false && lastIndex !== undefined) {
      focusTimeDigit(Math.min(lastIndex + 1, els.timeDigitInputs.length - 1));
    }
  }

  function isTimeAnswerActive() {
    return isTimeTask(state.currentTask) && !els.answerForm.hidden && !state.resolved;
  }

  function handleTimeDigitFocus(event) {
    if (typeof event.currentTarget.select === 'function') {
      event.currentTarget.select();
    }
  }

  function handleTimeDigitInput(event) {
    var input = event.currentTarget;
    var index = getTimeDigitIndex(input);
    var digits = getTimeAnswerDigits(input.value);

    if (index < 0) {
      return;
    }

    if (!digits) {
      input.value = '';
      syncTimeAnswerState(false);
      return;
    }

    if (digits.length === 1) {
      input.value = digits;
      syncTimeAnswerState(false);
      if (isTimeAnswerActive() && index < els.timeDigitInputs.length - 1) {
        focusTimeDigit(index + 1);
      }
      return;
    }

    input.value = '';
    fillTimeDigitsFrom(index, digits, true);
  }

  function handleTimeDigitPaste(event) {
    var index = getTimeDigitIndex(event.currentTarget);
    var pasted = event.clipboardData ? event.clipboardData.getData('text') : '';

    if (index < 0) {
      return;
    }

    event.preventDefault();
    fillTimeDigitsFrom(index, pasted, true);
  }

  function handleTimeDigitKeydown(event) {
    var input = event.currentTarget;
    var index = getTimeDigitIndex(input);

    if (!isTimeAnswerActive() || index < 0 || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      setTimeDigitAt(index, event.key, true);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (input.value) {
        input.value = '';
        syncTimeAnswerState(false);
      } else if (index > 0) {
        els.timeDigitInputs[index - 1].value = '';
        syncTimeAnswerState(false);
        focusTimeDigit(index - 1);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      input.value = '';
      syncTimeAnswerState(false);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTimeDigit(Math.max(0, index - 1));
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTimeDigit(Math.min(els.timeDigitInputs.length - 1, index + 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      submitAnswer(false);
    }
  }

  function shouldUseEft(level, filter) {
    var normalized = normalizeOperatorFilter(filter || state.operatorFilter);
    return normalized.eft && Math.random() < EFT_CHANCE[level];
  }

  function makeEftTask(level, filter) {
    var cfg = LEVELS[level];
    var entry = EFT_TASK_POOL[randInt(0, EFT_TASK_POOL.length - 1)];
    var precision = decimalPlaces(entry.r);
    var sequence = buildEftSequence(entry.t);
    var task = {
      level: level,
      levelName: cfg.name,
      source: 'EFT',
      isEft: true,
      start: null,
      steps: [],
      answer: entry.r,
      answerPrecision: precision,
      expression: entry.t,
      operatorFilter: copyOperatorFilter(filter),
      sequence: sequence,
      eftHint: entry.hint || ''
    };

    task.pacing = computeTaskPacing(task);
    task.timeLimit = computeEftTimeLimit(level, entry, task.pacing);
    task.strategy = buildEftStrategy(task);
    return task;
  }

  function buildEftSequence(expression) {
    var text = String(expression || '').trim();
    var arrowParts;
    var ofMatch;
    var arithmetic;

    if (!text) {
      return [''];
    }

    arrowParts = text.split(/\s*->\s*/);
    if (arrowParts.length > 1) {
      return buildEftSequence(arrowParts[0]).concat(arrowParts.slice(1).filter(Boolean).map(function (part) {
        return '→ ' + part.trim();
      }));
    }

    arithmetic = splitTopLevelEftArithmetic(text);
    if (arithmetic.length > 1) {
      return arithmetic;
    }

    ofMatch = text.match(/^(.+?)\s+of\s+(.+)$/i);
    if (ofMatch) {
      return [ofMatch[1].trim(), 'of ' + ofMatch[2].trim()].filter(Boolean);
    }

    return [text];
  }

  function splitTopLevelEftArithmetic(text) {
    var tokens = [];
    var current = '';
    var depth = 0;
    var i;
    var ch;

    for (i = 0; i < text.length; i += 1) {
      ch = text.charAt(i);

      if (ch === '(') {
        depth += 1;
        current += ch;
        continue;
      }

      if (ch === ')') {
        depth = Math.max(0, depth - 1);
        current += ch;
        continue;
      }

      if (depth === 0 && isTopLevelEftOperator(ch, text, i)) {
        if (current.trim()) {
          tokens.push(formatEftSequenceToken(current));
        }
        current = ch;
        continue;
      }

      current += ch;
    }

    if (current.trim()) {
      tokens.push(formatEftSequenceToken(current));
    }

    return tokens.filter(Boolean);
  }

  function isTopLevelEftOperator(ch, text, index) {
    if (ch === '+' || ch === '×' || ch === '÷') {
      return index > 0;
    }

    if (ch === '-') {
      return index > 0 && text.charAt(index - 1) !== '>';
    }

    return false;
  }

  function formatEftSequenceToken(token) {
    return token
      .trim()
      .replace(/^([+\-×÷])\s+/, '$1')
      .replace(/\s+/g, ' ');
  }

  function computeEftTimeLimit(level, entry, pacing) {
    var limits = {
      1: [12, 18],
      2: [18, 25],
      3: [25, 35],
      4: [35, 50],
      5: [50, 75]
    };
    var displaySeconds = pacing ? pacing.totalDisplayMs / 1000 : 0;
    var sequenceLength = pacing ? pacing.flashMsByToken.length : buildEftSequence(entry.t).length;
    var base = LEVELS[level].baseTime + 4 + String(entry.t).length * 0.45 + Math.max(0, sequenceLength - 1) * 1.8;
    if (/[√]|sqrt|cubert|\^|%|\/|÷|of/.test(entry.t)) {
      base += 4;
    }
    if (String(entry.r).indexOf('.') !== -1) {
      base += 3;
    }
    return Math.round(clamp(Math.max(base, displaySeconds + 7), limits[level][0], Math.max(limits[level][1], displaySeconds + 14)));
  }

  function scoreStepComplexity(step, token, context) {
    var text = String(token || '');
    var complexity = 1;
    var digitCount = (text.match(/\d/g) || []).length;
    var maxNumberLength = getMaxNumberLength(text);
    var level = context && context.level ? context.level : 1;
    var index = context && context.index ? context.index : 0;

    complexity += Math.max(0, digitCount - 2) * 0.22;
    complexity += Math.max(0, maxNumberLength - 2) * 0.55;
    complexity += index * 0.22;
    complexity += Math.max(0, level - 2) * 0.08;

    if (/^[+\-]/.test(text)) {
      complexity += 0.35;
    }
    if (/×/.test(text)) {
      complexity += 1.15;
    }
    if (/÷/.test(text)) {
      complexity += 1.35;
    }
    if (/%|of/i.test(text)) {
      complexity += 1.2;
    }
    if (/\^|²|³|sqrt|cubert|√|∛|sin/i.test(text)) {
      complexity += 1.15;
    }
    if (/[/.]/.test(text)) {
      complexity += 0.85;
    }
    if (/[()]/.test(text)) {
      complexity += 0.65;
    }
    if (text.length > 8) {
      complexity += Math.min(1.6, (text.length - 8) * 0.11);
    }

    if (step) {
      complexity += OP_COST[step.op] || 0;
      complexity += (TERM_COST[step.term.type] || 0) * 0.8;
      complexity += Math.max(0, getDigitLength(step.before) - 2) * 0.45;
      complexity += Math.max(0, getDigitLength(step.after) - 2) * 0.55;

      if ((step.op === '×' || step.op === '÷') && step.term.value >= 10) {
        complexity += 0.9;
      }
      if ((step.op === '×' || step.op === '÷') && step.before >= 100) {
        complexity += 1.1;
      }
    }

    if (context && context.isEft) {
      complexity += 0.55;
    }

    return complexity;
  }

  function computeTaskPacing(task) {
    var cfg = LEVELS[task.level];
    var flashMsByToken = [];
    var gapMsByToken = [];
    var totalComplexity = 0;

    task.sequence.forEach(function (token, index) {
      var step = task.steps && index > 0 ? task.steps[index - 1] : null;
      var complexity = scoreStepComplexity(step, token, {
        index: index,
        level: task.level,
        isEft: task.isEft,
        sequenceLength: task.sequence.length
      });
      var flash = cfg.flashMs + (complexity - 2) * 360;
      var gapRatio = clamp(0.25 + complexity * 0.018, 0.25, 0.35);
      var gap;

      if (index === 0 && !task.isEft) {
        flash -= 180;
      }

      flash = Math.round(clamp(flash, PACING_LIMITS.minFlashMs, PACING_LIMITS.maxFlashMs));
      gap = Math.round(clamp(flash * gapRatio, PACING_LIMITS.minGapMs, PACING_LIMITS.maxGapMs));

      flashMsByToken.push(flash);
      gapMsByToken.push(gap);
      totalComplexity += complexity;
    });

    return {
      flashMsByToken: flashMsByToken,
      gapMsByToken: gapMsByToken,
      complexityScore: Number((totalComplexity / Math.max(1, task.sequence.length)).toFixed(2)),
      totalDisplayMs: flashMsByToken.reduce(function (sum, value, index) {
        return sum + value + (gapMsByToken[index] || 0);
      }, 0)
    };
  }

  function getDigitLength(value) {
    return String(Math.abs(Math.round(value))).length;
  }

  function getMaxNumberLength(text) {
    var matches = String(text).match(/\d+(?:[.,]\d+)?/g) || [];
    return matches.reduce(function (max, match) {
      return Math.max(max, match.replace(/[.,]/g, '').length);
    }, 0);
  }

  function isCorrectAnswer(task, parsed) {
    if (parsed === null) {
      return false;
    }
    if (isTimeTask(task)) {
      return parsed === task.answer;
    }
    if (task && task.isEft) {
      return Math.abs(parsed - task.answer) <= getEftTolerance(task);
    }
    return parsed === task.answer;
  }

  function buildEftStrategy(task) {
    var text = task.expression;
    var hints = [];

    if (task.eftHint) {
      hints.push(task.eftHint);
    }
    if (/75%/.test(text)) {
      hints.push('75% ist 3/4: erst vierteln, dann mal 3.');
    } else if (/40%/.test(text)) {
      hints.push('40% ist 50% minus 10%.');
    } else if (/60%/.test(text)) {
      hints.push('60% ist 50% plus 10%.');
    } else if (/49%/.test(text)) {
      hints.push('49% ist 50% minus 1%.');
    } else if (/51%/.test(text)) {
      hints.push('51% ist 50% plus 1%.');
    } else if (/%/.test(text)) {
      hints.push('Prozente in 10%, 1%, Hälfte oder Viertel zerlegen.');
    }

    if (/× 5|×5/.test(text)) {
      hints.push('×5 geht als halbieren und dann ×10.');
    }
    if (/1[0-9] × 1[0-9]|1[0-9]×1[0-9]/.test(text)) {
      hints.push('Bei 10-19: erste Zahl plus Einer der zweiten, ×10, dann Einerprodukt addieren.');
    }
    if (/2[0-9] × 2[0-9]|2[0-9]×2[0-9]/.test(text)) {
      hints.push('Bei 20-29: erste Zahl plus Einer der zweiten, ×20, dann Einerprodukt addieren.');
    }
    if (/(\d+)\s*×\s*(\d+)/.test(text)) {
      hints.push('Liegt ein Faktor nahe einer runden Zahl, rechne rund und korrigiere.');
    }
    if (/\^2|sqrt|√/.test(text)) {
      hints.push('Quadrate und Wurzeln bis 30 sicher abrufen; nahe Quadrate über ±1 oder ±2 korrigieren.');
    }
    if (/\^3|cubert|∛/.test(text)) {
      hints.push('Kubikzahlen 1³ bis 10³ auswendig halten.');
    }
    if (/÷\s*7|÷ 7|\/7/.test(text)) {
      hints.push('Bei 7 hilft oft die Gegenprobe über Multiplikation.');
    }
    if (!hints.length) {
      hints.push('EFT-Aufgabe: erkenne das Muster zuerst und rechne dann in kleinen, gespeicherten Bausteinen.');
    }

    return hints.slice(0, 3).join(' ');
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        mode: state.mode,
        difficulty: state.difficulty,
        timeDifficulty: state.timeDifficulty,
        taskCount: state.taskCount,
        mathTaskCount: state.lastTaskCountByMode.math,
        timeTaskCount: state.lastTaskCountByMode.time,
        revealSolution: state.revealSolution,
        operatorFilter: copyOperatorFilter(state.operatorFilter)
      }));
    } catch (error) {
      // The app works without localStorage; exports are the durable result.
    }
  }

  function restoreSettings() {
    var settings = getSettings();
    var mode = normalizeMode(settings.mode);
    var difficulty = clamp(parseInt(settings.difficulty || 3, 10), 1, 5);
    var legacyTaskCount = clamp(parseInt(settings.taskCount || DEFAULT_MATH_TASK_COUNT, 10), 1, 100);
    var mathTaskCount = clamp(parseInt(settings.mathTaskCount || (mode === MODE_MATH ? legacyTaskCount : DEFAULT_MATH_TASK_COUNT), 10), 1, 100);
    var timeTaskCount = clamp(parseInt(settings.timeTaskCount || (mode === MODE_TIME ? legacyTaskCount : DEFAULT_TIME_TASK_COUNT), 10), 1, 100);
    var operatorFilter = normalizeOperatorFilter(settings.operatorFilter);
    var difficultyInput = document.querySelector('input[name="difficulty"][value="' + difficulty + '"]');

    state.mode = mode;
    state.difficulty = difficulty;
    state.timeDifficulty = normalizeTimeDifficulty(settings.timeDifficulty);
    state.lastTaskCountByMode.math = mathTaskCount;
    state.lastTaskCountByMode.time = timeTaskCount;
    state.taskCount = mode === MODE_TIME ? timeTaskCount : mathTaskCount;
    state.revealSolution = settings.revealSolution !== false;
    state.operatorFilter = operatorFilter;
    els.taskCount.value = state.taskCount;

    if (difficultyInput) {
      difficultyInput.checked = true;
    }

    applyOperatorFilterToForm(operatorFilter);
    syncModeControls();
  }

  function loadRunHistory() {
    try {
      var parsed = JSON.parse(localStorage.getItem(RUN_HISTORY_KEY) || '[]');
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isRunRecord).slice(0, RUN_HISTORY_LIMIT);
    } catch (error) {
      return [];
    }
  }

  function persistRunHistory(history) {
    try {
      localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(history.slice(0, RUN_HISTORY_LIMIT)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearStoredRunHistory() {
    try {
      localStorage.removeItem(RUN_HISTORY_KEY);
    } catch (error) {
      // The visible in-memory history is still cleared below.
    }
  }

  function isRunRecord(record) {
    return Boolean(
      record &&
      typeof record === 'object' &&
      record.id &&
      record.startedAt &&
      record.finishedAt &&
      Array.isArray(record.results)
    );
  }

  function createRunId() {
    return 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getRunStats(results, plannedTaskCount, aborted) {
    var completedCount = results.length;
    var denominator = aborted ? completedCount : plannedTaskCount;
    var correct = results.filter(function (result) {
      return result.correct;
    }).length;
    var average = completedCount
      ? results.reduce(function (sum, result) {
        return sum + result.timeUsed;
      }, 0) / completedCount
      : 0;

    return {
      correct: correct,
      denominator: denominator,
      percent: denominator ? Math.round((correct / denominator) * 100) : 0,
      averageTimeSeconds: Number(average.toFixed(2))
    };
  }

  function makeRunRecord(finishedAt) {
    var completedAt = finishedAt || new Date().toISOString();
    var stats = getRunStats(state.results, state.taskCount, state.aborted);
    var timeMode = isTimeMode();

    return {
      app: 'kopfrechnen',
      version: 1,
      mode: state.mode,
      id: state.runId || createRunId(),
      startedAt: state.runStartedAt || completedAt,
      finishedAt: completedAt,
      difficulty: state.difficulty,
      timeDifficulty: timeMode ? state.timeDifficulty : null,
      levelName: timeMode ? TIME_LEVELS[state.timeDifficulty].name : LEVELS[state.difficulty].name,
      taskCount: state.taskCount,
      plannedTaskCount: state.taskCount,
      completedTaskCount: state.results.length,
      aborted: state.aborted,
      revealSolution: state.revealSolution,
      operatorFilter: timeMode ? null : copyOperatorFilter(state.operatorFilter),
      correct: stats.correct,
      percent: stats.percent,
      averageTimeSeconds: stats.averageTimeSeconds,
      results: cloneData(state.results)
    };
  }

  function saveCurrentRunToHistory() {
    var record;
    var history;

    if (state.currentRunSaved) {
      return;
    }

    state.currentRunSaved = true;
    if (!state.results.length) {
      renderRunHistory();
      return;
    }

    state.runFinishedAt = new Date().toISOString();
    record = makeRunRecord(state.runFinishedAt);
    history = [record].concat(loadRunHistory().filter(function (item) {
      return item.id !== record.id;
    })).slice(0, RUN_HISTORY_LIMIT);

    state.runHistory = history;
    persistRunHistory(history);
    renderRunHistory();
  }

  function renderRunHistory() {
    var history = state.runHistory || [];
    var averagePercent = history.length
      ? Math.round(history.reduce(function (sum, run) {
        return sum + (Number(run.percent) || 0);
      }, 0) / history.length)
      : 0;
    var bestPercent = history.length
      ? history.reduce(function (best, run) {
        return Math.max(best, Number(run.percent) || 0);
      }, 0)
      : 0;

    els.historyCount.textContent = formatNumber(history.length);
    els.historyAverage.textContent = formatNumber(averagePercent) + '%';
    els.historyBest.textContent = formatNumber(bestPercent) + '%';
    els.historyList.innerHTML = '';
    els.historyExport.disabled = !history.length;
    els.historyClear.disabled = !history.length;

    if (!history.length) {
      var empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = 'Noch keine gespeicherten Durchgänge.';
      els.historyList.appendChild(empty);
      return;
    }

    history.forEach(function (run) {
      var item = document.createElement('article');
      var mark = document.createElement('span');
      var copy = document.createElement('div');
      var title = document.createElement('strong');
      var sub = document.createElement('span');
      var time = document.createElement('span');
      var completed = run.completedTaskCount || (run.results ? run.results.length : 0);
      var denominator = run.aborted ? completed : run.plannedTaskCount;

      item.className = 'history-item';
      mark.className = 'result-mark' + (run.percent >= 80 ? '' : ' is-wrong');
      mark.textContent = formatNumber(run.percent || 0) + '%';
      copy.className = 'history-copy';
      title.textContent = formatRunDate(run.finishedAt) + ' · ' + getRunModeTitle(run);
      sub.textContent = formatNumber(run.correct || 0) + '/' + formatNumber(denominator || 0) +
        ' richtig · Schnitt ' + formatSeconds(run.averageTimeSeconds || 0) +
        (run.aborted ? ' · abgebrochen' : '');
      time.className = 'result-time';
      time.textContent = formatNumber(completed) + ' Aufgaben';

      copy.appendChild(title);
      copy.appendChild(sub);
      item.appendChild(mark);
      item.appendChild(copy);
      item.appendChild(time);
      els.historyList.appendChild(item);
    });
  }

  function getRunModeTitle(run) {
    if (run && run.mode === MODE_TIME) {
      var key = normalizeTimeDifficulty(run.timeDifficulty);
      return 'Uhrzeit · ' + TIME_LEVELS[key].name;
    }

    return 'Kopfrechnen · Level ' + formatNumber((run && run.difficulty) || 0);
  }

  function formatRunDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Unbekannt';
    }

    try {
      return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function makePlainTerm(level, forcedValue) {
    var cfg = LEVELS[level];
    var value = forcedValue || randInt(cfg.plain[0], cfg.plain[1]);
    return {
      type: 'plain',
      value: value,
      text: formatNumber(value),
      tactic: plainTermTactic(value)
    };
  }

  function makeSquareTerm(level) {
    var ranges = {
      2: [2, 9],
      3: [4, 15],
      4: [5, 20],
      5: [8, 25]
    };
    var range = ranges[level] || [2, 9];
    var base = randInt(range[0], range[1]);
    return {
      type: 'square',
      base: base,
      value: base * base,
      text: formatNumber(base) + '²',
      tactic: squareTactic(base)
    };
  }

  function makeSqrtTerm(level) {
    var ranges = {
      3: [4, 15],
      4: [6, 25],
      5: [8, 35]
    };
    var range = ranges[level] || [4, 12];
    var root = randInt(range[0], range[1]);
    return {
      type: 'sqrt',
      root: root,
      value: root,
      text: '√' + formatNumber(root * root),
      tactic: '√' + formatNumber(root * root) + ' ist ' + formatNumber(root) + ', weil ' + formatNumber(root) + '² genau ' + formatNumber(root * root) + ' ergibt.'
    };
  }

  function makeCubeTerm(level) {
    var range = level >= 5 ? [3, 12] : [2, 10];
    var root = randInt(range[0], range[1]);
    return {
      type: 'cube',
      root: root,
      value: root,
      text: '∛' + formatNumber(root * root * root),
      tactic: 'Bei Kubikwurzeln helfen die Grundwürfel: ' + formatNumber(root) + '³ = ' + formatNumber(root * root * root) + ', also ∛' + formatNumber(root * root * root) + ' = ' + formatNumber(root) + '.'
    };
  }

  function makePowerTerm(level) {
    var options = level >= 5
      ? [{ base: 2, exp: 5 }, { base: 3, exp: 4 }, { base: 4, exp: 3 }, { base: 5, exp: 3 }, { base: 6, exp: 3 }, { base: 11, exp: 2 }, { base: 12, exp: 2 }]
      : [{ base: 2, exp: 4 }, { base: 3, exp: 3 }, { base: 4, exp: 3 }, { base: 5, exp: 3 }, { base: 7, exp: 2 }, { base: 8, exp: 2 }, { base: 9, exp: 2 }];
    var chosen = options[randInt(0, options.length - 1)];
    var value = Math.pow(chosen.base, chosen.exp);
    return {
      type: 'power',
      base: chosen.base,
      exp: chosen.exp,
      value: value,
      text: formatNumber(chosen.base) + '^' + formatNumber(chosen.exp),
      tactic: formatNumber(chosen.base) + '^' + formatNumber(chosen.exp) + ' baust du als kurze Kette: ' + powerChain(chosen.base, chosen.exp) + '.'
    };
  }

  function makePercentTerm(level) {
    var percents = level >= 5 ? [5, 10, 20, 25, 50, 75] : [10, 20, 25, 50, 75];
    var percent = percents[randInt(0, percents.length - 1)];
    var baseRange = level >= 5 ? [40, 360] : [20, 200];
    var base;
    var value;

    for (var i = 0; i < 50; i += 1) {
      base = randInt(baseRange[0], baseRange[1]);
      value = base * percent / 100;
      if (isInteger(value) && value >= 2) {
        return {
          type: 'percent',
          percent: percent,
          base: base,
          value: value,
          text: formatNumber(percent) + '% von ' + formatNumber(base),
          tactic: percentTactic(percent, base, value)
        };
      }
    }

    base = percent === 75 ? 80 : 100;
    value = base * percent / 100;
    return {
      type: 'percent',
      percent: percent,
      base: base,
      value: value,
      text: formatNumber(percent) + '% von ' + formatNumber(base),
      tactic: percentTactic(percent, base, value)
    };
  }

  function makeRandomTerm(level, filter, forcedType) {
    var type = forcedType || weightedChoice(getActiveTermTypes(level, filter));

    if (forcedType && forcedType !== 'plain' && !normalizeOperatorFilter(filter || state.operatorFilter)[TERM_FILTER_KEYS[forcedType]]) {
      type = 'plain';
    }

    if (type === 'square') {
      return makeSquareTerm(level);
    }

    if (type === 'sqrt') {
      return makeSqrtTerm(level);
    }

    if (type === 'cube') {
      return makeCubeTerm(level);
    }

    if (type === 'power') {
      return makePowerTerm(level);
    }

    if (type === 'percent') {
      return makePercentTerm(level);
    }

    return makePlainTerm(level);
  }

  function getDivisors(value, max) {
    var divisors = [];
    var n = Math.abs(value);

    for (var i = 2; i <= Math.min(max, n); i += 1) {
      if (n % i === 0) {
        divisors.push(i);
      }
    }

    return divisors;
  }

  function makeDivisionTerm(current, level, filter, context) {
    var cfg = LEVELS[level];
    var normalized = normalizeOperatorFilter(filter || state.operatorFilter);
    var divisors = getDivisors(current, Math.min(cfg.plain[1], level >= 5 ? 60 : cfg.plain[1]));

    if (!divisors.length) {
      return null;
    }

    var value = chooseDivisionValue(current, divisors, level, context);

    if (normalized.sqrt && level >= 4 && value <= (level >= 5 ? 18 : 12) && Math.random() < .18) {
      var rootTerm = makeTermForValue(value * value, level, normalized);
      if (rootTerm) {
        return rootTerm;
      }
    }

    return makePlainTerm(level, value);
  }

  function chooseDivisionValue(current, divisors, level, context) {
    var isLastStep = context && context.isLastStep;
    var lastDivisor = divisors.reduce(function (max, divisor) {
      return Math.max(max, divisor);
    }, 0);
    var candidates = divisors.map(function (divisor) {
      var result = current / divisor;
      var weight = 1;

      if (result === 1) {
        weight *= isLastStep ? .01 : .08;
      } else if (result === 2) {
        weight *= isLastStep ? .12 : .35;
      } else if (result < 3) {
        weight *= .2;
      }

      if (result >= 3 && result <= 99) {
        weight *= 3;
      }
      if (result >= 5 && result <= 40) {
        weight *= 1.35;
      }
      if (divisor === current) {
        weight *= .02;
      }
      if (isLastStep && divisor >= current / 2) {
        weight *= .12;
      }
      if (isLastStep && divisor >= 20 && result <= 4) {
        weight *= .1;
      }
      if (divisor === lastDivisor) {
        weight *= .55;
      }
      if (divisor <= 12) {
        weight *= 1.15;
      }
      if (level >= 4 && divisor >= 10 && divisor <= 25 && result >= 3) {
        weight *= 1.2;
      }

      return {
        divisor: divisor,
        result: result,
        weight: weight
      };
    });
    var preferred = candidates;

    if (isLastStep) {
      preferred = candidates.filter(function (candidate) {
        return candidate.result > 2;
      });
    }
    if (!preferred.length) {
      preferred = candidates.filter(function (candidate) {
        return candidate.result !== 1;
      });
    }
    if (!preferred.length) {
      preferred = candidates;
    }

    return chooseWeightedCandidate(preferred).divisor;
  }

  function chooseWeightedCandidate(candidates) {
    var total = candidates.reduce(function (sum, candidate) {
      return sum + Math.max(0, candidate.weight || 0);
    }, 0);
    var target;

    if (total <= 0) {
      return candidates[randInt(0, candidates.length - 1)];
    }

    target = Math.random() * total;
    for (var i = 0; i < candidates.length; i += 1) {
      target -= Math.max(0, candidates[i].weight || 0);
      if (target <= 0) {
        return candidates[i];
      }
    }

    return candidates[candidates.length - 1];
  }

  function makeTermForValue(value, level, filter) {
    if (!normalizeOperatorFilter(filter || state.operatorFilter).sqrt) {
      return null;
    }

    var root = Math.round(Math.sqrt(value));
    if (level >= 4 && root * root === value && root >= 2) {
      return {
        type: 'sqrt',
        root: root,
        value: root,
        text: '√' + formatNumber(value),
        tactic: '√' + formatNumber(value) + ' erkennst du über ' + formatNumber(root) + '².'
      };
    }

    return null;
  }

  function applyStep(current, op, term) {
    if (op === '+') {
      return current + term.value;
    }
    if (op === '-') {
      return current - term.value;
    }
    if (op === '×') {
      return current * term.value;
    }
    return current / term.value;
  }

  function canUseStep(current, op, term, cfg) {
    var next = applyStep(current, op, term);

    if (!isInteger(next) || Math.abs(next) > cfg.maxAbs) {
      return false;
    }

    // Generator rule: no negative intermediate or final results.
    if (next < 0) {
      return false;
    }

    if (op === '÷' && term.value === 1) {
      return false;
    }

    if (op === '×' && term.value === 1) {
      return false;
    }

    if (op === '×' && term.value > cfg.multiplyMax) {
      return false;
    }

    return true;
  }

  function makeStep(current, level, filter, context) {
    var cfg = LEVELS[level];
    var activeOps = getActiveOps(level, filter);
    var ops = shuffle(Object.keys(activeOps)).sort(function (a, b) {
      return activeOps[b] - activeOps[a] + (Math.random() - .5);
    });

    for (var round = 0; round < 42; round += 1) {
      var op = round < 10 ? weightedChoice(activeOps) : ops[round % ops.length];
      var term = op === '÷' ? makeDivisionTerm(current, level, filter, context) : makeRandomTerm(level, filter);

      if (!term) {
        continue;
      }

      if (op === '-' && term.value > current) {
        continue;
      }

      if (!canUseStep(current, op, term, cfg)) {
        continue;
      }

      return {
        op: op,
        term: term,
        before: current,
        after: applyStep(current, op, term),
        text: op + term.text
      };
    }

    return null;
  }

  function scoreTaskQuality(task) {
    var steps = task.steps || [];
    var level = task.level || 1;
    var heavyRun = 0;
    var heavyLimit = level >= 5 ? 3 : 2;
    var heavyThreshold = level >= 5 ? 8.4 : 7.6;

    if (!steps.length) {
      return { ok: false, reason: 'empty' };
    }

    var last = steps[steps.length - 1];
    if (last && last.op === '÷') {
      if (last.term.value === last.before || last.after <= 2) {
        return { ok: false, reason: 'trivial-final-division' };
      }
      if (last.term.value >= 20 && last.after <= 4) {
        return { ok: false, reason: 'large-final-division' };
      }
    }

    for (var i = 0; i < steps.length; i += 1) {
      var step = steps[i];
      var ratio = step.before > 0 && step.after > 0
        ? Math.max(step.after / step.before, step.before / step.after)
        : 1;
      var complexity = scoreStepComplexity(step, task.sequence[i + 1], {
        index: i + 1,
        level: level,
        isEft: false,
        sequenceLength: task.sequence.length
      });

      if (ratio > 120 && i > 0) {
        return { ok: false, reason: 'extreme-jump' };
      }

      if (complexity >= heavyThreshold) {
        heavyRun += 1;
        if (heavyRun >= heavyLimit) {
          return { ok: false, reason: 'heavy-run' };
        }
      } else {
        heavyRun = 0;
      }
    }

    return { ok: true, reason: 'ok' };
  }

  function wrapTimeMinutes(value) {
    return ((value % 1440) + 1440) % 1440;
  }

  function formatClock(minutes) {
    var wrapped = wrapTimeMinutes(minutes);
    var hours = Math.floor(wrapped / 60);
    var mins = wrapped % 60;

    return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
  }

  function parseTimeAnswer(value) {
    var raw = String(value || '').trim();
    var match;
    var digits;
    var hours;
    var minutes;

    if (!raw || /\s/.test(raw)) {
      return null;
    }

    match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    } else {
      digits = raw.replace(/\D/g, '');
      if (!/^\d{3,4}$/.test(digits)) {
        return null;
      }
      hours = parseInt(digits.length === 3 ? digits.charAt(0) : digits.slice(0, 2), 10);
      minutes = parseInt(digits.slice(-2), 10);
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  function makeTimeStepMinutes(cfg) {
    var maxUnit = Math.floor(cfg.maxMinutes / cfg.increment);
    return randInt(1, Math.max(1, maxUnit)) * cfg.increment;
  }

  function formatDuration(minutes) {
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;

    return formatNumber(hours) + ':' + String(mins).padStart(2, '0') + ' h';
  }

  function formatTimeStepText(op, minutes) {
    var useDuration = minutes >= 60 && Math.random() < 0.55;
    return op + ' ' + (useDuration ? formatDuration(minutes) : formatNumber(minutes) + ' min');
  }

  function makeTimeTask(levelKey) {
    var key = normalizeTimeDifficulty(levelKey);
    var cfg = TIME_LEVELS[key];
    var stepCount = randInt(cfg.steps[0], cfg.steps[1]);
    var current = randInt(0, 1439);
    var startMinutes = current;
    var firstOp = Math.random() < 0.5 ? '+' : '-';
    var steps = [];
    var sequence;
    var expression;
    var task;

    for (var i = 0; i < stepCount; i += 1) {
      var op = i % 2 === 0 ? firstOp : (firstOp === '+' ? '-' : '+');
      var minutes = makeTimeStepMinutes(cfg);
      var before = current;
      var after = wrapTimeMinutes(op === '+' ? current + minutes : current - minutes);

      steps.push({
        op: op,
        minutes: minutes,
        before: before,
        after: after,
        text: formatTimeStepText(op, minutes)
      });
      current = after;
    }

    sequence = [formatClock(startMinutes) + ' Uhr'].concat(steps.map(function (step) {
      return step.text;
    }));
    expression = sequence.join('  ');
    task = {
      mode: MODE_TIME,
      level: cfg.order,
      levelName: cfg.name,
      timeDifficulty: key,
      source: 'time-generated',
      isTime: true,
      startMinutes: startMinutes,
      startText: formatClock(startMinutes),
      steps: steps,
      answer: current,
      answerText: formatClock(current),
      expression: expression,
      sequence: sequence
    };

    task.pacing = computeTimeTaskPacing(task, cfg);
    task.timeLimit = computeTimeInputLimit(task, cfg);
    task.strategy = buildTimeStrategy(task);
    return task;
  }

  function computeTimeTaskPacing(task, cfg) {
    var stepFlashMs = Math.round(cfg.stepSeconds * 1000);
    var flashMsByToken = [stepFlashMs];
    var gapMsByToken = [360];

    task.steps.forEach(function () {
      flashMsByToken.push(stepFlashMs);
      gapMsByToken.push(320);
    });

    return {
      flashMsByToken: flashMsByToken,
      gapMsByToken: gapMsByToken,
      complexityScore: cfg.order,
      totalDisplayMs: flashMsByToken.reduce(function (sum, value, index) {
        return sum + value + (gapMsByToken[index] || 0);
      }, 0)
    };
  }

  function computeTimeInputLimit(task, cfg) {
    return Number(clamp(task.steps.length * cfg.stepSeconds, 7, 45).toFixed(2));
  }

  function buildTimeStrategy(task) {
    var net = task.steps.reduce(function (sum, step) {
      return sum + (step.op === '+' ? step.minutes : -step.minutes);
    }, 0);
    var parts = task.steps.map(function (step) {
      return step.op + formatNumber(step.minutes);
    }).join(' ');
    var signedNet = (net >= 0 ? '+' : '') + formatNumber(net);

    return 'Rechne die Schritte als Netto-Minuten: ' + parts + ' = ' + signedNet +
      ' min. Von ' + task.startText + ' Uhr aus landest du bei ' + task.answerText +
      ' Uhr; beim Überlauf zählt der 24-Stunden-Kreis weiter.';
  }

  function makeCurrentTask() {
    if (isTimeMode()) {
      return makeTimeTask(state.timeDifficulty);
    }

    return makeTask(state.difficulty, state.operatorFilter);
  }

  function makeTask(level, filter) {
    var cfg = LEVELS[level];
    var activeFilter = normalizeOperatorFilter(filter || state.operatorFilter);
    var stepCount = randInt(cfg.steps[0], cfg.steps[1]);

    if (shouldUseEft(level, activeFilter)) {
      return makeEftTask(level, activeFilter);
    }

    for (var attempt = 0; attempt < 500; attempt += 1) {
      var current = randInt(cfg.start[0], cfg.start[1]);
      var start = current;
      var steps = [];
      var failed = false;

      for (var i = 0; i < stepCount; i += 1) {
        var step = makeStep(current, level, activeFilter, {
          stepIndex: i,
          totalSteps: stepCount,
          isLastStep: i === stepCount - 1
        });
        if (!step) {
          failed = true;
          break;
        }
        steps.push(step);
        current = step.after;
      }

      if (!failed && current !== start && current >= 0 && Math.abs(current) <= cfg.maxAbs) {
        var task = {
          level: level,
          levelName: cfg.name,
          source: 'generated',
          isEft: false,
          start: start,
          steps: steps,
          answer: current,
          expression: makeExpression(start, steps),
          operatorFilter: copyOperatorFilter(activeFilter),
          sequence: [formatNumber(start)].concat(steps.map(function (stepItem) {
            return stepItem.text;
          }))
        };
        if (!scoreTaskQuality(task).ok) {
          continue;
        }
        task.pacing = computeTaskPacing(task);
        task.timeLimit = computeTimeLimit(level, steps, task.pacing);
        task.strategy = buildStrategy(task);
        return task;
      }
    }

    return makeFallbackTask(level, activeFilter, stepCount);
  }

  function makeFallbackTask(level, filter, fallbackStepCount) {
    var stepCount = fallbackStepCount || LEVELS[level].steps[0];
    var start = level >= 5 ? 14 : 24;
    var activeOps = getActiveOps(level, filter);
    var raw = [];
    var i;
    var value;

    if (activeOps['+']) {
      for (i = 0; i < stepCount; i += 1) {
        raw.push({ op: '+', term: makePlainTerm(level, level >= 5 ? 35 + i * 5 : 8 + i * 2) });
      }
    } else if (activeOps['×']) {
      start = level >= 5 ? 3 : 2;
      for (i = 0; i < stepCount; i += 1) {
        raw.push({ op: '×', term: makePlainTerm(level, [3, 4, 5, 2, 3][i % 5]) });
      }
    } else if (activeOps['÷']) {
      start = level >= 5 ? 12 : 6;
      for (i = 0; i < stepCount; i += 1) {
        value = [2, 3, 2, 5, 2][i % 5];
        start *= value;
        raw.push({ op: '÷', term: makePlainTerm(level, value) });
      }
    } else if (activeOps['-']) {
      value = level >= 5 ? 7 : 4;
      start = value * stepCount + (level >= 5 ? 20 : 12);
      for (i = 0; i < stepCount; i += 1) {
        raw.push({ op: '-', term: makePlainTerm(level, value) });
      }
    } else {
      for (i = 0; i < stepCount; i += 1) {
        raw.push({ op: '+', term: makePlainTerm(level, 10) });
      }
    }
    var current = start;
    var steps = raw.map(function (item) {
      var before = current;
      var after = applyStep(current, item.op, item.term);
      current = after;
      return {
        op: item.op,
        term: item.term,
        before: before,
        after: after,
        text: item.op + item.term.text
      };
    });
    var task = {
      level: level,
      levelName: LEVELS[level].name,
      source: 'generated',
      isEft: false,
      start: start,
      steps: steps,
      answer: current,
      expression: makeExpression(start, steps),
      operatorFilter: copyOperatorFilter(filter),
      sequence: [formatNumber(start)].concat(steps.map(function (step) {
        return step.text;
      }))
    };
    task.pacing = computeTaskPacing(task);
    task.timeLimit = computeTimeLimit(level, steps, task.pacing);
    task.strategy = buildStrategy(task);
    return task;
  }

  function makeExpression(start, steps) {
    return [formatNumber(start)].concat(steps.map(function (step) {
      return step.op + ' ' + step.term.text;
    })).join('  ');
  }

  function computeTimeLimit(level, steps, pacing) {
    var cfg = LEVELS[level];
    var cost = cfg.baseTime + steps.length * cfg.stepTime;
    var displaySeconds = pacing ? pacing.totalDisplayMs / 1000 : 0;

    steps.forEach(function (step) {
      cost += OP_COST[step.op] + (TERM_COST[step.term.type] || 0);
      if (step.op === '×' && step.term.value >= 10) {
        cost += 2;
      }
      if (step.op === '÷' && step.term.value >= 10) {
        cost += 1.5;
      }
    });

    var limits = {
      1: [12, 18],
      2: [18, 25],
      3: [25, 35],
      4: [35, 50],
      5: [50, 75]
    };

    return Math.round(clamp(
      Math.max(cost, displaySeconds + 7),
      limits[level][0],
      Math.max(limits[level][1], displaySeconds + 14)
    ));
  }

  function plainTermTactic(value) {
    if (value === 5) {
      return '×5 geht oft als ×10 und halbieren.';
    }
    if (value === 9) {
      return '×9 geht oft als ×10 minus einmal die Zahl.';
    }
    if (value === 11) {
      return '×11 ist ×10 plus einmal die Zahl.';
    }
    if (value === 25) {
      return '×25 ist ein Viertel von ×100.';
    }
    if (value % 10 === 9) {
      return formatNumber(value) + ' liegt knapp unter ' + formatNumber(value + 1) + ': rechne die runde Zahl und zieh einmal ab.';
    }
    if (value % 10 === 1 && value > 10) {
      return formatNumber(value) + ' liegt knapp über ' + formatNumber(value - 1) + ': rechne die runde Zahl und addiere einmal dazu.';
    }
    return '';
  }

  function squareTactic(base) {
    if (base % 10 === 5) {
      var head = Math.floor(base / 10);
      return formatNumber(base) + '² endet auf 25; vorne steht ' + formatNumber(head) + '×' + formatNumber(head + 1) + '.';
    }

    var anchor = Math.round(base / 10) * 10;
    var delta = base - anchor;
    if (Math.abs(delta) > 0 && Math.abs(delta) <= 5) {
      return formatNumber(base) + '² kannst du als (' + formatNumber(anchor) + '×' + formatNumber(base + delta) + ') + ' + formatNumber(Math.abs(delta)) + '² denken.';
    }

    if (base >= 11 && base <= 30) {
      return formatNumber(base) + '² gehört in die EFT-Merkliste der Quadrate von 11 bis 30.';
    }

    return formatNumber(base) + '² ist eine kleine Quadratzahl; kurz als ' + formatNumber(base) + '×' + formatNumber(base) + ' aufbauen.';
  }

  function percentTactic(percent, base, value) {
    if (percent === 50) {
      return '50% von ' + formatNumber(base) + ' ist die Hälfte: ' + formatNumber(value) + '.';
    }
    if (percent === 25) {
      return '25% von ' + formatNumber(base) + ' ist ein Viertel: ' + formatNumber(value) + '.';
    }
    if (percent === 75) {
      return '75% von ' + formatNumber(base) + ' ist drei Viertel: erst vierteln, dann mal 3 = ' + formatNumber(value) + '.';
    }
    if (percent === 20) {
      return '20% von ' + formatNumber(base) + ' ist ein Fünftel: ' + formatNumber(value) + '.';
    }
    if (percent === 10) {
      return '10% von ' + formatNumber(base) + ' ist eine Dezimalstelle nach links: ' + formatNumber(value) + '.';
    }
    return formatNumber(percent) + '% von ' + formatNumber(base) + ' in einfache Teile zerlegen.';
  }

  function powerChain(base, exp) {
    var parts = [];
    var current = base;
    parts.push(formatNumber(base));
    for (var i = 2; i <= exp; i += 1) {
      current *= base;
      parts.push(formatNumber(current));
    }
    return parts.join(' → ');
  }

  function operationTactic(step) {
    var value = step.term.value;

    if (step.op === '+') {
      if ((step.before + value) % 10 === 0 || (step.before + value) % 100 === 0) {
        return formatNumber(step.before) + ' + ' + formatNumber(value) + ' landet direkt auf der runden Zahl ' + formatNumber(step.after) + '.';
      }
      return formatNumber(step.before) + ' + ' + formatNumber(value) + ': erst Zehner, dann Rest addieren.';
    }

    if (step.op === '-') {
      if (value % 10 >= 7) {
        var round = Math.ceil(value / 10) * 10;
        return formatNumber(step.before) + ' - ' + formatNumber(value) + ': erst -' + formatNumber(round) + ', dann +' + formatNumber(round - value) + '.';
      }
      return formatNumber(step.before) + ' - ' + formatNumber(value) + ': von links nach rechts abziehen.';
    }

    if (step.op === '×') {
      if (Math.abs(step.before - value) === 2) {
        var middleTwo = (step.before + value) / 2;
        if (isInteger(middleTwo)) {
          return formatNumber(step.before) + '×' + formatNumber(value) + ' liegt symmetrisch um ' + formatNumber(middleTwo) + ': ' + formatNumber(middleTwo) + '² - 1.';
        }
      }
      if (Math.abs(step.before - value) === 4) {
        var middleFour = (step.before + value) / 2;
        if (isInteger(middleFour)) {
          return formatNumber(step.before) + '×' + formatNumber(value) + ' liegt symmetrisch um ' + formatNumber(middleFour) + ': ' + formatNumber(middleFour) + '² - 2².';
        }
      }
      if (step.before >= 10 && step.before <= 19 && value >= 10 && value <= 19) {
        return 'Bei 10-19: ' + formatNumber(step.before) + ' + ' + formatNumber(value % 10) + ', dann ×10, plus Einerprodukt.';
      }
      if (step.before >= 20 && step.before <= 29 && value >= 20 && value <= 29) {
        return 'Bei 20-29: ' + formatNumber(step.before) + ' + ' + formatNumber(value % 10) + ', dann ×20, plus Einerprodukt.';
      }
      if (value === 5) {
        return formatNumber(step.before) + '×5 = ×10 halbieren: ' + formatNumber(step.before * 10) + '/2 = ' + formatNumber(step.after) + '.';
      }
      if (value === 9 || value === 19) {
        return formatNumber(step.before) + '×' + formatNumber(value) + ' = ×' + formatNumber(value + 1) + ' minus einmal ' + formatNumber(step.before) + '.';
      }
      if (value === 11) {
        return formatNumber(step.before) + '×11 = ×10 plus einmal: ' + formatNumber(step.before * 10) + ' + ' + formatNumber(step.before) + '.';
      }
      if (value >= 12) {
        var tens = Math.floor(value / 10) * 10;
        var rest = value - tens;
        return formatNumber(step.before) + '×' + formatNumber(value) + ' zerlegen: ×' + formatNumber(tens) + (rest ? ' plus ×' + formatNumber(rest) : '') + '.';
      }
      return formatNumber(step.before) + '×' + formatNumber(value) + ' als kleine Einmaleins-Kette halten.';
    }

    if (step.op === '÷') {
      if (value === 7) {
        return 'Bei ÷7 hilft die Gegenprobe: Ergebnis ×7 muss wieder ' + formatNumber(step.before) + ' ergeben.';
      }
      return formatNumber(step.before) + '÷' + formatNumber(value) + ': nutze die Gegenprobe ' + formatNumber(step.after) + '×' + formatNumber(value) + '.';
    }

    return '';
  }

  function buildStrategy(task) {
    var hints = [];
    var termHint = task.steps.map(function (step) {
      return step.term.tactic;
    }).filter(Boolean)[0];
    var hardStep = task.steps.filter(function (step) {
      return step.op === '×' || step.op === '÷' || step.term.type !== 'plain';
    })[0] || task.steps[0];
    var tailNet = getTailNet(task.steps);

    hints.push('Links nach rechts halten: ' + task.sequence.join(' → ') + '.');

    if (hardStep) {
      hints.push(operationTactic(hardStep));
    }

    if (termHint && hints.join(' ').indexOf(termHint) === -1) {
      hints.push(termHint);
    }

    if (tailNet && Math.abs(tailNet.net) > 0) {
      hints.push('Den Schluss ' + tailNet.text + ' kannst du als ' + (tailNet.net > 0 ? '+' : '') + formatNumber(tailNet.net) + ' bündeln.');
    }

    return hints.filter(Boolean).slice(0, 4).join(' ');
  }

  function getTailNet(steps) {
    var net = 0;
    var parts = [];

    for (var i = steps.length - 1; i >= 0; i -= 1) {
      var step = steps[i];
      if (step.term.type !== 'plain' || (step.op !== '+' && step.op !== '-')) {
        break;
      }
      net += step.op === '+' ? step.term.value : -step.term.value;
      parts.unshift(step.op + formatNumber(step.term.value));
    }

    if (parts.length < 2) {
      return null;
    }

    return {
      net: net,
      text: parts.join(' ')
    };
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function showOnly(view) {
    els.setupPanel.hidden = view !== 'setup';
    els.trainingPanel.hidden = view !== 'training';
    els.summaryPanel.hidden = view !== 'summary';
  }

  function setStage(token, note, hidden) {
    els.flashToken.textContent = token;
    els.stageNote.textContent = note || '';
    els.flashToken.classList.toggle('is-hidden', Boolean(hidden));
  }

  function startTimer(seconds) {
    stopTimer();
    state.questionStartedAt = performance.now();
    state.deadline = state.questionStartedAt + seconds * 1000;
    state.resolved = false;
    els.timerLabel.textContent = 'Zeitlimit';
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 100);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = 0;
    }
  }

  function updateTimer() {
    var now = performance.now();
    var total = state.currentTask ? state.currentTask.timeLimit * 1000 : 1;
    var remaining = Math.max(0, state.deadline - now);
    var ratio = clamp(remaining / total, 0, 1);

    els.timerValue.textContent = formatSeconds(remaining / 1000);
    els.timerBar.style.transform = 'scaleX(' + ratio + ')';

    if (ratio < .24) {
      els.timerBar.style.filter = 'saturate(1.25)';
    } else {
      els.timerBar.style.filter = 'none';
    }

    if (remaining <= 0 && !state.resolved) {
      handleTimeout();
    }
  }

  function startRun(event) {
    event.preventDefault();

    var formData = new FormData(els.setupForm);
    state.mode = normalizeMode(state.mode);
    state.difficulty = clamp(parseInt(formData.get('difficulty') || '3', 10), 1, 5);
    state.timeDifficulty = normalizeTimeDifficulty(formData.get('timeDifficulty') || state.timeDifficulty);
    state.taskCount = clamp(parseInt(formData.get('taskCount') || String(getDefaultTaskCount(state.mode)), 10), 1, 100);
    state.lastTaskCountByMode[state.mode] = state.taskCount;
    state.revealSolution = !isTimeMode() || formData.get('revealSolution') === 'on';
    state.operatorFilter = isTimeMode() ? state.operatorFilter : readOperatorFilterFromForm();
    state.currentIndex = 0;
    state.correctCount = 0;
    state.results = [];
    state.runId = createRunId();
    state.runStartedAt = new Date().toISOString();
    state.runFinishedAt = null;
    state.currentRunSaved = false;
    state.aborted = false;
    els.taskCount.value = state.taskCount;
    syncModeControls();
    saveSettings();

    showOnly('training');
    startQuestion();
  }

  function startQuestion() {
    state.currentTask = makeCurrentTask();
    state.currentIndex += 1;
    state.sequenceRun += 1;
    state.resolved = false;

    els.currentNumber.textContent = formatNumber(state.currentIndex);
    els.totalNumber.textContent = formatNumber(state.taskCount);
    els.liveScore.textContent = formatNumber(state.correctCount);
    if (els.scorePill) {
      els.scorePill.hidden = isTimeTask(state.currentTask) && !state.revealSolution;
    }
    els.answerForm.hidden = true;
    els.feedbackPanel.hidden = true;
    configureAnswerInput(state.currentTask);
    setStage('Bereit', 'Aufgabe startet sofort.', false);

    revealSequence(state.sequenceRun);
  }

  async function revealSequence(runId) {
    var task = state.currentTask;
    var timeTask = isTimeTask(task);
    var cfg = timeTask ? TIME_LEVELS[task.timeDifficulty] : LEVELS[task.level];
    var pacing = task.pacing || computeTaskPacing(task);

    if (timeTask) {
      stopTimer();
      els.timerLabel.textContent = 'Eingabezeit';
      els.timerValue.textContent = formatSeconds(task.timeLimit);
      els.timerBar.style.transform = 'scaleX(1)';
      els.timerBar.style.filter = 'none';
    } else {
      startTimer(task.timeLimit);
    }

    await sleep(420);

    for (var i = 0; i < task.sequence.length; i += 1) {
      if (runId !== state.sequenceRun || state.resolved) {
        return;
      }

      setStage(task.sequence[i], getSequenceNote(task, i), false);
      await sleep(pacing.flashMsByToken[i] || cfg.flashMs);

      if (runId !== state.sequenceRun || state.resolved) {
        return;
      }

      setStage('', '', true);
      await sleep(pacing.gapMsByToken[i] || cfg.gapMs);
    }

    if (runId !== state.sequenceRun || state.resolved) {
      return;
    }

    state.inputShownAt = performance.now();
    setStage('?', timeTask ? 'Uhrzeit eingeben' : 'Lösung eingeben', false);
    els.answerForm.hidden = false;
    if (timeTask) {
      startTimer(task.timeLimit);
    }
    if (window.matchMedia && window.matchMedia('(max-width: 720px)').matches) {
      els.answerForm.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    if (timeTask) {
      focusTimeDigit(0);
    } else {
      try {
        els.answerInput.focus({ preventScroll: true });
      } catch (error) {
        els.answerInput.focus();
      }
    }
  }

  function getSequenceNote(task, index) {
    if (isTimeTask(task)) {
      return index === 0 ? 'Startzeit' : 'Nächster Zeitschritt';
    }

    return task.isEft ? 'EFT Spezialaufgabe' : (index === 0 ? 'Startzahl' : 'Nächster Schritt');
  }

  function handleAnswer(event) {
    event.preventDefault();
    submitAnswer(false);
  }

  function handleTimeout() {
    if (state.resolved) {
      return;
    }
    submitAnswer(true);
  }

  function parseAnswer(value, rules) {
    var inputRules = rules || getAnswerInputRules(state.currentTask);
    var raw = String(value || '');
    var digitCount = (raw.match(/\d/g) || []).length;
    var normalized;
    var parsed;

    if (inputRules.type === MODE_TIME) {
      return parseTimeAnswer(raw);
    }

    if (!raw || /\s/.test(raw) || digitCount > inputRules.digitLimit) {
      return null;
    }

    if (inputRules.allowDecimal) {
      if (!/^\d+(?:[,.]\d+)?$/.test(raw)) {
        return null;
      }
    } else if (!/^\d+$/.test(raw)) {
      return null;
    }

    normalized = raw.replace(',', '.');
    parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function submitAnswer(timedOut) {
    if (state.resolved) {
      return;
    }

    var task = state.currentTask;
    var rules = state.answerInputRules || getAnswerInputRules(task);
    if (!timedOut) {
      els.answerInput.value = sanitizeAnswerInput(els.answerInput.value, rules);
    }
    var parsed = timedOut ? null : parseAnswer(els.answerInput.value, rules);
    var timeUsed = Math.min(task.timeLimit, (performance.now() - state.questionStartedAt) / 1000);
    var correct = !timedOut && isCorrectAnswer(task, parsed);
    var result = {
      mode: task.mode || MODE_MATH,
      number: state.currentIndex,
      level: task.level,
      levelName: task.levelName,
      source: task.source || 'generated',
      isEft: Boolean(task.isEft),
      isTime: Boolean(task.isTime),
      expression: task.expression,
      sequence: task.sequence.slice(),
      operatorFilter: task.operatorFilter ? copyOperatorFilter(task.operatorFilter) : null,
      answer: task.answer,
      answerText: task.answerText || null,
      answerPrecision: task.answerPrecision || 0,
      userAnswer: parsed,
      userAnswerText: isTimeTask(task) && parsed !== null ? formatClock(parsed) : null,
      correct: correct,
      timedOut: Boolean(timedOut),
      timeLimit: task.timeLimit,
      timeUsed: Number(timeUsed.toFixed(2)),
      strategy: task.strategy
    };

    if (isTimeTask(task)) {
      result.timeDifficulty = task.timeDifficulty;
      result.startMinutes = task.startMinutes;
      result.startText = task.startText;
      result.timeSteps = task.steps.map(function (step) {
        return {
          op: step.op,
          minutes: step.minutes,
          before: step.before,
          after: step.after,
          text: step.text
        };
      });
    }

    state.resolved = true;
    state.sequenceRun += 1;
    stopTimer();
    els.answerForm.hidden = true;

    if (correct) {
      state.correctCount += 1;
    }

    state.results.push(result);

    if (isTimeTask(task) && !state.revealSolution) {
      var queuedRunId = state.runId;
      var queuedIndex = state.currentIndex;
      window.setTimeout(function () {
        if (state.runId === queuedRunId && state.currentIndex === queuedIndex && state.resolved) {
          goNext();
        }
      }, 120);
      return;
    }

    renderFeedback(result);
  }

  function renderFeedback(result) {
    els.liveScore.textContent = formatNumber(state.correctCount);
    els.feedbackPanel.hidden = false;
    els.feedbackPanel.classList.toggle('is-correct', result.correct);
    els.feedbackPanel.classList.toggle('is-wrong', !result.correct);
    els.resultKicker.textContent = result.correct ? 'Richtig' : (result.timedOut ? 'Zeit abgelaufen' : 'Falsch');
    els.resultTitle.textContent = result.correct ? 'Sauber.' : 'Knapp daneben.';
    els.resultExpression.textContent = result.sequence.join(' → ');
    els.resultAnswer.textContent = result.timedOut
      ? 'Richtig: ' + formatResultAnswer(result, result.answer)
      : 'Du: ' + formatResultAnswer(result, result.userAnswer) + ' / Richtig: ' + formatResultAnswer(result, result.answer);
    els.resultTime.textContent = formatSeconds(result.timeUsed) + ' von ' + formatSeconds(result.timeLimit);
    els.strategyText.textContent = result.strategy;
    setStage(result.correct ? '✓' : '×', result.correct ? 'Richtig' : 'Richtig wäre ' + formatResultAnswer(result, result.answer), false);
    els.nextButton.focus();
  }

  function goNext() {
    if (state.currentIndex >= state.taskCount) {
      state.aborted = false;
      renderSummary();
      return;
    }

    startQuestion();
  }

  function stopCurrentQuestion() {
    state.resolved = true;
    state.sequenceRun += 1;
    stopTimer();
    els.answerForm.hidden = true;
    els.feedbackPanel.hidden = true;
  }

  function skipRun() {
    stopCurrentQuestion();
    state.aborted = true;
    renderSummary();
  }

  function renderSummary() {
    var stats = getRunStats(state.results, state.taskCount, state.aborted);

    showOnly('summary');
    els.summaryTitle.textContent = state.aborted ? 'Durchgang übersprungen' : 'Durchgang fertig';
    els.summaryPercent.textContent = formatNumber(stats.percent) + '%';
    els.summaryCorrect.textContent = formatNumber(stats.correct) + '/' + formatNumber(stats.denominator);
    els.summaryAverage.textContent = formatSeconds(stats.averageTimeSeconds);
    els.resultList.innerHTML = '';

    state.results.forEach(function (result) {
      var item = document.createElement('article');
      var mark = document.createElement('span');
      var copy = document.createElement('div');
      var title = document.createElement('strong');
      var sub = document.createElement('span');
      var time = document.createElement('span');

      item.className = 'result-item';
      mark.className = 'result-mark' + (result.correct ? '' : ' is-wrong');
      mark.textContent = result.correct ? '✓' : '×';
      copy.className = 'result-copy';
      title.textContent = result.sequence.join(' → ');
      sub.textContent = 'Richtig: ' + formatResultAnswer(result, result.answer) + ' / Du: ' + formatResultAnswer(result, result.userAnswer);
      time.className = 'result-time';
      time.textContent = formatSeconds(result.timeUsed);

      copy.appendChild(title);
      copy.appendChild(sub);
      item.appendChild(mark);
      item.appendChild(copy);
      item.appendChild(time);
      els.resultList.appendChild(item);
    });

    saveCurrentRunToHistory();
  }

  function restart() {
    stopCurrentQuestion();
    state.currentIndex = 0;
    state.correctCount = 0;
    state.results = [];
    state.runId = null;
    state.runStartedAt = null;
    state.runFinishedAt = null;
    state.currentRunSaved = false;
    state.currentTask = null;
    state.aborted = false;
    if (els.scorePill) {
      els.scorePill.hidden = false;
    }
    if (els.timeAnswer) {
      els.timeAnswer.hidden = true;
    }
    if (els.answerRow) {
      els.answerRow.hidden = false;
    }
    setStage('Bereit', 'Augen auf die Mitte.', false);
    showOnly('setup');
    els.setupForm.querySelector('button[type="submit"]').focus();
  }

  function handleOperatorChange() {
    syncOperatorControls();
    state.operatorFilter = readOperatorFilterFromForm();
    saveSettings();
  }

  function handleModeButtonClick(event) {
    var button = event.currentTarget;
    setMode(button.getAttribute('data-mode'));
  }

  function handleTimeDifficultyChange(event) {
    state.timeDifficulty = normalizeTimeDifficulty(event.target.value);
    saveSettings();
  }

  function handleRevealSolutionChange() {
    state.revealSolution = Boolean(els.revealSolution && els.revealSolution.checked);
    saveSettings();
  }

  function handleTaskCountChange() {
    storeCurrentTaskCount();
    saveSettings();
  }

  function toggleTimeHelp() {
    var expanded = els.timeHelpPanel.hidden;

    els.timeHelpPanel.hidden = !expanded;
    els.timeHelpToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function makeExportPayload() {
    var stats = getRunStats(state.results, state.taskCount, state.aborted);

    return {
      app: 'kopfrechnen',
      version: 1,
      mode: state.mode,
      exportedAt: new Date().toISOString(),
      runId: state.runId,
      startedAt: state.runStartedAt,
      finishedAt: state.runFinishedAt,
      difficulty: state.difficulty,
      timeDifficulty: isTimeMode() ? state.timeDifficulty : null,
      taskCount: state.taskCount,
      plannedTaskCount: state.taskCount,
      completedTaskCount: state.results.length,
      aborted: state.aborted,
      revealSolution: state.revealSolution,
      operatorFilter: isTimeMode() ? null : copyOperatorFilter(state.operatorFilter),
      correct: stats.correct,
      percent: stats.percent,
      averageTimeSeconds: stats.averageTimeSeconds,
      results: state.results
    };
  }

  function exportJson() {
    var payload = makeExportPayload();
    downloadFile(getExportPrefix() + '-ergebnis-' + dateStamp() + '.json', 'application/json', JSON.stringify(payload, null, 2));
  }

  function exportCsv() {
    var payload = makeExportPayload();
    var rows = [
      ['Nr', 'Modus', 'Level', 'Quelle', 'Aufgabe', 'Sequenz', 'Richtig', 'Antwort', 'Deine Antwort', 'Timeout', 'Zeitlimit Sekunden', 'Zeit Sekunden', 'Strategie']
    ];

    payload.results.forEach(function (result) {
      rows.push([
        result.number,
        result.mode === MODE_TIME ? 'Uhrzeit' : 'Kopfrechnen',
        result.mode === MODE_TIME ? (result.levelName || result.timeDifficulty) : result.level,
        result.source || 'generated',
        result.expression,
        result.sequence.join(' -> '),
        result.correct ? 'ja' : 'nein',
        formatResultAnswer(result, result.answer),
        result.userAnswer === null ? '' : formatResultAnswer(result, result.userAnswer),
        result.timedOut ? 'ja' : 'nein',
        result.timeLimit,
        result.timeUsed,
        result.strategy
      ]);
    });

    var csv = '\ufeff' + rows.map(function (row) {
      return row.map(csvCell).join(';');
    }).join('\r\n');

    downloadFile(getExportPrefix() + '-ergebnis-' + dateStamp() + '.csv', 'text/csv;charset=utf-8', csv);
  }

  function exportHistory() {
    var payload = {
      app: 'kopfrechnen',
      version: 1,
      exportedAt: new Date().toISOString(),
      runLimit: RUN_HISTORY_LIMIT,
      runCount: state.runHistory.length,
      runs: state.runHistory
    };

    downloadFile('kopfrechnen-verlauf-' + dateStamp() + '.json', 'application/json', JSON.stringify(payload, null, 2));
  }

  function getExportPrefix() {
    return isTimeMode() ? 'uhrzeitrechnen' : 'kopfrechnen';
  }

  function clearRunHistory() {
    state.runHistory = [];
    clearStoredRunHistory();
    renderRunHistory();
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value);
    if (/[;"\r\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function dateStamp() {
    var now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0')
    ].join('');
  }

  function downloadFile(filename, type, content) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function bindEvents() {
    els.setupForm.addEventListener('submit', startRun);
    els.answerForm.addEventListener('submit', handleAnswer);
    els.answerInput.addEventListener('input', handleAnswerInput);
    els.answerInput.addEventListener('change', handleAnswerInput);
    els.taskCount.addEventListener('change', handleTaskCountChange);
    els.modeButtons.forEach(function (button) {
      button.addEventListener('click', handleModeButtonClick);
    });
    els.timeDifficultyInputs.forEach(function (input) {
      input.addEventListener('change', handleTimeDifficultyChange);
    });
    if (els.revealSolution) {
      els.revealSolution.addEventListener('change', handleRevealSolutionChange);
    }
    if (els.timeHelpToggle) {
      els.timeHelpToggle.addEventListener('click', toggleTimeHelp);
    }
    els.timeDigitInputs.forEach(function (input) {
      input.addEventListener('focus', handleTimeDigitFocus);
      input.addEventListener('input', handleTimeDigitInput);
      input.addEventListener('keydown', handleTimeDigitKeydown);
      input.addEventListener('paste', handleTimeDigitPaste);
    });
    els.nextButton.addEventListener('click', goNext);
    els.skipRunButton.addEventListener('click', skipRun);
    els.restartRunButton.addEventListener('click', restart);
    els.restartButton.addEventListener('click', restart);
    els.exportJson.addEventListener('click', exportJson);
    els.exportCsv.addEventListener('click', exportCsv);
    els.historyExport.addEventListener('click', exportHistory);
    els.historyClear.addEventListener('click', clearRunHistory);
    els.operatorInputs.forEach(function (input) {
      input.addEventListener('change', handleOperatorChange);
    });
  }

  restoreSettings();
  state.runHistory = loadRunHistory();
  renderRunHistory();
  bindEvents();
}());
