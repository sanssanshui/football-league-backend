"""球员轨迹跟踪：YOLO + ByteTrack，输出 player_trajectories_relative.json（供雷达图与指标脚本使用）。"""

import json
import os
import time
from pathlib import Path

import cv2
import torch
from ultralytics import YOLO

_DEMO_ROOT = Path(__file__).resolve().parent


class PlayerTrajectoryTracker:
    def __init__(
        self,
        model_path,
        video_path,
        output_json=None,
        imgsz: int = 640,
        fps_override: float | None = None,
    ):
        self.model = YOLO(model_path)
        self.video_path = video_path
        self.output_json = output_json or str(_DEMO_ROOT / "player_trajectories_relative.json")
        self.imgsz = imgsz
        self.use_cuda = torch.cuda.is_available()
        self.device = 0 if self.use_cuda else "cpu"

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"视频文件不存在：{video_path}")

        self.trajectory_data = {}
        self.cap = cv2.VideoCapture(video_path)
        # 降低直播/摄像头类源的缓冲滞后（文件流部分驱动上也会略好）
        try:
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        fps_cv = float(self.cap.get(cv2.CAP_PROP_FPS))
        n_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        # 部分 MP4 OpenCV 读到的 FPS 为 0 或离谱，用帧数时长估算
        duration_sec = 0.0
        _dur_prop = getattr(cv2, "CAP_PROP_DURATION", None)
        if _dur_prop is not None:
            duration_ms = float(self.cap.get(_dur_prop))
            if duration_ms > 0:
                duration_sec = duration_ms / 1000.0
        if fps_override is not None and fps_override > 1e-3:
            self.fps = float(fps_override)
        elif fps_cv > 1e-3:
            self.fps = fps_cv
        elif n_frames > 1 and duration_sec > 1e-3:
            self.fps = n_frames / duration_sec
        else:
            self.fps = 25.0

        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.frame_count = 0
        print(f"视频参数：{self.frame_width}x{self.frame_height}px | 使用 FPS={round(self.fps, 3)}（OpenCV 报告 {fps_cv or 0:.3f}）")
        print("相对坐标系：原点(0,0)=视频左下角，x→右，y→上")
        print(f"推理：device={self.device} | imgsz={self.imgsz} | half={self.use_cuda}（仅 CUDA 下半精度）")

    def _resize_for_display(self, img, display_scale: float):
        if not display_scale or display_scale == 1.0:
            return img
        return cv2.resize(
            img,
            (int(img.shape[1] * display_scale), int(img.shape[0] * display_scale)),
            interpolation=cv2.INTER_AREA,
        )

    def process_video(
        self,
        show=True,
        display_scale: float = 0.55,
        *,
        realtime_preview: bool = True,
        show_raw_when_empty: bool = True,
        save_preview_path: str | None = None,
    ):
        """
        show=False 时不绘制叠加层，速度最快。
        display_scale：预览窗口相对原图缩放。
        realtime_preview：按视频 FPS 对齐墙钟时间，避免「像慢放」（推理跟不上时仍会卡，属正常）。
        show_raw_when_empty：本帧无跟踪框时仍显示原画面，便于预览节奏连续。
        """
        print(f"\n开始处理视频：{self.video_path}")
        frame_period = 1.0 / self.fps if self.fps > 1e-3 else 1.0 / 25.0
        next_deadline = time.perf_counter()

        while self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                break

            timestamp = round(self.frame_count / self.fps, 3)
            # stream=False：单帧循环不要用 stream 生成器，减少额外开销
            results = self.model.track(
                frame,
                stream=False,
                conf=0.2,
                iou=0.5,
                tracker="bytetrack.yaml",
                persist=True,
                imgsz=self.imgsz,
                device=self.device,
                half=self.use_cuda,
                verbose=False,
            )
            result = results[0]

            to_show = None
            if result.boxes is not None and result.boxes.id is not None:
                track_ids = result.boxes.id.int().cpu().tolist()
                bboxes = result.boxes.xyxy.cpu().tolist()
                class_ids = result.boxes.cls.int().cpu().tolist()
                confidences = result.boxes.conf.cpu().tolist()

                if show:
                    annotated_frame = result.plot(labels=True)
                    for idx, bbox in zip(track_ids, bboxes):
                        x1, y1, x2, y2 = map(int, bbox)
                        cv2.putText(
                            annotated_frame,
                            f"ID:{idx}",
                            (x1, y1 - 30),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (255, 0, 0),
                            2,
                        )
                    cv2.putText(
                        annotated_frame,
                        f"Rel-Coord: Origin(0,0)=Bottom-Left | Frame:{self.frame_count} | Time:{timestamp}s",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 255, 0),
                        2,
                    )
                    to_show = annotated_frame

                for idx, bbox, cls_id, conf in zip(track_ids, bboxes, class_ids, confidences):
                    x1, y1, x2, y2 = bbox
                    center_x = (x1 + x2) / 2
                    center_y = self.frame_height - (y1 + y2) / 2

                    track_info = {
                        "timestamp": timestamp,
                        "frame": self.frame_count,
                        "track_id": idx,
                        "class": self.model.names[cls_id],
                        "confidence": round(conf, 2),
                        "relative_coords": {"x": round(center_x, 2), "y": round(center_y, 2)},
                        "original_pixel_coords": {"x": round(center_x, 2), "y": round((y1 + y2) / 2, 2)},
                        "bbox_size": {"width": round(x2 - x1, 2), "height": round(y2 - y1, 2)},
                    }

                    if idx not in self.trajectory_data:
                        self.trajectory_data[idx] = []
                    self.trajectory_data[idx].append(track_info)

                # Save preview frame to disk
                if save_preview_path:
                    preview_frame = result.plot(labels=True)
                    cv2.putText(
                        preview_frame,
                        f"Frame:{self.frame_count} | Time:{timestamp}s | Tracks:{len(self.trajectory_data)}",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
                    )
                    h, w = preview_frame.shape[:2]
                    scale = min(640 / w, 1.0)
                    if scale < 1.0:
                        preview_frame = cv2.resize(preview_frame, (int(w * scale), int(h * scale)))
                    cv2.imwrite(save_preview_path, preview_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])

            elif save_preview_path:
                preview_frame = frame.copy()
                cv2.putText(
                    preview_frame,
                    f"No active tracks | Frame:{self.frame_count} | {timestamp}s",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2,
                )
                h, w = preview_frame.shape[:2]
                scale = min(640 / w, 1.0)
                if scale < 1.0:
                    preview_frame = cv2.resize(preview_frame, (int(w * scale), int(h * scale)))
                cv2.imwrite(save_preview_path, preview_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            elif show and show_raw_when_empty:
                to_show = frame.copy()
                cv2.putText(
                    to_show,
                    f"No active tracks | Frame:{self.frame_count} | {timestamp}s",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 165, 255),
                    2,
                )

            if show and to_show is not None:
                disp = self._resize_for_display(to_show, display_scale)
                cv2.imshow("Player Tracking (Relative Coords)", disp)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    print("用户手动退出")
                    self.cap.release()
                    cv2.destroyAllWindows()
                    return

            if self.frame_count % 100 == 0:
                print(f"已处理 {self.frame_count} 帧 | 跟踪目标数：{len(self.trajectory_data)}")

            self.frame_count += 1

            if show and realtime_preview:
                next_deadline += frame_period
                now = time.perf_counter()
                sleep_s = next_deadline - now
                # 若推理严重落后，放弃追赶以免越睡越久
                if sleep_s < -3 * frame_period:
                    next_deadline = now + frame_period
                elif sleep_s > 0:
                    time.sleep(sleep_s)

        self.cap.release()
        cv2.destroyAllWindows()
        self.save_trajectory_data()
        print(f"\n处理完成！共跟踪 {len(self.trajectory_data)} 个目标 | 数据文件：{self.output_json}")

    def save_trajectory_data(self):
        output_data = [
            {
                "track_id": track_id,
                "class": trajectories[0]["class"],
                "total_frames": len(trajectories),
                "total_duration": round(trajectories[-1]["timestamp"] - trajectories[0]["timestamp"], 3),
                "video_resolution": f"{self.frame_width}x{self.frame_height}px",
                "trajectories": trajectories,
            }
            for track_id, trajectories in self.trajectory_data.items()
        ]

        with open(self.output_json, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    weights = _DEMO_ROOT / "weights" / "yolo11n.pt"
    MODEL_PATH = str(weights) if weights.is_file() else "yolo11n.pt"
    VIDEO_PATH = str(_DEMO_ROOT / "samples" / "football.mp4")
    OUTPUT_JSON = str(_DEMO_ROOT / "player_trajectories_relative.json")

    try:
        # imgsz 越小越快；show=False 最快；FPS 读错时用 fps_override=30 等纠正
        tracker = PlayerTrajectoryTracker(MODEL_PATH, VIDEO_PATH, OUTPUT_JSON, imgsz=640)
        tracker.process_video(show=True, display_scale=0.55, realtime_preview=True)
    except Exception as e:
        print(f"\n运行出错：{e}")
        print("请检查：1. 模型与视频路径 2. 视频是否被占用 3. 是否已 pip install ultralytics lap")
