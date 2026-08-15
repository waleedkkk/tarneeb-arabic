import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useLocalRoom } from "@/lib/tarneeb/local-room-context";
import { validateRoomQrData } from "@/lib/tarneeb/local-room-utils";

type Mode = "menu" | "create" | "host" | "join" | "scanner";
type JoinErrorAction = "scan" | "permission" | null;

export function LocalRoomSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const room = useLocalRoom();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinErrorAction, setJoinErrorAction] = useState<JoinErrorAction>(null);

  useEffect(() => {
    if (!visible) return;
    if (room.status === "hosting" || room.status === "ready" || room.status === "playing") {
      setMode(room.role === "host" ? "host" : "join");
    }
  }, [room.role, room.status, visible]);

  useEffect(() => {
    if (mode !== "join") return;
    room.discoverRooms();
    return () => room.stopDiscovering();
  }, [mode, room]);

  const setFlowError = (message: string | null, action: JoinErrorAction = null) => {
    setJoinError(message);
    setJoinErrorAction(action);
  };

  const closeOrLeave = async () => {
    if (room.status !== "idle" || room.role !== null) await room.leaveRoom();
    setFlowError(null);
    setMode("menu");
    onClose();
  };

  const create = async () => {
    setFlowError(null);
    await room.createRoom(name);
  };

  const join = async (data = roomCode) => {
    const result = validateRoomQrData(data);
    if (!result.details) {
      setFlowError(result.message, "scan");
      return;
    }
    setFlowError(null);
    await room.joinRoom(result.details, name);
  };

  const scan = async () => {
    setFlowError(null);
    if (permission?.granted) {
      setMode("scanner");
      return;
    }
    setRequestingCamera(true);
    try {
      const result = await requestPermission();
      if (result.granted) {
        setMode("scanner");
      } else {
        setFlowError(
          result.canAskAgain ? "نحتاج إذن الكاميرا لمسح رمز الغرفة. اضغط المحاولة واسمح بالوصول." : "تم إيقاف إذن الكاميرا. فعّله من إعدادات الهاتف أو استخدم إدخال رمز الغرفة يدويًا.",
          result.canAskAgain ? "permission" : null,
        );
      }
    } catch {
      setFlowError("تعذر فتح الكاميرا الآن. حاول مرة أخرى أو استخدم إدخال رمز الغرفة يدويًا.", "permission");
    } finally {
      setRequestingCamera(false);
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    const parsed = validateRoomQrData(result.data);
    setMode("join");
    if (!parsed.details) {
      setFlowError(parsed.message, "scan");
      return;
    }
    setRoomCode(result.data);
    setFlowError(null);
  };

  const visibleJoinError = joinError ?? (mode === "join" ? room.error : null);
  const retryErrorAction = joinErrorAction === "scan" ? () => void scan() : joinErrorAction === "permission" ? () => void scan() : roomCode.trim() ? () => void join() : undefined;
  const retryErrorLabel = joinErrorAction === "scan" ? "إعادة المسح" : joinErrorAction === "permission" ? "طلب الإذن مجددًا" : "حاول مجددًا";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => void closeOrLeave()}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View><Text style={styles.title}>لعب محلي عبر الشبكة</Text><Text style={styles.subtitle}>أربعة أجهزة على Wi‑Fi أو نقطة الاتصال نفسها</Text></View>
          <Pressable accessibilityLabel="إغلاق الغرفة المحلية" style={({ pressed }) => [styles.close, pressed && styles.pressed]} onPress={() => void closeOrLeave()}><Text style={styles.closeText}>×</Text></Pressable>
        </View>

        {!room.isNativeSupported ? <NativeBuildNotice /> : null}
        {mode !== "join" && room.error ? <ErrorCard message={room.error} /> : null}
        {mode === "menu" && <Menu onCreate={() => setMode("create")} onJoin={() => setMode("join")} disabled={!room.isNativeSupported} />}
        {mode === "create" && <CreateForm name={name} onNameChange={setName} onBack={() => setMode("menu")} onCreate={() => void create()} busy={room.status === "hosting"} />}
        {mode === "host" && <HostLobby onStart={room.startRoomMatch} onLeave={() => void closeOrLeave()} />}
        {mode === "join" && <JoinForm name={name} roomCode={roomCode} onNameChange={setName} onRoomCodeChange={(value) => { setRoomCode(value); setFlowError(null); }} onBack={() => { setFlowError(null); setMode("menu"); }} onScan={() => void scan()} onJoin={() => void join()} busy={room.status === "joining"} requestingCamera={requestingCamera} permissionGranted={Boolean(permission?.granted)} error={visibleJoinError} errorActionLabel={retryErrorLabel} onErrorAction={retryErrorAction} />}
        {mode === "scanner" && <Scanner onBack={() => setMode("join")} onScanned={onBarcodeScanned} />}
      </View>
    </Modal>
  );
}

