import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useMemo } from "react";
import type { SoundProfile } from "./types";

const shuffleSource = require("../../assets/sounds/card-shuffle.mp3");
const cardSource = require("../../assets/sounds/card-place.mp3");
const trickSource = require("../../assets/sounds/trick-win.mp3");
const timerAlertSource = require("../../assets/sounds/timer-alert.mp3");

const SOUND_VOLUME: Record<SoundProfile, number> = { "هادئة": 0.42, "متوازنة": 0.7, "بارزة": 0.95 };

function replay(player: ReturnType<typeof useAudioPlayer>, enabled: boolean, profile: SoundProfile) {
  if (!enabled) return;
  try {
    player.volume = SOUND_VOLUME[profile];
    player.seekTo(0);
    player.play();
  } catch {
    // يظل اللعب متاحًا إذا رفض الجهاز تشغيل الصوت أو قاطعه.
  }
}

export function useGameSounds(enabled: boolean, profile: SoundProfile) {
  const shufflePlayer = useAudioPlayer(shuffleSource);
  const cardPlayer = useAudioPlayer(cardSource);
  const trickPlayer = useAudioPlayer(trickSource);
  const timerAlertPlayer = useAudioPlayer(timerAlertSource);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  const playShuffle = useCallback(() => replay(shufflePlayer, enabled, profile), [enabled, profile, shufflePlayer]);
  const playCard = useCallback(() => replay(cardPlayer, enabled, profile), [cardPlayer, enabled, profile]);
  const playTrick = useCallback(() => replay(trickPlayer, enabled, profile), [enabled, profile, trickPlayer]);
  const playTimerAlert = useCallback(() => replay(timerAlertPlayer, enabled, profile), [enabled, profile, timerAlertPlayer]);

  return useMemo(() => ({ playShuffle, playCard, playTrick, playTimerAlert }), [playCard, playShuffle, playTimerAlert, playTrick]);
}
