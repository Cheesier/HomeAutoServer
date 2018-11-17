import { ReducerBuilder } from "redux-ts-simple";
import * as config from "./configuration";
import * as serial from "./serial";
import {
  StateType,
  LightValue,
  Scene,
  LightIdValue,
  LightNoId,
  Light
} from "./types";
import * as message from "./message";
import * as mqtt from "./mqtt";

const lightChangeListeners: ((obj: LightIdValue) => void)[] = [];
export const onLightChange = (callback: (obj: LightIdValue) => void) => {
  lightChangeListeners.push(callback);
};
export const notifyLightChange = (obj: LightIdValue) => {
  lightChangeListeners.forEach(listener => {
    listener(obj);
  });
};

interface NexaRemoteButtonListener {
  sender: number;
  unit: number;
  state: boolean;
  group: boolean;
}
let nexaRemoteListeners: ((obj: NexaRemoteButtonListener) => void)[] = [];
export const onRemoteEvent = (
  callback: (obj: NexaRemoteButtonListener) => void
) => {
  nexaRemoteListeners.push(callback);
  return () => {
    nexaRemoteListeners = nexaRemoteListeners.filter(
      listener => listener !== callback
    );
  };
};
export const notifyRemoteEvent = (obj: NexaRemoteButtonListener) => {
  nexaRemoteListeners.forEach(listener => {
    listener(obj);
  });
};

export const lightValueAsBool = (value: LightValue) =>
  typeof value === "number"
    ? value > 0
    : typeof value === "string"
      ? value === "ON"
      : value;

onLightChange(obj => {
  const { id, value } = obj;
  const light = lightMap[id];
  if (!light) {
    return;
  }
  const state = lightValueAsBool(value);
  light.state = state;
  console.log(`${light.name} (${light.id}) changed value ${value}`, typeof id);
  mqtt.reportLightValueChange({ id, value: state });
});

const { lightMap, sceneMap } = config;
let updateWsState: any = null;

export const init = (updateWsStateUgly: () => void) => {
  updateWsState = updateWsStateUgly;
};

export function createLight(light: LightNoId) {
  const createdLight = config.addLight(light);
  lightMap[createdLight.id] = createdLight;
}

export function pairLight(id: string) {
  if (lightMap[id] && lightMap[id].proto === "NEXA") {
    serial.sendMessage(`NEXA PAIR ${lightMap[id].sender} ${lightMap[id].unit}`);
  }
}

export function removeLight(id: string) {
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
    light.state = state;
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
    light.state = true;
    serial.sendMessage(cmd);
  } else if (light.proto === "ANSLUTA") {
    console.log("dim ANSLUTA", light, lightLevel);
    const cmd = `${light.proto} SET ${lightLevel}`;
    light.state = lightLevel >= 2;
    serial.sendMessage(cmd);
  }
  updateWsState();
}

export function nexaSetGroupState(id: number, state: StateType) {
  serial.sendMessage(`NEXA SET ${id} GROUP ${state ? "ON" : "OFF"}`);
}

export function nexaAddRemote(lightId: string, remote: Light["remotes"][0]) {
  const light = lightMap[lightId];
  if (!light) {
    return;
  }

  light.remotes.push(remote);

  return config.updateLight({
    ...light
  });
}

export function nexaAddScanRemote(lightId: string, timeout: number = 5000) {
  let remoteCleanup: () => void | undefined;
  let timer: any;
  const cleanup = () => {
    if (remoteCleanup) remoteCleanup();
    clearTimeout(timer);
  };
  return new Promise((resolve, reject) => {
    remoteCleanup = onRemoteEvent(remote => {
      // Do not register group button, ignore off commands
      if (!remote.group && remote.state) {
        const newRemote: Light["remotes"][0] = {
          proto: "NEXA",
          sender: remote.sender,
          unit: remote.unit
        };
        nexaAddRemote(lightId, newRemote);
        resolve();
      }
    });
    timer = setTimeout(reject, timeout);
  })
    .then(() => {
      cleanup();
      updateWsState();
    })
    .catch(() => {
      console.log("nexaAddScanRemote timeout after", timeout);
      updateWsState();
      cleanup();
    });
}

export function removeNexaRemote(
  lightId: string,
  removeItem: Light["remotes"][0]
) {
  const light = lightMap[lightId];
  if (!light) {
    return;
  }

  light.remotes = light.remotes.filter(
    remote =>
      !(
        remote.proto === removeItem.proto &&
        remote.sender === removeItem.sender &&
        remote.unit === removeItem.unit
      )
  );
  config.updateLight({ ...light });
  updateWsState();
  return light;
}

export const lightReducer = new ReducerBuilder({})
  .on(message.setLight, (state, action) => {
    console.log("setLight", action.payload);
    setSwitch(action.payload.id, action.payload.value);
    return state;
  })
  .on(message.toggleLight, (state, action) => {
    console.log("toggleLight", action.payload);
    setSwitch(action.payload.id, "TOGGLE");
    return state;
  })
  .on(message.pairLight, (state, action) => {
    console.log("pairLight", action.payload);
    pairLight(action.payload.id);
    return state;
  })
  .on(message.setAllLight, (state, action) => {
    console.log("setAllLight", action.payload);
    setAllSwitches(lightValueAsBool(action.payload.value));
    return state;
  })
  .on(message.updateLight, (state, action) => {
    console.log("updateLight", action.payload);
    config.updateLight(action.payload);
    return state;
  })
  .on(message.removeLight, (state, action) => {
    console.log("removeLight", action.payload);
    config.removeLight(action.payload.id);
    return state;
  })
  .on(message.addScanRemote, (state, action) => {
    console.log("addScanRemote", action.payload);
    nexaAddScanRemote(action.payload.lightId, action.payload.timeout);
    return state;
  })
  .on(message.removeNexaRemote, (state, action) => {
    console.log("removeNexaRemote", action.payload);
    removeNexaRemote(action.payload.lightId, {
      proto: "NEXA",
      sender: action.payload.sender,
      unit: action.payload.unit
    });
    return state;
  })
  .build();
