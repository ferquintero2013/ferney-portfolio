/* ==========================================================================
   Ferney Quintero — AI Automation Engineer
   Vanilla JS. No dependencies, no build step.

   Deliberately small: the page content lives in index.html, not in here.
   Keeping copy in the markup means search engines and link previews can
   read it, and the site still works if this file fails to load.
   ========================================================================== */

(function () {
  "use strict";

  /* ---- theme -------------------------------------------------------- */
  var root = document.documentElement;
  var btn = document.getElementById("theme");
  var KEY = "fq-theme";

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function remember(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode */ }
  }

  var saved = stored();
  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  }

  if (btn) {
    btn.addEventListener("click", function () {
      // No stamp yet means we're following the OS: read what it resolved to.
      var current = root.getAttribute("data-theme");
      if (!current) {
        current = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      remember(next);
    });
  }

  /* ---- hide the loading label once the assistant renders ------------ */
  var frame = document.getElementById("ragframe");
  var loading = document.getElementById("loading");

  if (frame && loading) {
    var hide = function () { loading.hidden = true; };
    frame.addEventListener("load", hide);
    // Fallback: a cold Streamlit container can take a while to paint, but
    // leaving "Loading…" up forever looks broken.
    setTimeout(hide, 12000);
  }

  // The current section is now marked with aria-current="page" in the
  // markup of each page, so no scroll observer is needed.
})();
