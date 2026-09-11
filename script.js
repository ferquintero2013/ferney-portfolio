/* ==========================================================================
   Ferney Quintero — AI Automation Engineer
   Vanilla JS. No dependencies, no build step.

   El chat habla con /api/ask, en este mismo dominio. La respuesta trae un
   campo "mood" derivado de si el asistente pudo citar fuentes o no, y ese
   valor es lo que hace gesticular al robot: un atributo en el contenedor,
   y el CSS se encarga del resto.
   ========================================================================== */

(function () {
  "use strict";

  var stage = document.querySelector(".stage");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  var send = document.getElementById("chat-send");
  var log = document.getElementById("chat-log");
  var suggestions = document.getElementById("chat-suggestions");

  if (!form || !log || !stage) return;   // no estamos en la portada

  // Tope por sesion. No es seguridad —recargar lo reinicia— sino un freno
  // contra el uso accidental en bucle. El limite duro vive en la cuenta de
  // OpenAI; un rate limit de verdad necesitaria estado compartido entre
  // invocaciones, que una funcion serverless no tiene por si sola.
  var MAX_PREGUNTAS = 12;
  var usadas = 0;

  var historial = [];
  var esperando = false;

  /* ---- gestos del robot ------------------------------------------------ */

  var VOLVER_A_IDLE = 4200;
  var temporizador = null;

  function setMood(mood) {
    stage.setAttribute("data-mood", mood);
    clearTimeout(temporizador);

    if (mood !== "idle" && mood !== "thinking") {
      temporizador = setTimeout(function () {
        stage.setAttribute("data-mood", "idle");
      }, VOLVER_A_IDLE);
    }
  }

  /* ---- la mirada sigue al cursor --------------------------------------- */

  // Solo en reposo: mientras piensa o reacciona manda su propia expresion.
  // El desplazamiento es minimo (unos pocos px en coordenadas del SVG) —
  // basta para que parezca vivo sin que el gesto se note fabricado.
  var cara = document.querySelector(".bot-face");
  var bot = document.querySelector(".bot");

  if (cara && bot && window.matchMedia("(hover: hover)").matches) {
    var pendiente = false;

    window.addEventListener("mousemove", function (e) {
      if (pendiente) return;
      pendiente = true;

      requestAnimationFrame(function () {
        pendiente = false;
        if (stage.getAttribute("data-mood") !== "idle") {
          cara.style.transform = "";
          return;
        }

        var caja = bot.getBoundingClientRect();
        if (!caja.width) return;

        var cx = caja.left + caja.width / 2;
        var cy = caja.top + caja.height * 0.34;   // altura de los ojos

        var dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 420)) * 7;
        var dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 340)) * 4;

        cara.style.transform = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px)";
      });
    }, { passive: true });
  }

  /* ---- pintar mensajes ------------------------------------------------- */

  function addMessage(quien, texto, fuentes) {
    var msg = document.createElement("div");
    msg.className = "msg from-" + quien;

    var p = document.createElement("p");
    p.className = "msg-text";
    p.textContent = texto;      // textContent, nunca innerHTML: el texto
    msg.appendChild(p);         // viene de un modelo y de un visitante

    if (fuentes && fuentes.length) {
      var lista = document.createElement("p");
      lista.className = "msg-sources";
      lista.textContent = fuentes
        .map(function (f) { return f.source + " → " + f.section; })
        .join("  ·  ");
      msg.appendChild(lista);
    }

    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }

  function addTyping() {
    var msg = document.createElement("div");
    msg.className = "msg from-bot typing";
    msg.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }

  /* ---- preguntar ------------------------------------------------------- */

  function ask(pregunta) {
    if (esperando) return;

    pregunta = (pregunta || "").trim();
    if (!pregunta) return;

    if (usadas >= MAX_PREGUNTAS) {
      addMessage("bot", "That's the limit for one session — reload the page to start over. " +
                        "Meanwhile, the Work and Background pages have the full story.");
      setMood("declined");
      return;
    }

    usadas += 1;
    esperando = true;
    input.value = "";
    input.disabled = true;
    send.disabled = true;
    if (suggestions) suggestions.hidden = true;

    addMessage("user", pregunta);
    var typing = addTyping();
    setMood("thinking");

    fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: pregunta, history: historial })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Request failed");
          return data;
        });
      })
      .then(function (data) {
        typing.remove();
        addMessage("bot", data.answer, data.cited);
        setMood(data.mood || "answering");

        historial.push({ rol: "user", texto: pregunta });
        historial.push({ rol: "assistant", texto: data.answer });
        // Solo los ultimos turnos viajan de vuelta: mas historial es mas
        // ruido para la reescritura de la pregunta y mas tokens.
        if (historial.length > 6) historial = historial.slice(-6);
      })
      .catch(function (err) {
        typing.remove();
        addMessage("bot", "Something went wrong reaching my brain. Try again in a moment.");
        setMood("unsure");
        if (window.console) console.error(err);
      })
      .then(function () {
        esperando = false;
        input.disabled = false;
        send.disabled = false;
        input.focus();
      });
  }

  /* ---- eventos --------------------------------------------------------- */

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(input.value);
  });

  if (suggestions) {
    suggestions.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-q]");
      if (btn) ask(btn.getAttribute("data-q"));
    });
  }
})();
