const SUCTION_SOUND_VOLUME = 0.8;
const AUDIO_FADE_STEP_MS = 16;
const SUCTION_SOUND_URL = new URL(
  "../../assets/sounds/186674__katdhamphir__creepy-wind-suction.wav",
  import.meta.url,
);

export function createSuctionSound() {
  const suctionAudio = new Audio(SUCTION_SOUND_URL.href);
  suctionAudio.preload = "auto";
  suctionAudio.loop = false;
  suctionAudio.volume = SUCTION_SOUND_VOLUME;
  suctionAudio.load();
  let started = false;
  let fadeFrame = null;

  const fadeOutAndStop = (duration = 2) => {
    if (!started) return;
    const from = suctionAudio.volume;
    const startedAt = performance.now();
    const update = () => {
      const progress = Math.min(1, (performance.now() - startedAt) / (duration * 1000));
      suctionAudio.volume = from * (1 - progress);
      if (progress < 1) {
        fadeFrame = window.setTimeout(update, AUDIO_FADE_STEP_MS);
        return;
      }
      suctionAudio.pause();
      suctionAudio.currentTime = 0;
      suctionAudio.volume = SUCTION_SOUND_VOLUME;
      started = false;
      fadeFrame = null;
    };
    update();
  };

  const stop = () => {
    if (fadeFrame !== null) window.clearTimeout(fadeFrame);
    fadeFrame = null;
    started = false;
    suctionAudio.pause();
    suctionAudio.currentTime = 0;
    suctionAudio.volume = SUCTION_SOUND_VOLUME;
  };

  return {
    start() {
      if (started) return;
      started = true;
      suctionAudio.currentTime = 0;
      suctionAudio.volume = SUCTION_SOUND_VOLUME;
      suctionAudio.play().catch(() => { started = false; });
    },
    fadeOutAndStop,
    stop,
    dispose() {
      stop();
      suctionAudio.removeAttribute("src");
      suctionAudio.load();
    },
  };
}
