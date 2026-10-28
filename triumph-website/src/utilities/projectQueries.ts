import type { Payload, PayloadRequest } from 'payload'
import type { PipelineStage } from 'mongoose'
import type { Event, EventRegistration, User } from '@/payload-types'
import type { ManagedRegistration } from '@/app/(frontend)/members/projects/ProjectManagerDashboard'
import type {
  ProjectMetrics,
  RemoteProjectData,
  SlotSummary,
  ShiftOperation,
  ClosingSummary,
} from './eventOperationsTypes'
import {
  eventAggregate,
  mongoID,
  peopleExpression,
  donationBaniExpression,
  consumptionBaniExpression,
} from './eventMongo'
import { getDuplicateRegistrationReasons, isDonationBelowMinimum } from './eventCheckInWarnings'
import { checkInSearchPattern, checkInSearchTerms } from './eventCheckInSearch'
import { canManageEvent, getRelationshipID } from './eventAccess'
import { serializeManagedEvent } from './projectSerialization'
import { formatCompactEventDayLabel, formatEventSlotLabel } from './eventRegistration'

const identities = new Map<string, { revision: string; reasons: Map<string, string[]> }>()
export function invalidateProjectIdentities(event: string) {
  identities.delete(event)
}

export async function projectDuplicateReasons(payload: Payload, event: Event) {
  const revision = `${event.updatedAt}:${event.registrationIdentityRevision || 0}`
  const cached = identities.get(event.id)
  if (cached?.revision === revision) return cached.reasons
  const rows = await payload.find({
    collection: 'event-registrations',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    select: { name: true, email: true, phone: true, status: true },
    where: { and: [{ event: { equals: event.id } }, { status: { not_equals: 'cancelled' } }] },
  })
  const reasons = getDuplicateRegistrationReasons(rows.docs)
  if (identities.size >= 8) identities.delete(identities.keys().next().value!)
  identities.set(event.id, { revision, reasons })
  return reasons
}

const rowProjection = {
  _id: 1,
  name: 1,
  email: 1,
  phone: 1,
  ageGroup: 1,
  guests: 1,
  donation: 1,
  consumptionAmount: 1,
  status: 1,
  day: 1,
  slot: 1,
  timeOfArrival: 1,
  createdAt: 1,
  operationVersion: 1,
  lastHandledName: 1,
  lastHandledAt: 1,
}
const iso = (value: unknown) =>
  value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : ''
export function serializeProjectRegistration(row: Record<string, unknown>): ManagedRegistration {
  return {
    id: String(row.id ?? row._id),
    name: String(row.name || row.email || 'Participant fără nume'),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    day: String(row.day || ''),
    slot: String(row.slot || ''),
    guests: Number(row.guests || 0),
    donation: Number(row.donation || 0),
    consumptionAmount: row.consumptionAmount == null ? null : Number(row.consumptionAmount),
    ageGroup: row.ageGroup === 'minor' || row.ageGroup === 'adult' ? row.ageGroup : null,
    status: (row.status || 'registered') as EventRegistration['status'],
    createdAt: iso(row.createdAt),
    timeOfArrival: iso(row.timeOfArrival) || null,
    questions: typeof row.questions === 'string' ? row.questions : null,
    operationVersion: Number(row.operationVersion || 0),
    lastHandledName: String(row.lastHandledName || ''),
    lastHandledAt: iso(row.lastHandledAt) || null,
  }
}

