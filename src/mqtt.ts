import { LightValue, NexaRemote, RemoteDevice } from "./types";
import * as mqtt from "mqtt";
import {
  mqttHost,
  mqttUser,
  mqttPassword,
  devices,
  deviceMap,
} from "./configuration";
import * as _ from "lodash";

let mqttClient: mqtt.Client | null = null;

setInterval(() => {
  if (!mqttClient || !mqttClient.connected) {
    console.log("Not connected to mqtt, trying to reconnect");
    initMqtt();
  }
}, 10000);

const initMqtt = () => {
  console.log(`Connecting to ${mqttHost} ${mqttUser}`);
  mqttClient = mqtt.connect(
    "mqtt://" + mqttHost,
    { username: mqttUser, password: mqttPassword, protocol: "mqtt" }
  );
  console.log("MQTT connected");
  mqttClient.subscribe("light/#", { qos: 0 });
  mqttClient.subscribe("homeassistant/status");

  mqttClient.on("message", (topic, message) => {
    // message is Buffer
    console.log(topic, message.toString());

    if (topic === "homeassistant/status" && message.toString() === "online") {
      sendConfiguration();
    }
  });
};

const publishRemoteButton = (obj: {
  id: string;
  name: string;
  button: string;
  device: {
    manufacturer: string;
    model: string;
    name: string;
    via_device: string;
    identifiers: string[];
  };
}) => {
  const { id, name, button, device } = obj;
  publish(
    `homeassistant/device_automation/homeautoserver/${id}_${button}/config`,
    {
      automation_type: "trigger",
      topic: `homeautoserver/remote/${id}_${button}`,
      type: "button_short_press",
      subtype: button,
      device,
    },
    { retain: false, qos: 0 }
  );
};

const publishPBT707Remote = (id: string, name: string) => {
  const device = {
    manufacturer: "Nexa",
    model: "PBT-707",
    name,
    via_device: "homeautoserver",
    identifiers: [id],
  };
  publishRemoteButton({ id, name, button: "1_on", device });
  publishRemoteButton({ id, name, button: "1_off", device });
  publishRemoteButton({ id, name, button: "2_on", device });
  publishRemoteButton({ id, name, button: "2_off", device });
  publishRemoteButton({ id, name, button: "3_on", device });
  publishRemoteButton({ id, name, button: "3_off", device });
  publishRemoteButton({ id, name, button: "group_on", device });
  publishRemoteButton({ id, name, button: "group_off", device });
};

const publishWT2Remote = (id: string, name: string) => {
  const device = {
    manufacturer: "Nexa",
    model: "WT-2",
    name,
    via_device: "homeautoserver",
    identifiers: [id],
  };
  publishRemoteButton({ id, name, button: "left_on", device });
  publishRemoteButton({ id, name, button: "left_off", device });
  publishRemoteButton({ id, name, button: "right_on", device });
  publishRemoteButton({ id, name, button: "right_off", device });
};

const publishRemote = (dev: RemoteDevice) => {
  switch (dev.type) {
    case "WT-2":
      publishPBT707Remote(dev.id, dev.name);
      break;
    case "PBT-707":
      publishWT2Remote(dev.id, dev.name);
      break;

    default:
      console.error("unknown remote type", dev);
  }
};

const sendConfiguration = () => {
  console.log("Send devices configuration");

  devices.forEach(publishRemote);
};

const publish = (
  topic: string,
  message: { [key: string]: any },
  opts: mqtt.IClientPublishOptions
) => {
  if (mqttClient) {
    // console.log("publish", topic, message);
    mqttClient.publish(topic, JSON.stringify(message), opts);
  } else {
    console.error("atempted publish but no mqtt server");
  }
};

export const reportRemoteButton = _.debounce(
  (obj: { [key: string]: any; proto: string }) => {
    console.log("obj", obj);
    if (obj && obj.proto !== "NEXA") {
      return;
    }

    const r = obj as NexaRemote;

    let unitId = r.group ? "group" : r.unit + 1;
    const device = deviceMap[r.sender];
    if (device && device.type === "WT-2") {
      unitId = r.unit === 11 ? "left" : "right";
    }

    const id = `${r.sender}_${unitId}_${r.state ? "on" : "off"}`;
    publish(`homeautoserver/remote/${id}`, obj, {
      qos: 0,
      retain: false,
    });
  },
  500,
  { trailing: false, leading: true, maxWait: 500 }
);

if (mqttHost) {
  initMqtt();
  sendConfiguration();
}
