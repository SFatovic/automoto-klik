const state = {
  manifest: null,
  activeTool: null,
  activeToolCategory: "all"
};

const categoryMap = {
  "car-selection": {
    title: "Odabir vozila",
    shortLabel: "Odabir",
    description: "Alati za izbor vrste vozila, motora i načina kupnje.",
    icon: "car-front",
    theme: "selection"
  },
  "car-analysis": {
    title: "Analiza vozila",
    shortLabel: "Analiza",
    description: "Alati za usporedbu, provjeru modela, brendova i mogućih rizika.",
    icon: "search-check",
    theme: "analysis"
  },
  "costs-and-purchase": {
    title: "Troškovi i kupnja",
    shortLabel: "Troškovi",
    description: "Alati za kupnju, održavanje, osiguranje, gume i razgovor s prodavateljem.",
    icon: "wallet-cards",
    theme: "costs"
  },
  "ownership-and-lifestyle": {
    title: "Vlasništvo i lifestyle",
    shortLabel: "Lifestyle",
    description: "Alati za korištenje vozila, dodatnu opremu, filmove, serije i igre.",
    icon: "sparkles",
    theme: "lifestyle"
  }
};

const toolVisualMap = {
  "car-type": {
    icon: "car-front",
    shortDescription: "Pronađi tip auta koji odgovara tvojoj situaciji."
  },
  "engine-choice": {
    icon: "gauge",
    shortDescription: "Odaberi motor prema vožnji, kilometraži i prioritetima."
  },
  "car-condition-choice": {
    icon: "badge-check",
    shortDescription: "Usporedi novo, polovno i testno vozilo."
  },
  "ideal-model-by-brand": {
    icon: "star",
    shortDescription: "Pronađi najbolji model unutar odabranog brenda."
  },
  "brand-overview": {
    icon: "landmark",
    shortDescription: "Upoznaj modele, tehnologiju i karakter brenda."
  },
  "compare-two-cars": {
    icon: "git-compare",
    shortDescription: "Usporedi dva auta po kriterijima koji su ti važni."
  },
  "car-weaknesses-analysis": {
    icon: "triangle-alert",
    shortDescription: "Provjeri mane, kvarove i rizike određenog modela."
  },
  "car-positive-analysis": {
    icon: "circle-plus",
    shortDescription: "Otkrij zašto je neki model poseban ili cijenjen."
  },
  "tire-choice": {
    icon: "circle-dot",
    shortDescription: "Odaberi gume prema stilu vožnje i uvjetima."
  },
  "car-maintenance-costs": {
    icon: "calculator",
    shortDescription: "Procijeni održavanje, servise, gume i redovne troškove."
  },
  "questions-for-seller": {
    icon: "clipboard-list",
    shortDescription: "Pripremi pametna pitanja za prodavatelja vozila."
  },
  "car-insurance-choice": {
    icon: "shield-check",
    shortDescription: "Odaberi razinu osiguranja prema vozilu i riziku."
  },
  "driving-tips-by-car": {
    icon: "gauge",
    shortDescription: "Dobij savjete za bolju i pametniju vožnju svog auta."
  },
  "car-movies-series-recommender": {
    icon: "clapperboard",
    shortDescription: "Pronađi auto filmove, serije i dokumentarce."
  },
  "car-games-recommender": {
    icon: "gamepad-2",
    shortDescription: "Pronađi racing igre prema platformi i stilu igranja."
  },
  "factory-equipment-advisor": {
    icon: "settings-2",
    shortDescription: "Odaberi tvorničku opremu koja stvarno ima smisla."
  },
  "aftermarket-accessories-advisor": {
    icon: "wrench",
    shortDescription: "Pronađi dodatke i opremu korisnu za tvoje vozilo."
  }
};

const dom = {};

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  cacheDom();
  bindStaticEvents();

  try {
    if (dom.toolsGrid) {
      await renderToolsListPage();
    }

    if (document.body.id === "toolPage") {
      await loadSingleToolPage();
    }
  } catch (error) {
    console.error("Greška pri inicijalizaciji AI alata:", error);
    renderAppError(error);
  }
}

