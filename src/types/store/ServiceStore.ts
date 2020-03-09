/**
 * Internal cached data structure
 */
export interface ServiceStoreStateData {
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
export interface ServiceStoreOptions {
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
