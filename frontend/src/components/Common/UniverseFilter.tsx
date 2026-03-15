import type { UniversePublic } from "@/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UniverseFilterProps {
  universes: UniversePublic[]
  value: string
  onChange: (value: string) => void
}

export function UniverseFilter({
  universes,
  value,
  onChange,
}: UniverseFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select universe" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Universes</SelectItem>
        {universes.map((universe) => (
          <SelectItem key={universe.id} value={universe.id}>
            {universe.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
