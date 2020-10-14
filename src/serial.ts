import * as SerialPort from "serialport";
import * as config from "./configuration";
import { rateLimit } from "./utils";
import * as mqtt from "./mqtt";

const Readline = SerialPort.parsers.Readline;
const port = new SerialPort(config.comport.toString(), {
  baudRate: 9600,
  autoOpen: true,
});
const parser = new Readline({ delimiter: Buffer.from("\n", "utf8") });
port.pipe(parser);

setInterval(() => {
  if (!(port as any).isOpen) {
    console.log("Trying to reconnect to Arduino");
    port.open();
  }
}, 10000);

port.on("open", () => {
  console.log("Connected to Arduino");
});

port.on("close", () => {
  console.log("Lost connection to Arduino");
});

// open errors will be emitted as an error event
port.on("error", (err) => {
  console.log("Error: ", err.message);
});

export function reset() {
  port.close(() => {
    port.open();
  });
}

function sendMessageInternal(msg: string) {
  if ((port as any).isOpen) {
    console.log("msg to arduino:", msg);
    port.write(msg + "\n");
  }
}

export const sendMessage: (msg: string) => void = rateLimit(
  sendMessageInternal,
  200
);

parser.on("data", (data: string) => {
  console.log("From arduino:", data);
  const parts = data.split(" ");
  switch (parts[0]) {
    case "NEXA-REMOTE:":
      const sender = parseInt(parts[1], 10);
      const unit = parseInt(parts[2], 10);
      const isGroup = parts[3] === "GROUP";
      const state = parts[4].trim() === "ON" ? true : false;

      mqtt.reportRemoteButton({
        proto: "NEXA",
        sender,
        unit,
        group: isGroup,
        state,
      });
      break;

    case "NEXA-STATUS:":
      // const newState = parts[2].trim() === "ON" ? true : false;
      // lightMap[parts[1]].state = newState;
      // updateWsState();
      break;
  }
});
