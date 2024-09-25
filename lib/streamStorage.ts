const streamStorage = new Map<string, any>()

export function storeStreamForLaterUse(streamId: string, stream: any) {
  streamStorage.set(streamId, stream)
}

export async function getStoredStream(streamId: string) {
  return streamStorage.get(streamId)
}