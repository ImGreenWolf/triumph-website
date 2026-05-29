'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'
import { Calendar, MapPin, Users, Award, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Event } from '@/payload-types'
import { Media } from '../Media'

interface LocationType {
  coordinates?: {
    lat: number
    lng: number
  }
  description?: string
  formattedAddress?: string
  name?: string
  placeId?: string
  photos?: string[]
  rating?: number
  viewport?: {
    northeast: { lat: number; lng: number }
    southwest: { lat: number; lng: number }
  }
}




function getTextColor(hexString: string) {
  if(!hexString) 
    return undefined;
  const hex = hexString[0] == '#' ? hexString.substring(1) : hexString;

  const avg = (parseInt(hex.substring(0,2), 16) + parseInt(hex.substring(2,4), 16) + parseInt(hex.substring(5,6), 16))/3
  return avg > 255/2 ? '#000000' : '#ffffffff'
}

// Helper function to format location for display
const formatLocation = (location: LocationType | string | null | undefined): string => {
  if (!location) return ''
  
  // If it's a string, return it as is
  if (typeof location === 'string') return location
  
  // If it's an object with formattedAddress, use that
  if (location.formattedAddress) return location.formattedAddress
  
  // If it has name, use that
  if (location.name) return location.name
  
  // If it has description, use that
  if (location.description) return location.description
  
  // Fallback
  return 'Location TBD'
}

// Helper to get location display components
const getLocationDisplay = (location: LocationType | string | null | undefined) => {
  if (!location) return null
  
  if (typeof location === 'string') {
    return location
  }
  
  // For object locations, prioritize formattedAddress or name
  return location.formattedAddress || location.name || location.description || 'Location TBD'
}

