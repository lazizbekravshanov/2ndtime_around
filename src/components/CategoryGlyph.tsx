import {
  BikeIcon,
  BookIcon,
  BoxIcon,
  BrushIcon,
  LampIcon,
  MonitorIcon,
  MusicIcon,
  TagIcon,
} from "@/components/icons";
import { categoryIconKey, type IconKey } from "@/lib/categoryIcon";

const COMPONENTS: Record<IconKey, (p: { className?: string }) => React.ReactNode> =
  {
    book: BookIcon,
    monitor: MonitorIcon,
    lamp: LampIcon,
    bike: BikeIcon,
    music: MusicIcon,
    brush: BrushIcon,
    tag: TagIcon,
    box: BoxIcon,
  };

/** The monochrome glyph standing in for a listing's missing photo. */
export function CategoryGlyph({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = COMPONENTS[categoryIconKey(category)];
  return <Icon className={className} />;
}
