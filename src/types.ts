export type Proto = "NEXA" | "ANSLUTA";

export interface Light {
  id: number;
  name: string;
  sender: number;
  unit: number;
  proto: Proto;
  dimmer: boolean;
  state: boolean;
  remotes: NexaRemote[];
}

export interface NexaRemote {
  proto: Proto;
  sender: number;
  unit: number;
}

export interface Task {
  id: number;
  name: string;
  cron: string;
  lights: [{ id: string; value: number | string }];
  enabled: boolean;
}
