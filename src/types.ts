type Diff<T extends string, U extends string> = ({ [P in T]: P } &
  { [P in U]: never } & { [x: string]: never })[T];
type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

export interface Map<T> {
  [id: string]: T | undefined;
}

export type Proto = "NEXA" | "ANSLUTA";

export type StateType = boolean;

export type LightNoId = Omit<Light, "id">;

export type ID = string;

export interface ResID {
  id: ID;
}

export interface State {
  lights: Map<Light>;
  tasks: Map<Task>;
  scenes: Map<Scene>;
}

export interface Light {
  id: ID;
  name: string;
  sender: number;
  unit: number;
  proto: Proto;
  dimmer: boolean;
  state: boolean;
  remotes: NexaRemote[];
}

export type LightValue = "ON" | "OFF" | "TOGGLE" | number | boolean;

export interface LightIdValue {
  id: ID;
  value: LightValue;
}

export interface NexaRemote {
  proto: Proto;
  sender: number;
  unit: number;
}

export type TaskNoId = Omit<Task, "id">;

export interface Task {
  id: ID;
  name: string;
  cron: string;
  lights: LightIdValue[];
  enabled: boolean;
}

export type SceneNoId = Omit<Scene, "id">;

export interface Scene {
  id: ID;
  name: string;
  lights: LightIdValue[];
}
