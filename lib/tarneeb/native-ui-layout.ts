export type NativeInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type NativeViewport = {
  width: number;
  height: number;
  insets: NativeInsets;
};

export const ANDROID_TEST_VIEWPORTS = {
  compact: { width: 360, height: 800, insets: { top: 24, bottom: 24, left: 0, right: 0 } },
  standard: { width: 412, height: 915, insets: { top: 28, bottom: 24, left: 0, right: 0 } },
} as const satisfies Record<string, NativeViewport>;

/**
 * Keeps the native root LTR so Android does not mirror positional properties,
 * then lets Arabic rows opt in to row-reverse explicitly.
 */
export const NATIVE_LAYOUT_DIRECTION = {
  root: "ltr" as const,
  arabicRow: "row-reverse" as const,
  leftSeat: "left" as const,
  rightSeat: "right" as const,
};

export function getNativeTableLayout({ width, height, insets }: NativeViewport) {
  const compact = width <= 375;
  const contentHeight = Math.max(0, height - insets.top - insets.bottom);
  // بعض حاويات المعاينة لا تمرّر inset أعلى رغم وجود شريط حالة أو فتحة شاشة.
  // نحجز مساحة مرئية بديلة فقط عندما لا يتوفر inset أصلي.
  const topSafeFallback = insets.top === 0 ? (compact ? 44 : 48) : 0;
  const playableContentHeight = Math.max(0, contentHeight - topSafeFallback);
  const horizontalPadding = compact ? 12 : 14;
  const statusHeight = compact ? 46 : 50;
  const handAreaHeight = compact ? 132 : 140;
  const tableTopMargin = 10;
  const handTopMargin = 10;
  const tableMinHeight = 330;
  const reservedHeight = statusHeight + tableTopMargin + handTopMargin + handAreaHeight;
  const tableMaxHeight = Math.max(tableMinHeight, playableContentHeight - reservedHeight);

  return {
    contentHeight,
    topSafeFallback,
    playableContentHeight,
    horizontalPadding,
    statusHeight,
    handAreaHeight,
    tableTopMargin,
    handTopMargin,
    tableMinHeight,
    tableMaxHeight,
    reservedHeight,
    direction: NATIVE_LAYOUT_DIRECTION,
  };
}
