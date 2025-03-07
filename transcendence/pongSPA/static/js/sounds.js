let sounds = {};

export function initSounds() {
  sounds = {
    paddleHit: new Audio('/static/sounds/tap.wav'),
    point: new Audio('/static/sounds/point.wav'),
    win: new Audio('/static/sounds/victory.wav'),
    lose: new Audio('/static/sounds/defeat.wav'),
	countdown: new Audio('/static/sounds/countdown.wav')
  };
  
  Object.values(sounds).forEach(sound => {
    sound.load();
    sound.volume = 0.5;
  });
  
  return window.isSoundOn;
}

export function playSound(soundName) {
  if (window.isSoundOn && sounds[soundName]) {
    try {
      const soundClone = sounds[soundName].cloneNode();
      
      soundClone.play().catch(error => {
        console.log("Erreur lors de la lecture audio:", error);
      });
    } catch (e) {
      console.log("Erreur de manipulation audio:", e);
    }
  }
}

export function toggleSound() {
	window.isSoundOn = !window.isSoundOn; 
	return window.isSoundOn;
}

export function setVolume(volume, soundName = null) {
  const safeVolume = Math.max(0, Math.min(1, volume));
  
  if (soundName && sounds[soundName]) {
    sounds[soundName].volume = safeVolume;
  } else {
    Object.values(sounds).forEach(sound => {
      sound.volume = safeVolume;
    });
  }
}