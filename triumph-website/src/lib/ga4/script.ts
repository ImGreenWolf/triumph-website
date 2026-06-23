import { GA4_MEASUREMENT_ID } from './config'
import type { GA4ConfigParams, GA4ConsentOptions } from './types'

const serializeForScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

export const getGA4ScriptSrc = (measurementId = GA4_MEASUREMENT_ID) =>
  `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`

type CreateGA4InitScriptOptions = {
  defaultConsent?: GA4ConsentOptions
  initialConfig?: GA4ConfigParams
  measurementId?: string
}

export const createGA4InitScript = ({
  defaultConsent,
  initialConfig,
  measurementId = GA4_MEASUREMENT_ID,
}: CreateGA4InitScriptOptions = {}) => {
  const consentLine = defaultConsent
    ? `gtag('consent', 'default', ${serializeForScript(defaultConsent)});`
    : ''

  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    ${consentLine}
    gtag('js', new Date());
    gtag('config', ${serializeForScript(measurementId)}, ${serializeForScript(initialConfig ?? {})});
  `
}
