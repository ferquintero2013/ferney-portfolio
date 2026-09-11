"""Endpoint temporal de diagnostico: GET /api/diag

Existe porque los logs de Vercel requieren CLI autenticada. Reporta el
entorno de ejecucion y en que punto falla la carga del motor, sin exponer
nunca el valor de ningun secreto: solo si esta presente y su longitud.

Se elimina en cuanto el asistente funcione.
"""

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler

AQUI = os.path.dirname(os.path.abspath(__file__))


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        info = {
            "python": sys.version,
            "cwd": os.getcwd(),
            "file_dir": AQUI,
            "dir_en_syspath": AQUI in sys.path,
            "archivos_junto_a_mi": sorted(os.listdir(AQUI))[:20],
            "OPENAI_API_KEY_presente": bool(os.getenv("OPENAI_API_KEY")),
            "OPENAI_API_KEY_longitud": len(os.getenv("OPENAI_API_KEY") or ""),
            "pasos": {},
        }

        def paso(nombre, fn):
            try:
                info["pasos"][nombre] = {"ok": True, "detalle": fn()}
            except Exception as e:
                info["pasos"][nombre] = {
                    "ok": False,
                    "error": f"{type(e).__name__}: {e}",
                    "traceback": traceback.format_exc().splitlines()[-6:],
                }

        def importar_numpy():
            import numpy
            return numpy.__version__

        def importar_openai():
            import openai
            return openai.__version__

        def importar_bm25():
            import rank_bm25
            return "ok"

        def leer_vectores():
            import numpy as np
            ruta = os.path.join(AQUI, "_index_vectors.npy")
            if not os.path.exists(ruta):
                raise FileNotFoundError(ruta)
            m = np.load(ruta)
            return f"shape={m.shape}"

        def leer_meta():
            ruta = os.path.join(AQUI, "_index_meta.json")
            if not os.path.exists(ruta):
                raise FileNotFoundError(ruta)
            with open(ruta, encoding="utf-8") as f:
                return f"chunks={json.load(f)['count']}"

        def importar_retriever():
            if AQUI not in sys.path:
                sys.path.insert(0, AQUI)
            import _retriever
            return f"chunks cargados={len(_retriever._ids)}"

        def importar_rag():
            if AQUI not in sys.path:
                sys.path.insert(0, AQUI)
            import _rag
            return "ok"

        paso("import numpy", importar_numpy)
        paso("import openai", importar_openai)
        paso("import rank_bm25", importar_bm25)
        paso("leer _index_meta.json", leer_meta)
        paso("leer _index_vectors.npy", leer_vectores)
        paso("import _retriever", importar_retriever)
        paso("import _rag", importar_rag)

        cuerpo = json.dumps(info, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, fmt, *args):
        return
