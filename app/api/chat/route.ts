import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    console.log('API KEY:', process.env.OPENAI_API_KEY)
    return NextResponse.json(
      {
        message: 'API is working',
        apiKey: process.env.OPENAI_API_KEY
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  } catch (error: any) {
    console.error('Server Error:', error)
    return NextResponse.json(
      { message: 'Server Error: ' + error.message },
      { status: 500 }
    )
  }
}
