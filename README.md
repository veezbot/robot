# VeezBot Robot

Control your robot remotely — live video stream and real-time control from any browser.

**[veezbot.com](https://veezbot.com)**

---

## What is VeezBot?

VeezBot is an open platform to build your own remotely controlled robot. You connect a Raspberry Pi to the VeezBot server, and anyone you invite can drive it from a browser.

- Live video stream (WebRTC)
- Real-time control (keyboard, joystick, buttons)
- Permission system (owner, friend, user, visitor)
- Works over the internet via the VeezBot server

---

## Requirements

- Raspberry Pi (any model with network access)
- Camera (for video streaming)
- A VeezBot account and a robot token — [veezbot.com](https://veezbot.com)

---

## Getting started

**1. On your Pi — initialize**
```bash
git clone https://github.com/veezbot/robot.git
cd robot
bash scripts/init.sh
pnpm install
pnpm build
```

**2. Configure**

Create `/boot/veezbot.config.json` on your Pi (see `veezbot.config.json.example`):
```json
{
  "serverUrl": "https://veezbot.com",
  "token": "your-robot-token"
}
```

**3. Install as a systemd service**
```bash
pnpm install:service
```

The robot will start automatically on boot and restart on failure. Logs: `journalctl -u veezbot -f`.

Your robot will connect to the VeezBot server and appear in your dashboard.

---

## Development

The build runs on your **dev machine** (TypeScript → `dist/`) and is deployed to the Pi over SSH.

**Setup `scripts/.env`** (see `scripts/.env`):
```bash
PI_USER=pi
PI_HOST=raspberrypi
PI_DIR=/home/pi/veezbot-client
```

**Setup SSH key auth** (once — no `sshpass`/`rsync` needed, works natively on Windows):
```bash
pnpm setup:ssh-key
```
Generates a dedicated key at `scripts/.ssh/id_veezbot` and installs it on the Pi (prompts for the
Pi's password once, interactively). All other `remote-*`/`deploy:*`/`dev:remote` scripts use this
key afterwards.

**Watch mode — auto-deploy on save**

From the workspace root, with `ROBOT_TOKEN_PI` in `server/.env` and a `SERVER_URL` the Pi can reach (a line below the block of its `.env.local`):
```bash
pnpm dev:robot:remote
```

On each save, TypeScript is compiled locally, `dist/` is synced to the Pi, `/boot/veezbot.config.json` is updated with the dev `SERVER_URL` and `TOKEN`, and the systemd service is restarted automatically. `lib/` is watched too — any change to the shared contract triggers a redeploy.

When you stop the watcher (`Ctrl+C`), the service is stopped on the Pi.

**One-off commands**

| Command | Description |
|---|---|
| `pnpm deploy:dist` | Build and push `dist/` to the Pi |
| `pnpm deploy:ffmpeg` | Push the custom `ffmpeg-whip` binary to the Pi |
| `pnpm run init:pi` | Run `init.sh` on the Pi remotely (first setup) |
| `pnpm install:service` | Install and enable the systemd service on the Pi |

---

## Updates

Releases are git tags `robot@x.y.z` (SemVer, notes on the GitHub release): a major bump means a breaking change.
When the server needs a newer robot, it refuses the connection: the robot logs `update the robot` and exits, and the
web shows "update required" next to it. Update to the latest release, then restart it.

---

## Plugin system *(coming soon)*

VeezBot will support a plugin/addon system so you can add custom behaviour to your robot without it being overwritten when you update.

For example, a plugin will be able to:
- React to events received from the server (wake, sleep, custom actions, …)
- Run custom scripts or control additional hardware
- Send custom telemetry data

Plugins will live in a separate folder and will never be touched by updates.
