/**
 * Level of the robot <-> server contract, sent by the robot on connect: +1 with every breaking change to this lib (an
 * event renamed, a payload field required), in the same commit as the `BREAKING:` line that bumps the robot's major.
 * The server refuses a robot below its own level: an old robot stops with a clear message instead of misbehaving.
 */
export const ROBOT_PROTOCOL = 1;

/** What a robot that sends no level speaks: those built before the level existed. */
export const LEGACY_ROBOT_PROTOCOL = 1;

/** `auth` of the robot's socket handshake. */
export interface RobotHandshakeAuth {
  token:    string;
  protocol: number;
}

/** `data` of the `OUTDATED_ROBOT` connect error. */
export interface OutdatedRobotData {
  protocol: number; // the robot's
  required: number; // the server's
}
