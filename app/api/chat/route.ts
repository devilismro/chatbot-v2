  export async function POST(req: Request) {
    try {
      console.log('API KEY:', process.env.OPENAI_API_KEY);
      return new Response(
        JSON.stringify({ message: 'API is working', apiKey: process.env.OPENAI_API_KEY }),
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Server Error:', error);
      return new Response(
        JSON.stringify({ message: 'Server Error: ' + error.message }),
        { status: 500 }
      );
    }
  }
