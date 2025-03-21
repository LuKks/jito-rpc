const fetch = require('like-fetch')

module.exports = class Jito {
  constructor (opts = {}) {
    this.url = opts.url || 'https://mainnet.block-engine.jito.wtf/api/v1'
    this.id = 0
  }

  async getTipAccounts () {
    const data = await this.api('/bundles', 'getTipAccounts')

    return data.result
  }

  async getRandomTipAccount () {
    const tipAccounts = await this.getTipAccounts()
    const index = Math.floor(Math.random() * tipAccounts.length)

    return tipAccounts[index]
  }

  async sendBundle (transactions, opts = {}) {
    const encoding = opts.encoding || 'base64'
    const data = await this.api('/bundles', 'sendBundle', [transactions, { encoding }])

    return data.result
  }

  async getInflightBundleStatuses (bundleId) {
    const data = await this.api('/bundles', 'getInflightBundleStatuses', [[bundleId]])

    return data.result.value[0]
  }

  async getBundleStatuses (bundleId) {
    const data = await this.api('/bundles', 'getBundleStatuses', [[bundleId]])

    return data.result.value[0]
  }

  async confirmInflightBundle (bundleId, opts = {}) {
    const started = Date.now()
    const timeout = opts.timeout || 30000

    while (true) {
      const inflight = await this.getInflightBundleStatuses(bundleId)

      if (inflight.status === 'Landed') {
        return inflight.landed_slot
      }

      if (inflight.status === 'Failed') {
        return 0
      }

      if (inflight.status !== 'Invalid' && inflight.status !== 'Pending') {
        throw new Error('Jito inflight status is unknown: ' + inflight.status)
      }

      if (Date.now() - started >= timeout) {
        throw new Error('Jito timeout')
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  async api (pathname, method, params) {
    const response = await fetch(this.url + pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.id,
        method,
        params: params || []
      })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error('Jito failed (' + data.error.code + '): ' + data.error.message)
    }

    return data
  }
}
