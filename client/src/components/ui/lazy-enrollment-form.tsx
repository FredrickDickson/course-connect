import { lazy, Suspense } from "react";
import { LoadingState } from "./loading-state";

const EnrollmentForm = lazy(() => import("../enrollment-form").then(module => ({ 
  default: module.default 
})));

interface LazyEnrollmentFormProps {
  course: any;
  ticketSelections: Record<string, number>;
  ticketTypes: { name: string; price_ghs: number }[];
  onClose: () => void;
}

export function LazyEnrollmentForm(props: LazyEnrollmentFormProps) {
  return (
    <Suspense 
      fallback={
        <div className="w-full h-96 flex items-center justify-center bg-muted rounded-lg">
          <LoadingState message="Loading enrollment form..." size="lg" />
        </div>
      }
    >
      <EnrollmentForm {...props} />
    </Suspense>
  );
}
