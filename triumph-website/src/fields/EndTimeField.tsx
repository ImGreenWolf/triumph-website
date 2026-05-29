'use client'

import { DateTimeField, useFormFields } from '@payloadcms/ui'

function getFieldValue(fields: any, path: string) {
  return fields[path]?.value
}

export default function EndTimeField(props: any) {
  const fields = useFormFields(([fields]) => fields)

  // days.0.slots.2.endTime
  const currentPath = props.path

  const match = currentPath.match(
    /days\.(\d+)\.slots\.(\d+)\.endTime/
  )

  if (!match) {
    return <DateTimeField {...props} />
  }

  const dayIndex = Number(match[1])
  const slotIndex = Number(match[2])

  const slotBase = `days.${dayIndex}.slots.${slotIndex}`

  const startTime = getFieldValue(
    fields,
    `${slotBase}.startTime`
  )

  const nextStartTime = getFieldValue(
    fields,
    `days.${dayIndex}.slots.${slotIndex + 1}.startTime`
  )

  let minTime: Date | undefined
  let maxTime: Date | undefined

  if (startTime) {
    minTime = new Date(startTime)
    minTime.setMinutes(minTime.getMinutes() + 15)
  }

  if (nextStartTime) {
    maxTime = new Date(nextStartTime)
  } else {
    maxTime = new Date()
    maxTime.setHours(23, 59, 0, 0)
  }

  return (
    <DateTimeField
      {...props}
      field={{
        ...props.field,
        admin: {
          ...props.field.admin,
          date: {
            ...props.field.admin?.date,
            overrides: {
              ...(props.field.admin?.date?.overrides || {}),
              minTime,
              maxTime,
            },
          },
        },
      }}
    />
  )
}