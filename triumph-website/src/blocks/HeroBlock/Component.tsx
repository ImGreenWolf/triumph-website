import React from 'react'

type HeroBlockProps = {
  id?: string | null
  blockName?: string | null
  blockType?: 'heroblock'
}

export const HeroBlock: React.FC<HeroBlockProps> = (props) => {
  const {  } = props

  

  return (
    <div className="container my-16">
      <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-16">
        
        <div>
          <h1>Interact Bucuresti Triumph</h1>
          <p>Clubul Interact Bucuresti Triumph este un ONG din  Bucuresti care face parte dintr-o reţea globală, condus strict de tineri/e cu vârste sub 19 ani. Noi oferim oportunități și ajutor comunităților locale de tineri.</p>
        </div>
      </div>
    </div>
  )
}
