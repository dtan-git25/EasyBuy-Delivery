let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playNotificationSound = async () => {
  try {
    const context = getAudioContext();
    
    if (context.state === 'suspended') {
      await context.resume();
    }
    
    const createBellTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = context.currentTime;
    createBellTone(800, now, 0.3);
    createBellTone(1000, now, 0.25);
    createBellTone(1200, now, 0.2);
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};
