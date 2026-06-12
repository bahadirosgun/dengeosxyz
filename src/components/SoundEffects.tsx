import { useEffect, useRef } from "react";

type SoundKind = "tap" | "success";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "[role='button']",
  "summary",
  "select",
  "input[type='checkbox']",
  "input[type='radio']",
  "[data-sound]",
].join(",");

export function SoundEffects() {
  const audioRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef(0);

  useEffect(() => {
    const getAudio = () => {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      if (!audioRef.current) audioRef.current = new AudioCtor();
      return audioRef.current;
    };

    const play = (kind: SoundKind) => {
      const nowMs = Date.now();
      if (nowMs - lastPlayedRef.current < 45) return;
      lastPlayedRef.current = nowMs;

      const audio = getAudio();
      if (!audio) return;
      if (audio.state === "suspended") void audio.resume();

      const now = audio.currentTime;
      const gain = audio.createGain();
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.0001, now);

      if (kind === "success") {
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        playTone(audio, gain, 660, now, 0.11);
        playTone(audio, gain, 880, now + 0.08, 0.14);
        setTimeout(() => gain.disconnect(), 320);
        return;
      }

      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      playTone(audio, gain, 520, now, 0.09);
      setTimeout(() => gain.disconnect(), 180);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      const element = target?.closest?.(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!element) return;
      if (isDisabled(element)) return;

      const sound = element.dataset.sound === "success" ? "success" : "tap";
      play(sound);
    };

    document.addEventListener("pointerup", onPointerUp, true);
    return () => {
      document.removeEventListener("pointerup", onPointerUp, true);
      void audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  return null;
}

function playTone(
  audio: AudioContext,
  gain: GainNode,
  frequency: number,
  start: number,
  duration: number,
) {
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);
  osc.connect(gain);
  osc.start(start);
  osc.stop(start + duration);
}

function isDisabled(element: HTMLElement) {
  if (element.getAttribute("aria-disabled") === "true") return true;
  if (element.hasAttribute("disabled")) return true;
  if (element instanceof HTMLButtonElement && element.disabled) return true;
  if (element instanceof HTMLInputElement && element.disabled) return true;
  if (element instanceof HTMLSelectElement && element.disabled) return true;
  return false;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
