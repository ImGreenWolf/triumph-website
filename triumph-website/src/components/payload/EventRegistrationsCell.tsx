'use client'

import type { DefaultCellComponentProps } from 'payload'

export default function EventRegistrationsCell({
  cellData,
}: DefaultCellComponentProps) {

  const count = Array.isArray(cellData.docs)
    ? cellData.docs.length
    : 0

  return <span>{count}</span>
}