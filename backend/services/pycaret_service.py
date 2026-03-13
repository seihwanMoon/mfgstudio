import base64
import importlib.util
from io import BytesIO
import json
import math
from pathlib import Path
import re
import time

import matplotlib
from matplotlib import font_manager
from matplotlib import pyplot as plt
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import shap
from sklearn.decomposition import PCA
from sklearn.inspection import permutation_importance
from sklearn.manifold import TSNE
from sklearn.metrics import accuracy_score
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

from config import settings
from services.mlflow_service import (
    ensure_experiment,
    log_sklearn_model_run,
    terminate_recent_running_runs,
    terminate_running_runs_by_name,
)

matplotlib.use("Agg")


def _apply_korean_font_preferences() -> None:
    preferred_fonts = ["NanumGothic", "Malgun Gothic", "AppleGothic", "DejaVu Sans", "Liberation Sans"]
    available = {font.name for font in font_manager.fontManager.ttflist}
    resolved = [name for name in preferred_fonts if name in available] or ["DejaVu Sans"]
    matplotlib.rcParams["font.family"] = "sans-serif"
    matplotlib.rcParams["font.sans-serif"] = resolved
    matplotlib.rcParams["axes.unicode_minus"] = False
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = resolved
    plt.rcParams["axes.unicode_minus"] = False


_apply_korean_font_preferences()


MODULE_LIBRARY = {
    "classification": [
        "Logistic Regression",
        "Random Forest Classifier",
        "Decision Tree Classifier",
        "Naive Bayes",
        "Light Gradient Boosting Machine",
        "Extra Trees Classifier",
    ],
    "regression": [
        "Linear Regression",
        "Random Forest Regressor",
        "Decision Tree Regressor",
        "Ridge Regression",
        "Lasso Regression",
        "Light Gradient Boosting Machine",
    ],
    "clustering": ["K-Means Clustering", "Bisecting K-Means Clustering", "Agglomerative Clustering"],
    "anomaly": ["Isolation Forest", "Cluster-Based Local Outlier", "Local Outlier Factor"],
    "timeseries": ["ARIMA", "ETS", "Auto ARIMA", "Prophet"],
}

METRIC_LABELS = {
    "Prec.": "Precision",
    "Rec.": "Recall",
}

EXPERIMENT_CONTEXTS: dict[int, dict] = {}
MODEL_CATALOG_CACHE: dict[str, list[dict]] = {}
MODEL_CONTEXT_KEYS = {
    "trained": "trained_models",
    "tuned": "tuned_models",
    "final": "final_models",
}


def _sanitize_column_name(name: str) -> str:
    return " ".join(str(name).replace("\t", " ").replace("\n", " ").split()) or "column"


def _slugify_algorithm(name: str) -> str:
    normalized = _sanitize_column_name(name).lower()
    slug = re.sub(r"[^\w]+", "_", normalized, flags=re.UNICODE).strip("_")
    return slug or "model"


def _humanize_estimator_name(name: str) -> str:
    spaced = re.sub(r"(?<!^)(?=[A-Z])", " ", str(name)).replace("_", " ")
    return _sanitize_column_name(spaced)


def _experiment_dir(experiment_id: int) -> Path:
    path = Path(settings.experiment_dir) / f"experiment_{experiment_id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _experiment_pickle_path(experiment_id: int) -> Path:
    return _experiment_dir(experiment_id) / "pycaret_experiment.pkl"


def _context_metadata_path(experiment_id: int) -> Path:
    return _experiment_dir(experiment_id) / "context.json"


def _cached_model_path(experiment_id: int, bucket: str, algorithm: str) -> Path:
    bucket_dir = _experiment_dir(experiment_id) / bucket
    bucket_dir.mkdir(parents=True, exist_ok=True)
    return bucket_dir / _slugify_algorithm(algorithm)


def build_final_model_base_path(experiment_id: int, algorithm: str) -> Path:
    base_name = f"experiment_{experiment_id}_{_slugify_algorithm(algorithm)}"
    return Path(settings.model_dir) / base_name


def _normalize_dataframe_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, str]]:
    mapping = {}
    used = set()

    for original in df.columns.tolist():
        base = _sanitize_column_name(original)
        candidate = base
        suffix = 1
        while candidate in used:
            suffix += 1
            candidate = f"{base}_{suffix}"
        used.add(candidate)
        mapping[str(original)] = candidate

    normalized_df = df.rename(columns=mapping)
    return normalized_df, mapping


def _load_context_metadata(experiment_id: int) -> dict:
    metadata_path = _context_metadata_path(experiment_id)
    if not metadata_path.exists():
        return {}
    return json.loads(metadata_path.read_text(encoding="utf-8"))


def _persist_context_metadata(context: dict) -> None:
    experiment_id = context["experiment_id"]
    payload = {
        "dataset_path": context.get("dataset_path"),
        "module_type": context.get("module_type"),
        "params": context.get("params"),
        "experiment_name": context.get("experiment_name"),
        "mlflow_experiment_id": context.get("mlflow_experiment_id"),
        "run_ids": context.get("run_ids", {}),
        "persisted_models": context.get("persisted_models", {}),
    }
    _context_metadata_path(experiment_id).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _save_experiment_snapshot(context: dict) -> None:
    pc = context.get("pc")
    if pc is None:
        return
    pc.save_experiment(_experiment_pickle_path(context["experiment_id"]))


def _cache_model_artifact(context: dict, bucket: str, algorithm: str, model) -> str:
    pc = context["pc"]
    base_path = _cached_model_path(context["experiment_id"], bucket, algorithm)
    pc.save_model(model, str(base_path))
    model_path = str(base_path) + ".pkl"
    context.setdefault("persisted_models", {}).setdefault(bucket, {})[algorithm] = model_path
    return model_path


def _restore_persisted_models(context: dict) -> None:
    pc = context["pc"]
    persisted = context.get("persisted_models", {})
    for bucket, context_key in MODEL_CONTEXT_KEYS.items():
        model_map = context.setdefault(context_key, {})
        for algorithm, model_path in persisted.get(bucket, {}).items():
            path = Path(model_path)
            if not path.exists():
                continue
            model_map[algorithm] = pc.load_model(str(path.with_suffix("")))


def _get_pycaret_module(module_type: str):
    if module_type == "classification":
        import pycaret.classification as pc
    elif module_type == "regression":
        import pycaret.regression as pc
    elif module_type == "clustering":
        import pycaret.clustering as pc
    elif module_type == "anomaly":
        import pycaret.anomaly as pc
    elif module_type == "timeseries":
        import pycaret.time_series as pc
    else:
        raise ValueError(f"Unsupported module type: {module_type}")
    return pc


def _build_model_catalog_bootstrap(module_type: str):
    if module_type == "classification":
        from pycaret.classification import ClassificationExperiment

        df = pd.DataFrame({"feature": [1, 2, 3, 4], "target": ["a", "b", "a", "b"]})
        experiment = ClassificationExperiment()
        experiment.setup(data=df, target="target", session_id=1, verbose=False, html=False, log_experiment=False)
        return experiment
    if module_type == "regression":
        from pycaret.regression import RegressionExperiment

        df = pd.DataFrame({"feature": [1, 2, 3, 4], "target": [1.0, 2.0, 3.0, 4.0]})
        experiment = RegressionExperiment()
        experiment.setup(data=df, target="target", session_id=1, verbose=False, html=False, log_experiment=False)
        return experiment
    if module_type == "clustering":
        from pycaret.clustering import ClusteringExperiment

        df = pd.DataFrame({"feature_a": [1, 2, 3, 4], "feature_b": [1, 1, 2, 2]})
        experiment = ClusteringExperiment()
        experiment.setup(data=df, session_id=1, verbose=False, html=False, log_experiment=False)
        return experiment
    if module_type == "anomaly":
        from pycaret.anomaly import AnomalyExperiment

        df = pd.DataFrame({"feature_a": [1, 2, 3, 4], "feature_b": [1, 1, 2, 2]})
        experiment = AnomalyExperiment()
        experiment.setup(data=df, session_id=1, verbose=False, html=False, log_experiment=False)
        return experiment
    if module_type == "timeseries":
        from pycaret.time_series import TSForecastingExperiment

        series = pd.Series([1, 2, 3, 4, 5, 6, 7, 8])
        experiment = TSForecastingExperiment()
        experiment.setup(data=series, fh=1, fold=2, session_id=1, verbose=False, html=False)
        return experiment
    raise ValueError(f"Unsupported module type: {module_type}")


def _infer_model_family(module_type: str, estimator_id: str, name: str, reference: str) -> tuple[str, list[str]]:
    haystack = " ".join([module_type, estimator_id, name, reference]).lower()
    tags = {module_type}

    if "turbo" in haystack:
        tags.add("turbo")
    if any(token in haystack for token in ["linear", "lasso", "ridge", "elastic", "lar", "omp", "bayesian ridge", "least angle"]):
        family = "linear"
        tags.update({"interpretable", "linear"})
    elif any(token in haystack for token in ["lightgbm", "xgboost", "catboost", "gradient boosting", "gradientboosting", "adaboost", "gbm", "boost"]):
        family = "boosting"
        tags.update({"ensemble", "boosting", "tree_based"})
    elif any(token in haystack for token in ["random forest", "extra trees", "forest", "bagging", "voting", "stacking", "ensemble"]):
        family = "ensemble"
        tags.update({"ensemble", "tree_based"})
    elif any(token in haystack for token in ["tree", "decision tree", "dt"]):
        family = "tree"
        tags.add("tree_based")
    elif any(token in haystack for token in ["knn", "neighbors", "neighbor"]):
        family = "neighbors"
        tags.add("distance_based")
    elif any(token in haystack for token in ["svm", "support vector"]):
        family = "svm"
        tags.add("margin_based")
    elif any(token in haystack for token in ["naive bayes", "bayes", "qda", "lda"]):
        family = "probabilistic"
        tags.add("interpretable")
    elif any(token in haystack for token in ["k-means", "cluster", "hclust", "meanshift", "spectral", "affinity"]):
        family = "clustering"
        tags.add("distance_based")
    elif any(token in haystack for token in ["outlier", "iforest", "anomaly", "lof", "svm"]):
        family = "anomaly"
        tags.add("outlier_detection")
    elif any(token in haystack for token in ["arima", "ets", "prophet", "naive", "trend", "croston", "theta"]):
        family = "forecasting"
        tags.add("time_series")
    else:
        family = "other"

    if module_type in {"classification", "regression"} and "interpretable" not in tags and family in {"linear", "tree", "probabilistic"}:
        tags.add("interpretable")

    return family, sorted(tags)


