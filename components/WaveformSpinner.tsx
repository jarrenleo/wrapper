import { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { useColorScheme } from "~/lib/useColorScheme";

type Props = {
  size?: number; // total width (px)
  color?: string; // bar color
  speed?: number; // seconds per cycle
  stroke?: number; // bar width (px)
};

// Waveform spinner component for loading state
export default function WaveformSpinner({
  size = 24,
  speed = 1,
  stroke = 3.5,
}: Props) {
  const height = size * 0.9;
  const duration = speed * 1000;

  const { isDarkColorScheme } = useColorScheme();

  const v1 = useRef(new Animated.Value(0.3)).current;
  const v2 = useRef(new Animated.Value(0.3)).current;
  const v3 = useRef(new Animated.Value(0.3)).current;
  const v4 = useRef(new Animated.Value(0.3)).current;

  const loops = useRef<Animated.CompositeAnimation[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const mkLoop = (v: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const delays = [0, 0.15, 0.3, 0.45].map((p) => p * duration);
    const values = [v1, v2, v3, v4];

    values.forEach((v, i) => {
      const loop = mkLoop(v);
      loops.current[i] = loop;
      timers.current[i] = setTimeout(() => loop.start(), delays[i]);
    });

    return () => {
      loops.current.forEach((l) => l?.stop?.());
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, [duration, v1, v2, v3, v4]);

  const barStyle = {
    width: stroke,
    height: "100%",
    backgroundColor: isDarkColorScheme
      ? "hsl(0 0% 0%)"
      : "hsl(223.8136 0.0005% 98.6829%)",
  } as const;

  return (
    <View
      style={{
        width: size,
        height,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Animated.View style={[barStyle, { transform: [{ scaleY: v1 }] }]} />
      <Animated.View style={[barStyle, { transform: [{ scaleY: v2 }] }]} />
      <Animated.View style={[barStyle, { transform: [{ scaleY: v3 }] }]} />
      <Animated.View style={[barStyle, { transform: [{ scaleY: v4 }] }]} />
    </View>
  );
}
