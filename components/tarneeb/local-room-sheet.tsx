import { arabicRow } from "@/lib/rtl-style";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useLocalRoom } from "@/lib/tarneeb/local-room-context";
import { LOCAL_ROOM_JOIN_TIMEOUT_MS, roomConnectionCountdownCopy, validateRoomQrData } from "@/lib/tarneeb/local-room-utils";
import { partnerSeat } from "@/lib/tarneeb/local-room-plan";
import { AI_PERSONAS } from "@/lib/tarneeb/personas";
import type { AiPersonaId, Seat } from "@/lib/tarneeb/types";

type Mode = "menu" | "create" | "host" | "join" | "scanner";
type JoinErrorAction = "retry" | "scan" | "permission" | null;

export function LocalRoomSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const room = useLocalRoom();
  const { discoverRooms, leaveRoom, stopDiscovering } = room;
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinErrorAction, setJoinErrorAction] = useState<JoinErrorAction>(null);
  const [joinMillisecondsRemaining, setJoinMillisecondsRemaining] = useState(LOCAL_ROOM_JOIN_TIMEOUT_MS);
  const [showJoinSuccess, setShowJoinSuccess] = useState(false);
  const previousRoomStatus = useRef(room.status);
  const joinSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (room.status === "hosting" || room.status === "ready" || room.status === "playing") {
      setMode(room.role === "host" ? "host" : "join");
    }
  }, [room.role, room.status, visible]);

  useEffect(() => {
    const joinedNow = visible && room.role === "client" && room.status === "ready" && previousRoomStatus.current === "joining";
    previousRoomStatus.current = room.status;
    if (!joinedNow) return;
    if (joinSuccessTimer.current) clearTimeout(joinSuccessTimer.current);
    setShowJoinSuccess(true);
    joinSuccessTimer.current = setTimeout(() => {
      setShowJoinSuccess(false);
      joinSuccessTimer.current = null;
    }, 1600);
  }, [room.role, room.status, visible]);

  useEffect(() => () => {
    if (joinSuccessTimer.current) clearTimeout(joinSuccessTimer.current);
  }, []);

  useEffect(() => {
    if (mode !== "join") return;
    discoverRooms();
    return () => stopDiscovering();
  }, [discoverRooms, mode, stopDiscovering]);

  useEffect(() => {
    if (room.status !== "joining") {
      setJoinMillisecondsRemaining(LOCAL_ROOM_JOIN_TIMEOUT_MS);
      return;
    }
    const deadline = Date.now() + LOCAL_ROOM_JOIN_TIMEOUT_MS;
    const update = () => setJoinMillisecondsRemaining(Math.max(0, deadline - Date.now()));
    update();
    const interval = setInterval(update, 250);
    const timeout = setTimeout(() => {
      setJoinError("انتهت مهلة الاتصال. تأكد من اتصال الأجهزة بالشبكة نفسها ومن بقاء غرفة المضيف مفتوحة، ثم حاول مجددًا.");
      setJoinErrorAction("retry");
      void leaveRoom();
    }, LOCAL_ROOM_JOIN_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [leaveRoom, room.status]);

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
  const retryErrorAction = joinErrorAction === "scan" ? () => void scan() : joinErrorAction === "permission" ? () => void scan() : joinErrorAction === "retry" || roomCode.trim() ? () => void join() : undefined;
  const retryErrorLabel = joinErrorAction === "scan" ? "إعادة المسح" : joinErrorAction === "permission" ? "طلب الإذن مجددًا" : "إعادة المحاولة";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => void closeOrLeave()}>
      <SafeAreaView style={styles.page} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <View><Text style={styles.title}>لعب محلي عبر الشبكة</Text><Text style={styles.subtitle}>من لاعبين إلى أربعة على Wi‑Fi أو نقطة الاتصال نفسها</Text></View>
          <Pressable accessibilityLabel="إغلاق الغرفة المحلية" style={({ pressed }) => [styles.close, pressed && styles.pressed]} onPress={() => void closeOrLeave()}><Text style={styles.closeText}>×</Text></Pressable>
        </View>

        {!room.nativeSupported ? <NativeBuildNotice /> : null}
        {mode !== "join" && room.error ? <ErrorCard message={room.error} /> : null}
        {mode === "menu" && <Menu onCreate={() => setMode("create")} onJoin={() => setMode("join")} disabled={!room.nativeSupported} />}
        {mode === "create" && <CreateForm name={name} onNameChange={setName} onBack={() => setMode("menu")} onCreate={() => void create()} busy={room.status === "hosting"} />}
        {mode === "host" && <HostLobby onStart={room.startRoomMatch} onLeave={() => void closeOrLeave()} />}
        {mode === "join" && <JoinForm name={name} roomCode={roomCode} onNameChange={setName} onRoomCodeChange={(value) => { setRoomCode(value); setFlowError(null); }} onBack={() => { setFlowError(null); setMode("menu"); }} onScan={() => void scan()} onJoin={() => void join()} onCancel={() => void room.leaveRoom()} busy={room.status === "joining"} millisecondsRemaining={joinMillisecondsRemaining} requestingCamera={requestingCamera} permissionGranted={Boolean(permission?.granted)} error={visibleJoinError} errorActionLabel={retryErrorLabel} onErrorAction={retryErrorAction} />}
        {mode === "scanner" && <Scanner onBack={() => setMode("join")} onScanned={onBarcodeScanned} />}
        <JoinSuccessToast visible={showJoinSuccess} />
      </SafeAreaView>
    </Modal>
  );
}

