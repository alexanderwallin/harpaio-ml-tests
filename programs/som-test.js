const { max, min } = require('lodash')
const SOM = require('ml-som')

const inquirer = require('inquirer')

const collectMidiData = require('../utils/collectMidiData.js')
const getMidiInput = require('../utils/getMidiInput.js')

async function run() {
  const midiInput = await getMidiInput()

  const som = new SOM(3, 3, {
    fields: [
      { name: 'frequency', range: [0, 400] },
      { name: 'range', range: [0, 127] },
    ],
  })

  som.train([
    { frequency: 80, range: 70 },
    { frequency: 1, range: 1 },
    { frequency: 10, range: 90 },
    { frequency: 350, range: 127 },
    { frequency: 70, range: 120 },
    { frequency: 150, range: 40 },
  ])

  while (true) {
    const midiValues = await collectMidiData(midiInput, {
      duration: 1000,
      type: 'cc',
      channel: 0,
    })

    const frequency = Math.min(400, midiValues.length)
    const range = midiValues.length > 0 ? max(midiValues) - min(midiValues) : 0
    const input = { frequency, range }
    const prediction = som.predict({ frequency, range })

    const matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    matrix[prediction[0]][prediction[1]] = 1
    console.log(matrix.map(row => row.join('')).join('\n'))
    console.log('\n')
  }
}

run().catch(err => console.log('err', err))
