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

// تفعيل RTL على مستوى native فور تحميل الملف، قبل أي رندر.
// في APK يأخذ React Native الاتجاه من I18nManager لا من dir="rtl" في الويب.
const rtlWasJustEnabled = enableRTL();

export default function RootLayout() {
  // عند أول تشغيل بعد التثبيت أو بعد تفعيل RTL: إعادة تشغيل كاملة
  // لأن علم forceRTL يُقرأ مرة واحدة عند إنشاء Activity في Android.
  useEffect(() => {
    if (Platform.OS !== "web" && rtlWasJustEnabled) {
      const handle = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("react-native").RestartAndroid?.();
      }, 600);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, []);
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
