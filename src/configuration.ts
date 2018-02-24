import * as fs from "fs";
import * as nconf from "nconf";
import { Light, LightNoId, Task, TaskNoId } from "./types";

export interface Cert {
  key: any;
  cert: any;
  ca: any;
}

const configFilePath = "./config.json";

const defaults = {
  ComPort: "COM3",
  WebPort: 3443,
  password: "change me quickly please, do not enter me into any client",
  cert: {
    key: "",
    cert: "",
    ca: ""
  },
  lights: {},
  tasks: {}
};

if (!fs.existsSync(configFilePath)) {
  fs.writeFileSync(configFilePath, JSON.stringify(defaults, null, " "));
}

nconf.use("file", { file: configFilePath });
nconf.load();

export const lights: Map<string, Light> = JSON.parse(
  JSON.stringify(nconf.get("lights"))
);
export const tasks: Map<string, Task> = JSON.parse(
  JSON.stringify(nconf.get("tasks"))
);
export const password: string = nconf.get("password");

export const comport: number = nconf.get("ComPort");
export const port: number = nconf.get("WebPort");
const certPath = nconf.get("cert");

if (
  !certPath ||
  !("key" in certPath) ||
  !("cert" in certPath) ||
  !("ca" in certPath)
) {
  console.log("Missing property in certPath");
  console.log("certPath", certPath);
}

export const cert: Cert = {
  key: fs.readFileSync(certPath.key),
  cert: fs.readFileSync(certPath.cert),
  ca: fs.readFileSync(certPath.ca)
};

let nextAvailableId: number = nconf.get("nextAvailableId") || 1;

function load() {
  nconf.load();
}

export function addLight(light: LightNoId) {
  const id = nextAvailableId++;
  const resultLight = { ...light, id };
  nconf.set(`lights:${id}`, resultLight);
  console.log(`Saved light '${light.name}'`);
  save();
  return resultLight;
}

export function updateLight(light: Light) {
  const saneLight = { ...light, state: false };
  return addLight(saneLight);
}

export function removeLight(id: string) {
  nconf.set(`lights:${id}`, undefined);
  console.log(`Removed light ${id}`);
  return save();
}

// id: {
//   cron: "cron string",
//   lights: [{ id: 1337, value: true}, { id: 1338, value: 14}]
// }
// value is one of number, "ON", "OFF", "TOGGLE"

export function addTask(task: TaskNoId) {
  const id = nextAvailableId++;
  const resultLight = { ...task, id };
  nconf.set(`tasks:${id}`, { ...task, id });
  console.log(`Saved task: ${task.cron}`);
  save();
  return resultLight;
}

export function removeTask(id: string) {
  nconf.set(`tasks:${id}`, undefined);
  console.log(`removed task id: ${id}`);
  return save();
}

export function updateTask(task: Task) {
  nconf.set(`tasks:${task.id}`, { ...task });
  console.log(`Updated task: ${task.name || task.cron}`);
  save();
}

function save() {
  nconf.set("nextAvailableId", nextAvailableId);
  nconf.save(err => {
    if (err) {
      console.log("config save error:", err.message);
      return false;
    }
    console.log("saved config");
    return true;
  });
}
