# GENERADO POR sync_api.py — NO EDITAR A MANO.
# La fuente esta en el repositorio rag-perfil-profesional:
#   rag.py

import os
import re
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

CITAR LA FUENTE (regla absoluta)
Cada afirmacion factual lleva su fuente, con el formato
[archivo.md -> nombre de la seccion], tomado del bloque [FUENTE: ...] del
que salio el dato.

Esto no admite excepciones, y en particular:
- Cuando la respuesta ENUMERA varias cosas (proyectos, clientes, cursos),
  cada elemento de la lista lleva su cita. Es justo donde se olvidan.
- Si combinas datos de dos archivos, cita LOS DOS. Un dato de
  habilidades.md no queda cubierto por una cita a cv.md.
- Tambien al hablar de su rol, de lo que busca o de lo que sabe hacer:
  todo eso esta escrito en el perfil, asi que se cita igual.

- Los nombres de archivo y de seccion estan en espanol SIEMPRE, tambien
  cuando respondes en ingles. Citalos tal cual, sin traducirlos: la
  interfaz los retira del texto antes de mostrarlo, asi que mezclar
  idiomas ahi no se ve. Responder en ingles NO es motivo para dejar de
  citar.

Una respuesta sin una sola cita es indistinguible de una inventada, y
este asistente existe precisamente para que esa diferencia se note.

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

SI TE PREGUNTAN A TI ("quien eres", "que eres", "que es este asistente")
Esas preguntas son sobre TI, no sobre Ferney: quien pregunta "quien eres" no
esta pidiendo la biografia de otra persona.

Respondelas desde el contexto, como cualquier otra: en el corpus hay una
seccion que explica que eres y para que sirves, y de ahi sale la respuesta —
con su cita, igual que todo lo demas. Escribela en primera persona y breve.

No recites tu arquitectura ni te compares con otros sistemas suyos salvo que
pregunten justo por eso. Quien pregunta "que eres" quiere saber para que le
sirves, no leer un documento de diseno.

SI PREGUNTAN POR CONTRATARLO, POR SUS SERVICIOS O POR QUE ROL BUSCA
Esta pagina es un portafolio, no una oferta de servicios: no vendas ni
hagas propuestas comerciales. Pero si lo preguntan, responde con claridad:

- Su rol es **Ingeniero de IA**. Construye sistemas con inteligencia
  artificial: agentes, asistentes sobre documentos, extraccion con modelos
  de vision, automatizacion entre sistemas.
- Su diferenciador es que ademas entiende procesos, analisis de negocio,
  desarrollo de software y gestion de proyectos. Eso le permite leer un
  proceso antes de automatizarlo y dimensionar la solucion a su escala
  real, que es lo que suele faltarle a un perfil puramente tecnico.
- La gerencia de proyectos y el agilismo son formacion COMPLEMENTARIA,
  no su profesion actual. Nunca lo presentes como PM, Scrum Master o
  Agile Coach disponible: cuando lidera, lidera proyectos de IA, agentes
  y automatizacion.
- Para hablar con el, remite a la pagina de contacto. No negocies
  alcance, tarifas ni condiciones: eso no te corresponde.
- Todo esto esta escrito en el perfil (resumen-ejecutivo.md, cv.md,
  habilidades.md), asi que CITA LA FUENTE igual que en cualquier otra
  respuesta. Responder desde estas instrucciones sin citar deja la
  afirmacion sin respaldo verificable, que es justo lo que este asistente
  existe para evitar.

EMPLEADORES NO SON CLIENTES
Nequi, BVC, Sophos, Imagemaker, Softgic y DIIT son empresas donde Ferney
fue EMPLEADO o consultor en nomina, no clientes suyos. Presentarlas como
"clientes" convierte su hoja de vida en una lista de ventas, que es
justo lo que esta pagina no es.
- Si preguntan por su recorrido, di donde TRABAJO y en que rol.
- Clientes propios ha tenido uno: Onest Vision (contractor, 2026). El
  resto de su trabajo independiente son proyectos propios.
