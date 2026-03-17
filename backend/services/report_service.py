import json
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from config import settings
from models.dataset import Dataset
from models.experiment import Experiment
from models.trained_model import TrainedModel
from services.pycaret_service import EXPERIMENT_CONTEXTS, ensure_experiment_context, get_report_safe_plot


TEMPLATE_ENV = Environment(
    loader=FileSystemLoader(str(Path(__file__).resolve().parent.parent / "templates")),
    autoescape=select_autoescape(["html", "xml"]),
)

MODULE_LABELS = {
    "classification": "분류",
    "regression": "회귀",
    "clustering": "클러스터링",
    "anomaly": "이상탐지",
    "timeseries": "시계열",
}

STAGE_LABELS = {
    "Production": "프로덕션",
    "Staging": "스테이징",
    "Archived": "보관",
    "None": "미지정",
    None: "미지정",
}

METRIC_PRIORITY = {
    "classification": ["Accuracy", "AUC", "F1", "Recall", "Precision"],
    "regression": ["R2", "RMSE", "MAE", "MSE", "MAPE", "RMSLE"],
    "clustering": ["Silhouette", "Calinski-Harabasz", "Davies-Bouldin"],
    "anomaly": ["AUC", "Recall", "Precision"],
    "timeseries": ["MAE", "RMSE", "MAPE", "SMAPE"],
}

REPORT_CHART_SPECS = {
    "classification": [
        {
            "family": "plot",
            "key": "feature",
            "title": "변수 중요도",
            "caption": "모델 진단 기준의 대표 변수 중요도입니다.",
        },
        {
            "family": "xai",
            "key": "summary",
            "title": "SHAP 요약",
            "caption": "예측에 큰 영향을 준 상위 feature를 요약합니다.",
        },
    ],
    "regression": [
        {
            "family": "plot",
            "key": "residuals",
            "title": "잔차 플롯",
            "caption": "예측 오차 패턴이 안정적인지 확인합니다.",
        },
        {
            "family": "xai",
            "key": "summary",
            "title": "SHAP 요약",
            "caption": "예측값 변화에 기여한 상위 feature를 요약합니다.",
        },
    ],
    "clustering": [
        {
            "family": "plot",
            "key": "cluster",
            "title": "클러스터 분포",
            "caption": "클러스터 분리 상태를 2D 투영으로 보여줍니다.",
        },
    ],
    "anomaly": [
        {
            "family": "plot",
            "key": "tsne",
            "title": "이상치 임베딩",
            "caption": "정상/이상 패턴의 분포를 임베딩으로 확인합니다.",
        },
    ],
    "timeseries": [
        {
            "family": "plot",
            "key": "forecast",
            "title": "예측 추세",
            "caption": "학습 구간과 예측 구간을 함께 보여주는 대표 시계열 차트입니다.",
        },
        {
            "family": "plot",
            "key": "residuals",
            "title": "잔차 플롯",
            "caption": "예측 오차를 시간 순서대로 확인하는 대표 진단 차트입니다.",
        },
    ],
}


def _safe_slug(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "_" for char in str(value))
    return "_".join(part for part in cleaned.split("_") if part) or "model"


def _safe_json_loads(value, default):
    if not value:
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return default


def _format_value(value) -> str:
    if value in (None, ""):
        return "-"
    if isinstance(value, bool):
        return "예" if value else "아니오"
    if isinstance(value, float):
        text = f"{value:.4f}".rstrip("0").rstrip(".")
        return text or "0"
    if isinstance(value, (list, tuple)):
        return ", ".join(_format_value(item) for item in value) if value else "-"
    if isinstance(value, dict):
        return ", ".join(f"{key}={_format_value(item)}" for key, item in value.items()) if value else "-"
    return str(value)


def _format_timestamp(value) -> str:
    if value is None:
        return "-"
    try:
        return value.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(value)


def _module_label(value: str | None) -> str:
    return MODULE_LABELS.get(value, value or "-")


def _stage_label(value: str | None) -> str:
    return STAGE_LABELS.get(value, value or "미지정")


def _summarize_setup_params(params: dict) -> list[dict]:
    key_map = {
        "session_id": "세션 ID",
        "train_size": "학습 비율",
        "fold": "교차검증 Fold",
        "normalize": "정규화 사용",
        "normalize_method": "정규화 방식",
        "fix_imbalance": "불균형 보정",
        "remove_outliers": "이상치 제거",
        "outliers_threshold": "이상치 임계값",
        "imputation_type": "결측치 처리",
        "fh": "예측 구간",
        "index_col": "시계열 인덱스 컬럼",
        "target_col": "타깃 컬럼",
        "log_experiment": "MLflow 기록",
        "log_plots": "플롯 기록",
    }
    summary = []
    for key in (
        "target_col",
        "session_id",
        "train_size",
        "fold",
        "normalize",
        "normalize_method",
        "fix_imbalance",
        "remove_outliers",
        "outliers_threshold",
        "imputation_type",
        "fh",
        "index_col",
        "log_experiment",
        "log_plots",
    ):
        if key not in params:
            continue
        value = params.get(key)
        if value in (None, "", [], {}):
            continue
        summary.append({"label": key_map.get(key, key), "value": _format_value(value)})
    return summary


