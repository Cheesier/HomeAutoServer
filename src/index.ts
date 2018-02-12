import * as express from "express";
import * as expressWsR from "express-ws";
import * as fs from "fs";
import * as https from "https";
import * as nodeCron from "node-cron";
import * as SerialPort from "serialport";
import { createAnslutaLight } from "./ansluta";
import * as config from "./configuration";
import { createNexaLight, nexaRemoteButton } from "./nexa";
import { IdType, LightIdValue, LightValue, StateType } from "./types";
import { rateLimit } from "./utils";

const { lights, tasks } = config;
const enableWebserver = false;

const app = express();

app.use((req, res, next) => {
  (req as any).myAuthenticated = req.query.auth === config.password;
  return next();
});

const httpsOptions = {
  pfx: fs.readFileSync("C:cert/nodeserver.pfx"),
  passphrase: "nodeserver"
};
const httpsServer = https.createServer(httpsOptions, app);

const expressWs = expressWsR(app, httpsServer, {
  wsOptions: {
    verifyClient: (info, cb) => {
      const pwMatch = info.req.url.match(/\?auth=(\w*)[$&]?/);
      const pw = pwMatch ? pwMatch[1] : "";

      if (pw !== config.password) {
        console.log("Used incorrect password at protocol upgrade", pw);
        return cb(false, 401, "Unauthorized");
      }
      return cb(true);
    }
  }
});

httpsServer.listen(config.port, () =>
  console.log(`listening on *:${config.port}`)
);

const Readline = SerialPort.parsers.Readline;
const port = new SerialPort(config.comport.toString(), {
  baudRate: 9600,
  autoOpen: true
});
const parser = new Readline({ delimiter: Buffer.from("\n", "utf8") });
port.pipe(parser);

let cronTasks = [];

function setupTasks() {
  cronTasks.forEach(cronTask => cronTask.destroy());
  cronTasks = [];

  Object.values(tasks)
    .filter(task => task.enabled)
    .forEach(task => {
      console.log("activating task", task.id);
      cronTasks.push(
        nodeCron.schedule(task.cron, () => {
          task.lights.forEach(taskLight => {
            if (typeof taskLight.value === "number") {
              dimLight(taskLight.id, taskLight.value);
            } else if (typeof taskLight.value === "string") {
              switch (taskLight.value) {
                case "ON":
                case "OFF":
                  setSwitchState(taskLight.id, taskLight.value === "ON");
                  break;

                case "TOGGLE":
                  toggleSwitch(taskLight.id);
                  break;

                default:
                  console.error("Unknown taskLight value", taskLight.value);
                  break;
              }
            }
          });
        })
      );
    });
}

setupTasks();

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

parser.on("data", (data: string) => {
  console.log("From arduino:", data);
  const parts = data.split(" ");
  switch (parts[0]) {
    case "NEXA-REMOTE:":
      const sender = parseInt(parts[1], 10);
      const unit = parseInt(parts[2], 10);
      const isGroup = parts[3] === "GROUP";
      const state = parts[4].trim() === "ON" ? true : false;

      Object.values(lights).forEach((el, index, array) => {
        if (el.remotes) {
          el.remotes.forEach(remote => {
            if (remote.sender === sender && (isGroup || remote.unit === unit)) {
              array[index].state = state;
              console.log(
                `${el.name} (${el.id}) turned ${state ? "ON" : "OFF"}`
              );
            }
          });
        }
      });
      updateWsState();
      break;

    case "NEXA-STATUS:":
      const newState = parts[2].trim() === "ON" ? true : false;
      lights[parts[1]].state = newState;
      updateWsState();
      break;
  }
});

// open errors will be emitted as an error event
port.on("error", err => {
  console.log("Error: ", err.message);
});

function resetSerial() {
  port.close(() => {
    port.open();
  });
}

function createLight(light) {
  const createdLight = config.addLight(light);
  lights[createdLight.id] = createdLight;
}

function pairLight(id) {
  if (lights[id] && lights[id].proto === "NEXA") {
    sendMessage(`NEXA PAIR ${lights[id].sender} ${lights[id].unit}`);
  }
}

function removeLight(id) {
  if (!lights[id]) {
    return;
  }
  config.removeLight(id);
  delete lights[id];
}

function addTask(name: string, cron: string, taskLights: LightIdValue[]) {
  if (!nodeCron.validate(cron)) {
    console.log("tried to add invalid cron string: ", cron);
    return;
  }
  const value = { name, cron, lights: taskLights, enabled: true };
  const resultTask = config.addTask(value);
  tasks[resultTask.id] = resultTask;
  setupTasks();
}

