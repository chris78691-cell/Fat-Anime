/* FAT ANIME — tiny i18n. Toggles the UI between English and Japanese.
   Static text is tagged with data-i18n / data-i18n-ph in the HTML; JS-built
   strings call t(key). Character names, user requests and server error
   messages stay in their original language (out of scope for v1). */

const DICT = {
  // home
  cta_make_fat:   { en: "MAKE YOUR ANIME PFP FAT", ja: "アニメアイコンを太らせよう" },
  slots_home:     { en: "of 50 custom fat pfps left today", ja: "/ 50 本日のこり" },
  sec_fattened:   { en: "THE FATTENED ☆", ja: "ファット殿堂 ☆" },

  // generator
  of:             { en: "of", ja: "/" },
  pfps_left:      { en: "custom fat pfps left today", ja: "本日のこり" },
  mode_full:      { en: "FULL IMAGE", ja: "フル画像" },
  mode_pfp:       { en: "PFP MODE", ja: "アイコンモード" },
  hint_full:      { en: "fattens the whole picture, as-is", ja: "画像をまるごと太らせます" },
  hint_pfp:       { en: "square-cropped for TikTok / Insta / Discord / X avatars", ja: "TikTok / Insta / Discord / X のアイコン用に正方形でトリミング" },
  dz_title:       { en: "TAP TO UPLOAD", ja: "タップでアップロード" },
  dz_sub:         { en: "your anime pic · jpg / png / webp · max 10MB", ja: "アニメ画像 · jpg / png / webp · 最大10MB" },
  change_pic:     { en: "CHANGE PIC 🔄", ja: "画像を変える 🔄" },
  fatten_it:      { en: "FATTEN IT 🍔", ja: "太らせる 🍔" },
  fineprint:      { en: "uploads are fattened in memory and never stored", ja: "アップロード画像は保存されず、処理後すぐ破棄されます" },
  share:          { en: "SHARE 📤", ja: "シェア 📤" },
  save:           { en: "SAVE ⬇️", ja: "保存 ⬇️" },
  fatten_another: { en: "FATTEN ANOTHER 🍔", ja: "もう一枚太らせる 🍔" },

  // sold out
  soldout_title:  { en: "ALL 50 FATTENINGS EATEN TODAY", ja: "本日の50枚は完食！" },
  soldout_sub:    { en: "the kitchen restocks at midnight UK time", ja: "イギリス時間の深夜0時に補充されます" },
  notify_label:   { en: "GET PINGED WHEN SLOTS OPEN", ja: "空きが出たら通知する" },
  ping_me:        { en: "PING ME", ja: "通知して" },
  sec_classics:   { en: "MEANWHILE, THE CLASSICS", ja: "そのあいだに、定番をどうぞ" },

  // videos
  sec_videos:     { en: "THE FEEDING TAPES 🎬", ja: "もぐもぐ劇場 🎬" },

  // requests
  sec_requests:   { en: "WHO EATS NEXT? 🍴", ja: "次に太らせるのは？ 🍴" },
  req_ph:         { en: "who gets fattened next?", ja: "次に太らせるのは誰？" },
  feed:           { en: "FEED 🍴", ja: "送信 🍴" },
  empty_title:    { en: "NOBODY'S HUNGRY YET", ja: "まだ誰もいません" },
  empty_sub:      { en: "request the first victim. history will remember you.", ja: "最初のリクエストをどうぞ。歴史に名を刻め。" },
  err_title:      { en: "THE BOARD FELL OVER", ja: "ボードが転びました" },
  err_sub:        { en: "too many requests in its arms. probably.", ja: "リクエストを抱えすぎたのかも。" },
  try_again:      { en: "TRY AGAIN 🔄", ja: "もう一度 🔄" },

  // loading
  loading_caption_default: { en: "feeding…", ja: "餌やり中…" },
  loading_sub:    { en: "a proper fattening takes 15–60 seconds", ja: "しっかり太らせるのに15〜60秒かかります" },

  // gallery detail
  tap_fatten:     { en: "TAP TO FATTEN 👆", ja: "タップで太らせる 👆" },
  tap_refatten:   { en: "TAP TO RE-FATTEN 👆", ja: "もう一度タップ 👆" },

  // gallery load failure
  gallery_err_title: { en: "THE GALLERY ATE ITSELF", ja: "ギャラリーが自分を食べました" },
  gallery_err_sub:   { en: "couldn't load the fattened. check your signal.", ja: "読み込めませんでした。通信環境を確認してください。" },

  // tabs
  tab_gallery:    { en: "GALLERY", ja: "ギャラリー" },
  tab_videos:     { en: "VIDEOS", ja: "動画" },
  tab_fatten:     { en: "FATTEN YOUR PFP", ja: "アイコンを太らせる" },
  tab_requests:   { en: "REQUESTS", ja: "リクエスト" },
  tab_tiktok:     { en: "TIKTOK", ja: "TikTok" },

  // loading captions (rotating)
  cap_feeding:    { en: "feeding…", ja: "餌やり中…" },
  cap_portions:   { en: "extra portions…", ja: "おかわり中…" },
  cap_belt:       { en: "loosening the belt…", ja: "ベルトをゆるめ中…" },
  cap_stomach:    { en: "unlocking the second stomach…", ja: "別腹を開放中…" },
  cap_carbo:      { en: "carbo-loading…", ja: "炭水化物を補給中…" },
  cap_buffet:     { en: "negotiating with the buffet…", ja: "ビュッフェと交渉中…" },
  cap_chair:      { en: "reinforcing the chair…", ja: "椅子を補強中…" },
  cap_dessert:    { en: "dessert (mandatory)…", ja: "デザート（必須）…" },
  cap_onemore:    { en: "one more bite…", ja: "あと一口…" },

  // toasts / transient
  toast_filetype:    { en: "jpg, png or webp only!", ja: "jpg・png・webp だけだよ！" },
  toast_toobig:      { en: "too thicc already — 10MB max", ja: "すでに重すぎ — 最大10MB" },
  toast_generic_fail:{ en: "something broke. the site ate too much. try again.", ja: "なにか壊れました。食べ過ぎたみたい。もう一度。" },
  toast_saved:       { en: "saved! now go post it 📮", ja: "保存完了！さあ投稿しよう 📮" },
  toast_noname:      { en: "who? give us a name!", ja: "誰？名前を教えて！" },
  toast_req_sent:    { en: "request fed to the kitchen 👨‍🍳", ja: "リクエストを厨房に送りました 👨‍🍳" },
  toast_req_fail:    { en: "couldn't save that. try again.", ja: "保存できませんでした。もう一度。" },
  toast_vote_fail:   { en: "vote slipped off the plate. try again.", ja: "票がお皿から落ちました。もう一度。" },
  toast_notify_ok:   { en: "locked in. we'll yell when it's feeding time 📣", ja: "登録完了。エサの時間に叫びます 📣" },
  toast_notify_fail: { en: "couldn't save that — try again", ja: "保存できませんでした — もう一度" },
  net_fail:          { en: "network said no. check your signal and retry!", ja: "通信エラー。電波を確認して再挑戦！" },
  kitchen_choked:    { en: "the kitchen choked 🔥 try again!", ja: "厨房が詰まりました 🔥 もう一度！" },
};

let lang = localStorage.getItem("fatanime-lang") || "en";
const listeners = [];

export function getLang() { return lang; }

export function t(key) {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? key;
}

/** Register a callback fired after each language switch (for JS-built UI). */
export function onLangChange(cb) { listeners.push(cb); }

function applyStatic() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (DICT[k]) el.textContent = t(k);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const k = el.dataset.i18nPh;
    if (DICT[k]) el.placeholder = t(k);
  });
  document.documentElement.lang = lang;
}

function paintToggle() {
  const btn = document.getElementById("lang-toggle");
  if (btn) btn.textContent = lang === "en" ? "日本語" : "EN";
}

export function setLang(next) {
  lang = next === "ja" ? "ja" : "en";
  localStorage.setItem("fatanime-lang", lang);
  applyStatic();
  paintToggle();
  listeners.forEach((cb) => { try { cb(lang); } catch (e) { /* keep going */ } });
}

function init() {
  applyStatic();
  paintToggle();
  const btn = document.getElementById("lang-toggle");
  if (btn) btn.addEventListener("click", () => setLang(lang === "en" ? "ja" : "en"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