def _build_metric_rows(metrics: dict, module_type: str | None) -> tuple[list[dict], list[dict]]:
    ordered_keys = []
    for key in METRIC_PRIORITY.get(module_type or "", []):
        if key in metrics:
            ordered_keys.append(key)
    ordered_keys.extend(key for key in metrics.keys() if key not in ordered_keys)
    rows = [{"label": key, "value": _format_value(metrics.get(key))} for key in ordered_keys]
    return rows[:4], rows


def _build_hyperparam_rows(hyperparams: dict) -> list[dict]:
    return [{"label": key, "value": _format_value(value)} for key, value in hyperparams.items()]


def _experiment_metadata_path(experiment_id: int) -> Path:
    return Path(settings.experiment_dir) / f"experiment_{experiment_id}" / "context.json"


def _experiment_pickle_path(experiment_id: int) -> Path:
    return Path(settings.experiment_dir) / f"experiment_{experiment_id}" / "pycaret_experiment.pkl"


def _load_context_metadata(experiment_id: int) -> dict:
    path = _experiment_metadata_path(experiment_id)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _summarize_dataset(dataset: Dataset | None, target_col: str | None) -> dict:
    columns = _safe_json_loads(dataset.col_meta, []) if dataset else []
    type_counts: dict[str, int] = {}
    missing_total = 0
    preview = []
    target_meta = None

    for item in columns:
        col_type = item.get("type") or "unknown"
        type_counts[col_type] = type_counts.get(col_type, 0) + 1
        missing_total += int(item.get("missing_count") or 0)
        preview.append(
            {
                "name": item.get("name", "-"),
                "type": col_type,
                "missing": _format_value(item.get("missing_count", 0)),
                "unique": _format_value(item.get("unique_count", "-")),
                "is_target": item.get("name") == target_col,
            }
        )
        if item.get("name") == target_col:
            target_meta = item

    stats = [
        {"label": "수치형", "value": _format_value(type_counts.get("numeric", 0))},
        {"label": "범주형", "value": _format_value(type_counts.get("categorical", 0))},
        {"label": "날짜형", "value": _format_value(type_counts.get("datetime", 0))},
        {"label": "총 결측치", "value": _format_value(missing_total)},
    ]
    return {
        "stats": stats,
        "columns": preview[:8],
        "target_meta": {
            "type": target_meta.get("type") if target_meta else None,
            "missing": _format_value(target_meta.get("missing_count")) if target_meta else "-",
            "unique": _format_value(target_meta.get("unique_count")) if target_meta else "-",
        },
    }


def _build_workflow_steps(params: dict, model: TrainedModel, context_meta: dict) -> list[str]:
    steps = ["데이터 로드", "PyCaret setup"]
    if params.get("normalize"):
        steps.append(f"정규화({params.get('normalize_method') or 'auto'})")
    if params.get("fix_imbalance"):
        steps.append("불균형 보정")
    if params.get("remove_outliers"):
        steps.append("이상치 제거")
    steps.append("compare_models")
    if model.is_tuned or context_meta.get("params", {}).get("tune_job"):
        steps.append("tune_model")
    steps.append("finalize_model")
    if model.mlflow_model_name:
        steps.append("MLflow 등록")
    if model.stage == "Production":
        steps.append("프로덕션 배포")
    return steps


def _build_compare_summary(context_meta: dict) -> list[dict]:
    params = context_meta.get("params", {}) if isinstance(context_meta, dict) else {}
    compare_options = params.get("compare_options", {})
    run_ids = context_meta.get("run_ids", {})
    return [
        {"label": "비교 기준", "value": _format_value(compare_options.get("sort"))},
        {"label": "선정 수", "value": _format_value(compare_options.get("n_select"))},
        {"label": "모델 범위", "value": _format_value(compare_options.get("catalog_scope"))},
        {"label": "모델 계열", "value": _format_value(compare_options.get("family"))},
        {"label": "비교 실행 모델 수", "value": _format_value(len(run_ids))},
    ]


