const app = require('express')()
const server = require('http').Server(app)
const expressWs = require('express-ws')(app)
const cron = require('node-cron')
let { lights } = require('./devices')

app.listen(3000, () => console.log('listening on *:3000'))

let SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline
let port = new SerialPort('COM3', {baudRate: 9600, autoOpen: true})
const parser = new Readline()
port.pipe(parser)

// Turn on bed light every mon-fri at 07.00
// (seconds) min hour date month dayofweek
const bedMorningTask = cron.schedule('0 7 * * 1-5', () => {
  setSwitchState(1339, true)
})


setInterval(() => {
  if (!port.isOpen) {
    console.log("Trying to reconnect to Arduino")
    port.open()
  }
}, 10000)

port.on('open', function() {
  console.log('Connected to Arduino')
})

port.on('close', function() {
  console.log('Lost connection to Arduino')
})

parser.on('data', data => {
  console.log("From arduino:",data)
  const parts = data.split(' ')
  switch(parts[0]) {
    case 'NEXA-REMOTE:':
      const isGroup = parts[3] === "GROUP"
      const state = parts[4].trim() === "ON" ? true : false

      Object.values(lights).forEach( (el, index, array) => {
        el.remotes.forEach( remote => {
          if (remote.sender == parts[1] && (isGroup || remote.unit == parts[2])) {
            array[index].state = state
            console.log(`${el.name} (${el.id}) turned ${state ? 'ON':'OFF'}`)
          }
        })
      })
      updateWsState()
      break

    case 'NEXA-STATUS:':
      const newState = parts[2].trim() === "ON"? true: false
      lights[parts[1]].state = newState
      updateWsState()
      break
  }
})

// open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('Error: ', err.message)
})

function toggleSwitch(id) {
  console.log('toggle', lights[id])
  const newState = !lights[id].state
  setSwitchState(id, newState)
}

function setSwitchState(id, state) {
  const cmd = `${lights[id].proto} SET ${lights[id].sender} ${lights[id].unit} ${state ? 'ON': 'OFF'}`
  sendMessage(cmd)
}

function nexaSetGroupState(id, state) {
  sendMessage(`NEXA SET ${id} GROUP ${state?'ON': 'OFF'}`)
}

function sendMessage(msg) {
  if (port.isOpen) {
    console.log('msg to arduino:', msg)
    port.write(msg+'\n')
  }
}

app.ws('/control', (ws, req) => {
  ws.send(JSON.stringify({type: 'STATE_UPDATE', lights}))

  ws.on('message', str => {
    console.log('Got ws message:', str)
    let msg = JSON.parse(str)
    switch(msg.type) {
      case 'STATE_REQUEST':
        ws.send(JSON.stringify({type: 'STATE_UPDATE', lights}))
        break

      case 'TOGGLE':
        toggleSwitch(msg.id)
        break
    }
  })

  ws.on('close', arg => {
    console.log("Closed websocket: ", arg)
  })
})

let control = expressWs.getWss('/control')
const updateWsState = () => {
  control.clients.forEach( client => {
      client.send(JSON.stringify({type: 'STATE_UPDATE', lights}))
  })
}


const button = (title, link) => (`<a href='${link}'>${title}</a>`)
const onoffButtons = (title,id) => ( button(`${title} ON`, `/set/${id}/ON`) + " " + button(`${title} OFF`, `/set/${id}/OFF`) )
const buttons = () => {
  let output = '<html>'
  Object.values(lights).forEach( el => { output += `${el.name}(${el.state}) ${button('ON', `/set/${el.id}/ON`)} ${button('OFF', `/set/${el.id}/OFF`)} ${button('TOGGLE', `/toggle/${el.id}`)}</br>`})
  return output+'</html>'
}

app.get('/', function (req, res) {
  res.send(buttons())
  // let output = '<html>'
  // lights.forEach( el => {
  //   output += `<p>${el.name}(${el.id}): ${el.state ? 'ON': 'OFF'}</p>`
  // })
  // output += '</html>'
  // res.send(output)
})

// app.get('/', function (req, res) {
//   res.sendFile(__dirname + '/index.html')
// })

app.get('/reset', function (req, res) {
  port.close(() => {
    port.open()
  })
})

app.get('/toggle/:id', function (req, res) {
  toggleSwitch(req.params.id)
  res.send(buttons())
})

app.get('/set/:id/:state', function (req, res) {
  if (req.params.id === "all") {
    // Object.values(lights).forEach (el => {
    //   setSwitchState(el.sender, el.unit, req.params.state === "ON")
    // })
    nexaSetGroupState(1000, req.params.state === "ON")
  }
  else {
    setSwitchState(req.params.id, req.params.state === "ON")
  }
  res.send(buttons())
})

app.get('/pair/:id', function (req, res) {
  sendMessage(`NEXA PAIR ${req.params.id}`)
  res.send(buttons())
})

app.get('/status', function (req, res) {
  res.send(JSON.stringify({type: 'STATE_UPDATE', lights}))
})



let stdin = process.openStdin()

stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that
    // with toString() and then trim()
    const msg = d.toString().trim()
    console.log("console: [" + msg + "]")
    if (msg === "status") {
      console.log(lights)
    }
    else {
      sendMessage(msg)
    }
  })
