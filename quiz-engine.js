const quizState = {
  manifest: null,
  quiz: null,
  manifestItem: null,
  currentIndex: 0,
  selectedAnswers: [],
  screen: "intro",
  pendingInterstitial: null,
  lastComputedResult: null,
  jsonCache: new Map(),
  activeQuizCategory: "all"
};

const quizCategoryMap = {
  brand: {
    title: "Brand kvizovi",
    shortLabel: "Brand"
  },
  f1: {
    title: "F1 kvizovi",
    shortLabel: "F1"
  },
  general: {
    title: "Opći kvizovi",
    shortLabel: "Opći"
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

  renderQuizCategoryFilters(manifest);
  renderQuizCards(manifest);

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
          class="quiz-card-link text-decoration-none d-block h-100"
          aria-label="Pokreni kviz ${escapeHtml(quiz.title)}"
        >
          <article class="quiz-card h-100">
            <div class="quiz-card-body">
              <div class="quiz-card-badges mb-3">
                <span class="quiz-card-badge">${escapeHtml(getCategoryEyebrow(quiz.category))}</span>
                ${quiz.difficulty ? `<span class="quiz-card-badge quiz-card-badge-muted">${escapeHtml(quiz.difficulty)}</span>` : ""}
              </div>

              <h4 class="quiz-card-title">${escapeHtml(quiz.title)}</h4>

              ${
                quiz.coverImage
                  ? `
                    <div class="quiz-card-cover">
                      <img
                        src="${escapeHtml(quiz.coverImage)}"
                        alt="${escapeHtml(quiz.title)} naslovna fotografija"
                        class="quiz-card-cover-image"
                        loading="lazy"
                      />
                    </div>
                  `
                  : `
                    <div class="quiz-card-cover quiz-card-cover-placeholder" aria-hidden="true"></div>
                  `
              }

              <div class="quiz-card-meta-list">
                <span class="quiz-card-meta">${Number(quiz.questionCount) || 0} pitanja</span>
                ${quiz.estimatedTime ? `<span class="quiz-card-meta">${escapeHtml(quiz.estimatedTime)}</span>` : ""}
              </div>

              <div class="card-spacer"></div>
              <span class="quiz-card-cta">Pokreni kviz</span>
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

function renderQuizCategoryFilters(items) {
  const filtersEl = document.getElementById("quizCategoryFilters");
  if (!filtersEl) return;

  const counts = getQuizCategoryCounts(items);

  const filterItems = [
    {
      key: "all",
      label: "Sve",
      count: items.length
    },
    ...Object.keys(quizCategoryMap).map((categoryKey) => ({
      key: categoryKey,
      label: quizCategoryMap[categoryKey].shortLabel,
      count: counts[categoryKey] || 0
    }))
  ];

  filtersEl.innerHTML = `
    <div class="quiz-filters" role="tablist" aria-label="Filter kvizova po kategoriji">
      ${filterItems
        .map(
          (filter) => `
            <button
              type="button"
              class="quiz-filter-chip ${quizState.activeQuizCategory === filter.key ? "is-active" : ""}"
              data-quiz-filter="${filter.key}"
              role="tab"
              aria-selected="${quizState.activeQuizCategory === filter.key ? "true" : "false"}"
            >
              <span class="quiz-filter-chip-label">${escapeHtml(filter.label)}</span>
              <span class="quiz-filter-chip-count">${filter.count}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;

  filtersEl.querySelectorAll("[data-quiz-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextCategory = button.getAttribute("data-quiz-filter") || "all";
      quizState.activeQuizCategory = nextCategory;
      renderQuizCategoryFilters(items);
      renderQuizCards(items);
    });
  });
}

