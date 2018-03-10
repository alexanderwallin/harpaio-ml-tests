const fse = require('fse')
const inquirer = require('inquirer')
const path = require('path')
const tinytime = require('tinytime')

module.exports = async function storeRecording(name, data, meta) {
  const { writeToFile } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'writeToFile',
      message: 'Write to file?',
      default: true,
    },
  ])

  if (writeToFile === false) {
    return
  }

  const fileData = { meta, data }

  const dateString = tinytime(`{YYYY}{Mo}{Do}{H}{mm}{ss}`, {
    padMonth: true,
  }).render(new Date())
  const filename = `midi_recording-${name}-${dateString}.json`
  const fileContents = JSON.stringify(fileData, null, 2)
  await fse.writeFile(path.join('data', filename), fileContents)

  console.log(`Saved recording to ${filename}.`)
}
