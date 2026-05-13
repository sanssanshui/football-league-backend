'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TaskResult {
  id: string;
  videoName: string;
  status: string;
  totalPlayers?: number;
  passCount?: number;
  resultJson?: string;
}

export default function AnalysisResultPage() {
  const { taskId } = useParams();
  const [task, setTask] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(true);

  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const ESTIMATED_SECONDS = 120;

  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    let realProgressInterval: NodeJS.Timeout | null = null;
    let startTime = Date.now();

    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/analysis/task/${taskId}`);
        const data = await res.json();
        if (data.success) {
          setTask(data.data);
          if (data.data.status === 'pending' || data.data.status === 'processing') {
            setTimeout(fetchTask, 3000);
          } else {
            setProgress(100);
          }
        }
      } catch (error) {
        console.error('获取任务状态失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();

    progressInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - startTime) / 1000);
      setElapsed(elapsedSec);
      const newProgress = Math.min(95, Math.floor((elapsedSec / ESTIMATED_SECONDS) * 100));
      setProgress(newProgress);
    }, 1000);

    // 强制刷新预览图
    realProgressInterval = setInterval(() => {
      setPreviewUrl(`/api/analysis/file/${taskId}/preview?${Date.now()}`);
    }, 300);

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (realProgressInterval) clearInterval(realProgressInterval);
    };
  }, [taskId]);

  const remaining = Math.max(0, ESTIMATED_SECONDS - elapsed);
  const remainingText = remaining < 60
    ? `${remaining} 秒`
    : `${Math.floor(remaining / 60)} 分 ${remaining % 60} 秒`;

  if (loading) {
    return <div className="container mx-auto p-8 text-center">加载中...</div>;
  }

  if (!task) {
    return <div className="container mx-auto p-8 text-center">任务不存在</div>;
  }

  // 分析中 → 显示实时画面
  if (task.status === 'pending' || task.status === 'processing') {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">视频正在分析中...</h1>

        <div className="w-full max-w-4xl mx-auto mb-6 rounded-lg overflow-hidden shadow-lg bg-black">
          <img
            src={previewUrl}
            alt="实时检测画面"
            className="w-full object-contain"
            key={previewUrl}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        <p className="mb-2">已运行 {elapsed} 秒，预计还需 {remainingText}</p>
        <p className="text-gray-500 text-sm mb-6">纯CPU环境，2分钟视频需1-3分钟</p>

        <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="mt-4 text-gray-500">{progress}%</p>
      </div>
    );
  }

  if (task.status === 'failed') {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">分析失败</h1>
        <p>请检查视频格式是否正确，或重新上传</p>
      </div>
    );
  }

  const result = task.resultJson ? JSON.parse(task.resultJson) : null;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">分析结果: {task.videoName}</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">检测结果视频</h2>
        <video
          className="w-full rounded-lg shadow"
          controls
          src={`/api/analysis/file/${taskId}/detect_preview.mp4`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">基本信息</h2>
          <p>检测到球员数量: {task.totalPlayers ?? 0}</p>
          <p>检测到传球次数: {task.passCount ?? 0}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">分析图表</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-2">团队核心指标对比</h3>
          <img
            src={`/api/analysis/file/${taskId}/team_metrics.png`}
            alt="团队指标"
            className="w-full"
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-2">团队能力雷达图</h3>
          <img
            src={`/api/analysis/file/${taskId}/team_radar.png`}
            alt="雷达图"
            className="w-full"
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-2">传球网络分析</h3>
          {(task.passCount ?? 0) > 0 ? (
            <img
              src={`/api/analysis/file/${taskId}/pass_network.png`}
              alt="传球网络"
              className="w-full"
            />
          ) : (
            <div className="p-8 text-center text-gray-500">暂无传球数据</div>
          )}
        </div>
      </div>
    </div>
  );
}