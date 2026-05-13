type AudioContextConstructor = new () => AudioContext;

const melody = [659.25, 783.99, 880, 783.99, 987.77, 880, 783.99, 659.25];
const bass = [164.81, 164.81, 196, 196, 220, 220, 196, 196];

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

  if (!AudioContextClass) {
    return null;
  }

  const context = new AudioContextClass();
  const musicGain = context.createGain();
  const effectGain = context.createGain();
  let step = 0;
  let timer: number | null = null;

  musicGain.gain.value = 0.055;
  effectGain.gain.value = 0.16;
  musicGain.connect(context.destination);
  effectGain.connect(context.destination);

  function scheduleTone(
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    output: AudioNode,
    volume = 0.45
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    ramp(gain, 0.0001, volume, 0.0001, startTime, duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  function playMusicStep() {
    const now = context.currentTime;
    const melodyFrequency = melody[step % melody.length];
    const bassFrequency = bass[step % bass.length];

    scheduleTone(melodyFrequency, now, 0.105, "square", musicGain, 0.35);

    if (step % 2 === 0) {
      scheduleTone(bassFrequency, now, 0.18, "triangle", musicGain, 0.24);
    }

    step += 1;
  }

  return {
    async startMusic() {
      if (context.state === "suspended") {
        await context.resume();
      }

      if (timer !== null) {
        return;
      }

      playMusicStep();
      timer = window.setInterval(playMusicStep, 140);
    },

    stopMusic() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    },

    playScoreEffect() {
      const now = context.currentTime;
      scheduleTone(880, now, 0.08, "triangle", effectGain, 0.75);
      scheduleTone(1320, now + 0.055, 0.1, "square", effectGain, 0.55);
    },

    dispose() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }

      void context.close();
    }
  };
}
