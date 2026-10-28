import type { Payload } from 'payload'
import type { Event } from '@/payload-types'
import { eventModel, mongoID } from './eventMongo'
import { serializeProjectRegistration } from './projectQueries'
import {
  findEventSlot,
  formatCompactEventDayLabel,
  formatEventSlotLabel,
} from './eventRegistration'
import { formatAgeGroup } from './eventPayment'

export function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text) && !/^-?\d+(?:\.\d+)?$/.test(text))
    text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export function exportProjectCSV(payload: Payload, event: Event) {
  const cursor = eventModel(payload, 'event-registrations')
    .aggregate([
      { $match: { event: mongoID(payload, 'event-registrations', 'event', event.id) } },
      { $sort: { createdAt: 1, _id: 1 } },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          day: 1,
          slot: 1,
          status: 1,
          donation: 1,
          consumptionAmount: 1,
          ageGroup: 1,
          guests: 1,
          timeOfArrival: 1,
          lastHandledName: 1,
          lastHandledAt: 1,
        },
      },
    ])
    .cursor({ batchSize: 250 })
  const encoder = new TextEncoder()
  let header = false
  const stream = new ReadableStream({
    async pull(controller) {
      if (!header) {
        header = true
        controller.enqueue(
          encoder.encode(
            '\uFEFF' +
              [
                'Nume',
                'Email',
                'Telefon',
                'Zi',
                'Tură',
                'Status',
                'Donație RON',
                'Categorie de vârstă',
                'Consumație RON',
                'Total încasat RON',
                'Însoțitori',
                'Ora sosirii',
                'Ultima modificare de',
                'Ultima modificare la',
              ]
                .map(csvCell)
                .join(',') +
              '\r\n',
          ),
        )
        return
      }
      try {
        const raw = await cursor.next()
        if (!raw) {
          await cursor.close()
          controller.close()
          return
        }
        const row = serializeProjectRegistration(raw)
        const { day, slot } = findEventSlot(event, row.day, row.slot)
        const values = [
          row.name,
          row.email,
          row.phone,
          day?.eventDate ? formatCompactEventDayLabel(day.eventDate) : '',
          slot ? formatEventSlotLabel(slot.startTime, slot.endTime) : '',
          row.status,
          row.donation.toFixed(2),
          formatAgeGroup(row.ageGroup),
          row.consumptionAmount == null ? '' : row.consumptionAmount.toFixed(2),
          row.consumptionAmount == null
            ? ''
            : (
                (Math.round(row.donation * 100) + Math.round(row.consumptionAmount * 100)) /
                100
              ).toFixed(2),
          row.guests,
          row.timeOfArrival || '',
          row.lastHandledName || '',
          row.lastHandledAt || '',
        ]
        controller.enqueue(encoder.encode(values.map(csvCell).join(',') + '\r\n'))
      } catch (error) {
        await cursor.close()
        controller.error(error)
      }
    },
    async cancel() {
      await cursor.close()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(event.slug || 'eveniment').replace(/[^a-z0-9-]/gi, '')}-raport.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
