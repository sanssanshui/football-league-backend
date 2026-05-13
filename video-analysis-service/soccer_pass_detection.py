"""
江苏省城市足球联赛 — 技战术分析与传球网络（演示 + 视频管道）

- 演示模式：SoccerPassNetwork 使用模拟传球事件，生成网络图与 GIF。
- 视频模式：YOLO + Ultralytics ByteTrack（与 DeepSORT 同为多目标跟踪；本项目默认 ByteTrack）
  从检测框中心轨迹推断传球、射门候选、抢断候选，并计算跑动距离、热力图、速度曲线、精彩片段时间轴。

依赖：numpy, matplotlib, networkx；视频分析另需 opencv-python, ultralytics, pillow（保存 GIF）。
"""

from __future__ import annotations

import json
import math
import os
import time
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from typing import Any

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
from matplotlib.animation import FuncAnimation

# 解决中文显示问题
plt.rcParams["font.sans-serif"] = ["SimHei", "WenQuanYi Micro Hei", "Heiti TC", "Microsoft YaHei"]
plt.rcParams["axes.unicode_minus"] = False


# ---------------------------------------------------------------------------
# 数据结构
# ---------------------------------------------------------------------------


@dataclass
class TrackPoint:
    frame: int
    t: float
    x: float
    y: float
    cls_name: str


@dataclass
class MatchEvent:
    """规则/NLP 前置：结构化事件，便于集锦与统计。"""

    kind: str  # pass, shot, tackle_candidate, highlight_speed, ...
    t_start: float
    t_end: float
    confidence: float
    detail: dict[str, Any] = field(default_factory=dict)


@dataclass
class PassEventRecord:
    sender_key: str
    receiver_key: str
    distance_px: float
    t: float
    frame: int
    start_pos: tuple[float, float]
    end_pos: tuple[float, float]


# ---------------------------------------------------------------------------
# 演示用传球网络（保留并小幅增强）
# ---------------------------------------------------------------------------