def _load_dynamic_model_catalog(module_type: str) -> list[dict]:
    if module_type in MODEL_CATALOG_CACHE:
        return MODEL_CATALOG_CACHE[module_type]

    experiment = _build_model_catalog_bootstrap(module_type)
    models_df = experiment.models()
    catalog = []
    for estimator_id, row in models_df.iterrows():
        name = str(row.get("Name", estimator_id))
        reference = str(row.get("Reference", ""))
        family, tags = _infer_model_family(module_type, str(estimator_id), name, reference)
        turbo = bool(row.get("Turbo", False))
        if turbo:
            tags = sorted({*tags, "turbo"})
        catalog.append(
            {
                "id": str(estimator_id),
                "name": name,
                "reference": reference,
                "turbo": turbo,
                "family": family,
                "tags": tags,
                "module_type": module_type,
            }
        )

    MODEL_CATALOG_CACHE[module_type] = catalog
    return catalog


def _default_sort_key(module_type: str) -> str:
    return {
        "classification": "Accuracy",
        "regression": "R2",
        "clustering": "Silhouette",
        "anomaly": "AUC",
        "timeseries": "MAE",
    }.get(module_type, "Accuracy")


def list_available_models(module_type: str) -> list[dict]:
    try:
        return _load_dynamic_model_catalog(module_type)
    except Exception:
        fallback = []
        for name in MODULE_LIBRARY.get(module_type, MODULE_LIBRARY["classification"]):
            family, tags = _infer_model_family(module_type, _slugify_algorithm(name), name, "")
            fallback.append(
                {
                    "id": _slugify_algorithm(name),
                    "name": name,
                    "reference": "",
                    "turbo": False,
                    "family": family,
                    "tags": tags,
                    "module_type": module_type,
                }
            )
        return fallback


def _build_setup_kwargs(df: pd.DataFrame, module_type: str, params: dict, experiment_name: str) -> dict:
    kwargs = {
        "data": df,
        "session_id": params.get("session_id", 42),
        "verbose": False,
        "html": False,
        "log_experiment": bool(params.get("log_experiment", False)),
        "experiment_name": experiment_name,
    }

    if module_type in {"classification", "regression"}:
        kwargs["target"] = params["target_col"]
        kwargs["train_size"] = params.get("train_size", 0.8)
        kwargs["fold"] = params.get("fold", 10)
    elif module_type == "timeseries":
        kwargs["target"] = params.get("target_col")
        if params.get("index_col"):
            kwargs["index"] = params["index_col"]
        kwargs["fold"] = params.get("fold", 3)
        kwargs["fh"] = params.get("fh", 1)
        if params.get("ignore_features"):
            kwargs["ignore_features"] = params["ignore_features"]
        return kwargs

    if params.get("normalize"):
        kwargs["normalize"] = True
        kwargs["normalize_method"] = params.get("normalize_method", "zscore")
    if params.get("fix_imbalance") and module_type == "classification":
        kwargs["fix_imbalance"] = True
    if params.get("remove_outliers"):
        kwargs["remove_outliers"] = True
        kwargs["outliers_threshold"] = params.get("outliers_threshold", 0.05)
    if params.get("imputation_type"):
        kwargs["imputation_type"] = params["imputation_type"]
    if params.get("ignore_features"):
        kwargs["ignore_features"] = params["ignore_features"]
    if params.get("numeric_features"):
        kwargs["numeric_features"] = params["numeric_features"]
    if params.get("categorical_features"):
        kwargs["categorical_features"] = params["categorical_features"]

    return kwargs


def _requires_safe_target_alias(target_col: str) -> bool:
    try:
        target_col.encode("ascii")
    except UnicodeEncodeError:
        return True
    return not target_col.replace("_", "").isalnum()


def _infer_timeseries_index_column(df: pd.DataFrame, target_col: str | None = None) -> str | None:
    preferred_names = ("date", "datetime", "timestamp", "time", "ds")
    candidates = [column for column in df.columns if column != target_col]
    ordered = sorted(candidates, key=lambda column: (0 if str(column).lower() in preferred_names else 1, str(column)))
    for column in ordered:
        parsed = pd.to_datetime(df[column], errors="coerce")
        if parsed.notna().all() and parsed.nunique(dropna=True) == len(parsed):
            return str(column)
    return None


def _prepare_training_frame(df: pd.DataFrame, params: dict, context: dict) -> tuple[pd.DataFrame, dict]:
    prepared_df = df.copy()
    prepared_params = dict(params)
    prepared_df, column_map = _normalize_dataframe_columns(prepared_df)
    target_col = prepared_params.get("target_col")
    if target_col:
        prepared_params["target_col"] = column_map.get(target_col, _sanitize_column_name(target_col))
    for key in ("ignore_features", "numeric_features", "categorical_features"):
        values = prepared_params.get(key)
        if values:
            prepared_params[key] = [column_map.get(item, _sanitize_column_name(item)) for item in values]

    target_col = prepared_params.get("target_col")
    context["target_alias"] = None
    context["target_original"] = params.get("target_col")
    context["column_map"] = column_map
    context["index_col"] = None

    if target_col and target_col in prepared_df.columns and _requires_safe_target_alias(target_col):
        alias = "__target__"
        suffix = 1
        while alias in prepared_df.columns:
            alias = f"__target__{suffix}"
            suffix += 1
        prepared_df = prepared_df.rename(columns={target_col: alias})
        prepared_params["target_col"] = alias
        context["target_alias"] = alias

    if context.get("module_type") == "timeseries":
        index_col = _infer_timeseries_index_column(prepared_df, prepared_params.get("target_col"))
        if index_col:
            prepared_df[index_col] = pd.to_datetime(prepared_df[index_col], errors="coerce")
            prepared_df = prepared_df.dropna(subset=[index_col]).sort_values(index_col).reset_index(drop=True)
            prepared_params["index_col"] = index_col
            context["index_col"] = index_col

    return prepared_df, prepared_params


def _extract_pipeline_steps(pc) -> list[str]:
    try:
        pipeline = pc.get_config("pipeline")
        return [type(step).__name__ for _, step in pipeline.steps]
    except Exception:
        return ["load_dataset"]


def _get_model_name_maps(pc) -> tuple[dict[str, str], dict[str, str]]:
    models_df = pc.models().copy()
    name_to_id = {}
    id_to_name = {}
    for estimator_id, row in models_df.iterrows():
        name = str(row.get("Name", estimator_id))
        estimator_key = str(estimator_id)
        name_to_id[name] = estimator_key
        id_to_name[estimator_key] = name
    return name_to_id, id_to_name


def ensure_experiment_context(
    experiment_id: int,
    dataset_path: str,
    module_type: str,
    params: dict,
    experiment_name: str,
):
    metadata = _load_context_metadata(experiment_id)
    context = EXPERIMENT_CONTEXTS.setdefault(
        experiment_id,
        {
            "experiment_id": experiment_id,
            "dataset_path": dataset_path,
            "module_type": module_type,
            "params": params,
            "experiment_name": experiment_name,
            "trained_models": {},
            "tuned_models": {},
            "final_models": {},
            "run_ids": {},
            "persisted_models": {"trained": {}, "tuned": {}, "final": {}},
        },
    )
    context["experiment_id"] = experiment_id
    context["dataset_path"] = dataset_path
    context["module_type"] = module_type
    context["params"] = params
    context["experiment_name"] = experiment_name
    context["mlflow_experiment_id"] = metadata.get("mlflow_experiment_id", context.get("mlflow_experiment_id"))
    context["run_ids"] = metadata.get("run_ids", context.get("run_ids", {}))
    context["pc"] = None
    context.pop("name_to_id", None)
    context.pop("id_to_name", None)
    context.pop("input_example", None)
    context["trained_models"] = {}
    context["tuned_models"] = {}
    context["final_models"] = {}
    context["persisted_models"] = {"trained": {}, "tuned": {}, "final": {}}
    persisted_models = metadata.get("persisted_models", {})
    for bucket in MODEL_CONTEXT_KEYS:
        context.setdefault("persisted_models", {}).setdefault(bucket, {})
        context["persisted_models"][bucket].update(persisted_models.get(bucket, {}))
    return context


def _activate_experiment(experiment_id: int):
    context = EXPERIMENT_CONTEXTS.get(experiment_id)
    if not context:
        raise ValueError(f"Experiment context not found: {experiment_id}")
    if context.get("pc") is not None:
        return context

    pc = _get_pycaret_module(context["module_type"])
    df = pd.read_parquet(Path(context["dataset_path"]))
    prepared_df, prepared_params = _prepare_training_frame(df, context["params"], context)
    experiment_pickle = _experiment_pickle_path(experiment_id)
    if experiment_pickle.exists():
        loaded_experiment = pc.load_experiment(experiment_pickle, data=prepared_df)
        pc.set_current_experiment(loaded_experiment)
    else:
        setup_kwargs = _build_setup_kwargs(prepared_df, context["module_type"], prepared_params, context["experiment_name"])
        pc.setup(**setup_kwargs)
    name_to_id, id_to_name = _get_model_name_maps(pc)
    context["pc"] = pc
    context["name_to_id"] = name_to_id
    context["id_to_name"] = id_to_name
    if context["module_type"] in {"classification", "regression"}:
        feature_frame = prepared_df.drop(columns=[prepared_params["target_col"]], errors="ignore")
        context["input_example"] = feature_frame.head(1).copy()
    elif context["module_type"] == "timeseries":
        context["input_example"] = None
    else:
        context["input_example"] = prepared_df.head(1).copy()
    _restore_persisted_models(context)
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return context


