import base64
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any


def _normalize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _normalize_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_normalize_value(item) for item in value]
    return value


def build_cache_signature(**parts: Any) -> str:
    normalized = {str(key): _normalize_value(value) for key, value in parts.items()}
    return json.dumps(normalized, ensure_ascii=False, sort_keys=True)


def remove_cached_artifact(image_path: Path, metadata_path: Path) -> None:
    for path in (image_path, metadata_path):
        try:
            if path.exists():
                path.unlink()
        except Exception:
            continue


def load_cached_artifact(
    image_path: Path,
    metadata_path: Path,
    expected_signature: str | None = None,
    *,
    purge_invalid: bool = False,
) -> tuple[str, dict] | tuple[None, None]:
    if not image_path.exists() or not metadata_path.exists():
        return None, None
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if expected_signature and metadata.get("signature") != expected_signature:
            if purge_invalid:
                remove_cached_artifact(image_path, metadata_path)
            return None, None
        image_base64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")
        return image_base64, metadata
    except Exception:
        if purge_invalid:
            remove_cached_artifact(image_path, metadata_path)
        return None, None


def store_cached_artifact(image_path: Path, metadata_path: Path, image_base64: str, metadata: dict[str, Any]) -> None:
    image_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        image_path.write_bytes(base64.b64decode(image_base64))
        metadata_path.write_text(
            json.dumps(_normalize_value(metadata), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception:
        return


def cleanup_cache_directory(
    cache_dir: Path,
    *,
    valid_stems: set[str] | None = None,
    max_age_seconds: float | None = None,
) -> dict[str, int]:
    stats = {"removed_files": 0, "removed_pairs": 0}
    if not cache_dir.exists():
        return stats

    now = time.time()
    grouped: dict[str, list[Path]] = {}
    for path in cache_dir.iterdir():
        if not path.is_file():
            continue
        grouped.setdefault(path.stem, []).append(path)

    for stem, files in grouped.items():
        if valid_stems is not None and stem not in valid_stems:
            for path in files:
                try:
                    path.unlink()
                    stats["removed_files"] += 1
                except Exception:
                    continue
            stats["removed_pairs"] += 1
            continue

        if max_age_seconds is None:
            continue

        newest_mtime = max((path.stat().st_mtime for path in files), default=now)
        if now - newest_mtime <= max_age_seconds:
            continue

        for path in files:
            try:
                path.unlink()
                stats["removed_files"] += 1
            except Exception:
                continue
        stats["removed_pairs"] += 1

    return stats


def cleanup_cache_tree(cache_root: Path, *, max_age_seconds: float | None = None) -> dict[str, int]:
    stats = {"removed_files": 0, "removed_pairs": 0, "removed_dirs": 0}
    if not cache_root.exists():
        return stats

    directories = [path for path in cache_root.rglob("*") if path.is_dir()]
    directories.sort(key=lambda item: len(item.parts), reverse=True)
    directories.append(cache_root)

    for directory in directories:
        directory_stats = cleanup_cache_directory(directory, max_age_seconds=max_age_seconds)
        for key in ("removed_files", "removed_pairs"):
            stats[key] += directory_stats.get(key, 0)
        if directory == cache_root:
            continue
        try:
            if directory.exists() and not any(directory.iterdir()):
                directory.rmdir()
                stats["removed_dirs"] += 1
        except Exception:
            continue

    return stats


def retention_seconds(days: int | None) -> float | None:
    if days is None:
        return None
    try:
        value = int(days)
    except Exception:
        return None
    if value <= 0:
        return None
    return float(value) * 24 * 60 * 60


def summarize_cache_directory(cache_dir: Path, *, recursive: bool = False) -> dict[str, Any]:
    stats: dict[str, Any] = {
        "path": str(cache_dir),
        "exists": cache_dir.exists(),
        "directory_count": 0,
        "file_count": 0,
        "pair_count": 0,
        "size_bytes": 0,
        "png_count": 0,
        "json_count": 0,
        "latest_updated_at": None,
    }
    if not cache_dir.exists():
        return stats

    files: list[Path] = []
    directories = 0
    if recursive:
        for path in cache_dir.rglob("*"):
            if path.is_dir():
                directories += 1
            elif path.is_file():
                files.append(path)
    else:
        for path in cache_dir.iterdir():
            if path.is_dir():
                directories += 1
            elif path.is_file():
                files.append(path)

    pair_keys: set[tuple[str, str]] = set()
    latest_mtime: float | None = None
    for path in files:
        try:
            stat = path.stat()
        except Exception:
            continue
        stats["file_count"] += 1
        stats["size_bytes"] += int(stat.st_size)
        suffix = path.suffix.lower()
        if suffix == ".png":
            stats["png_count"] += 1
        elif suffix == ".json":
            stats["json_count"] += 1
        parent_key = "." if path.parent == cache_dir else str(path.parent.relative_to(cache_dir))
        pair_keys.add((parent_key, path.stem))
        latest_mtime = max(latest_mtime or stat.st_mtime, stat.st_mtime)

    stats["directory_count"] = directories
    stats["pair_count"] = len(pair_keys)
    if latest_mtime is not None:
        stats["latest_updated_at"] = datetime.fromtimestamp(latest_mtime).isoformat()
    return stats