function Menu({ onCreate, onJoin, disabled }: { onCreate: () => void; onJoin: () => void; disabled: boolean }) {
  return <View style={styles.content}><View style={styles.hero}><Text style={styles.heroIcon}>⌁</Text><Text style={styles.heroTitle}>لعب مع أصدقائك قريبًا</Text><Text style={styles.heroText}>أنشئ الغرفة من جهاز واحد، ثم يقرأ اللاعبون رمز الدعوة من هواتفهم.</Text></View><View style={styles.networkReady}><View style={styles.networkDot} /><Text style={styles.networkReadyText}>الخطوة الأولى: اتصلوا بالشبكة المحلية نفسها</Text></View><Action label="إنشاء غرفة" hint="للمضيف: اعرض رمز الدعوة للاعبين" onPress={onCreate} disabled={disabled} primary /><Action label="انضمام إلى غرفة" hint="للاعب: امسح رمز QR من جهاز المضيف" onPress={onJoin} disabled={disabled} /><View style={styles.note}><Text style={styles.noteTitle}>كيف تعمل الغرفة؟</Text><Text style={styles.noteText}>١. ينشئ لاعب غرفة. ٢. ينضم لاعب واحد على الأقل. ٣. يوافق المضيف على الخصوم الافتراضيين ثم يبدأ المباراة.</Text></View></View>;
}

function CreateForm({ name, onNameChange, onBack, onCreate, busy }: { name: string; onNameChange: (value: string) => void; onBack: () => void; onCreate: () => void; busy: boolean }) {
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><FlowProgress current={1} /><StepTitle title="أنشئ غرفتك" text="اكتب الاسم الذي سيظهر لزملائك، ثم سننشئ رمز دعوة فريدًا." /><Label text="اسمك على الطاولة" /><TextInput value={name} onChangeText={onNameChange} placeholder="مثال: أحمد" placeholderTextColor="#8FA69A" style={styles.input} maxLength={20} textAlign="right" /><Text style={styles.fieldHint}>هذا الاسم يظهر في قائمة اللاعبين فقط.</Text><Action label={busy ? "يُنشئ الغرفة…" : "إنشاء الغرفة"} hint={busy ? "نحضّر رمز الدعوة" : name.trim() ? "بعدها شارك رمز QR مع أصدقائك" : "اكتب اسمك للمتابعة"} onPress={onCreate} disabled={busy || !name.trim()} loading={busy} primary /><Back onPress={onBack} /></ScrollView>;
}

function HostLobby({ onStart, onLeave }: { onStart: () => void; onLeave: () => void }) {
  const room = useLocalRoom();
  const humans = room.members.filter((member) => member.connected && !member.isVirtual).length;
  const canStart = humans >= 2;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><FlowProgress current={2} /><StepTitle title="غرفتك جاهزة للمشاركة" text="يمكنك البدء بلاعبين أو ثلاثة؛ المقاعد الناقصة ستلعبها شخصيات افتراضية تختارها هنا." /><View style={styles.hostStatus}><View style={styles.hostStatusDot} /><Text style={styles.hostStatusText}>{canStart ? "التشكيل جاهز لموافقتك" : "بانتظار انضمام لاعب بشري واحد على الأقل"}</Text></View>{room.roomQrData ? <View style={styles.qrCard}><QRCode value={room.roomQrData} size={190} color="#0E3B2E" backgroundColor="#FFF8E7" /><Text style={styles.roomCodeLabel}>رمز الغرفة</Text><Text style={styles.roomCode}>{room.roomDetails?.roomId}</Text><Text style={styles.qrHint}>يمسح كل لاعب الرمز من شاشة الانضمام</Text></View> : <LoadingCard title="يُحضّر رمز الدعوة" text="لحظة من فضلك…" />}<SeatPlan editable members={room.members} onPersonaChange={room.setVirtualPersona} /><Action label={canStart ? "وافق وابدأ المباراة" : "بانتظار لاعب بشري"} hint={canStart ? `سيبدأ اللعب بـ ${humans} لاعبين بشريين والمقاعد الافتراضية المحددة` : "يتطلب البدء لاعبين بشريين على الأقل"} onPress={onStart} disabled={!canStart} primary /><Back label="إلغاء الغرفة" onPress={onLeave} /></ScrollView>;
}