def run_setup(
    experiment_id: int,
    dataset_path: str,
    module_type: str,
    params: dict,
    mlflow_experiment_name: str,
) -> dict:
    ensure_experiment_context(
        experiment_id=experiment_id,
        dataset_path=dataset_path,
        module_type=module_type,
        params=params,
        experiment_name=mlflow_experiment_name,
    )
    context = _activate_experiment(experiment_id)
    pc = context["pc"]
    if module_type == "timeseries":
        transformed = pc.get_config("y_train")
        transformed_shape = [len(transformed), 1] if transformed is not None else [0, 0]
    else:
        transformed = pc.get_config("X_train_transformed")
        transformed_shape = list(transformed.shape) if transformed is not None else [0, 0]
    context["mlflow_experiment_id"] = ensure_experiment(mlflow_experiment_name)
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return {
        "pipeline_steps": _extract_pipeline_steps(pc),
        "transformed_shape": transformed_shape,
        "mlflow_experiment_id": context["mlflow_experiment_id"],
        "mlflow_experiment_name": mlflow_experiment_name,
        "module_type": module_type,
    }


def _resolve_model_id(context: dict, algorithm: str) -> str:
    return context.get("name_to_id", {}).get(algorithm, algorithm)


def _get_candidate_model(context: dict, algorithm: str):
    pc = context["pc"]
    model = (
        context["tuned_models"].get(algorithm)
        or context["trained_models"].get(algorithm)
        or context["final_models"].get(algorithm)
    )
    if model is None:
        model = pc.create_model(_resolve_model_id(context, algorithm), verbose=False)
        context["trained_models"][algorithm] = model
    return model


def _require_supervised_module(context: dict) -> None:
    if context["module_type"] not in {"classification", "regression"}:
        raise ValueError("blend/stack/automl is only supported for classification and regression experiments")


def _require_classification_module(context: dict) -> None:
    if context["module_type"] != "classification":
        raise ValueError("This optimization is only supported for classification experiments")


def _require_binary_classification(context: dict) -> None:
    _require_classification_module(context)
    pc = context["pc"]
    y_train = pc.get_config("y_train")
    y_test = pc.get_config("y_test")
    values = []
    for target in (y_train, y_test):
        if target is None:
            continue
        if hasattr(target, "tolist"):
            values.extend(target.tolist())
        else:
            values.extend(list(target))
    unique_count = len(pd.Series(values).dropna().unique()) if values else 0
    if unique_count != 2:
        raise ValueError("optimize_threshold() is only available for binary classification experiments")


def _log_generated_candidate(context: dict, *, algorithm: str, run_prefix: str, model, metrics: dict, extra_params: dict, extra_tags: dict) -> dict:
    run_info = log_sklearn_model_run(
        experiment_name=context["experiment_name"],
        run_name=f"{run_prefix}::{algorithm}",
        model=model,
        metrics=metrics,
        params=_build_mlflow_params(context.get("params"), extra_params),
        tags={
            "module_type": context["module_type"],
            "algorithm": algorithm,
            **extra_tags,
        },
        input_example=context.get("input_example"),
    )
    context["run_ids"][algorithm] = run_info["run_id"]
    context["mlflow_experiment_id"] = run_info["experiment_id"]
    return run_info


def _clean_metrics(row: pd.Series) -> dict:
    metrics = {}
    for key, value in row.items():
        if key in {"Model", "TT (Sec)"}:
            continue
        if isinstance(value, (int, float, np.integer, np.floating)) and not pd.isna(value):
            metrics[METRIC_LABELS.get(key, key)] = round(float(value), 4)
    return metrics


def _to_jsonable(value):
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        numeric = float(value)
        return numeric if math.isfinite(numeric) else None
    if isinstance(value, dict):
        return {key: _to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(item) for item in value]
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    return value


def _build_mlflow_params(base_params: dict | None, extra_params: dict | None = None) -> dict:
    payload = {}
    for source in (base_params or {}, extra_params or {}):
        for key, value in source.items():
            payload[key] = _to_jsonable(value)
    return payload


def compare_models_real(experiment_id: int, options: dict | None = None) -> list[dict]:
    options = options or {}
    context = _activate_experiment(experiment_id)
    pc = context["pc"]

    include = options.get("include") or None
    exclude = options.get("exclude") or None
    include_ids = [_resolve_model_id(context, item) for item in include] if include else None
    exclude_ids = [_resolve_model_id(context, item) for item in exclude] if exclude else None

    compare_kwargs = {
        "sort": options.get("sort") or _default_sort_key(context["module_type"]),
        "n_select": int(options.get("n_select", 3)),
        "verbose": False,
        "errors": "ignore",
        "turbo": False,
    }
    if include_ids:
        compare_kwargs["include"] = include_ids
    if exclude_ids:
        compare_kwargs["exclude"] = exclude_ids
    if options.get("budget_time"):
        compare_kwargs["budget_time"] = options["budget_time"]

    if context["module_type"] == "anomaly":
        candidate_ids = include_ids or [item["id"] for item in list_available_models("anomaly")]
        if exclude_ids:
            candidate_ids = [model_id for model_id in candidate_ids if model_id not in set(exclude_ids)]
        candidate_ids = candidate_ids[: int(options.get("n_select", 3))]

        rows = []
        for rank, model_id in enumerate(candidate_ids, start=1):
            started_at = time.time()
            model = pc.create_model(model_id, verbose=False)
            assigned = pc.assign_model(model)
            anomaly_rate = round(float(pd.to_numeric(assigned.get("Anomaly"), errors="coerce").fillna(0).mean()), 4) if "Anomaly" in assigned.columns else None
            avg_score = round(
                float(pd.to_numeric(assigned.get("Anomaly_Score"), errors="coerce").abs().fillna(0).mean()),
                4,
            ) if "Anomaly_Score" in assigned.columns else None
            algorithm = context.get("id_to_name", {}).get(model_id, _humanize_estimator_name(type(model).__name__))
            metrics = {}
            if anomaly_rate is not None:
                metrics["AnomalyRate"] = anomaly_rate
            if avg_score is not None:
                metrics["AvgScore"] = avg_score

            context["trained_models"][algorithm] = model
            _cache_model_artifact(context, "trained", algorithm, model)
            run_info = log_sklearn_model_run(
                experiment_name=context["experiment_name"],
                run_name=f"compare::{algorithm}",
                model=model,
                metrics=metrics,
                params=_build_mlflow_params(
                    context.get("params"),
                    {
                        "compare_n_select": len(candidate_ids),
                        "compare_strategy": "sequential_create_model",
                    },
                ),
                tags={
                    "module_type": context["module_type"],
                    "algorithm": algorithm,
                    "artifact_source": "compare_models",
                    "selection_rank": rank,
                },
                input_example=context.get("input_example"),
            )
            context["run_ids"][algorithm] = run_info["run_id"]
            context["mlflow_experiment_id"] = run_info["experiment_id"]
            rows.append(
                {
                    "rank": rank,
                    "algorithm": algorithm,
                    "metrics": metrics,
                    "tt_sec": round(time.time() - started_at, 2),
                    "mlflow_run_id": run_info["run_id"],
                    "is_logged": True,
                    "total_done": rank,
                    "total_models": len(candidate_ids),
                }
            )

        _save_experiment_snapshot(context)
        _persist_context_metadata(context)
        return rows

    if context["module_type"] == "clustering":
        candidate_ids = include_ids or [item["id"] for item in list_available_models("clustering")]
        if exclude_ids:
            candidate_ids = [model_id for model_id in candidate_ids if model_id not in set(exclude_ids)]
        candidate_ids = candidate_ids[: int(options.get("n_select", 3))]

        rows = []
        for rank, model_id in enumerate(candidate_ids, start=1):
            started_at = time.time()
            model = pc.create_model(model_id, verbose=False)
            result_frame = pc.pull().copy()
            algorithm = context.get("id_to_name", {}).get(model_id, _humanize_estimator_name(type(model).__name__))
            metrics = _extract_summary_metrics(result_frame)

            context["trained_models"][algorithm] = model
            _cache_model_artifact(context, "trained", algorithm, model)
            run_info = log_sklearn_model_run(
                experiment_name=context["experiment_name"],
                run_name=f"compare::{algorithm}",
                model=model,
                metrics=metrics,
                params=_build_mlflow_params(
                    context.get("params"),
                    {
                        "compare_n_select": len(candidate_ids),
                        "compare_strategy": "sequential_create_model",
                    },
                ),
                tags={
                    "module_type": context["module_type"],
                    "algorithm": algorithm,
                    "artifact_source": "compare_models",
                    "selection_rank": rank,
                },
                input_example=context.get("input_example"),
            )
            context["run_ids"][algorithm] = run_info["run_id"]
            context["mlflow_experiment_id"] = run_info["experiment_id"]
            rows.append(
                {
                    "rank": rank,
                    "algorithm": algorithm,
                    "metrics": metrics,
                    "tt_sec": round(time.time() - started_at, 2),
                    "mlflow_run_id": run_info["run_id"],
                    "is_logged": True,
                    "total_done": rank,
                    "total_models": len(candidate_ids),
                }
            )

        _save_experiment_snapshot(context)
        _persist_context_metadata(context)
        return rows

    compared = pc.compare_models(**compare_kwargs)
    results_df = pc.pull().copy()
    selected_models = compared if isinstance(compared, list) else [compared]
    selected_names = results_df["Model"].head(len(selected_models)).tolist() if "Model" in results_df else []
    selected_run_ids = {}

    for name, model in zip(selected_names, selected_models):
        context["trained_models"][name] = model
        _cache_model_artifact(context, "trained", name, model)
        metric_row = results_df.loc[results_df["Model"] == name].iloc[0] if "Model" in results_df else None
        metrics = _clean_metrics(metric_row) if metric_row is not None else {}
        run_info = log_sklearn_model_run(
            experiment_name=context["experiment_name"],
            run_name=f"compare::{name}",
            model=model,
            metrics=metrics,
            params=_build_mlflow_params(
                context.get("params"),
                {
                    "compare_sort": compare_kwargs.get("sort"),
                    "compare_n_select": compare_kwargs.get("n_select"),
                    "compare_budget_time": compare_kwargs.get("budget_time"),
                },
            ),
            tags={
                "module_type": context["module_type"],
                "algorithm": name,
                "artifact_source": "compare_models",
                "selection_rank": selected_names.index(name) + 1,
            },
            input_example=context.get("input_example"),
        )
        selected_run_ids[name] = run_info["run_id"]
        context["run_ids"][name] = run_info["run_id"]
        context["mlflow_experiment_id"] = run_info["experiment_id"]

    _save_experiment_snapshot(context)
    _persist_context_metadata(context)

    rows = []
    total = len(results_df)
    for rank, (_, row) in enumerate(results_df.iterrows(), start=1):
        algorithm = str(row.get("Model", rank))
        run_id = selected_run_ids.get(algorithm)
        rows.append(
            {
                "rank": rank,
                "algorithm": algorithm,
                "metrics": _clean_metrics(row),
                "tt_sec": round(float(row.get("TT (Sec)", 0) or 0), 2),
                "mlflow_run_id": run_id,
                "is_logged": run_id is not None,
                "total_done": rank,
                "total_models": total,
            }
        )
    return rows


