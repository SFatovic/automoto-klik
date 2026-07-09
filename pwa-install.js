(() => {
  const DISMISS_KEY = "amk_pwa_install_dismissed_at";
  const DISMISS_DAYS = 14;

  let deferredPrompt = null;
  let dom = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    if (!isMobile() || isStandalone() || isRecentlyDismissed()) return;

    dom = {
      banner: document.getElementById("myvInstallBanner"),
      desc: document.getElementById("myvInstallDesc"),
      installBtn: document.getElementById("myvInstallBtn"),
      closeBtn: document.getElementById("myvInstallClose")
    };
    if (!dom.banner) return;

    dom.closeBtn.addEventListener("click", onDismiss);
    dom.installBtn.addEventListener("click", onInstallClick);

    registerServiceWorker();

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      showBanner("android");
    });

    window.addEventListener("appinstalled", () => {
      localStorage.removeItem(DISMISS_KEY);
      hideBanner();
    });

    if (isIos() && isSafari()) {
      showBanner("ios");
    }
  }

  function isMobile() {
    return window.matchMedia("(max-width: 767.98px)").matches;
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function isSafari() {
    const ua = window.navigator.userAgent;
    return /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  }

  function isRecentlyDismissed() {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    if (!dismissedAt) return false;
    const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return elapsedDays < DISMISS_DAYS;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw-moje-vozilo.js").catch(() => {});
  }

  function onDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    hideBanner();
  }

  async function onInstallClick() {
    if (!deferredPrompt) return;
    dom.installBtn.disabled = true;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    dom.installBtn.disabled = false;
    if (choice.outcome === "accepted") hideBanner();
  }

  function showBanner(mode) {
    if (mode === "ios") {
      dom.desc.textContent = 'Dodirni "Podijeli", zatim "Dodaj na Home zaslon".';
      dom.installBtn.hidden = true;
    } else {
      dom.installBtn.hidden = false;
    }
    dom.banner.hidden = false;
    requestAnimationFrame(() => dom.banner.classList.add("is-visible"));
    if (window.refreshLucideIcons) window.refreshLucideIcons();
  }

  function hideBanner() {
    if (!dom.banner) return;
    dom.banner.classList.remove("is-visible");
    window.setTimeout(() => { dom.banner.hidden = true; }, 250);
  }
})();
