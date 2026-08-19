'use server'

import { User } from "@/payload-types"
import payloadConfig from "@payload-config"
import { getPayload } from "payload"
import { revalidatePath } from 'next/cache'
export async function onCodeScanned(url: string, timestamp: number, scannerUser: string) {
    const payload = await getPayload({config: payloadConfig})

    const urlParams = new URL(url).searchParams
    const id = urlParams.get('member')
    console.log(id)
    if(!id)
        return {err: 'Cod invalid!'};
    const user = await payload.findByID({
        collection: 'users',
        id,
    })
    const meeting = await getTodayMeeting()
    if(!meeting)
        return {err: 'Nu exista sedinta azi!'};

    const existingAttendance = await payload.find({
        collection: 'attendance',
        where: {
            and: [
                { 
                    meeting: {
                        equals: meeting
                    }
                },
                {
                    member: {
                        equals: user
                    }
                }
            ]
           
        }
    })

    const deletedMotivationsDocs = await payload.delete({
        collection: 'absence-motivations',
        where: {
            and: [
                { 
                    meeting: {
                        equals: meeting
                    }
                },
                {
                    member: {
                        equals: user
                    }
                }
            ]
        }
    })
    let err;
    if(deletedMotivationsDocs.docs.length != 0)
        err = 'Motivare stersa'

    if(existingAttendance.totalDocs != 0)
        return {err: 'Esti deja prezent la aceasta sedinta!'};

    await payload.create({
        collection: 'attendance',
        data: {
            meeting: meeting.id,
            member: user.id,
            status: 'present',
            issuedBy: scannerUser
        }
    })
    revalidatePath('/members/check-in')
    return {user: user, err, meeting}
}

export async function getTodayMeeting(includeAttendance=false, includeMotivations=false) {
    const payload = await getPayload({config: payloadConfig})
    const dayStart = new Date()
    const dayEnd = new Date()

    dayStart.setUTCHours(0,0,0,0)
    dayEnd.setUTCHours(24,0,0,0)
    
      const meetingsDocs = await payload.find({
        collection: 'meetings',
        where: {
        meetingDate: {
            greater_than: dayStart.toISOString(),
            less_than: dayEnd.toISOString(),
        },
        },
        sort: 'meetingDate',
        limit: 1,
        depth: 2,
        joins: {
            attendance: includeAttendance && {count: true},
            absenceMotivations: includeMotivations && {count: true}
        }
    })

    if(meetingsDocs.totalDocs == 0) {
        return undefined
    } 
    return meetingsDocs.docs[0]
}
