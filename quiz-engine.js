const quizState = {
  manifest: null,
  quiz: null,
  manifestItem: null,
  currentIndex: 0,
  selectedAnswers: [],
  screen: "intro",
  pendingInterstitial: null,
  lastComputedResult: null,
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

async function loadQuizManifest() {
  if (quizState.manifest) return quizState.manifest;

  const manifest = await fetchJson(withBasePath("data/quizzes-manifest.json"));
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
}

function getBasePathPrefix() {
  const explicitBasePath = document.body?.dataset?.basePath;
  if (explicitBasePath) return explicitBasePath;

  const path = window.location.pathname.toLowerCase();
  return path.includes("/kvizovi/") ? "../" : "";
}

function withBasePath(relativePath) {
  return `${getBasePathPrefix()}${relativePath}`;
}

function resolveAssetPath(path) {
  if (!path) return "";

  const normalizedPath = String(path).trim();

  if (
    normalizedPath.startsWith("http://") ||
    normalizedPath.startsWith("https://") ||
    normalizedPath.startsWith("//") ||
    normalizedPath.startsWith("data:")
  ) {
    return normalizedPath;
  }

  return withBasePath(normalizedPath);
}

function getRequestedQuizId() {
  const bodyQuizId = document.body?.dataset?.quizId?.trim();

  if (bodyQuizId) {
    return bodyQuizId;
  }

  const params = new URLSearchParams(window.location.search);
  const queryQuizId = params.get("quiz");

  if (queryQuizId && queryQuizId.trim()) {
    return queryQuizId.trim();
  }

  return null;
}

async function loadSingleQuizPage() {
  const quizId = getRequestedQuizId();

  if (!quizId) {
    renderQuizError("Nedostaje ID kviza.");
    return;
  }

  const manifest = await loadQuizManifest();
  const manifestItem = manifest.find((quiz) => quiz.id === quizId);

  if (!manifestItem) {
    renderQuizError("Kviz nije pronađen.");
    return;
  }

  const quiz = await fetchJson(withBasePath(manifestItem.file));

  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    renderQuizError("Kviz nema ispravno definirana pitanja.");
    return;
  }

  quizState.quiz = quiz;
  quizState.manifestItem = manifestItem;
  resetQuizState();

  document.title = `${quiz.title} | AutoZnalac`;

  renderCurrentScreen();
}

function resetQuizState() {
  quizState.currentIndex = 0;
  quizState.selectedAnswers = [];
  quizState.screen = "intro";
  quizState.pendingInterstitial = null;
  quizState.lastComputedResult = null;
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
