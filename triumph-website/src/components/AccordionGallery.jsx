'use client'
import { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';

import './AccordionGallery.css';

const DEFAULT_ITEMS = [
  { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
  { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
  { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
  { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
  { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' }
];

const AccordionGallery = ({
  items = DEFAULT_ITEMS,
  defaultIndex = 2,
  accentColor = '#ffffff',
  overlayColor = '#060010',
  textColor = '#ffffff',
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = 'auto',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  className = ''
}) => {
  const rootRef = useRef(null);
  const panelRefs = useRef([]);
  const mediaRefs = useRef([]);
  const barRefs = useRef([]);
  const textRefs = useRef([]);
  const tlRef = useRef(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);
  const layoutRef = useRef(null);

  const count = items.length;
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1));

  const applyLayout = useCallback(
    animate => {
      const panels = panelRefs.current;
      const root = rootRef.current;
      if (!panels.length || !root) return;

      // CSS owns the responsive axis, including the initial server-rendered layout.
      const vertical = getComputedStyle(root).flexDirection === 'column';
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
      const mediaSize = mediaSizeRef.current;

      tlRef.current?.kill();
      const dur = animate && !prefersReduced ? duration : 0;
      const tl = gsap.timeline();

      panels.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === active;
        const media = mediaRefs.current[i];
        const bar = barRefs.current[i];
        const text = textRefs.current[i];

        const rot = isActive || prefersReduced || (orientation === 'auto' && vertical)
          ? 0 : i < active ? tilt : -tilt;

        tl.to(panel, {
          flexGrow: isActive ? grow : 1,
          rotateX: vertical ? -rot : 0,
          rotateY: vertical ? 0 : rot,
          duration: dur,
          ease
        }, 0);

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i));
          const shift = prefersReduced ? 0 : drift * parallax * mediaSize * 0.06;
          const gray = grayscale ? (isActive ? 0 : 1) : 0;
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              '--ag-gray': gray,
              '--ag-dim': isActive ? 0 : 0.35,
              duration: dur,
              ease
            },
            0
          );
        }

        if (showLabels && bar && text) {
          if (isActive) {
            tl.to([bar, text], { opacity: 1, x: 0, duration: dur, ease, stagger: dur ? stagger : 0 }, 0);
          } else {
            tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0);
          }
        }
      });

      if (!dur) tl.progress(1);
      tlRef.current = tl;
    },
    [
      active,
      count,
      expandRatio,
      duration,
      ease,
      orientation,
      tilt,
      parallax,
      grayscale,
      showLabels,
      stagger
    ]
  );

  useEffect(() => {
    layoutRef.current = applyLayout;
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vertical = getComputedStyle(el).flexDirection === 'column';
      const total = vertical ? rect.height : rect.width;
      const actualGap = parseFloat(getComputedStyle(el).gap) || 0;
      const usable = Math.max(total - actualGap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      el.style.setProperty('--ag-media-size', `${size}px`);
      layoutRef.current?.(false);
    };

    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    // Also catches breakpoint changes inside a fixed-width parent.
    window.addEventListener('resize', measure);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    preference.addEventListener('change', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      preference.removeEventListener('change', measure);
    };
  }, [gap, count, expandRatio, orientation, height]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    []
  );

  const handleEnter = i => {
    if (trigger === 'hover') setActive(i);
  };

  const handleClick = (i, e) => {
    if (i !== active) {
      e.preventDefault();
      setActive(i);
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (i + 1) % count;
      setActive(next);
      panelRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (i - 1 + count) % count;
      setActive(next);
      panelRefs.current[next]?.focus();
    }
  };

  if (!count) return null;

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery accordion-gallery--${orientation}${className ? ` ${className}` : ''}`}
      style={{
        '--ag-accent': accentColor,
        '--ag-overlay': overlayColor,
        '--ag-text': textColor,
        '--ag-gap': `${gap}px`,
        '--ag-radius': `${radius}px`,
        '--ag-height': `${height}px`,
        '--ag-vertical-height': `${Math.round(height * 1.6)}px`,
        '--ag-compact-height': `${Math.max(Math.min(height, 560), 180 + Math.max(0, count - 1) * (44 + gap))}px`
      }}
      role="group"
      aria-label="Galerie foto"
    >
      {items.map((item, i) => {
        const isActive = i === active;
        const Tag = item.link ? 'a' : 'button';
        return (
          <Tag
            key={i}
            ref={el => (panelRefs.current[i] = el)}
            className={`ag-panel${isActive ? ' ag-panel--active' : ''}`}
            style={{ borderRadius: `${radius}px` }}
            href={item.link || undefined}
            type={item.link ? undefined : 'button'}
            onClick={e => handleClick(i, e)}
            onMouseEnter={() => handleEnter(i)}
            onFocus={() => setActive(i)}
            onKeyDown={e => handleKeyDown(i, e)}
            tabIndex={0}
            aria-current={isActive ? 'true' : undefined}
            aria-label={item.label}
          >
            <span className="ag-panel__frame">
              <span className="ag-panel__media" ref={el => (mediaRefs.current[i] = el)}>
                <img loading="lazy" src={item.image} alt={item.alt || item.label || ''} draggable="false" />
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>
            {showLabels && (
              <span className="ag-panel__label" aria-hidden="true">
                <span className="ag-panel__bar" ref={el => (barRefs.current[i] = el)} />
                <span className="ag-panel__text" ref={el => (textRefs.current[i] = el)}>
                  {item.label}
                </span>
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
};

export default AccordionGallery;
