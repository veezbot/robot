# @veezbot/robot-lib

Public WebSocket contract robot <-> server (zod schemas, types via `z.infer`), also read by server-lib. Consumed through
`link:` by server and web (via server-lib, which re-exports what web needs); robot uses it as `workspace:*`.

- Dual build (tsup, `tsup.config.ts`, zod external): CJS for NestJS (`require`), ESM for Vite; `exports` routes
  `import` to `.js` / `.d.ts` and `require` to `.cjs` / `.d.cts`. Never edit `dist/`.
- After a change: `pnpm build` here (or `pnpm dev` in watch) before the consumers see it.
- `*Event`: `as const` object of event names; enums built from it with `z.enum(Obj)`. `*Payload`: input / request type.
  `*Response`: ack, always `WsResponse<T>`.
- No `type XEvent = typeof XEvent[...]`, no `{ [Event.Foo]: Payload }` maps: import the types directly.
- `ErrorCode` here = robot auth errors only; web / server errors live in server-lib.
- A change an already released robot can't follow (renamed / removed event or field, new required field) bumps
  `ROBOT_PROTOCOL` (`src/protocol.ts`) in the same commit, whose message carries a `BREAKING:` line: the server then
  refuses older robots and shows their owner an update. An additive change (optional field, new event) bumps nothing.
- `RobotConfig` stays lean (battery, pins, audio): the server maps its `ControlConfig` to it before sending.
