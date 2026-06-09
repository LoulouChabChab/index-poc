import json
import re
from services.ai.ollama_client import generate, generate_stream


def _build_analysis_prompt(schema_a: dict, schema_b: dict, context: str) -> str:
    def fmt(schema):
        lines = []
        for col in schema["columns"]:
            samples = ", ".join(col["samples"][:5]) or "(vide)"
            lines.append(f"  - {col['name']} : {samples}")
        return "\n".join(lines)

    ctx_block = f"\nContexte métier fourni par l'utilisateur : {context}\n" if context.strip() else ""

    return f"""Tu es un assistant expert en croisement de données pour le secteur public français.
{ctx_block}
Tu dois analyser deux sources de données et proposer les correspondances entre leurs colonnes.

SOURCE A :
{fmt(schema_a)}

SOURCE B :
{fmt(schema_b)}

Avant de produire le JSON, raisonne étape par étape :
1. Pour chaque colonne de la source A, identifie ce qu'elle représente d'après son nom et ses exemples.
2. Pour chaque colonne de la source B, fais de même.
3. Cherche les paires les plus probables en comparant sémantique et format des valeurs.
4. Évalue la confiance (high/medium/low) selon la similarité nom + contenu.
5. Liste les colonnes sans correspondance.

Une fois ce raisonnement terminé, produis UNIQUEMENT le JSON final, sans aucun autre texte après lui :
{{
  "proposals": [
    {{
      "col_a": "nom_colonne_source_a",
      "col_b": "nom_colonne_source_b",
      "confidence": "high" | "medium" | "low"
    }}
  ],
  "unmatched_a": ["col1", "col2"],
  "unmatched_b": ["col3"]
}}

Règles :
- Trie les propositions par ordre décroissant de confiance (high d'abord)
- N'inclus une colonne que dans UNE SEULE proposition ou dans unmatched, jamais les deux
- Si aucune correspondance n'est possible, laisse proposals vide"""


def _build_explain_prompt(col_a: str, samples_a: list, col_b: str, samples_b: list, confidence: str, context: str) -> str:
    sa = ", ".join(samples_a[:5]) or "(vide)"
    sb = ", ".join(samples_b[:5]) or "(vide)"
    ctx_block = f"Contexte métier : {context}\n" if context.strip() else ""
    conf_fr = {"high": "élevée", "medium": "moyenne", "low": "faible"}.get(confidence, confidence)

    return f"""{ctx_block}Explique en une ou deux phrases simples, en français, pourquoi la colonne "{col_a}" (exemples : {sa}) \
correspond à la colonne "{col_b}" (exemples : {sb}). \
La confiance est {conf_fr}. Parle directement à l'utilisateur, de façon claire et sans jargon technique."""


def _build_refine_prompt(col_a: str, col_b: str, feedback: str, schema_a: dict, schema_b: dict, context: str) -> str:
    cols_a = [c["name"] for c in schema_a["columns"]]
    cols_b = [c["name"] for c in schema_b["columns"]]
    ctx_block = f"Contexte métier : {context}\n" if context.strip() else ""

    return f"""{ctx_block}L'utilisateur a rejeté la correspondance entre "{col_a}" (source A) et "{col_b}" (source B).

Son explication : {feedback}

Colonnes disponibles dans la source A : {', '.join(cols_a)}
Colonnes disponibles dans la source B : {', '.join(cols_b)}

Propose une nouvelle correspondance ou une règle de fusion en répondant UNIQUEMENT avec un JSON valide :
{{
  "col_a": "nom ou expression",
  "col_b": "nom ou expression",
  "confidence": "high" | "medium" | "low",
  "is_computed": true | false
}}

Si tu ne peux pas proposer de correspondance valide, réponds :
{{"error": "message explicatif en français"}}

Réponds uniquement avec le JSON, rien d'autre."""


async def analyze_schemas(schema_a: dict, schema_b: dict, context: str) -> dict:
    prompt = _build_analysis_prompt(schema_a, schema_b, context)
    raw = await generate(prompt)
    import tempfile, pathlib
    pathlib.Path(tempfile.gettempdir(), "ollama_raw.txt").write_text(raw, encoding="utf-8")
    return _parse_proposals(raw)


async def stream_explanation(col_a: str, samples_a: list, col_b: str, samples_b: list, confidence: str, context: str):
    prompt = _build_explain_prompt(col_a, samples_a, col_b, samples_b, confidence, context)
    async for chunk in generate_stream(prompt):
        yield chunk


async def stream_refinement(col_a: str, col_b: str, feedback: str, schema_a: dict, schema_b: dict, context: str):
    prompt = _build_refine_prompt(col_a, col_b, feedback, schema_a, schema_b, context)
    async for chunk in generate_stream(prompt):
        yield chunk


def _parse_proposals(raw: str) -> dict:
    # Essai 1 : JSON complet
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        text = match.group()
        try:
            data = json.loads(text)
            return _build_result(data)
        except json.JSONDecodeError:
            try:
                fixed = re.sub(r',\s*([}\]])', r'\1', text)
                fixed = re.sub(r'\}\s*\{', '},{', fixed)
                data = json.loads(fixed)
                return _build_result(data)
            except json.JSONDecodeError:
                pass

    # Essai 2 : extraire les paires depuis le texte du raisonnement
    # Format attendu : "col_a <-> col_b (confidence)"
    proposals = []
    seen_a, seen_b = set(), set()
    pair_re = re.compile(
        r'-\s+([^\n<:]+?)\s*<->\s+([^\n(]+?)\s*\(?(high|medium|low)\)?',
        re.IGNORECASE
    )
    for m in pair_re.finditer(raw):
        col_a = m.group(1).strip().rstrip(':').strip()
        col_b = m.group(2).strip().rstrip(':').strip()
        conf  = m.group(3).lower()
        if col_a in seen_a or col_b in seen_b:
            continue
        proposals.append({"col_a": col_a, "col_b": col_b, "confidence": conf})
        seen_a.add(col_a)
        seen_b.add(col_b)

    if proposals:
        # Trier par confiance
        order = {"high": 0, "medium": 1, "low": 2}
        proposals.sort(key=lambda p: order.get(p["confidence"], 3))
        return _build_result({"proposals": proposals, "unmatched_a": [], "unmatched_b": []})

    raise ValueError("L'IA n'a pas retourné de réponse structurée. Réessayez.")

def _build_result(data: dict) -> dict:
    proposals = []
    for p in data.get("proposals", []):
        proposals.append({
            "col_a": str(p.get("col_a", "")),
            "col_b": str(p.get("col_b", "")),
            "confidence": p.get("confidence", "low") if p.get("confidence") in ("high", "medium", "low") else "low",
            "status": "pending",
            "is_computed": False,
        })

    return {
        "proposals": proposals,
        "unmatched_a": [str(c) for c in data.get("unmatched_a", [])],
        "unmatched_b": [str(c) for c in data.get("unmatched_b", [])],
    }
