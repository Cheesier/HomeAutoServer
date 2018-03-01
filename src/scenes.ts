import * as config from "./configuration";
import { Scene, LightIdValue, SceneNoId } from "./types";

const { sceneMap } = config;

export function createScene(name: string, sceneLights: LightIdValue[]) {
  const value = { name, lights: sceneLights, enabled: true };
  const resultScene = config.createScene(value);
  sceneMap[resultScene.id] = resultScene;
}

export function removeScene(id: string) {
  if (!sceneMap[id]) {
    return;
  }
  config.removeScene(id);
  delete sceneMap[id];
}

export function updateScene(id: string, scene: Partial<SceneNoId>) {
  if (!sceneMap[id]) {
    return;
  }
  config.updateScene({ ...sceneMap[id], ...scene });
}
