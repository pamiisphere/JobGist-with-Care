from app.config import settings
from app.llm.client import call_llm
from app.matching.config import DIAGNOSIS_KEYWORDS
from app.prompts.suggest_needs import PROMPT_VERSION, build_messages
from app.services.ai_log import log_ai_call
from app.services.match_data import load_labels

_cache: dict = {}   # (provider, version, text) -> raw LLM output; successes only

def suggest_needs(text: str, selected: list[str], provider: str | None = None) -> dict:
    provider = provider or settings.default_provider
    text = text.strip()
    labels = load_labels()
    key = (provider, PROMPT_VERSION, text)
    raw = _cache.get(key)
    cached = raw is not None

    if raw is None:
        r = call_llm(build_messages(text, labels), provider=provider, temperature=0.0, max_tokens=300)
        log_ai_call(r, "other", PROMPT_VERSION, request_meta={"task": "suggest_needs"})
        if not r.success or not r.text:
            return {"suggestions": [], "source": "unavailable", "cached": False}
        raw = _cache[key] = r.text

    out, seen = [], set(selected)
    for line in raw.splitlines():
        if "|" not in line:
            continue
        code, ev = (x.strip(" -*`\"'") for x in line.split("|", 1))
        if code not in labels or code in seen or not ev:
            continue
        if ev not in text:                       # guard 2: evidence must be quoted verbatim
            continue
        if code in DIAGNOSIS_KEYWORDS and not any(k in ev.lower() for k in DIAGNOSIS_KEYWORDS[code]):
            continue                             # guard 3: no diagnosing from symptoms
        seen.add(code)
        out.append({"code": code, "label_th": labels[code], "evidence": ev})
    return {"suggestions": out, "source": "ai", "cached": cached}
