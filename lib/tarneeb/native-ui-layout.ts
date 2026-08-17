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
  /** True when height already represents the content inside a SafeAreaView. */
  safeFrame?: boolean;
};

export const ANDROID_TEST_VIEWPORTS = {
  compact: { width: 360, height: 800, insets: { top: 24, bottom: 24, left: 0, right: 0 } },
  standard: { width: 412, height: 915, insets: { top: 28, bottom: 24, left: 0, right: 0 } },
  redmi14cGameFrame: { width: 360, height: 710, insets: { top: 0, bottom: 0, left: 0, right: 0 }, safeFrame: true },
} as const satisfies Record<string, NativeViewport>;

/**
 * اتجاهات الطاولة المرسومة يدويًا (جزر هندسية):
 * مع تفعيل RTL الأصلي عبر I18nManager، تُثبَّت حاوية الطاولة على ltr عمدًا
 * حتى لا ينعكس نظام إحداثيات المقاعد والأوراق المرسومة؛ النص العربي داخلها
 * يحمل writingDirection: rtl صراحة. المقاعد اليسرى/اليمنى تُحدد بصراحة كذلك.
 */
export const NATIVE_LAYOUT_DIRECTION = {
  root: "ltr" as const,
  arabicRow: "row-reverse" as const,
  leftSeat: "left" as const,
  rightSeat: "right" as const,
};

export function getNativeTableLayout({ width, height, insets, safeFrame = false }: NativeViewport) {
  const compact = width <= 375;
  const contentHeight = Math.max(0, safeFrame ? height : height - insets.top - insets.bottom);
  // بعض حاويات المعاينة لا تمرّر inset أعلى رغم وجود شريط حالة أو فتحة شاشة.
  // نحجز مساحة مرئية بديلة فقط عندما لا يتوفر inset أصلي.
  const topSafeFallback = safeFrame ? 0 : insets.top === 0 ? (compact ? 44 : 48) : 0;
  const playableContentHeight = Math.max(0, contentHeight - topSafeFallback);
  const compactHeight = playableContentHeight <= 700;
  const denseLayout = compact || compactHeight;
  const horizontalPadding = compact ? 12 : 14;
  const statusHeight = denseLayout ? 46 : 50;
  const handAreaHeight = denseLayout ? 124 : 140;
  const tableTopMargin = denseLayout ? 8 : 10;
  const handTopMargin = denseLayout ? 6 : 10;
  const preferredTableMinHeight = denseLayout ? 286 : 330;
  const reservedHeight = statusHeight + tableTopMargin + handTopMargin + handAreaHeight;
  const tableMaxHeight = Math.max(0, playableContentHeight - reservedHeight);
  const tableMinHeight = Math.min(preferredTableMinHeight, tableMaxHeight);

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
    compact: denseLayout,
    direction: NATIVE_LAYOUT_DIRECTION,
  };
}