function toggleTaskEnabled(id: IdType) {
  if (!tasks[id]) {
    return;
  }
  const task = tasks[id];
  task.enabled = !task.enabled;
  config.updateTask(task);
  setupTasks();
}

function removeTask(id: IdType) {
  if (!tasks[id]) {
    return;
  }
  config.removeTask(id);
  delete tasks[id];
  setupTasks();
}

function toggleSwitch(id: IdType) {
  if (!lights[id]) {
    return;
  }
  console.log("toggle", lights[id]);
  const newState = !lights[id].state;
  setSwitchState(id, newState);
}

function setSwitchState(id: IdType, state: StateType) {
  const light = lights[id];
  if (!light) {
    return;
  }
  if (light.proto === "NEXA") {
    const cmd = `${light.proto} SET ${light.sender} ${light.unit} ${
      state ? "ON" : "OFF"
    }`;
    sendMessage(cmd);
  } else if (light.proto === "ANSLUTA") {
    const cmd = `${light.proto} SET ${state ? "2" : "1"}`;
    lights[id].state = state;
    updateWsState();
    sendMessage(cmd);
  }
}

function setAllSwitches(state: StateType) {
  Object.keys(lights).forEach(light => {
    setSwitchState(light, state);
  });
}

function dimLight(id: IdType, lightLevel: LightValue) {
  const light = lights[id];
  if (!light) {
    return;
  }
  if (light.proto === "NEXA") {
    console.log("dim NEXA", light, lightLevel);
    const cmd = `${light.proto} DIM ${light.sender} ${
      light.unit
    } ${lightLevel}`;
    sendMessage(cmd);
  } else if (light.proto === "ANSLUTA") {
    console.log("dim ANSLUTA", light, lightLevel);
    const cmd = `${light.proto} SET ${lightLevel}`;
    lights[id].state = lightLevel >= 2;
    updateWsState();
    sendMessage(cmd);
  }
}

function nexaSetGroupState(id: number, state: StateType) {
  sendMessage(`NEXA SET ${id} GROUP ${state ? "ON" : "OFF"}`);
}

function sendMessageInternal(msg: string) {
  if ((port as any).isOpen) {
    console.log("msg to arduino:", msg);
    port.write(msg + "\n");
  }
}

const sendMessage: (msg: string) => void = rateLimit(sendMessageInternal, 200);

(app as any).ws("/control", (ws, req) => {
  if (!req.myAuthenticated) {
    console.log("Atempt to login with incorrect credentials", req.query.auth);
    ws.close();
    return;
  }
  ws.send(JSON.stringify({ type: "STATE_UPDATE", lights, tasks }));

  ws.on("message", str => {
    console.log("Got ws message:", str);
    const msg = JSON.parse(str);
    switch (msg.type) {
      case "STATE_REQUEST":
        ws.send(JSON.stringify({ type: "STATE_UPDATE", lights, tasks }));
        break;

      case "RESET_SERIAL":
        resetSerial();
        break;

      case "SET_ALL":
        setAllSwitches(msg.state);
        break;

      case "SET":
        setSwitchState(msg.id, msg.state);
        break;

      case "TOGGLE":
        toggleSwitch(msg.id);
        break;

      case "DIM":
        lights[msg.id].state = true;
        dimLight(msg.id, msg.lightLevel);
        updateWsState();
        break;

      case "ADD_NEXA_LIGHT":
        createLight(
          createNexaLight(
            msg.name,
            parseInt(msg.sender, 10),
            parseInt(msg.unit, 10),
            msg.dimmer
          )
        );
        console.log(
          "Add nexa light: ",
          msg.name,
          msg.sender,
          msg.unit,
          msg.dimmer
        );
        updateWsState();
        break;

      case "ADD_ANSLUTA_LIGHT":
        createLight(createAnslutaLight(msg.name));
        console.log("Add ansluta light: ", msg.name);
        updateWsState();
        break;

      case "PAIR_LIGHT":
        console.log("Pair light: ", msg.id);
        pairLight(msg.id);
        break;

      case "REMOVE_LIGHT":
        console.log("Should remove light", msg.id);
        removeLight(msg.id);
        updateWsState();
        break;

      case "ADD_TASK":
        console.log("Should add task", msg.name, msg.cron, msg.lights);
        addTask(msg.name, msg.cron, msg.lights);
        updateWsState();
        break;

      case "TOGGLE_TASK_ENABLED":
        console.log("Should toggle task enable state", msg.id);
        toggleTaskEnabled(msg.id);
        updateWsState();
        break;

      case "REMOVE_TASK":
        console.log("Should remove task", msg.id);
        removeTask(msg.id);
        updateWsState();
        break;
    }
  });

  ws.on("close", arg => {
    console.log("Closed websocket: ", arg);
  });
});

