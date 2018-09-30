import * as express from "express";
import * as expressWsR from "express-ws";
import * as https from "https";
import * as config from "./configuration";
import * as serial from "./serial";
import * as tasks from "./tasks";
import * as scenes from "./scenes";
import * as lights from "./lights";
import { createAnslutaLight } from "./proto/ansluta";
import { createNexaLight, nexaRemoteButton } from "./proto/nexa";
import { LightIdValue, LightValue, StateType } from "./types";
import { rateLimit } from "./utils";
import { store } from "./store";
import * as message from "./message";
import * as mqtt from "./mqtt";

const { lightMap, taskMap } = config;
const enableWebserver = true;

const app = express();

app.use((req, res, next) => {
  const authenticated = req.query.auth === config.password;
  (req as any).myAuthenticated = authenticated;
  if (!authenticated) {
    console.warn("Atempt to login with incorrect credentials", req.query.auth);
    return;
  }
  return next();
});

const httpsOptions = {
  ...config.cert
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

tasks.setupTasks();

(app as any).ws("/control", (ws, req) => {
  if (!req.myAuthenticated) {
    console.log("Atempt to login with incorrect credentials", req.query.auth);
    ws.close();
    return;
  }
  console.log("Opened websocket");
  ws.send(JSON.stringify(message.stateUpdate(config.getState())));

  ws.on("message", str => {
    console.log("Got ws message:", str);
    const msg = JSON.parse(str);
    store.dispatch(msg);

    switch (msg.type) {
      case "STATE_REQUEST":
        ws.send(
          JSON.stringify({
            type: `${message.serverPrefix}STATE_UPDATE`,
            payload: config.getState()
          })
        );
        break;

      case "RESET_SERIAL":
        serial.reset();
        break;

      case "SET_ALL":
        lights.setAllSwitches(msg.state);
        break;

      case "SET":
        lights.setSwitchState(msg.id, msg.state);
        break;

      case "TOGGLE":
        lights.toggleSwitch(msg.id);
        break;

      case "SCENE":
        lights.triggerScene(msg.id);
        break;

      case "DIM":
        lights.dimLight(msg.id, msg.lightLevel);
        updateWsState();
        break;

      case "ADD_NEXA_LIGHT":
        lights.createLight(
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
        lights.createLight(createAnslutaLight(msg.name));
        console.log("Add ansluta light: ", msg.name);
        updateWsState();
        break;

      case "PAIR_LIGHT":
        console.log("Pair light: ", msg.id);
        lights.pairLight(msg.id);
        break;

      case "REMOVE_LIGHT":
        console.log("Should remove light", msg.id);
        lights.removeLight(msg.id);
        updateWsState();
        break;

      case "ADD_TASK":
        console.log("Should add task", msg.name, msg.cron, msg.lights);
        tasks.addTask(msg.name, msg.cron, msg.lights);
        updateWsState();
        break;

      case "TOGGLE_TASK_ENABLED":
        console.log("Should toggle task enable state", msg.id);
        tasks.toggleTaskEnabled(msg.id);
        updateWsState();
        break;

      case "REMOVE_TASK":
        console.log("Should remove task", msg.id);
        tasks.removeTask(msg.id);
        updateWsState();
        break;

      case "CREATE_SCENE":
        console.log("Creating scene");
        scenes.createScene(msg.name, msg.lights);
        updateWsState();
        break;
      case "REMOVE_SCENE":
        console.log("Removing scene");
        scenes.removeScene(msg.id);
        updateWsState();
        break;
      case "UPDATE_SCENE":
        console.log("Updating scene");
        scenes.updateScene(msg.id, { ...msg.scene });
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
    client.send(
      JSON.stringify({
        type: `${message.serverPrefix}STATE_UPDATE`,
        payload: config.getState()
      })
    );
  });
};

lights.init(updateWsState);
serial.init(updateWsState);

const button = (title, link) => `<a href='${link}'>${title}</a>`;
const onoffButtons = (title, id) =>
  button(`${title} ON`, `/set/${id}/ON`) +
  " " +
  button(`${title} OFF`, `/set/${id}/OFF`);
const buttons = () => {
  let output = "<html>";
  Object.values(lightMap).forEach(el => {
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
    // lightMap.forEach( el => {
    //   output += `<p>${el.name}(${el.id}): ${el.state ? 'ON': 'OFF'}</p>`
    // })
    // output += '</html>'
    // res.send(output)
  });

  // app.get('/', function (req, res) {
  //   res.sendFile(__dirname + '/index.html')
  // })

  app.get("/reset", (req, res) => {
    serial.reset();
  });

  app.get("/toggle/:id", (req, res) => {
    lights.toggleSwitch(req.params.id);
    res.send(buttons());
  });

  app.get("/set/:id/:state", (req, res) => {
    if (req.params.id === "all") {
      // Object.values(lightMap).forEach (el => {
      //   setSwitchState(el.sender, el.unit, req.params.state === "ON")
      // })
      lights.setAllSwitches(req.params.state === "ON");
    } else {
      lights.setSwitchState(req.params.id, req.params.state === "ON");
    }
    res.send(buttons());
  });

  app.get("/pair/:id", (req, res) => {
    lights.pairLight(req.params.id);
    res.send(buttons());
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
      serial.sendMessage(msg);
      break;

    case "ANSLUTA":
      serial.sendMessage(msg);
      break;

    /*
    case 'status':
      console.log(lightMap)
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
