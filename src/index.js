const request = require('request')
const throttledRequest = require('throttled-request')
const chance = require('chance').Chance()
const crypto = require('crypto')
const qs = require('querystring')

class Nicehash {
  constructor (apikey, apiSecret, organizationId) {
    this.apikey = apikey
    this.apiSecret = apiSecret
    this.organizationId = organizationId

    this.httpClient = throttledRequest(request.defaults({
      baseUrl: `https://api2.nicehash.com`,
      forever: true,
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
        'X-Organization-Id': this.organizationId
      },
      json: true
    }))

    this.httpClient.configure({
      requests: 1,
      milliseconds: 1500 * 2
    })
  }

  request (method, path, query, body, cb) {
    let headers = {
      'X-Request-Id': +Date.now(),
      'X-Time': +Date.now(),
      'X-Nonce': chance.guid()
    }

    query = qs.stringify(query)

    let input = [
      this.apikey,
      headers['X-Time'].toString(),
      headers['X-Nonce'],
      null,
      this.organizationId,
      null,
      method.toUpperCase(),
      path,
      query
    ]

    if (body) {
      input.push(JSON.stringify(body))
    }

    headers['X-Auth'] = `${this.apikey}:${this.hmacSha256BySegments(input)}`

    this.httpClient({
      url: `${path}${query ? '?' : ''}${query}`,
      body,
      method,
      headers
    }, cb)
  }

  hmacSha256BySegments (input) {
    let signature = crypto.createHmac('sha256', this.apiSecret)

    for (let index in input) {
      if (+index) {
        signature.update(Buffer.from([0]))
      }

      if (input[index] !== null) {
        signature.update(Buffer.from(input[index]))
      }
    }

    return signature.digest('hex')
  }

  orderBook (query, cb) {
    this.request('GET', '/main/api/v2/hashpower/orderBook/', query, undefined, cb)
  }

  myOrderBook (query, cb) {
    this.request('GET', '/main/api/v2/hashpower/myOrders', query, undefined, cb)
  }

  createOrder (body, cb) {
    this.request('POST', '/main/api/v2/hashpower/order', {}, body, cb)
  }

  getOrder (orderId, cb) {
    this.request('GET', `/main/api/v2/hashpower/order/${orderId}`, {}, undefined, cb)
  }

  deleteOrder (orderId, cb) {
    this.request('DELETE', `/main/api/v2/hashpower/order/${orderId}`, {}, undefined, cb)
  }

  refillOrder (orderId, body, cb) {
    this.request('POST', `/main/api/v2/hashpower/order/${orderId}/refill`, body, undefined, cb)
  }

  updateOrderPriceAndLimit (orderId, body, cb) {
    this.request('POST', `/main/api/v2/hashpower/order/${orderId}/updatePriceAndLimit`, {}, body, cb)
  }

  getPools (price, size, cb) {
    this.request('GET', '/main/api/v2/pools', { price, size }, null, cb)
  }

  createPool (body, cb) {
    this.request('POST', '/main/api/v2/pool', {}, body, cb)
  }

  getStats (orderId, cb) {
    this.request('GET', `/main/api/v2/hashpower/order/${orderId}/stats`, {}, undefined, cb)
  }
}

module.exports = Nicehash
