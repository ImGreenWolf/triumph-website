// components/blocks/DownloadFilesBlock.tsx

type FileItem = {
  label?: string
  file: {
    url: string
    filename: string
  }
}

type Props = {
  title?: string
  description?: string
  files: FileItem[]
}

import { DownloadFilesBlock  as DownloadFilesBlockType } from "@/payload-types"

export const DownloadFilesBlock: React.FC<DownloadFilesBlockType> = (props) => {
  const {title, description, files} = props;
    return (
    <section className="container">
      {title && <h2>{title}</h2>}
      {description && <p>{description}</p>}

      <ul className="flex flex-col gap-2">
        {files.filter(item => typeof item.file === 'object').map((item, index) => (
            typeof item.file == 'object' ?
             <a href={item.file.url!} download className="text-accent underline">
              {item.label || item.file.filename}
            </a>

            :

          <li key={index}>
            <a href={item.file} download className="text-accent underline">
              {item.label || item.file}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
