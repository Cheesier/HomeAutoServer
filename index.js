const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(3000, () => console.log('listening on *:3000'));

var SerialPort = require('serialport')
var port = new SerialPort('COM3', {baudRate: 9600, autoOpen: true, parser: SerialPort.parsers.readline('\n')})




// The event will be called when a client is connected.
io.on('connection', socket => {
  console.log('A client just joined on', socket.id);
  socket.emit("test");
});

io.on('test', message => {
  console.log("test2", message)
});




port.on('open', function() {
  console.log('Connected to Arduino');
});

port.on('data', data => {
  console.log("From arduino:",data);
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
  if (port.isOpen()) {
    port.write(msg+'\n');
    console.log('msg to arduino:', msg);
  }
}




const button = (title, link) => (`<a href='${link}'>${title}</a>`);
const onoffButtons = id => ( button(`${id} ON`, `/set/${id}/ON`) + " " + button(`${id} OFF`, `/set/${id}/OFF`) );
const buttons = `${onoffButtons(455)}<br>${onoffButtons(1337)}<br>${onoffButtons(1200)}`;

// app.get('/', function (req, res) {
//   res.send(buttons)
// })

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/set/:id/:state', function (req, res) {
  let cmd = `SET ${req.params.id} ${req.params.state}`;
  sendMessage(cmd);
  res.send(buttons)
})

app.get('/pair/:id', function (req, res) {
  sendMessage(`PAIR ${req.params.id}`)
  res.send(buttons)
})
