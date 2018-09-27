import * as mosca from "mosca";
import * as lights from "./lights";
import { LightValue, Omit } from "./types";
import * as mqtt from "mqtt";
import { lightMap } from "./configuration";

const ascoltatore = {
  // using ascoltatore
  type: "mongo",
  url: "mongodb://localhost:27017/mqtt",
  pubsubCollection: "ascoltatori",
  mongo: {}
};

const settings = {
  port: 1883,
  backend: ascoltatore
};

const hassClient = mqtt.connect("mqtt://192.168.0.183:1883");
hassClient.subscribe("light/#", { qos: 0 });

hassClient.on("message", (topic, message) => {
  // message is Buffer
  console.log(topic, message.toString());
  hassClient.end();
});

const sendConfiguration = () => {
  Object.values(lightMap).forEach(light => {
    const dimmerProperties = light.dimmer
      ? {
          brightness: true,
          brightness_scale: 16
        }
      : {};
    hassClient.publish(
      `homeassistant/light/homeautoserver/${light.id}/config`,
      JSON.stringify({
        platform: "mqtt_json",
        name: light.name,
        command_topic: `light/${light.id}/set`,
        state_topic: `light/${light.id}`
        // ...dimmerProperties
      }),
      { retain: true, qos: 0 }
    );
  });
};

const server = new mosca.Server(settings);

server.on("clientConnected", client => {
  console.log("client connected", client.id);
});

// fired when a message is received
server.on("published", (packet, client) => {
  const topic = packet.topic;
  let payload = packet.payload.toString();

  try {
    payload = JSON.parse(payload);
  } catch (e) {
    //
  }
  if (topic === "/set-light") {
    lights.setSwitch(payload.id, payload.value);
  }
  if (/light\/.*\/set/.test(topic)) {
    const id = topic.split("/")[1];
    console.log("turn ", id, payload);
    lights.setSwitch(id, payload.state);
  }
});

// fired when the mqtt server is ready
const setup = () => {
  console.log("Mosca server is up and running");
};

server.on("ready", setup);

export const reportLightValueChange = (obj: {
  id: string;
  value: LightValue;
}) => {
  // const message = {
  //   topic: "/changed-state",
  //   payload: JSON.stringify(obj),
  //   qos: 0,
  //   retain: false
  // };

  // publish(message);

  const state =
    typeof obj.value === "boolean" ? (obj.value ? "ON" : "OFF") : "OFF";

  const hassMessage = {
    topic: `light/${obj.id}`,
    payload: { state },
    qos: 0,
    retain: true
  };

  console.log("hassmessage", hassMessage);

  // publish(hassMessage);
  hassClient.publish(hassMessage.topic, JSON.stringify(hassMessage.payload), {
    retain: true,
    qos: 0
  });
};

const publish = (message: Omit<mosca.Packet, "messageId">) => {
  // server.publish(message, () => {
  //   // console.log("sent message", message);
  // });
};

export const reportRemoteButton = (obj: {
  [key: string]: any;
  proto: string;
}) => {
  const message = {
    topic: "/remote-button",
    payload: JSON.stringify(obj),
    qos: 0,
    retain: false
  };

  publish(message);
};
