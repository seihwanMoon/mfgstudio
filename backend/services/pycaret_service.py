from pathlib import Path
import random
import base64

import pandas as pd


MODULE_LIBRARY = {
    "classification": {
        "algorithms": ["LightGBM", "CatBoost", "XGBoost", "Random Forest", "Extra Trees", "GBM"],
        "sort": "Accuracy",
    },
    "regression": {
        "algorithms": ["LightGBM", "CatBoost", "XGBoost", "Random Forest", "ElasticNet", "Ridge"],
        "sort": "R2",
    },
    "clustering": {
        "algorithms": ["KMeans", "Birch", "Agglomerative", "DBSCAN"],
        "sort": "Score",
    },
    "anomaly": {
        "algorithms": ["IsolationForest", "IForest", "LOF", "OCSVM"],
        "sort": "Score",
    },
    "timeseries": {
        "algorithms": ["ARIMA", "ETS", "Prophet", "AutoARIMA"],
        "sort": "MAE",
    },
}


def run_setup(dataset_path: str, module_type: str, params: dict, mlflow_experiment_name: str) -> dict:
    df = pd.read_parquet(Path(dataset_path))
    target_col = params.get("target_col")
    pipeline_steps = ["load_dataset"]
    if params.get("normalize"):
        pipeline_steps.append(f"normalize:{params.get('normalize_method', 'zscore')}")
    if params.get("fix_imbalance"):
        pipeline_steps.append("fix_imbalance")
    if params.get("remove_outliers"):
        pipeline_steps.append("remove_outliers")
    if params.get("imputation_type"):
        pipeline_steps.append(f"imputation:{params['imputation_type']}")

    transformed_cols = len(df.columns) - (1 if target_col and target_col in df.columns else 0)
    return {
        "pipeline_steps": pipeline_steps or ["raw"],
        "transformed_shape": [len(df), transformed_cols],
        "mlflow_experiment_id": None,
        "mlflow_experiment_name": mlflow_experiment_name,
        "module_type": module_type,
    }


def list_available_models(module_type: str) -> list[str]:
    return MODULE_LIBRARY.get(module_type, MODULE_LIBRARY["classification"])["algorithms"]


def generate_compare_results(experiment_id: int, module_type: str, options: dict | None = None) -> list[dict]:
    options = options or {}
    library = MODULE_LIBRARY.get(module_type, MODULE_LIBRARY["classification"])
    algorithms = [name for name in library["algorithms"] if name not in set(options.get("exclude", []))]
    if options.get("include"):
        allowed = set(options["include"])
        algorithms = [name for name in algorithms if name in allowed]

    rng = random.Random(experiment_id)
    rows = []
    for rank, algorithm in enumerate(algorithms, start=1):
        base = 0.93 - (rank - 1) * 0.011
        jitter = rng.uniform(-0.003, 0.003)
        if module_type == "classification":
            metrics = {
                "Accuracy": round(base + jitter, 4),
                "AUC": round(min(0.99, base + 0.055 + jitter), 4),
                "F1": round(base - 0.03 + jitter, 4),
                "Recall": round(base - 0.04 + jitter, 4),
                "Precision": round(base - 0.018 + jitter, 4),
            }
        elif module_type == "regression":
            metrics = {
                "R2": round(base + jitter, 4),
                "MAE": round(0.25 + rank * 0.04 + abs(jitter), 4),
                "RMSE": round(0.31 + rank * 0.05 + abs(jitter), 4),
                "MAPE": round(0.08 + rank * 0.01 + abs(jitter), 4),
            }
        else:
            metrics = {"Score": round(base + jitter, 4)}

        rows.append(
            {
                "rank": rank,
                "algorithm": algorithm,
                "metrics": metrics,
                "tt_sec": round(1.5 + rank * 0.9 + rng.uniform(0.05, 0.5), 2),
                "mlflow_run_id": f"run_{experiment_id}_{rank:02d}",
            }
        )

    sort_key = options.get("sort") or library["sort"]
    reverse = sort_key not in {"MAE", "RMSE", "MAPE"}
    rows.sort(key=lambda row: row["metrics"].get(sort_key, 0), reverse=reverse)
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
        row["total_models"] = len(rows)
        row["total_done"] = index
    return rows[: options.get("n_select", len(rows))] if options.get("truncate_to_select") else rows


