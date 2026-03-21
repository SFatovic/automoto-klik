const quizState = {
  manifest: null,
  quiz: null,
  currentIndex: 0,
  selectedAnswers: [],
  jsonCache: new Map()
};

const quizCategoryMap = {
  brand: {
    title: "🚗 Brand kvizovi"
  },
  f1: {
    title: "🏁 F1 kvizovi"
  },
  general: {
    title: "🧠 Opći kvizovi"
  },
  other: {
    title: "📦 Ostali kvizovi"
  }
};

document.addEventListener("DOMContentLoaded", initQuizPages);

async function initQuizPages() {
  try {
    if (document.getElementById("quizzesGrid")) {
      await loadQuizListPage();
    }

    if (document.body.id === "quizPage") {
      await loadSingleQuizPage();
    }
  } catch (error) {
    console.error("Greška pri inicijalizaciji kviz stranice:", error);

    const grid = document.getElementById("quizzesGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="info-box text-center">
            <p class="mb-2"><strong>Kvizove trenutno nije moguće učitati.</strong></p>
            <p class="mb-0">Provjeri koristiš li lokalni server i postoji li datoteka <code>data/quizzes-manifest.json</code>.</p>
          </div>
        </div>
      `;
    }

    if (document.body.id === "quizPage") {
      renderQuizError("Kviz nije moguće učitati. Provjeri putanju do JSON datoteka i koristi lokalni server.");
    }
  }
}

async function fetchJson(path) {
  if (quizState.jsonCache.has(path)) {
    return quizState.jsonCache.get(path);
  }

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Greška pri učitavanju: ${path} (status ${response.status})`);
  }

  const data = await response.json();
  quizState.jsonCache.set(path, data);

  return data;
}

async function loadQuizManifest() {
  if (quizState.manifest) return quizState.manifest;

  const manifest = await fetchJson("data/quizzes-manifest.json");
  quizState.manifest = Array.isArray(manifest) ? manifest : [];

  return quizState.manifest;
}

