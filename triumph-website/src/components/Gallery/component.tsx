'use client'

import { cn } from "@/utilities/ui"
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { Media } from "../Media"
import { Media as MediaType } from "@/payload-types"
interface GallerySlideshowProps {
  gallery: (string | MediaType)[]
  autoPlayInterval?: number
  showThumbnails?: boolean
  showControls?: boolean
}

const hasMediaObject = (media: unknown) => typeof media === 'object' && media !== null

export const GallerySlideshow: React.FC<GallerySlideshowProps> = ({
  gallery,
  autoPlayInterval = 5000,
  showThumbnails = true,
  showControls = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const validGallery = gallery?.filter(media => hasMediaObject(media)) || []
  const totalSlides = validGallery.length

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || totalSlides === 0) return
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides)
    }, autoPlayInterval)
    
    return () => clearInterval(interval)
  }, [isAutoPlaying, totalSlides, autoPlayInterval])

  // Navigation functions
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides)
    setIsAutoPlaying(false)
  }, [totalSlides])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
    setIsAutoPlaying(false)
  }, [totalSlides])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  // Touch handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      nextSlide()
    }
    if (touchStart - touchEnd < -75) {
      prevSlide()
    }
    setTouchStart(0)
    setTouchEnd(0)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return
      if (e.key === 'ArrowLeft') prevSlide()
      if (e.key === 'ArrowRight') nextSlide()
      if (e.key === 'Escape') setIsLightboxOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, prevSlide, nextSlide])

  if (totalSlides === 0) return null

  return (
    <>
      {/* Main Slideshow */}
      <div className="relative w-full group">
        {/* Slides Container */}
        <div 
          className="relative overflow-hidden rounded-2xl shadow-2xl bg-slate-900"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {validGallery.map((media, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 w-full cursor-pointer overflow-hidden"
                onClick={() => {
                  setLightboxIndex(index)
                  setIsLightboxOpen(true)
                }}
              >
                <div className="aspect-[16/9] h-auto relative">
                  <Media
                    className="overflow-hidden"
                    imgClassName="aspect-[16/9] w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    resource={media as any}
                    
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Index Counter */}
                  <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
                    {index + 1} / {totalSlides}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          {showControls && totalSlides > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md hover:bg-black/70 text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md hover:bg-black/70 text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* Auto-play Toggle */}
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 hover:scale-110"
                aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {isAutoPlaying && totalSlides > 1 && (
          <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white/30 rounded-full ">
            <div 
              className="h-full bg-gradient-to-r from-[#0194ce] to-[#f7a81b] rounded-full transition-all duration-100 linear"
              style={{ 
                width: `${((currentIndex + 1) / totalSlides) * 100}%`,
                transition: `width ${autoPlayInterval}ms linear`
              }}
            />
          </div>
        )}

        {/* Thumbnails */}
        {showThumbnails && totalSlides > 1 && (
          <div className="mt-2 md:mt-4 overflow-x-auto overflow-x-visible scrollbar-hiden">
            <div className="flex gap-2 md:gap-3 justify-center min-w-max px-4">
              {validGallery.map((media, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "relative flex-shrink-0 w-16 md:w-20 h-12 md:h-16 rounded-lg overflow-hidden transition-all duration-300",
                    currentIndex === index 
                      ? "ring-2 ring-[#0194ce] ring-offset-2 scale-105" 
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  <Media
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover"
                    resource={media as any}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all duration-300 hover:rotate-90"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Navigation */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setLightboxIndex((prev) => (prev + 1) % totalSlides)
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          {/* Current Image */}
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9] md:aspect-[21/9]">
              <Media
                className="rounded-2xl overflow-hidden"
                imgClassName="w-full h-full object-contain"
                resource={validGallery[lightboxIndex] as any}
              />
            </div>

            {/* Lightbox Counter */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium">
              {lightboxIndex + 1} / {totalSlides}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
