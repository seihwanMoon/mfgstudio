import json
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from config import settings
from models.trained_model import TrainedModel


TEMPLATE_ENV = Environment(
    loader=FileSystemLoader(str(Path(__file__).resolve().parent.parent / "templates")),
    autoescape=select_autoescape(["html", "xml"]),
)


def build_report_context(model: TrainedModel) -> dict:
    metrics = json.loads(model.metrics or "{}")
    hyperparams = json.loads(model.hyperparams or "{}")
    return {
        "title": "Manufacturing AI Studio Report",
        "model_name": model.mlflow_model_name or model.algorithm,
        "algorithm": model.algorithm,
        "version": model.mlflow_version,
        "stage": model.stage,
        "drift_score": model.drift_score,
        "pred_count_today": model.pred_count_today,
        "pred_count_total": model.pred_count_total,
        "metrics": metrics,
        "hyperparams": hyperparams,
        "generated_at": model.updated_at.isoformat() if model.updated_at else None,
    }


def render_report_pdf(context: dict) -> bytes:
    template = TEMPLATE_ENV.get_template("report.html")
    html = template.render(**context)
    from weasyprint import HTML

    return HTML(string=html, base_url=str(Path(settings.report_dir).resolve())).write_pdf()
