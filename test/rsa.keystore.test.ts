import RSAKeyStore from '../src/rsa/keystore'
import keys from '../src/rsa/keys'
import operations from '../src/rsa/operations'
import config from '../src/config'
import idb from '../src/idb'
import { KeyUse, RsaSize, HashAlg, CryptoSystem } from '../src/types'
import { mock, keystoreMethod } from './utils'

jest.mock('../src/idb')

describe("RSAKeyStore", () => {
  describe("init", () => {

    let response: any
    let fakeStore: jest.SpyInstance
    let fakeMake: jest.SpyInstance
    let fakeCreateifDNE: jest.SpyInstance

    beforeAll(async () => {
      fakeStore = jest.spyOn(idb, 'createStore')
      fakeStore.mockReturnValue(mock.idbStore)

      fakeMake = jest.spyOn(keys, 'makeKeypair')
      fakeMake.mockResolvedValue(mock.keys)

      fakeCreateifDNE = jest.spyOn(idb, 'createIfDoesNotExist')
      fakeCreateifDNE.mockImplementation((_name, makeFn) => {
        makeFn()
      })

      response = await RSAKeyStore.init({ readKeyName: 'test-read', writeKeyName: 'test-write' })
    })

    it('should initialize a keystore with expected params', () => {
      let cfg = config.normalize({
        type: CryptoSystem.RSA,
        readKeyName: 'test-read',
        writeKeyName: 'test-write'
      })
      const keystore = new RSAKeyStore(cfg, mock.idbStore)
      expect(response).toStrictEqual(keystore)
    })

    it('should call createIfDoesNotExist with correct params (read key)', () => {
      expect(fakeCreateifDNE.mock.calls[0][0]).toEqual('test-read')
      expect(fakeCreateifDNE.mock.calls[0][2]).toEqual(mock.idbStore)
    })

    it('should call createIfDoesNotExist with correct params (write key)', () => {
      expect(fakeCreateifDNE.mock.calls[1][0]).toEqual('test-write')
      expect(fakeCreateifDNE.mock.calls[1][2]).toEqual(mock.idbStore)
    })

    it('should call makeKeypair with correct params (read key)', () => {
      expect(fakeMake.mock.calls[0]).toEqual([
        RsaSize.B2048,
        HashAlg.SHA_256,
        KeyUse.Read
      ])
    })

    it('should call makeKeypair with correct params (write key)', () => {
      expect(fakeMake.mock.calls[1]).toEqual([
        RsaSize.B2048,
        HashAlg.SHA_256,
        KeyUse.Write
      ])
    })

  })


  keystoreMethod({
    desc: 'sign',
    type: 'rsa',
    mocks: [
      {
        mod: operations,
        meth: 'signBytes', 
        resp: mock.sigBytes,
        params: [
          mock.msgBytes,
          mock.writeKeys.privateKey,
        ]
      }
    ],
    reqFn: (ks) => ks.sign(mock.msgStr),
    expectedResp: mock.sigStr,
  })


  keystoreMethod({
    desc: 'verify',
    type: 'rsa',
    mocks: [
      {
        mod: operations,
        meth: 'verifyBytes', 
        resp: true,
        params: [
          mock.msgBytes,
          mock.sigBytes,
          mock.writeKeys.publicKey,
        ]
      },
      {
        mod: keys,
        meth: 'importPublicKey',
        resp: mock.writeKeys.publicKey,
        params: [
          mock.keyBase64,
          config.defaultConfig.hashAlg,
          KeyUse.Write
        ]
      }
    ],
    reqFn: (ks) => ks.verify(mock.msgStr, mock.sigStr, mock.keyBase64),
    expectedResp: true,
  })


  keystoreMethod({
    desc: 'encrypt',
    type: 'rsa',
    mocks: [
      {
        mod: operations,
        meth: 'encryptBytes', 
        resp: mock.cipherBytes,
        params: [
          mock.msgBytes,
          mock.encryptForKey.publicKey,
        ]
      },
      {
        mod: keys,
        meth: 'importPublicKey',
        resp: mock.encryptForKey.publicKey,
        params: [
          mock.keyBase64,
          config.defaultConfig.hashAlg,
          KeyUse.Read
        ]
      }
    ],
    reqFn: (ks) => ks.encrypt(mock.msgStr, mock.keyBase64),
    expectedResp: mock.cipherStr,
  })


  keystoreMethod({
    desc: 'decrypt',
    type: 'rsa',
    mocks: [
      {
        mod: operations,
        meth: 'decryptBytes', 
        resp: mock.msgBytes,
        params: [
          mock.cipherBytes,
          mock.keys.privateKey,
        ]
      },
    ],
    reqFn: (ks) => ks.decrypt(mock.cipherStr, mock.keyBase64),
    expectedResp: mock.msgStr,
  })


  keystoreMethod({
    desc: 'publicReadKey',
    type: 'rsa',
    mocks: [
      {
        mod: operations,
        meth: 'getPublicKey', 
        resp: mock.keyBase64,
        params: [
          mock.keys
        ]
      }
    ],
    reqFn: (ks) => ks.publicReadKey(),
    expectedResp: mock.keyBase64,
  })


  keystoreMethod({
    desc: 'publicWriteKey',
    type: 'rsa',
    mocks: [
      {
        mod: operations,
        meth: 'getPublicKey', 
        resp: mock.keyBase64,
        params: [
          mock.writeKeys
        ]
      }
    ],
    reqFn: (ks) => ks.publicWriteKey(),
    expectedResp: mock.keyBase64,
  })

})
