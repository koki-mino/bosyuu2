/* ==========================
 * 設定：スプレッドシートのCSV URL
 * ========================== */

/**
 * Googleスプレッドシート側の操作（例）：
 * 1. スプレッドシートを開く
 * 2. [ファイル] → [共有] → [ウェブに公開]
 * 3. 「形式：csv」を選択して公開
 * 4. 表示されたURLを、下の SHEET_CSV_URL に貼り付ける
 */
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxxxxxxxxxxxxxx/export?format=csv"; // ★ここを差し替え

/* ==========================
 * グローバル変数
 * ========================== */

let allEvents = []; // スプレッドシートから取得した生データ
let filteredEvents = []; // 絞り込み後に表示するデータ

/* ==========================
 * 初期処理
 * ========================== */

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categorySelect");
  const dateSelect = document.getElementById("dateSelect");

  // 入力・選択が変わったら絞り込み
  searchInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);
  dateSelect.addEventListener("change", applyFilters);

  // データ読み込み
  loadEventsFromSheet();
});

/* ==========================
 * データ読み込み
 * ========================== */

function loadEventsFromSheet() {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = "データを読み込み中です…";

  fetch(SHEET_CSV_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error("CSVを取得できませんでした");
      }
      return res.text();
    })
    .then((csvText) => {
      // PapaParse で CSV → 配列に変換（header: true で1行目をキーに）
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      allEvents = parsed.data.map((row) => ({
        title: row.title || "",
        date: row.date || "",
        time: row.time || "",
        place: row.place || "",
        target: row.target || "",
        category: row.category || "",
        capacity: row.capacity || "",
        deadline: row.deadline || "",
        description: row.description || "",
        apply_url: row.apply_url || "",
      }));

      if (!allEvents.length) {
        statusMessage.textContent =
          "スプレッドシートにデータがありません。";
        renderEventCards([]);
        return;
      }

      // 絞り込み用のプルダウンを作成
      buildFilterOptions();

      // 初期表示
      filteredEvents = allEvents.slice();
      statusMessage.textContent = `現在 ${filteredEvents.length} 件のボランティアが募集されています。`;
      renderEventCards(filteredEvents);
    })
    .catch((err) => {
      console.error(err);
      statusMessage.textContent =
        "データの読み込み中にエラーが発生しました。管理者にご確認ください。";
    });
}

/* ==========================
 * フィルター（カテゴリ・日付）
 * ========================== */

function buildFilterOptions() {
  const categorySelect = document.getElementById("categorySelect");
  const dateSelect = document.getElementById("dateSelect");

  // 既存の option をクリア（先頭の「すべて」を残すため、value="" 以外を削除）
  clearSelectOptions(categorySelect);
  clearSelectOptions(dateSelect);

  // ユニークなカテゴリ
  const categories = Array.from(
    new Set(
      allEvents
        .map((e) => e.category.trim())
        .filter((v) => v && v.length > 0)
    )
  ).sort();

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // ユニークな日付
  const dates = Array.from(
    new Set(
      allEvents
        .map((e) => e.date.trim())
        .filter((v) => v && v.length > 0)
    )
  ).sort();

  dates.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    dateSelect.appendChild(opt);
  });
}

/**
 * select要素のうち value="" 以外の option を削除
 */
function clearSelectOptions(selectEl) {
  const keepFirst = [];
  for (const opt of selectEl.options) {
    if (opt.value === "") {
      keepFirst.push(opt);
    }
  }
  selectEl.innerHTML = "";
  keepFirst.forEach((opt) => selectEl.appendChild(opt));
}

/* ==========================
 * 絞り込み処理
 * ========================== */

function applyFilters() {
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categorySelect");
  const dateSelect = document.getElementById("dateSelect");
  const statusMessage = document.getElementById("statusMessage");

  const keyword = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  const date = dateSelect.value;

  filteredEvents = allEvents.filter((ev) => {
    // キーワード：タイトル・説明・場所・分野などに含まれるか
    const keywordText = (
      ev.title +
      ev.description +
      ev.place +
      ev.category +
      ev.target
    )
      .toLowerCase()
      .replace(/\s/g, "");
    const keywordOk = keyword
      ? keywordText.includes(keyword.toLowerCase().replace(/\s/g, ""))
      : true;

    // カテゴリ
    const categoryOk = category ? ev.category === category : true;

    // 日付
    const dateOk = date ? ev.date === date : true;

    return keywordOk && categoryOk && dateOk;
  });

  if (!filteredEvents.length) {
    statusMessage.textContent = "条件に合う募集は見つかりませんでした。";
  } else {
    statusMessage.textContent = `現在 ${filteredEvents.length} 件のボランティアが見つかりました。`;
  }

  renderEventCards(filteredEvents);
}

/* ==========================
 * カード描画
 * ========================== */

function renderEventCards(events) {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";

  if (!events.length) {
    return;
  }

  events.forEach((ev) => {
    const card = document.createElement("article");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = ev.title || "無題のボランティア";

    header.appendChild(title);

    if (ev.category) {
      const chip = document.createElement("span");
      chip.className = "card-chip";
      chip.textContent = ev.category;
      header.appendChild(chip);
    }

    const meta = document.createElement("div");
    meta.className = "card-meta";

    if (ev.date || ev.time) {
      const row = document.createElement("span");
      row.innerHTML = `<span class="card-meta-label">日時：</span>${escapeHtml(
        ev.date
      )} ${escapeHtml(ev.time)}`;
      meta.appendChild(row);
    }

    if (ev.place) {
      const row = document.createElement("span");
      row.innerHTML = `<span class="card-meta-label">場所：</span>${escapeHtml(
        ev.place
      )}`;
      meta.appendChild(row);
    }

    if (ev.target) {
      const row = document.createElement("span");
      row.innerHTML = `<span class="card-meta-label">対象：</span>${escapeHtml(
        ev.target
      )}`;
      meta.appendChild(row);
    }

    if (ev.capacity) {
      const row = document.createElement("span");
      row.innerHTML = `<span class="card-meta-label">定員：</span>${escapeHtml(
        ev.capacity
      )}`;
      meta.appendChild(row);
    }

    const desc = document.createElement("p");
    desc.className = "card-description";
    desc.textContent = ev.description || "内容は準備中です。";

    const footer = document.createElement("div");
    footer.className = "card-footer";

    const deadline = document.createElement("span");
    deadline.className = "deadline";
    if (ev.deadline) {
      deadline.textContent = `締切：${ev.deadline}`;
    } else {
      deadline.textContent = "締切：未定";
    }

    footer.appendChild(deadline);

    if (ev.apply_url) {
      const btn = document.createElement("a");
      btn.className = "apply-button";
      btn.href = ev.apply_url;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.textContent = "申し込む";
      footer.appendChild(btn);
    }

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(desc);
    card.appendChild(footer);

    container.appendChild(card);
  });
}

/* ==========================
 * HTMLエスケープ（XSS対策の簡易版）
 * ========================== */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
