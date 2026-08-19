'use client'
import { useEffect, useState } from "react";

function ClockComponent() {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        window.onload = displayClock;
        function displayClock(){
    
            const d = new Date();
            var sync = d.getMilliseconds();
            var syncedTimeout = 1000 - sync;
    
            setTime(d)
            // setTimeout(displayClock, syncedTimeout); 
        }
        setInterval(displayClock, 1000)

    })
       

        
    return (
        <div className="absolute right-0 top-0 p-24 font-light tracking-wider text-left w-60">
                {time.toLocaleTimeString()}
        </div>
    )
}

export default ClockComponent