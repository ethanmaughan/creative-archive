/** Types for mammoth's prebuilt browser bundle (the published package only ships types for
 *  the Node entrypoint). We only use raw-text extraction. */
declare module 'mammoth/mammoth.browser.js' {
  interface ExtractResult {
    value: string
    messages: unknown[]
  }
  interface MammothBrowser {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractResult>
  }
  const mammoth: MammothBrowser
  export default mammoth
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractResult>
}
