const Progress = require('ascii-progress')
const inquirer = require('inquirer')

const getMidiInput = require('../utils/getMidiInput.js')
const storeRecording = require('../utils/storeRecording.js')

const delay = async ms => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
  const input = await getMidiInput()

  const { duration } = await inquirer.prompt([
    {
      type: 'input',
      name: 'duration',
      message: 'Duration of recording in seconds',
      default: 10,
      filter: value => parseInt(value),
    },
  ])

  const points = await recordPoints(input, { duration })
  await storeRecording('deltatime', points, { duration })
  process.exit(0)
}

async function recordPoints(input, { duration }) {
  return new Promise(resolve => {
    const recordedPoints = []
    const startTime = Date.now()

    const progressBar = new Progress({
      current: 0,
      schema: '[:bar.brightYellow]',
      total: duration,
      width: 40,
    })
    progressBar.tick(0)

    const onMidiEvent = (deltaTime, [a, b, value]) => {
      recordedPoints.push(deltaTime)
    }

    input.on('message', onMidiEvent)

    const timerId = setInterval(() => progressBar.tick(1), 1000)

    setTimeout(() => {
      input.removeListener('message', onMidiEvent)
      progressBar.clear()
      clearInterval(timerId)

      resolve(recordedPoints)
    }, duration * 1000)
  })
}

run().catch(err => {
  console.log('An error occured:')
  console.log(err)
})
