import type { WsResponse } from './ws';

export const ActionEvent = {
  Execute: 'action:execute',
} as const;

export const Action = {
  Sleep:        'sleep',
  Wake:         'wake',
  RebootClient: 'reboot-client',
  RebootSystem: 'reboot-system',
} as const;

// Robot-side: no robotId — the robot knows its own identity
export interface ActionExecutePayload {
  action: string;
  args?:  Record<string, string>;
}

export type ActionExecuteResponse = WsResponse<Record<string, unknown>>;
