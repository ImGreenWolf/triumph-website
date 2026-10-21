import React from 'react'

type HeroBlockProps = {
  id?: string | null
  blockName?: string | null
  blockType?: 'heroblock'
}

export const HeroBlock: React.FC<HeroBlockProps> = (props) => {
  const {  } = props

  

  return (
    <div className="container">
      <div className="max-w-3xl">
        
        <div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Interact Bucuresti Triumph</h1>
          <p className="mt-6 text-lg leading-8 text-foreground/85">Clubul Interact Bucuresti Triumph este un ONG din  Bucuresti care face parte dintr-o reţea globală, condus strict de tineri/e cu vârste sub 19 ani. Noi oferim oportunități și ajutor comunităților locale de tineri.</p>
        </div>
      </div>
    </div>
  )
}
