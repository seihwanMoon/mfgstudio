import base64
import uuid
from pathlib import Path

import matplotlib
import numpy as np
import pandas as pd
import shap

from config import settings

matplotlib.use("Agg")


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


def _default_sort_key(module_type: str) -> str:
    return {
        "classification": "Accuracy",
        "regression": "R2",
        "clustering": "Silhouette",
        "anomaly": "AUC",
        "timeseries": "MAE",
    }.get(module_type, "Accuracy")


def list_available_models(module_type: str) -> list[str]:
    return MODULE_LIBRARY.get(module_type, MODULE_LIBRARY["classification"])


def _build_setup_kwargs(df: pd.DataFrame, module_type: str, params: dict, experiment_name: str) -> dict:
    kwargs = {
        "data": df,
        "session_id": params.get("session_id", 42),
        "verbose": False,
        "html": False,
        "log_experiment": False,
        "experiment_name": experiment_name,
    }

    if module_type in {"classification", "regression"}:
        kwargs["target"] = params["target_col"]
        kwargs["train_size"] = params.get("train_size", 0.8)
        kwargs["fold"] = params.get("fold", 10)

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


def _prepare_training_frame(df: pd.DataFrame, params: dict, context: dict) -> tuple[pd.DataFrame, dict]:
    prepared_df = df.copy()
    prepared_params = dict(params)
    target_col = prepared_params.get("target_col")
    context["target_alias"] = None

    if target_col and target_col in prepared_df.columns and _requires_safe_target_alias(target_col):
        alias = "__target__"
        suffix = 1
        while alias in prepared_df.columns:
            alias = f"__target__{suffix}"
            suffix += 1
        prepared_df[alias] = prepared_df[target_col]
        prepared_params["target_col"] = alias
        context["target_alias"] = alias

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
    context = EXPERIMENT_CONTEXTS.setdefault(
        experiment_id,
        {
            "dataset_path": dataset_path,
            "module_type": module_type,
            "params": params,
            "experiment_name": experiment_name,
            "trained_models": {},
            "tuned_models": {},
            "final_models": {},
            "run_ids": {},
        },
    )
    context["dataset_path"] = dataset_path
    context["module_type"] = module_type
    context["params"] = params
    context["experiment_name"] = experiment_name
    return context


def _activate_experiment(experiment_id: int):
    context = EXPERIMENT_CONTEXTS.get(experiment_id)
    if not context:
        raise ValueError(f"Experiment context not found: {experiment_id}")

    pc = _get_pycaret_module(context["module_type"])
    df = pd.read_parquet(Path(context["dataset_path"]))
    prepared_df, prepared_params = _prepare_training_frame(df, context["params"], context)
    setup_kwargs = _build_setup_kwargs(prepared_df, context["module_type"], prepared_params, context["experiment_name"])
    pc.setup(**setup_kwargs)
    name_to_id, id_to_name = _get_model_name_maps(pc)
    context["pc"] = pc
    context["name_to_id"] = name_to_id
    context["id_to_name"] = id_to_name
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
    transformed = pc.get_config("X_train_transformed")
    return {
        "pipeline_steps": _extract_pipeline_steps(pc),
        "transformed_shape": list(transformed.shape),
        "mlflow_experiment_id": None,
        "mlflow_experiment_name": mlflow_experiment_name,
        "module_type": module_type,
    }


