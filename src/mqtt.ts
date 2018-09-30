// import * as mosca from "mosca";
import * as lights from "./lights";
import { LightValue } from "./types";
import * as mqtt from "mqtt";
import { lightMap, mqttHost } from "./configuration";

let mqttClient: mqtt.Client | null = null;

const initMqtt = () => {
  console.log(`Connecting to ${mqttHost}`);
  mqttClient = mqtt.connect(mqttHost);
  mqttClient.subscribe("light/#", { qos: 0 });
  mqttClient.subscribe("homeassistant/status");

  mqttClient.on("message", (topic, message) => {
    // message is Buffer
    console.log(topic, message.toString());
    // hassClient.end();

    if (/light\/.*\/set/.test(topic)) {
      const payload = JSON.parse(message.toString());
      const id = topic.split("/")[1];
      console.log("turn ", id, payload);
      lights.setSwitch(id, payload.state);
    }

    if (topic === "homeassistant/status") {
      sendConfiguration();
    }
  });
};

const sendConfiguration = () => {
  Object.values(lightMap).forEach(light => {
    const dimmerProperties = light.dimmer
      ? {
          brightness: true,
          brightness_scale: 16
        }
      : {};
    publish(
      `homeassistant/light/homeautoserver/${light.id}/config`,
      {
        platform: "mqtt_json",
        name: light.name,
        command_topic: `light/${light.id}/set`,
        state_topic: `light/${light.id}`
        // ...dimmerProperties
      },
      { retain: false, qos: 0 }
    );
  });
};

export const reportLightValueChange = (obj: {
  id: string;
  value: LightValue;
}) => {
  const state =
    typeof obj.value === "boolean" ? (obj.value ? "ON" : "OFF") : "OFF";

  publish(
    `light/${obj.id}`,
    { state },
    {
      retain: true,
      qos: 0
    }
  );
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

export const reportRemoteButton = (obj: {
  [key: string]: any;
  proto: string;
}) => {
  publish("lightremote", obj, { qos: 0, retain: false });
};

if (mqttHost) {
  initMqtt();
  sendConfiguration();
}
