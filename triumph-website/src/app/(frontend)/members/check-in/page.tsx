import { getPayload, User } from "payload"
import PageClient from "./page.client"
import Scanner from "./scanner"
import payloadConfig from "@payload-config"
import { getPayloadAuthHeaders } from "@/utilities/payloadAuth"
import { redirect } from "next/navigation"
import { Calendar, Clock } from "lucide-react"
import ClockComponent from "./clockComponent"


async function Page() {
      const payload = await getPayload({
         config: payloadConfig,
       })
     
       const me = await payload.auth({
         headers: await getPayloadAuthHeaders(),
       })
     
       if (!me.user) {
         redirect('/members/login')
       }
       // TODO: add a better way to redirect in the case that the user isn't a member of the board
       if (!me.permissions.canAccessAdmin) {
         redirect('/members')
       }
     
    //    const authUser = me.user as User
     
    //    const member = (await payload.findByID({
    //      collection: 'users',
    //      depth: 2,
    //      id: authUser.id,
    //      overrideAccess: false,
    //      user: authUser,
    //    })) as User

    const meeting = await getTodayMeeting(true, true)
    const members = await payload.count({
        collection: 'users',
        where: {
            role: {
                equals: 'active'
            }
        }
    })
    return (
        <div className="h-300 relative">
            <PageClient/>
            <div className="bg-linear-to-t from-transparent to-black h-50 fixed t-0 w-full -z-1"/>
            <div className="flex flex-col p-24 max-w-120">
                <h1>Check-in Membri</h1>
                {meeting && <div className="p-6 bg-card/50 backdrop-blur-xl rounded-xl flex flex-wrap items-center">

                    <h3>Sedința {new Date(meeting.meetingDate).toLocaleDateString('ro-RO')}</h3>


                    <div className="flex-inline w-full">
                        <Clock size='16' className="inline mx-2"/>
                        <span>{new Date(meeting.meetingDate).toLocaleTimeString('ro-RO')}</span>
                    </div>
                   
                   <div className="my-6">
                        <span className="text-4xl font-bold tracking-tighter ">
                            {meeting.attendance?.totalDocs ?? 0} / {members!.totalDocs - (meeting!.absenceMotivations ? meeting!.absenceMotivations!.totalDocs! : 0)}
                        </span>
                        <span className="mx-2">membri activi</span>
                        <div className="text-4xl font-bold tracking-tighter ">
                            {meeting.attendance?.totalDocs ?? 0 / members!.totalDocs - (meeting!.absenceMotivations ? meeting!.absenceMotivations!.totalDocs! : 0)*100}%

                        </div>
                   </div>
                </div>}
                {!meeting && <p>Nu exista intalnire azi!</p>}
                <Scanner user={me.user} meeting={meeting}/>
                
            </div>
            <ClockComponent/>
        </div>
    )

   
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

export default Page