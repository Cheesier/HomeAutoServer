import { ReducerBuilder } from "redux-ts-simple";
import * as config from "./configuration";
import * as serial from "./serial";
import { StateType, LightValue, Scene, LightIdValue } from "./types";
import * as message from "./message";
import * as mqtt from "./mqtt";

const listeners = [];

export const onLightChange = (callback: (obj: LightIdValue) => void) => {
  listeners.push(callback);
};

export const notifyLightChange = (obj: LightIdValue) => {
  listeners.forEach(listener => {
    listener(obj);
  });
};

onLightChange(obj => {
  const { id, value } = obj;
  const light = lightMap[id];
  if (!light) {
    return;
  }
  const state =
    typeof value === "number"
      ? value > 0
      : typeof value === "string" ? value === "ON" : value;
  lightMap[obj.id].state = state;
  console.log(`${light.name} (${light.id}) changed value ${value}`, typeof id);
  mqtt.reportLightValueChange({ id, value: state });
});

const { lightMap, sceneMap } = config;
let updateWsState = null;

export const init = (updateWsStateUgly: () => void) => {
  updateWsState = updateWsStateUgly;
};

export function createLight(light) {
  const createdLight = config.addLight(light);
  lightMap[createdLight.id] = createdLight;
}

export function pairLight(id) {
  if (lightMap[id] && lightMap[id].proto === "NEXA") {
    serial.sendMessage(`NEXA PAIR ${lightMap[id].sender} ${lightMap[id].unit}`);
  }
}

export function removeLight(id) {
  if (!lightMap[id]) {
    return;
  }
  config.removeLight(id);
  delete lightMap[id];
}

export function toggleSwitch(id: string) {
  if (!lightMap[id]) {
    return;
  }
  console.log("toggle", lightMap[id]);
  const newState = !lightMap[id].state;
  setSwitchState(id, newState);
}

export function setSwitch(id: string, state: LightValue) {
  switch (typeof state) {
    case "number":
      console.log("dim", id, state);
      dimLight(id, state);
      break;
    case "string":
      if (state === "TOGGLE") {
        toggleSwitch(id);
        break;
      }
      const onOffState = state === "ON";
      setSwitchState(id, onOffState);
      break;
    case "boolean":
      setSwitchState(id, state as boolean);
      break;
  }
}

export function setSwitchState(id: string, state: boolean) {
  const light = lightMap[id];
  if (!light) {
    return;
  }
  if (light.proto === "NEXA") {
    const cmd = `${light.proto} SET ${light.sender} ${light.unit} ${
      state ? "ON" : "OFF"
    }`;
    serial.sendMessage(cmd);
  } else if (light.proto === "ANSLUTA") {
    const cmd = `${light.proto} SET ${state ? "2" : "1"}`;
    lightMap[id].state = state;
    updateWsState();
    serial.sendMessage(cmd);
  }
}

export function setAllSwitches(state: StateType) {
  Object.keys(lightMap).forEach(light => {
    setSwitchState(light, state);
  });
}

export function triggerScene(id: string) {
  if (!sceneMap[id]) {
    return;
  }
  const scene: Scene = sceneMap[id];
  scene.lights.forEach(light => {
    setSwitch(light.id, light.value);
  });
}

export function dimLight(id: string, lightLevel: LightValue) {
  const light = lightMap[id];
  if (!light) {
    return;
  }
  if (light.proto === "NEXA") {
    console.log("dim NEXA", light, lightLevel);
    const cmd = `${light.proto} DIM ${light.sender} ${
      light.unit
    } ${lightLevel}`;
    lightMap[id].state = true;
    serial.sendMessage(cmd);
  } else if (light.proto === "ANSLUTA") {
    console.log("dim ANSLUTA", light, lightLevel);
    const cmd = `${light.proto} SET ${lightLevel}`;
    lightMap[id].state = lightLevel >= 2;
    serial.sendMessage(cmd);
  }
  updateWsState();
}

export function nexaSetGroupState(id: number, state: StateType) {
  serial.sendMessage(`NEXA SET ${id} GROUP ${state ? "ON" : "OFF"}`);
}

export const lightReducer = new ReducerBuilder({})
  .on(message.setLight, (state, action) => {
    console.log("setLight", action.payload);
    setSwitch(action.payload.id, action.payload.value);
    return state;
  })
  .build();
