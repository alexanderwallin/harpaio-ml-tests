const Progress = require('ascii-progress')
const fse = require('fse')
const inquirer = require('inquirer')
const midi = require('midi')
const path = require('path')
const tinytime = require('tinytime')

const getMidiInput = require('../utils/getMidiInput.js')
const storeRecording = require('../utils/storeRecording.js')

const delay = async ms => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
  const input = await getMidiInput()

  const { frequency, duration } = await inquirer.prompt([
    {
      type: 'input',
      name: 'frequency',
      message: 'Data points per second',
      default: 20,
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

  const points = await recordPoints(input, { duration, frequency })
  await storeRecordedPoints('flat', points, { duration, frequency })
  process.exit(0)
}

async function recordPoints(input, { duration, frequency }) {
  return new Promise(resolve => {
    const recordedPoints = []
    const startTime = Date.now()
    let currentValue = 0
    let timerId = null

    const progressBar = new Progress({
      current: 0,
      schema: '[:bar.brightYellow]',
      total: duration,
      width: 40,
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

run().catch(err => {
  console.log('An error occured:')
  console.log(err)
})