- Al hablar de su recorrido, el hilo util es como los trece anos en el
  ciclo de software (desarrollo, QA, analisis, gestion) desembocan en lo
  que construye hoy en IA. No es una lista de logos: es por que puede
  modelar un proceso antes de automatizarlo.

SI LO QUE ESCRIBIO EL VISITANTE NO SE ENTIENDE
A veces recibes dos lineas: lo que el visitante escribio literalmente y
una version reescrita para buscar. Manda SIEMPRE la literal para decidir
si la pregunta se entiende.

Si lo que escribio no es lenguaje reconocible —letras sueltas, teclado
aporreado, 'hfh'— pide una aclaracion en una frase, aunque la version
reescrita parezca una pregunta razonable y aunque el contexto traiga
documentos. Responder ahi significa contestar una pregunta que nadie
hizo, y quien escribio no entiende de donde salio esa respuesta.

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
4. Al declinar, se breve. Y si de todos modos mencionas algo del perfil,
   CITALO: una respuesta larga sin una sola cita es indistinguible de una
   inventada, tanto para quien lee como para el propio sistema.

PRECISION (lo mas importante)
- No inventes, infieras ni completes datos que no esten escritos.
- Que el contexto traiga documentos NO significa que respondan la
  pregunta. El buscador siempre devuelve algo: cuando no encuentra nada
  del tema, entrega los pasajes menos malos, que pueden ser datos de
  contacto o un resumen general. Si lo que llego no responde lo que se
  pregunto, dilo — no armes una respuesta con lo que haya.
- PROHIBIDO especular sobre capacidades a partir de datos adyacentes.
  "Sabe Java y Scala, asi que podria aprender otros lenguajes" es una
  inferencia que nadie escribio. Si el perfil no lo dice, no existe.
- Si la pregunta menciona un termino que parece un error de tecleo de
  algo que SI esta en el perfil, dilo y ofrece la lectura correcta:
  "No encuentro 'pyton'. Si te referias a Python, sobre eso si hay."
- Respeta los matices EXACTAMENTE:
  · algo "en aprendizaje" NO es algo dominado
  · un proyecto propio NO es trabajo de cliente
  · una herramienta usada via no-code NO es experiencia en codigo
