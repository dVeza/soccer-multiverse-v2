import { useCallback, useEffect, useRef, useState } from "react"

export interface MatchSSEEvent {
  event_type: string
  minute: number
  description: string
  home_score: number
  away_score: number
  player_id: string | null
}

interface UseMatchStreamOptions {
  matchId: string | null
  onComplete?: () => void
}

export function useMatchStream({ matchId, onComplete }: UseMatchStreamOptions) {
  const [events, setEvents] = useState<MatchSSEEvent[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const reset = useCallback(() => {
    setEvents([])
    setIsStreaming(false)
    setIsComplete(false)
  }, [])

  useEffect(() => {
    if (!matchId) {
      reset()
      return
    }

    const abortController = new AbortController()
    setEvents([])
    setIsStreaming(true)
    setIsComplete(false)

    async function connectStream() {
      const token = localStorage.getItem("access_token") || ""
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/matches/${matchId}/stream`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortController.signal,
          },
        )

        const reader = response.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const data = line.replace("data: ", "").trim()
            if (!data) continue
            if (data === "[DONE]") {
              setIsStreaming(false)
              setIsComplete(true)
              onCompleteRef.current?.()
              return
            }
            try {
              const event: MatchSSEEvent = JSON.parse(data)
              setEvents((prev) => [...prev, event])
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch {
        // Aborted or network error
      } finally {
        setIsStreaming(false)
      }
    }

    connectStream()
    return () => abortController.abort()
  }, [matchId, reset])

  return { events, isStreaming, isComplete, reset }
}