function SeatPlan({ members, editable = false, editableSeats = [], onPersonaChange }: { members: ReturnType<typeof useLocalRoom>["members"]; editable?: boolean; editableSeats?: Seat[]; onPersonaChange: (seat: Seat, personaId: AiPersonaId) => void }) {
  const canEditSeat = (seat: Seat) => editable || editableSeats.includes(seat);
  return <View style={styles.membersCard}><View style={styles.memberHeader}><Text style={styles.membersTitle}>تشكيل المقاعد</Text><Text style={styles.memberCount}>{members.filter((member) => member.connected && !member.isVirtual).length}/4 بشر</Text></View>{([0, 1, 2, 3] as Seat[]).map((seat) => { const member = members.find((item) => item.seat === seat); const virtual = member?.isVirtual ?? false; return <View key={seat} style={styles.seatBlock}><View style={styles.memberRow}><View style={[styles.memberDot, member?.connected && styles.memberDotOnline, virtual && styles.memberDotVirtual]} /><Text style={styles.memberName}>{member?.name ?? "يُحضّر المقعد"}</Text><Text style={styles.memberSeat}>{seat === 0 ? "المضيف" : `المقعد ${seat + 1}`}</Text></View>{virtual ? <View style={styles.virtualCopy}><Text style={styles.virtualHint}>خصم افتراضي {seat === 2 || seat === 3 ? "وشريك للمقعد المقابل" : ""}</Text>{canEditSeat(seat) ? <View style={styles.personaPicker}>{Object.values(AI_PERSONAS).map((persona) => <Pressable key={persona.id} accessibilityLabel={`اختيار ${persona.name} للمقعد ${seat + 1}`} onPress={() => onPersonaChange(seat, persona.id)} style={({ pressed }) => [styles.personaChip, member?.personaId === persona.id && styles.personaChipSelected, pressed && styles.pressed]}><Text style={[styles.personaChipText, member?.personaId === persona.id && styles.personaChipTextSelected]}>{persona.name}</Text></Pressable>)}</View> : null}</View> : null}</View>; })}</View>;
}

function ClientLobby({ onLeave }: { onLeave: () => void }) {
  const room = useLocalRoom();
  const partner = partnerSeat(room.localSeat);
  const partnerMember = room.members.find((member) => member.seat === partner);
  const canChoosePartner = Boolean(partnerMember?.isVirtual);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><FlowProgress current={2} /><StepTitle title="تم الانضمام إلى الغرفة" text={canChoosePartner ? "يمكنك اختيار شخصية شريكك الافتراضي. سيؤكد المضيف التشكيل قبل البداية." : "شريكك متصل بالفعل. انتظر موافقة المضيف لبدء المباراة."} /><SeatPlan members={room.members} editableSeats={canChoosePartner ? [partner] : []} onPersonaChange={room.setVirtualPersona} /><View style={styles.waitingCard}><ActivityIndicator color="#E3B341" /><Text style={styles.waitingText}>بانتظار موافقة المضيف وبدء المباراة</Text></View><Back label="مغادرة الغرفة" onPress={onLeave} /></ScrollView>;
}

