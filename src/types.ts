export type Proto = "NEXA" | "ANSLUTA";

export type StateType = boolean;

export interface LightNoId {
  name: string;
  sender: number;
  unit: number;
  proto: Proto;
  dimmer: boolean;
  state: boolean;
  remotes: NexaRemote[];
}

export interface Light extends LightNoId {
  id: string;
}

export type LightValue = "ON" | "OFF" | "TOGGLE" | number;

export interface LightIdValue {
  id: number;
  value: LightValue;
}

export interface NexaRemote {
  proto: Proto;
  sender: number;
  unit: number;
}

export interface TaskNoId {
  name: string;
  cron: string;
  lights: LightIdValue[];
  enabled: boolean;
}

export interface Task extends TaskNoId {
  id: string;
}

export type IdType = string;
