(() => {
  const STORAGE_KEY = "amk_my_vehicle_profile_v1";
  const DB_NAME = "amkMyVehicleDB";
  const DB_VERSION = 1;
  const STORE_NAME = "vehicleAssets";
  const PHOTO_RECORD_ID = "profilePhoto";
  const AI_TOOLS_URL = "data/vozilo_ai_upiti.json";
  const WEBSHOPS_URL = "data/universal-webshops.json";
  const WEBSHOPS_INITIAL_VISIBLE = 4;
  const PARTS_REQUEST_EMAIL = "zdfatovic@gmail.com";

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
    chapters: [],
    introTemplate: "",
    outroTemplate: "",
    selectedChapterIds: new Set(),
    webshopCategories: []
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheDom();
    bindEvents();
    await restoreProfile();
    updatePreview();
    await loadAiTools();
    await loadWebshops();
  }

  function cacheDom() {
    dom.form = document.getElementById("myVehicleForm");
    dom.brand = document.getElementById("vehicleBrand");
    dom.model = document.getElementById("vehicleModel");
    dom.year = document.getElementById("vehicleYear");
    dom.engine = document.getElementById("vehicleEngine");
    dom.description = document.getElementById("vehicleDescription");
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
    dom.aiToggleBtn = document.getElementById("myvAiToggleBtn");
    dom.aiCollapsible = document.getElementById("myvAiCollapsible");
    dom.generateEbookBtn = document.getElementById("myvGenerateEbookBtn");
    dom.shopsGrid = document.getElementById("myvShopsGrid");
    dom.partsForm = document.getElementById("partsRequestForm");
    dom.partsVin = document.getElementById("partsVin");
    dom.partsPhone = document.getElementById("partsPhone");
    dom.partsEmail = document.getElementById("partsEmail");
    dom.partsDescription = document.getElementById("partsDescription");
    dom.partsStatus = document.getElementById("partsStatusMessage");
    dom.partsToggleBtn = document.getElementById("myvPartsToggleBtn");
    dom.partsCollapsible = document.getElementById("myvPartsCollapsible");
  }

  function bindEvents() {
    dom.saveBtn.addEventListener("click", onSaveProfile);
    dom.deleteBtn.addEventListener("click", onDeleteProfile);
    dom.toggleBtn.addEventListener("click", onToggleForm);
    dom.aiToggleBtn.addEventListener("click", onToggleAiUpiti);
    dom.aiToolsGrid.addEventListener("click", onChapterToggle);
    dom.generateEbookBtn.addEventListener("click", onGenerateEbook);
    dom.shopsGrid.addEventListener("click", onShopsGridClick);
    dom.partsToggleBtn.addEventListener("click", onTogglePartsRequest);
    dom.partsForm.addEventListener("submit", onPartsRequestSubmit);
    dom.partsVin.addEventListener("input", onPartsVinInput);

    dom.photoZone.addEventListener("click", onPhotoZoneClick);
    dom.photoZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dom.photo.click(); }
    });
    dom.changePhotoBtn.addEventListener("click", (e) => { e.stopPropagation(); dom.photo.click(); });
    dom.photo.addEventListener("change", onPhotoSelected);

    [dom.brand, dom.model, dom.year, dom.engine, dom.description].forEach(input => {
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

  function onToggleAiUpiti() {
    const isOpen = dom.aiCollapsible.classList.toggle("is-open");
    dom.aiToggleBtn.setAttribute("aria-expanded", isOpen);
  }

  function onTogglePartsRequest() {
    const isOpen = dom.partsCollapsible.classList.toggle("is-open");
    dom.partsToggleBtn.setAttribute("aria-expanded", isOpen);
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
      dom.description.value = saved.description || "";
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
      state.chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
      state.introTemplate = manifest.intro_template || "";
      state.outroTemplate = manifest.outro_template || "";
      state.selectedChapterIds = new Set(state.chapters.map((chapter) => chapter.chapter_id));
      renderChapters();
    } catch (error) {
      console.error("Poglavlja vodiča nisu učitana:", error);
      dom.aiToolsGrid.innerHTML = "";
    }
  }

  function renderChapters() {
    dom.aiToolsGrid.innerHTML = state.chapters
      .map((chapter) => {
        const icon = AI_ICON_MAP[chapter.icon] || "sparkles";
        const isSelected = state.selectedChapterIds.has(chapter.chapter_id);
        return `
          <button type="button" class="myv-ai-btn${isSelected ? " is-selected" : ""}" data-chapter-id="${escapeHtml(chapter.chapter_id)}" aria-pressed="${isSelected}">
            <span class="myv-ai-btn-icon"><i data-lucide="${escapeHtml(icon)}"></i></span>
            <span class="myv-ai-btn-label">${escapeHtml(chapter.label)}</span>
          </button>
        `;
      })
      .join("");

    refreshLucideIcons();
  }

  function onChapterToggle(event) {
    const button = event.target.closest("[data-chapter-id]");
    if (!button) return;

    const chapterId = button.dataset.chapterId;
    if (state.selectedChapterIds.has(chapterId)) {
      state.selectedChapterIds.delete(chapterId);
    } else {
      state.selectedChapterIds.add(chapterId);
    }

    const isSelected = state.selectedChapterIds.has(chapterId);
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }

  async function onGenerateEbook() {
    const data = readFormData();
    if (!data.brand && !data.model && !data.year && !data.engine && !data.description) {
      setAiStatus("Prvo unesi i spremi podatke o vozilu.");
      return;
    }

    const selectedChapters = state.chapters.filter((chapter) => state.selectedChapterIds.has(chapter.chapter_id));
    if (!selectedChapters.length) {
      setAiStatus("Odaberi barem jedno poglavlje za vodič.");
      return;
    }

    const prompt = buildEbookPrompt(selectedChapters, data);

    try {
      await navigator.clipboard.writeText(prompt);
      setAiStatus("Upit za vodič je kopiran — zalijepi ga u AI chat.");
      setButtonTemporaryLabel(dom.generateEbookBtn, "Upit kopiran", ".myv-ai-generate-label");
    } catch (error) {
      console.error("Kopiranje upita nije uspjelo:", error);
      setAiStatus("Kopiranje u međuspremnik nije uspjelo. Pokušaj ponovno.");
    }
  }

  async function loadWebshops() {
    try {
      const response = await fetch(WEBSHOPS_URL);
      if (!response.ok) {
        throw new Error(`Neuspješno dohvaćanje ${WEBSHOPS_URL}`);
      }

      const manifest = await response.json();
      state.webshopCategories = Array.isArray(manifest.categories) ? manifest.categories : [];
      renderWebshops();
    } catch (error) {
      console.error("Webshopovi nisu učitani:", error);
      dom.shopsGrid.innerHTML = "";
    }
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (error) {
      return url;
    }
  }

  function renderWebshops() {
    dom.shopsGrid.innerHTML = state.webshopCategories
      .map((category) => {
        const items = Array.isArray(category.items) ? category.items : [];
        const extraCount = Math.max(items.length - WEBSHOPS_INITIAL_VISIBLE, 0);

        const itemsHtml = items
          .map((item, index) => {
            const isExtra = index >= WEBSHOPS_INITIAL_VISIBLE;
            const itemBody = `
              <button type="button" class="myv-shop-item-toggle" aria-expanded="false">
                <span>${escapeHtml(item.name)}</span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div class="myv-shop-item-details">
                <div class="myv-shop-item-details-inner">
                  <p class="myv-shop-item-desc">${escapeHtml(item.description || "")}</p>
                  <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer" class="myv-shop-item-link">
                    <i data-lucide="link"></i>
                    <span>${escapeHtml(getHostname(item.url))}</span>
                  </a>
                </div>
              </div>
            `;

            return isExtra
              ? `<div class="myv-shop-item myv-shop-item-extra"><div class="myv-shop-item-extra-inner">${itemBody}</div></div>`
              : `<div class="myv-shop-item">${itemBody}</div>`;
          })
          .join("");

        const moreBtnHtml = extraCount > 0
          ? `
            <button type="button" class="myv-shop-more-btn">
              <span>Prikaži još (${extraCount})</span>
              <i data-lucide="chevron-down"></i>
            </button>
          `
          : "";

        return `
          <div class="myv-shop-card" data-category-id="${escapeAttribute(category.id)}">
            <button type="button" class="myv-shop-card-header" aria-expanded="false">
              <span class="myv-shop-card-dot"></span>
              <h3 class="myv-shop-card-title">${escapeHtml(category.name)}</h3>
              <i data-lucide="chevron-down" class="myv-shop-card-header-icon"></i>
            </button>
            <div class="myv-shop-card-body">
              ${itemsHtml}
              ${moreBtnHtml}
            </div>
          </div>
        `;
      })
      .join("");

    refreshLucideIcons();
  }

  function onShopsGridClick(event) {
    const categoryHeader = event.target.closest(".myv-shop-card-header");
    if (categoryHeader) {
      const card = categoryHeader.closest(".myv-shop-card");
      const isOpen = card.classList.toggle("is-category-open");
      categoryHeader.setAttribute("aria-expanded", isOpen);
      return;
    }

    const moreBtn = event.target.closest(".myv-shop-more-btn");
    if (moreBtn) {
      const card = moreBtn.closest(".myv-shop-card");
      const isOpen = card.classList.toggle("is-shop-more-open");
      moreBtn.querySelector("span").textContent = isOpen
        ? "Prikaži manje"
        : `Prikaži još (${card.querySelectorAll(".myv-shop-item-extra").length})`;
      return;
    }

    const itemToggle = event.target.closest(".myv-shop-item-toggle");
    if (itemToggle) {
      const item = itemToggle.closest(".myv-shop-item");
      const card = itemToggle.closest(".myv-shop-card");
      const willOpen = !item.classList.contains("is-open");

      card.querySelectorAll(".myv-shop-item.is-open").forEach((openItem) => {
        openItem.classList.remove("is-open");
        openItem.querySelector(".myv-shop-item-toggle").setAttribute("aria-expanded", "false");
      });

      if (willOpen) {
        item.classList.add("is-open");
        itemToggle.setAttribute("aria-expanded", "true");
      }
    }
  }

  function onPartsVinInput(event) {
    const input = event.target;
    const { selectionStart, selectionEnd } = input;
    const sanitized = input.value.replace(/o/gi, "0");
    if (sanitized !== input.value) {
      input.value = sanitized;
      input.setSelectionRange(selectionStart, selectionEnd);
    }
  }

  function onPartsRequestSubmit(event) {
    event.preventDefault();

    const vin = normalizeText(dom.partsVin.value);
    const phone = normalizeText(dom.partsPhone.value);
    const email = normalizeText(dom.partsEmail.value);
    const description = normalizeText(dom.partsDescription.value);
    const partTypes = Array.from(dom.partsForm.querySelectorAll('input[name="partType"]:checked')).map((input) => input.value);

    if (!description || (!phone && !email)) {
      setPartsStatus("Unesi opis dijela te barem jedan kontakt (telefon ili email).");
      return;
    }

    const subject = vin ? `Upit za dijelove - VIN ${vin}` : "Upit za dijelove";
    const bodyLines = [
      `VIN: ${vin || "-"}`,
      `Telefon: ${phone || "-"}`,
      `Email: ${email || "-"}`,
      `Vrsta dijela: ${partTypes.length ? partTypes.join(", ") : "-"}`,
      "",
      "Opis dijela:",
      description
    ];

    const vehicle = readFormData();
    if (vehicle.brand || vehicle.model || vehicle.year || vehicle.engine || vehicle.description) {
      bodyLines.push("", "Podaci o vozilu:");
      if (vehicle.brand) bodyLines.push(`Marka: ${vehicle.brand}`);
      if (vehicle.model) bodyLines.push(`Model: ${vehicle.model}`);
      if (vehicle.year) bodyLines.push(`Godina: ${vehicle.year}`);
      if (vehicle.engine) bodyLines.push(`Motor: ${vehicle.engine}`);
      if (vehicle.description) bodyLines.push(`Opis: ${vehicle.description}`);
    }

    const mailtoUrl = `mailto:${PARTS_REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailtoUrl;
    setPartsStatus("Otvara se aplikacija za email — provjeri i pošalji poruku.");
  }

  function setPartsStatus(message) {
    dom.partsStatus.textContent = message;
  }

  function buildAiPrompt(template, data) {
    return String(template || "")
      .replace(/\{marka\}/g, data.brand || "")
      .replace(/\{model\}/g, [data.model, data.description].filter(Boolean).join(" "))
      .replace(/\{godina\}/g, data.year || "")
      .replace(/\{motor\}/g, data.engine || "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function buildEbookPrompt(chapters, data) {
    const chapterLines = chapters
      .map((chapter, index) => `${index + 1}. ${chapter.emoji || ""} ${chapter.label}: ${chapter.prompt_template}`.trim())
      .join("\n\n");

    const combined = [state.introTemplate, chapterLines, state.outroTemplate]
      .filter(Boolean)
      .join("\n\n");

    return buildAiPrompt(combined, data);
  }

  function setButtonTemporaryLabel(button, text, labelSelector = ".myv-ai-btn-label", delay = 1500) {
    const label = button.querySelector(labelSelector);
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
      engine: normalizeText(dom.engine.value),
      description: normalizeText(dom.description.value)
    };
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function profileHasData(data, imageBlob) {
    return Boolean(
      (data.brand || data.model || data.year || data.engine || data.description) ||
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
    const title = [data.brand, data.model, data.description].filter(Boolean).join(" ");
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
