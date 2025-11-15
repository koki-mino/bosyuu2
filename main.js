/* ==========================
 * 設定：スプレッドシートのCSV URL
 * ========================== */

/**
 * 1つ目：イベント一覧用シート（必須）
 *  - ヘッダー例：
 *    title, date, time, place, target, category, capacity, deadline, description, apply_url
 */
const EVENTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxxxxxxxxxxxxxx/export?format=csv"; // ★差し替え

/**
 * 2つ目：応募一覧用シート（先生用ビューで使用・任意）
 *  - ヘッダー例：
 *    event_title, student_name, school, grade, class, status
 *  （Googleフォーム → スプレッドシート で作ると楽です）
 */
const APPLICATIONS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/yyyyyyyyyyyyyyyyyyyyyyyyyyyy/export?format=csv"; // ★必要に応じて差し替え

/**
 * ロールごとの簡易パスワード（サンプル）
 * ※ 本番運用では必ず別の方法（ID/PW管理・学校アカウント連携など）を検討してください。
 */
const TEACHER_PASSWORD = "teacher123";
const ORGANIZER_PASSWORD = "organizer123";

/* ==========================
 * グローバル状態
 * ========================== */

let allEvents = [];
let filteredEventsStudent = [];
let filteredEventsTeacher = [];

let allApplications = [];

let teacherLoggedIn = false;
let organizerLoggedIn = false;

/* ==========================
 * 初期化
 * ========================== */

document.addEventListener("DOMContentLoaded", () => {
  setupRoleTabs();
  setupLogins();
  setupOrganizerForm();
  setupStudentFilters();
  setupTeacherFilters();

  // イベント一覧 + 応募一覧を読み込み
  loadAllData();
});

/* ==========================
 * 役割タブの切り替え
 * ========================== */

function setupRoleTabs() {
  const tabs = document.querySelectorAll(".role-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // タブの見た目
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // 対応するセクションを表示
      const targetId = tab.dataset.target;
      showSection(targetId);
    });
  });
}

function showSection(sectionId) {
  const sections = ["studentSection", "teacherSection", "organizerSection"];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === sectionId) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

/* ==========================
 * ログイン処理
 * ========================== */

function setupLogins() {
  // 先生ログイン
  const teacherLoginButton = document.getElementById("teacherLoginButton");
  teacherLoginButton.addEventListener("click", () => {
    const pw = document.getElementById("teacherPassword").value.trim();
    const errorEl = document.getElementById("teacherLoginError");

    if (!pw) {
      errorEl.textContent = "パスワードを入力してください。";
      return;
    }

    if (pw === TEACHER_PASSWORD) {
      teacherLoggedIn = true;
      errorEl.textContent = "";
      document.getElementById("teacherLoginBox").classList.add("hidden");
      document.getElementById("teacherPanel").classList.remove("hidden");
    } else {
      errorEl.textContent = "パスワードが違います。";
    }
  });

  // 主催者ログイン
  const organizerLoginButton = document.getElementById("organizerLoginButton");
  organizerLoginButton.addEventListener("click", () => {
    const pw = document.getElementById("organizerPassword").value.trim();
    const errorEl = document.getElementById("organizerLoginError");

    if (!pw) {
      errorEl.textContent = "パスワードを入力してください。";
      return;
    }

    if (pw === ORGANIZER_PASSWORD) {
      organizerLoggedIn = true;
      errorEl.textContent = "";
      document.getElementById("organizerLoginBox").classList.add("hidden");
      document.getElementById("organizerPanel").classList.remove("hidden");
    } else {
      errorEl.textContent = "パスワードが違います。";
    }
  });
}

/* ==========================
 * データ読み込み（イベント / 応募）
 * ========================== */

function loadAllData() {
  // イベント一覧
  loadEventsFromSheet().then(() => {
    // 応募一覧（失敗してもアプリ全体は動くようにする）
    loadApplicationsFromSheet().catch((err) => {
      console.warn("応募一覧の読み込みに失敗しました:", err);
    });
  });
}