function JoinForm({ name, roomCode, onNameChange, onRoomCodeChange, onBack, onScan, onJoin, onCancel, busy, millisecondsRemaining, requestingCamera, permissionGranted, error, errorActionLabel, onErrorAction }: { name: string; roomCode: string; onNameChange: (value: string) => void; onRoomCodeChange: (value: string) => void; onBack: () => void; onScan: () => void; onJoin: () => void; onCancel: () => void; busy: boolean; millisecondsRemaining: number; requestingCamera: boolean; permissionGranted: boolean; error: string | null; errorActionLabel: string; onErrorAction?: () => void }) {
  const room = useLocalRoom();
  if (room.role === "client" && room.status === "ready") return <ClientLobby onLeave={onCancel} />;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><FlowProgress current={2} /><StepTitle title="انضم إلى الغرفة" text="اكتب اسمك أولًا، ثم امسح رمز المضيف. يمكنك أيضًا إدخال الرمز يدويًا." />{error ? <ErrorCard message={error} actionLabel={onErrorAction ? errorActionLabel : undefined} onAction={onErrorAction} /> : null}<Label text="اسمك على الطاولة" /><TextInput value={name} onChangeText={onNameChange} placeholder="مثال: سارة" placeholderTextColor="#8FA69A" style={styles.input} maxLength={20} textAlign="right" /><Text style={styles.fieldHint}>سيظهر الاسم للمضيف وبقية اللاعبين.</Text><Action label={requestingCamera ? "يفتح الكاميرا…" : "مسح رمز QR"} hint={requestingCamera ? "يُطلب إذن الكاميرا" : permissionGranted ? "افتح الكاميرا واقرأ الرمز" : "سيُطلب إذن الكاميرا عند المتابعة"} onPress={onScan} disabled={requestingCamera || busy || !name.trim()} loading={requestingCamera} primary /><View style={styles.choiceDivider}><View style={styles.choiceLine} /><Text style={styles.choiceText}>أو أدخل الرمز يدويًا</Text><View style={styles.choiceLine} /></View><TextInput value={roomCode} onChangeText={onRoomCodeChange} placeholder="tarneeb://local?..." placeholderTextColor="#8FA69A" style={[styles.input, styles.codeInput]} autoCapitalize="none" autoCorrect={false} multiline editable={!busy} /><Action label={busy ? "يتصل بالمضيف…" : "انضمام إلى الغرفة"} hint={busy ? "تأكد من بقاء جهاز المضيف مفتوحًا" : roomCode.trim() ? "سنؤكد الاتصال قبل دخول الغرفة" : "ألصق رمز الدعوة أولًا"} onPress={onJoin} disabled={busy || !name.trim() || !roomCode.trim()} loading={busy} />{busy ? <ConnectionCountdown millisecondsRemaining={millisecondsRemaining} onCancel={onCancel} /> : null}{room.discoveredRooms.length > 0 ? <View style={styles.discovery}><Text style={styles.discoveryTitle}>تم العثور على غرفة قريبة</Text><Text style={styles.discoveryText}>وجدنا {room.discoveredRooms.length} غرفة على الشبكة. امسح رمز المضيف للتأكد من الانضمام للغرفة الصحيحة.</Text></View> : null}<Back onPress={onBack} /></ScrollView>;
}

function Scanner({ onBack, onScanned }: { onBack: () => void; onScanned: (result: BarcodeScanningResult) => void }) {
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);
  const handleScanned = (result: BarcodeScanningResult) => {
    if (reading) return;
    setReading(true);
    onScanned(result);
  };
  const statusLabel = reading ? "نتحقق من رمز الدعوة…" : ready ? "الكاميرا جاهزة للمسح" : "نجهز الكاميرا…";
  return <View style={styles.scannerPage}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onCameraReady={() => setReady(true)} onBarcodeScanned={ready && !reading ? handleScanned : undefined} /><View style={styles.scannerShade}><View style={styles.scannerHeaderCopy}><Text style={styles.scannerEyebrow}>انضمام إلى الغرفة</Text><Text style={styles.scannerTitle}>{reading ? "جارٍ قراءة الرمز…" : "وجّه الكاميرا إلى رمز المضيف"}</Text><Text style={styles.scannerHint}>ضع رمز QR كاملًا داخل الإطار. لا تحتاج إلى الضغط على أي زر للمسح.</Text></View><View style={styles.scanBox} accessibilityLabel="إطار مسح رمز QR"><View style={[styles.scanCorner, styles.scanCornerTopRight]} /><View style={[styles.scanCorner, styles.scanCornerTopLeft]} /><View style={[styles.scanCorner, styles.scanCornerBottomRight]} /><View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />{!ready || reading ? <View style={styles.scannerLoading}><ActivityIndicator color="#E3B341" /><Text style={styles.scannerLoadingText}>{reading ? "نتحقق من الرمز" : "نجهز الكاميرا"}</Text></View> : null}</View><View style={[styles.scannerStatus, ready && !reading && styles.scannerStatusReady]}><View style={[styles.scannerStatusDot, ready && !reading && styles.scannerStatusDotReady]} />{!ready || reading ? <ActivityIndicator size="small" color="#F5D889" /> : null}<Text style={styles.scannerStatusText}>{statusLabel}</Text></View><Text style={styles.scannerHelp}>إن تعذر المسح، ارجع وأدخل رمز الدعوة يدويًا.</Text><Pressable accessibilityRole="button" accessibilityLabel="العودة لإدخال رمز الغرفة يدويًا" onPress={onBack} style={({ pressed }) => [styles.scannerBack, pressed && styles.pressed]}><Text style={styles.scannerBackText}>إدخال الرمز يدويًا</Text></Pressable></View></View>;
}

