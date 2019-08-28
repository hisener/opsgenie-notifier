const path = require('path')
const opsgenie = require('opsgenie-sdk')
const notifier = require('node-notifier')

require('dotenv').config()

opsgenie.configure({
  'host': process.env.OG_HOST,
  'api_key': process.env.OG_API_KEY
})

let actions = [
  {
    name: 'Acknowledge Alert',
    callback: function (alertId) {
      opsgenie.alertV2.acknowledge({ identifier: alertId }, {}, console.log)
    }
  },
  {
    name: 'Close Alert',
    callback: function (alertId) {
      opsgenie.alertV2.close({ identifier: alertId }, {}, console.log)
    }
  }
]

let knownAlerts = []

setInterval(function () {
  getOpenAlerts()
    .then(function (alerts) {
      alerts.forEach(function (alert) {
        if (!knownAlerts.includes(alert.id)) {
          console.log(new Date().toISOString(), 'New Alert', alert.id)
          knownAlerts.push(alert.id)
          notify(alert)
        }
      })
    })
    .catch(function (err) {
      console.error(new Date().toISOString(), err)
    })
}, process.env.INTERVAL || 15000)

function getOpenAlerts () {
  return new Promise(function (resolve, reject) {
    opsgenie.alertV2.list({
      query: 'status: open', // TODO: AND createdAt Date.now()
      limit: 3
    }, function (err, res) {
      if (err) {
        return reject(err)
      }

      resolve(res.data)
    })
  })
}

function notify (alert) {
  notifier.notify({
    title: 'New Alert',
    message: alert.message,
    icon: path.join(__dirname, 'opsgenie-logo.png'),
    wait: true,
    closeLabel: 'Ignore',
    actions: actions.map(action => action.name),
    alertId: alert.id
  }, function (err, response, metadata) {
    if (err) {
      console.error(err)
    }
  })
}

notifier.on('click', function (notifierObject, options, metadata) {
  actions[metadata.activationValueIndex].callback(options.alertId)
})
