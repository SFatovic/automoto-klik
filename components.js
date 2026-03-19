/* ===============================
   MICROSOFT CLARITY
================================ */

function loadClarity() {
  if (window.clarity) return;

  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.src = "https://www.clarity.ms/tag/vulcumfw5v";

  document.head.appendChild(script);
}

/* ===============================
   HEADER
================================ */

function renderHeader() {
  const target = document.getElementById("site-header");
  if (!target) return;

  target.innerHTML = `
  <header class="site-header">
    <div class="container header-inner">

      <div class="header-logo">
        <a href="index.html">AutoMoto KLIK!</a>
      </div>

      <nav class="header-nav">
        <a href="index.html" data-page="index">Početna</a>
        <a href="ai-upiti.html" data-page="ai-upiti">AI alati</a>
        <a href="kvizovi.html" data-page="kvizovi">Kvizovi</a>
        <a href="o-projektu.html" data-page="o-projektu">O projektu</a>
      </nav>

    </div>
  </header>
  `;
}

/* ===============================
   FOOTER
================================ */

function renderFooter() {
  const target = document.getElementById("site-footer");
  if (!target) return;

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

      <div class="footer-bottom">
        © 2026 AutoMoto KLIK!
      </div>

    </div>
  </footer>
  `;
}

/* ===============================
   ACTIVE NAVIGATION
================================ */

function highlightActiveNav() {
  const path = window.location.pathname;

  let current = "index";

  if (path.includes("ai-upiti")) current = "ai-upiti";
  if (path.includes("tool")) current = "ai-upiti";
  if (path.includes("kvizovi")) current = "kvizovi";
  if (path.includes("kviz")) current = "kvizovi";
  if (path.includes("o-projektu")) current = "o-projektu";

  document.querySelectorAll(".header-nav a").forEach(link => {
    if (link.dataset.page === current) {
      link.classList.add("active");
    }
  });
}

/* ===============================
   INIT
================================ */

document.addEventListener("DOMContentLoaded", () => {

  loadClarity();
  renderHeader();
  renderFooter();
  highlightActiveNav();

});