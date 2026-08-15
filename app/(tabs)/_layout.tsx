import { Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#E3B341", tabBarInactiveTintColor: "#B4D6C7", tabBarStyle: { height: 58 + bottomPadding, paddingTop: 7, paddingBottom: bottomPadding, backgroundColor: "#0E3B2E", borderTopColor: "#16624A" }, tabBarLabelStyle: { fontSize: 11, fontWeight: "700" } }}>
      <Tabs.Screen name="index" options={{ title: "اللعبة", tabBarIcon: ({ color }) => <MaterialIcons name="style" color={color} size={23} /> }} />
      <Tabs.Screen name="rules" options={{ title: "القواعد", tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" color={color} size={23} /> }} />
      <Tabs.Screen name="settings" options={{ title: "الإعدادات", tabBarIcon: ({ color }) => <MaterialIcons name="settings" color={color} size={23} /> }} />
    </Tabs>
  );
}
