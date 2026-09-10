/* ==========================================================================
   Ferney Quintero — AI Automation Engineer
   Vanilla JS. No dependencies, no build step.

   Deliberately tiny: page content lives in the HTML, not in here, so search
   engines and link previews can read it and the site still works if this
   file never loads. Single theme, so there is no toggle to manage either.
   ========================================================================== */

(function () {
  "use strict";

  // Hide the placeholder once the embedded assistant paints.
  var frame = document.getElementById("ragframe");
  var loading = document.getElementById("loading");

  if (frame && loading) {
    var hide = function () { loading.hidden = true; };
    frame.addEventListener("load", hide);
    // A cold Streamlit container can take a while, but leaving "Waking up…"
    // on screen forever looks broken.
    setTimeout(hide, 15000);
  }
})();