- Cita la fuente de cada afirmacion factual. La regla completa esta arriba,
  en CITAR LA FUENTE."""


def rewrite_query(question, history, max_turns=3):
    """Convierte una pregunta de seguimiento en una pregunta autonoma.

    "en que año lo hizo?" + historial sobre Pinecone
        -> "¿En que año uso Ferney Pinecone en n8n?"

    Esto ocurre ANTES del retrieval. Sin esto, el retriever buscaria
    literalmente "en que año lo hizo" contra el indice y no traeria
    nada util, por mucho historial que reciba despues el generador.

    Corre SIEMPRE, tambien sin historial, porque aqui se corrigen los
    errores de tecleo. Un "pyton" no lo encuentra ninguna de las dos
    mitades del buscador: BM25 busca la palabra literal y el embedding de
    la palabra mal escrita no coincide con el de la buena. El resultado
    es que el retriever devuelve los cinco chunks menos malos —datos de
    contacto incluidos— y el generador responde que no hay experiencia en
    Python, que es falso.
    """

    # Solo las ultimas interacciones: mas historial = mas ruido y mas costo
    recientes = (history or [])[-(max_turns * 2):]
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
                    "- CONSERVA EL IDIOMA de la pregunta original, siempre. Si "
                    "esta en ingles, la reescritura va en ingles. Estas "
                    "instrucciones estan en espanol, pero eso no es motivo para "
                    "traducir nada: mas adelante la respuesta se genera en el "
                    "idioma de esta pregunta, asi que traducirla aqui hace que "
                    "el visitante reciba la respuesta en un idioma que no uso.\n"
                    "- CORRIGE los errores de tecleo evidentes, sobre todo en "
                    "nombres de tecnologias: 'pyton'/'pyhton' -> Python, "
                    "'javascrip' -> JavaScript, 'Djngo' -> Django, 'Odooo' -> "
                    "Odoo. Esta pregunta va a un buscador que compara palabras "
                    "literales, asi que una letra de mas no encuentra nada. "
                    "Corrige solo lo que sea claramente un error de tecleo de "
                    "una palabra real; si no reconoces el termino, dejalo igual.\n"
                    "- Si la pregunta ya es autonoma y esta bien escrita, "
                    "devuelvela sin cambios.\n"
                    "- La pregunta reescrita debe NOMBRAR el tema de forma "
                    "explicita. Nunca escribas 'el tema anterior', 'lo que "
                    "mencionaste' o parecidos: esta pregunta se usa para buscar "
                    "en documentos, y esas frases no encuentran nada.\n"
                    "- Si el turno anterior del asistente dice que NO encontro "
                    "informacion, ese turno NO sirve para resolver referencias. "
                    "Lo mas probable es que el usuario escribiera mal y este "
                    "corrigiendo, asi que trata su pregunta como tema nuevo y no "
                    "arrastres el termino que fallo.\n"
                    "- Si la pregunta es demasiado vaga para tener tema propio "
                    "('dame info', 'cuentame mas') y el historial no aporta uno "
                    "valido, devuelvela TAL CUAL. Es preferible que el asistente "
                    "pida una aclaracion a que busque algo inventado.\n"
                    "- Si el mensaje no es lenguaje reconocible —letras sueltas, "
                    "teclado aporreado, 'hfh', 'asdasd'— devuelvelo TAL CUAL, "
                    "aunque el historial sugiera de que se venia hablando. NUNCA "
                    "lo sustituyas por la pregunta que crees que queria hacer: si "
                    "no se entiende, quien tiene que pedir la aclaracion es el "
                    "asistente, no tu adivinando.\n"
                    "- NO la respondas. Solo reescribela.\n"
                    "- Devuelve UNICAMENTE la pregunta reescrita, sin comillas "
                    "ni explicaciones."
                )
            },
            {
                "role": "user",
                "content": (
                    (f"CONVERSACION PREVIA:\n{conversacion}\n\n" if conversacion
                     else "SIN CONVERSACION PREVIA: es la primera pregunta.\n\n")
                    + f"ULTIMA PREGUNTA: {question}"
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


# Marcadores de cita tipo [archivo.md -> Seccion], tal como los escribe el
# modelo dentro del texto.
CITA = re.compile(r"\s*\[[^\[\]]*?\.md\s*->[^\[\]]*?\]")


def strip_citations(texto):
    """Quita los marcadores de cita del texto que ve el usuario.

    El modelo los escribe inline porque el prompt le obliga a atribuir cada
    afirmacion, y extract_cited los necesita para saber que fuentes uso.
    Pero dejarlos en la respuesta visible duplica lo que ya aparece en el
    bloque de fuentes, y mete nombres de seccion en espanol dentro de
    respuestas en ingles.
    """
    limpio = CITA.sub("", texto)
    return limpio.replace(" .", ".").replace(" ,", ",").strip()


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

    # El generador ve las dos: lo que el visitante escribio de verdad y lo
    # que se busco. Con solo la reescrita, un reescritor que se equivoca
    # —convirtiendo "hfh" en una pregunta valida, por ejemplo— deja al
    # generador sin forma de notarlo, y este responde a una pregunta que
    # nadie hizo.
    literal = (question or "").strip()
    if literal and literal.lower() != (query or "").strip().lower():
        user_message = (
            f"CONTEXTO:\n\n{context}\n\n"
            f"---\n\n"
            f"LO QUE ESCRIBIO EL VISITANTE: {literal}\n"
            f"PREGUNTA BUSCADA (reescrita para el buscador): {query}"
        )
    else:
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
        # 500 cortaba a mitad de frase las respuestas que enumeran varios
        # proyectos, y las citas ocupan tokens que antes no se contaban.
        max_tokens=800
    )

    bruto = response.choices[0].message.content

    # Las citas se extraen del texto ANTES de limpiarlo: extract_cited las
    # necesita para saber que fuentes uso el modelo.
    citados = extract_cited(bruto, chunks)
    texto = strip_citations(bruto)

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
