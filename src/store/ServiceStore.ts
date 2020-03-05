import Dictionary from '../types/Dictionary'

/**
 * Internal cached data structure
 */
interface ServiceStoreStateData {
  /**
   * Contains UNIX Timestamp when the cache will expire
   */
  expires?: number;
  /**
   * Actual cached data
   */
  data: any;
}

/**
 * Interface for input options
 */
interface ServiceStoreOptions {
  /**
   * key to identify equal requests and data from cache
   */
  key: string;
  /**
   * Callback to perform actual service request. Should return result data which will be cached
   */
  sendRequest: (options: ServiceStoreOptions, ...args: Array<any>) => Promise<any>;
  /**
   * Additional arguments for the sendRequest callback
   */
  args?: Array<any>;
}

class ServiceStore {
  /**
   * Dictionary of cached data structure by options.key
   */
  protected _data: Dictionary<ServiceStoreStateData>
  /**
   * Dictionary of started requests by options.key
   */
  protected _requests: Dictionary<Promise<any>>
  /**
   * Default cache duration in seconds.
   * 0: no cache
   * null: Cache does not expire
   */
  protected cacheDuration: number | null

  constructor (cacheDuration: number | null) {
    this.cacheDuration = cacheDuration
    this._data = {}
    this._requests = {}
  }

  /**
   * Get data of options.key either from cache or by calling options.sendRequest
   * @param options
   */
  public async getData (options: ServiceStoreOptions): Promise<any> {
    const key = options.key

    // Retrieve data from cache
    if (Object.prototype.hasOwnProperty.call(this._data, key)) {
      const data = this._data[key]
      // Cache expired
      if (!data.expires || data.expires > Date.now()) {
        return data.data
      }
    }

    return this.loadData(options)
  }

  /**
   * Loads data by calling options.sendRequest. If request of same key has already started return attach to this request
   * @param options
   */
  async loadData (options: ServiceStoreOptions): Promise<any> {
    const key = options.key

    // Request with key has already been started
    if (Object.prototype.hasOwnProperty.call(this._requests, key) && this._requests[key] !== null) {
      return this._requests[key]
    }

    // Actual request and save result in cache
    const request = options.sendRequest(options, ...(options.args || [])).then(data => {
      this._setData({ data, key })

      return data
    })

    this._setRequest({ request, key })
    return request
  }

  /**
   * Save data in cache if required
   * @param {data, key}
   */
  protected _setData ({ data, key }: { data: Dictionary<any>; key: string }) {
    if (this.cacheDuration !== 0) {
      const _data: ServiceStoreStateData = { data }

      if (this.cacheDuration !== null) {
        _data.expires = Date.now() + (this.cacheDuration * 1000)
      }

      this._data[key] = _data
    }

    delete this._requests[key]
  }

  /**
   * Save started request promise
   * @param {request, key}
   */
  protected _setRequest ({ request, key }: { request: Promise<any>; key: string }) {
    this._requests[key] = request
  }

  /**
   * Clean up data and remove expired cache
   */
  clean () {
    let key
    const expiredTime = Date.now()
    for (key of Object.keys(this._data)) {
      const expires = this._data[key].expires
      if (expires && expires < expiredTime) {
        delete this._data[key]
      }
    }
  }
}

export { ServiceStore, ServiceStoreOptions }
