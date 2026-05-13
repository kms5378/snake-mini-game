type AudioContextConstructor = new () => AudioContext;

const BGM_SRC = "/audio/nia.mp3";

function getAudioContextConstructor() {
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  );
}

function ramp(gain: GainNode, start: number, peak: number, end: number, at: number, duration: number) {
  gain.gain.cancelScheduledValues(at);
  gain.gain.setValueAtTime(start, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.018);
  gain.gain.exponentialRampToValueAtTime(end, at + duration);
}

export function createGameAudio() {
  const AudioContextClass = getAudioContextConstructor();
  const context = AudioContextClass ? new AudioContextClass() : null;
  const effectGain = context?.createGain() ?? null;
  const bgm = new Audio(BGM_SRC);

  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = 0.38;

  if (context && effectGain) {
    effectGain.gain.value = 0.16;
    effectGain.connect(context.destination);
  }

  function scheduleTone(
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume = 0.45
  ) {
    if (!context || !effectGain) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    ramp(gain, 0.0001, volume, 0.0001, startTime, duration);
    oscillator.connect(gain);
    gain.connect(effectGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  return {
    async startMusic() {
      if (context?.state === "suspended") {
        void context.resume();
      }

      try {
        if (bgm.paused) {
          await bgm.play();
        }
      } catch {
        // Browsers may reject play() if the site or device blocks audio.
      }
    },

    stopMusic() {
      bgm.pause();
    },

    playScoreEffect() {
      if (!context) {
        return;
      }

      const now = context.currentTime;
      scheduleTone(880, now, 0.08, "triangle", 0.75);
      scheduleTone(1320, now + 0.055, 0.1, "square", 0.55);
    },

    dispose() {
      bgm.pause();
      void context?.close();
    }
  };
}
