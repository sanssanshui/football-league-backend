import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_DIGITAL_HUMAN_SOCKET || "http://localhost:5100";

interface UseDigitalHumanSocketOptions {
  onTextChunk?: (content: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (msg: string) => void;
}

export function useDigitalHumanSocket(options: UseDigitalHumanSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  const mountedRef = useRef(true);
  optionsRef.current = options;

  useEffect(() => {
    mountedRef.current = true;

    let socket: Socket | null = null;

    try {
      socket = io(SOCKET_URL, {
        path: "/ws/digital-human",
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnectionAttempts: 3,
        timeout: 5000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (!mountedRef.current) return;
        console.log("[DigitalHumanSocket] Connected");
      });

      socket.on("text_chunk", (content: string) => {
        if (!mountedRef.current) return;
        optionsRef.current.onTextChunk?.(content);
      });

      socket.on("done", (fullText: string) => {
        if (!mountedRef.current) return;
        optionsRef.current.onDone?.(fullText);
      });

      socket.on("error", (msg: string) => {
        if (!mountedRef.current) return;
        optionsRef.current.onError?.(msg);
      });

      socket.on("connect_error", () => {
        // Silently ignore — SSE streaming is the primary channel
      });

      socket.on("disconnect", () => {
        // Silently ignore
      });
    } catch {
      // Socket.IO not available or connection failed — gracefully skip
    }

    return () => {
      mountedRef.current = false;
      if (socket) {
        try { socket.disconnect(); } catch {}
        socketRef.current = null;
      }
    };
  }, []);
}
