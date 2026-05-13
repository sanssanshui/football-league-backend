'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('/api/analysis/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setTaskId(data.taskId);
        // 跳转到结果页面
        router.push(`/analysis/result/${data.taskId}`);
      }
    } catch (error) {
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">足球比赛视频分析</h1>
      
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <input
            type="file"
            accept="video/mp4,video/avi,video/mov"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="video-upload"
          />
          <label htmlFor="video-upload" className="cursor-pointer">
            <p className="text-lg mb-2">点击或拖拽上传视频</p>
            <p className="text-gray-500">支持MP4、AVI、MOV格式</p>
          </label>
          {file && (
            <p className="mt-4 text-green-600">已选择: {file.name}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold disabled:bg-gray-400"
        >
          {uploading ? '上传中...' : '开始分析'}
        </button>
      </form>
    </div>
  );
}