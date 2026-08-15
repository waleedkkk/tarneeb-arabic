import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

const shuffleSource = require("../../assets/sounds/card-shuffle.mp3");
const cardSource = require("../../assets/sounds/card-play.mp3");
const CARD_TOSS_START_SECONDS = 5.15;
const CARD_TOSS_DURATION_MS = 460;
const CARD_TOSS_VOLUME = 0.22;

function replay(
  player: ReturnType<typeof useAudioPlayer>,
  enabled: boolean,
  startAtSeconds = 0,
  volume = 0.42,
) {
  if (!enabled) return;
  try {
    player.volume = volume;
    player.seekTo(startAtSeconds);
    player.play();
  } catch {
    // يظل اللعب متاحًا إذا رفض الجهاز تشغيل الصوت أو قاطعه.
  }
}

export function useGameSounds(enabled: boolean) {
  const shufflePlayer = useAudioPlayer(shuffleSource);
  const cardPlayer = useAudioPlayer(cardSource);
  const cardStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  useEffect(() => () => {
    if (cardStopTimer.current) clearTimeout(cardStopTimer.current);
  }, []);

  const playSoftCardToss = useCallback(() => {
    if (!enabled) return;
    if (cardStopTimer.current) clearTimeout(cardStopTimer.current);

    replay(cardPlayer, enabled, CARD_TOSS_START_SECONDS, CARD_TOSS_VOLUME);
    cardStopTimer.current = setTimeout(() => {
      try {
        cardPlayer.pause();
      } catch {
        // لا ينبغي أن يمنع تعذر إيقاف المؤثر استمرار اللعب.
      }
    }, CARD_TOSS_DURATION_MS);
  }, [cardPlayer, enabled]);

  return {
    playShuffle: useCallback(() => replay(shufflePlayer, enabled), [enabled, shufflePlayer]),
    playCard: playSoftCardToss,
    playTrick: playSoftCardToss,
  };
}
