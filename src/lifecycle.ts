import type { RobotConfigInit } from '@veezbot/robot-lib';

/** Config fetched from the server on each wake. Frozen: components read it, never write it. */
export type RuntimeConfig = Readonly<RobotConfigInit>;

/** Hardware that only runs while the robot is awake. Started in order on wake, all stopped on sleep. */
export interface Component {
  readonly name: string;
  start(config: RuntimeConfig): Promise<void>;
  /** Never throws: a stop that fails must not keep the others running. */
  stop(): Promise<void>;
}
