import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect } from "react";

const shuffleSource = require("../../assets/sounds/card-shuffle.mp3");
const cardSource = require("../../assets/sounds/card-play.mp3");

function replay(player: ReturnType<typeof useAudioPlayer>, enabled: boolean) {
  if (!enabled) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // يظل اللعب متاحًا إذا رفض الجهاز تشغيل الصوت أو قاطعه.
  }
}

export function useGameSounds(enabled: boolean) {
  const shufflePlayer = useAudioPlayer(shuffleSource);
  const cardPlayer = useAudioPlayer(cardSource);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  return {
    playShuffle: useCallback(() => replay(shufflePlayer, enabled), [enabled, shufflePlayer]),
    playCard: useCallback(() => replay(cardPlayer, enabled), [enabled, cardPlayer]),
    playTrick: useCallback(() => replay(cardPlayer, enabled), [enabled, cardPlayer]),
  };
}
