(() => {
  const CLARITY_ID = "vulcumfw5v";
  const SHELL_STATE = {
    initialized: false
  };

  document.addEventListener("DOMContentLoaded", initShell);

  function initShell() {
    if (SHELL_STATE.initialized) return;

    renderHeader();
    renderFooter();
    highlightActiveNav();
    loadClarity();

    SHELL_STATE.initialized = true;
  }

  function loadClarity() {
    if (window.clarity || document.querySelector("[data-clarity-script='true']")) {
      return;
    }

    window.clarity =
      window.clarity ||
      function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
    script.dataset.clarityScript = "true";

    document.head.appendChild(script);
  }

  function renderHeader() {
  const target = document.getElementById("site-header");
  if (!target) return;

  target.innerHTML = `
    <header class="site-header">
      <div class="container">
        <div class="header-inner">
          <div class="header-logo">
            <a href="index.html" aria-label="AutoMoto KLIK početna">
              <span class="header-logo-mark">AMK</span>
              <span class="header-logo-text">AutoMoto KLIK!</span>
            </a>
          </div>

          <nav class="header-nav" aria-label="Glavna navigacija">
            <a href="index.html" data-page="index">Početna</a>
            <a href="ai-upiti.html" data-page="ai-upiti">AI alati</a>
            <a href="kvizovi.html" data-page="kvizovi">Kvizovi</a>
            <a href="o-projektu.html" data-page="o-projektu">O projektu</a>
          </nav>
        </div>
      </div>
    </header>
  `;
}

  function renderFooter() {
    const target = document.getElementById("site-footer");
    if (!target) return;

    const currentYear = new Date().getFullYear();

    target.innerHTML = `
      <footer class="footer">
        <div class="container">
          <h3 class="footer-title">AutoMoto KLIK!</h3>

          <p class="footer-text">
            AI alati za vozače i ljubitelje automobila.
            Odaberi temu, ispuni nekoliko polja i generiraj gotov AI upit
            za kupnju automobila, guma i druge auto odluke.
          </p>

          <div class="footer-links">
            <a href="index.html">Početna</a>
            <a href="ai-upiti.html">AI alati</a>
            <a href="kvizovi.html">Kvizovi</a>
            <a href="o-projektu.html">O projektu</a>
            <a href="legal.html">Uvjeti korištenja i privatnost</a>
          </div>

          <div class="footer-bottom">© ${currentYear} AutoMoto KLIK!</div>
        </div>
      </footer>
    `;
  }

  function highlightActiveNav() {
    const path = window.location.pathname.toLowerCase();

    let current = "index";

    if (path.includes("ai-upiti") || path.includes("tool")) current = "ai-upiti";
    if (path.includes("kvizovi") || path.includes("kviz")) current = "kvizovi";
    if (path.includes("o-projektu")) current = "o-projektu";

    document.querySelectorAll(".header-nav a").forEach((link) => {
      const isActive = link.dataset.page === current;
      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }
})();