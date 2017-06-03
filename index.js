const express = require('express')
const app = express()

var SerialPort = require('serialport');
var port = new SerialPort('COM3', {baudRate: 9600, autoOpen: true});

port.on('open', function() {
  console.log('Connected to Arduino');
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
  }
}

const button = (title, link) => (`<a href='${link}'>${title}</a>`);
const onoffButtons = id => ( button(`${id} ON`, `/set/${id}/ON`) + " " + button(`${id} OFF`, `/set/${id}/OFF`) );
const buttons = `${onoffButtons(455)}<br>${onoffButtons(1337)}<br>${onoffButtons(1200)}`;


app.get('/', function (req, res) {
  res.send(buttons)
})

app.get('/set/:id/:state', function (req, res) {
  let cmd = `SET ${req.params.id} ${req.params.state}`;
  sendMessage(cmd);
  res.send(buttons)
})

app.get('/pair/:id', function (req, res) {
  sendMessage(`PAIR ${req.params.id}`)
  res.send(buttons)
})

app.listen(3000, function () {
  console.log('HomeAutoServer listening on port 3000!')
})
