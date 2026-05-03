from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "verisignal"
    JWT_SECRET: str = "CHANGE_ME_IN_PRODUCTION_verisignal_jwt_secret_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    VERI_AI_MODEL_PATH: str = "../models/fine_tuned_roberta"

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_WS_URL: str = "ws://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
