import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import SignupForm from '@/app/(frontend)/events/[slug]/SignupForm'
import ProjectManagerDashboard, {
  CheckIn,
  CheckInDialog,
  WalkInParticipantDialog,
  type ManagedEvent,
  type ManagedRegistration,
} from '@/app/(frontend)/members/projects/ProjectManagerDashboard'
import { getEventSlotAvailability } from '@/utilities/eventRegistration'

const baseEvent = {
  id: 'event',
  name: 'Eveniment Triumph',
  slug: 'eveniment',
  donation: 30,
  minimumConsumation: 20,
  days: [
    {
      id: 'day',
      eventDate: '2099-06-21',
      label: '21 iunie 2099',
      slots: [
        {
          id: 'slot',
          label: '10:00-12:00',
          startTime: '2099-06-21T07:00:00Z',
          endTime: '2099-06-21T09:00:00Z',
          capacity: 100,
        },
      ],
    },
  ],
} as ManagedEvent
const registration = {
  id: 'reg',
  name: 'Ana Popescu — nume lung pentru verificarea afișării pe mobil',
  email: 'ana@example.com',
  phone: '',
  day: 'day',
  slot: 'slot',
  guests: 1,
  donation: 60,
  ageGroup: null,
  consumptionAmount: null,
  status: 'registered',
  questions: 'Detalii participant',
} as ManagedRegistration

