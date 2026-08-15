import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { GameProvider } from "@/lib/tarneeb/game-context";
import { LocalRoomProvider } from "@/lib/tarneeb/local-room-context";

export default function RootLayout() {
  return (
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
  );
}
