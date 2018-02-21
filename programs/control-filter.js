const fse = require('fse')
const inquirer = require('inquirer')
const midi = require('midi')
const KNN = require('ml-knn')
const osc = require('osc-min')
const path = require('path')

const createSocket = require('../utils/createSocket.js')

async function sendMessage(socket, message, port) {
  return new Promise((resolve, reject) => {
    socket.send(message, 0, message.length, port, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

async function run() {
  // Setup ML instance
  const knnModel = JSON.parse(
    fse.readFileSync(path.join(process.cwd(), 'models', 'arousal.json'), 'utf8')
  )
  const knn = KNN.load(knnModel)

  // Create MIDI input
  const input = new midi.input()
  const portNames = new Array(input.getPortCount())
    .fill(null)
    .map((nothing, i) => input.getPortName(i))
  const { port } = await inquirer.prompt([
    {
      type: 'list',
      name: 'port',
      message: 'Choose a MIDI port',
      choices: portNames,
    },
  ])
  input.openPort(portNames.indexOf(port))

  // Create socket
  const udp = await createSocket()
  udp.on('message', buffer => {
    const message = osc.fromBuffer(buffer)
    console.log('Received OSC message:')
    console.log(message)
  })

  // Collect values
  let history = []
  input.on('message', async deltaTime => {
    history.push(deltaTime)

    if (history.length === 20) {
      const normalisedHistory = history.map(x => x / 10)
      const category = knn.predict(normalisedHistory)
      console.log(category === 0 ? 'active' : 'passive')

      const filterValue = category === 0 ? 0.8 : 0.2
      const message = osc.toBuffer({
        address: '/1/filter/freq',
        args: [filterValue],
      })
      await sendMessage(udp, message, 8992)

      history = []
    }
  })
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log('Crashed:')
    console.log(err)
    console.log(err.stack)
    process.exit(1)
  }
})()
