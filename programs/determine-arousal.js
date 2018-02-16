const _ = require('lodash')
const fse = require('fse')
const globby = require('globby')
const KNN = require('ml-knn')
const path = require('path')

async function run() {
  // Read files
  const glob = process.argv[2]
  if (typeof glob !== 'string') {
    console.log('Please provide a glob to match data filenames against')
    process.exit(0)
  }

  const filenames = await globby(glob)
  if (filenames.length === 0) {
    console.log(`Could not find any files matching '${glob}'`)
    process.exit(0)
  }

  const datasets = filenames
    .map(x => fse.readFileSync(x, 'utf8'))
    .map(x => JSON.parse(x))

  // Create data for all recordings with only delta times as flat arrays
  const activeData = datasets[0].recordings.map(recording => ({
    category: 'active',
    points: recording.map(entry => entry.deltaTime),
  }))
  const passiveData = datasets[1].recordings.map(recording => ({
    category: 'passive',
    points: recording.map(entry => entry.deltaTime),
  }))
  const collectedData = activeData.concat(passiveData)

  // Normalise data
  const categories = _.uniqBy(collectedData, 'category').map(x => x.category)
  const maxDeltaTime = _.max(
    _.flatten(collectedData.map(({ points }) => points))
  )

  const normalisedData = collectedData.map(({ category, points }) => ({
    category: categories.indexOf(category),
    points: points.map(x => x / maxDeltaTime),
  }))
  const chunkedNormalisedData = normalisedData
    .map(({ category, points }) =>
      _.chunk(points, 20).map(arr => ({ category, points: arr }))
    )
    .reduce((aggr, entries) => aggr.concat(entries), [])

  // Shuffle and split into training and test data
  const shuffledData = _.shuffle(chunkedNormalisedData)
  const trainingData = shuffledData.slice(
    0,
    Math.floor(0.7 * shuffledData.length)
  )
  const testData = shuffledData.slice(trainingData.length)

  // Create input dataset and labels for the ML algorithm
  const inputDataset = trainingData.map(({ points }) => points)
  const inputLabels = trainingData.map(({ category }) => category)

  const knn = new KNN(inputDataset, inputLabels)

  // Try it on the test data
  let numBingos = 0
  testData.forEach(dataset => {
    const result = knn.predict(dataset.points)
    console.log(`result: ${result}, actual: ${dataset.category}`)

    if (result === dataset.category) {
      numBingos++
    }
  })

  console.log(
    `score: ${numBingos} / ${testData.length} = ${numBingos / testData.length}`
  )
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.error(err)
  }
})()
