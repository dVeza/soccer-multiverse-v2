import { useQueries, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Shield } from "lucide-react"
import { Suspense } from "react"
import { z } from "zod"

import type { TeamPublic } from "@/client"
import { TeamsService, UniversesService } from "@/client"
import { UniverseFilter } from "@/components/Common/UniverseFilter"
import { GenerateTeam } from "@/components/Teams/GenerateTeam"
import { TeamCard } from "@/components/Teams/TeamCard"
import { Skeleton } from "@/components/ui/skeleton"

const searchSchema = z.object({
  universe: z.string().optional(),
})

export const Route = createFileRoute("/_layout/teams")({
  component: TeamsPage,
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Teams - Soccer Multiverse" }],
  }),
})

function TeamsList({ teams }: { teams: TeamPublic[] }) {
  const teamDetailQueries = useQueries({
    queries: teams.map((team) => ({
      queryFn: () => TeamsService.readTeam({ id: team.id }),
      queryKey: ["teams", "detail", team.id],
    })),
  })

  const allLoaded = teamDetailQueries.every((q) => q.isSuccess)

  if (!allLoaded) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((team) => (
          <Skeleton key={team.id} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {teamDetailQueries.map(
        (query) =>
          query.data && (
            <TeamCard
              key={query.data.id}
              team={query.data}
              universeId={query.data.universe_id}
            />
          ),
      )}
    </div>
  )
}

function TeamsGrid({ universeId }: { universeId?: string }) {
  const { data: teams } = useSuspenseQuery({
    queryFn: () =>
      TeamsService.readTeams({
        universeId,
        skip: 0,
        limit: 100,
      }),
    queryKey: ["teams", universeId ?? "all"],
  })

  if (teams.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Shield className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No teams yet</h3>
        <p className="text-muted-foreground">
          Generate a team to assign players to positions
        </p>
      </div>
    )
  }

  return <TeamsList teams={teams.data} />
}

function TeamsPageContent() {
  const { universe } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const { data: universes } = useSuspenseQuery({
    queryFn: () => UniversesService.readUniverses({ skip: 0, limit: 100 }),
    queryKey: ["universes"],
  })

  const filterValue = universe ?? "all"
  const selectedUniverseId = filterValue === "all" ? undefined : filterValue

  const handleUniverseChange = (value: string) => {
    navigate({
      search: value === "all" ? {} : { universe: value },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">Manage generated teams</p>
        </div>
        <div className="flex items-center gap-3">
          <UniverseFilter
            universes={universes.data}
            value={filterValue}
            onChange={handleUniverseChange}
          />
          {selectedUniverseId && (
            <GenerateTeam universeId={selectedUniverseId} />
          )}
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <TeamsGrid universeId={selectedUniverseId} />
      </Suspense>
    </div>
  )
}

function PendingTeams() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

function TeamsPage() {
  return (
    <Suspense fallback={<PendingTeams />}>
      <TeamsPageContent />
    </Suspense>
  )
}
