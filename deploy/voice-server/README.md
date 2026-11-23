# Your own voice server (free, Indian voices)

The virtual teacher and every spoken answer can use **natural Indian voices**
from your own server, with the exact mouth shapes for the teacher's lips.

- **Voices:** Kokoro's four Indian voices: Alpha and Beta (women), Omega and Psi (men).
  Each speaks English with an Indian accent, and Hindi.
- **Software:** [HeadTTS](https://github.com/met4citizen/HeadTTS) (MIT licence)
  running the [Kokoro](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped)
  voice model (Apache-2.0) on the server's CPU. No GPL parts, no company's API
  key, **commercial use allowed**.
- **Hindi:** NexoraGuru writes Hindi as sounds itself (`src/voice/hindi-ipa.js`)
  before sending it, so Kokoro's Hindi voices say it correctly.
- **Server:** the free Oracle Cloud "Always Free" server. It can be the **same
  server** as your coding model (`deploy/coder-model`); both share one address.

Everything below works from a phone.

## 1. The free server

Already made one for the coding model? Skip to step 2.

Otherwise follow steps 1 and 2 of [`deploy/coder-model/README.md`](../coder-model/README.md)
(make the Oracle server, open ports 80 and 443). About 15 minutes.

## 2. Install the voice (one command, about 10 minutes)

1. Oracle console → the **Cloud Shell** icon (`>_`) at the top right.
2. Connect to your server (put your IP in place of `1.2.3.4`):

   ```bash
   ssh -i ssh-key.key ubuntu@1.2.3.4
   ```

3. Paste this and press Enter:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/voice-server/setup.sh -o voice.sh && sudo bash voice.sh
   ```

It installs Node.js and HeadTTS, downloads the voices and the voice model
(about 330 MB, once), starts it as a service (it comes back by itself after a
restart), turns on HTTPS with a password, and says a test sentence. At the end
it prints a **Voice server address** and a **Password**.

## 3. Connect it to NexoraGuru (2 minutes)

1. NexoraGuru → **Admin** → **Voice recognition** → **Natural voice**.
2. Paste the **Voice server address** and the **Password**. Make sure **Use the
   natural voice** is on. Press **Save**.
3. Press **Test in English**, then **Test in Hindi**. You should hear the voice
   and see "… mouth shapes for the teacher".

Done. Students who choose a teacher (Settings → Virtual teacher) hear that
teacher's own voice: Priya and Neha speak with Alpha, Kavya and Ananya with
Beta, Arjun and Dev with Omega, Rohan with Psi. A student can pick another
voice in Settings → Voice.

## How fast is it?

About one second per sentence on a 4-core CPU. The next sentence is made
while the first is spoken, so a long answer starts in about a second and
doesn't pause. Each sentence is about 150 KB of audio.

## Looking after it

- Is it running? `systemctl status nexora-voice`
- What happened? `journalctl -u nexora-voice -n 50`
- Restart: `sudo systemctl restart nexora-voice`
- New password: `sudo rm /opt/nexora-voice/api-key && sudo bash voice.sh`, then paste the new one in Admin.

## Honest limits

- The voices sound natural, but they are not famous Indian actors' voices: four
  voices, two women and two men.
- Hindi is spoken from our own spelling-to-sound rules. Common words are right;
  a rare or Sanskrit-heavy word can sound a little off. Tell us the word and we
  add a rule (`tests/voice-hindi-ipa.test.js`).
- Other Indian languages (Tamil, Bengali, …) aren't supported by these voices.
- Oracle can reclaim an Always Free server that sits almost idle for 7 days.
  If that happens, make a new one and run the script again.
