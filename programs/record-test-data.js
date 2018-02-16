const fse = require('fse')
const inquirer = require('inquirer')
const midi = require('midi')
const Progress = require('ascii-progress')
const tinytime = require('tinytime')

async function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms)
  })
}

async function run() {
  try {
    const input = new midi.input()
    const portNames = new Array(input.getPortCount())
      .fill(null)
      .map((nothing, i) => input.getPortName(i))

    // Get info on the recording
    const { port, numRuns, numValues, category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'port',
        message: 'Choose a MIDI port',
        choices: portNames,
      },
      {
        type: 'input',
        name: 'numRuns',
        message: 'How many recordings to you want to make?',
        default: 10,
        filter: value => parseInt(value),
      },
      {
        type: 'input',
        name: 'numValues',
        message: 'How many values should each recording contain?',
        default: 100,
        filter: value => parseFloat(value),
      },
      {
        type: 'input',
        name: 'category',
        message: 'How do you want to categorise the recordings?',
      },
    ])

    input.openPort(portNames.indexOf(port))

    const recordings = []

    // Go through all recordings
    for (let i = 0; i < numRuns; i++) {
      await inquirer.prompt({
        type: 'confirm',
        name: 'startNext',
        message: `Press enter to record ${i + 1} of ${numRuns}`,
      })

      const recording = []

      const progressBar = new Progress({
        current: 0,
        schema: '[:bar.brightYellow]',
        total: numValues,
        width: 20,
      })
      progressBar.tick(0)

      // Set up the MIDI event listener
      const onMidiEvent = (deltaTime, [, , value]) => {
        recording.push({ deltaTime, value })
      }
      input.on('message', onMidiEvent)

      while (recording.length < numValues) {
        if (recording.length > progressBar.current) {
          progressBar.tick(recording.length - progressBar.current)
        }
        await delay(100)
      }

      progressBar.clear()
      input.removeListener('message', onMidiEvent)
      recordings.push(recording)
    }

    // Write to file
    const dateString = tinytime(`{YYYY}{Mo}{Do}{H}{mm}{ss}`, {
      padMonth: true,
    }).render(new Date())
    const filename = `midi_recording-${category}-${dateString}.json`
    const fileData = { category, recordings }
    const fileContents = JSON.stringify(fileData, null, 2)
    await fse.writeFile(filename, fileContents)

    console.log(`Saved recording to ${filename}.`)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
