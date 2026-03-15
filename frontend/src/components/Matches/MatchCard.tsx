import type { MatchPublicWithDetails } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface MatchCardProps {
  match: MatchPublicWithDetails
  onClick?: () => void
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  const homeName = match.home_team?.name ?? "Unknown"
  const awayName = match.away_team?.name ?? "Unknown"
  const createdAt = match.created_at
    ? new Date(match.created_at).toLocaleDateString()
    : null

  return (
    <Card
      className="transition-colors hover:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm font-semibold truncate max-w-[140px]">
            {homeName}
          </span>
          <span className="text-xl font-mono font-bold">
            {match.home_score ?? 0} - {match.away_score ?? 0}
          </span>
          <span className="text-sm font-semibold truncate max-w-[140px]">
            {awayName}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-2">
        <Badge variant={match.status === "FINISHED" ? "secondary" : "default"}>
          {match.status}
        </Badge>
        {createdAt && (
          <span className="text-xs text-muted-foreground">{createdAt}</span>
        )}
      </CardContent>
    </Card>
  )
}
