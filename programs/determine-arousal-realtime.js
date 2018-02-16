const fse = require('fse')
const inquirer = require('inquirer')
const midi = require('midi')
const KNN = require('ml-knn')
const path = require('path')

async function run() {
  // Setup ML instance
  const knnModel = JSON.parse(
    fse.readFileSync(path.join(process.cwd(), 'models', 'arousal.json'), 'utf8')
  )
  const knn = KNN.load(knnModel)

  const input = new midi.input()

  // Connect to MIDI port
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

  // Collect values
  let history = []
  input.on('message', (deltaTime, [, cc]) => {
    if (cc === 1) {
      history.push(deltaTime)
    }

    if (history.length === 20) {
      const normalisedHistory = history.map(x => x / 10)
      const category = knn.predict(normalisedHistory)
      console.log(category === 0 ? 'active' : 'passive')

      history = []
    }
  })
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.error(err)
  }
})()
