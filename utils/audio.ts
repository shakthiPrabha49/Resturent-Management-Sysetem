
export const SOUNDS = {
  SEND_ORDER: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Whoosh/Paper
  KITCHEN_BELL: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Ding/Bell
  ORDER_READY: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Alert/Success
  CASH_REGISTER: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3', // Register/Coins
};

export const playSound = (soundUrl: string) => {
  const audio = new Audio(soundUrl);
  audio.volume = 0.5;
  audio.play().catch(err => console.warn("Audio playback blocked by browser:", err));
};
