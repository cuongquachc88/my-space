import LZString from 'lz-string'

export interface SharePin {
  label: string
  lat: number
  lng: number
  note: string
  url: string
}

export interface ShareStack {
  name: string
  color: string
  pins: SharePin[]
}

export function encodeShareLink(stack: ShareStack): string {
  const json = JSON.stringify(stack)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return `${location.origin}${location.pathname}?d=${compressed}`
}

export function decodeShareParam(param: string): ShareStack | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(param)
    if (!json) return null
    return JSON.parse(json) as ShareStack
  } catch {
    return null
  }
}
