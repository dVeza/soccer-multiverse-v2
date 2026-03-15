import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Users } from "lucide-react"
import { Suspense, useState } from "react"
import { z } from "zod"

import { PlayersService, UniversesService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { UniverseFilter } from "@/components/Common/UniverseFilter"
import { columns } from "@/components/Players/columns"
import { Skeleton } from "@/components/ui/skeleton"

const searchSchema = z.object({
  universe: z.string().optional(),
})

export const Route = createFileRoute("/_layout/players")({
  component: PlayersPage,
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Players - Soccer Multiverse" }],
  }),
})

function PlayersTable({ universeId }: { universeId?: string }) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { data: players } = useSuspenseQuery({
    queryFn: () =>
      PlayersService.readPlayers({
        universeId,
        skip: pageIndex * pageSize,
        limit: pageSize,
      }),
    queryKey: ["players", universeId ?? "all", pageIndex, pageSize],
  })

  if (players.count === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No players yet</h3>
        <p className="text-muted-foreground">
          Run the import script to add players
        </p>
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={players.data}
      totalCount={players.count}
      pageIndex={pageIndex}
      pageSize={pageSize}
      onPaginationChange={(newPageIndex, newPageSize) => {
        setPageIndex(newPageSize !== pageSize ? 0 : newPageIndex)
        setPageSize(newPageSize)
      }}
    />
  )
}

function PlayersPageContent() {
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
          <h1 className="text-2xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground">
            Browse players across universes
          </p>
        </div>
        <UniverseFilter
          universes={universes.data}
          value={filterValue}
          onChange={handleUniverseChange}
        />
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <PlayersTable
          key={selectedUniverseId}
          universeId={selectedUniverseId}
        />
      </Suspense>
    </div>
  )
}

function PendingPlayers() {
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

function PlayersPage() {
  return (
    <Suspense fallback={<PendingPlayers />}>
      <PlayersPageContent />
    </Suspense>
  )
}
