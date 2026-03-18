const quizState = {
  manifest: [],
  quiz: null,
  currentIndex: 0,
  selectedAnswers: []
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
            <p class="mb-0">Provjeri koristiš li Live Server i postoji li datoteka <code>data/quizzes-manifest.json</code>.</p>
          </div>
        </div>
      `;
    }

    if (document.body.id === "quizPage") {
      renderQuizError("Kviz nije moguće učitati. Provjeri path do JSON datoteka i koristi lokalni server.");
    }
  }
}

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Greška pri učitavanju: ${path} (status ${response.status})`);
  }

  return response.json();
}

async function loadQuizListPage() {
  const manifest = await fetchJson("data/quizzes-manifest.json");
  quizState.manifest = manifest;

  const grid = document.getElementById("quizzesGrid");
  if (!grid) return;

  if (!Array.isArray(manifest) || manifest.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="info-box text-center">
          <p class="mb-0">Trenutno nema dostupnih kvizova u manifestu.</p>
        </div>
      </div>
    `;
    return;
  }

  const grouped = {};

  manifest.forEach(quiz => {
    const category = quiz.category || "general";

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(quiz);
  });

  let html = "";

  Object.keys(quizCategoryMap).forEach(categoryKey => {
    const quizzes = grouped[categoryKey];

    if (!quizzes || quizzes.length === 0) return;

    const category = quizCategoryMap[categoryKey];

    html += `
      <div class="col-12 mt-4">
        <h3 class="mb-3">${category.title}</h3>
      </div>
    `;

    html += quizzes.map(quiz => `
      <div class="col-md-6 col-lg-4">
        <a href="kviz.html?quiz=${quiz.id}" class="tool-card-link text-decoration-none d-block h-100">
          <div class="tool-card h-100">
            <div class="tool-card-body">
              <h4>${quiz.title}</h4>
              <p class="tool-card-text">${quiz.description}</p>
              <p class="tool-card-text mt-2"><strong>${quiz.questionCount || ""}</strong> pitanja</p>
            </div>
          </div>
        </a>
      </div>
    `).join("");
  });

  grid.innerHTML = html;
}

async function loadSingleQuizPage() {
  const params = new URLSearchParams(window.location.search);
  const quizId = params.get("quiz");

  if (!quizId) {
    renderQuizError("Nedostaje ID kviza u URL-u.");
    return;
  }

  const manifest = await fetchJson("data/quizzes-manifest.json");
  quizState.manifest = manifest;

  const manifestItem = manifest.find(q => q.id === quizId);

  if (!manifestItem) {
    renderQuizError("Kviz nije pronađen.");
    return;
  }

  const quiz = await fetchJson(manifestItem.file);
  quizState.quiz = quiz;
  quizState.currentIndex = 0;
  quizState.selectedAnswers = [];

  const titleEl = document.getElementById("quizTitle");
  const descEl = document.getElementById("quizDescription");

  if (titleEl) titleEl.textContent = quiz.title;
  if (descEl) descEl.textContent = quiz.description;

  document.title = `${quiz.title} | AutoMoto KLIK`;

  renderQuestion();
}

function renderQuestion() {
  const quiz = quizState.quiz;
  const question = quiz.questions[quizState.currentIndex];

  const progressEl = document.getElementById("quizProgress");
  const contentEl = document.getElementById("quizContent");

  if (!question || !contentEl) return;

  if (progressEl) {
    progressEl.textContent = `Pitanje ${quizState.currentIndex + 1} od ${quiz.questions.length}`;
  }

  contentEl.innerHTML = `
    <div class="custom-card">
      <div class="card-body-custom">
        <div class="quiz-progress mb-3">${quizState.currentIndex + 1} / ${quiz.questions.length}</div>

        <h3 class="mb-4">${question.question}</h3>

        ${question.image ? `
          <div class="mb-4">
            <img src="${question.image}" alt="Slika pitanja" class="quiz-question-image">
          </div>
        ` : ""}

        <div class="quiz-answers">
          ${question.answers.map((answer, index) => `
            <button type="button" class="quiz-answer-btn" data-answer-index="${index}">
              ${answer}
            </button>
          `).join("")}
        </div>

        <div class="mt-4 d-grid">
          <button type="button" id="nextQuestionBtn" class="btn btn-primary btn-lg" disabled>
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

  let selectedIndex = null;

  answerButtons.forEach(button => {
    button.addEventListener("click", () => {
      answerButtons.forEach(btn => btn.classList.remove("selected"));
      button.classList.add("selected");

      selectedIndex = Number(button.dataset.answerIndex);
      quizState.selectedAnswers[quizState.currentIndex] = selectedIndex;

      if (nextButton) {
        nextButton.disabled = false;
      }
    });
  });

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (selectedIndex === null) return;

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

  let score = 0;

  quiz.questions.forEach((question, index) => {
    if (quizState.selectedAnswers[index] === question.correctIndex) {
      score += 1;
    }
  });

  const percentage = Math.round((score / quiz.questions.length) * 100);

  if (progressEl) {
    progressEl.textContent = "Rezultat";
  }

  contentEl.innerHTML = `
    <div class="custom-card">
      <div class="card-body-custom">
        <p class="small-label mb-2">Završni report</p>
        <h3 class="mb-2">${quiz.title}</h3>
        <p class="mb-4">Točni odgovori: <strong>${score} / ${quiz.questions.length}</strong> (${percentage}%)</p>

        <div class="quiz-report-list">
          ${quiz.questions.map((question, index) => {
            const userAnswerIndex = quizState.selectedAnswers[index];
            const isCorrect = userAnswerIndex === question.correctIndex;

            return `
              <div class="quiz-report-item">
                <h4>Pitanje ${index + 1}</h4>
                <p class="mb-2"><strong>${question.question}</strong></p>
                <p class="${isCorrect ? "quiz-report-correct" : "quiz-report-wrong"}">
                  Tvoj odgovor: ${question.answers[userAnswerIndex] || "Nije odgovoreno"}
                </p>
                <p class="quiz-report-correct">
                  Točan odgovor: ${question.answers[question.correctIndex]}
                </p>
                ${question.tip ? `<p class="quiz-report-tip">Objašnjenje: ${question.tip}</p>` : ""}
              </div>
            `;
          }).join("")}
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

function renderQuizError(message) {
  const titleEl = document.getElementById("quizTitle");
  const descEl = document.getElementById("quizDescription");
  const contentEl = document.getElementById("quizContent");

  if (titleEl) titleEl.textContent = "Kviz nije dostupan";
  if (descEl) descEl.textContent = message;

  if (contentEl) {
    contentEl.innerHTML = `
      <div class="info-box">
        <p class="mb-0">${message}</p>
      </div>
    `;
  }
}