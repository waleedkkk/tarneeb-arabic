import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, StyleSheet } from "react-native";
import { ThemeProvider } from "@/lib/theme-provider";
import { GameProvider } from "@/lib/tarneeb/game-context";
import { LocalRoomProvider } from "@/lib/tarneeb/local-room-context";
import { enableRTL } from "@/lib/rtl";
import { DiagnosticErrorBoundary } from "@/components/diagnostic-error-boundary";
import { installGlobalDiagnosticHandler } from "@/lib/tarneeb/diagnostics";

// تفعيل RTL على مستوى native فور تحميل الملف، قبل أي رندر.
// في APK يأخذ React Native الاتجاه من I18nManager لا من dir="rtl" في الويب.
const rtlWasJustEnabled = enableRTL();
installGlobalDiagnosticHandler();

export default function RootLayout() {
  // عند أول تشغيل بعد التثبيت أو بعد تفعيل RTL: إعادة تشغيل كاملة
  // لأن علم forceRTL يُقرأ مرة واحدة عند إنشاء Activity في Android.
  useEffect(() => {
    if (Platform.OS !== "web" && rtlWasJustEnabled) {
      const handle = setTimeout(() => {
        // react-native-restart يعيد إنشاء الـ Activity فعليًا (kill + relaunch)،
        // وهو المطلوب حتى يعيد Android قراءة فلاغ I18nManager المخزّن عند أول تشغيل.
        // نُبقي الاستيراد محليًا حتى لا تدخل الوحدة الأصلية في معاينة الويب.
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const restartModule = require("react-native-restart");
          const restart = restartModule.default?.restart ?? restartModule.restart;
          restart?.();
        } catch {
          // في Expo Go لا تتوفر الوحدة الأصلية؛ ستُطبَّق RTL عند إعادة الفتح اليدوية.
        }
      }, 600);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, []);
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <DiagnosticErrorBoundary><SafeAreaProvider>
        <ThemeProvider>
          <GameProvider>
            <LocalRoomProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
              <StatusBar style="light" />
            </LocalRoomProvider>
          </GameProvider>
        </ThemeProvider>
      </SafeAreaProvider></DiagnosticErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
