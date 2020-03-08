import Dictionary from '../Dictionary'
import { ServiceParent } from '../models/ServiceModel'
import { AxiosResponse } from 'axios'

export type FilterParams = Dictionary<any>
export type ResponseData = Dictionary<any>

export interface RetrieveInterfaceParams {
  /**
   * Service parents to handle nested RESTful services
   */
  parents?: ServiceParent,
  /**
   * Filter params as plain object which will be converted to query parameters (params in axios)
   */
  filter?: FilterParams
}

export interface Response extends AxiosResponse {
}
