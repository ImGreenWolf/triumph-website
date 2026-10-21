'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'

export const Error = ({ name }: { name: string }) => {
  const {
    formState: { errors },
  } = useFormContext()
  return (
    <div role="alert" className="mt-2 text-sm font-medium text-red-300">
      {(errors[name]?.message as string) || 'Acest câmp este obligatoriu.'}
    </div>
  )
}
