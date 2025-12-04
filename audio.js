import ambientTrackUrl from './assets/immersive-ambient-background-332303.mp3?url'; // Royalty-free ambient track

let ambientAudio;

function getAmbientAudio() {
  if (!ambientAudio) {
    ambientAudio = new Audio(ambientTrackUrl);
    ambientAudio.loop = true;
    ambientAudio.volume = 0.3; // 30% volume
  }
  return ambientAudio;
}

export function playAmbientAudio() {
  const track = getAmbientAudio();
  if (track.paused) {
    track.play().catch((err) => {
      console.warn('Unable to start ambient audio:', err);
    });
  }
}

export function pauseAmbientAudio() {
  if (ambientAudio && !ambientAudio.paused) {
    ambientAudio.pause();
  }
}
