export function playWompSound() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  function makeWomp(startTime: number, startFreq: number, endFreq: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.38);
    gain.gain.setValueAtTime(0.35, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  }

  makeWomp(now, 220, 85);
  makeWomp(now + 0.45, 185, 65);
}

export function playCrunchSound() {
  const ctx = new AudioContext();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}
