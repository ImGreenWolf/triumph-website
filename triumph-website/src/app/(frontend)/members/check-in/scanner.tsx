'use client'
import dynamic from "next/dynamic"

const BarcodeScanner = dynamic(
  () => import("react-qr-barcode-scanner"),
  { ssr: false }
)
import { Ref, useEffect, useRef, useState } from "react";
import { onCodeScanned } from "./actions";
import { Meeting, User } from "@/payload-types";
// import BarcodeScanner from "react-qr-barcode-scanner";
import payloadConfig from "@payload-config"
import { getPayload } from "payload"
export function Scanner(props: {user: User, meeting?: Meeting}) {
    const {user, meeting} = props
    const [data, setData] = useState<{user?: User, err?: string} | undefined>({});
    const canvasRef: Ref<HTMLCanvasElement> = useRef(null)
    let ctx = canvasRef.current?.getContext('2d');
    const [lastIdScanned, setLastId] = useState('')
    let debouncer: NodeJS.Timeout;

    const [aspectRatio, setAspectRatio] = useState(9/16)

    useEffect(() => {
        const updateAspectRatio = () => {
            if (window.innerWidth > 1024) {
            setAspectRatio(16 / 9)
            } else {
            setAspectRatio(9 / 21)
            }
        }

        updateAspectRatio()

        window.addEventListener('resize', updateAspectRatio)

        return () => {
            window.removeEventListener('resize', updateAspectRatio)
        }
    }, [])

    return (


        <div className="h-full">
            <div className="absolute inset-0 w-full overflow-hidden -z-3">
                <BarcodeScanner
                delay={200}
                // width={'100vw'}
                // height={'100vh'}
                videoConstraints={{frameRate: 60, aspectRatio}}
                formats={[11]}
                onUpdate={async (err, result) => {
                     if (result) {
                        
                         if(debouncer)
                            clearTimeout(debouncer)
                        if(ctx) {
                            ctx.reset()
                            ctx.strokeStyle = 'white'
                            ctx.lineWidth = 5
                            ctx.beginPath()
                            const points = result.getResultPoints()
                            // result.getResultPoints().forEach((point) => {              
                            //     ctx.lineTo(point.getX(), point.getY())
                            // })
                            ctx.lineTo(points[0].getX(), points[0].getY())
                            ctx.lineTo(points[1].getX(), points[1].getY())
                            ctx.lineTo(points[2].getX(), points[2].getY())
                            ctx.lineTo(points[0].getX() + points[2].getX() - points[1].getX(), points[0].getY() + points[2].getY() - points[1].getY())
                            ctx.closePath()
                            ctx.stroke()
                            // ctx.moveTo(points[3].getX(), points[3].getY())
                            // ctx.ellipse(points[3].getX(), points[3].getY(), 5,5,0,0,360)
                            // ctx.stroke()
                            
                        }
                        const id =result.getText()
                        if(lastIdScanned!=id) {
                             setLastId(id)
                             console.log(id, lastIdScanned)
                            onCodeScanned(id, result.getTimestamp(), user.id).then(setData)
                        } else {
                            // if(!data)
                            // setData({err: 'Ai scanat acest cod deja!'})
                        }

                        
                     } else {
                        // if(debouncer)
                        //     clearTimeout(debouncer)
                        // else 
                            debouncer = setTimeout(() => {
                                if(!ctx)
                                    return
                                (ctx as CanvasRenderingContext2D).reset() 
                                setTimeout(() => setData(undefined), 5000)
                             }, 400)
                            
                           
                     }

                    
                }}
            />
                 <canvas ref={canvasRef} className="absolute inset-0 z-1" width={1920} height={1080}/>

            </div>

            { data && 
            <div className="flex flex-col px-8 my-4 bg-card rounded-xl p-4 text-lg leading-6">
                   
                    {
                        data.user && <div>
                            {data.err ? data.err : 'Cod scanat cu success!'} Salut, {data.user.name}
                        </div>
                    }
                    {
                        data && (data.err && !data.user) && <div>
                            {data.err}
                            </div>
                    }

                    {/* {(data?.meeting ?? meeting!).attendance?.totalDocs} */}
            </div> }
            
        </div>
    )
}



export default Scanner