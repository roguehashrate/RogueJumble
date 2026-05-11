import { hexToBytes } from '@noble/hashes/utils'

class MediaDecryptService {
  static instance: MediaDecryptService

  private constructor() {}

  static getInstance(): MediaDecryptService {
    if (!MediaDecryptService.instance) {
      MediaDecryptService.instance = new MediaDecryptService()
    }
    return MediaDecryptService.instance
  }

  async decryptAesGcm(
    encryptedData: ArrayBuffer,
    keyHex: string,
    nonceHex: string
  ): Promise<ArrayBuffer> {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(keyHex),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(nonceHex) },
      key,
      encryptedData
    )
  }

  async fetchAndDecrypt(url: string, keyHex: string, nonceHex: string): Promise<ArrayBuffer> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
    return this.decryptAesGcm(await response.arrayBuffer(), keyHex, nonceHex)
  }

  parseKind15Tags(tags?: string[][]): { keyHex?: string; nonceHex?: string; mimeType?: string } {
    if (!tags) return {}
    return {
      keyHex: tags.find((t) => t[0] === 'decryption-key')?.[1],
      nonceHex: tags.find((t) => t[0] === 'decryption-nonce')?.[1],
      mimeType: tags.find((t) => t[0] === 'file-type')?.[1]
    }
  }
}

const instance = MediaDecryptService.getInstance()
export default instance
