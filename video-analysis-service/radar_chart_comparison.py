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
OUTPUT_RADAR = _OUT / "team_radar_standardized.png"
METRICS = [
    "总跑动距离(m)",
    "平均跑动距离(m)",
    "平均速度(m/s)",
    "平均跟踪时长(s)",
    "平均置信度",
]

plt.rcParams["font.sans-serif"] = ["SimHei", "Arial Unicode MS"]
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["lines.linewidth"] = 2.5
plt.rcParams["legend.fontsize"] = 11


def generate_standardized_radar():
    try:
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
                    "class": target["class"],
                    "total_duration_s": target["total_duration"],
                    "total_dist_m": total_dist_m,
                    "avg_speed_m/s": avg_speed,
                    "avg_confidence": avg_conf,
                }
            )

        df = pd.DataFrame(target_metrics)
        team_stats = df.groupby("class").agg(
            总跑动距离=("total_dist_m", "sum"),
            平均跑动距离=("total_dist_m", "mean"),
            平均速度=("avg_speed_m/s", "mean"),
            平均跟踪时长=("total_duration_s", "mean"),
            平均置信度=("avg_confidence", "mean"),
        ).round(2)
        team_stats.columns = METRICS

        # ====================== 修复开始 ======================
        teams = team_stats.index.tolist()
        if len(teams) < 1:
            print("⚠️  没有队伍数据，跳过雷达图")
            return

        team1 = teams[0]
        team2 = teams[1] if len(teams) >= 2 else teams[0]

        stats_one = team_stats.loc[team1].values
        stats_two = team_stats.loc[team2].values
        # ======================================================

        max_values = np.max([stats_one, stats_two], axis=0)
        stats_one_standardized = stats_one / max_values
        stats_two_standardized = stats_two / max_values

        angles = np.linspace(0, 2 * np.pi, len(METRICS), endpoint=False).tolist()
        stats_one_standardized = np.concatenate((stats_one_standardized, [stats_one_standardized[0]]))
        stats_two_standardized = np.concatenate((stats_two_standardized, [stats_two_standardized[0]]))
        angles = angles + [angles[0]]

        fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))

        ax.fill(angles, stats_one_standardized, color="#FF4444", alpha=0.3, label=team1, edgecolor="#CC0000")
        ax.plot(angles, stats_one_standardized, color="#CC0000", marker="o", markersize=6)

        ax.fill(angles, stats_two_standardized, color="#4488FF", alpha=0.3, label=team2, edgecolor="#0044CC")
        ax.plot(angles, stats_two_standardized, color="#0044CC", marker="s", markersize=6)

        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(METRICS, fontsize=12, fontweight="bold")
        ax.set_ylim(0, 1.1)
        ax.set_yticks(np.linspace(0, 1, 5))
        ax.set_yticklabels([f"{x:.1f}" for x in np.linspace(0, 1, 5)], fontsize=9)

        plt.title("两队核心指标雷达图对比（标准化后，量纲统一）", size=16, pad=30, fontweight="bold")
        plt.legend(loc="upper left", bbox_to_anchor=(1.05, 1.05), frameon=True, fancybox=True)

        plt.tight_layout()
        plt.savefig(OUTPUT_RADAR, dpi=300, bbox_inches="tight", facecolor="white")
        plt.close()

        print(f"✅ 标准化雷达图已保存：{OUTPUT_RADAR}")

    except Exception as e:
        print(f"⚠️  雷达图生成失败，已跳过：{e}")