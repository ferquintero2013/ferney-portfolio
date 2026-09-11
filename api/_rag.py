# GENERADO POR sync_api.py — NO EDITAR A MANO.
# La fuente esta en el repositorio rag-perfil-profesional:
#   rag.py

import os
from openai import OpenAI
from dotenv import load_dotenv
from _retriever import retrieve

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

ANSWER_MODEL = "gpt-4o"
REWRITE_MODEL = "gpt-4o-mini"


SYSTEM_PROMPT = """Eres el asistente del perfil profesional de Ferney Quintero.
Respondes preguntas de reclutadores y personas interesadas en su trayectoria,
usando UNICAMENTE la informacion del contexto que se te entrega.

TONO
- Escribe natural y directo, como un colega bien informado que conoce a Ferney.
- NUNCA uses frases como "segun el contexto", "en la informacion proporcionada"
  o "en el perfil que tengo". Quien pregunta no sabe que existe un contexto.
- Conciso: 2-4 frases, salvo que la pregunta pida mas detalle.

IDIOMA (regla absoluta)
Responde SIEMPRE en el idioma de la pregunta, sin excepcion. Si preguntan
en ingles, respondes en ingles; si preguntan en espanol, en espanol. Esto
aplica tambien cuando declinas: el contexto esta en espanol, pero eso no
cambia el idioma de tu respuesta.

ORDEN DE LA INFORMACION
Cuando el contexto tenga evidencia concreta Y contexto de nivel sobre el mismo
tema, empieza SIEMPRE por la evidencia concreta:
  1ro: proyectos construidos, entregables, resultados medibles, clientes reales
  2do: nivel declarado, formacion en curso, matices de profundidad

Esto NO es para ocultar el matiz: el matiz va igual, en la misma respuesta. Es
para no enterrar lo que la persona efectivamente hizo detras de una etiqueta.

  Mal:  "Esta aprendiendo Python desde abril de 2026. Ademas construyo un MVP..."
  Bien: "Construyo un MVP de validacion documental en Python 3.14, desplegado y
         funcional. Su formacion formal en Python es reciente (abril 2026), pero
         ya la aplico en un proyecto real."

COMO MANEJAR LO QUE ENCUENTRES
1. Si el contexto responde la pregunta: respondela directo.
2. Si el contexto responde PARCIALMENTE: da lo que si sabes y aclara con
   naturalidad que parte no esta documentada.
   PROHIBIDO empezar diciendo que no tienes informacion y despues darla.
   Eso se contradice.
   Mal:  "No tengo esa informacion. Ferney ha usado Pinecone en n8n..."
   Bien: "El perfil no califica su nivel de profundidad en Pinecone. Lo que si
          indica es que lo ha usado dentro de flujos de n8n, no via codigo."
3. Si el contexto no dice NADA del tema: dilo en una frase y, si existe algo
   cercano, ofrecelo.

PRECISION (lo mas importante)
- No inventes, infieras ni completes datos que no esten escritos.
- Respeta los matices EXACTAMENTE:
  · algo "en aprendizaje" NO es algo dominado
  · un proyecto propio NO es trabajo de cliente
  · una herramienta usada via no-code NO es experiencia en codigo
- Cita la fuente de CADA afirmacion factual con el formato
  [archivo.md -> nombre de la seccion].
  Si una respuesta combina datos de dos archivos, cita LOS DOS. Un dato tomado
  de habilidades.md no queda cubierto por una cita a cv.md."""


def rewrite_query(question, history, max_turns=3):
    """Convierte una pregunta de seguimiento en una pregunta autonoma.

    "en que año lo hizo?" + historial sobre Pinecone
        -> "¿En que año uso Ferney Pinecone en n8n?"

    Esto ocurre ANTES del retrieval. Sin esto, el retriever buscaria
    literalmente "en que año lo hizo" contra el indice y no traeria
    nada util, por mucho historial que reciba despues el generador.
    """
    if not history:
        return question

    # Solo las ultimas interacciones: mas historial = mas ruido y mas costo
    recientes = history[-(max_turns * 2):]
    conversacion = "\n".join(
        f"{'Usuario' if m['rol'] == 'user' else 'Asistente'}: {m['texto']}"
        for m in recientes
    )

    response = openai_client.chat.completions.create(
        model=REWRITE_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Reescribe la ultima pregunta del usuario como una pregunta "
                    "COMPLETA y AUTONOMA, resolviendo pronombres y referencias "
                    "implicitas con la conversacion previa.\n"
                    "- Si la pregunta ya es autonoma, devuelvela sin cambios.\n"
                    "- NO la respondas. Solo reescribela.\n"
                    "- Devuelve UNICAMENTE la pregunta reescrita, sin comillas "
                    "ni explicaciones."
                )
            },
            {
                "role": "user",
                "content": (
                    f"CONVERSACION PREVIA:\n{conversacion}\n\n"
                    f"ULTIMA PREGUNTA: {question}"
                )
            }
        ],
        temperature=0,
        max_tokens=100
    )

    return response.choices[0].message.content.strip()


