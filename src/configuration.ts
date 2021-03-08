import * as fs from "fs";
import * as nconf from "nconf";
import { RemoteDevice } from "./types";

export interface Cert {
  key: any;
  cert: any;
  ca: any;
}

const dockerFilePath = "/data/options.json";
const isInDocker = fs.existsSync(dockerFilePath);

const configFilePath = isInDocker ? dockerFilePath : "./configuration.json";

if (!fs.existsSync(configFilePath)) {
  throw new Error("No config found");
}

nconf.use("file", { file: configFilePath });
nconf.load();

// console.log("args", process.argv, nconf.key);

export const comport: string = nconf.get("ComPort");
export const mqttHost: string | undefined =
  process.argv[2] || nconf.get("mqttHost");
export const mqttUser: string | undefined =
  process.argv[3] || nconf.get("mqttUser") || "homeauto";
export const mqttPassword: string | undefined =
  process.argv[4] || nconf.get("mqttPassword") || "homeauto";

export let devices: RemoteDevice[] = [];
try {
  const file = fs.readFileSync(configFilePath);
  const parsed = JSON.parse(file.toString());
  devices = parsed.devices;
} catch (e) {
  console.log("failed to parse or read config file", e);
}

export const deviceMap = devices.reduce<{
  [id: string]: RemoteDevice | undefined;
}>((out, dev) => {
  out[dev.id] = dev;
  return out;
}, {});
