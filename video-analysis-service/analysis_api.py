import json
import time
import cv2
from pathlib import Path
from trajectory_tracker import PlayerTrajectoryTracker
from soccer_pass_detection import SoccerVisionPipeline

# ====================== CPU 优化参数 ======================
FRAME_INTERVAL = 60
RESIZE_WIDTH = 640
PREVIEW_FPS = 10
PREVIEW_MAX_FRAMES = 150
# ==========================================================

OUTPUT_ROOT = Path(__file__).parent / "output"
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

STAGES = [
    {"name": "trajectory", "weight": 60},
    {"name": "metrics", "weight": 15},
    {"name": "radar", "weight": 10},
    {"name": "pass_network", "weight": 15},
]


def _update_progress(task_output: Path, stage: str, percent: float, message: str):
    progress = {
        "stage": stage,
        "percent": round(percent, 1),
        "message": message,
        "updated_at": time.time(),
    }
    with open(task_output / "progress.json", "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def _generate_preview_video(task_output: Path, video_path: str):
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    scale = min(640 / width, 1.0)
    out_w = int(width * scale)
    out_h = int(height * scale)

    preview_path = str(task_output / "detect_preview.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(preview_path, fourcc, PREVIEW_FPS, (out_w, out_h))

    sample_interval = max(1, total_frames // PREVIEW_MAX_FRAMES)
    frame_idx = 0
    written = 0

    try:
        from ultralytics import YOLO
        model = YOLO("weights/yolo11n.pt")

        while cap.isOpened() and written < PREVIEW_MAX_FRAMES:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % sample_interval == 0:
                results = model.track(
                    frame, stream=False, conf=0.2, iou=0.5,
                    tracker="bytetrack.yaml", persist=True,
                    imgsz=640, device="cpu", verbose=False,
                )
                annotated = results[0].plot(labels=True)
                resized = cv2.resize(annotated, (out_w, out_h))
                writer.write(resized)
                written += 1
            frame_idx += 1
    except Exception as e:
        print(f"[预览生成失败] {e}")
    finally:
        cap.release()
        writer.release()
    return preview_path if written > 0 else None


def run_full_analysis(video_path: str, task_id: str) -> dict:
    task_output = OUTPUT_ROOT / task_id
    task_output.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] 开始分析任务: {task_id}")
    print(f"[INFO] 视频路径: {video_path}")

    _update_progress(task_output, "trajectory", 0, "正在进行球员轨迹跟踪...")

    # 1. 轨迹跟踪
    tracker = PlayerTrajectoryTracker(
        model_path="weights/yolo11n.pt",
        video_path=video_path,
        output_json=str(task_output / "player_trajectories.json")
    )
    tracker.frame_interval = FRAME_INTERVAL
    tracker.resize_width = RESIZE_WIDTH
    total_frames = int(tracker.cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[INFO] 总帧数: {total_frames}")
    tracker.process_video(show=False, save_preview_path=str(task_output / "latest_preview.jpg"))

    _update_progress(task_output, "trajectory", 55, "正在生成分析预览视频...")
    try:
        _generate_preview_video(task_output, video_path)
    except Exception as e:
        print(f"[WARN] 预览视频生成失败: {e}")

    _update_progress(task_output, "metrics", 60, "正在计算核心指标...")

    # 2. 核心指标
    import calculate_core_metrics
    calculate_core_metrics.JSON_PATH = str(task_output / "player_trajectories.json")
    calculate_core_metrics.OUTPUT_EXCEL = str(task_output / "core_metrics.xlsx")
    calculate_core_metrics.OUTPUT_PLOT = str(task_output / "team_metrics.png")
    calculate_core_metrics.calculate_metrics()

    _update_progress(task_output, "radar", 75, "正在生成雷达图...")

    # 3. 雷达图
    import radar_chart_comparison
    radar_chart_comparison.JSON_PATH = str(task_output / "player_trajectories.json")
    radar_chart_comparison.OUTPUT_RADAR = str(task_output / "team_radar.png")
    radar_chart_comparison.generate_standardized_radar()

    _update_progress(task_output, "pass_network", 85, "正在分析传球网络...")

    # 4. 传球网络和事件检测
    pipe = SoccerVisionPipeline(
        model_path="weights/yolo11n.pt",
        video_path=video_path
    )
    pipe.frame_skip = FRAME_INTERVAL
    net = pipe.run_full_analysis(
        show=False,
        report_path=str(task_output / "pass_analysis.json")
    )
    if net:
        net.visualize(out_path=str(task_output / "pass_network.png"))

    _update_progress(task_output, "done", 100, "分析完成")

    # 统计球员数量：只统计 person 类，取每帧中最多同时出现的人数
    person_ids = {
        tid for tid, pts in tracker.trajectory_data.items()
        if pts and pts[0].get("class") == "person"
    }
    max_concurrent = 0
    per_frame: dict[int, set] = {}
    for tid, pts in tracker.trajectory_data.items():
        if not pts or pts[0].get("class") != "person":
            continue
        for p in pts:
            f = p.get("frame", 0)
            per_frame.setdefault(f, set()).add(tid)
    if per_frame:
        max_concurrent = max(len(ids) for ids in per_frame.values())

    # 5. 整理结果返回给后端
    result = {
        "task_id": task_id,
        "status": "completed",
        "total_players": max_concurrent or len(person_ids),
        "metrics_excel": f"/analysis-results/{task_id}/core_metrics.xlsx",
        "charts": {
            "team_metrics": f"/analysis-results/{task_id}/team_metrics.png",
            "team_radar": f"/analysis-results/{task_id}/team_radar.png",
            "pass_network": f"/analysis-results/{task_id}/pass_network.png"
        },
        "pass_count": len(pipe.pass_records) if pipe else 0,
        "highlight_windows": pipe.merge_highlight_windows() if pipe else []
    }

    with open(task_output / "result.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"[INFO] 任务完成: {task_id}")
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3:
        video_path = sys.argv[1]
        task_id = sys.argv[2]
        run_full_analysis(video_path, task_id)
    else:
        run_full_analysis("samples/football.mp4", "test-task-001")