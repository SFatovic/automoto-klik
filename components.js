(() => {
  const CLARITY_ID = "vulcumfw5v";
  const SHELL_STATE = {
    initialized: false
  };

  const NAV_ITEMS = [
    { href: "index.html", label: "Početna", page: "index" },
    { href: "ai-upiti.html", label: "AI alati", page: "ai-upiti" },
    { href: "kvizovi.html", label: "Kvizovi", page: "kvizovi" },
    { href: "o-projektu.html", label: "O projektu", page: "o-projektu" }
  ];

  const FOOTER_ITEMS = [
    { href: "index.html", label: "Početna" },
    { href: "ai-upiti.html", label: "AI alati" },
    { href: "kvizovi.html", label: "Kvizovi" },
    { href: "o-projektu.html", label: "O projektu" },
    { href: "legal.html", label: "Uvjeti korištenja i privatnost" }
  ];

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
    if (!CLARITY_ID) return;
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

    const navHtml = NAV_ITEMS.map(
      (item) => `<a href="${item.href}" data-page="${item.page}">${item.label}</a>`
    ).join("");

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
              ${navHtml}
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

    const linksHtml = FOOTER_ITEMS.map(
      (item) => `<a href="${item.href}">${item.label}</a>`
    ).join("");

    target.innerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <h3 class="footer-title">AutoMoto KLIK!</h3>
              <p class="footer-text">
                AI alati, kvizovi i digitalni sadržaj za vozače i ljubitelje automobila.
                Jednostavan ulaz u praktične alate i interaktivna auto iskustva.
              </p>
            </div>

            <div class="footer-links-wrap">
              <p class="footer-links-title">Navigacija</p>
              <div class="footer-links">
                ${linksHtml}
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <span>© ${currentYear} AutoMoto KLIK!</span>
            <span>Sadržaj, alati i kvizovi u razvoju.</span>
          </div>
        </div>
      </footer>
    `;
  }

  function highlightActiveNav() {
    const currentPage = detectCurrentPage();

    document.querySelectorAll(".header-nav a").forEach((link) => {
      const isActive = link.dataset.page === currentPage;

      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function detectCurrentPage() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("ai-upiti") || path.includes("tool")) return "ai-upiti";
    if (path.includes("kvizovi") || path.includes("kviz")) return "kvizovi";
    if (path.includes("o-projektu")) return "o-projektu";

    return "index";
  }
})();