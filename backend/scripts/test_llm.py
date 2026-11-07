from app.llm.client import call_llm
from app.services.ai_log import log_ai_call

msgs = [{"role": "user", "content": "แนะนำตัวเองเป็นภาษาไทย 1 ประโยค"}]
for p in ["typhoon", "openai"]:
    r = call_llm(msgs, provider=p)
    print(p, "| ok:", r.success, "| tokens:", r.input_tokens, r.output_tokens,
          "| ms:", r.latency_ms, "| THB:", r.cost_thb)
    print("  →", r.text or r.error_message)
    print("  log id:", log_ai_call(r, feature="other", prompt_version="test"))
