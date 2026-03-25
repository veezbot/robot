// server → robot: computed pin commands
export type PinCommand =
  | { pin: number; op: 'digital'; value: 0 | 1 }
  | { pin: number; op: 'pwm';     value: number }        // 0–255
  | { pin: number; op: 'servo';   pulseWidth: number };  // microseconds

export interface RobotPinOutputPayload {
  pins: PinCommand[];
}

export const RobotControlEvent = {
  Pins: 'control:pins', // server → robot
} as const;