async function loadQuizListPage() {
  const manifest = await loadQuizManifest();
  const grid = document.getElementById("quizzesGrid");

  if (!grid) return;

  if (!manifest.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="info-box text-center">
          <p class="mb-0">Trenutno nema dostupnih kvizova u manifestu.</p>
        </div>
      </div>
    `;
    return;
  }

  const grouped = groupQuizzesByCategory(manifest);
  let html = "";

  Object.keys(quizCategoryMap).forEach((categoryKey) => {
    const quizzes = grouped[categoryKey];
    if (!quizzes || quizzes.length === 0) return;

    html += `
      <div class="col-12 mt-4">
        <h3 class="cards-section-title mb-3">${quizCategoryMap[categoryKey].title}</h3>
      </div>
    `;

    html += quizzes
      .map(
        (quiz) => `
          <div class="col-md-6 col-lg-4">
            <a
              href="kviz.html?quiz=${encodeURIComponent(quiz.id)}"
              class="tool-card-link text-decoration-none d-block h-100"
              aria-label="Pokreni kviz ${escapeHtml(quiz.title)}"
            >
              <article class="tool-card h-100">
                <div class="tool-card-body">
                  <h4>${escapeHtml(quiz.title)}</h4>
                  <p class="tool-card-text">${escapeHtml(quiz.description || "")}</p>
                  <p class="tool-card-text mt-2">
                    <strong>${Number(quiz.questionCount) || 0}</strong> pitanja
                  </p>
                </div>
              </article>
            </a>
          </div>
        `
      )
      .join("");
  });

  grid.innerHTML = html;
}

function groupQuizzesByCategory(items) {
  return items.reduce((accumulator, item) => {
    const category = quizCategoryMap[item.category] ? item.category : "other";

    if (!accumulator[category]) {
      accumulator[category] = [];
    }

    accumulator[category].push(item);
    return accumulator;
  }, {});
}

async function loadSingleQuizPage() {
  const params = new URLSearchParams(window.location.search);
  const quizId = params.get("quiz");

  if (!quizId) {
    renderQuizError("Nedostaje ID kviza u URL-u.");
    return;
  }

  const manifest = await loadQuizManifest();
  const manifestItem = manifest.find((quiz) => quiz.id === quizId);

  if (!manifestItem) {
    renderQuizError("Kviz nije pronađen.");
    return;
  }

  const quiz = await fetchJson(manifestItem.file);

  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    renderQuizError("Kviz nema ispravno definirana pitanja.");
    return;
  }

  quizState.quiz = quiz;
  quizState.currentIndex = 0;
  quizState.selectedAnswers = [];

  const titleEl = document.getElementById("quizTitle");
  const descEl = document.getElementById("quizDescription");

  if (titleEl) titleEl.textContent = quiz.title;
  if (descEl) descEl.textContent = quiz.description || "";

  document.title = `${quiz.title} | AutoMoto KLIK!`;

  renderQuestion();
}

function renderQuestion() {
  const quiz = quizState.quiz;
  const question = quiz?.questions?.[quizState.currentIndex];

  const progressEl = document.getElementById("quizProgress");
  const contentEl = document.getElementById("quizContent");

  if (!quiz || !question || !contentEl) return;

  const selectedIndex = quizState.selectedAnswers[quizState.currentIndex];

  if (progressEl) {
    progressEl.textContent = `Pitanje ${quizState.currentIndex + 1} od ${quiz.questions.length}`;
  }

  contentEl.innerHTML = `
    <div class="custom-card">
      <div class="card-body-custom">
        <div class="quiz-progress mb-3">${quizState.currentIndex + 1} / ${quiz.questions.length}</div>

        <h3 class="mb-4">${escapeHtml(question.question)}</h3>

        ${
          question.image
            ? `
              <div class="mb-4">
                <img
                  src="${escapeHtml(question.image)}"
                  alt="Vizual uz pitanje"
                  class="quiz-question-image"
                  loading="lazy"
                />
              </div>
            `
            : ""
        }

        <div class="quiz-answers" role="group" aria-label="Odgovori na pitanje">
          ${(question.answers || [])
            .map(
              (answer, index) => `
                <button
                  type="button"
                  class="quiz-answer-btn ${selectedIndex === index ? "selected" : ""}"
                  data-answer-index="${index}"
                  aria-pressed="${selectedIndex === index ? "true" : "false"}"
                >
                  ${escapeHtml(answer)}
                </button>
              `
            )
            .join("")}
        </div>

        <div class="mt-4 d-grid">
          <button
            type="button"
            id="nextQuestionBtn"
            class="btn btn-primary btn-lg"
            ${typeof selectedIndex === "number" ? "" : "disabled"}
          >
            ${quizState.currentIndex === quiz.questions.length - 1 ? "Završi kviz" : "Dalje"}
          </button>
        </div>
      </div>
    </div>
  `;

  bindQuestionEvents();
}

function bindQuestionEvents() {
  const answerButtons = document.querySelectorAll(".quiz-answer-btn");
  const nextButton = document.getElementById("nextQuestionBtn");

  answerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedIndex = Number(button.dataset.answerIndex);

      quizState.selectedAnswers[quizState.currentIndex] = selectedIndex;

      answerButtons.forEach((btn) => {
        btn.classList.remove("selected");
        btn.setAttribute("aria-pressed", "false");
      });

      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");

      if (nextButton) {
        nextButton.disabled = false;
      }
    });
  });

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const selectedIndex = quizState.selectedAnswers[quizState.currentIndex];
      if (typeof selectedIndex !== "number") return;

      if (quizState.currentIndex < quizState.quiz.questions.length - 1) {
        quizState.currentIndex += 1;
        renderQuestion();
      } else {
        renderQuizResult();
      }
    });
  }
}

function renderQuizResult() {
  const quiz = quizState.quiz;
  const progressEl = document.getElementById("quizProgress");
  const contentEl = document.getElementById("quizContent");

  if (!quiz || !contentEl) return;

  let score = 0;

  quiz.questions.forEach((question, index) => {
    if (quizState.selectedAnswers[index] === question.correctIndex) {
      score += 1;
    }
  });

  const percentage = Math.round((score / quiz.questions.length) * 100);
  const performanceLabel = getPerformanceLabel(percentage);

  if (progressEl) {
    progressEl.textContent = "Rezultat";
  }

  contentEl.innerHTML = `
    <div class="custom-card">
      <div class="card-body-custom">
        <p class="small-label mb-2">Završni report</p>
        <h3 class="mb-2">${escapeHtml(quiz.title)}</h3>
        <p class="mb-2">
          Točni odgovori: <strong>${score} / ${quiz.questions.length}</strong> (${percentage}%)
        </p>
        <p class="quiz-performance-note mb-4">${performanceLabel}</p>

        <div class="quiz-report-list">
          ${quiz.questions
            .map((question, index) => {
              const userAnswerIndex = quizState.selectedAnswers[index];
              const isCorrect = userAnswerIndex === question.correctIndex;

              return `
                <div class="quiz-report-item">
                  <h4>Pitanje ${index + 1}</h4>
                  <p class="mb-2"><strong>${escapeHtml(question.question)}</strong></p>
                  <p class="${isCorrect ? "quiz-report-correct" : "quiz-report-wrong"}">
                    Tvoj odgovor: ${escapeHtml(question.answers[userAnswerIndex] || "Nije odgovoreno")}
                  </p>
                  <p class="quiz-report-correct">
                    Točan odgovor: ${escapeHtml(question.answers[question.correctIndex] || "")}
                  </p>
                  ${
                    question.tip
                      ? `<p class="quiz-report-tip">Objašnjenje: ${escapeHtml(question.tip)}</p>`
                      : ""
                  }
                </div>
              `;
            })
            .join("")}
        </div>

        <div class="mt-4 d-flex flex-column flex-md-row gap-3">
          <button type="button" id="restartQuizBtn" class="btn btn-primary btn-lg">
            Pokušaj ponovno
          </button>
          <a href="kvizovi.html" class="btn btn-primary btn-lg">
            Natrag na kvizove
          </a>
        </div>
      </div>
    </div>
  `;

  const restartBtn = document.getElementById("restartQuizBtn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      quizState.currentIndex = 0;
      quizState.selectedAnswers = [];
      renderQuestion();
    });
  }
}

function getPerformanceLabel(percentage) {
  if (percentage === 100) return "Savršeno. Ovaj kviz si odradio bez greške.";
  if (percentage >= 80) return "Vrlo jako. Znaš temu više nego solidno.";
  if (percentage >= 60) return "Dobar rezultat. Imaš bazu, ali još ima prostora za napredak.";
  if (percentage >= 40) return "Nije loše, ali ovaj brend ili tema ti još može zadati domaću zadaću.";
  return "Vrijeme je za revanš. Ovaj put kviz je bio jači.";
}

function renderQuizError(message) {
  const titleEl = document.getElementById("quizTitle");
  const descEl = document.getElementById("quizDescription");
  const contentEl = document.getElementById("quizContent");

  if (titleEl) titleEl.textContent = "Kviz nije dostupan";
  if (descEl) descEl.textContent = message;

  if (contentEl) {
    contentEl.innerHTML = `
      <div class="info-box">
        <p class="mb-0">${escapeHtml(message)}</p>
      </div>
    `;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}