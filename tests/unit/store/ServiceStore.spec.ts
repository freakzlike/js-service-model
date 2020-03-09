import { ServiceStore, ServiceStoreOptions } from '@/store/ServiceStore'

describe('models/BaseModel', () => {
  class TestServiceStore extends ServiceStore {
    get testGetCachedData () {
      return this._data
    }

    get testGetCachedRequests () {
      return this._requests
    }
  }

  describe('getData', () => {
    it('should request data and use cache', async () => {
      const serviceStore = new TestServiceStore(null)
      const resultData = { x: 1 }
      const options: ServiceStoreOptions = {
        key: 'serviceKey',
        sendRequest: () => Promise.resolve(resultData),
        args: [1, 'test']
      }
      const spySendRequest = jest.spyOn(options, 'sendRequest')

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(1)
      expect(spySendRequest.mock.calls[0]).toEqual([options, 1, 'test'])

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(1)

      expect(serviceStore.testGetCachedData).toHaveProperty(options.key)

      spySendRequest.mockRestore()
    })

    it('should request data and not use cache', async () => {
      const serviceStore = new TestServiceStore(0)
      const resultData = { x: 1 }
      const options: ServiceStoreOptions = {
        key: 'serviceKey',
        sendRequest: () => Promise.resolve(resultData)
      }
      const spySendRequest = jest.spyOn(options, 'sendRequest')

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(1)
      expect(spySendRequest.mock.calls[0]).toEqual([options])

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(2)
      expect(spySendRequest.mock.calls[0]).toEqual([options])

      expect(serviceStore.testGetCachedData).not.toHaveProperty(options.key)

      spySendRequest.mockRestore()
    })

    it('should request data and use expiring cache', async () => {
      const serviceStore = new ServiceStore(5)
      const resultData = { x: 1 }
      const options: ServiceStoreOptions = {
        key: 'serviceKey',
        sendRequest: () => Promise.resolve(resultData)
      }
      const spySendRequest = jest.spyOn(options, 'sendRequest')

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(1)

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(1)

      spySendRequest.mockRestore()
    })

    it('should attach to running request', async () => {
      jest.useFakeTimers()
      const serviceStore = new TestServiceStore(0)
      const resultData = { x: 1 }
      let timeout
      const options: ServiceStoreOptions = {
        key: 'serviceKey',
        sendRequest: () => new Promise(resolve => {
          timeout = setTimeout(() => resolve(resultData), 50000)
        })
      }
      const spySendRequest = jest.spyOn(options, 'sendRequest')

      const promise1 = serviceStore.getData(options)
      expect(promise1).toBeInstanceOf(Promise)
      expect(spySendRequest).toBeCalledTimes(1)
      expect(timeout).not.toBeUndefined()
      const promise2 = serviceStore.getData(options)
      expect(promise2).toBeInstanceOf(Promise)
      expect(spySendRequest).toBeCalledTimes(1)

      expect(serviceStore.testGetCachedData).not.toHaveProperty(options.key)
      expect(serviceStore.testGetCachedRequests).toHaveProperty(options.key)

      jest.runOnlyPendingTimers()

      expect(await promise1).toBe(resultData)
      expect(await promise2).toBe(resultData)

      spySendRequest.mockRestore()
      clearTimeout(timeout)
    })

    it('should expire cache and request data', async () => {
      const serviceStore = new ServiceStore(10)
      const resultData = { x: 1 }
      const options: ServiceStoreOptions = {
        key: 'serviceKey',
        sendRequest: () => Promise.resolve(resultData)
      }
      const spySendRequest = jest.spyOn(options, 'sendRequest')
      let spyGetTime = jest.spyOn(Date, 'now').mockImplementation(() => 1000)

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(1)

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(1)

      spyGetTime.mockRestore()
      spyGetTime = jest.spyOn(Date, 'now').mockImplementation(() => 12000)

      expect(await serviceStore.getData(options)).toBe(resultData)
      expect(spySendRequest).toBeCalledTimes(2)

      spySendRequest.mockRestore()
      spyGetTime.mockRestore()
    })

    it('should throw error and clean cached request', async () => {
      const serviceStore = new TestServiceStore(null)
      const customError = new Error('Handle error')
      const options: ServiceStoreOptions = {
        key: 'serviceKey',
        sendRequest: async () => {
          throw customError
        },
        args: [1, 'test']
      }
      const spySendRequest = jest.spyOn(options, 'sendRequest')

      await expect(serviceStore.getData(options)).rejects.toBe(customError)
      expect(spySendRequest).toBeCalledTimes(1)

      expect(serviceStore.testGetCachedData).not.toHaveProperty(options.key)
      expect(serviceStore.testGetCachedRequests).not.toHaveProperty(options.key)

      await expect(serviceStore.getData(options)).rejects.toBe(customError)
      expect(spySendRequest).toBeCalledTimes(2)

      expect(serviceStore.testGetCachedData).not.toHaveProperty(options.key)
      expect(serviceStore.testGetCachedRequests).not.toHaveProperty(options.key)

      spySendRequest.mockRestore()
    })
  })

  describe('clean', () => {
    it('should clean expired keys', async () => {
      const serviceStore = new TestServiceStore(10)
      const sendRequest = () => Promise.resolve(0)

      let spyGetTime = jest.spyOn(Date, 'now').mockImplementation(() => 1000)

      await serviceStore.getData({ key: 'key1', sendRequest })
      await serviceStore.getData({ key: 'key2', sendRequest })

      spyGetTime.mockRestore()
      spyGetTime = jest.spyOn(Date, 'now').mockImplementation(() => 9000)
      await serviceStore.getData({ key: 'key3', sendRequest })

      spyGetTime.mockRestore()
      spyGetTime = jest.spyOn(Date, 'now').mockImplementation(() => 12000)

      const stateData = serviceStore.testGetCachedData
      expect(Object.keys(stateData)).toHaveLength(3)
      expect(Object.keys(stateData).sort()).toEqual(['key1', 'key2', 'key3'].sort())

      serviceStore.clean()

      expect(Object.keys(stateData)).toHaveLength(1)
      expect(Object.keys(stateData)).toEqual(['key3'])

      spyGetTime.mockRestore()
    })
  })
})