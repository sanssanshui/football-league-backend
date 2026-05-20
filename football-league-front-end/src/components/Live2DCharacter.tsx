"use client";

import { useEffect, useState, useCallback } from "react";
import { ResourceModel, SENTIO_CHARACTER_FREE_MODELS } from "@/lib/protocol";

interface Live2DCharacterProps {
  modelName?: string;
  className?: string;
  onReady?: () => void;
  onModelChanged?: (model: string) => void;
}

export const AVAILABLE_MODELS = SENTIO_CHARACTER_FREE_MODELS.map((m) => m.name);

export function getModelByName(name: string): ResourceModel | undefined {
  return SENTIO_CHARACTER_FREE_MODELS.find((m) => m.name === name);
}

let _initialized = false;

export default function Live2DCharacter({
  modelName = "HaruGreeter",
  className = "",
  onReady,
  onModelChanged,
}: Live2DCharacterProps) {
  const [ready, setReady] = useState(false);

  // Poll for model readiness
  const pollReady = useCallback(() => {
    import("@/lib/live2d/live2dManager").then(({ Live2dManager }) => {
      if (Live2dManager.getInstance().isReady()) {
        setReady(true);
        onReady?.();
      } else {
        requestAnimationFrame(pollReady);
      }
    }).catch(() => {
      requestAnimationFrame(pollReady);
    });
  }, [onReady]);

  // Initialize Live2D on mount
  useEffect(() => {
    if (_initialized) {
      // Already initialized: just poll and switch character
      const char = getModelByName(modelName);
      if (char) {
        import("@/lib/live2d/live2dManager").then(({ Live2dManager }) => {
          setReady(false);
          Live2dManager.getInstance().changeCharacter(char);
          requestAnimationFrame(pollReady);
        });
      }
      return;
    }

    let cancelled = false;

    const init = async () => {
      // Wait for CubismCore script
      let retries = 0;
      while (!(window as any).Live2DCubismCore && retries < 100) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }
      if (!(window as any).Live2DCubismCore) {
        console.error("[Live2D] CubismCore failed to load");
        return;
      }
      if (cancelled) return;

      try {
        const [{ LAppDelegate }, { Live2dManager }] = await Promise.all([
          import("@/lib/live2d/src/lappdelegate"),
          import("@/lib/live2d/live2dManager"),
        ]);

        const app = LAppDelegate.getInstance();
        app.initialize();
        app.run();
        _initialized = true;

        const char = getModelByName(modelName);
        if (char) {
          Live2dManager.getInstance().changeCharacter(char);
        }

        requestAnimationFrame(pollReady);
      } catch (err) {
        console.error("[Live2D] Init error:", err);
      }
    };

    init();

    const handleResize = () => {
      import("@/lib/live2d/src/lappdelegate").then(({ LAppDelegate }) => {
        LAppDelegate.getInstance().onResize();
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Handle model switching - with separate effect keyed by modelName
  useEffect(() => {
    if (!_initialized) return;

    const char = getModelByName(modelName);
    if (!char) return;

    import("@/lib/live2d/live2dManager").then(({ Live2dManager }) => {
      setReady(false);
      Live2dManager.getInstance().changeCharacter(char);
      onModelChanged?.(modelName);
      requestAnimationFrame(pollReady);
    });
  }, [modelName]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 rounded-xl">
          <span className="text-white/40 text-sm">AI角色加载中...</span>
        </div>
      )}
      <canvas
        id="live2dCanvas"
        className="w-full h-full"
        style={{ background: "transparent" }}
      />
    </div>
  );
}
