/* FAT ANIME — requests board: anime only, AniList-backed, dedup by id. */

import { toast } from "/js/app.js";
import { t } from "/js/i18n.js";

const $ = (sel) => document.querySelector(sel);

/* ?mock=1 demos the board + autocomplete without the API/DB. */
const MOCK = new URLSearchParams(location.search).has("mock");
const MOCK_CATALOG = [
  { anilistId: 16498, english: "Attack on Titan", romaji: "Shingeki no Kyojin", synonyms: ["AoT", "SnK"] },
  { anilistId: 21, english: "One Piece", romaji: "One Piece", synonyms: [] },
  { anilistId: 1535, english: "Death Note", romaji: "Death Note", synonyms: [] },
  { anilistId: 20, english: "Naruto", romaji: "Naruto", synonyms: [] },
  { anilistId: 11061, english: "Hunter x Hunter", romaji: "Hunter x Hunter (2011)", synonyms: ["HxH"] },
  { anilistId: 101922, english: "Demon Slayer", romaji: "Kimetsu no Yaiba", synonyms: ["KnY"] },
  { anilistId: 113415, english: "Jujutsu Kaisen", romaji: "Jujutsu Kaisen", synonyms: ["JJK"] },
  { anilistId: 21459, english: "My Hero Academia", romaji: "Boku no Hero Academia", synonyms: ["MHA"] },
  { anilistId: 9253, english: "Steins;Gate", romaji: "Steins;Gate", synonyms: [] },
  { anilistId: 1, english: "Cowboy Bebop", romaji: "Cowboy Bebop", synonyms: [] },
];
let mockBoard = [
  { anilistId: 113415, english: "Jujutsu Kaisen", votes: 12 },
  { anilistId: 16498, english: "Attack on Titan", votes: 7 },
  { anilistId: 21, english: "One Piece", votes: 3 },
];

let requests = [];

function userId() {
  let id = localStorage.getItem("fatanime-uid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("fatanime-uid", id);
  }
  return id;
}

/* one vote per anime per visitor (toggleable) — remembered locally, enforced server-side */
const votedSet = new Set(JSON.parse(localStorage.getItem("fatanime-votes") || "[]"));
function setVoted(id, on) {
  id = String(id);
  if (on) votedSet.add(id); else votedSet.delete(id);
  localStorage.setItem("fatanime-votes", JSON.stringify([...votedSet]));
}

/* ---------------- leaderboard ---------------- */

async function loadRequests() {
  $("#requests-error").hidden = true;
  try {
    if (MOCK) {
      requests = [...mockBoard];
    } else {
      const res = await fetch("/api/requests");
      if (!res.ok) throw new Error(res.status);
      requests = (await res.json()).requests;
    }
    requests.sort((a, b) => b.votes - a.votes);
    render();
  } catch {
    requests = [];
    render();
    $("#requests-empty").hidden = true;
    $("#requests-error").hidden = false;
  }
}

function render() {
  const list = $("#request-list");
  list.innerHTML = "";
  $("#requests-empty").hidden = requests.length > 0;
  $("#requests-error").hidden = true;

  requests.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "request-card sticker pop";
    card.style.animationDelay = `${Math.min(i * 20, 300)}ms`;
    const voted = votedSet.has(String(r.anilistId));
    card.innerHTML = `
      <span class="request-rank">${i + 1}</span>
      <div class="request-text"></div>
      <button class="vote-btn squish ${voted ? "voted" : ""}" aria-label="toggle vote" aria-pressed="${voted}">
        🍔 <span class="count">${r.votes}</span>
      </button>`;
    card.querySelector(".request-text").textContent = r.english;
    card.querySelector(".vote-btn").addEventListener("click", (e) => vote(r, e.currentTarget));
    list.appendChild(card);
  });
}

/* ---------------- vote (toggle) ---------------- */

function paintVote(btn, r, voted, bump) {
  const countEl = btn.querySelector(".count");
  countEl.textContent = r.votes;
  btn.classList.toggle("voted", voted);
  btn.setAttribute("aria-pressed", voted);
  if (bump) {
    countEl.classList.remove("bump");
    void countEl.offsetWidth;
    countEl.classList.add("bump");
  }
}