def _resolve_model_id(context: dict, algorithm: str) -> str:
    return context.get("name_to_id", {}).get(algorithm, algorithm)


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
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, dict):
        return {key: _to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(item) for item in value]
    return value


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

    compared = pc.compare_models(**compare_kwargs)
    results_df = pc.pull().copy()
    selected_models = compared if isinstance(compared, list) else [compared]
    selected_names = results_df["Model"].head(len(selected_models)).tolist() if "Model" in results_df else []

    for name, model in zip(selected_names, selected_models):
        context["trained_models"][name] = model

    rows = []
    total = len(results_df)
    for rank, (_, row) in enumerate(results_df.iterrows(), start=1):
        algorithm = str(row.get("Model", rank))
        run_id = f"run_{experiment_id}_{rank}_{uuid.uuid4().hex[:8]}"
        context["run_ids"][algorithm] = run_id
        rows.append(
            {
                "rank": rank,
                "algorithm": algorithm,
                "metrics": _clean_metrics(row),
                "tt_sec": round(float(row.get("TT (Sec)", 0) or 0), 2),
                "mlflow_run_id": run_id,
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


def tune_model_real(experiment_id: int, algorithm: str, tune_options: dict | None = None) -> dict:
    tune_options = tune_options or {}
    context = _activate_experiment(experiment_id)
    pc = context["pc"]

    model_id = _resolve_model_id(context, algorithm)
    base_model = context["trained_models"].get(algorithm)
    if base_model is None:
        base_model = pc.create_model(model_id, verbose=False)
    before_frame = pc.pull().copy()

    tune_kwargs = {
        "estimator": base_model,
        "optimize": tune_options.get("optimize") or _default_sort_key(context["module_type"]),
        "n_iter": int(tune_options.get("n_iter", 10)),
        "search_library": tune_options.get("search_library", "scikit-learn"),
        "choose_better": bool(tune_options.get("choose_better", True)),
        "return_tuner": True,
        "verbose": False,
        "tuner_verbose": False,
    }
    if tune_options.get("early_stopping") is not None:
        tune_kwargs["early_stopping"] = bool(tune_options.get("early_stopping"))

    tuned_model, tuner = pc.tune_model(**tune_kwargs)
    after_frame = pc.pull().copy()

    context["trained_models"][algorithm] = tuned_model
    context["tuned_models"][algorithm] = tuned_model

    return {
        "algorithm": algorithm,
        "before_metrics": _extract_summary_metrics(before_frame),
        "after_metrics": _extract_summary_metrics(after_frame),
        "changed_params": _diff_params(base_model.get_params(), tuned_model.get_params()),
        "trials": _extract_trials(tuner),
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


def get_plot(experiment_id: int, algorithm: str, plot_type: str, use_train_data: bool = False) -> str:
    context, model = _get_active_model(experiment_id, algorithm)
    pc = context["pc"]

    for png_file in Path(".").glob("*.png"):
        png_file.unlink(missing_ok=True)

    pc.plot_model(model, plot=plot_type, save=True, verbose=False)
    files = sorted(Path(".").glob("*.png"), key=lambda item: item.stat().st_mtime)
    if not files:
        return ""
    latest = files[-1]
    encoded = base64.b64encode(latest.read_bytes()).decode("utf-8")
    latest.unlink(missing_ok=True)
    return encoded


def get_shap(experiment_id: int, algorithm: str, row_index: int = 0) -> dict:
    context, model = _get_active_model(experiment_id, algorithm)
    pc = context["pc"]

    dataset_name = "X_test_transformed" if context["module_type"] in {"classification", "regression"} else "X_train_transformed"
    features = pc.get_config(dataset_name)
    if len(features) == 0:
        return {"prediction": None, "score": 0.0, "shap_values": []}

    safe_index = max(0, min(int(row_index), len(features) - 1))
    sample = features.iloc[[safe_index]]

    if context["module_type"] == "classification":
        explainer = shap.Explainer(model.predict_proba, features)
        explanation = explainer(sample)
        probabilities = model.predict_proba(sample)[0]
        class_index = int(np.argmax(probabilities))
        shap_values = explanation.values[0, :, class_index]
        prediction = str(model.predict(sample)[0])
        score = round(float(probabilities[class_index]), 4)
    elif context["module_type"] == "regression":
        explainer = shap.Explainer(model.predict, features)
        explanation = explainer(sample)
        shap_values = explanation.values[0]
        prediction = round(float(model.predict(sample)[0]), 4)
        score = prediction
    else:
        raise ValueError(f"SHAP is not implemented for module type: {context['module_type']}")

    values = []
    for feature_name, shap_value in zip(features.columns.tolist(), shap_values):
        values.append(
            {
                "feature": feature_name,
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
    final_model = pc.finalize_model(model)
    save_path = Path(settings.model_dir) / model_name
    pc.save_model(final_model, str(save_path))
    context["final_models"][algorithm] = final_model
    return {
        "model_path": str(save_path) + ".pkl",
        "final_metrics": metrics or {},
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
