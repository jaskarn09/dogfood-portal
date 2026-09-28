import os
import sys

sys.path.insert(
    0,
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "src",
            "backend",
        )
    ),
)

from normalization import weighted_score, normalize_scores


def test_weighted_score():
    criteria = {
        "functionality": 4,
        "quality": 3,
        "innovation": 5,
    }

    weights = {
        "functionality": 1.0,
        "quality": 2.0,
        "innovation": 0.5,
    }

    assert weighted_score(criteria, weights) == 12.5


def test_empty_scores():
    assert normalize_scores([], {}) == {}


def test_single_review_does_not_crash():
    scores = [
        {
            "judge_id": "judge_1",
            "project_id": "project_1",
            "criteria": {"functionality": 4},
        }
    ]

    result = normalize_scores(
        scores,
        {"functionality": 1.0},
    )

    assert "project_1" in result
    assert result["project_1"]["review_count"] == 1
    assert result["project_1"]["raw_average"] == 4.0


def test_flat_judge_does_not_divide_by_zero():
    scores = [
        {
            "judge_id": "judge_1",
            "project_id": "project_1",
            "criteria": {"functionality": 4},
        },
        {
            "judge_id": "judge_1",
            "project_id": "project_2",
            "criteria": {"functionality": 4},
        },
        {
            "judge_id": "judge_2",
            "project_id": "project_1",
            "criteria": {"functionality": 3},
        },
        {
            "judge_id": "judge_2",
            "project_id": "project_2",
            "criteria": {"functionality": 5},
        },
    ]

    result = normalize_scores(
        scores,
        {"functionality": 1.0},
    )

    assert set(result.keys()) == {
        "project_1",
        "project_2",
    }

    for project in result.values():
        assert project["review_count"] == 2


def test_projects_with_different_review_counts():
    scores = [
        {
            "judge_id": "judge_1",
            "project_id": "project_1",
            "criteria": {"functionality": 4},
        },
        {
            "judge_id": "judge_2",
            "project_id": "project_1",
            "criteria": {"functionality": 5},
        },
        {
            "judge_id": "judge_1",
            "project_id": "project_2",
            "criteria": {"functionality": 3},
        },
        {
            "judge_id": "judge_2",
            "project_id": "project_2",
            "criteria": {"functionality": 4},
        },
        {
            "judge_id": "judge_3",
            "project_id": "project_2",
            "criteria": {"functionality": 4},
        },
        {
            "judge_id": "judge_4",
            "project_id": "project_2",
            "criteria": {"functionality": 5},
        },
        {
            "judge_id": "judge_5",
            "project_id": "project_2",
            "criteria": {"functionality": 3},
        },
    ]

    result = normalize_scores(
        scores,
        {"functionality": 1.0},
    )

    assert result["project_1"]["review_count"] == 2
    assert result["project_2"]["review_count"] == 5


def test_multiple_criteria_and_weights():
    scores = [
        {
            "judge_id": "judge_1",
            "project_id": "project_1",
            "criteria": {
                "functionality": 4,
                "quality": 3,
                "innovation": 5,
            },
        },
        {
            "judge_id": "judge_2",
            "project_id": "project_1",
            "criteria": {
                "functionality": 5,
                "quality": 4,
                "innovation": 3,
            },
        },
    ]

    weights = {
        "functionality": 1.0,
        "quality": 2.0,
        "innovation": 0.5,
    }

    result = normalize_scores(scores, weights)

    assert result["project_1"]["review_count"] == 2
    assert result["project_1"]["raw_average"] == 13.5
    assert "normalized_score" in result["project_1"]