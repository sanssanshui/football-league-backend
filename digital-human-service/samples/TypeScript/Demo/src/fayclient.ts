/**
 * Fay WebSocket客户端
 * 连接到Fay的数字人接口（10002端口）
 * 接收嘴型数据
 */

export interface LipData {
    Lip: string;      // viseme名称
    Time: number;     // 持续时间（毫秒）
}

export interface FayMessage {
    Topic: string;
    Data: {
        Key: string;           // "audio"
        Value: string;         // 音频文件路径
        HttpValue: string;     // 音频HTTP URL
        Text: string;          // 文字内容
        Time: number;          // 音频时长（秒）
        Type: string;          // interleaver类型
        IsFirst: number;       // 是否第一句
        IsEnd: number;         // 是否最后一句
        Lips?: LipData[];      // 嘴型数据
        Sentiment?: number;    // 情感值：-2(非常消极) ~ +2(非常积极)
        MotionNo?: number;     // 动作编号（0=idle, 1-26=m01-m26）
        MotionGroup?: string;  // 动作组名（默认为空字符串""）
        [key: string]: any;
    };
    Username: string;
    robot?: string;
}

export class FayClient {
    private ws: WebSocket | null = null;
    private url: string;
    private username: string;
    private onMessageCallback?: (message: FayMessage) => void;
    private onConnectedCallback?: () => void;
    private onDisconnectedCallback?: () => void;
    private reconnectTimer: number | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(url: string, username: string = 'User') {
        this.url = url;
        this.username = username;
    }

    /**
     * 连接到Fay服务器
     */
    connect(): void {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log('[FayClient] Already connected or connecting');
            return;
        }

        console.log(`[FayClient] Connecting to ${this.url}`);

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('[FayClient] ✓ Connected to Fay server');
                this.reconnectAttempts = 0;

                // 发送注册信息和输出设置
                this.send({
                    Username: this.username,
                    Output: true  // 设置为true表示需要接收音频和嘴型数据
                });

                if (this.onConnectedCallback) {
                    this.onConnectedCallback();
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: FayMessage = JSON.parse(event.data);
                    console.log('[FayClient] Received message with Lips data:', message.Data.Lips?.length || 0);

                    if (this.onMessageCallback) {
                        this.onMessageCallback(message);
                    }
                } catch (error) {
                    console.error('[FayClient] Failed to parse message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('[FayClient] Disconnected from Fay server');

                if (this.onDisconnectedCallback) {
                    this.onDisconnectedCallback();
                }

                // 尝试重连
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('[FayClient] WebSocket error:', error);
            };

        } catch (error) {
            console.error('[FayClient] Failed to create WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * 发送消息到Fay服务器
     */
    private send(data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('[FayClient] WebSocket is not connected, cannot send message');
        }
    }

    /**
     * 安排重连
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[FayClient] Max reconnect attempts reached');
            return;
        }

        if (this.reconnectTimer !== null) {
            return; // 已经有重连定时器在运行
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // 指数退避，最大30秒

        console.log(`[FayClient] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * 设置消息回调
     */
    onMessage(callback: (message: FayMessage) => void): void {
        this.onMessageCallback = callback;
    }

    /**
     * 设置连接成功回调
     */
    onConnected(callback: () => void): void {
        this.onConnectedCallback = callback;
    }

    /**
     * 设置断开连接回调
     */
    onDisconnected(callback: () => void): void {
        this.onDisconnectedCallback = callback;
    }

    /**
     * 检查连接状态
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
