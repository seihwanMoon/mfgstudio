from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/manufacturing_ai.db"
    mlflow_tracking_uri: str = "http://localhost:5000"
    upload_dir: str = "./data/uploads"
    model_dir: str = "./data/models"
    report_dir: str = "./data/reports"
    drift_warning_threshold: float = 0.2
    drift_danger_threshold: float = 0.4
    secret_key: str = "dev-secret-key"
    kakao_rest_api_key: str = ""
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
