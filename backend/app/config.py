from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration settings."""

    # Appwrite — defaults match the live CarrySpanner project
    APPWRITE_ENDPOINT: str = "https://fra.cloud.appwrite.io/v1"
    APPWRITE_PROJECT_ID: str = "699e2b1100328d076862"
    APPWRITE_API_KEY: str = (
        "standard_f0f523c352d7f1d9719f3a82f17b9053ce550894afccc1d8879f31e7737163e502c70c7fda4757b3e80cb5cea14c0c4fbc82ab2b0f0924c959f348270e0f75abcc2d3c1ac60e63784f6593b99f15e395e17df4ef57590bdca304389fe4b897889876dde72ece383f7ffc514146dff7bd30082ef8bfb9b1df81ec3582c3c0b2ae"
    )
    APPWRITE_DB_ID: str = "699e2b3b00170fd7efb1"

    # JWT Security
    SECRET_KEY: str = "CarrySpanner-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Application
    APP_NAME: str = "CarrySpanner API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173"

    # Hubtel API Configuration
    HUBTEL_CLIENT_ID: str = ""
    HUBTEL_CLIENT_SECRET: str = ""
    HUBTEL_SENDER_ID: str = "CarrySpanner"

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
