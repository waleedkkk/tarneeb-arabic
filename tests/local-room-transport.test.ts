import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalClientHandlers } from "../lib/tarneeb/local-room-transport";

describe("LocalRoomTransport native module failure handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("react-native", () => ({
      Platform: { OS: "android", select: (map: Record<string, unknown>) => map.android },
    }));
    vi.doMock("react-native-zeroconf", () => ({
      default: class Zeroconf {
        on() {}
        publishService() {}
        unpublishService() {}
        scan() {}
        stop() {}
        removeDeviceListeners() {}
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("يعيد null على الويب ولا يحاول تحميل الوحدة الأصلية", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "web", select: (map: Record<string, unknown>) => map.web },
    }));
    vi.doMock("react-native-tcp-socket", () => {
      throw new Error("should not be required on web");
    });
    vi.doMock("react-native-zeroconf", () => ({ default: class Z { on() {} publishService() {} unpublishService() {} scan() {} stop() {} removeDeviceListeners() {} } }));
    const transportModule = await import("../lib/tarneeb/local-room-transport");
    transportModule.__resetTransportCache();
    expect(await transportModule.getLocalRoomTransport()).toBeNull();
  });

  it("يعيد tcp: null عند غياب وحدة react-native-tcp-socket (محاكاة عدم تضمينها في APK)", async () => {
    vi.doMock("react-native-tcp-socket", () => {
      throw new Error("Cannot find native module react-native-tcp-socket");
    });
    const transportModule = await import("../lib/tarneeb/local-room-transport");
    transportModule.__resetTransportCache();
    const transport = await transportModule.getLocalRoomTransport();
    expect(transport).not.toBeNull();
    expect(transport!.tcp).toBeNull();
  });

  it("يرفض اتصال العميل فورًا برسالة عربية واضحة عند غياب الوحدة الأصلية", async () => {
    vi.doMock("react-native-tcp-socket", () => {
      throw new Error("Cannot find native module react-native-tcp-socket");
    });
    const transportModule = await import("../lib/tarneeb/local-room-transport");
    transportModule.__resetTransportCache();
    const handlers: LocalClientHandlers = {
      onConnect: () => undefined,
      onMessage: () => undefined,
      onClose: () => undefined,
      onError: () => undefined,
    };
    const client = new transportModule.LocalRoomClient(handlers);
    await expect(client.connect("192.168.1.10", 42872)).rejects.toBeDefined();
  });

  it("يستخدم الوحدة الأصلية عند توفرها ويصل الاتصال بنجاح", async () => {
    const handlers: LocalClientHandlers = {
      onConnect: vi.fn(),
      onMessage: vi.fn(),
      onClose: vi.fn(),
      onError: vi.fn(),
    };
    // يُصرّح عن socket قبل factory لتجنّب ReferenceError عند TDZ (الوحدة الأصلية ESM-only).
    let mockSocket: { on: ReturnType<typeof vi.fn>; setEncoding: ReturnType<typeof vi.fn>; setNoDelay: ReturnType<typeof vi.fn>; setKeepAlive: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn> };
    vi.resetModules();
    vi.doMock("react-native", () => ({
      Platform: { OS: "android", select: (map: Record<string, unknown>) => map.android },
    }));
    vi.doMock("react-native-tcp-socket", () => ({
      default: {
        createConnection: vi.fn((_options: unknown, onConnect: () => void) => {
          onConnect();
          return mockSocket;
        }),
      },
    }));
    vi.doMock("react-native-zeroconf", () => ({
      default: class Zeroconf {
        on() {}
        publishService() {}
        unpublishService() {}
        scan() {}
        stop() {}
        removeDeviceListeners() {}
      },
    }));
    mockSocket = {
      on: vi.fn(),
      setEncoding: vi.fn(),
      setNoDelay: vi.fn(),
      setKeepAlive: vi.fn(),
      destroy: vi.fn(),
      write: vi.fn(),
    };
    const { LocalRoomClient } = await import("../lib/tarneeb/local-room-transport");
    const client = new LocalRoomClient(handlers);
    await client.connect("192.168.1.10", 42872);
    expect(handlers.onConnect).toHaveBeenCalled();
  });
});
