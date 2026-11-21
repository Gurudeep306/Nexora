/** Sound for new messages (Messages page toggle). */
const SOUND_KEY = 'nexora:chat:sound'
export const alertSoundOn = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}
export const setAlertSound = (on: boolean) => {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    /* fine */
  }
}

