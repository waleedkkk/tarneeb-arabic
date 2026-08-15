import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useLocalRoom } from "@/lib/tarneeb/local-room-context";
import { parseRoomQrData } from "@/lib/tarneeb/local-room-utils";

type Mode = "menu" | "create" | "host" | "join" | "scanner";

export function LocalRoomSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const room = useLocalRoom();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [permission, requestPermission] = useCameraPermissions();

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

  const closeOrLeave = async () => {
    if (room.status !== "idle" && room.status !== "error") await room.leaveRoom();
    setMode("menu");
    onClose();
  };

  const create = async () => {
    await room.createRoom(name);
    if (room.status !== "error") setMode("host");
  };

  const join = async (data = roomCode) => {
    const details = parseRoomQrData(data);
    if (!details) {
      setRoomCode("رمز الغرفة غير صالح. امسح رمز QR من جهاز المضيف.");
      return;
    }
    await room.joinRoom(details, name);
  };

  const scan = async () => {
    const result = await requestPermission();
    if (result.granted) setMode("scanner");
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!parseRoomQrData(result.data)) {
      setRoomCode("لم يتم التعرف على رمز غرفة طرنيب.");
      setMode("join");
      return;
    }
    setRoomCode(result.data);
    setMode("join");
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => void closeOrLeave()}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View><Text style={styles.title}>لعب محلي عبر الشبكة</Text><Text style={styles.subtitle}>أربعة أجهزة على Wi‑Fi أو نقطة الاتصال نفسها</Text></View>
          <Pressable accessibilityLabel="إغلاق الغرفة المحلية" style={({ pressed }) => [styles.close, pressed && styles.pressed]} onPress={() => void closeOrLeave()}><Text style={styles.closeText}>×</Text></Pressable>
        </View>

        {!room.isNativeSupported ? <NativeBuildNotice /> : null}
        {room.error ? <View style={styles.error}><Text style={styles.errorText}>{room.error}</Text></View> : null}

        {mode === "menu" && <Menu onCreate={() => setMode("create")} onJoin={() => setMode("join")} disabled={!room.isNativeSupported} />}
        {mode === "create" && <CreateForm name={name} onNameChange={setName} onBack={() => setMode("menu")} onCreate={() => void create()} busy={room.status === "hosting"} />}
        {mode === "host" && <HostLobby onStart={room.startRoomMatch} onLeave={() => void closeOrLeave()} />}
        {mode === "join" && <JoinForm name={name} roomCode={roomCode} onNameChange={setName} onRoomCodeChange={setRoomCode} onBack={() => setMode("menu")} onScan={() => void scan()} onJoin={() => void join()} busy={room.status === "joining"} permissionGranted={Boolean(permission?.granted)} />}
        {mode === "scanner" && <Scanner onBack={() => setMode("join")} onScanned={onBarcodeScanned} />}
      </View>
    </Modal>
  );
}

function Menu({ onCreate, onJoin, disabled }: { onCreate: () => void; onJoin: () => void; disabled: boolean }) {
  return <View style={styles.content}><View style={styles.hero}><Text style={styles.heroIcon}>⌁</Text><Text style={styles.heroTitle}>غرفة خاصة دون إنترنت</Text><Text style={styles.heroText}>يتولى جهاز واحد إدارة القواعد، ثم ينضم أصدقاؤك من أجهزتهم عبر رمز QR.</Text></View><Action label="إنشاء غرفة" hint="أنا المضيف" onPress={onCreate} disabled={disabled} primary /><Action label="انضمام إلى غرفة" hint="امسح رمز QR من المضيف" onPress={onJoin} disabled={disabled} /><View style={styles.note}><Text style={styles.noteTitle}>قبل البدء</Text><Text style={styles.noteText}>يجب اتصال الأجهزة بالشبكة المحلية نفسها. لا تحتاج الغرفة إلى بيانات هاتف أو إنترنت.</Text></View></View>;
}

function CreateForm({ name, onNameChange, onBack, onCreate, busy }: { name: string; onNameChange: (value: string) => void; onBack: () => void; onCreate: () => void; busy: boolean }) {
  return <ScrollView contentContainerStyle={styles.content}><StepTitle title="أنشئ غرفة" text="سيظهر رمز QR لمشاركته مع ثلاثة لاعبين." /><Label text="اسمك على الطاولة" /><TextInput value={name} onChangeText={onNameChange} placeholder="مثال: أحمد" placeholderTextColor="#8FA69A" style={styles.input} maxLength={20} textAlign="right" /><Action label={busy ? "يُنشئ الغرفة…" : "إنشاء الغرفة"} hint="" onPress={onCreate} disabled={busy} primary /><Back onPress={onBack} /></ScrollView>;
}

