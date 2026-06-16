declare module 'heic-convert' {
  type ConvertOptions = {
    buffer: ArrayBuffer | Buffer | Uint8Array
    format: 'JPEG' | 'PNG'
    quality?: number
  }

  type ConvertAllResult = {
    convert: () => Promise<Buffer>
  }

  function convert(options: ConvertOptions): Promise<Buffer>

  namespace convert {
    function all(options: ConvertOptions): Promise<ConvertAllResult[]>
  }

  export = convert
}
