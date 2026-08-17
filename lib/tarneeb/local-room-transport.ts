import { Platform } from "react-native";
import type Server from "react-native-tcp-socket/lib/types/Server";
import type Socket from "react-native-tcp-socket/lib/types/Socket";

import { LOCAL_ROOM_JOIN_TIMEOUT_MS } from "./local-room-utils";

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

let cachedTcp: TcpModule | null | undefined = undefined;

/** يعيد تعيين الكاش الداخلي — يُستخدم في الاختبارات بعد vi.resetModules. */
export function __resetTransportCache() {
  cachedTcp = undefined;
  cachedZeroconf = undefined;
}

let lastCheckedPlatform: string | null = null;

async function getTcp(): Promise<TcpModule | null> {
  if (Platform.OS === "web") return null;
  // تُحسب الوحدة الأصلية مرة واحدة لكل منصة؛ يُعاد الحساب عند تغيّرها (مفيد في الاختبارات).
  if (cachedTcp !== undefined && lastCheckedPlatform === Platform.OS) return cachedTcp;
  lastCheckedPlatform = Platform.OS;
  try {
    const module = (await import("react-native-tcp-socket")) as { default?: TcpModule } & TcpModule;
    const tcp = module.default ?? module;
    cachedTcp = tcp && typeof tcp.createConnection === "function" ? tcp : null;
  } catch {
    cachedTcp = null;
  }
  return cachedTcp;
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
    const tcp = await getTcp();
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
    const tcp = await getTcp();
    if (!tcp) throw new Error("تتطلب الغرفة المحلية نسخة أصلية من التطبيق على هاتفك.");
    if (this.socket) this.disconnect();

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let connected = false;
      const finishOnce = (handler: () => void) => {
        if (settled) return;
        settled = true;
        handler();
      };
      try {
        // يُستخدم let مع متغير مرجعي لتجنّب TDZ إن نُفّذ callback المتصل اتصالًا بشكل متزامن قبل اكتمال التعيين.
        let socketRef: Socket;
        socketRef = tcp.createConnection({ host, port, connectTimeout: LOCAL_ROOM_JOIN_TIMEOUT_MS + 1000 }, () => {
          connected = true;
          if (socketRef) this.socket = socketRef;
          if (socketRef) {
            socketRef.setEncoding("utf8");
            socketRef.setNoDelay(true);
            socketRef.setKeepAlive(true);
          }
          this.handlers.onConnect();
          resolve();
        });
        this.socket = socketRef;
        socketRef.on("data", (chunk: string | Uint8Array) => {
          this.buffer = parseChunk(chunk, this.buffer, this.handlers.onMessage);
        });
        socketRef.on("error", (error: Error) => {
          finishOnce(() => {
            this.handlers.onError(error.message);
            reject(error);
          });
        });
        socketRef.on("close", () => {
          this.socket = null;
          this.handlers.onClose();
          finishOnce(() => reject(new Error("تعذر الوصول إلى مضيف الغرفة.")));
        });
      } catch (error) {
        finishOnce(() => {
          this.handlers.onError(error instanceof Error ? error.message : "خطأ في بدء الاتصال المحلي.");
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      }
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

let cachedZeroconf: ReturnType<typeof loadZeroconf> | undefined = undefined;

function loadZeroconf() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require("react-native-zeroconf") as { default?: unknown };
    const Ctor = (module.default ?? module) as new () => {
      on: (event: string, listener: (service: Record<string, unknown>) => void) => void;
      publishService: (type: string, protocol: string, domain: string, name: string, port: number, txt: Record<string, string>, implType?: string) => void;
      unpublishService: (name: string, implType?: string) => void;
      scan: (type: string, protocol: string, domain: string, implType?: string) => void;
      stop: (implType?: string) => void;
      removeDeviceListeners: () => void;
    };
    return Ctor?.prototype && Ctor.prototype.scan ? Ctor : null;
  } catch {
    return null;
  }
}

function getZeroconf(): ReturnType<typeof loadZeroconf> | null {
  if (Platform.OS === "web") return null;
  if (cachedZeroconf === undefined) cachedZeroconf = loadZeroconf();
  return cachedZeroconf;
}

/** يكشف ما إذا كانت وحدات النقل الأصلية متوفرة في النسخة المبنية. */
export async function getLocalRoomTransport(): Promise<{ tcp: TcpModule | null; zeroconf: ReturnType<typeof loadZeroconf> } | null> {
  if (Platform.OS === "web") return null;
  const tcp = await getTcp();
  const zeroconf = getZeroconf();
  return { tcp, zeroconf };
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