function HostLobby({ onStart, onLeave }: { onStart: () => void; onLeave: () => void }) {
  const room = useLocalRoom();
  const connected = room.members.filter((member) => member.connected).length;
  return <ScrollView contentContainerStyle={styles.content}><StepTitle title="غرفتك جاهزة" text="شارك الرمز التالي مع اللاعبين الآخرين." />{room.roomQrData ? <View style={styles.qrCard}><QRCode value={room.roomQrData} size={190} color="#0E3B2E" backgroundColor="#FFF8E7" /><Text style={styles.roomCode}>{room.roomDetails?.roomId}</Text><Text style={styles.qrHint}>يمسح كل لاعب الرمز من جهازه</Text></View> : <ActivityIndicator color="#E3B341" />}<View style={styles.membersCard}><View style={styles.memberHeader}><Text style={styles.membersTitle}>اللاعبون</Text><Text style={styles.memberCount}>{connected}/4</Text></View>{[0, 1, 2, 3].map((seat) => { const member = room.members.find((item) => item.seat === seat); return <View key={seat} style={styles.memberRow}><View style={[styles.memberDot, member?.connected && styles.memberDotOnline]} /><Text style={styles.memberName}>{member?.name ?? "بانتظار لاعب"}</Text><Text style={styles.memberSeat}>{seat === 0 ? "المضيف" : `المقعد ${seat + 1}`}</Text></View>; })}</View><Action label={connected === 4 ? "ابدأ المباراة" : `بانتظار ${4 - connected} لاعب`} hint="" onPress={onStart} disabled={connected !== 4} primary /><Back label="إلغاء الغرفة" onPress={onLeave} /></ScrollView>;
}

function JoinForm({ name, roomCode, onNameChange, onRoomCodeChange, onBack, onScan, onJoin, busy, permissionGranted }: { name: string; roomCode: string; onNameChange: (value: string) => void; onRoomCodeChange: (value: string) => void; onBack: () => void; onScan: () => void; onJoin: () => void; busy: boolean; permissionGranted: boolean }) {
  const room = useLocalRoom();
  return <ScrollView contentContainerStyle={styles.content}><StepTitle title="انضم إلى غرفة" text="امسح رمز QR المعروض على جهاز المضيف." /><Label text="اسمك على الطاولة" /><TextInput value={name} onChangeText={onNameChange} placeholder="مثال: سارة" placeholderTextColor="#8FA69A" style={styles.input} maxLength={20} textAlign="right" /><Action label="مسح رمز QR" hint={permissionGranted ? "افتح الكاميرا" : "سيُطلب إذن الكاميرا عند المتابعة"} onPress={onScan} primary /><Label text="أو ألصق رمز الغرفة" /><TextInput value={roomCode} onChangeText={onRoomCodeChange} placeholder="tarneeb://local?..." placeholderTextColor="#8FA69A" style={[styles.input, styles.codeInput]} autoCapitalize="none" autoCorrect={false} multiline /><Action label={busy ? "يتصل بالمضيف…" : "انضمام"} hint="" onPress={onJoin} disabled={busy} />{room.discoveredRooms.length > 0 ? <View style={styles.discovery}><Text style={styles.discoveryTitle}>غرف مرئية على الشبكة</Text><Text style={styles.discoveryText}>تم العثور على {room.discoveredRooms.length} غرفة. استخدم QR من المضيف للدخول بأمان.</Text></View> : null}<Back onPress={onBack} /></ScrollView>;
}

function Scanner({ onBack, onScanned }: { onBack: () => void; onScanned: (result: BarcodeScanningResult) => void }) {
  return <View style={styles.scannerPage}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScanned} /><View style={styles.scannerShade}><Text style={styles.scannerTitle}>وجّه الكاميرا نحو رمز المضيف</Text><View style={styles.scanBox} /><Pressable onPress={onBack} style={({ pressed }) => [styles.scannerBack, pressed && styles.pressed]}><Text style={styles.scannerBackText}>عودة</Text></Pressable></View></View>;
}

