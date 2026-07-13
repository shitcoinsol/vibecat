const TOKEN_ADDRESS = "0x2355431b83b1a8e40172d099d90243d8d666b56b";
const PAIR_ADDRESS = "0x2d71816d8c5017524051f9b7ccf4ed0eae620383";
const DEX_API = `https://api.dexscreener.com/token-pairs/v1/robinhood/${TOKEN_ADDRESS}`;
const BLOCKSCOUT_TOKEN_API = `https://robinhoodchain.blockscout.com/api/v2/tokens/${TOKEN_ADDRESS}`;
const BLOCKSCOUT_HOLDERS_API = `https://robinhoodchain.blockscout.com/api/v2/tokens/${TOKEN_ADDRESS}/holders`;

const toast = document.querySelector(".toast");
const copyButtons = document.querySelectorAll("[data-copy]");
const revealItems = document.querySelectorAll(".section-reveal");
const tiltTargets = document.querySelectorAll("[data-tilt]");
const liveFields = document.querySelectorAll("[data-live]");
const loader = document.querySelector(".loader");

if (loader) {
  const loaderBar = loader.querySelector(".loader-bar span");
  if (loaderBar) {
    loaderBar.style.transition = "none";
    loaderBar.style.transform = "scaleX(0)";
    loaderBar.getBoundingClientRect();
  }

  window.setTimeout(() => {
    requestAnimationFrame(() => {
      if (loaderBar) {
        loaderBar.style.transition = "";
        loaderBar.style.transform = "";
      }
      loader.classList.add("is-loading");
    });
  }, 420);

  window.setTimeout(() => {
    document.body.classList.remove("is-preloading");
    loader.classList.add("is-done");
  }, 2850);

  window.setTimeout(() => {
    loader.remove();
  }, 3550);
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1700);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  showToast("contract copied");
}

copyButtons.forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copy));
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const chartFrame = document.querySelector(".chart-shell iframe[data-src]");

function loadHeavyEmbeds(target) {
  if (target?.contains(chartFrame) && chartFrame?.dataset.src) {
    chartFrame.src = chartFrame.dataset.src;
    chartFrame.removeAttribute("data-src");
  }
}

if ("IntersectionObserver" in window) {
  const embedObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadHeavyEmbeds(entry.target);
        embedObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "280px 0px" }
  );

  if (chartFrame) embedObserver.observe(document.querySelector(".chart-shell"));
} else {
  if (chartFrame?.dataset.src) chartFrame.src = chartFrame.dataset.src;
}

tiltTargets.forEach((target) => {
  target.addEventListener("pointermove", (event) => {
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    target.style.setProperty("--tilt-x", `${x * 9}px`);
    target.style.setProperty("--tilt-y", `${y * 9}px`);
  });

  target.addEventListener("pointerleave", () => {
    target.style.removeProperty("--tilt-x");
    target.style.removeProperty("--tilt-y");
  });
});

function field(name) {
  return [...liveFields].find((node) => node.dataset.live === name);
}

function formatUsd(value, precision = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  if (number > 0 && number < 0.01) {
    return `$${number.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
  }
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: precision })}`;
}

function formatCompactUsd(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return `$${number.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 })}`;
}

function formatCompact(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
}

function setText(name, value) {
  const node = field(name);
  if (node) node.textContent = value;
}

function bestPair(pairs) {
  return [...pairs].sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0];
}

