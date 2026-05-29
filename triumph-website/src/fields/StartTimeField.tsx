'use client'

import { DateTimeField, useFormFields } from '@payloadcms/ui'

function getFieldValue(fields: any, path: string) {
  return fields[path]?.value
}

export default function StartTimeField(props: any) {
  const fields = useFormFields(([fields]) => fields)

  const currentPath = props.path

  const match = currentPath.match(
    /days\.(\d+)\.slots\.(\d+)\.startTime/
  )

  if (!match) {
    return <DateTimeField {...props} />
  }

  const dayIndex = Number(match[1])
  const slotIndex = Number(match[2])

  const previousEndTime = getFieldValue(
    fields,
    `days.${dayIndex}.slots.${slotIndex - 1}.endTime`
  )

  const currentEndTime = getFieldValue(
    fields,
    `days.${dayIndex}.slots.${slotIndex}.endTime`
  )

  let minTime = new Date()
  minTime.setHours(0, 0, 0, 0)

  let maxTime: Date | undefined

  if (previousEndTime) {
    minTime = new Date(previousEndTime)
  }

  if (currentEndTime) {
    maxTime = new Date(currentEndTime)
    maxTime.setMinutes(maxTime.getMinutes() - 15)
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