def generate_tune_trials(experiment_id: int, algorithm: str, n_iter: int = 25) -> list[dict]:
    rng = random.Random(f"{experiment_id}:{algorithm}")
    trials = []
    best_value = 0.0
    for index in range(1, n_iter + 1):
        value = round(0.88 + min(0.07, index * 0.0014) + rng.uniform(-0.004, 0.004), 4)
        is_best = value > best_value
        if is_best:
            best_value = value
        trials.append(
            {
                "trial_number": index,
                "value": value,
                "params": {
                    "learning_rate": round(max(0.01, 0.08 - index * 0.001), 3),
                    "num_leaves": 31 + index * 2,
                },
                "is_best": is_best,
            }
        )
    return trials


def summarize_tune_result(algorithm: str, trials: list[dict]) -> dict:
    best = max(trials, key=lambda trial: trial["value"])
    before = round(best["value"] - 0.018, 4)
    after = best["value"]
    return {
        "algorithm": algorithm,
        "before_metrics": {
            "Accuracy": before,
            "AUC": round(before + 0.042, 4),
            "F1": round(before - 0.021, 4),
            "Recall": round(before - 0.03, 4),
        },
        "after_metrics": {
            "Accuracy": after,
            "AUC": round(after + 0.042, 4),
            "F1": round(after - 0.021, 4),
            "Recall": round(after - 0.03, 4),
        },
        "changed_params": {
            "learning_rate": {"before": 0.1, "after": best["params"]["learning_rate"]},
            "num_leaves": {"before": 31, "after": best["params"]["num_leaves"]},
        },
    }


def generate_plot_image(plot_type: str, algorithm: str) -> str:
    accent = {
        "auc": "#A78BFA",
        "confusion_matrix": "#38BDF8",
        "feature": "#34D399",
        "learning": "#FBBF24",
    }.get(plot_type, "#38BDF8")
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
      <rect width="900" height="520" fill="#0D1926"/>
      <rect x="40" y="40" width="820" height="440" rx="18" fill="#111E2E" stroke="#1A3352"/>
      <text x="70" y="95" fill="#E2EEFF" font-size="28" font-family="Arial" font-weight="700">{algorithm}</text>
      <text x="70" y="132" fill="{accent}" font-size="18" font-family="Arial">{plot_type}</text>
      <line x1="120" y1="400" x2="780" y2="400" stroke="#35506E"/>
      <line x1="120" y1="140" x2="120" y2="400" stroke="#35506E"/>
      <polyline points="120,380 210,330 300,300 390,250 480,210 570,180 660,155 750,145" fill="none" stroke="{accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="750" cy="145" r="10" fill="{accent}"/>
      <text x="70" y="455" fill="#8BA8C8" font-size="16" font-family="Arial">Generated preview for analyze API</text>
    </svg>
    """
    return base64.b64encode(svg.encode("utf-8")).decode("utf-8")


def generate_shap_values(algorithm: str, row_index: int = 0) -> dict:
    rng = random.Random(f"{algorithm}:{row_index}")
    features = [
        "temperature",
        "pressure",
        "process_A",
        "machine_M02",
        "humidity",
        "vibration",
    ]
    values = []
    for feature in features:
        raw = round(rng.uniform(-0.35, 0.35), 4)
        values.append(
            {
                "feature": feature,
                "shap_value": raw,
                "direction": "positive" if raw >= 0 else "negative",
            }
        )
    values.sort(key=lambda item: abs(item["shap_value"]), reverse=True)
    score = round(0.6 + rng.uniform(0.05, 0.28), 4)
    return {
        "row_index": row_index,
        "prediction": "positive" if score >= 0.5 else "negative",
        "score": score,
        "shap_values": values,
    }


def finalize_result(model_name: str, metrics: dict | None = None) -> dict:
    metrics = metrics or {}
    base_acc = metrics.get("Accuracy") or metrics.get("R2") or 0.91
    improved = round(min(0.99, float(base_acc) + 0.006), 4)
    return {
        "model_path": f"./data/models/{model_name}.pkl",
        "final_metrics": {
            **metrics,
            "Accuracy": improved if "Accuracy" in metrics or not metrics else metrics.get("Accuracy", improved),
        },
    }


def predict_payload(input_data: dict, threshold: float = 0.5) -> dict:
    numeric_values = [float(value) for value in input_data.values() if isinstance(value, (int, float))]
    signal = sum(numeric_values) / max(len(numeric_values), 1) if numeric_values else 0.4
    normalized = max(0.0, min(1.0, 0.2 + (signal % 100) / 100))
    label = "positive" if normalized >= threshold else "negative"
    return {
        "label": label,
        "score": round(normalized, 4),
        "threshold": threshold,
    }


def predict_batch_rows(rows: list[dict], threshold: float = 0.5) -> list[dict]:
    return [{**row, **predict_payload(row, threshold)} for row in rows]
