# -*- coding: utf-8 -*-
"""Registro de consultas del asistente.

Para que sirve: saber que le preguntan de verdad y, sobre todo, que
preguntas NO sabe responder. Una consulta que sale con mood 'declined' o
'unsure' senala un hueco del corpus, que es exactamente como se han
encontrado los huecos hasta ahora — a mano y de casualidad.

Que se guarda: fecha, pregunta, pregunta reescrita, respuesta, estado y
fuentes citadas. **Nada que identifique al visitante**: ni IP, ni
navegador, ni cookie. Asi el log responde "que me preguntan" sin recoger
datos personales.

Donde: Supabase, via su API REST, porque las funciones de Vercel son
efimeras y no tienen disco donde escribir.

Regla de oro: **registrar nunca puede romper una respuesta**. Todo el
modulo falla en silencio. Si Supabase esta caido, mal configurado o
tarda, el visitante recibe su respuesta igual y aqui no se entera nadie
salvo el log del servidor.
"""

import json
import os
import urllib.error
import urllib.request

TABLA = "consultas_asistente"

# Dos segundos es de sobra para un insert. Mas que eso y conviene perder
# el registro antes que alargar la funcion: el dato es util, no critico.
TIMEOUT = 2

# Recortes generosos pero finitos: la pregunta ya viene limitada por el
# endpoint, la respuesta la acota max_tokens, y aun asi no hay razon para
# guardar mas de esto.
MAX_PREGUNTA = 600
MAX_RESPUESTA = 4000


def _config():
    """Devuelve (url, clave) o None si falta configuracion.

    Sin las variables el modulo simplemente no hace nada, que es lo que
    debe pasar en un entorno local o en un despliegue sin Supabase.
    """
    url = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    clave = (os.environ.get("SUPABASE_KEY") or "").strip()
    if not url or not clave:
        return None
    return url, clave


def registrar(pregunta, respuesta, mood, fuentes, query_usada=None, ms=None):
    """Inserta una fila en Supabase. Nunca lanza."""
    try:
        cfg = _config()
        if cfg is None:
            return False
        url, clave = cfg

        fila = {
            "pregunta": (pregunta or "")[:MAX_PREGUNTA],
            "query_usada": (query_usada or "")[:MAX_PREGUNTA] or None,
            "respuesta": (respuesta or "")[:MAX_RESPUESTA],
            "mood": mood or None,
            # Solo archivo y seccion; es lo que permite ver si una respuesta
            # salio del corpus o el modelo hablo sin respaldo.
            "fuentes": [
                {"source": f.get("source"), "section": f.get("section")}
                for f in (fuentes or [])
            ],
            "ms": int(ms) if ms is not None else None,
        }

        peticion = urllib.request.Request(
            f"{url}/rest/v1/{TABLA}",
            data=json.dumps(fila).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "apikey": clave,
                "Authorization": f"Bearer {clave}",
                # Sin esto Supabase devuelve la fila insertada, que no
                # necesitamos y solo gasta ancho de banda.
                "Prefer": "return=minimal",
            },
        )
        with urllib.request.urlopen(peticion, timeout=TIMEOUT) as r:
            return 200 <= r.status < 300

    except urllib.error.HTTPError as e:
        # Lo mas probable aqui es RLS mal configurado o tabla inexistente.
        # Va al log del servidor para poder diagnosticarlo, no al cliente.
        try:
            detalle = e.read().decode("utf-8", "replace")[:300]
        except Exception:
            detalle = ""
        print(f"[log] Supabase rechazo el insert ({e.code}): {detalle}")
        return False
    except Exception as e:
        print(f"[log] no se pudo registrar la consulta: {type(e).__name__}: {e}")
        return False
