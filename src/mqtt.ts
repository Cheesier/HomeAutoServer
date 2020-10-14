import { LightValue, NexaRemote } from "./types";
import * as mqtt from "mqtt";
import { mqttHost } from "./configuration";
import * as _ from "lodash";

let mqttClient: mqtt.Client | null = null;

const initMqtt = () => {
  console.log(`Connecting to ${mqttHost}`);
  mqttClient = mqtt.connect(
    mqttHost,
    {
      username: "homeauto",
      password: "homeauto",
    }
  );
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
}) => {
  const { id, name, button } = obj;
  publish(
    `homeassistant/device_automation/homeautoserver/${id}_${button}/config`,
    {
      automation_type: "trigger",
      topic: `homeautoserver/remote/${id}_${button}`,
      type: "button_short_press",
      subtype: button,
      device: {
        manufacturer: "Nexa",
        model: "PBT-707",
        name,
        via_device: "homeautoserver",
        identifiers: [id],
      },
    },
    { retain: false, qos: 0 }
  );
};

const publishRemote = (id: string, name: string) => {
  publishRemoteButton({ id, name, button: "1_on" });
  publishRemoteButton({ id, name, button: "1_off" });
  publishRemoteButton({ id, name, button: "2_on" });
  publishRemoteButton({ id, name, button: "2_off" });
  publishRemoteButton({ id, name, button: "3_on" });
  publishRemoteButton({ id, name, button: "3_off" });
  publishRemoteButton({ id, name, button: "group_on" });
  publishRemoteButton({ id, name, button: "group_off" });
};

const sendConfiguration = () => {
  console.log("Send devices configuration");

  publishRemote("2471582", "Office Remote");
};

const publish = (
  topic: string,
  message: { [key: string]: any },
  opts: mqtt.IClientPublishOptions
) => {
  if (mqttClient) {
    console.log("publish", topic, message);
    mqttClient.publish(topic, JSON.stringify(message), opts);
  }
};

export const reportRemoteButton = _.debounce(
  (obj: { [key: string]: any; proto: string }) => {
    console.log("obj", obj);
    if (obj && obj.proto !== "NEXA") {
      return;
    }

    const r = obj as NexaRemote;
    const unitId = r.group ? "group" : r.unit + 1;
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
