import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTeamBadgePath, getTeamMeta } from "@/lib/team-branding";

type TeamBadgeProps = {
  teamName: string;
  season?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export default function TeamBadge({ teamName, season, className, imageClassName, priority = false }: TeamBadgeProps) {
  const team = getTeamMeta(teamName);
  const badgePath = getTeamBadgePath(teamName, season);

  if (!team || !badgePath) {
    return (
      <div className={cn("flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-black", className)}>
        {teamName.slice(0, 1)}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-full border shadow-lg", className)}
      style={{
        borderColor: `${team.logoColor}33`,
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.98) 0%, ${team.logoColor}18 100%)`,
      }}
    >
      <Image
        src={badgePath}
        alt={`${teamName}队徽`}
        fill
        sizes="(max-width: 768px) 96px, 128px"
        className={cn("object-contain p-[14%]", imageClassName)}
        priority={priority}
      />
    </div>
  );
}
