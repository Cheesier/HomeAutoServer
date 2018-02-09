export enum Proto {
  NEXA = "NEXA",
  ANSLUTA = "ANSLUTA"
}

export interface Light {
  id: number;
  name: string;
  sender: number;
  unit: number;
  proto: Proto;
  dimmer: boolean;
  state: boolean;
  remotes: any[];
}

export interface Task {
  id: number;
  name: string;
  cron: string;
  lights: [{ id: string; value: number | string }];
  enabled: boolean;
}