def _extract_summary_metrics(frame: pd.DataFrame) -> dict:
    if frame.empty:
        return {}
    if "Mean" in frame.index:
        row = frame.loc["Mean"]
    elif len(frame.index) > 1 and all(isinstance(item, (int, float, np.integer, np.floating)) for item in frame.index):
        row = frame.mean(numeric_only=True)
    else:
        row = frame.iloc[-1]
    return _clean_metrics(row)


def _diff_params(before: dict, after: dict) -> dict:
    changed = {}
    for key, value in after.items():
        if before.get(key) != value:
            changed[key] = {"before": _to_jsonable(before.get(key)), "after": _to_jsonable(value)}
    return changed


def _extract_trials(tuner) -> list[dict]:
    if tuner is None or not hasattr(tuner, "cv_results_"):
        return []
    cv_results = tuner.cv_results_
    params_list = cv_results.get("params", [])
    scores = cv_results.get("mean_test_score", [])
    ranks = cv_results.get("rank_test_score", [])
    best_rank = min(ranks) if len(ranks) else None
    trials = []
    for index, params in enumerate(params_list, start=1):
        score = float(scores[index - 1]) if len(scores) >= index else 0.0
        rank = int(ranks[index - 1]) if len(ranks) >= index else index
        trials.append(
            {
                "trial_number": index,
                "value": round(score, 4),
                "params": _to_jsonable(params),
                "is_best": _to_jsonable(best_rank is not None and rank == best_rank),
            }
        )
    return trials


def _build_timeseries_custom_grid(model) -> dict:
    params = model.get_params()

    def _unique(values):
        unique_values = []
        for value in values:
            if value not in unique_values:
                unique_values.append(value)
        return unique_values

    def _find_key(suffix: str) -> str | None:
        matches = [key for key in params.keys() if key.endswith(suffix)]
        if not matches:
            return None
        matches.sort(key=len)
        return matches[0]

    candidate_grids: list[dict] = []

    window_key = _find_key("__window_length")
    if window_key:
        value = int(params[window_key])
        candidate_grids.append(
            {
                window_key: _unique(
                    [max(2, value - 2), value, max(3, value + 2)]
                )
            }
        )
    epsilon_key = _find_key("__regressor__epsilon")
    if epsilon_key:
        value = float(params[epsilon_key])
        candidate_grids.append(
            {
                epsilon_key: _unique(
                    [round(max(0.1, value * 0.75), 4), round(value, 4), round(value * 1.25, 4)]
                )
            }
        )
    alpha_key = _find_key("__regressor__alpha")
    if alpha_key:
        value = float(params[alpha_key])
        candidate_grids.append(
            {
                alpha_key: _unique(
                    [round(max(1e-6, value / 10), 6), round(value, 6), round(value * 10, 6)]
                )
            }
        )
    for boolean_suffix in (
        "__robust",
        "__use_box_cox",
        "__use_arma_errors",
        "__use_trend",
        "__use_damped_trend",
    ):
        boolean_key = _find_key(boolean_suffix)
        if boolean_key and (
            isinstance(params[boolean_key], (bool, np.bool_)) or params.get(boolean_key) is None
        ):
            current = params.get(boolean_key)
            candidate_grids.append({boolean_key: _unique([current, True, False])})

    sp_key = _find_key("__sp")
    if sp_key:
        value = params[sp_key]
        if isinstance(value, list):
            candidate_grids.append({sp_key: [value]})
        elif isinstance(value, (int, np.integer)) and int(value) > 1:
            candidate_grids.append({sp_key: [int(value)]})

    for grid in candidate_grids:
        values = next(iter(grid.values()))
        if len(values) >= 1:
            return grid
    raise ValueError("시계열 모델에 사용할 수 있는 기본 튜닝 파라미터를 찾지 못했습니다.")


def _to_series(data) -> pd.Series:
    if data is None:
        return pd.Series(dtype="float64")
    if isinstance(data, pd.Series):
        return data.copy()
    if isinstance(data, pd.DataFrame):
        if data.empty:
            return pd.Series(dtype="float64")
        return data.iloc[:, 0].copy()
    return pd.Series(data)