function cacheDom() {
  dom.toolsGrid = document.getElementById("toolsGrid");
  dom.activeToolTitle = document.getElementById("activeToolTitle");
  dom.activeToolDescription = document.getElementById("activeToolDescription");
  dom.dynamicFields = document.getElementById("dynamicFields");
  dom.promptForm = document.getElementById("promptForm");
  dom.generatePromptBtn = document.getElementById("generatePromptBtn");
  dom.promptOutput = document.getElementById("promptOutput");
  dom.copyPromptBtn = document.getElementById("copyPromptBtn");
  dom.pageHeroToolTitle = document.getElementById("pageHeroToolTitle");
  dom.pageHeroToolDescription = document.getElementById("pageHeroToolDescription");
}

function bindStaticEvents() {
  if (dom.promptForm) {
    dom.promptForm.addEventListener("submit", (event) => {
      event.preventDefault();
      generatePrompt();
    });
  }

  if (dom.generatePromptBtn) {
    dom.generatePromptBtn.addEventListener("click", generatePrompt);
  }

  if (dom.copyPromptBtn) {
    dom.copyPromptBtn.addEventListener("click", copyPrompt);
  }

  if (dom.toolsGrid) {
    dom.toolsGrid.addEventListener("click", (event) => {
      const link = event.target.closest("[data-tool-link]");
      if (!link) return;

      const toolId = link.dataset.toolLink;
      const tool = (state.manifest || []).find((item) => item.id === toolId);

      if (tool) {
        trackClarityEvent("tool_opened", tool);
      }
    });
  }
}

async function loadToolsManifest() {
  if (state.manifest) return state.manifest;

  const manifest = await fetchJson("data/tools-manifest.json");
  state.manifest = Array.isArray(manifest) ? manifest : [];

  return state.manifest;
}

function trackClarityEvent(eventName, tool = null) {
  if (typeof window.clarity !== "function") return;

  window.clarity("event", eventName);

  if (tool) {
    window.clarity("set", "tool_id", tool.id || "");
    window.clarity("set", "tool_name", tool.title || "");
  }
}

async function renderToolsListPage() {
  if (!dom.toolsGrid) return;

  const manifest = await loadToolsManifest();

  if (!Array.isArray(manifest) || manifest.length === 0) {
    dom.toolsGrid.innerHTML = `
      <div class="col-12">
        <div class="info-box text-center">
          <p class="mb-0">Trenutno nema dostupnih AI alata.</p>
        </div>
      </div>
    `;
    return;
  }

  renderToolCategoryFilters(manifest);
  renderToolCards(manifest);
}

async function loadSingleToolPage() {
  const params = new URLSearchParams(window.location.search);
  const toolId = params.get("tool");

  if (!toolId) {
    renderToolNotFound("Nedostaje ID alata u URL-u.");
    return;
  }

  const manifest = await loadToolsManifest();
  const manifestItem = manifest.find((tool) => tool.id === toolId);

  if (!manifestItem) {
    renderToolNotFound("Odabrani alat ne postoji ili link nije ispravan.");
    return;
  }

  const tool = await fetchJson(manifestItem.file);
  state.activeTool = tool;

  updateToolPageMeta(tool);
  renderFields(tool.fields || []);
  trackClarityEvent("tool_loaded", tool);
}

function updateToolPageMeta(tool) {
  const title = tool?.title || "AI alat";
  const description =
    tool?.description || "Učitaj alat i ispuni nekoliko polja za generiranje AI upita.";

  if (dom.activeToolTitle) dom.activeToolTitle.textContent = title;
  if (dom.activeToolDescription) dom.activeToolDescription.textContent = description;
  if (dom.pageHeroToolTitle) dom.pageHeroToolTitle.textContent = title;
  if (dom.pageHeroToolDescription) dom.pageHeroToolDescription.textContent = description;

  document.title = `${title} | AutoMoto KLIK!`;
}

function getFormData() {
  const data = {};

  if (!state.activeTool || !Array.isArray(state.activeTool.fields)) {
    return data;
  }

  state.activeTool.fields.forEach((field) => {
    if (field.type === "checkbox") {
      const values = Array.from(
        document.querySelectorAll(`input[name="${field.id}"]:checked`)
      ).map((input) => input.value);

      data[field.id] = values.join(", ");
      return;
    }

    const element = document.getElementById(field.id);
    data[field.id] = element?.value?.trim() || "";
  });

  return data;
}

