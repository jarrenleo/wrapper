import React from "react";
import { View, Modal, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { cn } from "~/lib/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHEET_WIDTH = SCREEN_WIDTH * 0.8;

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
  const translateX = useSharedValue(-SHEET_WIDTH);
  const opacity = useSharedValue(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setVisible(true);
      opacity.value = withTiming(1, { duration: 200 });
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateX.value = withTiming(
        -SHEET_WIDTH,
        { duration: 300 },
        (finished) => {
          if (finished) {
            runOnJS(setVisible)(false);
          }
        },
      );
    }
  }, [open]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleBackdropPress = () => {
    onOpenChange(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} statusBarTranslucent>
      <View className="flex-1">
        {/* Backdrop */}
        <Pressable className="flex-1" onPress={handleBackdropPress}>
          <Animated.View
            style={[backdropStyle]}
            className="flex-1 bg-black/50"
          />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={[sheetStyle]}
          className={cn(
            "absolute left-0 top-0 h-full bg-background shadow-lg",
            className,
          )}
          pointerEvents="box-none"
        >
          <View style={{ width: SHEET_WIDTH }} className="flex-1">
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
