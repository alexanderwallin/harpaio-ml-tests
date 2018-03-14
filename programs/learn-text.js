const fs = require('fs')
const { max, random, range, reduce, uniq, values } = require('lodash')
const path = require('path')
const R = require('../lib/recurrentjs.js')
const { Architect, Network } = require('synaptic')

function getTrainedNetwork({ dataX, dataY }) {
  const LEARNING_RATE = 0.1

  const lstm = new Architect.LSTM(40, 80, 1)
  lstm.optimize()

  const startTime = Date.now()
  for (let i = 0; i < dataX.length; i += 1) {
    if (i % 100 === 0) {
      console.log('iteration', i)
    }
    lstm.activate(dataX[i])
    lstm.propagate(LEARNING_RATE, [dataY[i]])
  }
  console.log('done training after', (Date.now() - startTime) / 1000, 'sec')

  fs.writeFileSync('learn-text-model-2.json', JSON.stringify(lstm.toJSON()))
  return lstm
}

function loadModel() {
  const modelContent = fs.readFileSync('learn-text-model.json', 'utf8')
  const model = JSON.parse(modelContent)
  console.log(model)
  const network = Network.fromJSON(model)
  return network
}

async function run(command) {
  const book = fs.readFileSync(
    path.resolve('./data/An Everyday Girl.txt'),
    'utf8'
  )
  const text = book.toLowerCase()
  const chars = text.split('').slice(10000)
  const vocabulary = uniq(chars).sort()

  const SEQUENCE_LENGTH = 40
  const dataX = []
  const dataY = []

  range(0, chars.length - SEQUENCE_LENGTH).forEach(i => {
    const seqIn = chars.slice(i, i + SEQUENCE_LENGTH)
    const seqOut = chars[i + SEQUENCE_LENGTH]
    dataX.push(seqIn.map(char => vocabulary.indexOf(char) / vocabulary.length))
    dataY.push(vocabulary.indexOf(seqOut) / vocabulary.length)
  })

  console.log(dataX.length, dataX[0])
  const network =
    command === 'load' ? loadModel() : getTrainedNetwork({ dataX, dataY })

  const NUM_CHARS = 40
  const NUM_PREDICTIONS = 20

  let sequence = dataX[random(0, dataX.length - 1)]
  for (let i = 0; i < NUM_PREDICTIONS; i++) {
    const prediction = network.activate(sequence)
    sequence = sequence.slice(1).concat(prediction)
  }
  const str = sequence
    .map(floatIndex => Math.floor(floatIndex * vocabulary.length))
    .map(index => vocabulary[index])
    .join('')
  console.log({ sequence, str })
}

const command = process.argv[2]

run(command).catch(err => {
  console.log('You suck')
  console.log(err)
})
