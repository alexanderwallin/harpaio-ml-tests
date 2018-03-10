const fse = require('fse')
const globby = require('globby')
const { mean } = require('lodash')
const { chunk, flatten, flow, map, take } = require('lodash/fp')
const kmeans = require('ml-kmeans')
const kNN = require('ml-knn')
const path = require('path')

const getMidiInput = require('../utils/getMidiInput.js')

const CHUNK_SIZE = 10

async function getMidiValues(input, initialValue, { chunkSize, frequency }) {
  return new Promise(resolve => {
    const values = []
    let currentValue = initialValue
    let timerId = null

    const onMidiEvent = (deltaTime, [, , value]) => {
      currentValue = value
    }
    input.on('message', onMidiEvent)
    timerId = setInterval(() => {
      values.push(currentValue)

      if (values.length === chunkSize) {
        input.removeListener('message', onMidiEvent)
        clearInterval(timerId)
        resolve(values)
      }
    }, 1000 / frequency)
  })
}

function deltaify(arr) {
  return arr.map((x, i) => x - arr[Math.max(0, i - 1)])
}

async function run() {
  // Read files
  const glob = process.argv[2]
  if (typeof glob !== 'string') {
    console.log('Please provide a glob to match data filename against')
    process.exit(0)
  }

  const filenames = await globby(glob)
  if (filenames.length === 0) {
    console.log(`Could not find any files matching '${glob}'`)
    process.exit(0)
  }

  // Get clusters
  const dataset = JSON.parse(fse.readFileSync(filenames[0], 'utf8'))
  const points = flow(flatten, map(x => x / 127))(dataset.data)
  const deltaPoints = deltaify(points)

  // console.log(deltaPoints)
  const inputPoints = chunk(CHUNK_SIZE)(deltaPoints)
  const ans = kmeans(inputPoints, 4)
  console.log(ans)

  // return

  // Create a kNN network
  const knn = new kNN(inputPoints, ans.clusters)

  // Get MIDI input
  const input = await getMidiInput()
  const { frequency } = dataset.meta
  let lastValue = 0

  while (true) {
    const values = await getMidiValues(input, lastValue, {
      chunkSize: CHUNK_SIZE,
      frequency,
    })
    // console.log({ values })
    lastValue = values[values.length - 1]

    const inputValues = flow(map(x => x / 127), deltaify)(values)
    const cluster = knn.predict(inputValues)
    console.log(cluster)
  }
}

run().catch(err => {
  console.log('An error occured:')
  console.log(err)
})