function ErrorCard({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) { return <View style={styles.error}><Text style={styles.errorTitle}>تعذر المتابعة</Text><Text style={styles.errorText}>{message}</Text>{actionLabel && onAction ? <Pressable onPress={onAction} style={({ pressed }) => [styles.errorAction, pressed && styles.pressed]}><Text style={styles.errorActionText}>{actionLabel}</Text></Pressable> : null}</View>; }
function LoadingCard({ title, text }: { title: string; text: string }) { return <View style={styles.loadingCard}><ActivityIndicator color="#E3B341" /><View style={styles.loadingCopy}><Text style={styles.loadingTitle}>{title}</Text><Text style={styles.loadingText}>{text}</Text></View></View>; }
function ConnectionCountdown({ millisecondsRemaining, onCancel }: { millisecondsRemaining: number; onCancel: () => void }) { const seconds = Math.max(0, Math.ceil(millisecondsRemaining / 1000)); return <View style={styles.countdownCard}><View style={styles.countdownBadge}><Text style={styles.countdownValue}>{seconds}</Text><Text style={styles.countdownUnit}>ث</Text></View><View style={styles.countdownCopy}><Text style={styles.countdownTitle}>جارٍ الاتصال بالغرفة</Text><Text style={styles.countdownText}>{roomConnectionCountdownCopy(millisecondsRemaining)}</Text></View><Pressable accessibilityLabel="إلغاء محاولة الاتصال" onPress={onCancel} style={({ pressed }) => [styles.cancelJoin, pressed && styles.pressed]}><Text style={styles.cancelJoinText}>إلغاء</Text></Pressable></View>; }
function JoinSuccessToast({ visible }: { visible: boolean }) { const progress = useSharedValue(0); useEffect(() => { progress.value = withTiming(visible ? 1 : 0, { duration: visible ? 240 : 160, easing: Easing.out(Easing.cubic) }); }, [progress, visible]); const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * -16 }, { scale: 0.96 + progress.value * 0.04 }] })); return <Animated.View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.joinSuccessToast, animatedStyle]}><View style={styles.joinSuccessIcon}><Text style={styles.joinSuccessCheck}>✓</Text></View><View style={styles.joinSuccessCopy}><Text style={styles.joinSuccessTitle}>تم الانضمام بنجاح</Text><Text style={styles.joinSuccessText}>أنت الآن في الغرفة، بانتظار المضيف لبدء المباراة.</Text></View></Animated.View>; }
function NativeBuildNotice() { return <View style={styles.warning}><Text style={styles.warningTitle}>يلزم بناء أصلي</Text><Text style={styles.warningText}>الاتصال بين الهواتف يعمل في نسخة Android أو iPhone المبنية، وليس داخل معاينة الويب.</Text></View>; }
function FlowProgress({ current }: { current: 1 | 2 }) { return <View style={styles.flowProgress} accessibilityLabel={`الخطوة ${current} من خطوتين`}><View style={[styles.flowStep, styles.flowStepActive]}><Text style={[styles.flowStepText, styles.flowStepTextActive]}>١</Text></View><View style={[styles.flowLine, current === 2 && styles.flowLineActive]} /><View style={[styles.flowStep, current === 2 && styles.flowStepActive]}><Text style={[styles.flowStepText, current === 2 && styles.flowStepTextActive]}>٢</Text></View><Text style={styles.flowLabel}>{current === 1 ? "أنشئ الغرفة" : "شارك وانضم"}</Text></View>; }
function StepTitle({ title, text }: { title: string; text: string }) { return <View style={styles.stepTitle}><Text style={styles.stepTitleText}>{title}</Text><Text style={styles.stepText}>{text}</Text></View>; }
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function Back({ onPress, label = "عودة" }: { onPress: () => void; label?: string }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>{label}</Text></Pressable>; }
function Action({ label, hint, onPress, disabled, primary = false, loading = false }: { label: string; hint: string; onPress: () => void; disabled?: boolean; primary?: boolean; loading?: boolean }) { return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.action, primary && styles.actionPrimary, (disabled || loading) && styles.actionDisabled, pressed && !disabled && !loading && styles.pressed]}><View><Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>{hint ? <Text style={[styles.actionHint, primary && styles.actionHintPrimary]}>{hint}</Text> : null}</View>{loading ? <ActivityIndicator color={primary ? "#173C2F" : "#0E3B2E"} /> : <Text style={[styles.actionArrow, primary && styles.actionArrowPrimary]}>‹</Text>}</Pressable>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0E3B2E", direction: "ltr" },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16, flexDirection: arabicRow(), justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderColor: "rgba(255,248,231,0.15)" },
  title: { color: "#FFF8E7", fontSize: 23, fontWeight: "900", writingDirection: "rtl" },
  subtitle: { color: "#B4D6C7", marginTop: 5, fontSize: 12, writingDirection: "rtl" },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#FFF8E7", fontSize: 25, lineHeight: 29 },
  content: { padding: 22, paddingBottom: 28, gap: 12 },
  hero: { backgroundColor: "#16624A", borderRadius: 24, padding: 22, alignItems: "center", borderWidth: 1, borderColor: "rgba(227,179,65,0.32)", marginBottom: 4 },
  heroIcon: { color: "#E3B341", fontSize: 42, lineHeight: 46 },
  heroTitle: { color: "#FFF8E7", fontWeight: "900", fontSize: 20, marginTop: 5, writingDirection: "rtl" },
  heroText: { color: "#D9EEE4", textAlign: "center", marginTop: 8, lineHeight: 21, writingDirection: "rtl" },
  networkReady: { minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "rgba(88,214,141,0.14)", flexDirection: arabicRow(), alignItems: "center", gap: 9, borderWidth: 1, borderColor: "rgba(88,214,141,0.24)" },
  networkDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#58D68D" },
  networkReadyText: { color: "#D9EEE4", flex: 1, textAlign: "right", fontSize: 12, fontWeight: "800", writingDirection: "rtl" },
  action: { minHeight: 70, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#FFF8E7", flexDirection: arabicRow(), alignItems: "center", justifyContent: "space-between" },
  actionPrimary: { backgroundColor: "#E3B341" }, actionDisabled: { opacity: 0.48 },
  actionLabel: { color: "#0E3B2E", fontSize: 17, fontWeight: "900", writingDirection: "rtl" }, actionLabelPrimary: { color: "#173C2F" },
  actionHint: { color: "#52635C", fontSize: 12, marginTop: 3, writingDirection: "rtl" }, actionHintPrimary: { color: "#315241" },
  actionArrow: { color: "#0E3B2E", fontSize: 32, lineHeight: 33 }, actionArrowPrimary: { color: "#173C2F" },
  note: { marginTop: 8, padding: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)" }, noteTitle: { color: "#F5D889", fontSize: 13, fontWeight: "900", writingDirection: "rtl" }, noteText: { color: "#D9EEE4", marginTop: 5, lineHeight: 19, fontSize: 12, writingDirection: "rtl" },
  flowProgress: { flexDirection: arabicRow(), alignItems: "center", justifyContent: "flex-end", gap: 7, minHeight: 28 },
  flowStep: { width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,248,231,0.16)", borderWidth: 1, borderColor: "rgba(255,248,231,0.25)" },
  flowStepActive: { backgroundColor: "#E3B341", borderColor: "#E3B341" },
  flowStepText: { color: "#D9EEE4", fontSize: 12, fontWeight: "900" },
  flowStepTextActive: { color: "#173C2F" },
  flowLine: { width: 28, height: 2, borderRadius: 2, backgroundColor: "rgba(255,248,231,0.22)" },
  flowLineActive: { backgroundColor: "#E3B341" },
  flowLabel: { color: "#B4D6C7", fontSize: 12, fontWeight: "800", marginRight: 2, writingDirection: "rtl" },
  stepTitle: { marginBottom: 8, alignItems: "flex-end" }, stepTitleText: { color: "#FFF8E7", fontSize: 21, fontWeight: "900", writingDirection: "rtl" }, stepText: { color: "#B4D6C7", textAlign: "right", lineHeight: 20, marginTop: 4, writingDirection: "rtl" }, label: { color: "#D9EEE4", fontWeight: "800", writingDirection: "rtl", textAlign: "right", marginTop: 2 }, fieldHint: { color: "#8FA69A", textAlign: "right", marginTop: -7, fontSize: 11, writingDirection: "rtl" },
  input: { backgroundColor: "#FFF8E7", color: "#173C2F", minHeight: 54, borderRadius: 14, paddingHorizontal: 15, fontSize: 16 }, codeInput: { minHeight: 90, paddingTop: 12, textAlignVertical: "top", writingDirection: "ltr", fontSize: 12 },
  back: { alignItems: "center", paddingVertical: 12 }, backText: { color: "#D9EEE4", fontWeight: "800", writingDirection: "rtl" },
  hostStatus: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: "rgba(88,214,141,0.14)", flexDirection: arabicRow(), alignItems: "center", gap: 9, borderWidth: 1, borderColor: "rgba(88,214,141,0.26)" }, hostStatusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#58D68D" }, hostStatusText: { color: "#D9EEE4", flex: 1, textAlign: "right", fontSize: 12, fontWeight: "800", writingDirection: "rtl" },
  qrCard: { alignItems: "center", backgroundColor: "#FFF8E7", padding: 20, borderRadius: 24, gap: 8 }, roomCodeLabel: { color: "#52635C", fontSize: 11, fontWeight: "800", writingDirection: "rtl" }, roomCode: { color: "#0E3B2E", fontSize: 28, fontWeight: "900", letterSpacing: 4 }, qrHint: { color: "#52635C", fontSize: 12, writingDirection: "rtl" },
  membersCard: { backgroundColor: "rgba(255,255,255,0.08)", padding: 15, borderRadius: 18, gap: 9 }, memberHeader: { flexDirection: arabicRow(), justifyContent: "space-between", marginBottom: 2 }, membersTitle: { color: "#FFF8E7", fontWeight: "900", writingDirection: "rtl" }, memberCount: { color: "#E3B341", fontWeight: "900" }, memberRow: { flexDirection: arabicRow(), alignItems: "center", gap: 9 }, memberDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#788F84" }, memberDotOnline: { backgroundColor: "#58D68D" }, memberDotVirtual: { backgroundColor: "#E3B341" }, memberName: { color: "#FFF8E7", flex: 1, writingDirection: "rtl", textAlign: "right" }, memberSeat: { color: "#B4D6C7", fontSize: 11, writingDirection: "rtl" }, seatBlock: { gap: 5, paddingVertical: 3 }, virtualCopy: { paddingRight: 18, gap: 6 }, virtualHint: { color: "#F5D889", fontSize: 11, writingDirection: "rtl", textAlign: "right" }, personaPicker: { flexDirection: arabicRow(), flexWrap: "wrap", justifyContent: "flex-start", gap: 6 }, personaChip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "rgba(255,248,231,0.12)", borderWidth: 1, borderColor: "rgba(255,248,231,0.2)" }, personaChipSelected: { backgroundColor: "#E3B341", borderColor: "#F5D889" }, personaChipText: { color: "#D9EEE4", fontSize: 11, fontWeight: "800", writingDirection: "rtl" }, personaChipTextSelected: { color: "#173C2F" }, waitingCard: { minHeight: 62, borderRadius: 16, backgroundColor: "rgba(227,179,65,0.12)", padding: 13, flexDirection: arabicRow(), alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(227,179,65,0.26)" }, waitingText: { color: "#F5D889", flex: 1, fontWeight: "800", writingDirection: "rtl", textAlign: "right" },
  error: { backgroundColor: "rgba(185,28,28,0.35)", padding: 14, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,229,225,0.42)", gap: 5 }, errorTitle: { color: "#FFE5E1", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, errorText: { color: "#FFE5E1", lineHeight: 19, writingDirection: "rtl", textAlign: "right" }, errorAction: { alignSelf: "flex-end", marginTop: 5, backgroundColor: "#FFE5E1", paddingHorizontal: 13, paddingVertical: 8, borderRadius: 11 }, errorActionText: { color: "#8F1D1D", fontWeight: "900", writingDirection: "rtl" },
  warning: { backgroundColor: "rgba(227,179,65,0.18)", margin: 16, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: "rgba(227,179,65,0.5)" }, warningTitle: { color: "#F5D889", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, warningText: { color: "#FFF8E7", fontSize: 12, marginTop: 4, lineHeight: 18, writingDirection: "rtl", textAlign: "right" },
  choiceDivider: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 3 }, choiceLine: { height: 1, flex: 1, backgroundColor: "rgba(255,248,231,0.2)" }, choiceText: { color: "#B4D6C7", fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  discovery: { backgroundColor: "rgba(56,189,248,0.14)", padding: 13, borderRadius: 14 }, discoveryTitle: { color: "#D9F5FF", fontWeight: "900", writingDirection: "rtl", textAlign: "right" }, discoveryText: { color: "#D9F5FF", marginTop: 4, lineHeight: 17, fontSize: 12, writingDirection: "rtl", textAlign: "right" },
  loadingCard: { minHeight: 66, borderRadius: 16, backgroundColor: "rgba(227,179,65,0.12)", padding: 13, flexDirection: arabicRow(), alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(227,179,65,0.26)" }, loadingCopy: { flex: 1, alignItems: "flex-end" }, loadingTitle: { color: "#F5D889", fontWeight: "900", writingDirection: "rtl" }, loadingText: { color: "#D9EEE4", fontSize: 12, marginTop: 3, writingDirection: "rtl", textAlign: "right" },
  scannerPage: { flex: 1, overflow: "hidden" }, camera: { flex: 1 }, scannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }, scannerHeaderCopy: { position: "absolute", top: 22, alignItems: "center", paddingHorizontal: 22 }, scannerEyebrow: { color: "#F5D889", fontWeight: "900", fontSize: 11, letterSpacing: 0.7, writingDirection: "rtl" }, scannerTitle: { color: "#FFF8E7", fontWeight: "900", fontSize: 19, marginTop: 5, textAlign: "center", writingDirection: "rtl" }, scannerHint: { color: "#D9EEE4", fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 6, writingDirection: "rtl", maxWidth: 290 }, scanBox: { width: 242, height: 242, borderRadius: 28, borderWidth: 2, borderColor: "rgba(227,179,65,0.72)", alignItems: "center", justifyContent: "center", overflow: "hidden" }, scanCorner: { position: "absolute", width: 38, height: 38, borderColor: "#F5D889" }, scanCornerTopRight: { top: -2, right: -2, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 22 }, scanCornerTopLeft: { top: -2, left: -2, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 22 }, scanCornerBottomRight: { bottom: -2, right: -2, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 22 }, scanCornerBottomLeft: { bottom: -2, left: -2, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 22 }, scannerLoading: { backgroundColor: "rgba(14,59,46,0.86)", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, alignItems: "center", gap: 7 }, scannerLoadingText: { color: "#FFF8E7", fontWeight: "800", fontSize: 12, writingDirection: "rtl" }, scannerStatus: { position: "absolute", bottom: 106, minHeight: 36, paddingHorizontal: 13, borderRadius: 18, backgroundColor: "rgba(14,59,46,0.8)", borderWidth: 1, borderColor: "rgba(255,248,231,0.24)", flexDirection: arabicRow(), alignItems: "center", gap: 7 }, scannerStatusReady: { borderColor: "rgba(88,214,141,0.52)", backgroundColor: "rgba(14,59,46,0.86)" }, scannerStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F5D889" }, scannerStatusDotReady: { backgroundColor: "#58D68D" }, scannerStatusText: { color: "#FFF8E7", fontSize: 12, fontWeight: "800", writingDirection: "rtl" }, scannerHelp: { position: "absolute", bottom: 78, color: "#D9EEE4", fontSize: 11, textAlign: "center", writingDirection: "rtl" }, scannerBack: { position: "absolute", bottom: 20, backgroundColor: "#FFF8E7", paddingHorizontal: 30, paddingVertical: 13, borderRadius: 18 }, scannerBackText: { color: "#0E3B2E", fontWeight: "900", writingDirection: "rtl" },
  countdownCard: { minHeight: 82, borderRadius: 18, backgroundColor: "rgba(227,179,65,0.14)", padding: 12, flexDirection: arabicRow(), alignItems: "center", gap: 11, borderWidth: 1, borderColor: "rgba(227,179,65,0.4)" }, countdownBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center", flexDirection: "row" }, countdownValue: { color: "#173C2F", fontSize: 22, fontWeight: "900" }, countdownUnit: { color: "#315241", fontSize: 11, marginTop: 8, marginLeft: 2, fontWeight: "900" }, countdownCopy: { flex: 1, alignItems: "flex-end" }, countdownTitle: { color: "#F5D889", fontWeight: "900", writingDirection: "rtl" }, countdownText: { color: "#D9EEE4", marginTop: 3, fontSize: 12, writingDirection: "rtl", textAlign: "right" }, cancelJoin: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "rgba(255,248,231,0.13)" }, cancelJoinText: { color: "#FFF8E7", fontWeight: "900", fontSize: 12, writingDirection: "rtl" },
  joinSuccessToast: { position: "absolute", top: 18, left: 18, right: 18, zIndex: 20, elevation: 20, borderRadius: 20, padding: 14, backgroundColor: "#FFF8E7", flexDirection: arabicRow(), alignItems: "center", gap: 11, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } }, joinSuccessIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E8F61", alignItems: "center", justifyContent: "center" }, joinSuccessCheck: { color: "#FFF8E7", fontSize: 23, fontWeight: "900", lineHeight: 27 }, joinSuccessCopy: { flex: 1, alignItems: "flex-end" }, joinSuccessTitle: { color: "#0E3B2E", fontSize: 16, fontWeight: "900", writingDirection: "rtl" }, joinSuccessText: { color: "#52635C", marginTop: 2, fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl" },
  pressed: { transform: [{ scale: 0.965 }], opacity: 0.82, elevation: 1, shadowOpacity: 0.06, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } },
});
