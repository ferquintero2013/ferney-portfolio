/* ==========================================================================
   Bilingue sin duplicar paginas.

   El contenido en ingles vive en el HTML como texto normal, y la version
   en espanol viaja en un atributo data-es junto a el. Asi la pagina sigue
   siendo legible si este archivo no carga, los buscadores indexan el
   ingles sin depender de JavaScript, y no hay diez archivos que mantener
   en paralelo.

   Elementos que traduce:
     data-es          -> reemplaza el contenido
     data-es-ph       -> reemplaza el placeholder de un input
     data-es-label    -> reemplaza aria-label
     data-es-q        -> reemplaza data-q (preguntas sugeridas del chat)
     data-es-href     -> reemplaza el destino de un enlace (CV en PDF)
   ========================================================================== */

(function () {
  "use strict";

  var KEY = "fq-lang";
  var LANGS = ["en", "es"];

  function guardado() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function recordar(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) { /* modo privado */ }
  }

  function inicial() {
    // Si el visitante ya eligio idioma alguna vez, se respeta su eleccion.
    var g = guardado();
    if (LANGS.indexOf(g) !== -1) return g;

    // Si no, ingles siempre. Antes se miraba navigator.language, pero el
    // publico al que apunta esta pagina son ofertas en ingles: que un
    // reclutador con el navegador en espanol caiga en la version
    // castellana era exactamente lo contrario de lo que hace falta.
    return "en";
  }

  function aplicar(lang) {
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-es]").forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = lang === "es" ? el.dataset.es : el.dataset.en;
    });

    document.querySelectorAll("[data-es-ph]").forEach(function (el) {
      if (el.dataset.enPh === undefined) el.dataset.enPh = el.placeholder || "";
      el.placeholder = lang === "es" ? el.dataset.esPh : el.dataset.enPh;
    });

    document.querySelectorAll("[data-es-label]").forEach(function (el) {
      if (el.dataset.enLabel === undefined) el.dataset.enLabel = el.getAttribute("aria-label") || "";
      el.setAttribute("aria-label", lang === "es" ? el.dataset.esLabel : el.dataset.enLabel);
    });

    document.querySelectorAll("[data-es-href]").forEach(function (el) {
      if (el.dataset.enHref === undefined) el.dataset.enHref = el.getAttribute("href") || "";
      el.setAttribute("href", lang === "es" ? el.dataset.esHref : el.dataset.enHref);
    });

    document.querySelectorAll("[data-es-q]").forEach(function (el) {
      if (el.dataset.enQ === undefined) el.dataset.enQ = el.getAttribute("data-q") || "";
      el.setAttribute("data-q", lang === "es" ? el.dataset.esQ : el.dataset.enQ);
    });

    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      var suyo = btn.getAttribute("data-lang-btn");
      btn.setAttribute("aria-pressed", suyo === lang ? "true" : "false");
    });

    // Para que el resto del sitio pueda reaccionar (el chat, por ejemplo)
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
  }

  var actual = inicial();
  aplicar(actual);

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-lang-btn]");
    if (!btn) return;
    var lang = btn.getAttribute("data-lang-btn");
    if (lang === actual) return;
    actual = lang;
    recordar(lang);
    aplicar(lang);
  });

  window.FQ_LANG = function () { return actual; };
})();