function renderQuizCards(items) {
  const grid = document.getElementById("quizzesGrid");
  if (!grid) return;

  const filteredItems =
    quizState.activeQuizCategory === "all"
      ? items
      : items.filter((item) => item.category === quizState.activeQuizCategory);

  if (!filteredItems.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="info-box text-center">
          <p class="mb-0">Trenutno nema kvizova u ovoj kategoriji.</p>
        </div>
      </div>
    `;
        return;
  }

  const grouped = groupQuizzesByCategory(filteredItems);
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
              class="quiz-card-link text-decoration-none d-block h-100"
              aria-label="Pokreni kviz ${escapeHtml(quiz.title)}"
            >
              <article class="quiz-card h-100">
                <div class="quiz-card-body">
                  <div class="quiz-card-badges mb-3">
                    <span class="quiz-card-badge">${escapeHtml(getCategoryEyebrow(quiz.category))}</span>
                    ${quiz.difficulty ? `<span class="quiz-card-badge quiz-card-badge-muted">${escapeHtml(quiz.difficulty)}</span>` : ""}
                  </div>

                  <h4 class="quiz-card-title">${escapeHtml(quiz.title)}</h4>

                  ${
                    quiz.coverImage
                      ? `
                        <div class="quiz-card-cover">
                          <img
                            src="${escapeAttribute(quiz.coverImage)}"
                            alt="${escapeAttribute(quiz.title)} naslovna fotografija"
                            class="quiz-card-cover-image"
                            loading="lazy"
                          />
                        </div>
                      `
                      : `
                        <div class="quiz-card-cover quiz-card-cover-placeholder" aria-hidden="true"></div>
                      `
                  }

                  <div class="quiz-card-meta-list">
                    <span class="quiz-card-meta">${Number(quiz.questionCount) || 0} pitanja</span>
                    ${quiz.estimatedTime ? `<span class="quiz-card-meta">${escapeHtml(quiz.estimatedTime)}</span>` : ""}
                  </div>

                  <div class="card-spacer"></div>
                  <span class="quiz-card-cta">Pokreni kviz</span>
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

function getQuizCategoryCounts(items) {
  return items.reduce((accumulator, item) => {
    if (!quizCategoryMap[item.category]) return accumulator;

    accumulator[item.category] = (accumulator[item.category] || 0) + 1;
    return accumulator;
  }, {});
}

function groupQuizzesByCategory(items) {
  return items.reduce((accumulator, item) => {
    if (!quizCategoryMap[item.category]) return accumulator;

    if (!accumulator[item.category]) {
      accumulator[item.category] = [];
    }

    accumulator[item.category].push(item);
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
  quizState.manifestItem = manifestItem;
  resetQuizState();
    const titleEl = document.getElementById("quizTitle");
  const descEl = document.getElementById("quizDescription");

  if (titleEl) titleEl.textContent = quiz.title;
  if (descEl) descEl.textContent = quiz.description || manifestItem.description || "";

  document.title = `${quiz.title} | AutoMoto KLIK!`;

  renderCurrentScreen();
}

function resetQuizState() {
  quizState.currentIndex = 0;
  quizState.selectedAnswers = [];
  quizState.screen = "intro";
  quizState.pendingInterstitial = null;
  quizState.lastComputedResult = null;
}

function renderCurrentScreen() {
  switch (quizState.screen) {
    case "intro":
      renderQuizIntro();
      break;
    case "question":
      renderQuestion();
      break;
    case "interstitial":
      renderInterstitial();
      break;
    case "result":
      renderQuizResult();
      break;
    default:
      renderQuizIntro();
  }
}

function updateProgressLabel(label = "") {
  const progressEl = document.getElementById("quizProgress");
  if (progressEl) {
    progressEl.textContent = label;
  }
}

function renderQuizIntro() {
  const quiz = quizState.quiz;
  const manifestItem = quizState.manifestItem;
  const contentEl = document.getElementById("quizContent");

  if (!quiz || !contentEl) return;

  const intro = quiz.intro || {};
  const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : Number(manifestItem?.questionCount) || 0;
  const estimatedTime = intro.estimatedTime || manifestItem?.estimatedTime || estimateQuizTime(questionCount);
  const difficulty = intro.difficulty || manifestItem?.difficulty || "Lagano";
  const eyebrow = intro.eyebrow || getCategoryEyebrow(manifestItem?.category);
  const introText =
    intro.text ||
    quiz.description ||
    manifestItem?.description ||
    "Riješi kviz, testiraj svoje znanje i saznaj koliko stvarno poznaješ ovu temu.";
  const coverImage = intro.coverImage || manifestItem?.coverImage || "";

  updateProgressLabel("");

  contentEl.innerHTML = `
    <section class="quiz-screen quiz-intro-screen">
      <div class="quiz-panel quiz-intro-panel quiz-intro-panel-showcase">
        <div class="quiz-intro-top quiz-intro-top-showcase">
          <span class="quiz-intro-eyebrow">${escapeHtml(eyebrow)}</span>
          <h2 class="quiz-intro-title">${escapeHtml(quiz.title)}</h2>
          <p class="quiz-intro-text">${escapeHtml(introText)}</p>
        </div>

        ${coverImage
          ? `
            <div class="quiz-intro-cover-wrap quiz-intro-cover-wrap-compact">
              <img
                src="${escapeAttribute(coverImage)}"
                alt="${escapeAttribute(quiz.title)} naslovna fotografija"
                class="quiz-intro-cover-image"
                loading="eager"
              />
            </div>
          `
          : ""}

        <div class="quiz-intro-footer-compact">
          <div class="quiz-intro-meta-grid quiz-intro-meta-grid-showcase quiz-intro-meta-grid-compact">
            <div class="quiz-intro-meta-card">
              <span class="quiz-intro-meta-label">Broj pitanja</span>
              <strong class="quiz-intro-meta-value">${questionCount}</strong>
            </div>
            <div class="quiz-intro-meta-card">
              <span class="quiz-intro-meta-label">Trajanje</span>
              <strong class="quiz-intro-meta-value">${escapeHtml(estimatedTime)}</strong>
            </div>
            <div class="quiz-intro-meta-card">
              <span class="quiz-intro-meta-label">Razina</span>
              <strong class="quiz-intro-meta-value">${escapeHtml(difficulty)}</strong>
            </div>
          </div>

          <div class="quiz-intro-actions quiz-intro-actions-showcase quiz-intro-actions-compact">
            <button type="button" class="quiz-primary-btn quiz-primary-btn-showcase" id="startQuizBtn">
              ${escapeHtml(intro.ctaLabel || "Pokreni")}
            </button>
            <a href="kvizovi.html" class="quiz-secondary-btn quiz-secondary-btn-showcase">
              Natrag na kvizove
            </a>
          </div>
        </div>
      </div>
    </section>
  `;

  const startBtn = document.getElementById("startQuizBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      quizState.screen = "question";
      renderCurrentScreen();
    });
  }
}

function renderQuestion() {
  const quiz = quizState.quiz;
  const contentEl = document.getElementById("quizContent");

  if (!quiz || !Array.isArray(quiz.questions) || !contentEl) return;

  const question = quiz.questions[quizState.currentIndex];
  if (!question) {
    quizState.screen = "result";
    renderCurrentScreen();
    return;
  }

  const selectedAnswer = quizState.selectedAnswers[quizState.currentIndex];
  const progressPercent = ((quizState.currentIndex + 1) / quiz.questions.length) * 100;

  updateProgressLabel(`Pitanje ${quizState.currentIndex + 1} od ${quiz.questions.length}`);

  contentEl.innerHTML = `
    <section class="quiz-screen quiz-question-screen">
      <div class="quiz-panel quiz-progress-panel">
        <div class="quiz-progress-meta">
          <span class="quiz-progress-step">Pitanje ${quizState.currentIndex + 1}/${quiz.questions.length}</span>
          <span class="quiz-progress-percent">${Math.round(progressPercent)}%</span>
        </div>
        <div class="quiz-progress-track" aria-hidden="true">
          <span class="quiz-progress-fill" style="width: ${progressPercent}%"></span>
        </div>
      </div>

      <div class="quiz-panel quiz-question-panel">
        ${question.image ? `<div class="quiz-question-image-wrap"><img src="${escapeAttribute(question.image)}" alt="${escapeAttribute(question.question)}" class="quiz-question-image"></div>` : ""}
        <h2 class="quiz-question-title">${escapeHtml(question.question)}</h2>

        <div class="quiz-answers" role="list">
          ${question.answers
            .map((answer, index) => {
              const checked = selectedAnswer === index ? "checked" : "";
              return `
                <label class="quiz-answer-option ${checked ? "is-selected" : ""}">
                  <input type="radio" name="quizAnswer" value="${index}" ${checked}>
                  <span class="quiz-answer-text">${escapeHtml(answer)}</span>
                </label>
              `;
            })
            .join("")}
        </div>

        <div class="quiz-question-actions quiz-question-actions-single">
          <button type="button" class="quiz-primary-btn quiz-primary-btn-strong" id="nextQuestionBtn">
            ${quizState.currentIndex === quiz.questions.length - 1 ? "Prikaži rezultat" : "Dalje"}
          </button>
        </div>
      </div>
    </section>
  `;

  const answerInputs = contentEl.querySelectorAll('input[name="quizAnswer"]');
  answerInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      const selectedIndex = Number(event.target.value);
      quizState.selectedAnswers[quizState.currentIndex] = selectedIndex;
      renderQuestion();
    });
  });

  const nextBtn = document.getElementById("nextQuestionBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", goToNextStep);
  }
}

function goToPreviousQuestion() {
  if (quizState.currentIndex > 0) {
    quizState.currentIndex -= 1;
    quizState.screen = "question";
    quizState.pendingInterstitial = null;
    renderCurrentScreen();
  }
}

function goToNextStep() {
  const selectedAnswer = quizState.selectedAnswers[quizState.currentIndex];

  if (typeof selectedAnswer !== "number") {
    showInlineQuizNotice("Odaberi jedan odgovor prije nastavka.");
    return;
  }

  const nextQuestionIndex = quizState.currentIndex + 1;
  const interstitial = getInterstitialAfterQuestion(nextQuestionIndex);

  if (interstitial) {
    quizState.pendingInterstitial = interstitial;
    quizState.currentIndex = nextQuestionIndex;
    quizState.screen = "interstitial";
    renderCurrentScreen();
    return;
  }

  if (nextQuestionIndex >= quizState.quiz.questions.length) {
    quizState.currentIndex = nextQuestionIndex;
    quizState.screen = "result";
    renderCurrentScreen();
    return;
  }

  quizState.currentIndex = nextQuestionIndex;
     quizState.screen = "question";
  renderCurrentScreen();
}

function getInterstitialAfterQuestion(answeredCount) {
  const interstitials = Array.isArray(quizState.quiz?.interstitials) ? quizState.quiz.interstitials : [];
  return interstitials.find((item) => Number(item.afterQuestion) === Number(answeredCount)) || null;
}

function renderInterstitial() {
  const contentEl = document.getElementById("quizContent");
  const interstitial = quizState.pendingInterstitial;
  const totalQuestions = quizState.quiz?.questions?.length || 0;

  if (!contentEl || !interstitial) {
    quizState.screen = "question";
    renderCurrentScreen();
    return;
  }

  updateProgressLabel(`Napredak: ${Math.min(quizState.currentIndex, totalQuestions)} / ${totalQuestions}`);

  contentEl.innerHTML = `
    <section class="quiz-screen quiz-interstitial-screen">
      <div class="quiz-panel quiz-interstitial-panel">
        <span class="quiz-interstitial-badge">Kratka pauza</span>
        <h2 class="quiz-interstitial-title">${escapeHtml(interstitial.title || "Nastavljamo dalje")}</h2>
        <p class="quiz-interstitial-text">${escapeHtml(interstitial.text || "")}</p>

        <div class="quiz-interstitial-actions">
          <button type="button" class="quiz-primary-btn" id="continueQuizBtn">Nastavi kviz</button>
        </div>
      </div>
    </section>
  `;

  const continueBtn = document.getElementById("continueQuizBtn");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      quizState.pendingInterstitial = null;

      if (quizState.currentIndex >= totalQuestions) {
        quizState.screen = "result";
      } else {
        quizState.screen = "question";
      }

      renderCurrentScreen();
    });
  }
}

function renderQuizResult() {
  const quiz = quizState.quiz;
  const contentEl = document.getElementById("quizContent");

  if (!quiz || !contentEl) return;

  const result = computeQuizResult();
  quizState.lastComputedResult = result;

  updateProgressLabel("Kviz završen");

  contentEl.innerHTML = `
    <section class="quiz-screen quiz-result-screen">
      <div class="quiz-panel quiz-result-hero quiz-result-hero-premium">
        <span class="quiz-result-badge">Rezultat</span>
        <h2 class="quiz-result-title">${escapeHtml(result.headline)}</h2>
        <p class="quiz-result-summary">${escapeHtml(result.summary)}</p>

        <div class="quiz-score-ring quiz-score-ring-premium" aria-label="Rezultat kviza ${result.percentage} posto">
          <div class="quiz-score-ring-inner quiz-score-ring-inner-premium">
            <strong>${result.percentage}%</strong>
            <span>${result.correctAnswers}/${result.totalQuestions} točno</span>
          </div>
        </div>

        <div class="quiz-result-actions quiz-result-actions-premium">
          <button type="button" class="quiz-primary-btn" id="restartQuizBtn">Riješi ponovno</button>
          <a href="#quiz-review-section" class="quiz-secondary-btn quiz-secondary-btn-result">Pregled odgovora</a>
          <a href="kvizovi.html" class="quiz-secondary-btn quiz-secondary-btn-result">Još kvizova</a>
        </div>
      </div>

      <div class="quiz-panel quiz-result-cta-panel">
        <h3 class="quiz-subsection-title">Što dalje?</h3>
        <div class="quiz-cta-grid">
          <a href="kvizovi.html" class="quiz-cta-card">
            <strong>Istraži još kvizova</strong>
            <span>Pronađi novi brand, F1 ili opći auto kviz.</span>
          </a>
          <a href="ai-upiti.html" class="quiz-cta-card">
            <strong>Isprobaj AI alat</strong>
            <span>Generiraj auto upit za ChatGPT ili Gemini.</span>
          </a>
        </div>
        ${
          quiz.result?.shareText
            ? `<p class="quiz-result-share-text">${escapeHtml(quiz.result.shareText)}</p>`
            : ""
        }
      </div>

      <div class="quiz-panel quiz-related-panel">
        <h3 class="quiz-subsection-title">Povezani kvizovi</h3>
        ${renderRelatedQuizzes()}
      </div>

      <div class="quiz-panel quiz-review-panel" id="quiz-review-section">
        <h3 class="quiz-subsection-title">Pregled odgovora</h3>
        <div class="quiz-review-list">
          ${quiz.questions
            .map((question, index) => {
              const selectedIndex = quizState.selectedAnswers[index];
              const isCorrect = selectedIndex === question.correctIndex;
              const selectedAnswerText =
                typeof selectedIndex === "number" ? question.answers[selectedIndex] : "Nije odgovoreno";
              const correctAnswerText = question.answers[question.correctIndex];

              return `
                <article class="quiz-review-item ${isCorrect ? "is-correct" : "is-incorrect"}">
                  <div class="quiz-review-head">
                    <span class="quiz-review-number">Pitanje ${index + 1}</span>
                    <span class="quiz-review-status">${isCorrect ? "Točno" : "Netočno"}</span>
                  </div>
                  <h4 class="quiz-review-question">${escapeHtml(question.question)}</h4>
                  <p class="quiz-review-answer"><strong>Tvoj odgovor:</strong> ${escapeHtml(selectedAnswerText)}</p>
                  ${
                    !isCorrect
                      ? `<p class="quiz-review-answer"><strong>Točan odgovor:</strong> ${escapeHtml(correctAnswerText)}</p>`
                      : ""
                  }
                  ${
                    question.tip
                      ? `<p class="quiz-review-tip">${escapeHtml(question.tip)}</p>`
                      : ""
                  }
                </article>
              `;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;

  const restartBtn = document.getElementById("restartQuizBtn");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      resetQuizState();
      renderCurrentScreen();
    });
  }
}

function renderRelatedQuizzes() {
  const currentQuizId = quizState.manifestItem?.id;
  const currentCategory = quizState.manifestItem?.category;

  if (!Array.isArray(quizState.manifest) || quizState.manifest.length === 0) {
    return `<p class="quiz-empty-note">Trenutno nema povezanih kvizova.</p>`;
  }

  const related = quizState.manifest
    .filter((item) => item.id !== currentQuizId && item.category === currentCategory)
    .slice(0, 3);

  if (!related.length) {
    return `<p class="quiz-empty-note">Trenutno nema povezanih kvizova.</p>`;
  }

  return `
    <div class="quiz-related-grid quiz-related-grid-cards">
      ${related
        .map(
          (item) => `
            <a
              href="kviz.html?quiz=${encodeURIComponent(item.id)}"
              class="quiz-card-link quiz-related-card-link text-decoration-none d-block h-100"
              aria-label="Pokreni kviz ${escapeHtml(item.title)}"
            >
              <article class="quiz-card quiz-related-quiz-card h-100">
                <div class="quiz-card-body">
                  <div class="quiz-card-badges mb-3">
                    <span class="quiz-card-badge">${escapeHtml(getCategoryEyebrow(item.category))}</span>
                  </div>

                  <h4 class="quiz-card-title">${escapeHtml(item.title)}</h4>

                  ${
                    item.coverImage
                      ? `
                        <div class="quiz-card-cover">
                          <img
                            src="${escapeAttribute(item.coverImage)}"
                            alt="${escapeAttribute(item.title)} naslovna fotografija"
                            class="quiz-card-cover-image"
                            loading="lazy"
                          />
                        </div>
                      `
                      : `
                        <div class="quiz-card-cover quiz-card-cover-placeholder" aria-hidden="true"></div>
                      `
                  }

                  <div class="quiz-card-meta-list">
                    <span class="quiz-card-meta">${Number(item.questionCount) || 0} pitanja</span>
                  </div>

                  <div class="card-spacer"></div>
                  <span class="quiz-card-cta">Pokreni kviz</span>
                </div>
              </article>
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

function computeQuizResult() {
  const quiz = quizState.quiz;
  const totalQuestions = quiz.questions.length;
  let correctAnswers = 0;

  quiz.questions.forEach((question, index) => {
    if (quizState.selectedAnswers[index] === question.correctIndex) {
      correctAnswers += 1;
    }
  });

  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const profile = getResultProfile(percentage);

  return {
    totalQuestions,
    correctAnswers,
    percentage,
    ...profile
  };
}

function getResultProfile(percentage) {
  if (percentage >= 90) {
    return {
      headline: "Ozbiljan auto znalac",
      summary: "Odlično poznaješ temu i vidi se da ne pogađaš naslijepo. Ovo je rezultat za respekt."
    };
  }

  if (percentage >= 70) {
    return {
      headline: "Vrlo dobro znanje",
      summary: "Imaš jako dobru bazu i solidan osjećaj za detalje. Još malo i ulaziš u top razinu."
    };
  }

  if (percentage >= 40) {
    return {
      headline: "Dobra baza, ali ima mjesta za rast",
      summary: "Nisi loš, ali vidi se prostor za napredak. Još nekoliko kvizova i bit ćeš puno sigurniji."
    };
  }

  return {
    headline: "Vrijeme za revanš",
    summary: "Ovaj put nije sjelo, ali sad barem znaš gdje su rupe u znanju. Probaj ponovno i popravi rezultat."
  };
}

function showInlineQuizNotice(message) {
  const existingNotice = document.querySelector(".quiz-inline-notice");
  if (existingNotice) {
        existingNotice.remove();
  }

  const actionsWrap = document.querySelector(".quiz-question-actions");
  if (!actionsWrap) return;

  const notice = document.createElement("p");
  notice.className = "quiz-inline-notice";
  notice.textContent = message;

  actionsWrap.parentNode.insertBefore(notice, actionsWrap);

  window.setTimeout(() => {
    notice.remove();
  }, 2500);
}

function renderQuizError(message) {
  const contentEl = document.getElementById("quizContent");
  const titleEl = document.getElementById("quizTitle");
  const descEl = document.getElementById("quizDescription");

  if (titleEl) titleEl.textContent = "Greška";
  if (descEl) descEl.textContent = "Kviz trenutno nije dostupan.";
  if (!contentEl) return;

  updateProgressLabel("");

  contentEl.innerHTML = `
    <section class="quiz-screen">
      <div class="quiz-panel quiz-error-panel">
        <h2 class="quiz-error-title">Ups, nešto je pošlo krivo.</h2>
        <p class="quiz-error-text">${escapeHtml(message)}</p>
        <a href="kvizovi.html" class="quiz-primary-btn">Povratak na kvizove</a>
      </div>
    </section>
  `;
}

function estimateQuizTime(questionCount) {
  if (!questionCount || Number.isNaN(Number(questionCount))) return "2-3 min";
  if (questionCount <= 5) return "1-2 min";
  if (questionCount <= 10) return "2-3 min";
  if (questionCount <= 15) return "3-4 min";
  return "4-5 min";
}

function getCategoryEyebrow(category) {
  switch (category) {
    case "brand":
      return "BRAND KVIZ";
    case "f1":
      return "F1 KVIZ";
    case "general":
      return "OPĆI KVIZ";
    default:
      return "AUTO KVIZ";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}