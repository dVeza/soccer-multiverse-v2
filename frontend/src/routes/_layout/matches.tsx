import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Swords } from "lucide-react"
import { Suspense, useCallback, useState } from "react"
import { z } from "zod"

import type { MatchPublic, MatchPublicWithDetails } from "@/client"
import { MatchesService, TeamsService, UniversesService } from "@/client"
import { UniverseFilter } from "@/components/Common/UniverseFilter"
import { MatchCard } from "@/components/Matches/MatchCard"
import {
  MatchLiveTicker,
  MatchReplay,
} from "@/components/Matches/MatchLiveTicker"
import { SimulateMatch } from "@/components/Matches/SimulateMatch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

const searchSchema = z.object({
  universe: z.string().optional(),
})

export const Route = createFileRoute("/_layout/matches")({
  component: MatchesPage,
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Matches - Soccer Multiverse" }],
  }),
})

function MatchDetailDialog({
  match,
  onClose,
}: {
  match: MatchPublicWithDetails
  onClose: () => void
}) {
  const homeName = match.home_team?.name ?? "Unknown"
  const awayName = match.away_team?.name ?? "Unknown"

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {homeName} vs {awayName}
          </DialogTitle>
        </DialogHeader>
        <MatchReplay
          homeTeamName={homeName}
          awayTeamName={awayName}
          events={match.events ?? []}
          homeScore={match.home_score ?? 0}
          awayScore={match.away_score ?? 0}
        />
      </DialogContent>
    </Dialog>
  )
}

function LiveMatchDialog({
  match,
  homeTeamName,
  awayTeamName,
  onClose,
  onComplete,
}: {
  match: MatchPublic
  homeTeamName: string
  awayTeamName: string
  onClose: () => void
  onComplete: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {homeTeamName} vs {awayTeamName}
          </DialogTitle>
        </DialogHeader>
        <MatchLiveTicker
          matchId={match.id}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          onComplete={onComplete}
        />
      </DialogContent>
    </Dialog>
  )
}

function MatchesGrid({ universeId }: { universeId?: string }) {
  const { data: matchesData } = useSuspenseQuery({
    queryFn: () =>
      MatchesService.readMatches({
        universeId,
        skip: 0,
        limit: 100,
      }),
    queryKey: ["matches", universeId ?? "all"],
  })

  // Fetch details for all matches (to get team names)
  const matchIds = matchesData.data.map((m) => m.id)
  const { data: detailedMatches } = useSuspenseQuery({
    queryFn: async () => {
      if (matchIds.length === 0) return []
      const results = await Promise.all(
        matchIds.map((id) => MatchesService.readMatch({ id })),
      )
      return results
    },
    queryKey: ["matches", "details", ...matchIds],
  })

  const [selectedMatch, setSelectedMatch] =
    useState<MatchPublicWithDetails | null>(null)

  if (matchesData.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Swords className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No matches yet</h3>
        <p className="text-muted-foreground">
          Simulate a match between two teams
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(detailedMatches ?? []).map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onClick={() => setSelectedMatch(match)}
          />
        ))}
      </div>
      {selectedMatch && (
        <MatchDetailDialog
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </>
  )
}

function MatchesPageContent() {
  const { universe } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()

  const { data: universes } = useSuspenseQuery({
    queryFn: () => UniversesService.readUniverses({ skip: 0, limit: 100 }),
    queryKey: ["universes"],
  })

  // We also need teams to resolve names for the live ticker
  const { data: allTeams } = useSuspenseQuery({
    queryFn: () => TeamsService.readTeams({ skip: 0, limit: 100 }),
    queryKey: ["teams", "all"],
  })

  const filterValue = universe ?? "all"
  const selectedUniverseId = filterValue === "all" ? undefined : filterValue

  const handleUniverseChange = (value: string) => {
    navigate({
      search: value === "all" ? {} : { universe: value },
    })
  }

  const [liveMatch, setLiveMatch] = useState<{
    match: MatchPublic
    homeTeamName: string
    awayTeamName: string
  } | null>(null)

  const handleMatchCreated = useCallback(
    (match: MatchPublic) => {
      const home = allTeams?.data.find((t) => t.id === match.home_team_id)
      const away = allTeams?.data.find((t) => t.id === match.away_team_id)
      setLiveMatch({
        match,
        homeTeamName: home?.name ?? "Home",
        awayTeamName: away?.name ?? "Away",
      })
    },
    [allTeams],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-muted-foreground">
            Simulate and view match results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UniverseFilter
            universes={universes.data}
            value={filterValue}
            onChange={handleUniverseChange}
          />
          <SimulateMatch onMatchCreated={handleMatchCreated} />
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <MatchesGrid universeId={selectedUniverseId} />
      </Suspense>
      {liveMatch && (
        <LiveMatchDialog
          match={liveMatch.match}
          homeTeamName={liveMatch.homeTeamName}
          awayTeamName={liveMatch.awayTeamName}
          onClose={() => {
            setLiveMatch(null)
            queryClient.invalidateQueries({ queryKey: ["matches"] })
          }}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["matches"] })
          }}
        />
      )}
    </div>
  )
}

function PendingMatches() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

function MatchesPage() {
  return (
    <Suspense fallback={<PendingMatches />}>
      <MatchesPageContent />
    </Suspense>
  )
}
