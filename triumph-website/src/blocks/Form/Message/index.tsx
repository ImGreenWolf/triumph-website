import RichText from '@/components/RichText'
import React from 'react'

import { Width } from '../Width'
import { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

export const Message: React.FC<{ message: DefaultTypedEditorState }> = ({ message }) => {
  return (
    <Width className="rounded-md border border-border bg-sidebar/40 p-4" width="100">
      {message && <RichText data={message} enableGutter={false} />}
    </Width>
  )
}
