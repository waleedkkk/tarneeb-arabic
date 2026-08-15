import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@/lib/theme-provider";
import { GameProvider } from "@/lib/tarneeb/game-context";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="light" />
      </GameProvider>
    </ThemeProvider>
  );
}
