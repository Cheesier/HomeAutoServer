import { Light, LightNoId, NexaRemote, Proto } from "./types";

export const createNexaLight = (
  name: string,
  sender: number,
  unit: number,
  dimmer: boolean = false,
  remotes: NexaRemote[] = []
) => {
  remotes.push(nexaRemoteButton(sender, unit));
  return {
    name,
    sender,
    unit,
    proto: "NEXA",
    dimmer,
    state: false,
    remotes
  } as LightNoId;
};

export const nexaRemoteButton = (sender: number, unit: number) => {
  return { proto: "NEXA" as Proto, sender, unit } as NexaRemote;
};
