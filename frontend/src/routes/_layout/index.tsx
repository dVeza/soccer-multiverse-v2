import { useQueries, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Globe } from "lucide-react"
import { Suspense } from "react"

import { PlayersService, TeamsService, UniversesService } from "@/client"
import { UniverseCard } from "@/components/Universes/UniverseCard"
import { Skeleton } from "@/components/ui/skeleton"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "Dashboard - Soccer Multiverse" }],
  }),
})

function UniverseCards() {
  const { data: universes } = useSuspenseQuery({
    queryFn: () => UniversesService.readUniverses({ skip: 0, limit: 100 }),
    queryKey: ["universes"],
  })

  const playerCountQueries = useQueries({
    queries: universes.data.map((u) => ({
      queryFn: () =>
        PlayersService.readPlayers({ universeId: u.id, skip: 0, limit: 0 }),
      queryKey: ["players", u.id, "count"],
    })),
  })

  const teamCountQueries = useQueries({
    queries: universes.data.map((u) => ({
      queryFn: () =>
        TeamsService.readTeams({ universeId: u.id, skip: 0, limit: 0 }),
      queryKey: ["teams", u.id, "count"],
    })),
  })

  if (universes.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No universes yet</h3>
        <p className="text-muted-foreground">
          Run the import script to add universes and players
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {universes.data.map((universe, i) => (
        <UniverseCard
          key={universe.id}
          universe={universe}
          playerCount={playerCountQueries[i]?.data?.count ?? 0}
          teamCount={teamCountQueries[i]?.data?.count ?? 0}
        />
      ))}
    </div>
  )
}

function PendingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  )
}

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl truncate max-w-sm">
          Hi, {currentUser?.full_name || currentUser?.email} 👋
        </h1>
        <p className="text-muted-foreground">
          Welcome back, nice to see you again!
        </p>
      </div>
      <Suspense fallback={<PendingCards />}>
        <UniverseCards />
      </Suspense>
    </div>
  )
}
