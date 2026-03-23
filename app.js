const state = {
  manifest: null,
  activeTool: null,
  jsonCache: new Map(),
  activeToolCategory: "all"
};

const categoryMap = {
  "car-selection": {
    title: "Odabir vozila",
    shortLabel: "Odabir"
  },
  "car-analysis": {
    title: "Analiza vozila",
    shortLabel: "Analiza"
  },
  "costs-and-purchase": {
    title: "Troškovi i kupnja",
    shortLabel: "Troškovi"
  },
  "ownership-and-lifestyle": {
    title: "Vlasništvo i lifestyle",
    shortLabel: "Lifestyle"
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

async function fetchJson(path) {
  if (state.jsonCache.has(path)) {
    return state.jsonCache.get(path);
  }

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Greška pri učitavanju: ${path} (status ${response.status})`);
  }

  const data = await response.json();
  state.jsonCache.set(path, data);

  return data;
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

  const grouped = groupByCategory(manifest);
  let html = "";

  Object.keys(categoryMap).forEach((categoryKey) => {
    const tools = grouped[categoryKey];
    if (!tools || tools.length === 0) return;

    const category = categoryMap[categoryKey];

    html += `
  <div class="col-12 mt-4">
    <h3 class="cards-section-title mb-3">${escapeHtml(category.title)}</h3>
  </div>
`;

    html += tools
  .map(
    (tool) => `
      <div class="col-md-6 col-lg-4">
        <a
          href="tool.html?tool=${encodeURIComponent(tool.id)}"
          class="tool-card-link text-decoration-none d-block h-100"
          data-tool-link="${escapeHtml(tool.id)}"
          aria-label="Otvori alat ${escapeHtml(tool.title)}"
        >
          <article class="tool-card h-100">
          <div class="tool-card-body">
            <h4>${escapeHtml(tool.title)}</h4>
            <p class="tool-card-text">${escapeHtml(tool.description || "")}</p>
            <div class="card-spacer"></div>
            <span class="tool-card-cta">Otvori alat →</span>
          </div>
        </article>
        </a>
      </div>
    `
  )
  .join("");
  });

  dom.toolsGrid.innerHTML = html;
}

function renderToolCategoryFilters(items) {
  const filtersEl = document.getElementById("toolCategoryFilters");
  if (!filtersEl) return;

  const counts = getToolCategoryCounts(items);

  const filterItems = [
    {
      key: "all",
      label: "Sve",
      count: items.length
    },
    ...Object.keys(categoryMap).map((categoryKey) => ({
      key: categoryKey,
      label: categoryMap[categoryKey].shortLabel,
      count: counts[categoryKey] || 0
    }))
  ];

  filtersEl.innerHTML = `
    <div class="quiz-filters" role="tablist" aria-label="Filter AI alata po kategoriji">
      ${filterItems
        .map(
          (filter) => `
            <button
              type="button"
              class="quiz-filter-chip ${state.activeToolCategory === filter.key ? "is-active" : ""}"
              data-tool-filter="${filter.key}"
              role="tab"
              aria-selected="${state.activeToolCategory === filter.key ? "true" : "false"}"
            >
              <span class="quiz-filter-chip-label">${escapeHtml(filter.label)}</span>
              <span class="quiz-filter-chip-count">${filter.count}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;

  filtersEl.querySelectorAll("[data-tool-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextCategory = button.getAttribute("data-tool-filter") || "all";
      state.activeToolCategory = nextCategory;
      renderToolCategoryFilters(items);
      renderToolCards(items);
    });
  });
}

function renderToolCards(items) {
  if (!dom.toolsGrid) return;

  const filteredItems =
    state.activeToolCategory === "all"
      ? items
      : items.filter((item) => {
          const normalizedCategory = categoryMap[item.category] ? item.category : "other";
          return normalizedCategory === state.activeToolCategory;
        });

  if (!filteredItems.length) {
    dom.toolsGrid.innerHTML = `
      <div class="col-12">
        <div class="info-box text-center">
          <p class="mb-0">Trenutno nema AI alata u ovoj kategoriji.</p>
        </div>
      </div>
    `;
    return;
  }

  const grouped = groupByCategory(filteredItems);
  let html = "";

  Object.keys(categoryMap).forEach((categoryKey) => {
    const tools = grouped[categoryKey];
    if (!tools || tools.length === 0) return;

    const category = categoryMap[categoryKey];

    html += `
      <div class="col-12 mt-4">
        <h3 class="cards-section-title mb-3">${escapeHtml(category.title)}</h3>
      </div>
    `;

    html += tools
      .map(
        (tool) => `
          <div class="col-md-6 col-lg-4">
            <a
              href="tool.html?tool=${encodeURIComponent(tool.id)}"
              class="tool-card-link text-decoration-none d-block h-100"
              data-tool-link="${escapeHtml(tool.id)}"
              aria-label="Otvori alat ${escapeHtml(tool.title)}"
            >
              <article class="tool-card h-100">
                <div class="tool-card-body">
                  <h4>${escapeHtml(tool.title)}</h4>
                  <p class="tool-card-text">${escapeHtml(tool.description || "")}</p>
                  <div class="card-spacer"></div>
                  <span class="tool-card-cta">Otvori alat →</span>
                </div>
              </article>
            </a>
          </div>
        `
      )
      .join("");
  });

  dom.toolsGrid.innerHTML = html;
}

function getToolCategoryCounts(items) {
  return items.reduce((accumulator, item) => {
    const category = categoryMap[item.category] ? item.category : "other";
    accumulator[category] = (accumulator[category] || 0) + 1;
    return accumulator;
  }, {});
}

function groupByCategory(items) {
  return items.reduce((accumulator, item) => {
    const category = categoryMap[item.category] ? item.category : "other";

    if (!accumulator[category]) {
      accumulator[category] = [];
    }

    accumulator[category].push(item);
    return accumulator;
  }, {});
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

function renderToolNotFound(message = "Odabrani alat nije pronađen.") {
  if (dom.activeToolTitle) dom.activeToolTitle.textContent = "Alat nije pronađen";
  if (dom.activeToolDescription) dom.activeToolDescription.textContent = message;
  if (dom.pageHeroToolTitle) dom.pageHeroToolTitle.textContent = "Alat nije pronađen";
  if (dom.pageHeroToolDescription) dom.pageHeroToolDescription.textContent = message;

  if (dom.dynamicFields) {
    dom.dynamicFields.innerHTML = `
      <div class="col-12">
        <div class="info-box">
          <p class="mb-0">Vrati se na stranicu AI upita i odaberi postojeći alat.</p>
        </div>
      </div>
    `;
  }

  if (dom.generatePromptBtn) dom.generatePromptBtn.disabled = true;
  if (dom.copyPromptBtn) dom.copyPromptBtn.disabled = true;
}

function renderFields(fields) {
  if (!dom.dynamicFields) return;

  dom.dynamicFields.innerHTML = fields.map(renderField).join("");
}

function renderField(field) {
  const fieldId = escapeHtml(field.id);
  const label = escapeHtml(field.label || "");
  const placeholder = escapeHtml(field.placeholder || "");
  const isRequired = Boolean(field.required);
  const requiredAttr = isRequired ? "required" : "";
  const requiredLabel = isRequired ? ' <span class="required-mark">*</span>' : "";

  if (field.type === "select") {
    const options = (field.options || [])
      .map(
        (option) =>
          `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
      )
      .join("");

    return `
      <div class="col-12">
        <label class="form-label" for="${fieldId}">${label}${requiredLabel}</label>
        <select class="form-select" id="${fieldId}" ${requiredAttr}>
          <option value="">Odaberi</option>
          ${options}
        </select>
      </div>
    `;
  }

  if (field.type === "textarea") {
    return `
      <div class="col-12">
        <label class="form-label" for="${fieldId}">${label}${requiredLabel}</label>
        <textarea
          class="form-control"
          id="${fieldId}"
          rows="${Number(field.rows) || 3}"
          placeholder="${placeholder}"
          ${requiredAttr}
        ></textarea>
      </div>
    `;
  }

  if (field.type === "text") {
    return `
      <div class="col-12">
        <label class="form-label" for="${fieldId}">${label}${requiredLabel}</label>
        <input
          type="text"
          class="form-control"
          id="${fieldId}"
          placeholder="${placeholder}"
          ${requiredAttr}
        />
      </div>
    `;
  }

  if (field.type === "checkbox") {
    const options = (field.options || [])
      .map(
        (option, index) => `
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              name="${fieldId}"
              value="${escapeHtml(option)}"
              id="${fieldId}-${index}"
            />
            <label class="form-check-label" for="${fieldId}-${index}">
              ${escapeHtml(option)}
            </label>
          </div>
        `
      )
      .join("");

    return `
      <div class="col-12">
        <fieldset class="checkbox-group" data-field-group="${fieldId}" ${isRequired ? 'data-required="true"' : ""}>
          <legend class="form-label d-block mb-2">${label}${requiredLabel}</legend>
          ${options}
        </fieldset>
      </div>
    `;
  }

  return "";
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

function renderAppError(error) {
  console.error(error);

  if (dom.toolsGrid) {
    dom.toolsGrid.innerHTML = `
      <div class="col-12">
        <div class="info-box text-center">
          <p class="mb-2"><strong>AI alati trenutno nisu dostupni.</strong></p>
          <p class="mb-0">Provjeri postoji li <code>data/tools-manifest.json</code> i koristiš li lokalni server.</p>
        </div>
      </div>
    `;
  }

  if (document.body.id === "toolPage") {
    renderToolNotFound("Alat nije moguće učitati. Provjeri putanju do JSON datoteka i koristi lokalni server.");
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