function validateRequiredFields() {
  clearValidationState();

  if (!state.activeTool || !Array.isArray(state.activeTool.fields)) {
    return true;
  }

  let firstInvalidElement = null;

  state.activeTool.fields.forEach((field) => {
    if (!field.required) return;

    if (field.type === "checkbox") {
      const checkedItems = document.querySelectorAll(`input[name="${field.id}"]:checked`);
      if (checkedItems.length > 0) return;

      const group = document.querySelector(`[data-field-group="${field.id}"]`);
      if (group) {
        group.classList.add("is-invalid-group");
        if (!firstInvalidElement) firstInvalidElement = group;
      }

      return;
    }

    const element = document.getElementById(field.id);
    if (!element || element.value.trim()) return;

    element.classList.add("is-invalid");
    element.setAttribute("aria-invalid", "true");

    if (!firstInvalidElement) {
      firstInvalidElement = element;
    }
  });

  if (firstInvalidElement) {
    firstInvalidElement.scrollIntoView({ behavior: "smooth", block: "center" });

    if (typeof firstInvalidElement.focus === "function") {
      firstInvalidElement.focus();
    }

    return false;
  }

  return true;
}

function clearValidationState() {
  document.querySelectorAll(".is-invalid").forEach((element) => {
    element.classList.remove("is-invalid");
    element.removeAttribute("aria-invalid");
  });

  document.querySelectorAll(".is-invalid-group").forEach((element) => {
    element.classList.remove("is-invalid-group");
  });
}

function generatePrompt() {
  if (!state.activeTool) return;

  const isValid = validateRequiredFields();
  if (!isValid) {
    setButtonTemporaryText(dom.generatePromptBtn, "Provjeri označena polja");
    return;
  }

  const data = getFormData();
  const prompt = applyPromptTemplate(state.activeTool.promptTemplate || "", data);

  if (dom.promptOutput) {
    dom.promptOutput.value = prompt;
  }

  if (dom.copyPromptBtn) {
    dom.copyPromptBtn.disabled = !prompt.trim();
  }

  trackClarityEvent("prompt_generated", state.activeTool);
  setButtonTemporaryText(dom.generatePromptBtn, "Upit generiran");

  if (dom.copyPromptBtn && prompt.trim()) {
    requestAnimationFrame(() => {
      const header = document.querySelector(".site-header");
      const headerOffset = header ? header.offsetHeight + 24 : 24;

      const buttonTop =
        dom.copyPromptBtn.getBoundingClientRect().top + window.scrollY - headerOffset;

      window.scrollTo({
        top: buttonTop,
        behavior: "smooth"
      });
    });
  }
}

function applyPromptTemplate(template, data) {
  const normalizedTemplate = normalizeTemplateString(template);

  return normalizedTemplate.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const cleanKey = key.trim();
    const value = data[cleanKey];

    return value ? value : "Nije navedeno";
  });
}

function normalizeTemplateString(template) {
  return String(template).replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

async function copyPrompt() {
  if (!dom.promptOutput || !dom.promptOutput.value.trim()) return;

  try {
    await navigator.clipboard.writeText(dom.promptOutput.value);
    trackClarityEvent("prompt_copied", state.activeTool);
    setButtonTemporaryText(dom.copyPromptBtn, "Kopirano!");
  } catch (error) {
    console.error("Kopiranje nije uspjelo:", error);
    setButtonTemporaryText(dom.copyPromptBtn, "Greška pri kopiranju");
  }
}

function setButtonTemporaryText(button, text, delay = 1500) {
  if (!button) return;

  const label = button.querySelector("span");
  if (!label) {
    const originalText = button.dataset.originalText || button.textContent;
    button.dataset.originalText = originalText;
    button.textContent = text;

    window.clearTimeout(button._textResetTimeout);

    button._textResetTimeout = window.setTimeout(() => {
      button.textContent = originalText;
    }, delay);

    return;
  }

  const originalText = button.dataset.originalText || label.textContent;
  button.dataset.originalText = originalText;
  label.textContent = text;

  window.clearTimeout(button._textResetTimeout);

  button._textResetTimeout = window.setTimeout(() => {
    label.textContent = originalText;
  }, delay);
}
