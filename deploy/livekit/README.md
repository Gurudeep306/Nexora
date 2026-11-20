# The Live video server (LiveKit)

NexoraGuru Live (`/live`) works in two ways:

| Without this server | With this server |
|---|---|
| Devices connect to each other directly. Up to 5 devices per room. | Every device sends its video once to the server, which forwards it. Rooms of 50 (setting `LIVE_MAX_PEOPLE`, up to 200). |
| Nothing to set up. | One free server, set up once (below). |

[LiveKit](https://livekit.io) is free and open source (Apache 2.0). The website
server (1 GB of memory) is too small to forward a class's video, so LiveKit
runs on its own server.

## Which server (free)

The **Oracle Cloud Always Free** Ampere server (up to 4 cores and 24 GB of
memory, and 10 TB of outgoing traffic a month at the time of writing) is enough
for many classes at once. If the Oracle server for the coding model
(`deploy/coder-model/`) has room, LiveKit can share it.

The other option is LiveKit Cloud's free plan. Its limits change, so check
their pricing page first. Either way, the website side is the same three
settings.

## Steps (about 30 minutes)

1. **DNS.** In Cloudflare, add `A live` → the Oracle server's public IP,
   **DNS only** (grey cloud).
2. **Open ports** in the Oracle "security list" *and* on the server
   (`sudo iptables -I INPUT ...` or `ufw`):
   - TCP 80, 443 (Caddy), 7881 (media over TCP), 5349 (TURN over TLS)
   - UDP 3478 (TURN), 50000–60000 (media)
3. **Install LiveKit** on the server:
   ```bash
   curl -sSL https://get.livekit.io | bash
   livekit-server generate-keys
   ```
   Keep the key and secret it prints.
4. **Config.** Copy `livekit.yaml` from this folder to `/etc/livekit.yaml`
   and put the key and secret in the `keys:` line.
5. **HTTPS** with Caddy (`/etc/caddy/Caddyfile`):
   ```
   live.nexoraguru.in {
     reverse_proxy localhost:7880
   }
   ```
   TURN over TLS (port 5349) needs a certificate too. LiveKit's own guide
   shows the Caddy layer-4 setup; for a first start, TURN over UDP 3478 also
   works.
6. **Run it as a service:**
   ```bash
   sudo tee /etc/systemd/system/livekit.service >/dev/null <<'UNIT'
   [Unit]
   Description=LiveKit
   After=network-online.target
   [Service]
   ExecStart=/usr/local/bin/livekit-server --config /etc/livekit.yaml
   Restart=always
   [Install]
   WantedBy=multi-user.target
   UNIT
   sudo systemctl enable --now livekit
   ```
7. **Tell the website.** On the website server, add to `/opt/nexora/.env`:
   ```
   LIVEKIT_URL=wss://live.nexoraguru.in
   LIVEKIT_API_KEY=the key
   LIVEKIT_API_SECRET=the secret
   ```
   and restart the site. Live → the line at the bottom of the page now says
   rooms go through the video server.

LiveKit's full guide: https://docs.livekit.io/home/self-hosting/vm/

## Small rooms without LiveKit: TURN

Direct rooms use a public STUN server to find each other. A few strict
networks also need a TURN relay. Either:

- `TURN_URLS` (comma separated) and `TURN_SECRET`: a coturn server with
  `use-auth-secret`; or
- `CF_TURN_KEY_ID` and `CF_TURN_API_TOKEN`: Cloudflare's TURN (1,000 GB a
  month free at the time of writing, shared with their SFU).

Without either, most home and mobile connections still work; some college or
office networks will not.
