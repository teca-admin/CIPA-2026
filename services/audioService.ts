
class AudioService {
  private audioContext: AudioContext | null = null;

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public playBeep() {
    this.init();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  public playConfirm() {
    this.init();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.setValueAtTime(0.05, start + duration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // The iconic "PIRILILI" sound is roughly these frequencies
    playTone(1100, now, 0.15);
    playTone(1100, now + 0.15, 0.15);
    playTone(1100, now + 0.30, 0.15);
    playTone(1350, now + 0.45, 0.5);
  }
}

export const audioService = new AudioService();
