import json
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

_DEMO_ROOT = Path(__file__).resolve().parent
_OUT = _DEMO_ROOT / "output"
_OUT.mkdir(parents=True, exist_ok=True)

JSON_PATH = _DEMO_ROOT / "player_trajectories_relative.json"
SCALE_PX_PER_M = 30
OUTPUT_EXCEL = _OUT / "player_core_metrics.xlsx"
OUTPUT_PLOT = _OUT / "team_metrics_comparison.png"

plt.rcParams["font.sans-serif"] = ["SimHei"]
plt.rcParams["axes.unicode_minus"] = False


def calculate_metrics():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    target_metrics = []
    for target in data:
        trajs = target["trajectories"]
        if len(trajs) < 2:
            continue

        total_dist_px = 0.0
        for i in range(1, len(trajs)):
            prev = trajs[i - 1]["relative_coords"]
            curr = trajs[i]["relative_coords"]
            total_dist_px += math.sqrt((curr["x"] - prev["x"]) ** 2 + (curr["y"] - prev["y"]) ** 2)
        total_dist_m = total_dist_px / SCALE_PX_PER_M

        avg_speed = total_dist_m / target["total_duration"] if target["total_duration"] > 0 else 0
        avg_conf = sum(t["confidence"] for t in trajs) / len(trajs)

        target_metrics.append(
            {
                "track_id": target["track_id"],
                "class": target["class"],
                "total_duration_s": round(target["total_duration"], 2),
                "total_frames": target["total_frames"],
                "total_dist_px": round(total_dist_px, 2),
                "total_dist_m": round(total_dist_m, 2),
                "avg_speed_m/s": round(avg_speed, 2),
                "avg_confidence": round(avg_conf, 2),
            }
        )

    df = pd.DataFrame(target_metrics)
    with pd.ExcelWriter(OUTPUT_EXCEL, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="单个目标指标", index=False)
        team_stats = df.groupby("class").agg(
            {
                "track_id": "count",
                "total_duration_s": "mean",
                "total_dist_m": ["sum", "mean"],
                "avg_speed_m/s": "mean",
                "avg_confidence": "mean",
            }
        ).round(2)
        team_stats.columns = ["目标数量", "平均跟踪时长(s)", "总跑动距离(m)", "平均跑动距离(m)", "平均速度(m/s)", "平均置信度"]
        team_stats.to_excel(writer, sheet_name="团队对比", index=True)

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("苏超联赛团队核心指标对比", fontsize=16, fontweight="bold")
    classes = team_stats.index.tolist()
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"]

    axes[0, 0].bar(classes, team_stats["目标数量"], color=colors)
    axes[0, 0].set_title("各类型目标数量", fontsize=12)
    axes[0, 0].set_ylabel("数量（个）")
    for i, v in enumerate(team_stats["目标数量"]):
        axes[0, 0].text(i, v + 5, str(v), ha="center", va="bottom")

    axes[0, 1].bar(classes, team_stats["总跑动距离(m)"], color=colors)
    axes[0, 1].set_title("各类型总跑动距离", fontsize=12)
    axes[0, 1].set_ylabel("距离（米）")
    for i, v in enumerate(team_stats["总跑动距离(m)"]):
        axes[0, 1].text(i, v + 20, f"{v}m", ha="center", va="bottom")

    axes[1, 0].bar(classes, team_stats["平均跑动距离(m)"], color=colors)
    axes[1, 0].set_title("各类型平均跑动距离", fontsize=12)
    axes[1, 0].set_ylabel("距离（米）")
    for i, v in enumerate(team_stats["平均跑动距离(m)"]):
        axes[1, 0].text(i, v + 0.5, f"{v}m", ha="center", va="bottom")

    axes[1, 1].bar(classes, team_stats["平均速度(m/s)"], color=colors)
    axes[1, 1].set_title("各类型平均速度", fontsize=12)
    axes[1, 1].set_ylabel("速度（米/秒）")
    for i, v in enumerate(team_stats["平均速度(m/s)"]):
        axes[1, 1].text(i, v + 0.02, f"{v}m/s", ha="center", va="bottom")

    plt.tight_layout()
    plt.savefig(OUTPUT_PLOT, dpi=300, bbox_inches="tight")
    plt.close()

    print("=== 核心指标计算完成 ===")
    print(f"1. Excel文件已保存：{OUTPUT_EXCEL}")
    print(f"2. 团队对比图已保存：{OUTPUT_PLOT}")
    print("\n=== 关键结论 ===")

    # ====================== 修复位置：动态获取队伍，不再写死 team one / team two ======================
    teams = team_stats.index.tolist()
    if len(teams) >= 1:
        print(f"- {teams[0]} 总跑动距离：{team_stats.loc[teams[0], '总跑动距离(m)']}米")
    if len(teams) >= 2:
        print(f"- {teams[1]} 总跑动距离：{team_stats.loc[teams[1], '总跑动距离(m)']}米")

    if not team_stats.empty:
        fastest_class = team_stats["平均速度(m/s)"].idxmax()
        fastest_speed = team_stats["平均速度(m/s)"].max()
        print(f"- 平均速度最快的类型：{fastest_class}（{fastest_speed}m/s）")
    # ================================================================================================


if __name__ == "__main__":
    try:
        calculate_metrics()
    except Exception as e:
        print(f"运行出错：{e}")
        print("请检查：1. JSON 是否存在且含 team one / team two 类别 2. 依赖是否完整（pandas openpyxl）")