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
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