function loadEventsFromSheet() {
  const statusStudent = document.getElementById("studentStatusMessage");
  const statusTeacher = document.getElementById("teacherStatusMessage");
  statusStudent.textContent = "イベントデータを読み込み中です…";
  statusTeacher.textContent = "イベントデータを読み込み中です…";

  return fetch(EVENTS_CSV_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error("イベントCSVを取得できませんでした");
      }
      return res.text();
    })
    .then((csvText) => {
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
        statusStudent.textContent =
          "イベントデータがありません（スプレッドシートを確認してください）。";
        statusTeacher.textContent =
          "イベントデータがありません（スプレッドシートを確認してください）。";
      } else {
        statusStudent.textContent = `現在 ${allEvents.length} 件のボランティアが登録されています。`;
        statusTeacher.textContent = "";
      }

      // 中学生ビューの初期表示
      buildStudentFilterOptions();
      filteredEventsStudent = allEvents.slice();
      renderStudentCards(filteredEventsStudent);

      // 先生ビューの初期表示
      buildTeacherFilterOptions();
      filteredEventsTeacher = allEvents.slice();
      renderTeacherEventsTable(filteredEventsTeacher);
    })
    .catch((err) => {
      console.error(err);
      statusStudent.textContent =
        "イベントデータの読み込み中にエラーが発生しました。管理者にご確認ください。";
      statusTeacher.textContent =
        "イベントデータの読み込み中にエラーが発生しました。管理者にご確認ください。";
      throw err;
    });
}

function loadApplicationsFromSheet() {
  return fetch(APPLICATIONS_CSV_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error("応募一覧CSVを取得できませんでした");
      }
      return res.text();
    })
    .then((csvText) => {
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      allApplications = parsed.data.map((row) => ({
        event_title: row.event_title || "",
        student_name: row.student_name || "",
        school: row.school || "",
        grade: row.grade || "",
        class: row.class || "",
        status: row.status || "",
      }));

      renderApplicationsTable(allApplications);
    });
}

/* ==========================
 * 中学生ビュー：フィルターと描画
 * ========================== */

function setupStudentFilters() {
  const searchInput = document.getElementById("studentSearchInput");
  const categorySelect = document.getElementById("studentCategorySelect");
  const dateSelect = document.getElementById("studentDateSelect");

  searchInput.addEventListener("input", applyStudentFilters);
  categorySelect.addEventListener("change", applyStudentFilters);
  dateSelect.addEventListener("change", applyStudentFilters);
}

