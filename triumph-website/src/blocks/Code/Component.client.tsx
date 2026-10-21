'use client'
import { Highlight, themes } from 'prism-react-renderer'
import React from 'react'
import { CopyButton } from './CopyButton'

type Props = {
  code: string
  language?: string
}

export const Code: React.FC<Props> = ({ code, language = '' }) => {
  if (!code) return null

  return (
    <Highlight code={code} language={language} theme={themes.vsDark}>
      {({ getLineProps, getTokenProps, tokens }) => (
        <pre className="max-w-full overflow-x-auto rounded-xl bg-black/60 p-5 text-sm leading-7 sm:p-8">
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ className: 'table-row', line })}>
              <span className="table-cell select-none text-right text-white/60">{i + 1}</span>
              <span className="table-cell pl-4">
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </span>
            </div>
          ))}
          <CopyButton code={code} />
        </pre>
      )}
    </Highlight>
  )
}
