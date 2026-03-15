import type { PlayerPublic, TeamPublicWithPlayers } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteTeam } from "./DeleteTeam"

interface TeamCardProps {
  team: TeamPublicWithPlayers
  universeId: string
}

function PlayerRow({ player }: { player: PlayerPublic }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{player.name}</span>
      <span className="text-muted-foreground tabular-nums">
        {player.height}cm / {player.weight}kg
      </span>
    </div>
  )
}

function PositionGroup({
  label,
  players,
}: {
  label: string
  players: PlayerPublic[]
}) {
  if (players.length === 0) return null
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h4>
      {players.map((player) => (
        <PlayerRow key={player.id} player={player} />
      ))}
    </div>
  )
}

export function TeamCard({ team, universeId }: TeamCardProps) {
  const players = team.players ?? []
  const goalies = players.filter((p) => p.position === "GOALIE")
  const defenders = players.filter((p) => p.position === "DEFENCE")
  const attackers = players.filter((p) => p.position === "OFFENCE")

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{team.name}</CardTitle>
        <DeleteTeam id={team.id} universeId={universeId} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Badge variant="default">{goalies.length} GK</Badge>
          <Badge variant="secondary">{defenders.length} DEF</Badge>
          <Badge variant="outline">{attackers.length} ATT</Badge>
        </div>
        <div className="space-y-3">
          <PositionGroup label="Goalie" players={goalies} />
          <PositionGroup label="Defence" players={defenders} />
          <PositionGroup label="Offence" players={attackers} />
        </div>
      </CardContent>
    </Card>
  )
}
