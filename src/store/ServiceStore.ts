import Dictionary from '../types/Dictionary'
import { ServiceStoreStateData, ServiceStoreOptions } from '../types/store/ServiceStore'

export class ServiceStore {
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
      this._setData(key, data)

      return data
    }, error => {
      this.removeRequest(key)
      throw error
    })

    this._setRequest(key, request)
    return request
  }

  /**
   * Save data in cache if required
   * @param key
   * @param data
   */
  protected _setData (key: string, data: Dictionary<any>) {
    if (this.cacheDuration !== 0) {
      const _data: ServiceStoreStateData = { data }

      if (this.cacheDuration !== null) {
        _data.expires = Date.now() + (this.cacheDuration * 1000)
      }

      this._data[key] = _data
    }

    this.removeRequest(key)
  }

  /**
   * Save started request promise
   * @param key
   * @param request
   */
  protected _setRequest (key: string, request: Promise<any>) {
    this._requests[key] = request
  }

  /**
   * Remove request promise
   * @param key
   */
  public removeRequest (key: string) {
    delete this._requests[key]
  }

  /**
   * Clean up data and remove expired cache
   */
  public clean () {
    let key
    const expiredTime = Date.now()
    for (key of Object.keys(this._data)) {
      const expires = this._data[key].expires
      if (expires && expires < expiredTime) {
        delete this._data[key]
      }
    }
  }

  /**
   * clear complete cache
   */
  public clear () {
    this._data = {}
    this._requests = {}
  }
}
