import React, { useEffect } from "react";
import { View, StyleSheet, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";

interface MorphingLogoProps {
  size?: number;
  showLabel?: boolean;
}

export default function MorphingLogo({ size = 120 }: MorphingLogoProps) {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);

  const ringSize = size + 32;

  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const glowOpacity = useSharedValue(0.6);
  const glowScale = useSharedValue(1);
  const borderRadius = useSharedValue(size * 0.18);
  const shimmerOpacity = useSharedValue(0);

  useEffect(() => {
    // Gentle breathing scale
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Subtle sway
    rotateZ.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Glow ring scale — slightly offset from main scale for organic feel
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Shape morphing: rounded rect ↔ circle
    borderRadius.value = withRepeat(
      withSequence(
        withTiming(size * 0.5, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(size * 0.12, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Shimmer sweep
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 800 }),
        withTiming(0.35, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 1200 }),
      ),
      -1,
      false,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotateZ.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const imageStyle = useAnimatedStyle(() => ({
    borderRadius: borderRadius.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
    borderRadius: borderRadius.value,
  }));

  return (
    <View style={[styles.wrapper, { width: ringSize, height: ringSize }]}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            backgroundColor: colors.gold + "18",
          },
          glowStyle,
        ]}
      />

      {/* Rotating border ring */}
      <Animated.View
        style={[
          styles.borderRing,
          {
            width: ringSize - 8,
            height: ringSize - 8,
            borderRadius: (ringSize - 8) / 2,
            borderColor: colors.gold + "50",
          },
          outerStyle,
        ]}
      />

      {/* Logo image with morphing border radius */}
      <View style={[styles.imageWrapper, { width: size, height: size }]}>
        <Animated.Image
          source={require("@/assets/images/app-logo.png")}
          style={[{ width: size, height: size }, imageStyle]}
          resizeMode="cover"
        />
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.gold + "60" },
            shimmerStyle,
          ]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
  },
  borderRing: {
    position: "absolute",
    borderWidth: 1.5,
  },
  imageWrapper: {
    overflow: "hidden",
    borderRadius: 16,
  },
});
