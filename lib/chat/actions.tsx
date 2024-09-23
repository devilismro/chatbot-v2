// auctions.tsx
import React from 'react'
import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI
} from 'ai/rsc'

import { spinner, BotMessage, SystemMessage } from '@/components/stocks'

import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { auth } from '@/auth'

import ToolMessageComponent from '@/components/toolmessage'
import { getAbsoluteUrl } from '@/lib/utils'

//import { getUIStateFromAIState } from './getUIStateFromAIState';

type Chat = {
  id: string
  title: string
  userId: string
  createdAt: Date
  messages: ChatMessage[]
  path: string
}

type ToolContent = any

type ChatMessage = UserMessage | AssistantMessage | ToolMessage | SystemMessage

interface BaseMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
}

interface UserMessage extends BaseMessage {
  role: 'user'
  content: string
}

interface AssistantMessage extends BaseMessage {
  role: 'assistant'
  content: string
}

interface ToolMessage extends BaseMessage {
  role: 'tool'
  content: ToolContent
}

interface SystemMessage extends BaseMessage {
  role: 'system'
  content: string
}

export type AIState = {
  chatId: string
  messages: ChatMessage[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage: async (content: string) => {
      'use server'
      const aiState = getMutableAIState<typeof AI>()
      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'user',
            content
          }
        ]
      })

      try {
        const url = `/api/chat` // Relative URL to avoid calling external Vercel URL
        console.log('Making API call to:', url)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: 'test' // Test content for a simple POST
          })
        })

        const status = response.status
        const responseBody = await response.text()
        console.log('API Response Status:', status)
        console.log('API Response Body:', responseBody)

        if (!response.ok) {
          console.error(`API Error: ${responseBody}`)
          return {
            id: nanoid(),
            display: (
              <BotMessage content="Îmi pare rău, dar nu am putut genera un răspuns în acest moment!" />
            )
          }
        }
      } catch (error: any) {
        console.error('Fetch Error:', error)
      }
    }
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },

  onGetUIState: async () => {
    'use server'
    const session = await auth()
    if (session && session.user) {
      const aiState = getAIState() as AIState
      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },

  onSetAIState: async ({ state }) => {
    'use server'
    const session = await auth()
    if (session && session.user) {
      const { chatId, messages } = state
      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: AIState) => {
  return aiState.messages
    .filter((message: ChatMessage) => message.role !== 'system')
    .map((message: ChatMessage, index: number) => {
      const id = `${aiState.chatId}-${index}`
      let display: React.ReactNode = null

      if (message.role === 'tool') {
        display = <ToolMessageComponent content={message.content} />
      } else if (message.role === 'user' || message.role === 'assistant') {
        display = <BotMessage content={message.content} />
      } else {
        display = null
      }

      return { id, display }
    })
}
