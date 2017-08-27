const app = require('express')();
const server = require('http').Server(app);
//const io = require('socket.io')(server);
const expressWs = require('express-ws')(app);

app.listen(3000, () => console.log('listening on *:3000'));

let SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline;
let port = new SerialPort('COM3', {baudRate: 9600, autoOpen: true})
const parser = new Readline();
port.pipe(parser);

const remoteObj = (remoteId, button) => {
  return {remoteId, button};
};

let lights = [
  { name: 'Tv',     id: 1337, state: false, remotes: [remoteObj(2471582, 0), remoteObj(2259722, 0)] },
  { name: 'Window', id: 1338, state: false, remotes: [remoteObj(2471582, 1), remoteObj(2259722, 1)] },
  { name: 'Bed',    id: 1339, state: false, remotes: [remoteObj(2471582, 2), remoteObj(2259722, 2)] },
  { name: 'Office', id: 1340, state: false, remotes: [] }
];


// // The event will be called when a client is connected.
// io.on('connection', socket => {
//   console.log('A client just joined on', socket.id);
//   socket.emit('news', 'Hello');
//   socket.on('NEXA', message => {
//     console.log("Nexa command", message);
//     sendMessage(message);
//   });
// });

setInterval(() => {
  if (!port.isOpen) {
    console.log("Trying to reconnect to Arduino");
    port.open();
  }
}, 10000);

port.on('open', function() {
  console.log('Connected to Arduino');
});

port.on('close', function() {
  console.log('Lost connection to Arduino');
});

parser.on('data', data => {
  console.log("From arduino:",data);
  const parts = data.split(' ');
  switch(parts[0]) {
    case 'NEXA-REMOTE:':
      const isGroup = parts[3] === "GROUP";
      const state = parts[4].trim() === "ON" ? true : false;

      lights.forEach( (el, index, array) => {
        el.remotes.forEach( remote => {
          if (remote.remoteId == parts[1] && (isGroup || remote.button == parts[2])) {
            array[index].state = state;
            console.log(`${el.id} ${state ? 'ON':'OFF'}`);
          }
        });
      });
      updateWsState();
      break;

    case 'NEXA-STATUS:':
      const newState = parts[2].trim() === "ON"? true: false;
      lights.forEach( (el, index, array) => {
        if (parts[1] == el.id) {
          array[index].state = newState;
          console.log(newState);
        }
      });
      updateWsState();
      break;
  }
});

// open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('Error: ', err.message);
})

function toggleSwitch(id) {
  let newState = false;
  lights.forEach( el => {
    if (el.id == id) {
      newState = !el.state;
    }
  });
  setSwitchState(id, newState);
}

function setSwitchState(id, state) {
  const cmd = `NEXA SET ${id} ${state ? 'ON': 'OFF'}`;
  sendMessage(cmd);
}

function sendMessage(msg) {
  if (port.isOpen) {
    console.log('msg to arduino:', msg);
    port.write(msg+'\n');
  }
}



app.ws('/control', (ws, req) => {
  ws.on('open', arg => {
    console.log("Opened websocket: ", arg);
  });

  ws.on('message', str => {
    console.log('Got ws message:', str);
    let msg = JSON.parse(str);
    switch(msg.type) {
      case 'STATE_REQUEST':
        ws.send(JSON.stringify({type: 'STATE_UPDATE', lights}));
        break;

      case 'TOGGLE':
        console.log("ws-toggle");
        toggleSwitch(msg.id);
        break;
    }
    //ws.send(msg);
  });

  ws.on('close', arg => {
    console.log("Closed websocket: ", arg);
  });
});

let control = expressWs.getWss('/control');
const updateWsState = () => {
  control.clients.forEach( client => {
      client.send(JSON.stringify({type: 'STATE_UPDATE', lights}));
  });
};


const button = (title, link) => (`<a href='${link}'>${title}</a>`);
const onoffButtons = (title,id) => ( button(`${title} ON`, `/set/${id}/ON`) + " " + button(`${title} OFF`, `/set/${id}/OFF`) );
const buttons = () => {
  let output = '<html>';
  lights.forEach( el => { output += `${el.name}(${el.state}) ${button('ON', `/set/${el.id}/ON`)} ${button('OFF', `/set/${el.id}/OFF`)} ${button('TOGGLE', `/toggle/${el.id}`)}</br>`});
  return output+'</html>';
};

app.get('/', function (req, res) {
  res.send(buttons())
  // let output = '<html>';
  // lights.forEach( el => {
  //   output += `<p>${el.name}(${el.id}): ${el.state ? 'ON': 'OFF'}</p>`;
  // });
  // output += '</html>';
  // res.send(output);
})

// app.get('/', function (req, res) {
//   res.sendFile(__dirname + '/index.html');
// });

app.get('/reset', function (req, res) {
  port.close(() => {
    port.open();
  });
});

app.get('/toggle/:id', function (req, res) {
  toggleSwitch(req.params.id);
  res.send(buttons());
});

app.get('/set/:id/:state', function (req, res) {
  if (req.params.id === "all") {
    for (var i = 0; i < lights.length; i++) {
      setSwitchState(lights[i].id, req.params.state === "ON");
    }
  }
  else {
    setSwitchState(req.params.id, req.params.state === "ON");
  }
  res.send(buttons())
})

app.get('/pair/:id', function (req, res) {
  sendMessage(`NEXA PAIR ${req.params.id}`)
  res.send(buttons())
})



let stdin = process.openStdin();

stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that
    // with toString() and then trim()
    const msg = d.toString().trim();
    console.log("console: [" + msg + "]");
    if (msg === "status") {
      console.log(lights);
    }
    else {
      sendMessage(msg);
    }
  });
