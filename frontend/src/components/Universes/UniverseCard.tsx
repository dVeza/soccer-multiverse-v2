import { Link } from "@tanstack/react-router"
import { Calendar, Shield, Users } from "lucide-react"

import type { UniversePublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface UniverseCardProps {
  universe: UniversePublic
  playerCount: number
  teamCount: number
}

export function UniverseCard({
  universe,
  playerCount,
  teamCount,
}: UniverseCardProps) {
  const createdAt = universe.created_at
    ? new Date(universe.created_at).toLocaleDateString()
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{universe.name}</CardTitle>
        <CardDescription>
          {universe.description || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>
              {playerCount} {playerCount === 1 ? "player" : "players"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span>
              {teamCount} {teamCount === 1 ? "team" : "teams"}
            </span>
          </div>
          {createdAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{createdAt}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/players" search={{ universe: universe.id }}>
              View Players
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/teams" search={{ universe: universe.id }}>
              View Teams
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
