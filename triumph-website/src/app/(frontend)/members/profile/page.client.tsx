'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import {
  AlertCircle,
  ArrowLeft,
  Cake,
  CalendarDays,
  Camera,
  CheckCircle2,
  ImageIcon,
  Mail,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { Media, User } from '@/payload-types'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { getMediaUrl } from '@/utilities/getMediaUrl'

type UploadResource = Media | string | null | undefined

type ProfileMember = User & {
  birthday?: string | null
  birthdayConfirmed?: boolean | null
  birthdayStoryConsent?: boolean | null
  birthdayStoryImage?: UploadResource
  profilePicture?: UploadResource
}

type MessageState = {
  text: string
  type: 'error' | 'success'
}

const roleLabels: Record<string, string> = {
  active: 'Active Member',
  aspirer: 'Aspiring Member',
  'hr-director': 'HR Director',
  president: 'President',
  'pr-director': 'PR Director',
  secretary: 'Secretary',
  tresoursier: 'Treasurer',
}

const fileInputClassName =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-[#0f172c] shadow-sm transition hover:bg-white/90 focus-within:outline-none focus-within:ring-4 focus-within:ring-white/20'

const PageClient: React.FC<{ member: ProfileMember }> = ({ member }) => {
  const router = useRouter()
  const { setHeaderTheme } = useHeaderTheme()

  const [profile, setProfile] = useState<ProfileMember>(member)
  const [birthday, setBirthday] = useState(toDateInputValue(member.birthday))
  const [birthdayConfirmed, setBirthdayConfirmed] = useState(false)
  const [birthdayStoryConsent, setBirthdayStoryConsent] = useState(
    Boolean(member.birthdayStoryConsent),
  )
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [birthdayStoryImageFile, setBirthdayStoryImageFile] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState(
    getMediaPreview(member.profilePicture),
  )
  const [birthdayStoryPreview, setBirthdayStoryPreview] = useState(
    getMediaPreview(member.birthdayStoryImage),
  )
  const [message, setMessage] = useState<MessageState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const hasBirthday = Boolean(profile.birthday)

  const details = useMemo(
    () => [
      {
        icon: Mail,
        label: 'Email address',
        value: profile.email,
      },
      {
        icon: UserRound,
        label: 'Name',
        value: profile.name || profile.email,
      },
      {
        icon: ShieldCheck,
        label: 'Role',
        value: roleLabels[profile.role] || profile.role,
      },
      {
        icon: CalendarDays,
        label: 'Join date',
        value: formatLongDate(profile.joinedAt),
      },
      {
        icon: Cake,
        label: 'Birthday',
        value: profile.birthday ? formatDateOnly(profile.birthday) : 'Not set yet',
      },
    ],
    [profile],
  )

  useEffect(() => {
    setHeaderTheme('light')
  }, [setHeaderTheme])

  useEffect(() => {
    return () => {
      revokeBlobUrl(profilePicturePreview)
    }
  }, [profilePicturePreview])

  useEffect(() => {
    return () => {
      revokeBlobUrl(birthdayStoryPreview)
    }
  }, [birthdayStoryPreview])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('birthdayStoryConsent', String(birthdayStoryConsent))

      if (!hasBirthday && birthday) {
        formData.append('birthday', birthday)
        formData.append('birthdayConfirmed', String(birthdayConfirmed))
      }

      if (profilePictureFile) {
        formData.append('profilePicture', profilePictureFile)
      }

      if (birthdayStoryImageFile) {
        formData.append('birthdayStoryImage', birthdayStoryImageFile)
      }

      const response = await fetch('/members/profile/update', {
        body: formData,
        credentials: 'include',
        method: 'POST',
      })

      const data = (await response.json().catch(() => ({}))) as {
        message?: string
        user?: ProfileMember
      }

      if (!response.ok || !data.user) {
        throw new Error(data.message || 'Profile update failed.')
      }

      const updatedProfile = data.user
      setProfile(updatedProfile)
      setBirthday(toDateInputValue(updatedProfile.birthday))
      setBirthdayConfirmed(false)
      setBirthdayStoryConsent(Boolean(updatedProfile.birthdayStoryConsent))
      setProfilePictureFile(null)
      setBirthdayStoryImageFile(null)
      setProfilePicturePreview(getMediaPreview(updatedProfile.profilePicture))
      setBirthdayStoryPreview(getMediaPreview(updatedProfile.birthdayStoryImage))
      setMessage({ text: 'Profile saved.', type: 'success' })
      router.refresh()
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Profile update failed.',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleImageSelection(
    file: File | undefined,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string>>,
  ) {
    setMessage(null)

    if (!file) {
      setFile(null)
      return
    }

    if (file.type && !file.type.startsWith('image/')) {
      setMessage({ text: 'Only image uploads are allowed.', type: 'error' })
      return
    }

    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="halftone-background min-h-screen bg-[#0f172c] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[url('/scren_texture.svg')] opacity-[0.08]" />
        <div className="relative mx-auto max-w-7xl">
          <Link
            className="mb-8 inline-flex h-10 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
            href="/members"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-[#00a2e0]">Member Profile</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                {profile.name || profile.email}
              </h1>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-white/15 bg-white/10 p-4">
              <ProfileImage preview={profilePicturePreview} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile.name || profile.email}</p>
                <p className="mt-1 text-sm text-white/65">
                  {roleLabels[profile.role] || profile.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-8">
        <section className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-[#00a2e0]/20 text-[#00a2e0]">
              <UserRound className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Details</h2>
            </div>
          </div>

          <div className="grid gap-3">
            {details.map((item) => (
              <div
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4"
                key={item.label}
              >
                <div className="flex size-9 items-center justify-center rounded-md bg-white/10 text-white/75">
                  <item.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-white/45">{item.label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <form
          className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10"
          onSubmit={handleSubmit}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-[#f7a81b]/20 text-[#f7a81b]">
              <Save className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Profile Settings</h2>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ProfileImage preview={profilePicturePreview} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Profile picture</p>
                </div>
                <label className={fileInputClassName} htmlFor="profilePicture">
                  <Camera className="size-4" />
                  Upload
                  <input
                    accept="image/*"
                    className="sr-only"
                    id="profilePicture"
                    onChange={(event) =>
                      handleImageSelection(
                        event.target.files?.[0],
                        setProfilePictureFile,
                        setProfilePicturePreview,
                      )
                    }
                    type="file"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 rounded-md border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-white/10 text-white/75">
                  <Cake className="size-4" />
                </div>
                <div>
                  <p className="font-semibold">Birthday</p>
                  <p className="text-sm text-white/60">
                    {hasBirthday ? 'Saved birthday' : 'One-time birthday confirmation'}
                  </p>
                </div>
              </div>

              {hasBirthday ? (
                <div className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold">
                  {formatDateOnly(profile.birthday)}
                </div>
              ) : (
                <div className="grid gap-3">
                  <Input
                    className="h-11 border-white/15 bg-white text-[#0f172c]"
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setBirthday(event.target.value)}
                    type="date"
                    value={birthday}
                  />
                  <label
                    className="grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] gap-3 text-sm leading-5 text-white/75"
                    htmlFor="birthdayConfirmed"
                  >
                    <Checkbox
                      checked={birthdayConfirmed}
                      className="mt-0.5 border-white/30 bg-white/10 data-[state=checked]:border-[#00a2e0] data-[state=checked]:bg-[#00a2e0]"
                      id="birthdayConfirmed"
                      onCheckedChange={(checked) => setBirthdayConfirmed(checked === true)}
                    />
                    <span>I confirm this birthday is correct and can only be set once.</span>
                  </label>
                </div>
              )}
            </div>

            <div className="grid gap-4 rounded-md border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-white/10 text-white/75">
                  <ImageIcon className="size-4" />
                </div>
                <div>
                  <p className="font-semibold">Birthday Story</p>
                  <p className="text-sm text-white/60">Social media story image</p>
                </div>
              </div>

              <label
                className="grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] gap-3 text-sm leading-5 text-white/75"
                htmlFor="birthdayStoryConsent"
              >
                <Checkbox
                  checked={birthdayStoryConsent}
                  className="mt-0.5 border-white/30 bg-white/10 data-[state=checked]:border-[#00a2e0] data-[state=checked]:bg-[#00a2e0]"
                  id="birthdayStoryConsent"
                  onCheckedChange={(checked) => setBirthdayStoryConsent(checked === true)}
                />
                <span>Allow the club to use my birthday image in social media stories.</span>
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="aspect-[9/16] w-full max-w-40 overflow-hidden rounded-md border border-white/10 bg-white/10">
                  {birthdayStoryPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={birthdayStoryPreview} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/45">
                      <ImageIcon className="size-8" />
                    </div>
                  )}
                </div>

                <label className={fileInputClassName} htmlFor="birthdayStoryImage">
                  <Upload className="size-4" />
                  Upload story image
                  <input
                    accept="image/*"
                    className="sr-only"
                    id="birthdayStoryImage"
                    onChange={(event) =>
                      handleImageSelection(
                        event.target.files?.[0],
                        setBirthdayStoryImageFile,
                        setBirthdayStoryPreview,
                      )
                    }
                    type="file"
                  />
                </label>
              </div>
            </div>

            {message && (
              <div
                className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
                  message.type === 'success'
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                    : 'border-red-300/30 bg-red-400/10 text-red-100'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <Button
              className="h-11 bg-white text-[#0f172c] hover:bg-white/90"
              disabled={isSaving}
              type="submit"
            >
              <Save className="size-4" />
              {isSaving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

function ProfileImage(props: { preview: string }) {
  const { preview } = props

  return (
    <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-full w-full object-cover" src={preview} />
      ) : (
        <UserRound className="size-10 text-white/45" />
      )}
    </div>
  )
}

function getMediaPreview(resource: UploadResource) {
  if (!resource || typeof resource === 'string') {
    return ''
  }

  return getMediaUrl(resource.url, resource.updatedAt)
}

function revokeBlobUrl(value: string) {
  if (value.startsWith('blob:')) {
    URL.revokeObjectURL(value)
  }
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

function formatDateOnly(value?: string | null) {
  const dateValue = toDateInputValue(value)
  if (!dateValue) return 'Not set yet'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${dateValue}T00:00:00.000Z`))
}

function formatLongDate(value?: string | null) {
  if (!value) return 'Not set'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
  }).format(date)
}

export default PageClient