interface EventTimelineProps {
  layout?: 'horizontal' | 'vertical'
  limit?: number
  showPastYears?: boolean
  accentColor?: string
  title?: string
  subtitle?: string
  showStatistics?: boolean
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  layout = 'vertical',
  limit = 10,
  showPastYears = true,
  accentColor = '#0194ce',
  title = 'Our Impact',
  subtitle = '',
  showStatistics = true,
}) => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompletedEvents = async () => {
      try {
        setLoading(true)
        
        // Get current date
        const now = new Date()
        
        // Fetch all events
        const response = await fetch('/api/events?depth=1&limit=100')
        const data = await response.json()
        
        if (!response.ok) throw new Error('Failed to fetch events')
        
        // Filter completed events
        const completedEvents = data.docs.filter((event: Event) => {
          if (!event.days || event.days.length === 0) return false
          
          // Get the last event date
          const lastDay = event.days[event.days.length - 1]
          const lastEventDate = new Date(lastDay.eventDate!)
          
          // Consider event completed if last day is in the past
          return lastEventDate < now
        })
        
        // Sort by date (most recent first)
        const sortedEvents = completedEvents
          .sort((a: Event, b: Event) => {
            if(!a.days || !b.days) return 0
    
            const aLastDate = new Date(a.days![a.days.length - 1].eventDate!)
            const bLastDate = new Date(b.days![b.days.length - 1].eventDate!)
            return bLastDate.getTime() - aLastDate.getTime()
          })
          .slice(0, limit)
        
        setEvents(sortedEvents)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCompletedEvents()
  }, [limit])

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0194ce]" />
        <p className="mt-4 text-slate-600">Loading events...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-slate-600">
        <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No completed events yet. Check back soon!</p>
      </div>
    )
  }

  if (layout === 'horizontal') {
    return (
      <div className="relative py-8 md:py-12 overflow-hidden">
        {/* Title Section */}
        {(title || subtitle) && (
          <div className="text-center mb-12 md:mb-16">
            {title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold 0 mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        {/* Horizontal Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div 
            className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2"
            style={{ background: `linear-gradient(90deg, ${accentColor}20, ${accentColor}, ${accentColor}20)` }}
          />
          
          {/* Timeline Track */}
          <div className="flex overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory">
            <div className="flex gap-8 px-4 md:px-8 min-w-max">
              {events.map((event, index) => {
                const lastDate = event.days![event.days!.length - 1]
                const eventDate = new Date(lastDate.eventDate!)
                const registrationsCount = event.registrations?.docs?.length || 0
                const totalCapacity = event.capacity || 0
                const attendanceRate = totalCapacity > 0 ? (registrationsCount / totalCapacity) * 100 : 0
                const locationDisplay = getLocationDisplay(event.location as string)
                
                return (
                  <div 
                    key={event.id}
                    className="relative w-80 snap-start group"
                  >
                    {/* Timeline Node */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-8">
                      <div 
                        className="w-4 h-4 rounded-full border-4 border-white shadow-lg transition-all duration-300 group-hover:scale-150"
                        style={{ backgroundColor: accentColor }}
                      />
                    </div>
                    
                    {/* Event Card */}
                    <Link href={`/events/${event.slug}`}>
                      <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer">
                        {/* Image */}
                        {event.heroImage && (
                          <div className="relative h-48 overflow-hidden">
                            <Media 
                              resource={event.heroImage} 
                              alt={event.name}
                              className="w-full h-full object-cover transition-transform duration-500 not-group-hover:opacity-90"
                              
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {eventDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="p-5">
                          <h3 className="text-xl font-bold 0 mb-2 line-clamp-2">
                            {event.name}
                          </h3>
                          
                          {locationDisplay && (
                            <div className="flex items-center gap-2 text-slate-600 text-sm mb-3">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="line-clamp-1">{locationDisplay}</span>
                            </div>
                          )}
                          
                          {/* Stats */}
                          {showStatistics && (
                            <>
                              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="w-4 h-4" style={{ color: accentColor }} />
                                  <span className="font-semibold 0">
                                    {registrationsCount}
                                  </span>
                                  <span className="opacity-50">attendees</span>
                                </div>
                                
                                {event.donation && event.donation > 0 && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Award className="w-4 h-4 text-[#f7a81b]" />
                                    <span className="font-semibold">
                                      ${event.donation.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Attendance Rate Bar */}
                              <div className="mt-3">
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${attendanceRate}%`,
                                      backgroundColor: accentColor
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Scroll Hint */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg md:hidden">
          <ChevronRight className="w-5 h-5 text-slate-600 animate-pulse" />
        </div>
      </div>
    )
  }

  // Vertical Layout (Default)
  return (
    <div className="relative py-8 md:py-12">
      {/* Title Section */}
      {(title || subtitle) && (
        <div className="text-center mb-12 md:mb-16">
          {title && (
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold 0 mb-4">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Vertical Timeline Line */}
      <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${accentColor}20, ${accentColor}, ${accentColor}20)` }}
        />
      </div>
      
      <div className="space-y-12 md:space-y-16">
        {events.map((event, index) => {
          const lastDate = event.days![event.days!.length - 1]
          const eventDate = new Date(lastDate.eventDate!)
          const registrationsCount = event.registrations?.docs?.length || 0
          const totalCapacity = event.capacity || 0
          const attendanceRate = totalCapacity > 0 ? (registrationsCount / totalCapacity) * 100 : 0
          const isEven = index % 2 === 0
          const locationDisplay = getLocationDisplay(event.location as string)
          
          return (
            <div 
              key={event.id}
              className={cn(
                "relative group",
                "md:flex md:items-center",
                isEven ? "md:flex-row" : "md:flex-row-reverse"
              )}
            >
              {/* Timeline Node */}
              <div className="absolute left-8 md:left-1/2 top-0 -translate-x-1/2 z-10">
                <div className="relative">
                  <div 
                    className="w-4 h-4 rounded-full border-4 border-white shadow-lg transition-all duration-300 group-hover:scale-150"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="absolute inset-0 animate-ping rounded-full opacity-40"
                       style={{ backgroundColor: accentColor }}
                  />
                </div>
              </div>
              
              {/* Content Container */}
              <div className={cn(
                "relative ml-16 md:ml-0 md:w-5/12",
                isEven ? "md:pr-12 md:text-right" : "md:pl-12 md:ml-auto"
              )}>
                {/* Year Badge */}
                <div className={cn(
                  "inline-block mb-3 px-3 py-1 rounded-full text-sm font-semibold",
                  "bg-gradient-to-r shadow-sm",
                  isEven ? "md:float-right" : ""
                )}
                style={{ 
                  background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`,
                  color: accentColor
                }}>
                  {eventDate.getFullYear()}
                </div>
                
                {/* Event Card */}
                <Link href={`/events/${event.slug}`}>
                  <div 
                  style={event.useColors ? {backgroundColor: event.primaryColor!, color: getTextColor(event.primaryColor!)} : {}}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                    {/* Image */}
                    {event.heroImage && (
                      <div className="relative h-56 overflow-hidden">
                        <Media 
                          resource={event.heroImage} 
                          alt={event.name}
                          className="w-full h-full object-cover transition-opacity duration-500 not-group-hover:opacity-90"
                          
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {/* Date Overlay */}
                        <div className="absolute bottom-4 left-4">
                          <div className="flex items-center gap-2 text-sm backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {eventDate.toLocaleDateString('en-US', { 
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        {/* Duration Badge */}
                        {event.days!.length > 1 && (
                          <div className="absolute top-4 right-4 backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{event.days!.length} days</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="p-6">
                      <h3 className="text-xl md:text-2xl font-bold 0 mb-3 hover:text-[#0194ce] transition-colors">
                        {event.name}
                      </h3>
                      
                      {locationDisplay && (
                        <div className="flex items-center gap-2  mb-4" style={event.useColors ? { color: getTextColor(event.primaryColor!)} : {}}>
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span>{locationDisplay}</span>
                        </div>
                      )}
                      
                      {/* Stats Grid */}
                      {showStatistics && (
                        <>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div>
                              <div className="text-2xl font-bold 0">
                                {registrationsCount}
                              </div>
                              <div className="text-xs opacity-50 uppercase tracking-wider">
                                Total Attendees
                              </div>
                            </div>
                            
                            {event.cause && (
                              <div>
                                <div className="text-2xl font-bold 0">
                                  {typeof event.cause == "string" ? event.cause : event.cause.name}
                                </div>
                                <div className="text-xs opacity-50 uppercase tracking-wider">
                                  Cause Supported
                                </div>
                              </div>
                            )}
                            
                            {event.donation && event.donation > 0 && (
                              <div>
                                <div className="text-2xl font-bold">
                                  ${event.donation.toLocaleString()}
                                </div>
                                <div className="text-xs opacity-50 uppercase tracking-wider">
                                  Funds Raised
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <div className="text-2xl font-bold 0">
                                {Math.round(attendanceRate)}%
                              </div>
                              <div className="text-xs opacity-50 uppercase tracking-wider">
                                Attendance Rate
                              </div>
                            </div>
                          </div>
                          
                          
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EventTimeline;