export async function projectSummary(payload: Payload, event: Event, req?: PayloadRequest) {
  const raw = await eventAggregate<Record<string, number> & { _id: { day: string; slot: string } }>(
    payload,
    [
      {
        $match: {
          event: mongoID(payload, 'event-registrations', 'event', event.id),
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { day: '$day', slot: '$slot' },
          activeCount: { $sum: 1 },
          reservedPeople: { $sum: peopleExpression },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          presentPeople: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, peopleExpression, 0] },
          },
          pendingPeople: {
            $sum: { $cond: [{ $eq: ['$status', 'registered'] }, peopleExpression, 0] },
          },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'registered'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          donationBani: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, donationBaniExpression, 0] },
          },
          consumptionBani: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, consumptionBaniExpression, 0] },
          },
          legacyConsumptionCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'present'] },
                    { $eq: [{ $ifNull: ['$consumptionAmount', null] }, null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          missingDonations: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'present'] },
                    { $lte: [{ $ifNull: ['$donation', 0] }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ],
    req,
  )
  const configured = (event.days ?? []).flatMap((day) =>
    (day.slots ?? [])
      .filter((slot) => slot.id)
      .map((slot) => ({ day: day.id!, slot: slot.id!, capacity: Math.max(0, slot.capacity || 0) })),
  )
  const slots: SlotSummary[] = configured.map((position) => {
    const row = raw.find((row) => row._id.day === position.day && row._id.slot === position.slot)
    return {
      ...position,
      activeCount: row?.activeCount || 0,
      reservedPeople: row?.reservedPeople || 0,
      presentCount: row?.presentCount || 0,
      presentPeople: row?.presentPeople || 0,
      pendingPeople: row?.pendingPeople || 0,
      absentCount: row?.absentCount || 0,
      donation: (row?.donationBani || 0) / 100,
      consumptionAmount: (row?.consumptionBani || 0) / 100,
      totalCollected: ((row?.donationBani || 0) + (row?.consumptionBani || 0)) / 100,
      legacyConsumptionCount: row?.legacyConsumptionCount || 0,
    }
  })
  const sum = (key: string) => raw.reduce((total, row) => total + Number(row[key] || 0), 0)
  const activeCount = sum('activeCount'),
    presentCount = sum('presentCount'),
    absentCount = sum('absentCount'),
    unprocessed = sum('pendingCount')
  const activePeople = sum('reservedPeople'),
    peoplePresent = sum('presentPeople'),
    companions = peoplePresent - presentCount
  const capacity = configured.reduce((total, slot) => total + slot.capacity, 0),
    funds = sum('donationBani') / 100,
    consumptionAmount = sum('consumptionBani') / 100
  const percent = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0)
  const top = [...slots].sort((a, b) => b.presentPeople - a.presentPeople)[0]
  const topDay = event.days?.find((day) => day.id === top?.day),
    topSlot = topDay?.slots?.find((slot) => slot.id === top?.slot)
  const metrics: ProjectMetrics = {
    activeCount,
    presentCount,
    absentCount,
    activePeople,
    unprocessed,
    capacity,
    funds,
    consumptionAmount,
    totalCollected: (sum('donationBani') + sum('consumptionBani')) / 100,
    legacyConsumptionCount: sum('legacyConsumptionCount'),
    companions,
    peoplePresent,
    attendanceRate: percent(presentCount, presentCount + absentCount),
    averageDonation: presentCount ? funds / presentCount : 0,
    averageGroupSize: presentCount ? peoplePresent / presentCount : 0,
    checkInProgress: percent(presentCount + absentCount, activeCount),
    donationPerPerson: peoplePresent ? funds / peoplePresent : 0,
    missingDonations: sum('missingDonations'),
    noShowRate: percent(absentCount, presentCount + absentCount),
    occupancy: percent(activePeople, capacity),
    remainingCapacity: Math.max(0, capacity - activePeople),
    topSlotLabel:
      top && top.presentPeople > 0 && topDay?.eventDate && topSlot
        ? `${formatCompactEventDayLabel(topDay.eventDate)}, ${formatEventSlotLabel(topSlot.startTime, topSlot.endTime)}`
        : '—',
    days: (event.days ?? [])
      .filter((day) => day.id && day.eventDate)
      .map((day) => {
        const rows = slots.filter((slot) => slot.day === day.id)
        const donationBani = raw
          .filter((row) => row._id.day === day.id)
          .reduce((total, row) => total + row.donationBani, 0)
        const consumptionBani = raw
          .filter((row) => row._id.day === day.id)
          .reduce((total, row) => total + row.consumptionBani, 0)
        return {
          id: day.id!,
          label: formatCompactEventDayLabel(day.eventDate!),
          attendees: rows.reduce((total, slot) => total + slot.presentPeople, 0),
          funds: donationBani / 100,
          consumptionAmount: consumptionBani / 100,
          totalCollected: (donationBani + consumptionBani) / 100,
        }
      }),
  }
  return { slots, metrics }
}

export async function projectShiftOperations(
  payload: Payload,
  event: Event,
  user: User,
): Promise<ShiftOperation[]> {
  const shifts = await payload.find({
    collection: 'event-shifts',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    where: { event: { equals: event.id } },
  })
  const closingIds = shifts.docs.flatMap((shift) =>
    shift.closing ? [getRelationshipID(shift.closing)] : [],
  )
  const closings = closingIds.length
    ? await payload.find({
        collection: 'event-closings',
        depth: 0,
        limit: 0,
        pagination: false,
        overrideAccess: true,
        ...(canManageEvent(event, user) ? {} : { select: { actorName: true, createdAt: true } }),
        where: { and: [{ event: { equals: event.id } }, { id: { in: closingIds } }] },
      })
    : { docs: [] }
  const members = new Map(
    serializeManagedEvent(event, [], user).checkInMembers.map((member) => [member.id, member.name]),
  )
  return shifts.docs.map((shift) => ({
    id: shift.id,
    day: shift.day,
    slot: shift.slot,
    handoverNote: shift.handoverNote || '',
    updatedBy: shift.updatedBy || '',
    updatedAt: shift.updatedAt,
    members: (shift.members ?? []).map((member) => ({
      id: getRelationshipID(member),
      name: members.get(getRelationshipID(member)) || 'Membru',
    })),
    closing: (closings.docs.find((closing) => closing.id === getRelationshipID(shift.closing)) ??
      null) as ClosingSummary | null,
  }))
}