def build_context(chunks):
    """Formats retrieved chunks into a text block for the prompt."""
    bloques = []
    for chunk in chunks:
        bloques.append(
            f"[FUENTE: {chunk['source']} -> {chunk['section']}]\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(bloques)


def extract_cited(answer_text, chunks):
    """Filtra los chunks que el modelo REALMENTE cito en su respuesta.

    El retriever trae 5 candidatos, pero el modelo suele usar 1 o 2.
    Mostrar los 5 como "fuentes" seria enganoso: sugiere que la respuesta
    salio de todos ellos.
    """
    citados = []
    for chunk in chunks:
        # El archivo debe aparecer en la respuesta
        if chunk["source"] not in answer_text:
            continue
        # Y tambien el inicio de la seccion (el modelo puede truncar titulos largos)
        clave = chunk["section"][:20]
        if clave in answer_text:
            citados.append(chunk)
    return citados


# Frases con las que el modelo declina cuando el dato no esta en el corpus.
def detect_mood(answer_text, citados):
    """Deriva el estado de animo del asistente de lo que ya sabemos.

    No se le pregunta al modelo: la senal ya esta en si cito fuentes o no.
    El prompt le obliga a citar toda afirmacion factual, asi que no citar
    nada significa que no tenia nada que afirmar.

    Deliberadamente NO se buscan frases tipo "no tengo esa informacion".
    Esa lista nunca queda completa: el modelo redacta la negativa distinto
    cada vez ("no hay informacion documentada", "no consta", "el CV no
    refleja"). La longitud es una senal estructural en vez de lexica, asi
    que no depende de la redaccion ni del idioma.

    Devuelve uno de: confident | answering | declined | unsure
    """
    if citados:
        return "confident" if len(citados) >= 2 else "answering"

    # Sin fuentes citadas: o declino, o respondio sin respaldo.
    if len(answer_text) < 220:
        return "declined"

    # Respuesta larga sin una sola cita. El system prompt lo prohibe, asi
    # que esto es una anomalia — y el robot poniendo cara rara la hace
    # visible desde la interfaz.
    return "unsure"


def answer(question, history=None, n_results=5):
    """Full RAG pipeline: rewrite -> retrieve -> augment -> generate."""
    query = rewrite_query(question, history or [])

    chunks = retrieve(query, n_results=n_results)
    context = build_context(chunks)

    user_message = (
        f"CONTEXTO:\n\n{context}\n\n"
        f"---\n\n"
        f"PREGUNTA: {query}"
    )

    response = openai_client.chat.completions.create(
        model=ANSWER_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        temperature=0.1,
        max_tokens=500
    )

    texto = response.choices[0].message.content
    citados = extract_cited(texto, chunks)

    return {
        "question": question,
        # La pregunta que realmente se busco (util para observabilidad)
        "query_used": query,
        "answer": texto,
        # Lo que el modelo realmente uso -> esto se le muestra al usuario
        "mood": detect_mood(texto, citados),
        "cited": [
            {"source": c["source"], "section": c["section"]}
            for c in citados
        ],
        # Todo lo que trajo el retriever -> util para debug, no para la UI
        "retrieved": [
            {"source": c["source"], "section": c["section"], "score": c["score"]}
            for c in chunks
        ]
    }


if __name__ == "__main__":
    preguntas = [
        "¿Tiene experiencia con Python?",
        "¿Sabe usar Pinecone?",
        "¿Ha trabajado con clientes reales en automatizacion?",
        "¿Tiene experiencia con Kubernetes?"
    ]

    for pregunta in preguntas:
        resultado = answer(pregunta)

        print("=" * 70)
        print(f"P: {resultado['question']}")
        print("=" * 70)
        print(f"\n{resultado['answer']}\n")

        if resultado["cited"]:
            print("Fuentes citadas:")
            for s in resultado["cited"]:
                print(f"  - [{s['source']}] {s['section'][:55]}")
        else:
            print("(sin fuentes citadas)")

        print(f"  ...{len(resultado['retrieved'])} chunks recuperados en total")
        print()
