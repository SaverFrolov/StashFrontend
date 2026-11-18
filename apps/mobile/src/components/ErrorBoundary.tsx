import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * S12 error boundary (web parity, same hardcoded English strings — the i18n
 * stack itself may be what crashed). Colors are inlined so the fallback does
 * not depend on the theme context.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Something broke</Text>
          <Text style={styles.body}>An unexpected UI error occurred. Your data is safe.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => this.setState({ hasError: false })}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.buttonText}>Reload</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
    backgroundColor: "#0A120E",
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
    color: "#E9F0EA",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: "#A5B4AA",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0E7C66",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
});