function Menu({ onCreate, onJoin, disabled }: { onCreate: () => void; onJoin: () => void; disabled: boolean }) {
  return <View style={styles.content}><View style={styles.hero}><Text style={styles.heroIcon}>⌁</Text><Text style={styles.heroTitle}>غرفة خاصة دون إنترنت</Text><Text style={styles.heroText}>يتولى جهاز واحد إدارة القواعد، ثم ينضم أصدقاؤك من أجهزتهم عبر رمز QR.</Text></View><Action label="إنشاء غرفة" hint="أنا المضيف" onPress={onCreate} disabled={disabled} primary /><Action label="انضمام إلى غرفة" hint="امسح رمز QR من المضيف" onPress={onJoin} disabled={disabled} /><View style={styles.note}><Text style={styles.noteTitle}>قبل البدء</Text><Text style={styles.noteText}>يجب اتصال الأجهزة بالشبكة المحلية نفسها. لا تحتاج الغرفة إلى بيانات هاتف أو إنترنت.</Text></View></View>;
}

function CreateForm({ name, onNameChange, onBack, onCreate, busy }: { name: string; onNameChange: (value: string) => void; onBack: () => void; onCreate: () => void; busy: boolean }) {
  return <ScrollView contentContainerStyle={styles.content}><StepTitle title="أنشئ غرفة" text="سيظهر رمز QR لمشاركته مع ثلاثة لاعبين." /><Label text="اسمك على الطاولة" /><TextInput value={name} onChangeText={onNameChange} placeholder="مثال: أحمد" placeholderTextColor="#8FA69A" style={styles.input} maxLength={20} textAlign="right" /><Action label={busy ? "يُنشئ الغرفة…" : "إنشاء الغرفة"} hint={busy ? "نحضّر رمز الدعوة" : ""} onPress={onCreate} disabled={busy} loading={busy} primary /><Back onPress={onBack} /></ScrollView>;
}

function HostLobby({ onStart, onLeave }: { onStart: () => void; onLeave: () => void }) {
  const room = useLocalRoom();
  const connected = room.members.filter((member) => member.connected).length;
  return <ScrollView contentContainerStyle={styles.content}><StepTitle title="غرفتك جاهزة" text="شارك الرمز التالي مع اللاعبين الآخرين." />{room.roomQrData ? <View style={styles.qrCard}><QRCode value={room.roomQrData} size={190} color="#0E3B2E" backgroundColor="#FFF8E7" /><Text style={styles.roomCode}>{room.roomDetails?.roomId}</Text><Text style={styles.qrHint}>يمسح كل لاعب الرمز من جهازه</Text></View> : <LoadingCard title="يُحضّر رمز الدعوة" text="لحظة من فضلك…" />}<View style={styles.membersCard}><View style={styles.memberHeader}><Text style={styles.membersTitle}>اللاعبون</Text><Text style={styles.memberCount}>{connected}/4</Text></View>{[0, 1, 2, 3].map((seat) => { const member = room.members.find((item) => item.seat === seat); return <View key={seat} style={styles.memberRow}><View style={[styles.memberDot, member?.connected && styles.memberDotOnline]} /><Text style={styles.memberName}>{member?.name ?? "بانتظار لاعب"}</Text><Text style={styles.memberSeat}>{seat === 0 ? "المضيف" : `المقعد ${seat + 1}`}</Text></View>; })}</View><Action label={connected === 4 ? "ابدأ المباراة" : `بانتظار ${4 - connected} لاعب`} hint="" onPress={onStart} disabled={connected !== 4} primary /><Back label="إلغاء الغرفة" onPress={onLeave} /></ScrollView>;
}

