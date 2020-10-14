import * as fs from "fs";
import * as nconf from "nconf";

export interface Cert {
  key: any;
  cert: any;
  ca: any;
}

const dockerFilePath = "/data/options.json";
const isInDocker = fs.existsSync(dockerFilePath);

const configFilePath = isInDocker ? dockerFilePath : "./config.json";

if (!fs.existsSync(configFilePath)) {
  throw new Error("No config found");
}

nconf.use("file", { file: configFilePath });
nconf.load();

export const comport: number = nconf.get("ComPort");
export const mqttHost: string | undefined = nconf.get("mqttHost");