def _safe_timeseries_lags(series: pd.Series) -> int:
    n_obs = len(series.dropna())
    if n_obs < 4:
        raise ValueError("ACF/PACF plot requires at least 4 observations.")
    return max(1, min(20, (n_obs // 2) - 1))


def _default_timeseries_forecast_horizon(y_train: pd.Series, y_test: pd.Series) -> int:
    inferred = None
    try:
        inferred = pd.infer_freq(y_train.index)
    except Exception:
        inferred = None

    if inferred:
        freq = inferred.upper()
        if freq.startswith(("M", "MS", "ME")):
            return max(len(y_test), 12)
        if freq.startswith(("Q", "QS", "QE")):
            return max(len(y_test), 8)
        if freq.startswith("W"):
            return max(len(y_test), 12)
        if freq.startswith("D"):
            return max(len(y_test), 14)
        if freq.startswith("H"):
            return max(len(y_test), 24)

    return max(len(y_test), min(12, max(6, len(y_train) // 4)))


def _image_payload(image_base64: str, native_source: str, fallback_used: bool = False) -> dict:
    return {
        "render_mode": "image",
        "base64_image": image_base64,
        "image_format": "png",
        "native_source": native_source,
        "fallback_used": fallback_used,
    }


def _plotly_figure_payload(fig, native_source: str, fallback_used: bool = False) -> dict:
    fig.update_layout(
        template="plotly_white",
        paper_bgcolor="white",
        plot_bgcolor="white",
        margin=dict(l=50, r=30, t=70, b=50),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
    )
    return {
        "render_mode": "plotly",
        "plotly_figure_json": fig.to_json(),
        "image_format": "plotly",
        "native_source": native_source,
        "fallback_used": fallback_used,
    }


def _build_timeseries_residual_plot(context: dict, model) -> dict:
    pc = context["pc"]
    y_test = _to_series(pc.get_config("y_test")).dropna()
    forecast_frame = pc.predict_model(model)
    y_pred = _to_series(forecast_frame).dropna()
    if not y_test.empty:
        y_pred = y_pred.reindex(y_test.index)
    residuals = (y_test - y_pred).dropna()

    if residuals.empty:
        residuals = (forecast_frame.dropna() - forecast_frame.dropna()).head(1)

    x_values = _normalize_timeseries_index(residuals.index)
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=x_values,
            y=residuals.values,
            mode="lines+markers",
            name="Residual",
            line=dict(color="#f59e0b", width=3),
            marker=dict(size=8),
        )
    )
    fig.add_hline(y=0, line_dash="dash", line_color="#94a3b8")
    fig.update_layout(
        title="Forecast Residuals",
        xaxis_title="Time",
        yaxis_title="Residual",
    )
    return _plotly_figure_payload(fig, native_source="timeseries_custom_residuals", fallback_used=True)


def _normalize_timeseries_index(index) -> list:
    if hasattr(index, "to_timestamp"):
        try:
            return list(index.to_timestamp())
        except Exception:
            return [str(item) for item in index]
    return [str(item) if "Period" in type(item).__name__ else item for item in index]


def _build_timeseries_plot_png(context: dict, model, plot_type: str, use_train_data: bool = False) -> str:
    pc = context["pc"]
    y_train = _to_series(pc.get_config("y_train")).dropna()
    y_test = _to_series(pc.get_config("y_test")).dropna()

    if plot_type in {"forecast", "residuals"}:
        forecast_frame = pc.predict_model(model)
        y_pred = _to_series(forecast_frame).dropna()
        if not y_test.empty:
            y_pred = y_pred.reindex(y_test.index)

        if plot_type == "forecast":
            plt.figure(figsize=(10, 6))
            if not y_train.empty:
                plt.plot(
                    _normalize_timeseries_index(y_train.index),
                    y_train.values,
                    label="Train",
                    color="#0f172a",
                    linewidth=2,
                )
            if not y_test.empty:
                plt.plot(
                    _normalize_timeseries_index(y_test.index),
                    y_test.values,
                    label="Test",
                    color="#38bdf8",
                    linewidth=2,
                )
            if not y_pred.empty:
                plt.plot(
                    _normalize_timeseries_index(y_pred.index),
                    y_pred.values,
                    label="Forecast",
                    color="#f59e0b",
                    linewidth=2,
                    linestyle="--",
                )
            plt.title("Forecast vs Actual")
            plt.xlabel("Time")
            plt.ylabel(_sanitize_column_name(context["params"].get("target_col", "target")))
            plt.legend()
            return _figure_to_base64()

        residuals = (y_test - y_pred).dropna()
        if residuals.empty:
            raise ValueError("잔차 플롯을 그릴 수 있는 테스트 예측 결과가 없습니다.")
        plt.figure(figsize=(10, 5))
        plt.plot(_normalize_timeseries_index(residuals.index), residuals.values, color="#38bdf8", linewidth=2)
        plt.axhline(0, color="#94a3b8", linestyle="--", linewidth=1)
        plt.title("Forecast Residuals")
        plt.xlabel("Time")
        plt.ylabel("Residual")
        return _figure_to_base64()

    plot_series = y_train if use_train_data or y_test.empty else pd.concat([y_train, y_test]).dropna()
    if plot_series.empty:
        raise ValueError("시계열 플롯에 사용할 데이터가 없습니다.")
    lags = _safe_timeseries_lags(plot_series)

    plt.figure(figsize=(10, 5))
    if plot_type == "acf":
        plot_acf(plot_series, lags=lags, ax=plt.gca())
        plt.title("Auto Correlation (ACF)")
    elif plot_type == "pacf":
        plot_pacf(plot_series, lags=lags, ax=plt.gca(), method="ywm")
        plt.title("Partial Auto Correlation (PACF)")
    else:
        raise ValueError(f"Unsupported timeseries plot type: {plot_type}")
    return _figure_to_base64()


def _build_timeseries_plot(context: dict, model, plot_type: str, use_train_data: bool = False) -> dict:
    pc = context["pc"]
    y_train = _to_series(pc.get_config("y_train")).dropna()
    y_test = _to_series(pc.get_config("y_test")).dropna()
    data_kwargs = {"plot_data_type": "original"}

    if plot_type == "residuals":
        return _build_timeseries_residual_plot(context, model)

    if plot_type == "forecast":
        if use_train_data:
            data_kwargs["fh"] = _default_timeseries_forecast_horizon(y_train, y_test)
        else:
            data_kwargs["fh"] = max(1, len(y_test))

    try:
        fig = pc.plot_model(
            model,
            plot=plot_type,
            return_fig=True,
            verbose=False,
            data_kwargs=data_kwargs,
            fig_kwargs={"big_data_threshold": 10000},
        )
        return _plotly_figure_payload(fig, native_source="plot_model", fallback_used=False)
    except Exception:
        return _image_payload(
            _build_timeseries_plot_png(context, model, plot_type, use_train_data),
            native_source=f"timeseries_{plot_type}_png_fallback",
            fallback_used=True,
        )


def tune_model_real(experiment_id: int, algorithm: str, tune_options: dict | None = None) -> dict:
    tune_options = tune_options or {}
    context = _activate_experiment(experiment_id)
    pc = context["pc"]

    if context["module_type"] == "anomaly":
        raise ValueError("이상탐지 모듈은 PyCaret에서 tune_model()을 지원하지 않습니다.")
    if context["module_type"] == "clustering":
        raise ValueError("클러스터링 모듈은 PyCaret에서 tune_model()을 지원하지 않습니다.")

    model_id = _resolve_model_id(context, algorithm)
    base_model = context["trained_models"].get(algorithm)
    if base_model is None:
        base_model = pc.create_model(model_id, verbose=False)
    before_frame = pc.pull().copy()

    tune_kwargs = {
        "estimator": base_model,
        "optimize": tune_options.get("optimize") or _default_sort_key(context["module_type"]),
        "n_iter": int(tune_options.get("n_iter", 10)),
        "choose_better": bool(tune_options.get("choose_better", True)),
        "return_tuner": True,
        "verbose": False,
        "tuner_verbose": False,
    }
    if context["module_type"] != "timeseries":
        tune_kwargs["search_library"] = tune_options.get("search_library", "scikit-learn")
    else:
        tune_kwargs["custom_grid"] = tune_options.get("custom_grid") or _build_timeseries_custom_grid(base_model)
    if tune_options.get("early_stopping") is not None:
        tune_kwargs["early_stopping"] = bool(tune_options.get("early_stopping"))

    try:
        tuned_model, tuner = pc.tune_model(**tune_kwargs)
    except Exception as exc:
        message = str(exc)
        if tune_kwargs.get("search_library") != "scikit-learn" and "soft dependency" in message and "optuna" in message:
            tune_kwargs["search_library"] = "scikit-learn"
            tuned_model, tuner = pc.tune_model(**tune_kwargs)
        else:
            raise
    after_frame = pc.pull().copy()

    context["trained_models"][algorithm] = tuned_model
    context["tuned_models"][algorithm] = tuned_model
    _cache_model_artifact(context, "trained", algorithm, tuned_model)
    _cache_model_artifact(context, "tuned", algorithm, tuned_model)
    after_metrics = _extract_summary_metrics(after_frame)
    run_info = log_sklearn_model_run(
        experiment_name=context["experiment_name"],
        run_name=f"tune::{algorithm}",
        model=tuned_model,
        metrics=after_metrics,
        params=_build_mlflow_params(
            context.get("params"),
            {
                "tune_optimize": tune_kwargs.get("optimize"),
                "tune_n_iter": tune_kwargs.get("n_iter"),
                "tune_search_library": tune_kwargs.get("search_library"),
                "tune_custom_grid": tune_kwargs.get("custom_grid"),
                "tune_choose_better": tune_kwargs.get("choose_better"),
            },
        ),
        tags={
            "module_type": context["module_type"],
            "algorithm": algorithm,
            "artifact_source": "tune_model",
        },
        input_example=context.get("input_example"),
    )
    context["run_ids"][algorithm] = run_info["run_id"]
    context["mlflow_experiment_id"] = run_info["experiment_id"]
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)

    return {
        "algorithm": algorithm,
        "before_metrics": _extract_summary_metrics(before_frame),
        "after_metrics": after_metrics,
        "changed_params": _diff_params(base_model.get_params(), tuned_model.get_params()),
        "trials": _extract_trials(tuner),
        "run_id": run_info["run_id"],
        "mlflow_experiment_id": run_info["experiment_id"],
    }


def blend_models_real(experiment_id: int, algorithms: list[str], options: dict | None = None) -> dict:
    options = options or {}
    context = _activate_experiment(experiment_id)
    _require_supervised_module(context)
    if len(algorithms) < 2:
        raise ValueError("blend_models requires at least 2 candidate models")

    pc = context["pc"]
    operation_started_ms = int(time.time() * 1000)
    algorithm_label = f"Blend Ensemble ({len(algorithms)})"
    terminate_running_runs_by_name(
        str(context.get("mlflow_experiment_id") or ensure_experiment(context["experiment_name"])),
        {f"blend::{algorithm_label}", "Voting Regressor"},
    )
    estimator_list = [_get_candidate_model(context, algorithm) for algorithm in algorithms]
    blend_model = pc.blend_models(
        estimator_list=estimator_list,
        optimize=options.get("optimize") or _default_sort_key(context["module_type"]),
        choose_better=bool(options.get("choose_better", True)),
        verbose=False,
    )
    after_frame = pc.pull().copy()
    context["trained_models"][algorithm_label] = blend_model
    _cache_model_artifact(context, "trained", algorithm_label, blend_model)
    metrics = _extract_summary_metrics(after_frame)
    run_info = _log_generated_candidate(
        context,
        algorithm=algorithm_label,
        run_prefix="blend",
        model=blend_model,
        metrics=metrics,
        extra_params={
            "blend_members": algorithms,
            "blend_optimize": options.get("optimize") or _default_sort_key(context["module_type"]),
            "blend_choose_better": bool(options.get("choose_better", True)),
        },
        extra_tags={
            "artifact_source": "blend_models",
            "member_algorithms": ", ".join(algorithms),
        },
    )
    terminate_recent_running_runs(str(run_info["experiment_id"]), operation_started_ms)
    terminate_running_runs_by_name(str(run_info["experiment_id"]), {f"blend::{algorithm_label}", "Voting Regressor"})
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return {
        "operation": "blend",
        "algorithm": algorithm_label,
        "members": algorithms,
        "after_metrics": metrics,
        "run_id": run_info["run_id"],
        "mlflow_experiment_id": run_info["experiment_id"],
    }


def stack_models_real(experiment_id: int, algorithms: list[str], options: dict | None = None) -> dict:
    options = options or {}
    context = _activate_experiment(experiment_id)
    _require_supervised_module(context)
    if len(algorithms) < 2:
        raise ValueError("stack_models requires at least 2 candidate models")

    pc = context["pc"]
    operation_started_ms = int(time.time() * 1000)
    algorithm_label = f"Stack Ensemble ({len(algorithms)})"
    terminate_running_runs_by_name(
        str(context.get("mlflow_experiment_id") or ensure_experiment(context["experiment_name"])),
        {f"stack::{algorithm_label}", "Stacking Regressor"},
    )
    estimator_list = [_get_candidate_model(context, algorithm) for algorithm in algorithms]
    stack_model = pc.stack_models(
        estimator_list=estimator_list,
        optimize=options.get("optimize") or _default_sort_key(context["module_type"]),
        choose_better=bool(options.get("choose_better", True)),
        verbose=False,
    )
    after_frame = pc.pull().copy()
    context["trained_models"][algorithm_label] = stack_model
    _cache_model_artifact(context, "trained", algorithm_label, stack_model)
    metrics = _extract_summary_metrics(after_frame)
    run_info = _log_generated_candidate(
        context,
        algorithm=algorithm_label,
        run_prefix="stack",
        model=stack_model,
        metrics=metrics,
        extra_params={
            "stack_members": algorithms,
            "stack_optimize": options.get("optimize") or _default_sort_key(context["module_type"]),
            "stack_choose_better": bool(options.get("choose_better", True)),
        },
        extra_tags={
            "artifact_source": "stack_models",
            "member_algorithms": ", ".join(algorithms),
        },
    )
    terminate_recent_running_runs(str(run_info["experiment_id"]), operation_started_ms)
    terminate_running_runs_by_name(str(run_info["experiment_id"]), {f"stack::{algorithm_label}", "Stacking Regressor"})
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return {
        "operation": "stack",
        "algorithm": algorithm_label,
        "members": algorithms,
        "after_metrics": metrics,
        "run_id": run_info["run_id"],
        "mlflow_experiment_id": run_info["experiment_id"],
    }


def automl_best_real(experiment_id: int, options: dict | None = None) -> dict:
    options = options or {}
    context = _activate_experiment(experiment_id)
    _require_supervised_module(context)

    pc = context["pc"]
    operation_started_ms = int(time.time() * 1000)
    automl_model = pc.automl(
        optimize=options.get("optimize") or _default_sort_key(context["module_type"]),
        use_holdout=bool(options.get("use_holdout", False)),
    )
    after_frame = pc.pull().copy()
    resolved_name = _humanize_estimator_name(type(automl_model).__name__)
    algorithm_label = f"AutoML Best ({resolved_name})"
    context["trained_models"][algorithm_label] = automl_model
    _cache_model_artifact(context, "trained", algorithm_label, automl_model)
    metrics = _extract_summary_metrics(after_frame)
    run_info = _log_generated_candidate(
        context,
        algorithm=algorithm_label,
        run_prefix="automl",
        model=automl_model,
        metrics=metrics,
        extra_params={
            "automl_optimize": options.get("optimize") or _default_sort_key(context["module_type"]),
            "automl_use_holdout": bool(options.get("use_holdout", False)),
            "automl_resolved_model": resolved_name,
        },
        extra_tags={
            "artifact_source": "automl",
            "resolved_model_name": resolved_name,
        },
    )
    terminate_recent_running_runs(str(run_info["experiment_id"]), operation_started_ms)
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return {
        "operation": "automl",
        "algorithm": algorithm_label,
        "members": [],
        "resolved_model_name": resolved_name,
        "after_metrics": metrics,
        "run_id": run_info["run_id"],
        "mlflow_experiment_id": run_info["experiment_id"],
    }


def calibrate_model_real(experiment_id: int, algorithm: str, options: dict | None = None) -> dict:
    options = options or {}
    context = _activate_experiment(experiment_id)
    _require_classification_module(context)

    pc = context["pc"]
    base_model = _get_candidate_model(context, algorithm)
    calibrated_model = pc.calibrate_model(
        base_model,
        method=options.get("method", "sigmoid"),
        calibrate_fold=options.get("calibrate_fold", 5),
        fold=options.get("fold"),
        verbose=False,
    )
    after_frame = pc.pull().copy()
    algorithm_label = f"Calibrated ({algorithm})"
    context["trained_models"][algorithm_label] = calibrated_model
    _cache_model_artifact(context, "trained", algorithm_label, calibrated_model)
    metrics = _extract_summary_metrics(after_frame)
    run_info = _log_generated_candidate(
        context,
        algorithm=algorithm_label,
        run_prefix="calibrate",
        model=calibrated_model,
        metrics=metrics,
        extra_params={
            "calibration_base_algorithm": algorithm,
            "calibration_method": options.get("method", "sigmoid"),
            "calibration_fold": options.get("calibrate_fold", 5),
        },
        extra_tags={
            "artifact_source": "calibrate_model",
            "base_algorithm": algorithm,
        },
    )
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return {
        "operation": "calibrate",
        "algorithm": algorithm_label,
        "members": [algorithm],
        "after_metrics": metrics,
        "run_id": run_info["run_id"],
        "mlflow_experiment_id": run_info["experiment_id"],
        "method": options.get("method", "sigmoid"),
    }


def optimize_threshold_real(experiment_id: int, algorithm: str, options: dict | None = None) -> dict:
    options = options or {}
    context = _activate_experiment(experiment_id)
    _require_binary_classification(context)

    pc = context["pc"]
    base_model = _get_candidate_model(context, algorithm)
    optimized_model = pc.optimize_threshold(
        base_model,
        optimize=options.get("optimize") or _default_sort_key(context["module_type"]),
        verbose=False,
    )
    after_frame = pc.pull().copy()
    algorithm_label = f"Threshold Optimized ({algorithm})"
    context["trained_models"][algorithm_label] = optimized_model
    _cache_model_artifact(context, "trained", algorithm_label, optimized_model)
    metrics = _extract_summary_metrics(after_frame)
    run_info = _log_generated_candidate(
        context,
        algorithm=algorithm_label,
        run_prefix="threshold",
        model=optimized_model,
        metrics=metrics,
        extra_params={
            "threshold_base_algorithm": algorithm,
            "threshold_optimize": options.get("optimize") or _default_sort_key(context["module_type"]),
        },
        extra_tags={
            "artifact_source": "optimize_threshold",
            "base_algorithm": algorithm,
        },
    )
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return {
        "operation": "threshold",
        "algorithm": algorithm_label,
        "members": [algorithm],
        "after_metrics": metrics,
        "run_id": run_info["run_id"],
        "mlflow_experiment_id": run_info["experiment_id"],
        "optimize": options.get("optimize") or _default_sort_key(context["module_type"]),
    }


def _get_active_model(experiment_id: int, algorithm: str):
    context = _activate_experiment(experiment_id)
    pc = context["pc"]
    model = (
        context["tuned_models"].get(algorithm)
        or context["trained_models"].get(algorithm)
        or context["final_models"].get(algorithm)
    )
    if model is None:
        model = pc.create_model(_resolve_model_id(context, algorithm), verbose=False)
        context["trained_models"][algorithm] = model
    return context, model


def _clear_generated_plot_files() -> None:
    for pattern in ("*.png", "*.html"):
        for file_path in Path(".").glob(pattern):
            file_path.unlink(missing_ok=True)


def _read_latest_png() -> str:
    files = sorted(Path(".").glob("*.png"), key=lambda item: item.stat().st_mtime)
    if not files:
        return ""
    latest = files[-1]
    encoded = base64.b64encode(latest.read_bytes()).decode("utf-8")
    latest.unlink(missing_ok=True)
    return encoded


def _figure_to_base64() -> str:
    _apply_korean_font_preferences()
    buffer = BytesIO()
    plt.tight_layout()
    plt.savefig(buffer, format="png", bbox_inches="tight")
    plt.close()
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def _has_umap() -> bool:
    return importlib.util.find_spec("umap") is not None


def _resolve_tsne_perplexity(n_samples: int) -> int:
    if n_samples < 2:
        raise ValueError("t-SNE plot requires at least 2 samples.")
    return max(1, min(30, max(1, (n_samples - 1) // 3), n_samples - 1))


def _build_anomaly_embedding_plot(context: dict, model, plot_type: str) -> str:
    pc = context["pc"]
    features = pc.get_config("X_train_transformed")
    if features is None or len(features) == 0:
        raise ValueError("No anomaly data is available for visualization.")

    if plot_type == "tsne":
        perplexity = _resolve_tsne_perplexity(len(features))
        reducer = TSNE(n_components=2, perplexity=perplexity, init="random", learning_rate="auto", random_state=42)
    elif plot_type == "umap":
        if not _has_umap():
            raise ValueError("UMAP plot is unavailable because umap-learn is not installed in the current runtime.")
        import umap
        reducer = umap.UMAP(n_components=2, random_state=42)
    else:
        raise ValueError(f"Unsupported anomaly plot type: {plot_type}")

    coords = reducer.fit_transform(features)
    assigned = pc.assign_model(model)
    label_series = assigned["Anomaly"].astype(str) if "Anomaly" in assigned.columns else pd.Series(["data"] * len(features))
    plot_frame = pd.DataFrame({"x": coords[:, 0], "y": coords[:, 1], "label": label_series.reset_index(drop=True)})

    plt.figure(figsize=(9, 6))
    color_map = {"0": "#38bdf8", "1": "#ef4444", "False": "#38bdf8", "True": "#ef4444", "data": "#38bdf8"}
    for label, group in plot_frame.groupby("label"):
        plt.scatter(
            group["x"],
            group["y"],
            label=f"Anomaly={label}",
            alpha=0.8,
            s=42,
            color=color_map.get(str(label), "#94a3b8"),
            edgecolors="white",
            linewidths=0.5,
        )
    plt.title(f"Anomaly {plot_type.upper()} Projection")
    plt.xlabel("Component 1")
    plt.ylabel("Component 2")
    plt.legend()
    return _figure_to_base64()


def _build_clustering_plot(context: dict, model, plot_type: str) -> str:
    pc = context["pc"]
    features = pc.get_config("X_train_transformed")
    if features is None or len(features) == 0:
        raise ValueError("No clustering data is available for visualization.")

    assigned = pc.assign_model(model)
    cluster_series = (
        assigned["Cluster"].astype(str).reset_index(drop=True)
        if "Cluster" in assigned.columns
        else pd.Series(["cluster"] * len(features))
    )

    if plot_type == "cluster":
        if features.shape[1] >= 2:
            coords = PCA(n_components=2, random_state=42).fit_transform(features)
        else:
            values = features.iloc[:, 0].to_numpy()
            coords = np.column_stack([values, np.zeros(len(values))])
        title = "Clustering Projection"
    elif plot_type == "tsne":
        perplexity = _resolve_tsne_perplexity(len(features))
        reducer = TSNE(n_components=2, perplexity=perplexity, init="random", learning_rate="auto", random_state=42)
        coords = reducer.fit_transform(features)
        title = "Clustering t-SNE Projection"
    else:
        raise ValueError(f"Unsupported clustering plot type: {plot_type}")

    plot_frame = pd.DataFrame({"x": coords[:, 0], "y": coords[:, 1], "cluster": cluster_series})
    palette = ["#38bdf8", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#14b8a6", "#eab308", "#f97316"]

    plt.figure(figsize=(9, 6))
    for index, (cluster_label, group) in enumerate(plot_frame.groupby("cluster")):
        plt.scatter(
            group["x"],
            group["y"],
            label=f"Cluster {cluster_label}",
            alpha=0.82,
            s=44,
            color=palette[index % len(palette)],
            edgecolors="white",
            linewidths=0.5,
        )
    plt.title(title)
    plt.xlabel("Component 1")
    plt.ylabel("Component 2")
    plt.legend()
    return _figure_to_base64()


def get_plot(experiment_id: int, algorithm: str, plot_type: str, use_train_data: bool = False) -> str | dict:
    context, model = _get_active_model(experiment_id, algorithm)
    pc = context["pc"]

    _apply_korean_font_preferences()
    _clear_generated_plot_files()

    if context["module_type"] == "anomaly" and plot_type in {"tsne", "umap"}:
        return _image_payload(
            _build_anomaly_embedding_plot(context, model, plot_type),
            native_source=f"anomaly_{plot_type}_fallback",
            fallback_used=True,
        )
    if context["module_type"] == "clustering" and plot_type in {"cluster", "tsne"}:
        return _image_payload(
            _build_clustering_plot(context, model, plot_type),
            native_source=f"clustering_{plot_type}_fallback",
            fallback_used=True,
        )
    if context["module_type"] == "timeseries" and plot_type in {"forecast", "residuals", "acf", "pacf"}:
        return _build_timeseries_plot(context, model, plot_type, use_train_data)

    plot_attempts = [
        {"plot": plot_type, "save": True, "verbose": False, "use_train_data": use_train_data},
        {"plot": plot_type, "save": True, "use_train_data": use_train_data},
        {"plot": plot_type, "save": True, "verbose": False},
        {"plot": plot_type, "save": True},
    ]
    last_error = None
    try:
        for kwargs in plot_attempts:
            try:
                pc.plot_model(model, **kwargs)
                last_error = None
                break
            except TypeError as exc:
                last_error = exc
                continue
        if last_error is not None:
            raise last_error
    except Exception:
        if plot_type == "feature" and context["module_type"] in {"classification", "regression"}:
            return get_interpret_plot(experiment_id, algorithm, "pfi", use_train_data)
        raise
    return _image_payload(_read_latest_png(), native_source="plot_model", fallback_used=False)


def _resolve_xai_model_and_features(context: dict, model, use_train_data: bool = False):
    pc = context["pc"]
    supervised = context["module_type"] in {"classification", "regression"}
    raw_key = "X_train" if use_train_data or not supervised else "X_test"
    transformed_key = "X_train_transformed" if use_train_data or not supervised else "X_test_transformed"

    raw_features = pc.get_config(raw_key)
    transformed_features = pc.get_config(transformed_key)
    xai_model = model
    feature_frame = transformed_features if transformed_features is not None and len(transformed_features) else raw_features

    if hasattr(model, "steps") and len(getattr(model, "steps", [])) > 1 and transformed_features is not None and len(transformed_features):
        xai_model = model.steps[-1][1]

    if feature_frame is None:
        return xai_model, pd.DataFrame()
    if not isinstance(feature_frame, pd.DataFrame):
        feature_frame = pd.DataFrame(feature_frame)

    numeric_frame = feature_frame.copy()
    for column in numeric_frame.columns:
        numeric_frame[column] = pd.to_numeric(numeric_frame[column], errors="coerce")
    numeric_frame = numeric_frame.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    return xai_model, numeric_frame


def _resolve_classification_predictor(model):
    if hasattr(model, "predict_proba"):
        return model.predict_proba, True
    return model.predict, False


def _try_native_interpret_plot(context: dict, model, plot_type: str, use_train_data: bool, feature_name: str | None = None) -> dict | None:
    native_plot_map = {
        "summary": "summary",
        "dependence": "correlation",
        "pfi": "pfi",
    }
    native_plot = native_plot_map.get(plot_type)
    if not native_plot or context["module_type"] not in {"classification", "regression"}:
        return None

    pc = context["pc"]
    kwargs = {
        "plot": native_plot,
        "save": True,
        "use_train_data": use_train_data,
    }
    if native_plot == "correlation" and feature_name:
        kwargs["feature"] = feature_name

    _clear_generated_plot_files()
    try:
        pc.interpret_model(model, **kwargs)
        image_base64 = _read_latest_png()
        if image_base64:
            return _image_payload(image_base64, native_source="interpret_model", fallback_used=False)
    except Exception:
        return None
    return None


def get_interpret_plot(
    experiment_id: int,
    algorithm: str,
    plot_type: str,
    use_train_data: bool = False,
    row_index: int | None = None,
) -> dict:
    context, model = _get_active_model(experiment_id, algorithm)
    pc = context["pc"]
    _apply_korean_font_preferences()
    supervised = context["module_type"] in {"classification", "regression"}
    original_features_key = "X_train" if use_train_data or not supervised else "X_test"
    target_key = "y_train" if use_train_data or not supervised else "y_test"
    features = pc.get_config(original_features_key)
    xai_model, xai_features = _resolve_xai_model_and_features(context, model, use_train_data)

    if features is None or len(features) == 0 or len(xai_features) == 0:
        return _image_payload("", native_source="custom_xai_empty", fallback_used=True)

    native_feature_name = None
    if plot_type == "dependence" and features is not None and len(features.columns):
        native_feature_name = str(features.columns[0])

    native_payload = _try_native_interpret_plot(context, model, plot_type, use_train_data, native_feature_name)
    if native_payload is not None:
        return native_payload

    if plot_type == "summary":
        if context["module_type"] == "classification":
            predictor, uses_proba = _resolve_classification_predictor(xai_model)
            explainer = shap.Explainer(predictor, xai_features)
            explanation = explainer(xai_features)
            values = explanation.values
            if uses_proba and values.ndim == 3:
                importance = np.mean(np.abs(values), axis=(0, 2))
            else:
                importance = np.mean(np.abs(values), axis=0)
        elif context["module_type"] == "regression":
            explainer = shap.Explainer(xai_model.predict, xai_features)
            explanation = explainer(xai_features)
            importance = np.mean(np.abs(explanation.values), axis=0)
        else:
            raise ValueError(f"Unsupported XAI summary module: {context['module_type']}")

        ranked = (
            pd.Series(importance, index=xai_features.columns)
            .sort_values(ascending=False)
            .head(12)
            .sort_values(ascending=True)
        )
        plt.figure(figsize=(10, 6))
        plt.barh([_sanitize_column_name(label) for label in ranked.index], ranked.values, color="#38bdf8")
        plt.title("SHAP Summary Importance")
        plt.xlabel("Mean |SHAP value|")
        return _image_payload(_figure_to_base64(), native_source="custom_xai_summary", fallback_used=True)

    if plot_type == "dependence":
        if context["module_type"] == "classification":
            predictor, uses_proba = _resolve_classification_predictor(xai_model)
            explainer = shap.Explainer(predictor, xai_features)
            explanation = explainer(xai_features)
            values = explanation.values
            if uses_proba and values.ndim == 3:
                shap_matrix = np.mean(values, axis=2)
            else:
                shap_matrix = values
        elif context["module_type"] == "regression":
            explainer = shap.Explainer(xai_model.predict, xai_features)
            explanation = explainer(xai_features)
            shap_matrix = explanation.values
        else:
            raise ValueError(f"Unsupported XAI dependence module: {context['module_type']}")

        importance = np.mean(np.abs(shap_matrix), axis=0)
        feature_index = int(np.argmax(importance))
        feature_name = xai_features.columns[feature_index]
        x_values = pd.to_numeric(xai_features.iloc[:, feature_index], errors="coerce")
        y_values = pd.to_numeric(pd.Series(shap_matrix[:, feature_index]), errors="coerce")
        plot_frame = pd.DataFrame({"x": x_values, "y": y_values}).dropna()
        if plot_frame.empty:
            raise ValueError("Dependence plot could not be generated because the selected feature is not numeric")

        plt.figure(figsize=(10, 6))
        plt.scatter(plot_frame["x"], plot_frame["y"], alpha=0.75, color="#38bdf8", edgecolors="white", linewidths=0.5)
        plt.axhline(0, color="#94a3b8", linestyle="--", linewidth=1)
        plt.title(f"SHAP Dependence: {_sanitize_column_name(feature_name)}")
        plt.xlabel(_sanitize_column_name(feature_name))
        plt.ylabel("SHAP value")
        return _image_payload(_figure_to_base64(), native_source="custom_xai_dependence", fallback_used=True)

    if plot_type == "pfi":
        if not supervised:
            raise ValueError("Permutation importance is only supported for classification and regression experiments")
        if context["module_type"] == "classification":
            source_features = pc.get_config(original_features_key)
            target = pc.get_config(target_key)
            if source_features is None or target is None or len(source_features) == 0:
                raise ValueError("Permutation importance를 계산할 분류 데이터가 없습니다.")

            label_col = "prediction_label"
            baseline_predictions = pc.predict_model(model, data=source_features.copy())
            baseline_score = accuracy_score(target, baseline_predictions[label_col])
            importances = []
            for column in source_features.columns:
                deltas = []
                for repeat in range(3):
                    permuted = source_features.copy()
                    permuted[column] = permuted[column].sample(frac=1, random_state=42 + repeat).to_numpy()
                    permuted_predictions = pc.predict_model(model, data=permuted)
                    score = accuracy_score(target, permuted_predictions[label_col])
                    deltas.append(baseline_score - score)
                importances.append(float(np.mean(deltas)))
            ranked = (
                pd.Series(importances, index=source_features.columns)
                .sort_values(ascending=False)
                .head(12)
                .sort_values(ascending=True)
            )
        else:
            target = pc.get_config(target_key)
            scores = permutation_importance(model, features, np.ravel(target), n_repeats=5, random_state=42, n_jobs=1)
            ranked = (
                pd.Series(scores.importances_mean, index=features.columns)
                .sort_values(ascending=False)
                .head(12)
                .sort_values(ascending=True)
            )
        plt.figure(figsize=(10, 6))
        plt.barh([_sanitize_column_name(label) for label in ranked.index], ranked.values, color="#22c55e")
        plt.title("Permutation Feature Importance")
        plt.xlabel("Mean importance")
        return _image_payload(_figure_to_base64(), native_source="custom_xai_pfi", fallback_used=True)

    raise ValueError(f"Unsupported XAI plot type: {plot_type}")


def list_plot_options(module_type: str) -> dict:
    def option(
        key: str,
        label: str,
        family: str,
        source_preference: str,
        native_supported: bool,
        fallback_supported: bool,
        notes: str = "",
    ) -> dict:
        return {
            "key": key,
            "label": label,
            "family": family,
            "source_preference": source_preference,
            "native_supported": native_supported,
            "fallback_supported": fallback_supported,
            "notes": notes,
        }

    model_plots = {
        "classification": [
            option("auc", "ROC AUC", "plot", "native", True, False, "Rendered via plot_model()."),
            option("confusion_matrix", "혼동 행렬", "plot", "native", True, False, "Rendered via plot_model()."),
            option("feature", "변수 중요도", "plot", "native", True, True, "Falls back to custom PFI if native feature plot is unavailable."),
            option("learning", "학습 곡선", "plot", "native", True, False, "Rendered via plot_model()."),
            option("pr", "정밀도-재현율", "plot", "native", True, False, "Rendered via plot_model()."),
            option("calibration", "보정 곡선", "plot", "native", True, False, "Rendered via plot_model()."),
        ],
        "regression": [
            option("residuals", "잔차 플롯", "plot", "native", True, False, "Rendered via plot_model()."),
            option("error", "예측 오차", "plot", "native", True, False, "Rendered via plot_model()."),
            option("cooks", "영향도", "plot", "native", True, False, "Rendered via plot_model()."),
            option("feature", "변수 중요도", "plot", "native", True, True, "Falls back to custom PFI if native feature plot is unavailable."),
            option("learning", "학습 곡선", "plot", "native", True, False, "Rendered via plot_model()."),
        ],
        "clustering": [
            option("cluster", "클러스터 분포", "plot", "fallback", False, True, "Custom fallback projection."),
            option("tsne", "t-SNE", "plot", "fallback", False, True, "Custom fallback embedding."),
            option("elbow", "엘보", "plot", "native", True, False, "Rendered via plot_model()."),
        ],
        "anomaly": [
            option("tsne", "t-SNE", "plot", "fallback", False, True, "Custom fallback embedding."),
            *([option("umap", "UMAP", "plot", "fallback", False, True, "Custom fallback embedding.")] if _has_umap() else []),
        ],
        "timeseries": [
            option("forecast", "예측 추세", "plot", "native", True, True, "Uses native plot_model(return_fig=True) when available."),
            option("residuals", "잔차 플롯", "plot", "fallback", False, True, "Uses residual-only app fallback for clearer interpretation."),
            option("acf", "ACF", "plot", "native", True, True, "Uses native plot_model(return_fig=True) with PNG fallback."),
            option("pacf", "PACF", "plot", "native", True, True, "Uses native plot_model(return_fig=True) with PNG fallback."),
        ],
    }
    xai_plots = {
        "classification": [
            option("summary", "SHAP 요약", "xai", "native", True, True, "interpret_model(plot='summary')를 먼저 시도하고, 실패하면 앱 fallback을 사용합니다."),
            option("dependence", "SHAP 의존도", "xai", "native", True, True, "interpret_model(plot='correlation')를 먼저 시도하고, 실패하면 앱 fallback을 사용합니다."),
            option("pfi", "Permutation 중요도", "xai", "native", True, True, "interpret_model(plot='pfi')를 먼저 시도하고, 실패하면 앱 fallback을 사용합니다."),
        ],
        "regression": [
            option("summary", "SHAP 요약", "xai", "native", True, True, "interpret_model(plot='summary')를 먼저 시도하고, 실패하면 앱 fallback을 사용합니다."),
            option("dependence", "SHAP 의존도", "xai", "native", True, True, "interpret_model(plot='correlation')를 먼저 시도하고, 실패하면 앱 fallback을 사용합니다."),
            option("pfi", "Permutation 중요도", "xai", "native", True, True, "interpret_model(plot='pfi')를 먼저 시도하고, 실패하면 앱 fallback을 사용합니다."),
        ],
    }
    return {
        "module_type": module_type,
        "plots": model_plots.get(module_type, []),
        "xai": xai_plots.get(module_type, []),
    }


def get_shap(experiment_id: int, algorithm: str, row_index: int = 0) -> dict:
    context, model = _get_active_model(experiment_id, algorithm)
    xai_model, features = _resolve_xai_model_and_features(context, model, use_train_data=False)
    if len(features) == 0:
        return {"prediction": None, "score": 0.0, "shap_values": []}

    safe_index = max(0, min(int(row_index), len(features) - 1))
    sample = features.iloc[[safe_index]]

    if context["module_type"] == "classification":
        predictor, uses_proba = _resolve_classification_predictor(xai_model)
        explainer = shap.Explainer(predictor, features)
        explanation = explainer(sample)
        prediction = str(xai_model.predict(sample)[0])
        if uses_proba:
            probabilities = xai_model.predict_proba(sample)[0]
            class_index = int(np.argmax(probabilities))
            shap_values = explanation.values[0, :, class_index] if explanation.values.ndim == 3 else explanation.values[0]
            score = round(float(probabilities[class_index]), 4)
        else:
            shap_values = explanation.values[0]
            score = None
    elif context["module_type"] == "regression":
        explainer = shap.Explainer(xai_model.predict, features)
        explanation = explainer(sample)
        shap_values = explanation.values[0]
        prediction = round(float(xai_model.predict(sample)[0]), 4)
        score = prediction
    else:
        raise ValueError("SHAP 분석은 분류와 회귀 모듈에서만 지원합니다.")

    values = []
    for feature_name, shap_value in zip(features.columns.tolist(), shap_values):
        values.append(
            {
                "feature": _sanitize_column_name(feature_name),
                "shap_value": round(float(shap_value), 4),
                "direction": "positive" if float(shap_value) >= 0 else "negative",
            }
        )
    values.sort(key=lambda item: abs(item["shap_value"]), reverse=True)
    return {
        "row_index": safe_index,
        "prediction": prediction,
        "score": score,
        "shap_values": values[:10],
    }


def finalize_model_real(experiment_id: int, algorithm: str, model_name: str, metrics: dict | None = None) -> dict:
    context, model = _get_active_model(experiment_id, algorithm)
    pc = context["pc"]
    if context["module_type"] in {"classification", "regression", "timeseries"}:
        final_model = pc.finalize_model(model)
        artifact_source = "finalize_model"
    else:
        final_model = model
        artifact_source = "save_model"
    save_path = build_final_model_base_path(experiment_id, algorithm)
    pc.save_model(final_model, str(save_path))
    context["final_models"][algorithm] = final_model
    context.setdefault("persisted_models", {}).setdefault("final", {})[algorithm] = str(save_path) + ".pkl"
    run_info = log_sklearn_model_run(
        experiment_name=context["experiment_name"],
        run_name=f"finalize::{model_name}",
        model=final_model,
        metrics=metrics or {},
        params=context.get("params") or {},
        tags={
            "module_type": context["module_type"],
            "algorithm": algorithm,
            "artifact_source": artifact_source,
            "catalog_model_name": model_name,
        },
        input_example=context.get("input_example"),
    )
    _save_experiment_snapshot(context)
    _persist_context_metadata(context)
    return {
        "model_path": str(save_path) + ".pkl",
        "final_metrics": metrics or {},
        "run_id": run_info["run_id"],
        "mlflow_experiment_id": run_info["experiment_id"],
    }


def predict_payload(model_path: str, module_type: str, input_data: dict, threshold: float = 0.5) -> dict:
    pc = _get_pycaret_module(module_type)
    model = pc.load_model(str(Path(model_path).with_suffix("")))
    frame = pd.DataFrame([input_data])
    if module_type == "classification":
        result = pc.predict_model(model, data=frame, probability_threshold=threshold)
        label_col = "prediction_label" if "prediction_label" in result.columns else "Label"
        score_col = "prediction_score" if "prediction_score" in result.columns else "Score"
        score = result[score_col].iloc[0] if score_col in result.columns else None
        return {
            "label": str(result[label_col].iloc[0]),
            "score": round(float(score), 4) if score is not None else None,
            "threshold": threshold,
        }
    result = pc.predict_model(model, data=frame)
    label_col = "prediction_label" if "prediction_label" in result.columns else "Label"
    label = result[label_col].iloc[0]
    return {
        "label": round(float(label), 4) if isinstance(label, (int, float, np.integer, np.floating)) else str(label),
        "score": None,
    }


def predict_batch_rows(model_path: str, module_type: str, rows: list[dict], threshold: float = 0.5) -> list[dict]:
    pc = _get_pycaret_module(module_type)
    model = pc.load_model(str(Path(model_path).with_suffix("")))
    frame = pd.DataFrame(rows)
    if module_type == "classification":
        result = pc.predict_model(model, data=frame, probability_threshold=threshold)
        label_col = "prediction_label" if "prediction_label" in result.columns else "Label"
        score_col = "prediction_score" if "prediction_score" in result.columns else "Score"
    else:
        result = pc.predict_model(model, data=frame)
        label_col = "prediction_label" if "prediction_label" in result.columns else "Label"
        score_col = None

    payload = []
    for _, row in result.iterrows():
        item = row.to_dict()
        item["label"] = item.get(label_col)
        if score_col and score_col in item:
            item["score"] = round(float(item[score_col]), 4)
        payload.append(item)
    return payload

