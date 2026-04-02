// Stub: ObjectUploader (Uppy upload disabled in Lovable environment)
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters?: () => Promise<any>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  return (
    <div>
      <Button className={buttonClassName} type="button" disabled>
        {children}
      </Button>
    </div>
  );
}