async function syncMarket() {
  try {
    const response = await fetch(DEX_API, { cache: "no-store" });
    if (!response.ok) throw new Error("Dexscreener unavailable");
    const pairs = await response.json();
    const pair = bestPair(Array.isArray(pairs) ? pairs : []);
    if (!pair) throw new Error("No pair found");

    const change = Number(pair.priceChange?.h24);
    const trades = Number(pair.txns?.h24?.buys || 0) + Number(pair.txns?.h24?.sells || 0);
    const changeNode = field("change");

    setText("price", formatUsd(pair.priceUsd, 6));
    setText("market-cap", formatCompactUsd(pair.marketCap || pair.fdv));
    setText("liquidity", formatCompactUsd(pair.liquidity?.usd));
    setText("volume", formatCompactUsd(pair.volume?.h24));
    setText("txns", Number.isFinite(trades) && trades > 0 ? formatCompact(trades) : "--");

    if (changeNode) {
      changeNode.textContent = Number.isFinite(change) ? `24h ${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "24h --";
      changeNode.classList.toggle("is-up", change > 0);
      changeNode.classList.toggle("is-down", change < 0);
    }
  } catch {
    setText("price", "syncing");
  }
}

function extractHolderCount(payload) {
  const candidates = [
    payload?.holders_count,
    payload?.token_holders_count,
    payload?.holders,
    payload?.counters?.holders_count,
    payload?.counters?.token_holders_count,
    payload?.data?.holders_count,
  ];

  const match = candidates.find((value) => Number.isFinite(Number(value)));
  return match === undefined ? null : Number(match);
}

async function syncHolders() {
  try {
    const tokenResponse = await fetch(BLOCKSCOUT_TOKEN_API, { cache: "no-store" });
    if (tokenResponse.ok) {
      const tokenPayload = await tokenResponse.json();
      const count = extractHolderCount(tokenPayload);
      if (count !== null) {
        setText("holders", count.toLocaleString("en-US"));
        return;
      }
    }

    const holdersResponse = await fetch(BLOCKSCOUT_HOLDERS_API, { cache: "no-store" });
    if (!holdersResponse.ok) throw new Error("Blockscout holders unavailable");
    const holdersPayload = await holdersResponse.json();
    const items = Array.isArray(holdersPayload?.items) ? holdersPayload.items.length : null;
    const count = extractHolderCount(holdersPayload) ?? items;
    if (count === null) throw new Error("Holder count missing");
    setText("holders", count.toLocaleString("en-US"));
  } catch {
    setText("holders", "syncing");
  }
}

syncMarket();
syncHolders();
window.setInterval(syncMarket, 30000);
window.setInterval(syncHolders, 45000);

const game = {
  field: document.querySelector(".game-field"),
  cat: document.querySelector(".game-cat"),
  start: document.querySelector(".game-start"),
  scoreNode: document.querySelector('[data-game="score"]'),
  comboNode: document.querySelector('[data-game="combo"]'),
  vibeNode: document.querySelector('[data-game="vibe"]'),
  message: document.querySelector(".game-message"),
  hitKeys: [...document.querySelectorAll(".hit-zone button")],
  running: false,
  score: 0,
  combo: 0,
  vibe: 100,
  level: 1,
  notes: new Set(),
  loopId: null,
  spawnId: null,
  tickId: null,
};

const laneKeys = ["d", "f", "j", "k"];

function setGameMessage(text, visible = true) {
  if (!game.message) return;
  game.message.textContent = text;
  game.message.style.display = visible ? "block" : "none";
}

function updateGameStats() {
  if (game.scoreNode) game.scoreNode.textContent = game.score.toLocaleString("en-US");
  if (game.comboNode) game.comboNode.textContent = game.combo.toLocaleString("en-US");
  if (game.vibeNode) game.vibeNode.textContent = Math.max(0, Math.round(game.vibe));
}

function flashLane(lane, hit = true) {
  const key = game.hitKeys[lane];
  if (!key) return;
  key.classList.toggle("is-hit", hit);
  window.setTimeout(() => key.classList.remove("is-hit"), 130);
}

function laneLeft(lane) {
  if (!game.field) return 0;
  const gap = 10;
  const inset = 28;
  const width = game.field.clientWidth - inset * 2;
  const laneWidth = (width - gap * 3) / 4;
  return inset + lane * (laneWidth + gap);
}

function openLanes() {
  const lanes = [0, 1, 2, 3];
  return lanes.filter((lane) => {
    for (const note of game.notes) {
      if (Number(note.dataset.lane) !== lane) continue;
      if (Number(note.dataset.y) < 126) return false;
    }
    return true;
  });
}

function spawnNote() {
  if (!game.field || !game.running) return;
  const lanes = openLanes();
  if (!lanes.length) return;
  const note = document.createElement("span");
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const isRed = Math.random() < Math.min(0.15 + game.level * 0.025, 0.36);
  note.className = isRed ? "candle red" : "candle";
  note.dataset.lane = String(lane);
  note.dataset.type = isRed ? "red" : "green";
  note.dataset.y = "-58";
  note.dataset.speed = `${4.1 + game.level * 0.42}`;
  note.style.left = `${laneLeft(lane)}px`;
  note.style.width = `calc((100% - 86px) / 4)`;
  game.field.appendChild(note);
  game.notes.add(note);
}

function judgeLane(lane) {
  if (!game.running || !game.field) return;
  const hitY = game.field.clientHeight - 156;
  let best = null;
  let bestDistance = Infinity;

  game.notes.forEach((note) => {
    if (Number(note.dataset.lane) !== lane) return;
    const distance = Math.abs(Number(note.dataset.y) - hitY);
    if (distance < bestDistance) {
      best = note;
      bestDistance = distance;
    }
  });

  if (!best || bestDistance > 78) {
    game.combo = 0;
    game.vibe -= 6;
    flashLane(lane, false);
    setGameMessage("miss", true);
    window.setTimeout(() => setGameMessage("", false), 220);
    updateGameStats();
    if (game.vibe <= 0) endGame();
    return;
  }

  const isRed = best.dataset.type === "red";
  best.classList.add("perfect");
  best.style.setProperty("--note-y", `${best.dataset.y}px`);
  window.setTimeout(() => best.remove(), 130);
  game.notes.delete(best);
  flashLane(lane, true);

  if (isRed) {
    game.combo = 0;
    game.vibe -= 14;
    setGameMessage("red candle", true);
  } else {
    const perfect = bestDistance < 28;
    game.combo += 1;
    game.score += perfect ? 120 + game.combo * 4 : 70 + game.combo * 2;
    game.vibe = Math.min(100, game.vibe + (perfect ? 4 : 2));
    setGameMessage(perfect ? "perfect" : "good", true);
  }

  window.setTimeout(() => setGameMessage("", false), 220);
  updateGameStats();
  if (game.vibe <= 0) endGame();
}

function endGame() {
  game.running = false;
  game.field?.classList.remove("is-playing");
  window.clearInterval(game.spawnId);
  window.clearInterval(game.tickId);
  window.cancelAnimationFrame(game.loopId);
  game.notes.forEach((note) => note.remove());
  game.notes.clear();
  setGameMessage(game.score >= 1800 ? "maximum vibe" : "vibe break");
  if (game.start) game.start.innerHTML = '<i data-lucide="rotate-ccw"></i> Play again';
  if (window.lucide) window.lucide.createIcons();
}

function gameLoop() {
  if (!game.running || !game.field) return;
  const missLine = game.field.clientHeight - 72;

  game.notes.forEach((note) => {
    const y = Number(note.dataset.y) + Number(note.dataset.speed);
    note.dataset.y = `${y}`;
    note.style.transform = `translate3d(0, ${y}px, 0)`;

    if (y > missLine) {
      if (note.dataset.type === "green") {
        game.combo = 0;
        game.vibe -= 8;
        updateGameStats();
      }
      note.remove();
      game.notes.delete(note);
      if (game.vibe <= 0) endGame();
    }
  });

  game.loopId = window.requestAnimationFrame(gameLoop);
}

function startGame() {
  if (!game.field) return;
  game.running = true;
  game.score = 0;
  game.combo = 0;
  game.vibe = 100;
  game.level = 1;
  game.notes.forEach((note) => note.remove());
  game.notes.clear();
  updateGameStats();
  setGameMessage("", false);
  game.field.classList.add("is-playing");
  game.field.focus();
  spawnNote();
  game.spawnId = window.setInterval(spawnNote, 650);
  game.tickId = window.setInterval(() => {
    game.level = Math.min(12, game.level + 1);
    window.clearInterval(game.spawnId);
    game.spawnId = window.setInterval(spawnNote, Math.max(300, 650 - game.level * 28));
  }, 3600);
  game.loopId = window.requestAnimationFrame(gameLoop);
}

if (game.start) {
  game.start.addEventListener("click", startGame);
}

window.addEventListener("keydown", (event) => {
  const lane = laneKeys.indexOf(event.key.toLowerCase());
  if (lane === -1) return;
  event.preventDefault();
  judgeLane(lane);
});

if (game.field) {
  game.field.addEventListener("pointerdown", (event) => {
    if (!game.running) return;
    if (event.target.closest("[data-lane-button]")) return;
    event.preventDefault();
    const rect = game.field.getBoundingClientRect();
    const lane = Math.max(0, Math.min(3, Math.floor(((event.clientX - rect.left) / rect.width) * 4)));
    judgeLane(lane);
  });
}

game.hitKeys.forEach((button, lane) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!game.running) {
      game.field?.focus();
      return;
    }
    judgeLane(lane);
  });
});

if (window.lucide) {
  window.lucide.createIcons();
}
