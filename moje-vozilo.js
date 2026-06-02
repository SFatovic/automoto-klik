(() => {
  const STORAGE_KEY = "amk_my_vehicle_profile_v1";
  const DB_NAME = "amkMyVehicleDB";
  const DB_VERSION = 1;
  const STORE_NAME = "vehicleAssets";
  const PHOTO_RECORD_ID = "profilePhoto";

  const state = {
    imageBlob: null,
    imageUrl: "",
    indexedDbAvailable: true,
    hasProfile: false,
    isFormOpen: false
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheDom();
    bindEvents();
    await restoreProfile();
    updatePreview();
    updateToggleUi();
    setFormExpanded(false);
  }

  function cacheDom() {
    dom.formPanel = document.getElementById("vehicleFormPanel");
    dom.formToggle = document.getElementById("vehicleFormToggle");
    dom.formToggleText = document.getElementById("vehicleFormToggleText");
    dom.form = document.getElementById("myVehicleForm");
    dom.brand = document.getElementById("vehicleBrand");
    dom.model = document.getElementById("vehicleModel");
    dom.year = document.getElementById("vehicleYear");
    dom.engine = document.getElementById("vehicleEngine");
    dom.photo = document.getElementById("vehiclePhoto");
    dom.saveBtn = document.getElementById("saveVehicleBtn");
    dom.editBtn = document.getElementById("editVehicleBtn");
    dom.deleteBtn = document.getElementById("deleteVehicleBtn");
    dom.status = document.getElementById("vehicleStatusMessage");
    dom.previewCard = document.getElementById("myVehiclePreviewCard");
    dom.previewImage = document.getElementById("myVehiclePreviewImage");
    dom.previewTitle = document.getElementById("myVehiclePreviewTitle");
    dom.previewMeta = document.getElementById("myVehiclePreviewMeta");
    dom.previewState = document.getElementById("myVehiclePreviewState");
  }

  function bindEvents() {
    dom.formToggle.addEventListener("click", onToggleForm);
    dom.saveBtn.addEventListener("click", onSaveProfile);
    dom.editBtn.addEventListener("click", onEditProfile);
    dom.deleteBtn.addEventListener("click", onDeleteProfile);
  }

  function onToggleForm() {
    setFormExpanded(!state.isFormOpen);
  }

  function setFormExpanded(expanded) {
    state.isFormOpen = expanded;
    dom.formToggle.setAttribute("aria-expanded", String(expanded));
    dom.formPanel.setAttribute("aria-hidden", String(!expanded));
    dom.formPanel.classList.toggle("is-open", expanded);
    dom.formToggle.classList.toggle("is-open", expanded);
    updateToggleUi();
  }

  function updateToggleUi() {
    if (state.isFormOpen) {
      dom.formToggleText.textContent = "Zatvori obrazac";
      return;
    }
    dom.formToggleText.textContent = state.hasProfile ? "Izmijeni podatke vozila" : "Dodaj svoje vozilo";
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
    await persistProfile("Profil vozila je spremljen.");
  }

  async function onEditProfile() {
    await persistProfile("Profil vozila je ažuriran.");
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
          updateToggleUi();
          return;
        }
      }
    }

    state.hasProfile = profileHasData(payload, state.imageBlob);
    setStatus(state.indexedDbAvailable ? successMessage : "Podaci su spremljeni, ali fotografiju nije moguće trajno spremiti u ovom pregledniku.");
    updatePreview();
    setFormExpanded(false);
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
    setFormExpanded(false);
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
    const hasData = Boolean(title || yearEngine);

    dom.previewTitle.textContent = title || "Marka Model";
    dom.previewMeta.textContent = yearEngine || "Godina • Motor";
    dom.previewState.textContent = hasData ? "Profil vozila je spreman." : "Unesi podatke i spremi profil vozila.";

    if (state.imageUrl) {
      URL.revokeObjectURL(state.imageUrl);
      state.imageUrl = "";
    }

    if (state.imageBlob) {
      state.imageUrl = URL.createObjectURL(state.imageBlob);
      dom.previewCard.classList.add("has-image");
      dom.previewImage.src = state.imageUrl;
      dom.previewImage.style.display = "block";
    } else {
      dom.previewCard.classList.remove("has-image");
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
