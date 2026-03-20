# VeezBot Robot

Control your robot remotely — live video stream and real-time control from any browser.

**[veezbot.com](https://veezbot.com)**

---

## What is VeezBot?

VeezBot is an open platform to build your own remotely controlled robot. You connect a Raspberry Pi to the VeezBot server, and anyone you invite can drive it from a browser — no app required.

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

**1. Install**
```bash
git clone https://github.com/veezbot/robot.git
cd robot
npm install
```

**2. Configure**

Create `/boot/veezbot.config.json` on your Pi (see `veezbot.config.json.example`):
```json
{
  "serverUrl": "https://veezbot.com",
  "token": "your-robot-token"
}
```

**3. Run**
```bash
npm start
```

Your robot will connect to the VeezBot server and appear in your dashboard.

---

## Plugin system *(coming soon)*

VeezBot will support a plugin/addon system so you can add custom behaviour to your robot without it being overwritten when you update.

For example, a plugin will be able to:
- React to events received from the server (wake, sleep, custom actions, …)
- Run custom scripts or control additional hardware
- Send custom telemetry data

Plugins will live in a separate folder and will never be touched by updates.