function JoinForm({ name, roomCode, onNameChange, onRoomCodeChange, onBack, onScan, onJoin, busy, requestingCamera, permissionGranted, error, errorActionLabel, onErrorAction }: { name: string; roomCode: string; onNameChange: (value: string) => void; onRoomCodeChange: (value: string) => void; onBack: () => void; onScan: () => void; onJoin: () => void; busy: boolean; requestingCamera: boolean; permissionGranted: boolean; error: string | null; errorActionLabel: string; onErrorAction?: () => void }) {
  const room = useLocalRoom();
  return <ScrollView contentContainerStyle={styles.content}><StepTitle title="انضم إلى غرفة" text="امسح رمز QR المعروض على جهاز المضيف، أو ألصق الرمز يدويًا." />{error ? <ErrorCard message={error} actionLabel={onErrorAction ? errorActionLabel : undefined} onAction={onErrorAction} /> : null}<Label text="اسمك على الطاولة" /><TextInput value={name} onChangeText={onNameChange} placeholder="مثال: سارة" placeholderTextColor="#8FA69A" style={styles.input} maxLength={20} textAlign="right" /><Action label={requestingCamera ? "يفتح الكاميرا…" : "مسح رمز QR"} hint={requestingCamera ? "يُطلب إذن الكاميرا" : permissionGranted ? "افتح الكاميرا لقراءة الرمز" : "سيُطلب إذن الكاميرا عند المتابعة"} onPress={onScan} disabled={requestingCamera} loading={requestingCamera} primary /><Label text="أو ألصق رمز الغرفة" /><TextInput value={roomCode} onChangeText={onRoomCodeChange} placeholder="tarneeb://local?..." placeholderTextColor="#8FA69A" style={[styles.input, styles.codeInput]} autoCapitalize="none" autoCorrect={false} multiline /><Action label={busy ? "يتصل بالمضيف…" : "انضمام"} hint={busy ? "تأكد من بقاء جهاز المضيف مفتوحًا" : ""} onPress={onJoin} disabled={busy} loading={busy} />{busy ? <LoadingCard title="جارٍ الاتصال بالغرفة" text="نتحقق من الرمز والشبكة المحلية…" /> : null}{room.discoveredRooms.length > 0 ? <View style={styles.discovery}><Text style={styles.discoveryTitle}>غرف مرئية على الشبكة</Text><Text style={styles.discoveryText}>تم العثور على {room.discoveredRooms.length} غرفة. استخدم QR من المضيف للدخول بأمان.</Text></View> : null}<Back onPress={onBack} /></ScrollView>;
}

function Scanner({ onBack, onScanned }: { onBack: () => void; onScanned: (result: BarcodeScanningResult) => void }) {
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);
  const handleScanned = (result: BarcodeScanningResult) => {
    if (reading) return;
    setReading(true);
    onScanned(result);
  };
  return <View style={styles.scannerPage}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onCameraReady={() => setReady(true)} onBarcodeScanned={ready && !reading ? handleScanned : undefined} /><View style={styles.scannerShade}><Text style={styles.scannerTitle}>{reading ? "جارٍ قراءة الرمز…" : "وجّه الكاميرا نحو رمز المضيف"}</Text><Text style={styles.scannerHint}>ضع الرمز داخل الإطار، وتجنب الانعكاس أو الإضاءة الخافتة.</Text><View style={styles.scanBox}>{!ready || reading ? <View style={styles.scannerLoading}><ActivityIndicator color="#E3B341" /><Text style={styles.scannerLoadingText}>{reading ? "نتحقق من الرمز" : "نجهز الكاميرا"}</Text></View> : null}</View><Pressable onPress={onBack} style={({ pressed }) => [styles.scannerBack, pressed && styles.pressed]}><Text style={styles.scannerBackText}>إدخال الرمز يدويًا</Text></Pressable></View></View>;
}

