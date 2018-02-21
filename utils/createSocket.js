const dgram = require('dgram')

module.exports = function({ port = null } = {}) {
  return new Promise((resolve, reject) => {
    const udp = dgram.createSocket('udp4')
    udp.on('error', err => {
      console.log('Error:')
      console.log(err)
      console.log(err.stack)
      udp.close()
      reject(err)
    })

    if (port === null) {
      resolve(udp)
    } else {
      udp.on('listening', () => {
        const { address, port } = udp.address()
        console.log(`Server listening on ${address}:${port}`)
        resolve(udp)
      })
      udp.bind(port)
    }
  })
}
