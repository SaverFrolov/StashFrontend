import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

function transparentOf(rgbaColor: string): string {
  return rgbaColor.replace(/[\d.]+\)$/, "0)");
}

/**
 * The single fixed aurora layer at the app root (spec: one layer for the whole
 * app, not per screen). Mirrors the web's --aurora-image radial gradients:
 * each stop fades to transparent at 60% of its radius.
 */
export function AuroraBackground() {
  const { tokens } = useTheme();
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          {tokens.aurora.map((stop, i) => (
            <RadialGradient
              key={i}
              id={`aurora-${i}`}
              cx={stop.at[0] * width}
              cy={stop.at[1] * height}
              rx={stop.size[0] / 2}
              ry={stop.size[1] / 2}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={stop.color} />
              <Stop offset="0.6" stopColor={transparentOf(stop.color)} />
              <Stop offset="1" stopColor={transparentOf(stop.color)} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={tokens.bg} />
        {tokens.aurora.map((_, i) => (
          <Rect key={i} x={0} y={0} width={width} height={height} fill={`url(#aurora-${i})`} />
        ))}
      </Svg>
    </View>
  );
}
