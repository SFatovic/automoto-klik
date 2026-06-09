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
    const theme = category.theme || "default";

    html += `
      <div class="col-12 tools-category-section tools-category-${escapeHtml(theme)}">
        <section class="tools-category-panel" aria-labelledby="tools-category-${escapeHtml(categoryKey)}">
          <div class="tools-category-header">
            <div class="tools-category-heading">
              <div class="tools-category-icon" aria-hidden="true">
                <i data-lucide="${escapeHtml(category.icon || "sparkles")}"></i>
              </div>

              <div>
                <span class="tools-category-kicker">${tools.length} ${tools.length === 1 ? "alat" : "alata"}</span>
                <h3 id="tools-category-${escapeHtml(categoryKey)}" class="cards-section-title">
                  ${escapeHtml(category.title)}
                </h3>
                <p class="tools-category-description">
                  ${escapeHtml(category.description || "")}
                </p>
              </div>
            </div>
          </div>

          <div class="tools-category-scroller">
            <div class="tools-category-grid">
              ${tools
                .map((tool) => {
                  const visual = getToolVisual(tool);
                  const cardDescription = visual.shortDescription || tool.description || "";

                  return `
                    <div class="tools-category-card-item">
                      <a
                        href="tool.html?tool=${encodeURIComponent(tool.id)}"
                        class="tool-card-link text-decoration-none d-block h-100"
                        data-tool-link="${escapeHtml(tool.id)}"
                        aria-label="Otvori alat ${escapeHtml(tool.title)}"
                      >
                        <article class="tool-card tool-card-visual h-100">
                          <div class="tool-card-art" aria-hidden="true">
                            <i data-lucide="${escapeHtml(visual.icon)}"></i>
                          </div>

                          <div class="tool-card-body tool-card-content">
                            <div class="tool-card-topline">
                              <span class="tool-card-badge">${escapeHtml(category.shortLabel)}</span>
                            </div>

                            <h4 class="tool-card-title">${escapeHtml(tool.title)}</h4>
                            <p class="tool-card-text">${escapeHtml(cardDescription)}</p>

                            <div class="card-spacer"></div>
                            <span class="tool-card-cta">Otvori alat →</span>
                          </div>
                        </article>
                      </a>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        </section>
      </div>
    `;
  });

  dom.toolsGrid.innerHTML = html;
  refreshLucideIcons();
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

function getToolVisual(tool) {
  return (
    toolVisualMap[tool.id] || {
      icon: "sparkles",
      shortDescription: tool.description || ""
    }
  );
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