function App() {
  const query = new URLSearchParams(location.search)
  const event = {
    ...baseEvent,
    days: baseEvent.days.map((day) => ({
      ...day,
      slots: day.slots.map((slot) => ({
        ...slot,
        capacity: Number(query.get('slot-capacity') ?? slot.capacity),
      })),
    })),
    ...(query.has('zero-minimums') ? { donation: 0, minimumConsumation: 0 } : {}),
    ...(query.has('decimal-minimums') ? { donation: 0.1, minimumConsumation: 0.2 } : {}),
  }
  const mode = query.get('mode') ?? 'checkin'
  const [saved, setSaved] = useState('')
  const [listRegistrations, setListRegistrations] = useState<ManagedRegistration[]>(
    query.has('empty-list')
      ? []
      : [
          {
            ...registration,
            id: 'zoe',
            name: 'Zoe',
            email: 'zoe@example.com',
            donation: 10,
            guests: Number(query.get('present-guests') ?? 9),
            status: query.has('empty-attendance') ? 'registered' : 'present',
          },
          {
            ...registration,
            id: 'stefan',
            name: 'Ștefan',
            email: 'stefan@example.com',
            donation: 2,
            guests: 2,
            status: 'absent',
            day: 'earlier',
            slot: 'early',
          },
          {
            ...registration,
            id: 'ana',
            name: query.has('long-name') ? registration.name : 'Ana',
            email: 'ana@example.com',
            donation: 100,
            guests: 0,
            status: 'registered',
            slot: 'later',
          },
          { ...registration, id: 'cancelled', name: 'Anulat', status: 'cancelled' },
          ...Array.from(
            { length: Math.max(0, Math.min(500, Number(query.get('count') ?? 3)) - 3) },
            (_, index) => ({
              ...registration,
              id: `bulk-${index + 4}`,
              name: `Participant ${String(index + 4).padStart(3, '0')}`,
              email:
                query.has('cross-page-duplicate') && index + 4 === 205
                  ? 'zoe@example.com'
                  : `participant${index + 4}@example.com`,
              donation: 0,
              guests: 0,
            }),
          ),
          ...(query.has('cleanup')
            ? [
                {
                  ...registration,
                  id: 'unpaid-duplicate',
                  name: 'Zoe duplicat neplătit',
                  email: 'zoe@example.com',
                  donation: 0,
                  guests: 0,
                },
              ]
            : []),
          ...(query.has('warnings')
            ? [
                {
                  ...registration,
                  id: 'duplicate',
                  name: 'Zoe duplicat',
                  email: ' ZOE@example.com ',
                  donation: 40,
                  guests: 0,
                  status: 'registered' as const,
                },
                {
                  ...registration,
                  id: 'unpaid',
                  name: 'Participant fără donație',
                  email: 'unpaid@example.com',
                  donation: 0,
                  guests: 0,
                  status: 'registered' as const,
                },
              ]
            : []),
        ],
  )
  async function save(value: unknown) {
    if (query.has('fail')) throw new Error('Totalul minim s-a schimbat. Verifică suma încasată.')
    setSaved(JSON.stringify(value))
  }
  const publicEvent = {
    ...event,
    donation: '30',
    participantsCount: 0,
    totalDonation: 0,
    capacity: 100,
  }
  return (
    <>
      <output data-testid="saved" style={{ position: 'fixed', top: 0, zIndex: 200 }}>
        {saved}
      </output>
      {mode === 'metrics' ? (
        <div className="metric-fixture">
          <ProjectManagerDashboard
            userName="Tester"
            events={[
              {
                ...event,
                accessLevel: 'manager',
                checkInMembers: [],
                location: null,
                startTime: null,
                endTime: null,
                registrations: listRegistrations.map((row) => ({
                  ...row,
                  ageGroup: 'adult',
                  createdAt: '2026-10-27T12:00:00Z',
                  ...(row.id === 'zoe' ? { donation: 12345 } : {}),
                })),
              },
            ]}
          />
        </div>
      ) : mode === 'list' ? (
        <main className="mx-auto max-w-7xl p-4">
          <CheckIn
            event={{
              ...event,
              remote: query.has('remote'),
              checkInMembers: [
                { id: 'staff', name: 'Maria Voluntar', email: 'staff@example.com', role: 'active' },
              ],
              donation: query.has('warnings') ? 30 : 0,
              registrations: listRegistrations,
              days: [
                {
                  ...event.days[0],
                  slots: [
                    ...event.days[0].slots,
                    {
                      ...event.days[0].slots[0],
                      id: 'later',
                      startTime: '2099-06-21T09:00:00Z',
                      endTime: '2099-06-21T11:00:00Z',
                    },
                  ],
                },
                {
                  id: 'earlier',
                  eventDate: '2099-06-20',
                  label: '20 iunie 2099',
                  slots: [
                    {
                      ...event.days[0].slots[0],
                      id: 'early',
                      startTime: '2099-06-20T15:00:00Z',
                      endTime: '2099-06-20T17:00:00Z',
                    },
                  ],
                },
              ],
            }}
            canManageEvent={query.has('manager')}
            showPersonalData={!query.has('private')}
            onTogglePersonalData={() => {}}
            onRegistrationCreate={(created) => setListRegistrations((rows) => [...rows, created])}
            onRegistrationUpdate={(updated) =>
              setListRegistrations((rows) =>
                rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
              )
            }
          />
        </main>
      ) : mode === 'signup' ? (
        <main className="mx-auto max-w-3xl p-4">
          <SignupForm
            event={publicEvent}
            accentColor="#007fa3"
            backgroundColor="#ffffff"
            cardColor="#ffffff"
            mode="inline"
            slotAvailability={getEventSlotAvailability({ event: publicEvent, registrations: [] })}
          />
        </main>
      ) : mode === 'walkin' ? (
        <WalkInParticipantDialog event={event} onClose={() => {}} saving={false} onSave={save} />
      ) : (
        <CheckInDialog
          managedEvent={event}
          registration={
            query.has('split')
              ? { ...registration, ageGroup: 'adult', consumptionAmount: 40 }
              : {
                  ...registration,
                  ...(query.has('age') ? { ageGroup: 'adult' as const } : {}),
                  ...(query.has('unpaid') ? { donation: 0 } : {}),
                }
          }
          canDelete={false}
          deleting={false}
          onDelete={() => {}}
          onClose={() => {}}
          onSave={save}
          saving={false}
          showPersonalData
        />
      )}
    </>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