def _build_tune_summary(model: TrainedModel, context_meta: dict) -> list[dict]:
    params = context_meta.get("params", {}) if isinstance(context_meta, dict) else {}
    tune_job = params.get("tune_job", {})
    options = tune_job.get("options", {})
    return [
        {"label": "튜닝 여부", "value": "완료" if model.is_tuned else "미수행"},
        {"label": "튜닝 대상", "value": _format_value(tune_job.get("algorithm"))},
        {"label": "최적화 지표", "value": _format_value(options.get("optimize"))},
        {"label": "탐색 라이브러리", "value": _format_value(options.get("search_library"))},
        {"label": "반복 수", "value": _format_value(options.get("n_iter"))},
    ]


def resolve_report_path(model: TrainedModel) -> Path:
    model_name = model.mlflow_model_name or model.algorithm
    slug = _safe_slug(model_name)
    version_suffix = f"_v{model.mlflow_version}" if model.mlflow_version is not None else ""
    return Path(settings.report_dir) / f"{slug}{version_suffix}_model_{model.id}.pdf"


def _build_artifact_rows(model: TrainedModel, experiment_id: int) -> list[dict]:
    report_path = resolve_report_path(model)
    items = [
        ("최종 모델 파일", model.model_path),
        ("보고서 파일", str(report_path)),
        ("실험 컨텍스트", str(_experiment_metadata_path(experiment_id))),
        ("PyCaret 실험 피클", str(_experiment_pickle_path(experiment_id))),
    ]
    rows = []
    for label, raw_path in items:
        path_text = raw_path or "-"
        exists = Path(raw_path).exists() if raw_path else False
        rows.append(
            {
                "label": label,
                "value": path_text,
                "status": "확인됨" if exists else "없음",
            }
        )
    return rows


def _build_summary_lines(model: TrainedModel, experiment: Experiment | None, dataset: Dataset | None, context_meta: dict) -> list[str]:
    params = context_meta.get("params", {}) if isinstance(context_meta, dict) else {}
    compare_options = params.get("compare_options", {})
    candidate_count = len(context_meta.get("run_ids", {})) if isinstance(context_meta, dict) else 0
    lines = [
        f"{_module_label(experiment.module_type if experiment else None)} 실험 `{experiment.name if experiment else '-'}`에서 `{experiment.target_col if experiment else '-'}` 타깃을 위해 생성된 모델입니다.",
        f"데이터셋은 `{dataset.filename if dataset else '-'}`이며 총 {_format_value(dataset.row_count if dataset else None)}행 / {_format_value(dataset.col_count if dataset else None)}열을 기준으로 학습했습니다.",
        f"비교 기준은 `{_format_value(compare_options.get('sort'))}`이고 실제 비교 실행 모델 수는 `{candidate_count}`개입니다.",
    ]
    if model.is_tuned:
        lines.append("튜닝 이력이 있어 tuned estimator 기준 성능과 하이퍼파라미터 변경 사항을 함께 기록합니다.")
    if model.stage == "Production":
        lines.append("현재 이 모델은 프로덕션 스테이지에 배치되어 있어 운영 지표와 보고서 재생성 대상에 포함됩니다.")
    return lines


def _report_family_label(family: str) -> str:
    return "XAI" if family == "xai" else "진단 그래프"


def _build_report_chart_item(spec: dict, payload: dict) -> dict | None:
    if not isinstance(payload, dict):
        return None
    if payload.get("render_mode") != "image":
        return None
    image_base64 = payload.get("base64_image")
    if not image_base64:
        return None
    return {
        "title": spec["title"],
        "caption": spec.get("caption"),
        "family": spec["family"],
        "family_label": _report_family_label(spec["family"]),
        "image_data_url": f"data:image/png;base64,{image_base64}",
        "native_source": payload.get("native_source") or "-",
        "fallback_used": bool(payload.get("fallback_used")),
        "native_reason": payload.get("native_reason"),
        "fallback_reason": payload.get("fallback_reason"),
    }


def _build_report_charts(model: TrainedModel, experiment: Experiment | None, dataset: Dataset | None) -> list[dict]:
    if not experiment or not dataset or not dataset.stored_path:
        return []

    module_type = experiment.module_type or ""
    chart_specs = REPORT_CHART_SPECS.get(module_type, [])
    if not chart_specs:
        return []

    params = _safe_json_loads(experiment.setup_params, {})
    active_context = EXPERIMENT_CONTEXTS.get(experiment.id)
    if not active_context or active_context.get("pc") is None:
        try:
            ensure_experiment_context(
                experiment_id=experiment.id,
                dataset_path=dataset.stored_path,
                module_type=module_type,
                params=params,
                experiment_name=experiment.mlflow_exp_name or experiment.name,
            )
        except Exception:
            return []

    charts: list[dict] = []
    for spec in chart_specs:
        try:
            payload = get_report_safe_plot(
                experiment.id,
                model.algorithm,
                spec["key"],
                family=spec["family"],
            )
            chart_item = _build_report_chart_item(spec, payload)
            if chart_item:
                charts.append(chart_item)
        except Exception:
            continue
    return charts


