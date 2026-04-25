from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/foodmap"
    REDIS_URL: str = "redis://localhost:6379/0"
    KAKAO_REST_API_KEY: str = ""
    INTERNAL_API_SECRET: str = ""
    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()
