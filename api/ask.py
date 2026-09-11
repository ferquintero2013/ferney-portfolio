"""Endpoint del asistente: POST /api/ask

Usa el handler nativo de Python en vez de FastAPI a proposito. En una
funcion serverless el arranque en frio depende del peso de lo que hay que
importar, y FastAPI arrastra starlette y pydantic para un unico endpoint
cuya validacion cabe en veinte lineas. En el repositorio del RAG si se usa
FastAPI, porque ahi el valor es la documentacion interactiva al desarrollar.

No hay configuracion de CORS: la API vive en el mismo dominio que el sitio
que la consume, asi que el navegador no la considera una peticion cruzada.
"""

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler

# Vercel no garantiza que el directorio de la funcion este en sys.path,
# asi que los modulos vecinos (_rag, _retriever) no se encuentran solos.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _rag import answer

MAX_QUESTION_CHARS = 500
MAX_HISTORY_TURNS = 6
MAX_TURN_CHARS = 2000
MAX_BODY_BYTES = 32_000


class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        try:
            longitud = int(self.headers.get("content-length") or 0)
            if longitud > MAX_BODY_BYTES:
                return self._json(413, {"error": "Request too large."})

            cuerpo = json.loads(self.rfile.read(longitud) or b"{}")

            pregunta = str(cuerpo.get("question") or "").strip()
            if not pregunta:
                return self._json(400, {"error": "A question is required."})
            if len(pregunta) > MAX_QUESTION_CHARS:
                return self._json(400, {
                    "error": f"Question too long (max {MAX_QUESTION_CHARS} characters)."
                })

            historial = self._clean_history(cuerpo.get("history"))

            resultado = answer(pregunta, history=historial)

            return self._json(200, {
                "answer": resultado["answer"],
                "mood": resultado["mood"],
                "cited": resultado["cited"],
                "query_used": resultado["query_used"],
            })

        except json.JSONDecodeError:
            return self._json(400, {"error": "Malformed JSON."})
        except Exception:
            # El detalle va al log del servidor, nunca al cliente: un stack
            # trace en la respuesta filtra rutas y estructura interna.
            print(traceback.format_exc())
            return self._json(500, {"error": "Something went wrong on my side."})

    @staticmethod
    def _clean_history(bruto):
        """Recorta y sanea el historial que manda el cliente.

        Llega del navegador, asi que es entrada no confiable: se limita el
        numero de turnos y la longitud de cada uno antes de que acabe
        dentro de un prompt.
        """
        if not isinstance(bruto, list):
            return []

        limpio = []
        for turno in bruto[-MAX_HISTORY_TURNS:]:
            if not isinstance(turno, dict):
                continue
            rol = "user" if turno.get("rol") == "user" else "assistant"
            texto = str(turno.get("texto") or "")[:MAX_TURN_CHARS]
            if texto:
                limpio.append({"rol": rol, "texto": texto})
        return limpio

    def _json(self, status, payload):
        cuerpo = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, fmt, *args):
        """Silencia el log por peticion; Vercel ya registra las suyas."""
        return
