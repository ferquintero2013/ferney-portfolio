# GENERADO POR sync_api.py. NO EDITAR A MANO.
# La fuente esta en el repositorio rag-perfil-profesional:
#   retriever.py

import io
import json
import os
import re

import numpy as np
from openai import OpenAI
from dotenv import load_dotenv
from rank_bm25 import BM25Okapi

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

META_PATH = os.path.join(BASE_DIR, "_index_meta.json")
VECTORS_PATH = os.path.join(BASE_DIR, "_index_vectors.npy")
EMBEDDING_MODEL = "text-embedding-3-small"


# De donde sale el indice. Si INDEX_BUCKET esta definida, se baja de S3;
# si no, se lee del disco como siempre.
#
# Por que un solo archivo y no dos: la diferencia entre Vercel y Lambda no
# es de logica, es de donde viven los datos. Dos copias del retriever se
# habrian desincronizado a la primera correccion. Aqui el entorno decide.
#
# Y por que S3 en Lambda, si el indice son 600 KB y cabria en la imagen:
# para separar los datos del despliegue. Hoy, reindexar el perfil obliga a
# reconstruir y redesplegar. Con el indice afuera, se sube el archivo nuevo
# y la siguiente invocacion en frio lo recoge.
INDEX_BUCKET = os.getenv("INDEX_BUCKET")
INDEX_PREFIX = os.getenv("INDEX_PREFIX", "indice")


def _cargar_indice():
    """Devuelve (meta, vectores). De S3 o del disco, segun el entorno."""
    if not INDEX_BUCKET:
        with open(META_PATH, encoding="utf-8") as f:
            meta = json.load(f)
        return meta, np.load(VECTORS_PATH)

    # boto3 se importa aqui dentro a proposito: en Vercel esta rama no
    # corre, y la dependencia no tiene por que estar instalada alli.
    import boto3

    s3 = boto3.client("s3")

    def bajar(nombre):
        objeto = s3.get_object(Bucket=INDEX_BUCKET,
                               Key=f"{INDEX_PREFIX}/{nombre}")
        return objeto["Body"].read()

    meta = json.loads(bajar("_index_meta.json").decode("utf-8"))

    # np.load necesita algo con metodo read, no bytes sueltos. BytesIO
    # envuelve los bytes en memoria sin escribir a disco, que en Lambda
    # solo seria escribible en /tmp.
    vectores = np.load(io.BytesIO(bajar("_index_vectors.npy")))

    return meta, vectores


# --- indice en memoria, cargado una sola vez al importar ---
#
# En Lambda esto corre en el arranque en frio y queda en memoria mientras la
# instancia viva. Las invocaciones siguientes no vuelven a bajar nada.
_meta, _vectors = _cargar_indice()

_chunks = _meta["chunks"]
_ids = [c["id"] for c in _chunks]
_by_id = {c["id"]: c for c in _chunks}


def tokenize(text):
    """Divide en palabras en minuscula para la busqueda por terminos."""
    return re.findall(r"[a-z0-9aeiouñ]+", text.lower())


_bm25 = BM25Okapi([tokenize(c["text"]) for c in _chunks])


def get_embedding(text):
    """Convierte un texto en un vector de 1536 dimensiones."""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


def search_semantic(question, n=10):
    """Busqueda por significado. Toda la operacion es una multiplicacion.

    Con los vectores normalizados, la similitud coseno se reduce al
    producto punto: (37, 1536) @ (1536,) -> (37,), un score por chunk.
    """
    q = np.array(get_embedding(question), dtype=np.float32)
    q /= np.linalg.norm(q)

    scores = _vectors @ q

    # argsort ordena de menor a mayor; el signo menos invierte el orden
    mejores = np.argsort(-scores)[:n]
    return [_ids[i] for i in mejores]


def search_keyword(question, n=10):
    """Busqueda por palabras exactas (BM25)."""
    scores = _bm25.get_scores(tokenize(question))
    ranked = sorted(zip(_ids, scores), key=lambda pair: -pair[1])
    return [chunk_id for chunk_id, score in ranked[:n] if score > 0]


def reciprocal_rank_fusion(rankings, k=60):
    """Combina varios rankings usando solo la posicion, no los scores.

    BM25 devuelve valores tipo 4.7 y la similitud coseno valores entre
    -1 y 1: son escalas incomparables, promediarlas no significa nada.
    RRF ignora la magnitud y solo mira el puesto.
    """
    scores = {}
    for ranking in rankings:
        for rank, chunk_id in enumerate(ranking):
            scores[chunk_id] = scores.get(chunk_id, 0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda pair: -pair[1])


def retrieve(question, n_results=5):
    """Recuperacion hibrida: semantica + palabras clave, fusionadas con RRF."""
    semantic_ids = search_semantic(question, n=10)
    keyword_ids = search_keyword(question, n=10)

    fused = reciprocal_rank_fusion([semantic_ids, keyword_ids])

    chunks = []
    for chunk_id, score in fused[:n_results]:
        c = _by_id[chunk_id]
        chunks.append({
            "text": c["text"],
            "source": c["source"],
            "section": c["section"],
            "score": score,
        })

    return chunks


if __name__ == "__main__":
    preguntas = [
        "¿Tiene experiencia con Python?",
        "¿Sabe usar Pinecone?",
        "¿Que sabe de Odoo?",
        "¿Ha liderado equipos?",
    ]

    print(f"Indice: {_meta['count']} chunks, {_meta['dimensions']} dimensiones\n")

    for pregunta in preguntas:
        print("=" * 70)
        print(f"PREGUNTA: {pregunta}")
        print("=" * 70)
        for i, chunk in enumerate(retrieve(pregunta, n_results=4)):
            print(f"{i + 1}. rrf={chunk['score']:.4f}  "
                  f"[{chunk['source']}] {chunk['section'][:50]}")
        print()