class SoccerPassNetwork:
    def __init__(self):
        self.pass_events: list[dict[str, Any]] = []
        self.pass_network = nx.DiGraph()
        self.team1 = ["P1", "P3", "P5", "P7", "P9", "P11"]
        self.team2 = ["P2", "P4", "P6", "P8", "P10", "P12"]
        self.positions = {
            "P1": (20, 30),
            "P3": (30, 20),
            "P5": (30, 40),
            "P7": (40, 30),
            "P9": (50, 20),
            "P11": (50, 40),
            "P2": (60, 30),
            "P4": (70, 20),
            "P6": (70, 40),
            "P8": (80, 30),
            "P10": (90, 20),
            "P12": (90, 40),
        }

    def generate_multi_passes(self) -> None:
        self.pass_events.extend(
            [
                {"sender": "P1", "receiver": "P3", "distance": 14.1, "start_pos": (20, 30), "end_pos": (30, 20)},
                {"sender": "P1", "receiver": "P5", "distance": 14.1, "start_pos": (20, 30), "end_pos": (30, 40)},
                {"sender": "P3", "receiver": "P7", "distance": 14.1, "start_pos": (30, 20), "end_pos": (40, 30)},
                {"sender": "P5", "receiver": "P7", "distance": 14.1, "start_pos": (30, 40), "end_pos": (40, 30)},
                {"sender": "P7", "receiver": "P9", "distance": 14.1, "start_pos": (40, 30), "end_pos": (50, 20)},
                {"sender": "P7", "receiver": "P11", "distance": 14.1, "start_pos": (40, 30), "end_pos": (50, 40)},
                {"sender": "P9", "receiver": "P11", "distance": 20.0, "start_pos": (50, 20), "end_pos": (50, 40)},
                {"sender": "P11", "receiver": "P1", "distance": 36.1, "start_pos": (50, 40), "end_pos": (20, 30)},
            ]
        )
        self.pass_events.extend(
            [
                {"sender": "P8", "receiver": "P4", "distance": 14.1, "start_pos": (80, 30), "end_pos": (70, 20)},
                {"sender": "P8", "receiver": "P6", "distance": 14.1, "start_pos": (80, 30), "end_pos": (70, 40)},
                {"sender": "P4", "receiver": "P2", "distance": 14.1, "start_pos": (70, 20), "end_pos": (60, 30)},
                {"sender": "P6", "receiver": "P2", "distance": 14.1, "start_pos": (70, 40), "end_pos": (60, 30)},
                {"sender": "P2", "receiver": "P10", "distance": 31.6, "start_pos": (60, 30), "end_pos": (90, 20)},
                {"sender": "P2", "receiver": "P12", "distance": 31.6, "start_pos": (60, 30), "end_pos": (90, 40)},
                {"sender": "P10", "receiver": "P12", "distance": 20.0, "start_pos": (90, 20), "end_pos": (90, 40)},
                {"sender": "P12", "receiver": "P8", "distance": 36.1, "start_pos": (90, 40), "end_pos": (80, 30)},
            ]
        )

    @classmethod
    def from_pass_records(cls, records: list[PassEventRecord], team_split_x: float | None = None) -> SoccerPassNetwork:
        """由视频推断的传球列表构建网络（球队按半场粗略划分）。"""
        net = cls()
        net.pass_events.clear()
        for r in records:
            sx, sy = r.start_pos
            team = "team1" if (team_split_x is None or sx < team_split_x) else "team2"
            sender = f"{team}:{r.sender_key}"
            receiver = f"{team}:{r.receiver_key}"
            net.pass_events.append(
                {
                    "sender": sender,
                    "receiver": receiver,
                    "distance": r.distance_px,
                    "start_pos": r.start_pos,
                    "end_pos": r.end_pos,
                    "t": r.t,
                    "frame": r.frame,
                }
            )
        mid = team_split_x if team_split_x is not None else 0.0
        left, right = set(), set()
        for e in net.pass_events:
            (left if e["start_pos"][0] < mid else right).add(e["sender"])
            (left if e["end_pos"][0] < mid else right).add(e["receiver"])
        net.team1 = sorted(left) or ["team1"]
        net.team2 = sorted(right) or ["team2"]
        net.positions = {}
        for e in net.pass_events:
            net.positions.setdefault(e["sender"], e["start_pos"])
            net.positions.setdefault(e["receiver"], e["end_pos"])
        return net

    def build_network(self) -> None:
        for player in self.team1 + self.team2:
            team = "team1" if player in self.team1 else "team2"
            self.pass_network.add_node(player, team=team)
        for event in self.pass_events:
            sender, receiver = event["sender"], event["receiver"]
            for n in (sender, receiver):
                if n not in self.pass_network:
                    team = "team1" if n in self.team1 else "team2"
                    self.pass_network.add_node(n, team=team)
            if self.pass_network.has_edge(sender, receiver):
                self.pass_network.edges[sender, receiver]["weight"] += 1
            else:
                self.pass_network.add_edge(sender, receiver, weight=1)

    def visualize(self, layout: str = "spring", out_path: str = "multi_pass_network.png") -> None:
        try:
            if not self.pass_network.nodes:
                print("⚠️  无球员节点，跳过传球网络图")
                return

            node_colors = [
                "red" if self.pass_network.nodes[node].get("team") == "team1" else "blue"
                for node in self.pass_network.nodes
            ]
            node_sizes = []
            for node in self.pass_network.nodes:
                out_w = sum(self.pass_network.edges[node, n]["weight"] for n in self.pass_network.successors(node))
                s = max(out_w * 200, 400)
                node_sizes.append(s)
            edge_widths = [self.pass_network.edges[edge]["weight"] * 1.5 for edge in self.pass_network.edges]

            plt.figure(figsize=(12, 8))
            if layout == "fixed" and self.positions and set(self.positions.keys()) >= set(self.pass_network.nodes):
                pos = {n: self.positions[n] for n in self.pass_network.nodes}
            else:
                pos = nx.spring_layout(self.pass_network, seed=42, k=0.8)
            nx.draw_networkx_nodes(self.pass_network, pos, node_color=node_colors, node_size=node_sizes, alpha=0.8)
            nx.draw_networkx_edges(
                self.pass_network, pos, width=edge_widths, alpha=0.7, edge_color="gray", arrowstyle="->"
            )
            nx.draw_networkx_labels(self.pass_network, pos, font_size=9, font_weight="bold")
            plt.title("足球传球网络分析")
            plt.axis("off")
            plt.tight_layout()
            plt.savefig(out_path, dpi=300)
            plt.close()
        except Exception as e:
            print(f"⚠️  传球网络图生成失败：{e}")
            plt.close()

    def animate_random_pass(self, gif_path: str = "multi_pass_animation.gif") -> None:
        try:
            if not self.pass_events:
                print("⚠️  无传球事件，跳过动画")
                return
            candidates = [e for e in self.pass_events if e["sender"] not in ("P1", "P8")]
            event = np.random.choice(candidates if candidates else self.pass_events)

            fig, ax = plt.subplots(figsize=(10, 6))
            ax.set_xlim(10, 100)
            ax.set_ylim(10, 50)
            ax.set_aspect("equal")
            dist = event.get("distance", 0)
            ax.set_title(f"传球动画：{event['sender']} → {event['receiver']} (距离: {dist:.1f})")

            players = {}
            for player, (px, py) in self.positions.items():
                color = "red" if player in self.team1 else "blue"
                players[player] = ax.plot([], [], "o", color=color, markersize=12)[0]

            ball, = ax.plot([], [], "s", color="black", markersize=8)
            pass_line, = ax.plot([], [], "r--", linewidth=2)

            def init():
                for p in players.values():
                    p.set_data([], [])
                ball.set_data([], [])
                pass_line.set_data([], [])
                return list(players.values()) + [ball, pass_line]

            def update(frame):
                progress = frame / 15
                sx, sy = event["start_pos"]
                ex, ey = event["end_pos"]
                ball_x = sx * (1 - progress) + ex * progress
                ball_y = sy * (1 - progress) + ey * progress
                ball.set_data([ball_x], [ball_y])
                pass_line.set_data([sx, ball_x], [sy, ball_y])
                for p, (px, py) in self.positions.items():
                    players[p].set_data([px], [py])
                return list(players.values()) + [ball, pass_line]

            ani = FuncAnimation(fig, update, frames=15, init_func=init, blit=True, interval=80)
            ani.save(gif_path, writer="pillow", fps=15)
            plt.close()
            print(f"传球动画已保存为 {gif_path}")
        except Exception as e:
            print(f"⚠️  传球动画生成失败：{e}")
            plt.close()