function NativeBuildNotice() { return <View style={styles.warning}><Text style={styles.warningTitle}>يلزم بناء أصلي</Text><Text style={styles.warningText}>الاتصال بين الهواتف يعمل في نسخة Android أو iPhone المبنية، وليس داخل معاينة الويب.</Text></View>; }
function StepTitle({ title, text }: { title: string; text: string }) { return <View style={styles.stepTitle}><Text style={styles.stepTitleText}>{title}</Text><Text style={styles.stepText}>{text}</Text></View>; }
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Back({ onPress, label = "عودة" }: { onPress: () => void; label?: string }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>{label}</Text></Pressable>; }
function Action({ label, hint, onPress, disabled, primary = false }: { label: string; hint: string; onPress: () => void; disabled?: boolean; primary?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, primary && styles.actionPrimary, disabled && styles.actionDisabled, pressed && !disabled && styles.pressed]}><View><Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>{hint ? <Text style={[styles.actionHint, primary && styles.actionHintPrimary]}>{hint}</Text> : null}</View><Text style={[styles.actionArrow, primary && styles.actionArrowPrimary]}>‹</Text></Pressable>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0E3B2E" }, header: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 16, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderColor: "rgba(255,248,231,0.15)" }, title: { color: "#FFF8E7", fontSize: 23, fontWeight: "900", writingDirection: "rtl" }, subtitle: { color: "#B4D6C7", marginTop: 5, fontSize: 12, writingDirection: "rtl" }, close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }, closeText: { color: "#FFF8E7", fontSize: 25, lineHeight: 29 }, content: { padding: 22, gap: 12, flexGrow: 1 }, hero: { backgroundColor: "#16624A", borderRadius: 24, padding: 22, alignItems: "center", borderWidth: 1, borderColor: "rgba(227,179,65,0.32)", marginBottom: 4 }, heroIcon: { color: "#E3B341", fontSize: 42, lineHeight: 46 }, heroTitle: { color: "#FFF8E7", fontWeight: "900", fontSize: 20, marginTop: 5, writingDirection: "rtl" }, heroText: { color: "#D9EEE4", textAlign: "center", marginTop: 8, lineHeight: 21, writingDirection: "rtl" }, action: { minHeight: 70, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#FFF8E7", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, actionPrimary: { backgroundColor: "#E3B341" }, actionDisabled: { opacity: 0.48 }, actionLabel: { color: "#0E3B2E", fontSize: 17, fontWeight: "900", writingDirection: "rtl" }, actionLabelPrimary: { color: "#173C2F" }, actionHint: { color: "#52635C", fontSize: 12, marginTop: 3, writingDirection: "rtl" }, actionHintPrimary: { color: "#315241" }, actionArrow: { color: "#0E3B2E", fontSize: 32, lineHeight: 33 }, actionArrowPrimary: { color: "#173C2F" }, note: { marginTop: "auto", padding: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)" }, noteTitle: { color: "#F5D889", fontSize: 13, fontWeight: "900", writingDirection: "rtl" }, noteText: { color: "#D9EEE4", marginTop: 5, lineHeight: 19, fontSize: 12, writingDirection: "rtl" }, stepTitle: { marginBottom: 8, alignItems: "flex-end" }, stepTitleText: { color: "#FFF8E7", fontSize: 21, fontWeight: "900", writingDirection: "rtl" }, stepText: { color: "#B4D6C7", textAlign: "right", lineHeight: 20, marginTop: 4, writingDirection: "rtl" }, label: { color: "#D9EEE4", fontWeight: "800", writingDirection: "rtl", textAlign: "right", marginTop: 2 }, input: { backgroundColor: "#FFF8E7", color: "#173C2F", minHeight: 54, borderRadius: 14, paddingHorizontal: 15, fontSize: 16 }, codeInput: { minHeight: 90, paddingTop: 12, textAlignVertical: "top", writingDirection: "ltr", fontSize: 12 }, back: { alignItems: "center", paddingVertical: 12 }, backText: { color: "#D9EEE4", fontWeight: "800", writingDirection: "rtl" }, qrCard: { alignItems: "center", backgroundColor: "#FFF8E7", padding: 20, borderRadius: 24, gap: 10 }, roomCode: { color: "#0E3B2E", fontSize: 28, fontWeight: "900", letterSpacing: 4 }, qrHint: { color: "#52635C", fontSize: 12, writingDirection: "rtl" }, membersCard: { backgroundColor: "rgba(255,255,255,0.08)", padding: 15, borderRadius: 18, gap: 9 }, memberHeader: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 2 }, membersTitle: { color: "#FFF8E7", fontWeight: "900", writingDirection: "rtl" }, memberCount: { color: "#E3B341", fontWeight: "900" }, memberRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, memberDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#788F84" }, memberDotOnline: { backgroundColor: "#58D68D" }, memberName: { color: "#FFF8E7", flex: 1, writingDirection: "rtl", textAlign: "right" }, memberSeat: { color: "#B4D6C7", fontSize: 11, writingDirection: "rtl" }, error: { backgroundColor: "rgba(185, 28, 28, 0.35)", marginHorizontal: 22, padding: 12, borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }, errorText: { color: "#FFE5E1", lineHeight: 18, writingDirection: "rtl", textAlign: "right" }, warning: { backgroundColor: "rgba(227,179,65,0.18)", margin: 16, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: "rgba(227,179,65,0.5)" }, warningTitle: { color: "#F5D889", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, warningText: { color: "#FFF8E7", fontSize: 12, marginTop: 4, lineHeight: 18, writingDirection: "rtl", textAlign: "right" }, discovery: { backgroundColor: "rgba(56,189,248,0.14)", padding: 13, borderRadius: 14 }, discoveryTitle: { color: "#D9F5FF", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, discoveryText: { color: "#D9F5FF", marginTop: 4, lineHeight: 17, fontSize: 12, writingDirection: "rtl", textAlign: "right" }, scannerPage: { flex: 1, overflow: "hidden" }, camera: { flex: 1 }, scannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)", alignItems: "center", justifyContent: "center", padding: 28 }, scannerTitle: { position: "absolute", top: 52, color: "#FFF8E7", fontWeight: "900", fontSize: 18, writingDirection: "rtl" }, scanBox: { width: 235, height: 235, borderRadius: 28, borderWidth: 3, borderColor: "#E3B341" }, scannerBack: { position: "absolute", bottom: 44, backgroundColor: "#FFF8E7", paddingHorizontal: 30, paddingVertical: 13, borderRadius: 18 }, scannerBackText: { color: "#0E3B2E", fontWeight: "900", writingDirection: "rtl" }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