function buildStudentFilterOptions() {
  const categorySelect = document.getElementById("studentCategorySelect");
  const dateSelect = document.getElementById("studentDateSelect");

  clearSelectOptions(categorySelect);
  clearSelectOptions(dateSelect);

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

function applyStudentFilters() {
  const searchInput = document.getElementById("studentSearchInput");
  const categorySelect = document.getElementById("studentCategorySelect");
  const dateSelect = document.getElementById("studentDateSelect");
  const statusEl = document.getElementById("studentStatusMessage");

  const keyword = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  const date = dateSelect.value;

  filteredEventsStudent = allEvents.filter((ev) => {
    // キーワード：タイトル・説明・場所・分野・対象
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

    const categoryOk = category ? ev.category === category : true;
    const dateOk = date ? ev.date === date : true;

    return keywordOk && categoryOk && dateOk;
  });

  if (!filteredEventsStudent.length) {
    statusEl.textContent = "条件に合うボランティアは見つかりませんでした。";
  } else {
    statusEl.textContent = `現在 ${filteredEventsStudent.length} 件のボランティアが見つかりました。`;
  }

  renderStudentCards(filteredEventsStudent);
}

function renderStudentCards(events) {
  const container = document.getElementById("studentCardsContainer");
  container.innerHTML = "";

  if (!events.length) return;

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
      btn.textContent = "このボランティアに申し込む";
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
 * 先生ビュー：フィルターとテーブル
 * ========================== */

function setupTeacherFilters() {
  const categorySelect = document.getElementById("teacherCategorySelect");
  const dateSelect = document.getElementById("teacherDateSelect");

  categorySelect.addEventListener("change", applyTeacherFilters);
  dateSelect.addEventListener("change", applyTeacherFilters);
}

function buildTeacherFilterOptions() {
  const categorySelect = document.getElementById("teacherCategorySelect");
  const dateSelect = document.getElementById("teacherDateSelect");

  clearSelectOptions(categorySelect);
  clearSelectOptions(dateSelect);

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

function applyTeacherFilters() {
  const categorySelect = document.getElementById("teacherCategorySelect");
  const dateSelect = document.getElementById("teacherDateSelect");

  const category = categorySelect.value;
  const date = dateSelect.value;

  filteredEventsTeacher = allEvents.filter((ev) => {
    const categoryOk = category ? ev.category === category : true;
    const dateOk = date ? ev.date === date : true;
    return categoryOk && dateOk;
  });

  renderTeacherEventsTable(filteredEventsTeacher);
}

function renderTeacherEventsTable(events) {
  const tbody = document.querySelector("#teacherEventsTable tbody");
  tbody.innerHTML = "";

  if (!events.length) return;

  events.forEach((ev) => {
    const tr = document.createElement("tr");

    const tdTitle = document.createElement("td");
    tdTitle.textContent = ev.title || "無題";

    const tdDatetime = document.createElement("td");
    tdDatetime.textContent = `${ev.date} ${ev.time}`;

    const tdPlace = document.createElement("td");
    tdPlace.textContent = ev.place;

    const tdTarget = document.createElement("td");
    tdTarget.textContent = ev.target;

    const tdCategory = document.createElement("td");
    tdCategory.textContent = ev.category;

    const tdDeadline = document.createElement("td");
    tdDeadline.textContent = ev.deadline || "未定";

    tr.appendChild(tdTitle);
    tr.appendChild(tdDatetime);
    tr.appendChild(tdPlace);
    tr.appendChild(tdTarget);
    tr.appendChild(tdCategory);
    tr.appendChild(tdDeadline);

    tbody.appendChild(tr);
  });
}

/* 応募一覧テーブル（先生用） */

function renderApplicationsTable(applications) {
  const tbody = document.querySelector("#applicationsTable tbody");
  tbody.innerHTML = "";

  if (!applications.length) return;

  applications.forEach((ap) => {
    const tr = document.createElement("tr");

    const tdEvent = document.createElement("td");
    tdEvent.textContent = ap.event_title || "";

    const tdName = document.createElement("td");
    tdName.textContent = ap.student_name || "";

    const tdSchool = document.createElement("td");
    tdSchool.textContent = ap.school || "";

    const tdGrade = document.createElement("td");
    tdGrade.textContent = ap.grade || "";

    const tdClass = document.createElement("td");
    tdClass.textContent = ap.class || "";

    const tdStatus = document.createElement("td");
    tdStatus.textContent = ap.status || "";

    tr.appendChild(tdEvent);
    tr.appendChild(tdName);
    tr.appendChild(tdSchool);
    tr.appendChild(tdGrade);
    tr.appendChild(tdClass);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });
}

/* ==========================
 * 主催者フォーム
 * ========================== */

function setupOrganizerForm() {
  const form = document.getElementById("organizerEventForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {
      title: document.getElementById("orgTitle").value.trim(),
      date: document.getElementById("orgDate").value.trim(),
      time: document.getElementById("orgTime").value.trim(),
      place: document.getElementById("orgPlace").value.trim(),
      target: document.getElementById("orgTarget").value.trim(),
      category: document.getElementById("orgCategory").value.trim(),
      capacity: document.getElementById("orgCapacity").value.trim(),
      deadline: document.getElementById("orgDeadline").value.trim(),
      description: document.getElementById("orgDescription").value.trim(),
      apply_url: document.getElementById("orgApplyUrl").value.trim(),
    };

    const previewBox = document.getElementById("organizerPreview");
    const previewJson = document.getElementById("organizerPreviewJson");

    previewJson.textContent = JSON.stringify(data, null, 2);
    previewBox.classList.remove("hidden");

    alert(
      "この内容をスプレッドシートに登録するには、GoogleフォームまたはApps Scriptと連携してください。（現在はプレビューのみ）"
    );
  });
}

/* ==========================
 * ユーティリティ
 * ========================== */

// select要素のうち value="" 以外の option を削除
function clearSelectOptions(selectEl) {
  const keep = [];
  for (const opt of selectEl.options) {
    if (opt.value === "") keep.push(opt);
  }
  selectEl.innerHTML = "";
  keep.forEach((opt) => selectEl.appendChild(opt));
}

// HTMLエスケープ
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