# ---------------------------------------------------------------------------
# 视频：YOLO + ByteTrack → 轨迹、事件、统计
# ---------------------------------------------------------------------------


def _resolve_ball_person_names(names: dict[int, str]) -> tuple[set[str], set[str]]:
    person_aliases = {"person", "player", "足球运动员"}
    ball_aliases = {"sports ball", "ball", "足球", "soccer ball"}
    persons, balls = set(), set()
    for _, n in names.items():
        low = n.lower()
        if low in person_aliases or n in person_aliases:
            persons.add(n)
        if low in ball_aliases or n in ball_aliases:
            balls.add(n)
    if not persons:
        persons.add("person")
    if not balls:
        balls.add("sports ball")
    return persons, balls


class SoccerVisionPipeline:
    """
    从视频提取轨迹并做规则化技战术指标（需球场标定与专用模型才能做精确越位等）。
    """

    def __init__(
        self,
        model_path: str,
        video_path: str,
        output_dir: str = "output",
        task_id: str = "default_task",
        *,
        pixels_per_meter: float | None = None,
        tracker: str = "bytetrack.yaml",
        conf: float = 0.25,
        imgsz: int = 640,
    ):
        import cv2
        import torch
        from ultralytics import YOLO

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"视频文件不存在：{video_path}")

        self.cv2 = cv2
        self.YOLO = YOLO
        self.model = YOLO(model_path)
        self.video_path = video_path
        self.tracker = tracker
        self.conf = conf
        self.pixels_per_meter = pixels_per_meter
        self.imgsz = imgsz
        self.use_cuda = torch.cuda.is_available()
        self.device = 0 if self.use_cuda else "cpu"

        # 新增：任务输出目录（用于实时预览）
        self.task_id = task_id
        self.output_dir = output_dir
        self.task_output_dir = os.path.join(output_dir, task_id)
        os.makedirs(self.task_output_dir, exist_ok=True)

        self.names = self.model.names
        self.person_names, self.ball_names = _resolve_ball_person_names(self.names)

        cap = cv2.VideoCapture(video_path)
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        self.fps = float(cap.get(cv2.CAP_PROP_FPS)) or 25.0
        self.frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        self.tracks: dict[int, list[TrackPoint]] = defaultdict(list)
        self.ball_track_id: int | None = None
        self.events: list[MatchEvent] = []
        self.pass_records: list[PassEventRecord] = []

    def _to_bottom_left(self, x_pix: float, y_center_pix: float) -> tuple[float, float]:
        return x_pix, float(self.frame_h) - y_center_pix

    def _distance(self, a: tuple[float, float], b: tuple[float, float]) -> float:
        return float(math.hypot(a[0] - b[0], a[1] - b[1]))

    def process_video(
        self,
        max_frames: int | None = None,
        show: bool = False,
        save_annotated: str | None = None,
        display_scale: float = 0.55,
        realtime_preview: bool = True,
    ) -> None:
        """逐帧跟踪，填充 self.tracks。强制生成实时预览图，前端可实时查看 YOLO 检测画面。"""
        cap = self.cv2.VideoCapture(self.video_path)
        try:
            cap.set(self.cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass

        writer = None
        if save_annotated:
            fourcc = self.cv2.VideoWriter_fourcc(*"mp4v")
            writer = self.cv2.VideoWriter(save_annotated, fourcc, self.fps, (self.frame_w, self.frame_h))

        frame_i = 0
        ball_candidates: dict[int, int] = defaultdict(int)

        # ====================== 实时预览强制开启 ======================
        PREVIEW_INTERVAL = 3
        preview_path = os.path.join(self.task_output_dir, "latest_preview.jpg")
        # ==============================================================

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if max_frames is not None and frame_i >= max_frames:
                break

            t = frame_i / self.fps
            results = self.model.track(
                frame,
                stream=False,
                conf=self.conf,
                iou=0.5,
                tracker=self.tracker,
                persist=True,
                verbose=False,
                imgsz=self.imgsz,
                device=self.device,
                half=self.use_cuda,
            )
            result = results[0]

            # ✅ 强制生成带检测框的画面（无论是否弹窗显示）
            annotated = result.plot(labels=True)

            # ✅ 每 3 帧保存一次实时预览图（核心修复）
            if frame_i % PREVIEW_INTERVAL == 0:
                try:
                    self.cv2.imwrite(preview_path, annotated, [int(self.cv2.IMWRITE_JPEG_QUALITY), 60])
                except:
                    pass

            # 处理轨迹数据
            if result.boxes is not None and result.boxes.id is not None:
                ids = result.boxes.id.int().cpu().tolist()
                bboxes = result.boxes.xyxy.cpu().tolist()
                clss = result.boxes.cls.int().cpu().tolist()

                for tid, bbox, ci in zip(ids, bboxes, clss):
                    x1, y1, x2, y2 = bbox
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2
                    name = self.names[ci]
                    xb, yb = self._to_bottom_left(cx, cy)
                    self.tracks[tid].append(TrackPoint(frame_i, t, xb, yb, name))
                    if name in self.ball_names:
                        ball_candidates[tid] += 1

            # 写入输出视频
            if writer is not None:
                writer.write(annotated)

            # 帧计数
            frame_i += 1
            if frame_i % 100 == 0:
                print(f"已处理 {frame_i} 帧")

        cap.release()
        if writer:
            writer.release()

        # 确定球的轨迹 ID
        if ball_candidates:
            self.ball_track_id = max(ball_candidates.items(), key=lambda kv: kv[1])[0]
        print(f"跟踪轨迹数: {len(self.tracks)} | 推断的球 track_id: {self.ball_track_id}")
    def compute_run_distance(self, track_id: int) -> float:
        pts = self.tracks.get(track_id, [])
        if len(pts) < 2:
            return 0.0
        d = sum(self._distance((a.x, a.y), (b.x, b.y)) for a, b in zip(pts, pts[1:]))
        if self.pixels_per_meter:
            return d / self.pixels_per_meter
        return d

    def speed_series(self, track_id: int) -> tuple[np.ndarray, np.ndarray]:
        """返回 (时间 s, 速度 px/s 或 m/s)。"""
        pts = self.tracks.get(track_id, [])
        if len(pts) < 2:
            return np.array([]), np.array([])
        t = np.array([p.t for p in pts])
        x = np.array([p.x for p in pts])
        y = np.array([p.y for p in pts])
        dt = np.diff(t)
        dt[dt == 0] = np.nan
        spd = np.sqrt(np.diff(x) ** 2 + np.diff(y) ** 2) / dt
        if self.pixels_per_meter:
            spd = spd / self.pixels_per_meter
        return t[1:], spd

    def plot_heatmap(
        self,
        track_id: int,
        bins: tuple[int, int] = (48, 27),
        out_path: str = "player_heatmap.png",
    ) -> None:
        try:
            pts = self.tracks.get(track_id, [])
            if not pts:
                print(f"无轨迹: track {track_id}")
                return
            xs, ys = [p.x for p in pts], [p.y for p in pts]
            fig, ax = plt.subplots(figsize=(10, 6))
            h = ax.hist2d(xs, ys, bins=bins, range=[[0, self.frame_w], [0, self.frame_h]], cmap="hot_r")
            plt.colorbar(h[3], ax=ax, label="停留频次")
            ax.set_xlim(0, self.frame_w)
            ax.set_ylim(0, self.frame_h)
            ax.set_xlabel("X (px)")
            ax.set_ylabel("Y (px, 左下原点)")
            ax.set_title(f"球员热力图 track_id={track_id}")
            ax.set_aspect("equal", adjustable="box")
            plt.tight_layout()
            plt.savefig(out_path, dpi=200)
            plt.close()
            print(f"热力图已保存 {out_path}")
        except Exception as e:
            print(f"⚠️  热力图生成失败：{e}")
            plt.close()

    def plot_speed_curve(self, track_id: int, out_path: str = "speed_curve.png") -> None:
        try:
            tt, vv = self.speed_series(track_id)
            if len(tt) == 0:
                return
            unit = "m/s" if self.pixels_per_meter else "px/s"
            plt.figure(figsize=(10, 4))
            plt.plot(tt, vv, color="steelblue", linewidth=1.2)
            plt.xlabel("时间 (s)")
            plt.ylabel(f"速度 ({unit})")
            plt.title(f"速度曲线 track_id={track_id}")
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig(out_path, dpi=200)
            plt.close()
            print(f"速度曲线已保存 {out_path}")
        except Exception as e:
            print(f"⚠️  速度曲线生成失败：{e}")
            plt.close()

    def _nearest_person_at(self, t: float, ball_xy: tuple[float, float], exclude_tid: int | None) -> tuple[int | None, float]:
        best_id, best_d = None, float("inf")
        for tid, pts in self.tracks.items():
            if tid == exclude_tid:
                continue
            if not pts or pts[0].cls_name not in self.person_names:
                continue
            for p in pts:
                if abs(p.t - t) < 0.5 / self.fps:
                    d = self._distance(ball_xy, (p.x, p.y))
                    if d < best_d:
                        best_d, best_id = d, tid
        return best_id, best_d

    def infer_passes_and_possession(
        self,
        close_px: float = 80.0,
        min_frames_near: int = 3,
    ) -> None:
        """
        基于球与最近球员距离变化推断传球（启发式，非真实物理传球检测）。
        """
        if self.ball_track_id is None:
            print("未检测到稳定球轨迹，跳过传球推断")
            return

        ball_pts = self.tracks[self.ball_track_id]
        last_owner: int | None = None
        near_count = 0

        for bp in ball_pts:
            owner, dist = self._nearest_person_at(bp.t, (bp.x, bp.y), exclude_tid=self.ball_track_id)
            if owner is None or dist > close_px:
                near_count = 0
                continue
            near_count += 1
            if near_count < min_frames_near:
                continue
            if last_owner is None:
                last_owner = owner
                continue
            if owner != last_owner:
                p0 = next((p for p in self.tracks[last_owner] if p.frame == bp.frame), None)
                p1 = next((p for p in self.tracks[owner] if p.frame == bp.frame), None)
                if p0 and p1:
                    d = self._distance((p0.x, p0.y), (p1.x, p1.y))
                    rec = PassEventRecord(
                        sender_key=str(last_owner),
                        receiver_key=str(owner),
                        distance_px=d,
                        t=bp.t,
                        frame=bp.frame,
                        start_pos=(p0.x, p0.y),
                        end_pos=(p1.x, p1.y),
                    )
                    self.pass_records.append(rec)
                    self.events.append(
                        MatchEvent(
                            "pass",
                            bp.t - 0.5,
                            bp.t + 0.5,
                            min(1.0, 1.0 - dist / close_px),
                            {"sender": last_owner, "receiver": owner},
                        )
                    )
                last_owner = owner
                near_count = 0

    def infer_shots_and_highlights(
        self,
        speed_percentile: float = 92.0,
        goal_band_ratio: float = 0.08,
    ) -> None:
        """高速球 + 靠近画面左右边缘 → 射门/威胁球候选；峰值速度 → 精彩瞬间。"""
        if self.ball_track_id is None:
            return
        _, spd = self.speed_series(self.ball_track_id)
        if len(spd) == 0:
            return
        thresh = float(np.percentile(spd, speed_percentile))
        ball_pts = self.tracks[self.ball_track_id]
        margin = goal_band_ratio * self.frame_w
        for i in range(1, len(ball_pts)):
            p0, p1 = ball_pts[i - 1], ball_pts[i]
            dt = p1.t - p0.t
            if dt <= 0:
                continue
            v = self._distance((p0.x, p0.y), (p1.x, p1.y)) / dt
            if self.pixels_per_meter:
                v /= self.pixels_per_meter
            if v < thresh:
                continue
            x = p1.x
            if x < margin or x > self.frame_w - margin:
                self.events.append(
                    MatchEvent(
                        "shot_candidate",
                        p1.t - 1.0,
                        p1.t + 2.0,
                        min(1.0, v / (thresh + 1e-6)),
                        {"v": v, "x": x, "note": "靠近端线的高速球，需球门标定提高精度"},
                    )
                )
            self.events.append(
                MatchEvent(
                    "highlight_speed",
                    p1.t - 2.0,
                    p1.t + 3.0,
                    min(1.0, v / (thresh + 1e-6)),
                    {"v": v},
                )
            )

    def merge_highlight_windows(self, pad: float = 0.5) -> list[tuple[float, float]]:
        """合并重叠的精彩片段时间，供 ffmpeg 剪辑。"""
        kinds = {"shot_candidate", "highlight_speed", "pass"}
        intervals = sorted((e.t_start - pad, e.t_end + pad) for e in self.events if e.kind in kinds)
        if not intervals:
            return []
        merged = [list(intervals[0])]
        for a, b in intervals[1:]:
            if a <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a, b])
        return [(m[0], m[1]) for m in merged]

    def save_report(self, path: str = "match_analysis_report.json") -> None:
        person_tracks = {k: v for k, v in self.tracks.items() if v and v[0].cls_name in self.person_names}
        summary = {
            "video": self.video_path,
            "resolution": [self.frame_w, self.frame_h],
            "fps": self.fps,
            "ball_track_id": self.ball_track_id,
            "run_distances": {str(tid): round(self.compute_run_distance(tid), 2) for tid in person_tracks},
            "pass_count": len(self.pass_records),
            "events": [asdict(e) for e in self.events],
            "highlight_windows_s": self.merge_highlight_windows(),
            "passes": [asdict(p) for p in self.pass_records],
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        print(f"分析报告已写入 {path}")

    def run_full_analysis(
        self,
        *,
        max_frames: int | None = None,
        show: bool = False,
        annotated_video: str | None = None,
        report_path: str = "match_analysis_report.json",
    ) -> SoccerPassNetwork | None:
        try:
            self.process_video(max_frames=max_frames, show=show, save_annotated=annotated_video)
            self.infer_passes_and_possession()
            self.infer_shots_and_highlights()
            self.save_report(report_path)
            if not self.pass_records:
                print("⚠️  未检测到传球，跳过传球网络生成")
                return None
            split = self.frame_w / 2
            net = SoccerPassNetwork.from_pass_records(self.pass_records, team_split_x=split)
            net.build_network()
            return net
        except Exception as e:
            print(f"⚠️  完整分析流程出现错误，已跳过：{e}")
            return None


def print_ffmpeg_hint(windows: list[tuple[float, float]], video: str, out: str = "highlights.mp4") -> None:
    """控制台提示如何用 ffmpeg 按时间切片（不强制调用 subprocess）。"""
    if not windows:
        print("无精彩片段时间窗")
        return
    print("\n# 示例：将第一段剪出（需本机安装 ffmpeg）")
    s, e = windows[0]
    print(f'ffmpeg -y -ss {s:.2f} -to {e:.2f} -i "{video}" -c copy "clip_0_{out}"')


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    from pathlib import Path

    _ROOT = Path(__file__).resolve().parent
    _OUT = _ROOT / "output"
    _OUT.mkdir(parents=True, exist_ok=True)
    _w = _ROOT / "weights" / "yolo11n.pt"
    _default_model = str(_w) if _w.is_file() else "yolo11n.pt"
    _default_video = str(_ROOT / "samples" / "football.mp4")

    parser = argparse.ArgumentParser(description="足球传球网络演示 / 视频技战术分析")
    parser.add_argument("--mode", choices=("demo", "video"), default="demo")
    parser.add_argument("--model", default=_default_model, help="YOLO 权重（video 模式）")
    parser.add_argument("--video", default=_default_video, help="输入视频路径")
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument("--pixels-per-meter", type=float, default=None, help="标定后填写，可得到米与 m/s")
    parser.add_argument("--no-show", action="store_true", help="不弹窗预览，显著加快处理")
    parser.add_argument("--imgsz", type=int, default=640, help="推理边长，越小越快（如 480）")
    args = parser.parse_args()

    if args.mode == "demo":
        network = SoccerPassNetwork()
        network.generate_multi_passes()
        network.build_network()
        network.visualize(out_path=str(_OUT / "multi_pass_network.png"))
        network.animate_random_pass(gif_path=str(_OUT / "multi_pass_animation.gif"))
    else:
        pipe = SoccerVisionPipeline(
            args.model,
            args.video,
            pixels_per_meter=args.pixels_per_meter,
            imgsz=args.imgsz,
        )
        net = pipe.run_full_analysis(
            max_frames=args.max_frames,
            show=not args.no_show,
            report_path=str(_OUT / "match_analysis_report.json"),
        )
        print_ffmpeg_hint(pipe.merge_highlight_windows(), args.video)
        if net:
            net.visualize(layout="spring", out_path=str(_OUT / "video_pass_network.png"))