const control = expressWs.getWss("/control");
const updateWsState = () => {
  control.clients.forEach(client => {
    client.send(JSON.stringify({ type: "STATE_UPDATE", lights, tasks }));
  });
};

const button = (title, link) => `<a href='${link}'>${title}</a>`;
const onoffButtons = (title, id) =>
  button(`${title} ON`, `/set/${id}/ON`) +
  " " +
  button(`${title} OFF`, `/set/${id}/OFF`);
const buttons = () => {
  let output = "<html>";
  Object.values(lights).forEach(el => {
    output += `${el.name}(${el.state}) ${button(
      "ON",
      `/set/${el.id}/ON`
    )} ${button("OFF", `/set/${el.id}/OFF`)} ${button(
      "TOGGLE",
      `/toggle/${el.id}`
    )}</br>`;
  });
  return output + "</html>";
};

if (enableWebserver) {
  app.get("/", (req, res) => {
    res.send(buttons());
    // let output = '<html>'
    // lights.forEach( el => {
    //   output += `<p>${el.name}(${el.id}): ${el.state ? 'ON': 'OFF'}</p>`
    // })
    // output += '</html>'
    // res.send(output)
  });

  // app.get('/', function (req, res) {
  //   res.sendFile(__dirname + '/index.html')
  // })

  app.get("/reset", (req, res) => {
    port.close(() => {
      port.open();
    });
  });

  app.get("/toggle/:id", (req, res) => {
    toggleSwitch(req.params.id);
    res.send(buttons());
  });

  app.get("/set/:id/:state", (req, res) => {
    if (req.params.id === "all") {
      // Object.values(lights).forEach (el => {
      //   setSwitchState(el.sender, el.unit, req.params.state === "ON")
      // })
      nexaSetGroupState(1000, req.params.state === "ON");
    } else {
      setSwitchState(req.params.id, req.params.state === "ON");
    }
    res.send(buttons());
  });

  app.get("/pair/:id", (req, res) => {
    pairLight(req.params.id);
    res.send(buttons());
  });

  app.get("/status", (req, res) => {
    res.send(JSON.stringify({ type: "STATE_UPDATE", lights, tasks }));
  });
}

const stdin = process.openStdin();

stdin.addListener("data", d => {
  // note:  d is an object, and when converted to a string it will
  // end with a linefeed.  so we (rather crudely) account for that
  // with toString() and then trim()
  const msg = d.toString().trim();
  console.log("console: [" + msg + "]");

  const parts = msg.split(" ");
  const cmd = parts[0];
  switch (cmd) {
    case "NEXA":
      sendMessage(msg);
      break;

    case "ANSLUTA":
      sendMessage(msg);
      break;

    /*
    case 'status':
      console.log(lights)
      break

    case 'add-nexa-light':
      if (parts.length < 4) {
        // parts                       1      2       3       4
        console.log('add-nexa-light <name> <sender> <unit> [dimmer]')
        break
      }
      const dimmer = parts.length >= 6 ? parts[4] === 'true' : false
      createLight(
        createNexaLight(
          parts[1],
          parseInt(parts[2]),
          parseInt(parts[3]),
          dimmer
        )
      )
      updateWsState()
      break

    case 'remove-light':
      if (parts.length != 2) {
        console.log('remove-light <id>')
        break
      }
      removeLight(parts[1])
      updateWsState()
      break

    case 'add-task':
      const cronSplit = msg.split(`'`)
      if (parts.length < 4 || cronSplit.length != 3) {
        // parts
        console.log(`add-task '<cron>' <light-id> <light-val> <label>`)
        break
      }
      const restSplit = cronSplit[2].split(' ')
      const lv = restSplit[1]
      const lightValue = !isNaN(parseInt(lv)) ? parseInt(lv) : lv
      console.log(
        `adding task with cron '${cronSplit[1]}', light-id ${lightId} value `,
        lightValue
      )
      addTask(restSplit[2], cronSplit[1], [{ value: lightValue }])
      break

    case 'remove-task':
      if (parts.length != 2) {
        console.log('remove-task <id>')
      }
      removeTask(parts[1])
      break

    default:
      console.log('Unknown command: ', cmd)
    */
  }
});
