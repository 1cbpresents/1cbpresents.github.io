(function () {
  'use strict';

  var SETTINGS_KEY = 'kopfrechnen.settings';

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
      flashMs: 980,
      gapMs: 300
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
      flashMs: 920,
      gapMs: 270
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
      flashMs: 860,
      gapMs: 240
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
      flashMs: 800,
      gapMs: 220
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

  var state = {
    difficulty: 3,
    taskCount: 10,
    currentIndex: 0,
    correctCount: 0,
    results: [],
    currentTask: null,
    sequenceRun: 0,
    timerId: 0,
    deadline: 0,
    questionStartedAt: 0,
    inputShownAt: 0,
    resolved: false
  };

  var els = {
    setupPanel: document.getElementById('setup-panel'),
    setupForm: document.getElementById('setup-form'),
    taskCount: document.getElementById('task-count'),
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
    answerInput: document.getElementById('answer-input'),
    feedbackPanel: document.getElementById('feedback-panel'),
    resultKicker: document.getElementById('result-kicker'),
    resultTitle: document.getElementById('result-title'),
    resultExpression: document.getElementById('result-expression'),
    resultAnswer: document.getElementById('result-answer'),
    resultTime: document.getElementById('result-time'),
    strategyText: document.getElementById('strategy-text'),
    nextButton: document.getElementById('next-button'),
    summaryPanel: document.getElementById('summary-panel'),
    summaryPercent: document.getElementById('summary-percent'),
    summaryCorrect: document.getElementById('summary-correct'),
    summaryAverage: document.getElementById('summary-average'),
    resultList: document.getElementById('result-list'),
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
        difficulty: state.difficulty,
        taskCount: state.taskCount
      }));
    } catch (error) {
      // The app works without localStorage; exports are the durable result.
    }
  }

  function restoreSettings() {
    var settings = getSettings();
    var difficulty = clamp(parseInt(settings.difficulty || 3, 10), 1, 5);
    var taskCount = clamp(parseInt(settings.taskCount || 10, 10), 1, 100);
    var difficultyInput = document.querySelector('input[name="difficulty"][value="' + difficulty + '"]');

    state.difficulty = difficulty;
    state.taskCount = taskCount;
    els.taskCount.value = taskCount;

    if (difficultyInput) {
      difficultyInput.checked = true;
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

  function makeRandomTerm(level, forcedType) {
    var type = forcedType || weightedChoice(LEVELS[level].termTypes);

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

  function makeDivisionTerm(current, level) {
    var cfg = LEVELS[level];
    var divisors = getDivisors(current, Math.min(cfg.plain[1], level >= 5 ? 60 : cfg.plain[1]));

    if (!divisors.length) {
      return null;
    }

    var value = divisors[randInt(0, divisors.length - 1)];

    if (level >= 4 && Math.random() < .2) {
      var rootTerm = makeTermForValue(value, level);
      if (rootTerm) {
        return rootTerm;
      }
    }

    return makePlainTerm(level, value);
  }

  function makeTermForValue(value, level) {
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

  function makeStep(current, level) {
    var cfg = LEVELS[level];
    var ops = shuffle(Object.keys(cfg.ops)).sort(function (a, b) {
      return cfg.ops[b] - cfg.ops[a] + (Math.random() - .5);
    });

    for (var round = 0; round < 42; round += 1) {
      var op = round < 10 ? weightedChoice(cfg.ops) : ops[round % ops.length];
      var term = op === '÷' ? makeDivisionTerm(current, level) : makeRandomTerm(level);

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

  function makeTask(level) {
    var cfg = LEVELS[level];
    var stepCount = randInt(cfg.steps[0], cfg.steps[1]);

    for (var attempt = 0; attempt < 500; attempt += 1) {
      var current = randInt(cfg.start[0], cfg.start[1]);
      var start = current;
      var steps = [];
      var failed = false;

      for (var i = 0; i < stepCount; i += 1) {
        var step = makeStep(current, level);
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
          start: start,
          steps: steps,
          answer: current,
          expression: makeExpression(start, steps),
          sequence: [formatNumber(start)].concat(steps.map(function (stepItem) {
            return stepItem.text;
          })),
          timeLimit: computeTimeLimit(level, steps)
        };
        task.strategy = buildStrategy(task);
        return task;
      }
    }

    return makeFallbackTask(level);
  }

  function makeFallbackTask(level) {
    var start = level >= 5 ? 14 : 24;
    var raw = level >= 5
      ? [{ op: '×', term: makePlainTerm(level, 15) }, { op: '×', term: makePlainTerm(level, 19) }, { op: '-', term: makePlainTerm(level, 17) }, { op: '+', term: makePlainTerm(level, 75) }]
      : [{ op: '+', term: makePlainTerm(level, 18) }, { op: '×', term: makePlainTerm(level, 3) }];
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
      start: start,
      steps: steps,
      answer: current,
      expression: makeExpression(start, steps),
      sequence: [formatNumber(start)].concat(steps.map(function (step) {
        return step.text;
      })),
      timeLimit: computeTimeLimit(level, steps)
    };
    task.strategy = buildStrategy(task);
    return task;
  }

  function makeExpression(start, steps) {
    return [formatNumber(start)].concat(steps.map(function (step) {
      return step.op + ' ' + step.term.text;
    })).join('  ');
  }

  function computeTimeLimit(level, steps) {
    var cfg = LEVELS[level];
    var cost = cfg.baseTime + steps.length * cfg.stepTime;

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

    return Math.round(clamp(cost, limits[level][0], limits[level][1]));
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
    state.difficulty = clamp(parseInt(formData.get('difficulty') || '3', 10), 1, 5);
    state.taskCount = clamp(parseInt(formData.get('taskCount') || '10', 10), 1, 100);
    state.currentIndex = 0;
    state.correctCount = 0;
    state.results = [];
    els.taskCount.value = state.taskCount;
    saveSettings();

    showOnly('training');
    startQuestion();
  }

  function startQuestion() {
    state.currentTask = makeTask(state.difficulty);
    state.currentIndex += 1;
    state.sequenceRun += 1;
    state.resolved = false;

    els.currentNumber.textContent = formatNumber(state.currentIndex);
    els.totalNumber.textContent = formatNumber(state.taskCount);
    els.liveScore.textContent = formatNumber(state.correctCount);
    els.answerForm.hidden = true;
    els.feedbackPanel.hidden = true;
    els.answerInput.value = '';
    setStage('Bereit', 'Aufgabe startet sofort.', false);

    revealSequence(state.sequenceRun);
  }

  async function revealSequence(runId) {
    var task = state.currentTask;
    var cfg = LEVELS[task.level];
    startTimer(task.timeLimit);

    await sleep(420);

    for (var i = 0; i < task.sequence.length; i += 1) {
      if (runId !== state.sequenceRun || state.resolved) {
        return;
      }

      setStage(task.sequence[i], i === 0 ? 'Startzahl' : 'Nächster Schritt', false);
      await sleep(cfg.flashMs);

      if (runId !== state.sequenceRun || state.resolved) {
        return;
      }

      setStage('', '', true);
      await sleep(cfg.gapMs);
    }

    if (runId !== state.sequenceRun || state.resolved) {
      return;
    }

    state.inputShownAt = performance.now();
    setStage('?', 'Lösung eingeben', false);
    els.answerForm.hidden = false;
    els.answerInput.focus();
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

  function parseAnswer(value) {
    var normalized = String(value || '').trim().replace(',', '.');
    if (!normalized) {
      return null;
    }
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function submitAnswer(timedOut) {
    if (state.resolved) {
      return;
    }

    var task = state.currentTask;
    var parsed = timedOut ? null : parseAnswer(els.answerInput.value);
    var timeUsed = Math.min(task.timeLimit, (performance.now() - state.questionStartedAt) / 1000);
    var correct = !timedOut && parsed === task.answer;
    var result = {
      number: state.currentIndex,
      level: task.level,
      levelName: task.levelName,
      expression: task.expression,
      sequence: task.sequence.slice(),
      answer: task.answer,
      userAnswer: parsed,
      correct: correct,
      timedOut: Boolean(timedOut),
      timeLimit: task.timeLimit,
      timeUsed: Number(timeUsed.toFixed(2)),
      strategy: task.strategy
    };

    state.resolved = true;
    state.sequenceRun += 1;
    stopTimer();
    els.answerForm.hidden = true;

    if (correct) {
      state.correctCount += 1;
    }

    state.results.push(result);
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
      ? 'Richtig: ' + formatNumber(result.answer)
      : 'Du: ' + (result.userAnswer === null ? 'leer' : formatNumber(result.userAnswer)) + ' / Richtig: ' + formatNumber(result.answer);
    els.resultTime.textContent = formatSeconds(result.timeUsed) + ' von ' + formatSeconds(result.timeLimit);
    els.strategyText.textContent = result.strategy;
    setStage(result.correct ? '✓' : '×', result.correct ? 'Richtig' : 'Richtig wäre ' + formatNumber(result.answer), false);
    els.nextButton.focus();
  }

  function goNext() {
    if (state.currentIndex >= state.taskCount) {
      renderSummary();
      return;
    }

    startQuestion();
  }

  function renderSummary() {
    var percent = state.taskCount ? Math.round((state.correctCount / state.taskCount) * 100) : 0;
    var average = state.results.length
      ? state.results.reduce(function (sum, result) {
        return sum + result.timeUsed;
      }, 0) / state.results.length
      : 0;

    showOnly('summary');
    els.summaryPercent.textContent = formatNumber(percent) + '%';
    els.summaryCorrect.textContent = formatNumber(state.correctCount) + '/' + formatNumber(state.taskCount);
    els.summaryAverage.textContent = formatSeconds(average);
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
      sub.textContent = 'Richtig: ' + formatNumber(result.answer) + ' / Du: ' + (result.userAnswer === null ? 'leer' : formatNumber(result.userAnswer));
      time.className = 'result-time';
      time.textContent = formatSeconds(result.timeUsed);

      copy.appendChild(title);
      copy.appendChild(sub);
      item.appendChild(mark);
      item.appendChild(copy);
      item.appendChild(time);
      els.resultList.appendChild(item);
    });
  }

  function restart() {
    showOnly('setup');
    els.setupForm.querySelector('button[type="submit"]').focus();
  }

  function makeExportPayload() {
    var correct = state.results.filter(function (result) {
      return result.correct;
    }).length;
    var average = state.results.length
      ? state.results.reduce(function (sum, result) {
        return sum + result.timeUsed;
      }, 0) / state.results.length
      : 0;

    return {
      app: 'kopfrechnen',
      version: 1,
      exportedAt: new Date().toISOString(),
      difficulty: state.difficulty,
      taskCount: state.taskCount,
      correct: correct,
      percent: state.taskCount ? Math.round((correct / state.taskCount) * 100) : 0,
      averageTimeSeconds: Number(average.toFixed(2)),
      results: state.results
    };
  }

  function exportJson() {
    var payload = makeExportPayload();
    downloadFile('kopfrechnen-ergebnis-' + dateStamp() + '.json', 'application/json', JSON.stringify(payload, null, 2));
  }

  function exportCsv() {
    var payload = makeExportPayload();
    var rows = [
      ['Nr', 'Level', 'Aufgabe', 'Sequenz', 'Richtig', 'Antwort', 'Deine Antwort', 'Timeout', 'Zeitlimit Sekunden', 'Zeit Sekunden', 'Strategie']
    ];

    payload.results.forEach(function (result) {
      rows.push([
        result.number,
        result.level,
        result.expression,
        result.sequence.join(' -> '),
        result.correct ? 'ja' : 'nein',
        result.answer,
        result.userAnswer === null ? '' : result.userAnswer,
        result.timedOut ? 'ja' : 'nein',
        result.timeLimit,
        result.timeUsed,
        result.strategy
      ]);
    });

    var csv = '\ufeff' + rows.map(function (row) {
      return row.map(csvCell).join(';');
    }).join('\r\n');

    downloadFile('kopfrechnen-ergebnis-' + dateStamp() + '.csv', 'text/csv;charset=utf-8', csv);
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
    els.nextButton.addEventListener('click', goNext);
    els.restartButton.addEventListener('click', restart);
    els.exportJson.addEventListener('click', exportJson);
    els.exportCsv.addEventListener('click', exportCsv);
  }

  restoreSettings();
  bindEvents();
}());
