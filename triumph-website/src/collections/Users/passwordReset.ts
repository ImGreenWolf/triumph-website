import type { Payload, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

type PasswordResetPayload = Payload
type PasswordResetUser = Pick<User, 'email' | 'id' | 'clubMail' | 'clubMailPassword' | 'name'>

export type PasswordResetEmailResult = {
  errors: {
    email: string
    id: string
    message: string
  }[]
  sent: {
    email: string
    id: string
  }[]
}

export async function sendPasswordResetEmails(args: {
  payload: Payload
  req: PayloadRequest
  users: PasswordResetUser[]
}): Promise<PasswordResetEmailResult> {
  const result: PasswordResetEmailResult = {
    errors: [],
    sent: [],
  }

  for (const user of args.users) {
    try {
      await args.payload.forgotPassword({
        collection: 'users',
        data: {
          email: user.email,
        },
        overrideAccess: true,
        req: args.req,
      })

      result.sent.push({
        email: user.email,
        id: user.id,
      })
    } catch (error) {
      result.errors.push({
        email: user.email,
        id: user.id,
        message: error instanceof Error ? error.message : 'Password reset email could not be sent.',
      })
    }
  }

  return result
}

async function getActualEmailAccounts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}:2083/execute/Email/list_pops`, {headers: {'Authorization': process.env.CPANEL_AUTH_TOKEN!}})
  if(!res.ok)
  {
    console.log(await res.text())
    return
  }
  const json = await res.json()

  return json.data.map((account: any) => account.email) as string[]
}

async function createActualMailAccount(email: string, password: string) {
  const params = new URLSearchParams()
  params.set('email', email)
  params.set('password', password)
  params.set('quota', '1024')



  const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}:2083/execute/Email/add_pop?${params.toString()}`, {headers: {'Authorization': process.env.CPANEL_AUTH_TOKEN!}})
  if(!res.ok)
  {
    console.log(await res.text())
    return
  }
  const json = await res.json()

  console.log(json)
}


export async function sendMailInstructionMails(args: {
  payload: Payload
  req: PayloadRequest
  users: PasswordResetUser[]
}): Promise<PasswordResetEmailResult> {
  const result: PasswordResetEmailResult = {
    errors: [],
    sent: [],
  }
  const emails = await getActualEmailAccounts()

  for (let user of args.users) {
    const desiredUserMail = user.name!.replaceAll(' ', '.').toLowerCase() + '@interact-triumph.org';
    const desiredUserPassword = user.id.slice(0, 8).split('').map(el => String.fromCharCode(el.charCodeAt(0)+1)).join('')

    try {
      
      if(!emails?.find(email => email == desiredUserMail)) {

        user = (await args.payload.update({
          collection: 'users',
          where: {
            id: {
              equals: user.id
            }
          },
          data: {
            clubMail: desiredUserMail,
            clubMailPassword: desiredUserPassword
          }
        })).docs[0]
      
        
        await createActualMailAccount(desiredUserMail,desiredUserPassword)


        await args.payload.sendEmail({
        to: user.email,
        subject: 'Instrucțiuni Cont de Email Interact Bucureşti Triumph',
        html: 
        `
        <h2>Salut ${user.name?.split(' ')[0]}</h2>
        <div>Contul tau de mail Interact Bucureşti Triumph a fost creat cu succes!</div>
        </br>
        <div>Aici ai informatiile de logare pentru acesta:</div>
        <h3>User: ${user.clubMail}</div>
        Parola: ${user.clubMailPassword}
        </h3>
        <div>Daca nu stii cum sa adaugi un cont extern de mail, aici poți gǎsi <a href='https://interact-triumph.org/posts/instructiuni-logare-mail'>instructiunii de logare</a></div>
        <div>Pentru orice nelamurire, sau dacǎ ai nevoie de ajutor, contacteaza-mǎ pe Whatsapp la numǎrul 0770208183</div>
        `
        })

      } else {
                await args.payload.sendEmail({
        to: user.email,
        subject: 'Instrucțiuni Cont de Email Interact Bucureşti Triumph',
        html: 
        `
        <h2>Salut ${user.name?.split(' ')[0]}</h2>
        <div>Aici ai informatiile de logare pentru contul tau de email Interact Bucureşti Triumph:</div>
        <h3><div>User: ${user.clubMail}</div>
        Parola: ${user.clubMailPassword}
        </h3>
        <div>Daca nu stii cum sa adaugi un cont extern de mail, aici poți gǎsi <a href='https://interact-triumph.org/posts/instructiuni-logare-mail'>instructiunii de logare</a></div>
        <div>Pentru orice nelamurire, sau dacǎ ai nevoie de ajutor, contacteaza-mǎ pe Whatsapp la numǎrul 0770208183</div>
        `
        })
      }
      

      result.sent.push({
        email: user.email,
        id: user.id,
      })
    } catch (error) {
      result.errors.push({
        email: user.email,
        id: user.id,
        message: error instanceof Error ? error.message : 'Password reset email could not be sent.',
      })
    }
  }

  return result
}
