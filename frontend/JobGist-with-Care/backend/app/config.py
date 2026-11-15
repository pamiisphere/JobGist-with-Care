from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str

    typhoon_api_key: str
    typhoon_base_url: str = "https://api.opentyphoon.ai/v1"
    typhoon_model: str = "typhoon-v2.5-30b-a3b-instruct"
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    default_provider: str = "typhoon"

    # USD per 1M tokens. Record the date you checked each price for the thesis.
    typhoon_price_in: float
    typhoon_price_out: float
    openai_price_in: float = 0.15
    openai_price_out: float = 0.60
    usd_thb_rate: float          # fix ONE rate for the whole study (reproducibility)

    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
