const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(3000, () => console.log('listening on *:3000'));

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


// The event will be called when a client is connected.
io.on('connection', socket => {
  console.log('A client just joined on', socket.id);
  socket.emit('news', 'Hello');
  socket.on('NEXA', message => {
    console.log("Nexa command", message);
    sendMessage(message);
  });
});

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
      break;
  }
});

// open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('Error: ', err.message);
})


function setSwitchState(id, state) {
  const cmd = `SET ${id} ` + state ? 'ON': 'OFF';
  sendMessage(cmd);
}

function sendMessage(msg) {
  if (port.isOpen) {
    console.log('msg to arduino:', msg);
    port.write(msg+'\n');
  }
}




const button = (title, link) => (`<a href='${link}'>${title}</a>`);
const onoffButtons = id => ( button(`${id} ON`, `/set/${id}/ON`) + " " + button(`${id} OFF`, `/set/${id}/OFF`) );
const buttons = `${onoffButtons(455)}<br>${onoffButtons(1337)}<br>${onoffButtons(1200)}`;

app.get('/', function (req, res) {
  //res.send(buttons)
  let output = '<html>';
  lights.forEach( el => {
    output += `<p>${el.name}(${el.id}): ${el.state ? 'ON': 'OFF'}</p>`;
  });
  output += '</html>';
  res.send(output);
})

// app.get('/', function (req, res) {
//   res.sendFile(__dirname + '/index.html');
// });

app.get('/reset', function (req, res) {
  port.close(() => {
    port.open();
  });
});

app.get('/set/:id/:state', function (req, res) {
  if (req.params.id === "all") {
    for (var i = 0; i < lights.length; i++) {
      sendMessage(`SET ${lights[i].id} ${req.params.state}`)
    }
  }
  else {
    let cmd = `SET ${req.params.id} ${req.params.state}`;
    sendMessage(cmd);
  }
  res.send(buttons)
})

app.get('/pair/:id', function (req, res) {
  sendMessage(`PAIR ${req.params.id}`)
  res.send(buttons)
})



let stdin = process.openStdin();

stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that
    // with toString() and then trim()
    const msg = d.toString().trim();
    console.log("console: [" + msg + "]");
    sendMessage(msg);
  });
