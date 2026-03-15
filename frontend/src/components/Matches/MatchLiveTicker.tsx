import { useEffect, useRef } from "react"

import type { MatchEventPublic } from "@/client"
import type { MatchSSEEvent } from "@/hooks/useMatchStream"
import { useMatchStream } from "@/hooks/useMatchStream"
import { MatchEventItem } from "./MatchEventItem"

interface MatchLiveTickerProps {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  onComplete?: () => void
}

interface MatchReplayProps {
  homeTeamName: string
  awayTeamName: string
  events: MatchEventPublic[]
  homeScore: number
  awayScore: number
}

function Scoreboard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
}: {
  homeTeamName: string
  awayTeamName: string
  homeScore: number
  awayScore: number
}) {
  return (
    <div className="flex items-center justify-center gap-6 rounded-lg bg-muted p-6">
      <span className="text-xl font-bold truncate max-w-[200px]">
        {homeTeamName}
      </span>
      <span className="text-3xl font-mono font-bold">
        {homeScore} - {awayScore}
      </span>
      <span className="text-xl font-bold truncate max-w-[200px]">
        {awayTeamName}
      </span>
    </div>
  )
}

function EventTimeline({ events }: { events: MatchSSEEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const eventCount = events.length

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new events
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [eventCount])

  return (
    <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-1">
      {events.map((event, i) => (
        <MatchEventItem key={i} event={event} />
      ))}
    </div>
  )
}

export function MatchLiveTicker({
  matchId,
  homeTeamName,
  awayTeamName,
  onComplete,
}: MatchLiveTickerProps) {
  const { events, isComplete } = useMatchStream({
    matchId,
    onComplete,
  })

  const latest = events.length > 0 ? events[events.length - 1] : null

  return (
    <div className="flex flex-col gap-4">
      <Scoreboard
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeScore={latest?.home_score ?? 0}
        awayScore={latest?.away_score ?? 0}
      />
      <EventTimeline events={events} />
      {isComplete && (
        <div className="text-center text-lg font-semibold p-4 rounded-lg bg-primary/10">
          Final Score: {homeTeamName} {latest?.home_score ?? 0} -{" "}
          {latest?.away_score ?? 0} {awayTeamName}
        </div>
      )}
    </div>
  )
}

export function MatchReplay({
  homeTeamName,
  awayTeamName,
  events,
  homeScore,
  awayScore,
}: MatchReplayProps) {
  const sseEvents: MatchSSEEvent[] = events.map((e) => ({
    event_type: e.event_type,
    minute: e.minute,
    description: e.description,
    home_score: e.home_score ?? 0,
    away_score: e.away_score ?? 0,
    player_id: e.player_id ?? null,
  }))

  return (
    <div className="flex flex-col gap-4">
      <Scoreboard
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeScore={homeScore}
        awayScore={awayScore}
      />
      <div className="max-h-96 overflow-y-auto space-y-1">
        {sseEvents.map((event, i) => (
          <MatchEventItem key={i} event={event} />
        ))}
      </div>
    </div>
  )
}
