const fetch = require('like-fetch')
const { BLOCK_ENGINES, TIP_ACCOUNTS, ERRORS } = require('./constants.js')

module.exports = class Jito {
  constructor (opts = {}) {
    this.url = opts.url || BLOCK_ENGINES[0]
    this.id = 0
    this.agent = opts.agent || null

    // Backwards compat
    if (this.url.endsWith('/api/v1')) {
      this.url = this.url.slice(0, this.url.length - 7)
    }
  }

  static BLOCK_ENGINES = BLOCK_ENGINES
  static TIP_ACCOUNTS = TIP_ACCOUNTS
  static ERRORS = ERRORS

  static getBlockEngine (index) {
    return BLOCK_ENGINES[maybeRandomIndex(index, BLOCK_ENGINES.length)]
  }

  static getTipAccount (index) {
    return TIP_ACCOUNTS[maybeRandomIndex(index, TIP_ACCOUNTS.length)]
  }

  static async send (tx, opts = {}) {
    const jito = new this({ url: opts.url })

    if (Array.isArray(tx)) {
      return jito.sendBundle(tx)
    } else {
      return jito.sendTransaction(tx)
    }
  }

  static async trySend (tx, opts = {}) {
    try {
      return await Jito.send(tx, opts)
    } catch (err) {
      // Safe to ignore error: "bundle contains an already processed transaction"
      if (err.code === ERRORS.ALREADY_PROCESSED) {
        return null
      }

      if (opts.ignoreRateLimit && err.code === ERRORS.RATE_LIMIT) {
        return null
      }

      throw err
    }
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

  async sendTransaction (tx, opts = {}) {
    const encoding = opts.encoding || 'base64'
    const data = await this.api('/transactions', 'sendTransaction', [maybeEncodeTransaction(tx), { encoding }])

    return data.result
  }

  async sendBundle (transactions, opts = {}) {
    const encoding = opts.encoding || 'base64'
    const data = await this.api('/bundles', 'sendBundle', [transactions.map(maybeEncodeTransaction), { encoding }])

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
    const response = await fetch(this.url + '/api/v1' + pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.id,
        method,
        params: params || []
      }),
      agent: this.agent
    })

    const data = await response.json()

    if (data.error) {
      const err = new Error('Jito failed: ' + data.error.message)
      err.code = data.error.code
      throw err
    }

    return data
  }
}

function maybeEncodeTransaction (tx) {
  if (typeof tx === 'object' && tx && tx.serialize) {
    const serialized = tx.serialize()
    const encoded = Buffer.from(serialized).toString('base64')

    return encoded
  }

  return tx
}

function maybeRandomIndex (index, length) {
  if (typeof index === 'number') {
    return index % length
  }

  return Math.floor(Math.random() * length)
}