def build_report_context(
    model: TrainedModel,
    experiment: Experiment | None = None,
    dataset: Dataset | None = None,
) -> dict:
    metrics = _safe_json_loads(model.metrics, {})
    hyperparams = _safe_json_loads(model.hyperparams, {})
    context_meta = _load_context_metadata(model.experiment_id)
    params = _safe_json_loads(experiment.setup_params, {}) if experiment else {}
    dataset_summary = _summarize_dataset(dataset, experiment.target_col if experiment else None)
    metric_highlights, metric_rows = _build_metric_rows(metrics, experiment.module_type if experiment else None)
    hyperparam_rows = _build_hyperparam_rows(hyperparams)
    workflow_steps = _build_workflow_steps(params, model, context_meta)
    compare_summary = _build_compare_summary(context_meta)
    tune_summary = _build_tune_summary(model, context_meta)
    artifact_rows = _build_artifact_rows(model, model.experiment_id)
    summary_lines = _build_summary_lines(model, experiment, dataset, context_meta)
    report_charts = _build_report_charts(model, experiment, dataset)

    overview_cards = [
        {"label": "모듈", "value": _module_label(experiment.module_type if experiment else None)},
        {"label": "스테이지", "value": _stage_label(model.stage)},
        {"label": "버전", "value": _format_value(model.mlflow_version)},
        {"label": "튜닝", "value": "완료" if model.is_tuned else "미수행"},
        {"label": "오늘 예측", "value": _format_value(model.pred_count_today)},
        {"label": "누적 예측", "value": _format_value(model.pred_count_total)},
        {"label": "드리프트", "value": _format_value(model.drift_score)},
        {"label": "Run ID", "value": _format_value(model.mlflow_run_id)},
    ]

    return {
        "title": "MFG AI Studio 모델 보고서",
        "model_name": model.mlflow_model_name or model.algorithm,
        "algorithm": model.algorithm,
        "experiment_name": experiment.name if experiment else None,
        "module_type": _module_label(experiment.module_type if experiment else None),
        "target_col": experiment.target_col if experiment else None,
        "dataset_name": dataset.filename if dataset else None,
        "dataset_rows": _format_value(dataset.row_count if dataset else None),
        "dataset_cols": _format_value(dataset.col_count if dataset else None),
        "run_id": model.mlflow_run_id,
        "version": _format_value(model.mlflow_version),
        "stage": _stage_label(model.stage),
        "created_at": _format_timestamp(model.created_at),
        "generated_at": _format_timestamp(model.updated_at),
        "overview_cards": overview_cards,
        "summary_lines": summary_lines,
        "metric_highlights": metric_highlights,
        "metrics": metric_rows,
        "hyperparams": hyperparam_rows,
        "setup_summary": _summarize_setup_params(params),
        "workflow_steps": workflow_steps,
        "dataset_stats": dataset_summary["stats"],
        "dataset_columns": dataset_summary["columns"],
        "target_meta": dataset_summary["target_meta"],
        "compare_summary": compare_summary,
        "tune_summary": tune_summary,
        "artifact_rows": artifact_rows,
        "report_charts": report_charts,
        "model_path": model.model_path,
        "report_path": str(resolve_report_path(model)),
    }


def render_report_pdf(context: dict) -> bytes:
    template = TEMPLATE_ENV.get_template("report.html")
    html = template.render(**context)
    from weasyprint import HTML

    return HTML(string=html, base_url=str(Path(settings.report_dir).resolve())).write_pdf()


def generate_model_report(db: Session, model: TrainedModel, force: bool = False) -> dict:
    experiment = db.query(Experiment).filter(Experiment.id == model.experiment_id).first()
    dataset = db.query(Dataset).filter(Dataset.id == experiment.dataset_id).first() if experiment else None
    report_path = resolve_report_path(model)
    was_generated = False

    if force or not report_path.exists():
        context = build_report_context(model, experiment, dataset)
        report_bytes = render_report_pdf(context)
        report_path.write_bytes(report_bytes)
        was_generated = True

    return {
        "model_id": model.id,
        "report_path": str(report_path),
        "report_filename": report_path.name,
        "report_exists": report_path.exists(),
        "report_generated": was_generated,
        "report_download_url": f"/api/report/{model.id}",
    }
