import { createAction } from "redux-ts-simple";
import * as Resource from "./types";

export const clientPrefix = `HOMEAUTO_FROM_CLIENT/`;
export const serverPrefix = `HOMEAUTO_FROM_SERVER/`;

/*

  CONTROL

*/

export const requestState = createAction<never>(`${clientPrefix}STATE_REQUEST`);
export const stateUpdate = createAction<Resource.State>(
  `${serverPrefix}STATE_UPDATE`
);
/*

  LIGHT

*/

interface SetLightPayload {
  id: Resource.ID;
  value: Resource.LightValue;
}
export const setLight = createAction<SetLightPayload>(
  `${clientPrefix}SET_LIGHT`
);

export const toggleLight = createAction<Resource.ResID>(
  `${clientPrefix}TOGGLE_LIGHT`
);

export const setAllLight = createAction<{ value: Resource.LightValue }>(
  `${clientPrefix}SET_ALL_LIGHT`
);

interface AddNexaLightPayload {
  name: string;
  sender: number;
  unit: number;
  dimmer: boolean;
}
export const addNexaLight = createAction<AddNexaLightPayload>(
  `${clientPrefix}ADD_NEXA_LIGHT`
);

interface AddAnslutaLightPayload {
  name: string;
}
export const addAnslutaLight = createAction<AddAnslutaLightPayload>(
  `${clientPrefix}ADD_ANSLUTA_LIGHT`
);

export const pairLight = createAction<Resource.ResID>(
  `${clientPrefix}PAIR_LIGHT`
);

export const removeLight = createAction<Resource.ResID>(
  `${clientPrefix}REMOVE_LIGHT`
);

export const updateLight = createAction<Resource.Light>(
  `${clientPrefix}UPDATE_LIGHT`
);

export const addScanRemote = createAction<{
  lightId: Resource.ID;
  timeout?: number;
}>(`${clientPrefix}ADD_SCAN_REMOTE`);

interface RemoveNexaRemotePayload {
  lightId: Resource.ID;
  sender: number;
  unit: number;
}
export const removeNexaRemote = createAction<RemoveNexaRemotePayload>(
  `${clientPrefix}REMOVE_REMOTE`
);

/*

  TASK

*/

interface AddTaskPayload {
  name: string;
  cron: string;
  lightValues: Resource.LightValue[];
}
export const addTask = createAction<AddTaskPayload>(`${clientPrefix}ADD_TASK`);

interface SetTaskEnabledPayload {
  id: Resource.ID;
  enabled: boolean;
}
export const setTaskEnabled = createAction<SetTaskEnabledPayload>(
  `${clientPrefix}SET_TASK_ENABLED`
);

export const removeTask = createAction<Resource.ResID>(
  `${clientPrefix}REMOVE_TASK`
);

export const updateTask = createAction<Resource.Task>(
  `${clientPrefix}UPDATE_TASK`
);

/*

  SCENE

*/

export const triggerScene = createAction<Resource.ResID>(
  `${clientPrefix}TRIGGER_SCENE`
);

interface CreateScenePayload {
  name: string;
  lightValues: Resource.LightValue[];
}
export const createScene = createAction<CreateScenePayload>(
  `${clientPrefix}CREATE_SCENE`
);

export const removeScene = createAction<Resource.ResID>(
  `${clientPrefix}REMOVE_SCENE`
);

export const updateScene = createAction<Resource.Scene>(
  `${clientPrefix}UPDATE_SCENE`
);
