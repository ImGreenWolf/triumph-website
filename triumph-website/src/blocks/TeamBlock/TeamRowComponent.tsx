'use client'

import React from 'react'
import { useRowLabel } from '@payloadcms/ui'

type Member = {
  name?: string
  role?: string
}

const TeamRowComponent = () => {
  const { data, rowNumber } = useRowLabel<Member>()

  return (
    <span>
      {data?.name || `# Empty Member ${(rowNumber ?? 0) +1}`}
    </span>
  )
}

export default TeamRowComponent