/**
 * VoiceWebSocketClient — manages the WebSocket connection to the voice coaching
 * Lambda via API Gateway WebSocket API.
 *
 * Binary frame format sent to server:
 *   Bytes 0-3:  profile_id  (uint32 big-endian)
 *   Byte  4:    format byte (0x01=webm, 0x02=mp3, 0x03=wav, 0x04=ogg)
 *   Bytes 5+:   raw audio bytes
 */

export type VoiceMessage =
  | { type: "audio_response"; transcript: string; response_text: string; audio_base64: string; audio_format: string }
  | { type: "pong" }
  | { type: "error"; message: string };

const FORMAT_BYTES: Record<string, number> = {
  webm: 0x01,
  mp3: 0x02,
  wav: 0x03,
  ogg: 0x04,
};

export class VoiceWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // ms, doubles each attempt

  onMessage?: (msg: VoiceMessage) => void;
  onStatusChange?: (status: "connected" | "disconnected" | "error") => void;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.onStatusChange?.("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: VoiceMessage = JSON.parse(event.data as string);
        this.onMessage?.(msg);
      } catch {
        // binary or non-JSON — ignore
      }
    };

    this.ws.onerror = () => {
      this.onStatusChange?.("error");
    };

    this.ws.onclose = () => {
      this.onStatusChange?.("disconnected");
      this._scheduleReconnect();
    };
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent auto-reconnect
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Pack and send an audio buffer with the 5-byte binary header.
   * @param buffer   Raw audio ArrayBuffer from MediaRecorder
   * @param profileId Numeric profile ID
   * @param format   "webm" | "mp3" | "wav" | "ogg"
   */
  sendAudio(buffer: ArrayBuffer, profileId: number, format = "webm"): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const header = new ArrayBuffer(5);
    const view = new DataView(header);
    view.setUint32(0, profileId, false); // big-endian
    view.setUint8(4, FORMAT_BYTES[format] ?? 0x01);

    // Concatenate header + audio
    const frame = new Uint8Array(5 + buffer.byteLength);
    frame.set(new Uint8Array(header), 0);
    frame.set(new Uint8Array(buffer), 5);

    this.ws.send(frame.buffer);
  }

  sendPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "ping" }));
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay *= 2; // exponential backoff
  }
}