async function vote(r, btn) {
  if (btn.dataset.busy) return;
  btn.dataset.busy = "1";

  const wasVoted = votedSet.has(String(r.anilistId));
  const nowVoted = !wasVoted;
  r.votes = Math.max(0, r.votes + (nowVoted ? 1 : -1));
  setVoted(r.anilistId, nowVoted);
  paintVote(btn, r, nowVoted, nowVoted);
  if (nowVoted && navigator.vibrate) navigator.vibrate(20);

  try {
    if (MOCK) {
      const m = mockBoard.find((x) => x.anilistId === r.anilistId);
      if (m) m.votes = r.votes;
      return;
    }
    const res = await fetch(`/api/requests/${r.anilistId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error);
    r.votes = data.votes;
    setVoted(r.anilistId, data.voted);
    paintVote(btn, r, data.voted, false);
  } catch (err) {
    r.votes = Math.max(0, r.votes + (nowVoted ? -1 : 1));
    setVoted(r.anilistId, wasVoted);
    paintVote(btn, r, wasVoted, false);
    toast(err.message || t("toast_vote_fail"));
  } finally {
    delete btn.dataset.busy;
  }
}

/* ---------------- autocomplete ---------------- */

let selected = null;       // { anilistId, english } once a suggestion is picked
let acItems = [];          // current suggestions
let acIndex = -1;          // keyboard-highlighted index
let acTimer = null;
let acAbort = null;

function mockSearch(q) {
  const s = q.toLowerCase();
  return MOCK_CATALOG
    .filter((a) => [a.english, a.romaji, ...(a.synonyms || [])].some((t) => t && t.toLowerCase().includes(s)))
    .slice(0, 8)
    .map((a) => ({ anilistId: a.anilistId, english: a.english, romaji: a.romaji }));
}

async function search(q) {
  if (MOCK) return mockSearch(q);
  if (acAbort) acAbort.abort();
  acAbort = new AbortController();
  const res = await fetch(`/api/anime/search?q=${encodeURIComponent(q)}`, { signal: acAbort.signal });
  if (!res.ok) throw new Error(res.status);
  return (await res.json()).results || [];
}

function closeAC() {
  const ul = $("#ac-list");
  ul.hidden = true;
  ul.innerHTML = "";
  acItems = [];
  acIndex = -1;
  $("#request-input").setAttribute("aria-expanded", "false");
}

function renderAC() {
  const ul = $("#ac-list");
  ul.innerHTML = "";
  if (!acItems.length) { closeAC(); return; }
  acItems.forEach((a, i) => {
    const li = document.createElement("li");
    li.className = "ac-item" + (i === acIndex ? " active" : "");
    li.setAttribute("role", "option");
    const sub = a.romaji && a.romaji !== a.english ? `<span class="ac-sub"></span>` : "";
    li.innerHTML = `<span class="ac-title"></span>${sub}`;
    li.querySelector(".ac-title").textContent = a.english;
    if (sub) li.querySelector(".ac-sub").textContent = a.romaji;
    li.addEventListener("mousedown", (e) => { e.preventDefault(); pick(a); });
    ul.appendChild(li);
  });
  ul.hidden = false;
  $("#request-input").setAttribute("aria-expanded", "true");
}

function pick(a) {
  selected = { anilistId: a.anilistId, english: a.english };
  $("#request-input").value = a.english;
  closeAC();
}

function onInput() {
  const q = $("#request-input").value.replace(/\s+/g, " ").trim();
  selected = null; // typing invalidates a prior pick
  clearTimeout(acTimer);
  if (q.length < 1) { closeAC(); return; }
  acTimer = setTimeout(async () => {
    try {
      const results = await search(q);
      acItems = results;
      acIndex = -1;
      renderAC();
    } catch (e) {
      if (e.name !== "AbortError") closeAC();
    }
  }, MOCK ? 0 : 180);
}

function onKeydown(e) {
  const ul = $("#ac-list");
  if (ul.hidden || !acItems.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); acIndex = (acIndex + 1) % acItems.length; renderAC(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); acIndex = (acIndex - 1 + acItems.length) % acItems.length; renderAC(); }
  else if (e.key === "Enter" && acIndex >= 0) { e.preventDefault(); pick(acItems[acIndex]); }
  else if (e.key === "Escape") { closeAC(); }
}

/* ---------------- submit ---------------- */

async function submit() {
  const input = $("#request-input");
  const text = input.value.replace(/\s+/g, " ").trim();
  if (text.length < 2) return toast(t("toast_noname"));

  const btn = $("#request-form button[type=submit]");
  btn.disabled = true;
  closeAC();
  try {
    let created;
    if (MOCK) {
      // resolve via the mock catalog (fuzzy-ish: pick selected, else first match)
      const hit = selected || mockSearch(text)[0];
      if (!hit) throw new Error("couldn't find that anime — try another");
      created = { anilistId: hit.anilistId, english: hit.english, votes: (mockBoard.find((b) => b.anilistId === hit.anilistId)?.votes || 0) + 1 };
    } else {
      const body = selected ? { anilistId: selected.anilistId, userId: userId() } : { query: text, userId: userId() };
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      created = data.request;
    }

    // merge into the board (dedup by id), mark voted, re-render
    const existing = requests.find((r) => r.anilistId === created.anilistId);
    if (existing) existing.votes = created.votes;
    else requests.push(created);
    setVoted(created.anilistId, true);
    if (MOCK) {
      const mb = mockBoard.find((b) => b.anilistId === created.anilistId);
      if (mb) mb.votes = created.votes; else mockBoard.push({ ...created });
    }
    requests.sort((a, b) => b.votes - a.votes);
    render();

    input.value = "";
    selected = null;
    toast(t("toast_req_sent"));
  } catch (err) {
    toast(err.message || t("toast_req_fail"));
  } finally {
    btn.disabled = false;
  }
}

/* ---------------- boot ---------------- */

function initForm() {
  const input = $("#request-input");
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeydown);
  input.addEventListener("blur", () => setTimeout(closeAC, 120)); // allow click to register
  $("#request-form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
}

initForm();
$("#requests-retry").addEventListener("click", loadRequests);

document.addEventListener("tabchange", (e) => {
  if (e.detail === "requests") loadRequests();
});
