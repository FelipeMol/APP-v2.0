from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # LLM
    llm_provider: str = "glm"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-haiku-20241022"
    glm_api_key: str = ""
    glm_model: str = "glm-4-flash"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    # Auth
    jwt_secret: str = "change_me"

    # Servidor
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173"

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
