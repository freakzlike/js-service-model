import Dictionary from '../types/Dictionary'
import { ServiceModel } from './ServiceModel'
import { ServiceStoreOptions } from '../types/store/ServiceStore'
import axios, { AxiosRequestConfig } from 'axios'
import { ResponseData, RetrieveInterfaceParams, PrimaryKey, DeleteInterfaceParams } from '../types/models/ModelManager'
import {
  APIException,
  BadRequestAPIException,
  UnauthorizedAPIException,
  ForbiddenAPIException,
  NotFoundAPIException,
  InternalServerErrorAPIException
} from '../exceptions/APIExceptions'

/**
 * ModelManager
 * Provides interface for model to retrieve data from backend api
 */
export class ModelManager {
  public model: typeof ServiceModel

  constructor (model: typeof ServiceModel) {
    this.model = model
  }

  /**
   * Fill ServiceStoreOptions default options from params
   */
  protected getServiceStoreOptions (options: ServiceStoreOptions, params: RetrieveInterfaceParams | undefined): ServiceStoreOptions {
    return {
      noCache: Boolean(params && params.noCache),
      noRequestAggregation: Boolean(params && params.noRequestAggregation),
      refreshCache: Boolean(params && params.refreshCache),
      ...options
    }
  }

  /**
   * Retrieve specific model instance
   * @param pk
   * @param params
   */
  public async detail (pk: PrimaryKey, params?: RetrieveInterfaceParams): Promise<ServiceModel> {
    const parents = params && params.parents

    const Model = this.model
    const url = await Model.getDetailUrl(pk, parents)

    const options = this.getServiceStoreOptions({
      key: url,
      sendRequest: this.sendDetailRequest.bind(this),
      args: [url, pk, params]
    }, params)

    const data: Dictionary<any> = await Model.store.getData(options)
    return new Model(data)
  }

  /**
   * Retrieve list of all model instances
   * @param params
   */
  public async list (params?: RetrieveInterfaceParams): Promise<Array<ServiceModel>> {
    const parents = params && params.parents
    const filterParams = params && params.filter

    const Model = this.model
    const url = await Model.getListUrl(parents)
    const keyBuilder = [url]
    if (filterParams && Object.keys(filterParams).length > 0) {
      keyBuilder.push(JSON.stringify(filterParams))
    }

    const options = this.getServiceStoreOptions({
      key: keyBuilder.join('?'),
      sendRequest: this.sendListRequest.bind(this),
      args: [url, params]
    }, params)

    const dataList: Array<ResponseData> = await Model.store.getData(options)
    return dataList.map(data => new Model(data))
  }

  /**
   * Delete single instance
   * @param pk
   * @param params
   */
  public async delete (pk: PrimaryKey, params?: DeleteInterfaceParams): Promise<null> {
    const parents = params && params.parents

    const Model = this.model
    const url = await Model.getDetailUrl(pk, parents)
    return this.sendDeleteRequest(url, pk, params)
  }

  /**
   * Build config for axios retrieve request
   * @param params
   */
  public async buildRetrieveRequestConfig (params?: RetrieveInterfaceParams): Promise<any> {
    if (!params) return {}

    const config: AxiosRequestConfig = {}
    if (params.filter && Object.keys(params.filter).length) {
      config.params = params.filter
    }
    return config
  }

  /**
   * Send actual detail service request and map data before caching
   * @param options
   * @param url
   * @param pk
   * @param params
   */
  public async sendDetailRequest (
    options: ServiceStoreOptions,
    url: string,
    pk: PrimaryKey,
    params?: RetrieveInterfaceParams
  ): Promise<ResponseData> {
    const config = await this.buildRetrieveRequestConfig(params)
    let response
    try {
      response = await axios.get(url, config)
    } catch (error) {
      throw await this.handleResponseError(error)
    }

    return this.mapDetailResponseBeforeCache(options, response.data, url, pk, params)
  }

  /**
   * Map raw response data from detail service request before cache
   * @param options
   * @param data
   * @param url
   * @param pk
   * @param params
   */
  public async mapDetailResponseBeforeCache (
    options: ServiceStoreOptions,
    data: Array<ResponseData>,
    url: string,
    pk: PrimaryKey,
    params?: RetrieveInterfaceParams
  ): Promise<ResponseData> {
    return data
  }

  /**
   * Send actual list service request and map data before caching
   * @param options
   * @param url
   * @param params
   */
  public async sendListRequest (
    options: ServiceStoreOptions,
    url: string,
    params?: RetrieveInterfaceParams
  ): Promise<Array<ResponseData>> {
    const config = await this.buildRetrieveRequestConfig(params)
    let response
    try {
      response = await axios.get(url, config)
    } catch (error) {
      throw await this.handleResponseError(error)
    }

    return this.mapListResponseBeforeCache(options, response.data, url, params)
  }

  /**
   * Map raw response data from list service request before cache
   * @param options
   * @param data
   * @param url
   * @param params
   */
  public async mapListResponseBeforeCache (
    options: ServiceStoreOptions,
    data: Array<ResponseData>,
    url: string,
    params?: RetrieveInterfaceParams
  ): Promise<Array<ResponseData>> {
    return data
  }

  /**
   * Send actual delete service request
   * @param url
   * @param pk
   * @param params
   */
  public async sendDeleteRequest (url: string, pk: PrimaryKey, params?: DeleteInterfaceParams): Promise<null> {
    try {
      await axios.delete(url)
    } catch (error) {
      throw await this.handleResponseError(error)
    }
    return null
  }

  /**
   * Receive error from service and map to api exceptions
   * @param error
   */
  public async handleResponseError (error: any) {
    if (error.response) {
      switch (error.response.status) {
        case BadRequestAPIException.statusCode:
          return new BadRequestAPIException(error.response)
        case UnauthorizedAPIException.statusCode:
          return new UnauthorizedAPIException(error.response)
        case ForbiddenAPIException.statusCode:
          return new ForbiddenAPIException(error.response)
        case NotFoundAPIException.statusCode:
          return new NotFoundAPIException(error.response)
        case InternalServerErrorAPIException.statusCode:
          return new InternalServerErrorAPIException(error.response)
        default:
          return new APIException(error.response)
      }
    } else {
      return error
    }
  }
}
