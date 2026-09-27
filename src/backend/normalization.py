import statistics


def weighted_score(criteria: dict, weights: dict) -> float:
    """Sum of criterion_score * weight for one review."""
    total = 0.0
    for name, value in criteria.items():
        total += value * weights.get(name, 1.0)
    return total


def normalize_scores(scores, weights, shrink_k=3):
    """
    scores: list of dicts, each {"judge_id": ..., "project_id": ..., "criteria": {...}}
    weights: dict of criterion name -> weight, e.g. {"functionality": 1.0, ...}
    shrink_k: how strongly to pull a judge's mean/spread toward the global average
              when they have few reviews. Higher = more shrinkage.

    Returns: dict of project_id -> {
        "normalized_score": float,
        "raw_average": float,
        "review_count": int,
    }
    """
    if not scores:
        return {}

    # Step 1: weighted score per review
    for s in scores:
        s["_weighted"] = weighted_score(s["criteria"], weights)

    # Step 2: per-judge mean and stdev of their weighted scores
    by_judge = {}
    for s in scores:
        by_judge.setdefault(s["judge_id"], []).append(s["_weighted"])

    all_weighted = [s["_weighted"] for s in scores]
    global_mean = statistics.mean(all_weighted)
    global_stdev = statistics.pstdev(all_weighted) or 1.0  # avoid divide by zero

    judge_stats = {}
    for judge_id, values in by_judge.items():
        n = len(values)
        judge_mean = statistics.mean(values)
        judge_stdev = statistics.pstdev(values) if n > 1 else 0.0

        # Shrink toward the global mean/stdev when n is small.
        # weight = n / (n + k): more reviews -> trust the judge's own numbers more.
        w = n / (n + shrink_k)
        shrunk_mean = w * judge_mean + (1 - w) * global_mean
        shrunk_stdev = w * judge_stdev + (1 - w) * global_stdev
        if shrunk_stdev == 0:
            shrunk_stdev = 1.0  # a judge who is perfectly consistent contributes no spread info

        judge_stats[judge_id] = {"mean": shrunk_mean, "stdev": shrunk_stdev}

    # Step 3: z-score each review using its judge's shrunk mean/stdev
    for s in scores:
        stats = judge_stats[s["judge_id"]]
        s["_zscore"] = (s["_weighted"] - stats["mean"]) / stats["stdev"]

    # Step 4: average z-scores per project
    by_project = {}
    for s in scores:
        by_project.setdefault(s["project_id"], []).append(s)

    result = {}
    for project_id, reviews in by_project.items():
        zscores = [r["_zscore"] for r in reviews]
        raws = [r["_weighted"] for r in reviews]
        result[project_id] = {
            "normalized_score": round(statistics.mean(zscores), 3),
            "raw_average": round(statistics.mean(raws), 3),
            "review_count": len(reviews),
        }

    return result