export async function queryProjectPage(
  payload: Payload,
  event: Event,
  user: User,
  params: URLSearchParams,
): Promise<RemoteProjectData> {
  const requestedPage = Math.max(
    1,
    Math.min(1_000_000, Math.floor(Number(params.get('page')) || 1)),
  )
  const search = (params.get('q') || '').trim().slice(0, 160)
  const shift = params.get('shift') || 'all',
    status = params.get('status') || 'all'
  const sort = params.get('sort') || '',
    direction = params.get('direction') === 'descending' ? -1 : 1
  const reasons = await projectDuplicateReasons(payload, event)
  const where: Record<string, unknown> = {
    event: mongoID(payload, 'event-registrations', 'event', event.id),
    status: { $ne: 'cancelled' },
  }
  const [day, slot] = shift.split(':')
  if (shift !== 'all') {
    where.day = day
    where.slot = slot
  }
  if (['registered', 'present', 'absent'].includes(status)) where.status = status
  const belowMinimum = {
    $and: [
      { $eq: ['$status', 'present'] },
      {
        $lt: [
          donationBaniExpression,
          { $multiply: [Math.round(Number(event.donation || 0) * 100), peopleExpression] },
        ],
      },
    ],
  }
  if (status === 'warnings')
    where.$or = [
      {
        _id: {
          $in: [...reasons.keys()].map((id) => mongoID(payload, 'event-registrations', '_id', id)),
        },
      },
      { $expr: belowMinimum },
    ]
  if (search) {
    where.$and = checkInSearchTerms(search).map((term) => {
      const regex = checkInSearchPattern(term)
      return {
        $or: ['name', 'email', 'phone'].map((field) => ({
          [field]: { $regex: regex, $options: 'i' },
        })),
      }
    })
  }
  const slotKeys = (event.days ?? []).flatMap((day) =>
    (day.slots ?? []).map((slot) => `${day.id}:${slot.id}`),
  )
  const pipeline: PipelineStage[] = [
    { $match: where },
    {
      $set: {
        _people: peopleExpression,
        _slotIndex: { $indexOfArray: [slotKeys, { $concat: ['$day', ':', '$slot'] }] },
        _statusIndex: { $indexOfArray: [['absent', 'registered', 'present'], '$status'] },
      },
    },
    { $set: { _slotMissing: { $cond: [{ $lt: ['$_slotIndex', 0] }, 1, 0] } } },
  ]
  const sortFields: Record<string, 1 | -1> =
    sort === 'slot'
      ? { _slotMissing: 1, _slotIndex: direction, _id: 1 }
      : {
          [(
            {
              participant: 'name',
              group: '_people',
              status: '_statusIndex',
              donation: 'donation',
            } as Record<string, string>
          )[sort] || 'createdAt']: sort ? direction : 1,
          _id: 1,
        }
  const result = await eventAggregate<{
    docs: Record<string, unknown>[]
    total: { count: number }[]
  }>(payload, [
    ...pipeline,
    { $sort: sortFields },
    {
      $facet: {
        docs: [
          { $skip: (requestedPage - 1) * 100 },
          { $limit: 100 },
          { $project: { ...rowProjection, questions: 1 } },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ])
  const totalDocs = result[0]?.total[0]?.count || 0,
    totalPages = Math.max(1, Math.ceil(totalDocs / 100))
  const page = Math.min(requestedPage, totalPages)
  if (page !== requestedPage) {
    const adjusted = new URLSearchParams(params)
    adjusted.set('page', String(page))
    return queryProjectPage(payload, event, user, adjusted)
  }
  const registrations = (result[0]?.docs ?? []).map(serializeProjectRegistration)
  const [{ slots, metrics }, recent, shifts] = await Promise.all([
    projectSummary(payload, event),
    eventAggregate<Record<string, unknown>>(payload, [
      { $match: { event: where.event, status: { $ne: 'cancelled' } } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: 6 },
      { $project: rowProjection },
    ]),
    projectShiftOperations(payload, event, user),
  ])
  return {
    eventId: event.id,
    revision: Number(event.registrationRevision || 0),
    viewerId: user.id,
    event: { ...serializeManagedEvent(event, [], user), remote: true },
    page,
    totalDocs,
    totalPages,
    registrations,
    metrics,
    slots,
    recentRegistrations: recent.map(serializeProjectRegistration),
    shifts,
    warnings: Object.fromEntries(
      registrations.map((row) => [
        row.id,
        {
          duplicateReasons: reasons.get(row.id) ?? [],
          belowMinimum: isDonationBelowMinimum(row, Number(event.donation || 0)),
        },
      ]),
    ),
  }
}
