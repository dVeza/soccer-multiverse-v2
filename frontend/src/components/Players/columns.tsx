import type { ColumnDef } from "@tanstack/react-table"

import type { PlayerPublic } from "@/client"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<PlayerPublic>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "height",
    header: "Height (cm)",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.height}</span>
    ),
  },
  {
    accessorKey: "weight",
    header: "Weight (kg)",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.weight}</span>
    ),
  },
  {
    accessorKey: "position",
    header: "Position",
    cell: ({ row }) => {
      const position = row.original.position
      if (!position) {
        return <span className="text-muted-foreground italic">Unassigned</span>
      }
      const variant =
        position === "GOALIE"
          ? "default"
          : position === "DEFENCE"
            ? "secondary"
            : "outline"
      return <Badge variant={variant}>{position}</Badge>
    },
  },
]
