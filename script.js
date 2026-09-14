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

  // Los mensajes que genera el propio chat tambien cambian de idioma.
  // i18n.js expone el idioma activo; si no cargo, se usa ingles.
  var TEXTOS = {
    limite: {
      en: "That's the limit for one session — reload the page to start over. " +
          "Meanwhile, the Work and Background pages have the full story.",
      es: "Ese es el limite de una sesion: recarga la pagina para empezar de nuevo. " +
          "Mientras tanto, las paginas de Proyectos y Trayectoria tienen la historia completa."
    },
    error: {
      en: "Something went wrong reaching my brain. Try again in a moment.",
      es: "Algo fallo al llegar a mi cerebro. Intentalo de nuevo en un momento."
    }
  };

  function t(clave) {
    var lang = (window.FQ_LANG && window.FQ_LANG()) || "en";
    return TEXTOS[clave][lang] || TEXTOS[clave].en;
  }

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

  /* ---- el anfitrion presenta las puertas -------------------------------- */

  // Al pasar por una puerta, el robot gira a mirarla, la senala y la
  // comenta en su globo. Al salir, vuelve a la conversacion. El gesto lo
  // hace el CSS a partir de data-point; aqui solo se decide a donde mira.
  var puertas = document.querySelectorAll(".doors a[data-point]");
  var decir = document.getElementById("host-say");
  var soltar = null;

  function comentar(enlace) {
    clearTimeout(soltar);
    stage.setAttribute("data-point", enlace.getAttribute("data-point"));
    if (decir) {
      var lang = (window.FQ_LANG && window.FQ_LANG()) || "en";
      var texto = lang === "es"
        ? enlace.getAttribute("data-es-say")
        : enlace.getAttribute("data-say");
      decir.querySelector("p").textContent = texto || "";
    }
  }

  function soltarPuerta() {
    // Pequena espera: al moverse entre puertas vecinas el robot no vuelve
    // a la posicion neutra y se queda a medio camino.
    soltar = setTimeout(function () {
      stage.setAttribute("data-point", "none");
    }, 90);
  }

  puertas.forEach(function (a) {
    a.addEventListener("mouseenter", function () { comentar(a); });
    a.addEventListener("focus", function () { comentar(a); });
    a.addEventListener("mouseleave", soltarPuerta);
    a.addEventListener("blur", soltarPuerta);
  });

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
        var quieto = stage.getAttribute("data-mood") !== "idle" ||
                     stage.getAttribute("data-point") !== "none";
        if (quieto) {
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
      addMessage("bot", t("limite"));
      setMood("declined");
      return;
    }

    usadas += 1;
    esperando = true;
    input.value = "";
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
        addMessage("bot", t("error"));
        setMood("unsure");
        if (window.console) console.error(err);
      })
      .then(function () {
        esperando = false;
        send.disabled = false;
        // El valor se limpia otra vez por si el navegador reinyecto texto
        // de composicion (IME, teclado predictivo) durante la espera.
        input.value = "";
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

/* ==========================================================================
   Copiar al portapapeles

   Un enlace mailto no hace nada si el visitante no tiene cliente de correo
   configurado, que en movil es lo habitual: el boton parece roto. Esto
   hace que la direccion siempre sirva para algo.

   Vive fuera del modulo del chat porque la pagina de contacto no carga
   ningun chat, y este script se sirve en las cinco paginas.
   ========================================================================== */

(function () {
  "use strict";

  var botones = document.querySelectorAll("[data-copiar]");
  if (!botones.length) return;

  function copiar(texto) {
    // La API moderna necesita HTTPS y permiso; si falla se recurre al
    // metodo viejo, que funciona en cualquier navegador.
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto);
    }
    return new Promise(function (ok, mal) {
      var ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? ok() : mal();
      } catch (e) {
        mal(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  botones.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var texto = btn.getAttribute("data-copiar");
      var original = btn.textContent;

      copiar(texto).then(function () {
        btn.textContent = window.FQ_LANG && window.FQ_LANG() === "es"
          ? "Copiado" : "Copied";
        btn.setAttribute("data-hecho", "si");
      }).catch(function () {
        // Ni siquiera el metodo viejo funciono: al menos se selecciona
        // el correo para que se pueda copiar a mano.
        btn.textContent = window.FQ_LANG && window.FQ_LANG() === "es"
          ? "Copia manual" : "Copy manually";
        var a = document.querySelector('a[href^="mailto:"]');
        if (a && window.getSelection) {
          var r = document.createRange();
          r.selectNodeContents(a);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }).then(function () {
        setTimeout(function () {
          btn.textContent = original;
          btn.removeAttribute("data-hecho");
        }, 2200);
      });
    });
  });
})();
