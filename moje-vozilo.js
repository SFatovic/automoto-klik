(() => {
  const STORAGE_KEY = "amk_my_vehicle_profile_v1";
  const DB_NAME = "amkMyVehicleDB";
  const DB_VERSION = 1;
  const STORE_NAME = "vehicleAssets";
  const PHOTO_RECORD_ID = "profilePhoto";
  const AI_TOOLS_URL = "data/vozilo_ai_upiti.json";

  const AI_ICON_MAP = {
    "ti-file-search": "file-search",
    "ti-thumb-up": "thumbs-up",
    "ti-alert-triangle": "triangle-alert",
    "ti-tool": "wrench",
    "ti-arrows-left-right": "arrow-left-right",
    "ti-history": "history"
  };

  const state = {
    imageBlob: null,
    imageUrl: "",
    indexedDbAvailable: true,
    hasProfile: false,
    aiTools: []
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheDom();
    bindEvents();
    await restoreProfile();
    updatePreview();
    await loadAiTools();
  }

  function cacheDom() {
    dom.form = document.getElementById("myVehicleForm");
    dom.brand = document.getElementById("vehicleBrand");
    dom.model = document.getElementById("vehicleModel");
    dom.year = document.getElementById("vehicleYear");
    dom.engine = document.getElementById("vehicleEngine");
    dom.photo = document.getElementById("vehiclePhoto");
    dom.saveBtn = document.getElementById("saveVehicleBtn");
    dom.deleteBtn = document.getElementById("deleteVehicleBtn");
    dom.status = document.getElementById("vehicleStatusMessage");
    dom.card = document.querySelector(".myv-card");
    dom.photoZone = document.getElementById("myvPhotoZone");
    dom.changePhotoBtn = document.getElementById("myvChangePhotoBtn");
    dom.previewImage = document.getElementById("myVehiclePreviewImage");
    dom.previewTitle = document.getElementById("myVehiclePreviewTitle");
    dom.previewMeta = document.getElementById("myVehiclePreviewMeta");
    dom.toggleBtn = document.getElementById("myvToggleBtn");
    dom.toggleLabel = document.getElementById("myvToggleLabel");
    dom.collapsible = document.getElementById("myvFormCollapsible");
    dom.aiToolsGrid = document.getElementById("vehicleAiToolsGrid");
    dom.aiStatus = document.getElementById("vehicleAiStatusMessage");
  }

  function bindEvents() {
    dom.saveBtn.addEventListener("click", onSaveProfile);
    dom.deleteBtn.addEventListener("click", onDeleteProfile);
    dom.toggleBtn.addEventListener("click", onToggleForm);
    dom.aiToolsGrid.addEventListener("click", onAiToolClick);

    dom.photoZone.addEventListener("click", onPhotoZoneClick);
    dom.photoZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dom.photo.click(); }
    });
    dom.changePhotoBtn.addEventListener("click", (e) => { e.stopPropagation(); dom.photo.click(); });
    dom.photo.addEventListener("change", onPhotoSelected);

    [dom.brand, dom.model, dom.year, dom.engine].forEach(input => {
      input.addEventListener("input", updatePreview);
    });
  }

  function onPhotoZoneClick() {
    dom.photo.click();
  }

  function onToggleForm() {
    const isOpen = dom.collapsible.classList.toggle("is-open");
    dom.toggleBtn.setAttribute("aria-expanded", isOpen);
    dom.toggleLabel.textContent = isOpen ? "Zatvori" : "Uredi podatke";
  }

  function onPhotoSelected() {
    const file = dom.photo.files && dom.photo.files[0];
    if (!file) return;
    state.imageBlob = file;
    updatePreview();
  }

  async function restoreProfile() {
    const saved = getSavedVehicleData();
    if (saved) {
      dom.brand.value = saved.brand || "";
      dom.model.value = saved.model || "";
      dom.year.value = saved.year || "";
      dom.engine.value = saved.engine || "";
    }

    try {
      const photoBlob = await getPhotoFromDb();
      if (photoBlob) {
        state.imageBlob = photoBlob;
      }
    } catch (error) {
      state.indexedDbAvailable = false;
      setStatus("Fotografija nije vraćena jer lokalna pohrana fotografije nije dostupna u ovom pregledniku.");
    }

    state.hasProfile = profileHasData(readFormData(), state.imageBlob);
  }

  async function onSaveProfile() {
    const message = state.hasProfile ? "Profil vozila je ažuriran." : "Profil vozila je spremljen.";
    await persistProfile(message);
  }

  async function persistProfile(successMessage) {
    const payload = readFormData();
    saveVehicleData(payload);

    const selectedFile = dom.photo.files && dom.photo.files[0] ? dom.photo.files[0] : null;
    if (selectedFile) {
      state.imageBlob = selectedFile;
      if (state.indexedDbAvailable) {
        try {
          await savePhotoToDb(selectedFile);
        } catch (error) {
          state.indexedDbAvailable = false;
          setStatus("Podaci su spremljeni, ali fotografija nije trajno spremljena u ovom pregledniku.");
          state.hasProfile = profileHasData(payload, state.imageBlob);
          updatePreview();
          return;
        }
      }
    }

    state.hasProfile = profileHasData(payload, state.imageBlob);
    setStatus(state.indexedDbAvailable ? successMessage : "Podaci su spremljeni, ali fotografiju nije moguće trajno spremiti u ovom pregledniku.");
    updatePreview();
    closeForm();
  }

  function closeForm() {
    dom.collapsible.classList.remove("is-open");
    dom.toggleBtn.setAttribute("aria-expanded", "false");
    dom.toggleLabel.textContent = "Uredi podatke";
  }

  async function onDeleteProfile() {
    localStorage.removeItem(STORAGE_KEY);

    if (state.indexedDbAvailable) {
      try {
        await deletePhotoFromDb();
      } catch (error) {
        state.indexedDbAvailable = false;
      }
    }

    if (state.imageUrl) {
      URL.revokeObjectURL(state.imageUrl);
    }

    state.imageBlob = null;
    state.imageUrl = "";
    state.hasProfile = false;
    dom.form.reset();
    updatePreview();
    setStatus("Profil vozila je obrisan.");
  }

  async function loadAiTools() {
    try {
      const response = await fetch(AI_TOOLS_URL);
      if (!response.ok) {
        throw new Error(`Neuspješno dohvaćanje ${AI_TOOLS_URL}`);
      }

      const manifest = await response.json();
      state.aiTools = Array.isArray(manifest.tools) ? manifest.tools : [];
      renderAiTools();
    } catch (error) {
      console.error("AI upiti nisu učitani:", error);
      dom.aiToolsGrid.innerHTML = "";
    }
  }

  function renderAiTools() {
    dom.aiToolsGrid.innerHTML = state.aiTools
      .map((tool) => {
        const icon = AI_ICON_MAP[tool.icon] || "sparkles";
        return `
          <button type="button" class="myv-ai-btn" data-ai-tool-id="${escapeHtml(tool.tool_id)}">
            <span class="myv-ai-btn-icon"><i data-lucide="${escapeHtml(icon)}"></i></span>
            <span class="myv-ai-btn-label">${escapeHtml(tool.label)}</span>
          </button>
        `;
      })
      .join("");

    refreshLucideIcons();
  }

  async function onAiToolClick(event) {
    const button = event.target.closest("[data-ai-tool-id]");
    if (!button) return;

    const tool = state.aiTools.find((item) => item.tool_id === button.dataset.aiToolId);
    if (!tool) return;

    const data = readFormData();
    if (!data.brand && !data.model && !data.year && !data.engine) {
      setAiStatus("Prvo unesi i spremi podatke o vozilu.");
      return;
    }

    const prompt = buildAiPrompt(tool.prompt_template, data);

    try {
      await navigator.clipboard.writeText(prompt);
      setAiStatus(`Upit "${tool.label}" je kopiran — zalijepi ga u AI chat.`);
      setButtonTemporaryLabel(button, "Kopirano!");
    } catch (error) {
      console.error("Kopiranje upita nije uspjelo:", error);
      setAiStatus("Kopiranje u međuspremnik nije uspjelo. Pokušaj ponovno.");
    }
  }

  function buildAiPrompt(template, data) {
    return String(template || "")
      .replace(/\{marka\}/g, data.brand || "")
      .replace(/\{model\}/g, data.model || "")
      .replace(/\{godina\}/g, data.year || "")
      .replace(/\{motor\}/g, data.engine || "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function setButtonTemporaryLabel(button, text, delay = 1500) {
    const label = button.querySelector(".myv-ai-btn-label");
    if (!label) return;

    const originalText = button.dataset.originalLabel || label.textContent;
    button.dataset.originalLabel = originalText;
    label.textContent = text;

    window.clearTimeout(button._labelResetTimeout);
    button._labelResetTimeout = window.setTimeout(() => {
      label.textContent = originalText;
    }, delay);
  }

  function setAiStatus(message) {
    dom.aiStatus.textContent = message;
  }

  function readFormData() {
    return {
      brand: normalizeText(dom.brand.value),
      model: normalizeText(dom.model.value),
      year: normalizeText(dom.year.value),
      engine: normalizeText(dom.engine.value)
    };
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function profileHasData(data, imageBlob) {
    return Boolean(
      (data.brand || data.model || data.year || data.engine) ||
      imageBlob
    );
  }

  function saveVehicleData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getSavedVehicleData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function updatePreview() {
    const data = readFormData();
    const title = [data.brand, data.model].filter(Boolean).join(" ");
    const yearEngine = [data.year, data.engine].filter(Boolean).join(" • ");

    dom.previewTitle.textContent = title || "—";
    dom.previewMeta.textContent = yearEngine;

    if (state.imageUrl) {
      URL.revokeObjectURL(state.imageUrl);
      state.imageUrl = "";
    }

    if (state.imageBlob) {
      state.imageUrl = URL.createObjectURL(state.imageBlob);
      dom.card.classList.add("has-photo");
      dom.previewImage.src = state.imageUrl;
      dom.previewImage.style.display = "block";
    } else {
      dom.card.classList.remove("has-photo");
      dom.previewImage.removeAttribute("src");
      dom.previewImage.style.display = "none";
    }
  }

  function setStatus(message) {
    dom.status.textContent = message;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB not supported"));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    });
  }

  async function savePhotoToDb(blob) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ id: PHOTO_RECORD_ID, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB write aborted"));
    });
    db.close();
  }

  async function getPhotoFromDb() {
    const db = await openDb();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(PHOTO_RECORD_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("IndexedDB read failed"));
    });
    db.close();
    return record && record.blob ? record.blob : null;
  }

  async function deletePhotoFromDb() {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(PHOTO_RECORD_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB delete failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB delete aborted"));
    });
    db.close();
  }
})();
