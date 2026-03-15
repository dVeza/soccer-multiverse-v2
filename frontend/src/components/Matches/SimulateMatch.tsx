import { useMutation, useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"

import {
  MatchesService,
  type MatchPublic,
  TeamsService,
  UniversesService,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface SimulateMatchProps {
  onMatchCreated: (match: MatchPublic) => void
}

export function SimulateMatch({ onMatchCreated }: SimulateMatchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [universeId, setUniverseId] = useState<string>("")
  const [homeTeamId, setHomeTeamId] = useState<string>("")
  const [awayTeamId, setAwayTeamId] = useState<string>("")
  const { showErrorToast } = useCustomToast()

  const { data: universes } = useQuery({
    queryFn: () => UniversesService.readUniverses({ skip: 0, limit: 100 }),
    queryKey: ["universes"],
  })

  const { data: teams } = useQuery({
    queryFn: () => TeamsService.readTeams({ universeId, skip: 0, limit: 100 }),
    queryKey: ["teams", universeId],
    enabled: !!universeId,
  })

  const mutation = useMutation({
    mutationFn: () =>
      MatchesService.simulateMatchEndpoint({
        requestBody: {
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
        },
      }),
    onSuccess: (match) => {
      setIsOpen(false)
      resetForm()
      onMatchCreated(match)
      // Don't invalidate here — the live ticker will call onComplete
      // which triggers invalidation after the stream finishes,
      // so the final score isn't spoiled in the background.
    },
    onError: handleError.bind(showErrorToast),
  })

  const resetForm = () => {
    setUniverseId("")
    setHomeTeamId("")
    setAwayTeamId("")
  }

  const handleUniverseChange = (value: string) => {
    setUniverseId(value)
    setHomeTeamId("")
    setAwayTeamId("")
  }

  const canSubmit =
    homeTeamId && awayTeamId && homeTeamId !== awayTeamId && !mutation.isPending

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Simulate Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Simulate Match</DialogTitle>
          <DialogDescription>
            Select two teams from the same universe to simulate a match.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">Universe</span>
            <Select value={universeId} onValueChange={handleUniverseChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select universe" />
              </SelectTrigger>
              <SelectContent>
                {universes?.data.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {universeId && (
            <>
              <div className="space-y-2">
                <span className="text-sm font-medium">Home Team</span>
                <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select home team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.data
                      .filter((t) => t.id !== awayTeamId)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Away Team</span>
                <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select away team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.data
                      .filter((t) => t.id !== homeTeamId)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <LoadingButton
            loading={mutation.isPending}
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            Simulate
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
