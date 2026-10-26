import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import SignupForm from '@/app/(frontend)/events/[slug]/SignupForm'
import {
  CheckInDialog,
  WalkInParticipantDialog,
  type ManagedEvent,
  type ManagedRegistration,
} from '@/app/(frontend)/members/projects/ProjectManagerDashboard'
import { getEventSlotAvailability } from '@/utilities/eventRegistration'

const event = {
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
  const [saved, setSaved] = useState('')
  const query = new URLSearchParams(location.search)
  const mode = query.get('mode') ?? 'checkin'
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
      {mode === 'signup' ? (
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
              : registration
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
