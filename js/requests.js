/* FAT ANIME — requests board: who eats next. */

import { toast } from "/js/app.js";

const $ = (sel) => document.querySelector(sel);

/* ?mock=1 demos the board without the API (in-memory, same as generator). */
const MOCK = new URLSearchParams(location.search).has("mock");
let mockData = [
  { id: "00000000-0000-4000-8000-000000000001", text: "Megamind", votes: 12 },
  { id: "00000000-0000-4000-8000-000000000002", text: "Shrek (fatter)", votes: 7 },
  { id: "00000000-0000-4000-8000-000000000003", text: "Aqua from Konosuba", votes: 3 },
];

let requests = [];
let loaded = false;

function userId() {
  let id = localStorage.getItem("fatanime-uid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("fatanime-uid", id);
  }
  return id;
}

/* one vote per request per visitor — remembered locally, enforced server-side */
const votedSet = new Set(JSON.parse(localStorage.getItem("fatanime-votes") || "[]"));

function markVoted(id) {
  votedSet.add(id);
  localStorage.setItem("fatanime-votes", JSON.stringify([...votedSet]));
}

/* ---------------- data ---------------- */

async function loadRequests() {
  $("#requests-error").hidden = true;
  try {
    if (MOCK) {
      requests = [...mockData].sort((a, b) => b.votes - a.votes);
    } else {
      const res = await fetch("/api/requests");
      if (!res.ok) throw new Error(res.status);
      requests = (await res.json()).requests;
    }
    loaded = true;
    render();
  } catch {
    requests = [];
    render();
    $("#requests-empty").hidden = true;
    $("#requests-error").hidden = false;
  }
}

/* ---------------- render ---------------- */

function render() {
  const list = $("#request-list");
  list.innerHTML = "";
  $("#requests-empty").hidden = requests.length > 0;
  $("#requests-error").hidden = true;

  requests.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "request-card sticker pop";
    card.style.animationDelay = `${Math.min(i * 20, 300)}ms`;
    const voted = votedSet.has(r.id);
    card.innerHTML = `
      <div class="request-text"></div>
      <button class="vote-btn squish ${voted ? "voted" : ""}" ${voted ? "disabled" : ""} aria-label="upvote">
        🍔 <span class="count">${r.votes}</span>
      </button>`;
    card.querySelector(".request-text").textContent = r.text; // textContent — user input stays text
    card.querySelector(".vote-btn").addEventListener("click", (e) => vote(r, e.currentTarget));
    list.appendChild(card);
  });
}

/* ---------------- vote ---------------- */

async function vote(r, btn) {
  if (votedSet.has(r.id)) return;

  // optimistic: count up + lock immediately, roll back on failure
  const countEl = btn.querySelector(".count");
  r.votes += 1;
  countEl.textContent = r.votes;
  countEl.classList.remove("bump");
  void countEl.offsetWidth; // restart the bump animation
  countEl.classList.add("bump");
  btn.classList.add("voted");
  btn.disabled = true;
  markVoted(r.id);
  if (navigator.vibrate) navigator.vibrate(20);

  try {
    if (MOCK) {
      const m = mockData.find((x) => x.id === r.id);
      if (m) m.votes = r.votes;
      return;
    }
    const res = await fetch(`/api/requests/${r.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      r.votes = data.votes;
      countEl.textContent = r.votes;
    } else if (!data.already) {
      throw new Error(data.error);
    }
  } catch (err) {
    // roll back the optimistic vote
    r.votes -= 1;
    countEl.textContent = r.votes;
    btn.classList.remove("voted");
    btn.disabled = false;
    votedSet.delete(r.id);
    localStorage.setItem("fatanime-votes", JSON.stringify([...votedSet]));
    toast(err.message || "vote slipped off the plate. try again.");
  }
}

/* ---------------- submit ---------------- */

function initForm() {
  $("#request-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#request-input");
    const text = input.value.replace(/\s+/g, " ").trim();
    if (text.length < 2) return toast("who? give us a name!");

    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      let created;
      if (MOCK) {
        created = { id: crypto.randomUUID(), text, votes: 0 };
        mockData.push(created);
      } else {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, userId: userId() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error);
        created = data.request;
      }
      input.value = "";
      requests.push(created);
      render();
      toast("request fed to the kitchen 👨‍🍳");
    } catch (err) {
      toast(err.message || "couldn't save that. try again.");
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- boot ---------------- */

initForm();
$("#requests-retry").addEventListener("click", loadRequests);

// load lazily on first visit to the tab, refresh on later visits
document.addEventListener("tabchange", (e) => {
  if (e.detail === "requests") loadRequests();
});
