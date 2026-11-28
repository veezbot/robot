# robot — VeezBot Pi client

Sibling checkout of `workspace/` (dev commands, env: `../workspace/CLAUDE.md`). pnpm workspace with `lib/`
(`@veezbot/robot-lib`, consumed by server and web through `link:`). Deploy to the Pi: `pnpm deploy:dist`.

Node.js Pi client — Socket.IO, GPIO (pigpio), I2C, video stream (rpicam-vid + WHIP).

## Structure

```
lib/           # @veezbot/robot-lib — public WebSocket contract (built with tsup, part of this repo)
src/
├── main.ts    # Manual DI, hardware init, graceful shutdown
├── lifecycle.ts # Component contract (start(config)/stop()) + frozen RuntimeConfig
├── notifier.ts  # Typed in-process events (Notifier<T>)
├── config/    # local-config (env + /boot/veezbot.config.json, MOCK) + remote-config (fetched on each wake)
├── socket/    # Socket.IO client → /robot namespace; handle() validates server payloads
├── state/     # Desired vs actual state, reconcile()
├── action/    # Server actions (wake, sleep, reboot) → StateService
├── health/    # HealthRegistry: current problems → telemetry status/errors
├── control/   # Configured GPIO pins, failsafe, pigpio/mock (gpio-factory)
├── stream/    # FfmpegStream: a WHIP publisher pipeline kept alive (exit or stall → restart)
├── video/     # rpicam-vid → ffmpeg-whip (Component)
├── audio/     # ALSA → ffmpeg-whip (Component)
├── telemetry/ # System metrics, battery (INA219 over I2C)
├── chat/      # Chat messages → espeak-ng
├── command/   # Child processes, no shell
└── log/       # Timestamped, scoped logger (log.child('scope'))
```

## Key patterns

- **No framework**: manual DI in `main.ts`; services get a `log.child('<scope>')`, never `console.*`
- **Events**: services expose `Notifier`s (`socket.connected`, `stream.error`…), no global bus
- **State**: `StateService` keeps `desired` (set by actions, survives reconnections) apart from `actual`; anything that
  changes either calls `reconcile()`, never a direct wake/sleep. Hardware only runs while awake
- **Hardware that runs while awake** implements `Component` and is added to the list in `main.ts`: wake starts the list
  in order with the `RuntimeConfig`, sleep stops it all. A component's problems go to `HealthRegistry`
- **Hardware init**: `initGpio()` before any child process (see its comment), I2C through `openBattery()`; no
  hardware side effect at import time. Always open pins through `gpio-factory`, never import pigpio directly

## Conventions

- Files: `<domain>.service.ts` — one service per file
- Server → robot events: `socket.handle(event, Schema, handler)` with the lib's zod schema, never a raw `on`
- Child processes: `CommandService.spawn(bin, args)`, never a shell: server values (URLs, devices) and the token go
  through as plain arguments
- Pins: only the configured ones are driven; rest = their `defaultValue`, not 0
- Fail-fast on auth errors, fail-gracefully on hardware (return `null`, log, continue)
- Config is immutable once loaded — services read it, never write it
