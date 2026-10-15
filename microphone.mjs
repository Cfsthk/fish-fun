export class ClassroomMicrophone {
  constructor() { this.level = 0; this.lost = false; this.active = false; this.generation = 0; }
  async connect() {
    this.stop();
    const generation = this.generation;
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('Microphone unavailable'), { name: 'UnsupportedError' });
    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('AudioContext unavailable');
      this.stream = stream; this.context = new Audio();
      this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 2048;
      this.source = this.context.createMediaStreamSource(stream); this.source.connect(this.analyser);
      // The analyser is deliberately not connected to speakers: no feedback and no playback.
      this.samples = new Float32Array(this.analyser.fftSize);
      await this.context.resume();
      this.level = 0; this.lost = false; this.active = true;
      stream.getAudioTracks().forEach(track => { track.onended = () => { this.lost = true; this.active = false; }; });
    } catch (error) { stream.getTracks().forEach(t => t.stop()); this.stop(); throw error; }
  }
  sample(dt = .016) {
    if (!this.active || !this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    let square = 0; for (const v of this.samples) square += v * v;
    const rms = Math.sqrt(square / this.samples.length);
    const dbFS = 20 * Math.log10(Math.max(1e-6, rms));
    const raw = Math.max(0, Math.min(100, (dbFS + 85) * 100 / 75));
    const time = raw > this.level ? .09 : .3;
    this.level += (raw - this.level) * (1 - Math.exp(-dt / time));
    return this.level;
  }
  pause() { this.active = false; this.stream?.getAudioTracks().forEach(t => { t.enabled = false; }); this.context?.suspend().catch(() => {}); }
  async resume() {
    if (this.lost || !this.stream || this.stream.getAudioTracks().some(t => t.readyState !== 'live')) throw new Error('Microphone disconnected');
    this.stream.getAudioTracks().forEach(t => { t.enabled = true; });
    await this.context.resume(); this.level = 0; this.active = true;
  }
  stop() {
    this.generation++; this.active = false;
    this.stream?.getTracks().forEach(t => { t.onended = null; t.stop(); });
    this.source?.disconnect(); this.context?.close().catch(() => {});
    this.stream = null; this.context = null; this.analyser = null; this.level = 0;
  }
}
