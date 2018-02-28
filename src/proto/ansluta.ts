import { LightNoId } from "../types";

export const createAnslutaLight = (name: string) => {
  return { name, proto: "ANSLUTA", dimmer: true, state: false } as LightNoId;
};
