'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface Props {
  postId: string
  initialCount: number
  initialAttending: boolean
  eventTitle: string
  eventContent: string
  eventDate: string | null
  eventLocation: string | null
}

export function EventAttendanceButtons({
  postId,
  initialCount,
  initialAttending,
  eventTitle,
  eventContent,
  eventDate,
  eventLocation,
}: Props) {
  const router = useRouter()
  const [attending, setAttending] = useState(initialAttending)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function handleAttend() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    setLoading(true)
    const wasAttending = attending
    setAttending(!wasAttending)
    setCount(wasAttending ? count - 1 : count + 1)

    try {
      const res = await fetch(`/api/community/posts/${postId}/attend`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setAttending(data.attending)
        setCount(data.count)
      } else {
        setAttending(wasAttending)
        setCount(count)
      }
    } catch {
      setAttending(wasAttending)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  function buildGoogleCalendarUrl() {
    if (!eventDate) return null
    const start = new Date(eventDate)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventTitle,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: eventContent,
      location: eventLocation ?? '',
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  function handleDownloadIcs() {
    if (!eventDate) return
    const start = new Date(eventDate)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BarrioRed//Event//ES',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `UID:${postId}-${start.getTime()}@barriored.co`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventContent.replace(/\n/g, '\\n')}`,
      `LOCATION:${eventLocation ?? ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventTitle.replace(/\s+/g, '-').toLowerCase()}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const googleUrl = buildGoogleCalendarUrl()

  return (
    <div className="flex flex-col gap-2">
      {count > 0 && (
        <p className="font-mono text-[10px] tracking-widest uppercase font-bold opacity-70">
          {count} {count === 1 ? 'persona va' : 'personas van'} a ir
        </p>
      )}

      <button
        onClick={handleAttend}
        disabled={loading}
        className={`w-full inline-flex items-center justify-center gap-2 border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          attending ? 'bg-white text-black' : 'bg-primary text-white'
        }`}
      >
        <><Check className="w-3 h-3" /> {attending ? 'YA VOY' : 'VOY A IR'}</>
      </button>

      {eventDate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full inline-flex items-center justify-center gap-2 bg-black text-white border-2 border-black shadow-[2px_2px_0_black] font-heading font-black uppercase tracking-widest text-xs px-4 py-2.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_black] transition-all cursor-pointer">
              <CalendarDays className="w-3 h-3" />
              AGREGAR A CALENDARIO
              <ChevronDown className="w-3 h-3 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-2 border-black rounded-none shadow-[4px_4px_0_black] bg-white min-w-48"
          >
            {googleUrl && (
              <DropdownMenuItem asChild>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-heading font-black uppercase tracking-widest text-xs cursor-pointer px-4 py-2.5"
                >
                  Google Calendar
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDownloadIcs}
              className="font-heading font-black uppercase tracking-widest text-xs cursor-pointer px-4 py-2.5"
            >
              Descargar .ics (Apple / Outlook)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
