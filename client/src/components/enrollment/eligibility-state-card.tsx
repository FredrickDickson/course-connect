import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  EligibilityAction,
  EligibilityActionType,
  EligibilityResponse,
} from "@shared/eligibility-engine";
import {
  AlertTriangle,
  ArrowRightCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

const STATUS_META: Record<EligibilityResponse["status"], {
  badge: string;
  badgeClass: string;
  icon: React.ElementType;
  iconClass: string;
}> = {
  ELIGIBLE: {
    badge: "Eligible",
    badgeClass: "text-emerald-600 border-emerald-100 bg-emerald-50",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  REQUIRES_APPROVAL: {
    badge: "Needs Approval",
    badgeClass: "text-amber-600 border-amber-100 bg-amber-50",
    icon: ShieldCheck,
    iconClass: "text-amber-500",
  },
  BLOCKED: {
    badge: "Action Required",
    badgeClass: "text-red-600 border-red-100 bg-red-50",
    icon: AlertTriangle,
    iconClass: "text-red-600",
  },
};

const ACTION_ICONS: Record<EligibilityActionType, React.ElementType> = {
  ENROLL: ArrowRightCircle,
  APPLY: ShieldCheck,
  REDIRECT: ExternalLink,
  VIEW_ENROLLMENT: UserRoundCheck,
};

interface EligibilityStateCardProps {
  response: EligibilityResponse;
  onAction?: (action: EligibilityAction) => void;
  onSecondaryAction?: (action: EligibilityAction) => void;
}

export function EligibilityStateCard({
  response,
  onAction,
  onSecondaryAction,
}: EligibilityStateCardProps) {
  const meta = STATUS_META[response.status];
  const StatusIcon = meta.icon;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(meta.badgeClass, "border")}>{meta.badge}</Badge>
        </div>
        <div className="flex items-start gap-3">
          <StatusIcon className={cn("size-6", meta.iconClass)} />
          <div>
            <CardTitle>{response.ui.title}</CardTitle>
            <CardDescription className="mt-2 text-base">
              {response.ui.message}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {response.ui.action && (
          <ActionButton action={response.ui.action} onClick={onAction} />
        )}
        {response.ui.secondaryAction && (
          <ActionButton
            action={response.ui.secondaryAction}
            onClick={onSecondaryAction}
            variant="outline"
          />
        )}
      </CardContent>
    </Card>
  );
}

interface ActionButtonProps {
  action: EligibilityAction;
  onClick?: (action: EligibilityAction) => void;
  variant?: "default" | "outline";
}

function ActionButton({ action, onClick, variant = "default" }: ActionButtonProps) {
  const Icon = ACTION_ICONS[action.actionType];

  return (
    <Button
      {...(variant === "outline" ? { variant: "outline" } : {})}
      size="lg"
      onClick={() => onClick?.(action)}
      disabled={!action.actionTarget}
    >
      {Icon && <Icon data-icon="inline-start" />}
      {action.label}
      <ArrowRightCircle data-icon="inline-end" className="opacity-60" />
    </Button>
  );
}

interface ProgressionDetailsCardProps {
  progression: EligibilityResponse["progression"];
}

export function ProgressionDetailsCard({ progression }: ProgressionDetailsCardProps) {
  const detailRows = [
    { label: "Track", value: formatTrack(progression.track) },
    { label: "Current level", value: formatLevel(progression.currentLevel) },
    { label: "Target level", value: formatLevel(progression.targetLevel) },
    progression.requiredLevel && {
      label: "Prerequisite",
      value: formatLevel(progression.requiredLevel),
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your pathway</CardTitle>
        <CardDescription>
          Stay on the CIMA progression ladder without losing your place.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {detailRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="font-semibold text-foreground">{row.value}</span>
          </div>
        ))}
        {progression.nextCourse && (
          <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Next recommended course: <strong>{progression.nextCourse.title}</strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatTrack(track: string) {
  return track === "ARBITRATION" ? "Arbitration" : "Mediation";
}

function formatLevel(level: string) {
  return level === level.toUpperCase()
    ? level.charAt(0) + level.slice(1).toLowerCase()
    : level;
}
