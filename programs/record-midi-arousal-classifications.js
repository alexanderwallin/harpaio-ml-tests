const Progress = require('ascii-progress')
const fse = require('fse')
const inquirer = require('inquirer')
const { chunk } = require('lodash')
const midi = require('midi')
const path = require('path')
const tinytime = require('tinytime')

const delay = async ms => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
  const input = new midi.input()
  const portNames = new Array(input.getPortCount())
    .fill(null)
    .map((nothing, i) => input.getPortName(i))

  const { port, frequency, chunkSize, duration } = await inquirer.prompt([
    {
      type: 'list',
      name: 'port',
      message: 'Choose a MIDI port',
      choices: portNames,
    },
    {
      type: 'input',
      name: 'frequency',
      message: 'Data points per second',
      default: 20,
      filter: value => parseInt(value),
    },
    {
      type: 'input',
      name: 'chunkSize',
      message: 'Points per chunk',
      default: 40,
      filter: value => parseInt(value),
    },
    {
      type: 'input',
      name: 'duration',
      message: 'Duration of recording in seconds',
      default: 10,
      filter: value => parseInt(value),
    },
  ])

  input.openPort(portNames.indexOf(port))

  const points = await recordPoints(input, { chunkSize, duration, frequency })

  const { writeToFile } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'writeToFile',
      message: 'Write to file?',
      default: true,
    },
  ])

  if (writeToFile === true) {
    await storeRecordedPoints(points, { chunkSize, duration, frequency })
  }
}

async function recordPoints(input, { chunkSize, duration, frequency }) {
  return new Promise(resolve => {
    const recordedPoints = []
    const startTime = Date.now()
    let currentValue = 0
    let timerId = null

    const progressBar = new Progress({
      current: 0,
      schema: '[:bar.brightYellow]',
      total: duration,
      width: 20,
    })
    progressBar.tick(0)

    const onMidiEvent = (deltaTime, [a, b, value]) => {
      currentValue = value
    }
    input.on('message', onMidiEvent)

    timerId = setInterval(() => {
      recordedPoints.push(currentValue)
      progressBar.tick(1 / frequency)

      if (recordedPoints.length === frequency * duration) {
        clearInterval(timerId)
        input.removeListener('message', onMidiEvent)
        progressBar.clear()

        resolve(recordedPoints)
      }
    }, 1000 / frequency)
  })
}

async function storeRecordedPoints(points, { chunkSize, duration, frequency }) {
  const data = chunk(points, chunkSize)
  const meta = { chunkSize, duration, frequency }
  const fileData = { meta, data }

  const dateString = tinytime(`{YYYY}{Mo}{Do}{H}{mm}{ss}`, {
    padMonth: true,
  }).render(new Date())
  const filename = `midi_recording-kmeans-${dateString}.json`
  const fileContents = JSON.stringify(fileData, null, 2)
  await fse.writeFile(path.join('data', filename), fileContents)

  console.log(`Saved recording to ${filename}.`)
  process.exit(0)
}

run().catch(err => {
  console.log('An error occured:')
  console.log(err)
})
