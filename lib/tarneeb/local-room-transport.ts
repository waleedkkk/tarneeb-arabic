import { Platform } from "react-native";
import type Server from "react-native-tcp-socket/lib/types/Server";
import type Socket from "react-native-tcp-socket/lib/types/Socket";

export const LOCAL_ROOM_PORT = 42872;

export type LocalRoomSocketMessage = Record<string, unknown> & { type: string };

type TcpModule = typeof import("react-native-tcp-socket").default;
type SocketHandler = (message: LocalRoomSocketMessage, socket: Socket) => void;

export interface LocalHostHandlers {
  onConnect: (socket: Socket) => void;
  onMessage: SocketHandler;
  onClose: (socket: Socket) => void;
  onError: (message: string) => void;
}

export interface LocalClientHandlers {
  onConnect: () => void;
  onMessage: (message: LocalRoomSocketMessage) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

export interface DiscoveredLocalRoom {
  name: string;
  roomId: string;
  host: string;
  port: number;
}

function getTcp(): TcpModule | null {
  if (Platform.OS === "web") return null;
  // تُحمّل الوحدة الأصلية فقط على الهاتف حتى تبقى معاينة الويب قابلة للتشغيل.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require("react-native-tcp-socket") as { default?: TcpModule } & TcpModule;
  return module.default ?? module;
}

function parseChunk(
  chunk: unknown,
  pending: string,
  handle: (message: LocalRoomSocketMessage) => void,
): string {
  const text = typeof chunk === "string" ? chunk : String(chunk);
  const lines = `${pending}${text}`.split("\n");
  const remainder = lines.pop() ?? "";
  lines.forEach((line) => {
    if (!line.trim()) return;
    try {
      const candidate: unknown = JSON.parse(line);
      if (candidate && typeof candidate === "object" && "type" in candidate) {
        handle(candidate as LocalRoomSocketMessage);
      }
    } catch {
      // تتجاهل الرسائل غير الصالحة، ولا تسمح لها بإيقاف جلسة اللاعبين.
    }
  });
  return remainder;
}

export function sendLocalRoomMessage(socket: Socket, message: LocalRoomSocketMessage) {
  socket.write(`${JSON.stringify(message)}\n`, "utf8");
}

export class LocalRoomHost {
  private server: Server | null = null;
  private clients = new Set<Socket>();
  private buffers = new Map<Socket, string>();

  constructor(private readonly handlers: LocalHostHandlers) {}

  async start(port = LOCAL_ROOM_PORT): Promise<void> {
    const tcp = getTcp();
    if (!tcp) throw new Error("تتطلب استضافة غرفة محلية نسخة أصلية من التطبيق على هاتفك.");
    if (this.server) return;

    await new Promise<void>((resolve, reject) => {
      const server = tcp.createServer((socket) => {
        this.clients.add(socket);
        this.buffers.set(socket, "");
        socket.setEncoding("utf8");
        socket.setNoDelay(true);
        socket.setKeepAlive(true);
        socket.on("data", (chunk) => {
          const pending = this.buffers.get(socket) ?? "";
          this.buffers.set(socket, parseChunk(chunk, pending, (message) => this.handlers.onMessage(message, socket)));
        });
        socket.on("error", (error: Error) => this.handlers.onError(error.message));
        socket.on("close", () => {
          this.clients.delete(socket);
          this.buffers.delete(socket);
          this.handlers.onClose(socket);
        });
        this.handlers.onConnect(socket);
      });
      server.once("error", reject);
      server.listen({ port, host: "0.0.0.0", reuseAddress: true }, () => {
        server.removeListener("error", reject);
        this.server = server;
        resolve();
      });
    });
  }

  broadcast(message: LocalRoomSocketMessage) {
    this.clients.forEach((socket) => sendLocalRoomMessage(socket, message));
  }

  send(socket: Socket, message: LocalRoomSocketMessage) {
    sendLocalRoomMessage(socket, message);
  }

  async stop() {
    this.clients.forEach((socket) => socket.destroy());
    this.clients.clear();
    this.buffers.clear();
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

export class LocalRoomClient {
  private socket: Socket | null = null;
  private buffer = "";

  constructor(private readonly handlers: LocalClientHandlers) {}

  async connect(host: string, port: number): Promise<void> {
    const tcp = getTcp();
    if (!tcp) throw new Error("تتطلب الغرفة المحلية نسخة أصلية من التطبيق على هاتفك.");
    if (this.socket) this.disconnect();

    await new Promise<void>((resolve, reject) => {
      let connected = false;
      const socket = tcp.createConnection({ host, port, connectTimeout: 8000 }, () => {
        connected = true;
        this.socket = socket;
        socket.setEncoding("utf8");
        socket.setNoDelay(true);
        socket.setKeepAlive(true);
        this.handlers.onConnect();
        resolve();
      });
      socket.on("data", (chunk: string | Uint8Array) => {
        this.buffer = parseChunk(chunk, this.buffer, this.handlers.onMessage);
      });
      socket.on("error", (error: Error) => {
        this.handlers.onError(error.message);
        if (!connected) reject(error);
      });
      socket.on("close", () => {
        this.socket = null;
        this.handlers.onClose();
        if (!connected) reject(new Error("تعذر الوصول إلى مضيف الغرفة."));
      });
    });
  }

  send(message: LocalRoomSocketMessage) {
    if (!this.socket) throw new Error("الاتصال بالغرفة غير جاهز.");
    sendLocalRoomMessage(this.socket, message);
  }

  disconnect() {
    this.socket?.destroy();
    this.socket = null;
    this.buffer = "";
  }
}

function getZeroconf(): (new () => {
  on: (event: string, listener: (service: Record<string, unknown>) => void) => void;
  publishService: (type: string, protocol: string, domain: string, name: string, port: number, txt: Record<string, string>, implType?: string) => void;
  unpublishService: (name: string, implType?: string) => void;
  scan: (type: string, protocol: string, domain: string, implType?: string) => void;
  stop: (implType?: string) => void;
  removeDeviceListeners: () => void;
}) | null {
  if (Platform.OS === "web") return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-zeroconf").default;
}

export function publishLocalRoom(name: string, roomId: string, port: number): () => void {
  const Zeroconf = getZeroconf();
  if (!Zeroconf) return () => undefined;
  const zeroconf = new Zeroconf();
  zeroconf.publishService("tarneeb", "tcp", "local.", name, port, { roomId, protocol: "1" }, "DNSSD");
  return () => {
    zeroconf.unpublishService(name, "DNSSD");
    zeroconf.removeDeviceListeners();
  };
}

export function discoverLocalRooms(onRoom: (room: DiscoveredLocalRoom) => void): () => void {
  const Zeroconf = getZeroconf();
  if (!Zeroconf) return () => undefined;
  const zeroconf = new Zeroconf();
  zeroconf.on("resolved", (service) => {
    const addresses = Array.isArray(service.addresses) ? service.addresses : [];
    const txt = service.txt && typeof service.txt === "object" ? service.txt as Record<string, unknown> : {};
    const host = addresses.find((address): address is string => typeof address === "string" && /^\d+\.\d+\.\d+\.\d+$/.test(address));
    if (!host || typeof service.name !== "string" || typeof service.port !== "number" || typeof txt.roomId !== "string" || txt.protocol !== "1") return;
    onRoom({ name: service.name, roomId: txt.roomId, host, port: service.port });
  });
  zeroconf.scan("tarneeb", "tcp", "local.", "DNSSD");
  return () => {
    zeroconf.stop("DNSSD");
    zeroconf.removeDeviceListeners();
  };
}
