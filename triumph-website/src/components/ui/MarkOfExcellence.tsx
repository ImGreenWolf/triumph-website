export default function MarkOfExcellence({currentAccent, className, animate}: {currentAccent: 'blue' | 'royal' | 'gold', className: string, animate?: boolean}) {
  const accentStyles = {
    blue: {
      bg: 'from-[#0194ce] to-[#017bb0]',
      text: 'text-[#0194ce]',
      light: 'bg-[#0194ce]/15',
      border: 'border-[#0194ce]/30',
    },
    royal: {
      bg: 'from-[#003366] to-[#002244]',
      text: 'text-[#003366]',
      light: 'bg-[#003366]/15',
      border: 'border-[#003366]/30',
    },
    gold: {
      bg: 'from-[#f7a81b] to-[#e09600]',
      text: 'text-[#f7a81b]',
      light: 'bg-[#f7a81b]/15',
      border: 'border-[#f7a81b]/30',
    },
  }
  
    return  <div  className={` ${className} ${animate && 'animate-[spin_18s_linear_infinite]'} bg-gradient-to-r aspect-square cover rounded-full ${accentStyles[currentAccent!].bg} mask-[url(/MarkofExcellence_simple.svg)]`}/>
}