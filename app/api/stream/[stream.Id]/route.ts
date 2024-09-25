// app/api/stream/[streamId]/route.ts

import { NextResponse } from 'next/server'
import { getStoredStream } from '@/lib/streamStorage'

export async function GET(
  req: Request,
  { params }: { params: { streamId: string } }
) {
  const streamId = params.streamId
  console.log('Received request for streamId:', streamId)

  const stream = await getStoredStream(streamId)

  if (!stream) {
    console.error('Stream not found for streamId:', streamId)
    return new NextResponse('Stream not found', { status: 404 })
  }

  const encoder = new TextEncoder()

  const customReadable = new ReadableStream({
    async start(controller) {
      console.log('Starting to stream for streamId:', streamId)
      for await (const chunk of stream) {
        if (chunk.content) {
          console.log('Sending chunk:', chunk.content)
          controller.enqueue(encoder.encode(`data: ${chunk.content}\n\n`))
        }
      }
      console.log('Stream ended for streamId:', streamId)
      controller.enqueue(encoder.encode('event: end\ndata: Stream ended\n\n'))
      controller.close()
    },
  })

  console.log('Sending SSE response for streamId:', streamId)
  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}