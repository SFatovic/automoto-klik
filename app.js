const state = {
  activeTool: null
};

const dom = {};

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  cacheDom();

  if (dom.toolsGrid && typeof TOOLS !== "undefined") {
    renderToolsListPage();
  }

  if (document.body.id === "toolPage" && typeof TOOLS !== "undefined") {
    loadSingleToolPage();
  }
}

function cacheDom() {
  dom.toolsGrid = document.getElementById("toolsGrid");
  dom.activeToolTitle = document.getElementById("activeToolTitle");
  dom.activeToolDescription = document.getElementById("activeToolDescription");
  dom.dynamicFields = document.getElementById("dynamicFields");
  dom.generatePromptBtn = document.getElementById("generatePromptBtn");
  dom.promptOutput = document.getElementById("promptOutput");
  dom.copyPromptBtn = document.getElementById("copyPromptBtn");
  dom.pageHeroToolTitle = document.getElementById("pageHeroToolTitle");
  dom.pageHeroToolDescription = document.getElementById("pageHeroToolDescription");
}

function trackClarityEvent(eventName, tool = null) {
  if (!window.clarity) return;

  window.clarity("event", eventName);

  if (tool) {
    window.clarity("set", "tool_id", tool.id);
    window.clarity("set", "tool_name", tool.title);
  }
}

function renderToolsListPage() {
  if (!dom.toolsGrid) return;

  dom.toolsGrid.innerHTML = TOOLS.map(tool => `
    <div class="col-md-6 col-lg-4">
      <a href="tool.html?tool=${tool.id}" class="tool-card-link text-decoration-none d-block h-100" data-tool-link="${tool.id}">
        <div class="tool-card h-100">
          <div class="tool-card-body">
            <h4>${tool.title}</h4>
            <p class="tool-card-text">${tool.description}</p>
          </div>
        </div>
      </a>
    </div>
  `).join("");

  document.querySelectorAll("[data-tool-link]").forEach(link => {
    link.addEventListener("click", () => {
      const toolId = link.dataset.toolLink;
      const tool = TOOLS.find(t => t.id === toolId);

      if (tool) {
        trackClarityEvent("tool_opened", tool);
      }
    });
  });
}

function loadSingleToolPage() {
  const params = new URLSearchParams(window.location.search);
  const toolId = params.get("tool");

  const tool = TOOLS.find(t => t.id === toolId);

  if (!tool) {
    renderToolNotFound();
    return;
  }

  state.activeTool = tool;

  if (dom.activeToolTitle) {
    dom.activeToolTitle.textContent = tool.title;
  }

  if (dom.activeToolDescription) {
    dom.activeToolDescription.textContent = tool.description;
  }

  if (dom.pageHeroToolTitle) {
    dom.pageHeroToolTitle.textContent = tool.title;
  }

  if (dom.pageHeroToolDescription) {
    dom.pageHeroToolDescription.textContent = tool.description;
  }

  document.title = `${tool.title} | AutoMoto KLIK!`;

  renderFields(tool.fields);

  trackClarityEvent("tool_loaded", tool);

  if (dom.generatePromptBtn) {
    dom.generatePromptBtn.addEventListener("click", generatePrompt);
  }

  if (dom.copyPromptBtn) {
    dom.copyPromptBtn.addEventListener("click", copyPrompt);
  }
}

function renderToolNotFound() {
  if (dom.activeToolTitle) {
    dom.activeToolTitle.textContent = "Alat nije pronađen";
  }

  if (dom.activeToolDescription) {
    dom.activeToolDescription.textContent =
      "Odabrani alat ne postoji ili link nije ispravan.";
  }

  if (dom.pageHeroToolTitle) {
    dom.pageHeroToolTitle.textContent = "Alat nije pronađen";
  }

  if (dom.pageHeroToolDescription) {
    dom.pageHeroToolDescription.textContent =
      "Provjeri link ili se vrati na popis AI alata.";
  }

  if (dom.dynamicFields) {
    dom.dynamicFields.innerHTML = `
      <div class="col-12">
        <div class="info-box">
          <p class="mb-0">Vrati se na stranicu AI upita i odaberi postojeći alat.</p>
        </div>
      </div>
    `;
  }

  if (dom.generatePromptBtn) {
    dom.generatePromptBtn.disabled = true;
  }

  if (dom.copyPromptBtn) {
    dom.copyPromptBtn.disabled = true;
  }
}

function renderFields(fields) {
  if (!dom.dynamicFields) return;

  dom.dynamicFields.innerHTML = fields.map(field => {
    if (field.type === "select") {
      return `
        <div class="col-12">
          <label class="form-label" for="${field.id}">${field.label}</label>
          <select class="form-select" id="${field.id}">
            <option value="">Odaberi</option>
            ${field.options.map(o => `<option>${o}</option>`).join("")}
          </select>
        </div>
      `;
    }

    if (field.type === "textarea") {
      return `
        <div class="col-12">
          <label class="form-label" for="${field.id}">${field.label}</label>
          <textarea class="form-control" id="${field.id}" rows="${field.rows || 3}"></textarea>
        </div>
      `;
    }

    if (field.type === "checkbox") {
      return `
        <div class="col-12">
          <label class="form-label d-block">${field.label}</label>
          ${field.options.map((o, i) => `
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                name="${field.id}"
                value="${o}"
                id="${field.id}-${i}">
              <label class="form-check-label" for="${field.id}-${i}">${o}</label>
            </div>
          `).join("")}
        </div>
      `;
    }

    return "";
  }).join("");
}

function getFormData() {
  const data = {};

  if (!state.activeTool) return data;

  state.activeTool.fields.forEach(field => {
    if (field.type === "checkbox") {
      const values = Array.from(
        document.querySelectorAll(`input[name="${field.id}"]:checked`)
      ).map(i => i.value);

      data[field.id] = values.join(", ");
    } else {
      data[field.id] = document.getElementById(field.id)?.value || "";
    }
  });

  return data;
}

function generatePrompt() {
  if (!state.activeTool) return;

  const data = getFormData();
  const prompt = state.activeTool.generatePrompt(data);

  if (dom.promptOutput) {
    dom.promptOutput.value = prompt;
  }

  if (dom.copyPromptBtn) {
    dom.copyPromptBtn.disabled = false;
  }

  trackClarityEvent("prompt_generated", state.activeTool);

  if (dom.generatePromptBtn) {
    const originalText = dom.generatePromptBtn.textContent;
    dom.generatePromptBtn.textContent = "Upit generiran";

    setTimeout(() => {
      dom.generatePromptBtn.textContent = originalText;
    }, 1500);
  }
}

async function copyPrompt() {
  if (!dom.promptOutput || !dom.promptOutput.value) return;

  await navigator.clipboard.writeText(dom.promptOutput.value);

  trackClarityEvent("prompt_copied", state.activeTool);

  if (dom.copyPromptBtn) {
    const originalText = dom.copyPromptBtn.textContent;
    dom.copyPromptBtn.textContent = "Kopirano!";

    setTimeout(() => {
      dom.copyPromptBtn.textContent = originalText;
    }, 1500);
  }
}