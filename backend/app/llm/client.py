import time
from dataclasses import dataclass
from openai import OpenAI
from app.config import settings

_clients = {
    "typhoon": OpenAI(api_key=settings.typhoon_api_key, base_url=settings.typhoon_base_url, timeout=60),
    "openai": OpenAI(api_key=settings.openai_api_key, timeout=60),
}
_models = {"typhoon": settings.typhoon_model, "openai": settings.openai_model}
_prices = {
    "typhoon": (settings.typhoon_price_in, settings.typhoon_price_out),
    "openai": (settings.openai_price_in, settings.openai_price_out),
}

@dataclass
class LLMResult:
    provider: str
    model_name: str
    success: bool
    latency_ms: int
    usd_thb_rate: float
    text: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_usd: float | None = None
    cost_thb: float | None = None
    error_message: str | None = None

def call_llm(messages: list[dict], provider: str | None = None,
             temperature: float = 0.3, max_tokens: int = 800) -> LLMResult:
    """Never raises: failures come back as success=False so they still get logged."""
    provider = provider or settings.default_provider
    model = _models[provider]
    start = time.perf_counter()
    try:
        resp = _clients[provider].chat.completions.create(
            model=model, messages=messages,
            temperature=temperature, max_tokens=max_tokens,
        )
        latency = int((time.perf_counter() - start) * 1000)
        in_tok = resp.usage.prompt_tokens if resp.usage else None
        out_tok = resp.usage.completion_tokens if resp.usage else None
        cost = None
        if in_tok is not None and out_tok is not None:
            p_in, p_out = _prices[provider]
            cost = (in_tok * p_in + out_tok * p_out) / 1_000_000
        return LLMResult(
            provider=provider, model_name=model, success=True, latency_ms=latency,
            usd_thb_rate=settings.usd_thb_rate, text=resp.choices[0].message.content,
            input_tokens=in_tok, output_tokens=out_tok, cost_usd=cost,
            cost_thb=cost * settings.usd_thb_rate if cost is not None else None,
        )
    except Exception as e:
        return LLMResult(
            provider=provider, model_name=model, success=False,
            latency_ms=int((time.perf_counter() - start) * 1000),
            usd_thb_rate=settings.usd_thb_rate, error_message=str(e)[:500],
        )
