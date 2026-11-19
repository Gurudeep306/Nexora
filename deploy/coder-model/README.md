# Your own coding model (free, no API key)

NexoraGuru's coding AI (AI test cases, hints, code analysis on the Solve page) can run on **your own model**, on a **free Oracle Cloud server**. No company's API key. The only key is a password your server makes for itself.

- **Model:** Qwen2.5-Coder 1.5B Instruct (open, Apache-2.0), run by [llama.cpp](https://github.com/ggml-org/llama.cpp) on the server's CPU.
- **Server:** Oracle Cloud "Always Free" Ampere VM: 4 CPUs, 24 GB RAM, free with no time limit. Oracle asks for a card to check who you are; the Always Free server is not charged.
- **Used for:** only the "Code coach, AI tests and analysis" feature. Nothing else on the site uses it.

Everything below works from a phone.

## 1. Make the free server (about 15 minutes)

1. Open **cloud.oracle.com** → **Sign up**. Choose your home region (pick one near you, e.g. Mumbai or Hyderabad; it can't be changed later).
2. After you sign in: menu (☰) → **Compute** → **Instances** → **Create instance**.
3. **Name:** `nexora-coder`.
4. **Image and shape** → **Edit**:
   - Image: **Canonical Ubuntu 24.04**.
   - Shape: **Change shape** → **Ampere** → **VM.Standard.A1.Flex** → **4 OCPUs**, **24 GB** memory. It shows "Always Free-eligible".
5. **Add SSH keys:** choose **Generate a key pair for me**. You won't need it if you use Cloud Shell (next step), but download the private key anyway.
6. **Create.** Wait until the state is **Running**. Note the **Public IP address**.

If Oracle says "Out of capacity", try again later, or choose 2 OCPUs and 12 GB. It still works, just slower.

## 2. Open the web ports (2 minutes)

On the instance page → **Primary VNIC** → the **Subnet** link → **Security Lists** → the default list → **Add Ingress Rules**:

- Source CIDR `0.0.0.0/0`, IP protocol **TCP**, destination port **80** → **Add**.
- The same again for port **443**.

## 3. Install the model (one command, about 15 minutes)

1. At the top right of the Oracle console, press the **Cloud Shell** icon (`>_`).
2. Connect to your server (put your IP in place of `1.2.3.4`). Cloud Shell asks for the private key file once; upload the one you downloaded and use its name:

   ```bash
   ssh -i ssh-key.key ubuntu@1.2.3.4
   ```

3. Paste this and press Enter:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/coder-model/setup.sh -o setup.sh && sudo bash setup.sh
   ```

It builds llama.cpp, downloads the model, starts it as a service (it comes back by itself after a restart), turns on HTTPS, and answers a test question. At the end it prints three things: a **Base URL**, an **API key** (your server's password) and the **model name**.

## 4. Connect it to NexoraGuru (2 minutes)

1. NexoraGuru → **Admin** → **AI models** → **Add a provider**.
2. Provider: **Your own model (free server)**. Paste the **Base URL** and the **API key** the script printed. Press **Add**; it makes a real test call.
3. Under **Per feature**, set **Code coach, AI tests and analysis** to this provider and the model `nexora-coder`.

Done. Open any problem → **AI tests** → **Generate tests**.

## How fast is it?

On 4 Ampere cores, the 1.5B model writes about 20–30 words a second. Generating tests asks it three things at once (a generator with edge cases, a brute-force solution, an efficient one), then runs them in the judge, so **expect about a minute** the first time for a problem. The tests are then **kept for that problem**: the next person gets them at once.

Want smarter answers, if slower? Run the script again with a bigger model:

```bash
sudo MODEL=3b bash setup.sh
```

`MODEL=3b` is about 2× slower; `MODEL=7b` is about 5× slower. The address and password stay the same.

## Looking after it

- Is it running? `systemctl status nexora-coder`
- What happened? `journalctl -u nexora-coder -n 50`
- Restart: `sudo systemctl restart nexora-coder`
- New password: `sudo rm /opt/nexora-coder/api-key && sudo bash setup.sh`, then paste the new one in Admin.

## Honest limits

- A 1.5B model is small. It writes good edge-case inputs and brute-force solutions for most easy and medium problems. On hard problems its solutions often fail the examples. Then NexoraGuru keeps fewer tests; it **never keeps a test whose answer wasn't checked** by a solution that passed every official example.
- Oracle can reclaim an Always Free VM that sits almost idle for 7 days. Regular use of the AI tests keeps it busy. If it is ever reclaimed, make a new one and run the script again.