function ErrorCard({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) { return <View style={styles.error}><Text style={styles.errorTitle}>تعذر المتابعة</Text><Text style={styles.errorText}>{message}</Text>{actionLabel && onAction ? <Pressable onPress={onAction} style={({ pressed }) => [styles.errorAction, pressed && styles.pressed]}><Text style={styles.errorActionText}>{actionLabel}</Text></Pressable> : null}</View>; }
function LoadingCard({ title, text }: { title: string; text: string }) { return <View style={styles.loadingCard}><ActivityIndicator color="#E3B341" /><View style={styles.loadingCopy}><Text style={styles.loadingTitle}>{title}</Text><Text style={styles.loadingText}>{text}</Text></View></View>; }
function NativeBuildNotice() { return <View style={styles.warning}><Text style={styles.warningTitle}>يلزم بناء أصلي</Text><Text style={styles.warningText}>الاتصال بين الهواتف يعمل في نسخة Android أو iPhone المبنية، وليس داخل معاينة الويب.</Text></View>; }
function StepTitle({ title, text }: { title: string; text: string }) { return <View style={styles.stepTitle}><Text style={styles.stepTitleText}>{title}</Text><Text style={styles.stepText}>{text}</Text></View>; }
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Back({ onPress, label = "عودة" }: { onPress: () => void; label?: string }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>{label}</Text></Pressable>; }
function Action({ label, hint, onPress, disabled, primary = false, loading = false }: { label: string; hint: string; onPress: () => void; disabled?: boolean; primary?: boolean; loading?: boolean }) { return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.action, primary && styles.actionPrimary, (disabled || loading) && styles.actionDisabled, pressed && !disabled && !loading && styles.pressed]}><View><Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>{hint ? <Text style={[styles.actionHint, primary && styles.actionHintPrimary]}>{hint}</Text> : null}</View>{loading ? <ActivityIndicator color={primary ? "#173C2F" : "#0E3B2E"} /> : <Text style={[styles.actionArrow, primary && styles.actionArrowPrimary]}>‹</Text>}</Pressable>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0E3B2E" }, header: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 16, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderColor: "rgba(255,248,231,0.15)" }, title: { color: "#FFF8E7", fontSize: 23, fontWeight: "900", writingDirection: "rtl" }, subtitle: { color: "#B4D6C7", marginTop: 5, fontSize: 12, writingDirection: "rtl" }, close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }, closeText: { color: "#FFF8E7", fontSize: 25, lineHeight: 29 }, content: { padding: 22, gap: 12, flexGrow: 1 }, hero: { backgroundColor: "#16624A", borderRadius: 24, padding: 22, alignItems: "center", borderWidth: 1, borderColor: "rgba(227,179,65,0.32)", marginBottom: 4 }, heroIcon: { color: "#E3B341", fontSize: 42, lineHeight: 46 }, heroTitle: { color: "#FFF8E7", fontWeight: "900", fontSize: 20, marginTop: 5, writingDirection: "rtl" }, heroText: { color: "#D9EEE4", textAlign: "center", marginTop: 8, lineHeight: 21, writingDirection: "rtl" }, action: { minHeight: 70, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#FFF8E7", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, actionPrimary: { backgroundColor: "#E3B341" }, actionDisabled: { opacity: 0.48 }, actionLabel: { color: "#0E3B2E", fontSize: 17, fontWeight: "900", writingDirection: "rtl" }, actionLabelPrimary: { color: "#173C2F" }, actionHint: { color: "#52635C", fontSize: 12, marginTop: 3, writingDirection: "rtl" }, actionHintPrimary: { color: "#315241" }, actionArrow: { color: "#0E3B2E", fontSize: 32, lineHeight: 33 }, actionArrowPrimary: { color: "#173C2F" }, note: { marginTop: "auto", padding: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)" }, noteTitle: { color: "#F5D889", fontSize: 13, fontWeight: "900", writingDirection: "rtl" }, noteText: { color: "#D9EEE4", marginTop: 5, lineHeight: 19, fontSize: 12, writingDirection: "rtl" }, stepTitle: { marginBottom: 8, alignItems: "flex-end" }, stepTitleText: { color: "#FFF8E7", fontSize: 21, fontWeight: "900", writingDirection: "rtl" }, stepText: { color: "#B4D6C7", textAlign: "right", lineHeight: 20, marginTop: 4, writingDirection: "rtl" }, label: { color: "#D9EEE4", fontWeight: "800", writingDirection: "rtl", textAlign: "right", marginTop: 2 }, input: { backgroundColor: "#FFF8E7", color: "#173C2F", minHeight: 54, borderRadius: 14, paddingHorizontal: 15, fontSize: 16 }, codeInput: { minHeight: 90, paddingTop: 12, textAlignVertical: "top", writingDirection: "ltr", fontSize: 12 }, back: { alignItems: "center", paddingVertical: 12 }, backText: { color: "#D9EEE4", fontWeight: "800", writingDirection: "rtl" }, qrCard: { alignItems: "center", backgroundColor: "#FFF8E7", padding: 20, borderRadius: 24, gap: 10 }, roomCode: { color: "#0E3B2E", fontSize: 28, fontWeight: "900", letterSpacing: 4 }, qrHint: { color: "#52635C", fontSize: 12, writingDirection: "rtl" }, membersCard: { backgroundColor: "rgba(255,255,255,0.08)", padding: 15, borderRadius: 18, gap: 9 }, memberHeader: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 2 }, membersTitle: { color: "#FFF8E7", fontWeight: "900", writingDirection: "rtl" }, memberCount: { color: "#E3B341", fontWeight: "900" }, memberRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, memberDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#788F84" }, memberDotOnline: { backgroundColor: "#58D68D" }, memberName: { color: "#FFF8E7", flex: 1, writingDirection: "rtl", textAlign: "right" }, memberSeat: { color: "#B4D6C7", fontSize: 11, writingDirection: "rtl" }, error: { backgroundColor: "rgba(185, 28, 28, 0.35)", padding: 14, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,229,225,0.42)", gap: 5 }, errorTitle: { color: "#FFE5E1", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, errorText: { color: "#FFE5E1", lineHeight: 19, writingDirection: "rtl", textAlign: "right" }, errorAction: { alignSelf: "flex-end", marginTop: 5, backgroundColor: "#FFE5E1", paddingHorizontal: 13, paddingVertical: 8, borderRadius: 11 }, errorActionText: { color: "#8F1D1D", fontWeight: "900", writingDirection: "rtl" }, warning: { backgroundColor: "rgba(227,179,65,0.18)", margin: 16, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: "rgba(227,179,65,0.5)" }, warningTitle: { color: "#F5D889", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, warningText: { color: "#FFF8E7", fontSize: 12, marginTop: 4, lineHeight: 18, writingDirection: "rtl", textAlign: "right" }, discovery: { backgroundColor: "rgba(56,189,248,0.14)", padding: 13, borderRadius: 14 }, discoveryTitle: { color: "#D9F5FF", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, discoveryText: { color: "#D9F5FF", marginTop: 4, lineHeight: 17, fontSize: 12, writingDirection: "rtl", textAlign: "right" }, loadingCard: { minHeight: 66, borderRadius: 16, backgroundColor: "rgba(227,179,65,0.12)", padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(227,179,65,0.26)" }, loadingCopy: { flex: 1, alignItems: "flex-end" }, loadingTitle: { color: "#F5D889", fontWeight: "900", writingDirection: "rtl" }, loadingText: { color: "#D9EEE4", fontSize: 12, marginTop: 3, writingDirection: "rtl", textAlign: "right" }, scannerPage: { flex: 1, overflow: "hidden" }, camera: { flex: 1 }, scannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.34)", alignItems: "center", justifyContent: "center", padding: 28 }, scannerTitle: { position: "absolute", top: 52, color: "#FFF8E7", fontWeight: "900", fontSize: 18, writingDirection: "rtl" }, scannerHint: { position: "absolute", top: 82, color: "#D9EEE4", fontSize: 12, textAlign: "center", lineHeight: 18, writingDirection: "rtl", maxWidth: 280 }, scanBox: { width: 235, height: 235, borderRadius: 28, borderWidth: 3, borderColor: "#E3B341", alignItems: "center", justifyContent: "center" }, scannerLoading: { backgroundColor: "rgba(14,59,46,0.82)", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, alignItems: "center", gap: 7 }, scannerLoadingText: { color: "#FFF8E7", fontWeight: "800", fontSize: 12, writingDirection: "rtl" }, scannerBack: { position: "absolute", bottom: 44, backgroundColor: "#FFF8E7", paddingHorizontal: 30, paddingVertical: 13, borderRadius: 18 }, scannerBackText: { color: "#0E3B2E", fontWeight: "900", writingDirection: "rtl" }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
