import React from 'react'

type ToolContent = {

  text: string
  data?: any
}

interface ToolMessageComponentProps {
  content: ToolContent
}

const ToolMessageComponent: React.FC<ToolMessageComponentProps> = ({
  content
}) => {
  return (
    <div className="tool-message">
      <p>{content.text}</p>
      {content.data && <pre>{JSON.stringify(content.data, null, 2)}</pre>}
    </div>
  )
}

export default ToolMessageComponent
