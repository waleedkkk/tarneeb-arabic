import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { recordDiagnostic } from "@/lib/tarneeb/diagnostics";

export class DiagnosticErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void recordDiagnostic({ kind: "react", message: error.message, stack: `${error.stack ?? ""}\n${info.componentStack ?? ""}`, fatal: true });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.screen}><Text style={styles.title}>تم حفظ تقرير تشخيص آمن</Text><Text style={styles.copy}>أغلق اللعبة ثم افتحها مرة أخرى. بعد الفتح، ستجد التقرير في الإعدادات ضمن «التشخيص» لتنسخه أو تشاركه.</Text></View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0E3B2E", alignItems: "center", justifyContent: "center", padding: 28 },
  title: { color: "#FFF8E7", fontSize: 20, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  copy: { color: "#D9EEE4", fontSize: 14, lineHeight: 22, marginTop: 12, textAlign: "center", writingDirection: "rtl" },
});
