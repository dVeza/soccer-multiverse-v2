import type { MatchSSEEvent } from "@/hooks/useMatchStream"
import { cn } from "@/lib/utils"

const eventStyles: Record<string, string> = {
  GOAL: "bg-green-100 dark:bg-green-900/30 font-semibold",
  SAVE: "bg-blue-100 dark:bg-blue-900/30",
  FOUL: "bg-yellow-100 dark:bg-yellow-900/30",
  TACKLE: "bg-orange-100 dark:bg-orange-900/30",
  KICKOFF: "bg-muted text-center italic",
  HALFTIME: "bg-muted text-center font-semibold",
  FULLTIME: "bg-muted text-center font-bold",
}

export function MatchEventItem({ event }: { event: MatchSSEEvent }) {
  const style = eventStyles[event.event_type] ?? ""
  const isCentered = ["KICKOFF", "HALFTIME", "FULLTIME"].includes(
    event.event_type,
  )

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md px-3 py-2 text-sm",
        style,
      )}
    >
      <span className="shrink-0 w-10 font-mono text-muted-foreground tabular-nums">
        {event.minute}'
      </span>
      <span className={cn(isCentered && "flex-1 text-center")}>
        {event.description}
      </span>
    </div>
  )
}
