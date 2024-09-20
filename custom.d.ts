declare module 'langchain' {
  export class OpenAIEmbeddings {
    constructor(options: { openAIApiKey: string });
    embedQuery(text: string): Promise<number[]>;
  }

  export class RecursiveCharacterTextSplitter {
    constructor(options: { chunkSize: number; chunkOverlap: number });
    createDocuments(texts: string[]): Promise<Document[]>;
  }

  export interface Document {
    pageContent: string;
    metadata?: Record<string, any>;
  }
}


// Type declarations for zod
declare module 'zod' {
  export interface ZodSchema<T> {
    parse(data: unknown): T;
    safeParse(data: unknown): { success: boolean; data?: T; error?: any };
  }

  export interface ZodString extends ZodSchema<string> {
    email(): this;
    min(length: number, message?: string): this;
  }

  export interface ZodNumber extends ZodSchema<number> {
    min(value: number, message?: string): this;
  }

  export function string(): ZodString;
  export function number(): ZodNumber;
  export function object(schema: Record<string, ZodSchema<any>>): ZodSchema<any>;
  export function array(schema: ZodSchema<any>): ZodSchema<any[]>;
}
