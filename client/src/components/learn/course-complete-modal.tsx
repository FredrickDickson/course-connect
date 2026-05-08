import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Linkedin, Compass } from "lucide-react";
import { Link } from "wouter";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseTitle: string;
  courseId: string;
}
export default function CourseCompleteModal({ open, onOpenChange, courseTitle, courseId }: Props) {
  const shareUrl = encodeURIComponent(window.location.origin + "/course/" + courseId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">🎉 Course Complete!</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">You've completed</p>
        <p className="font-semibold text-lg">{courseTitle}</p>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild className="bg-[#B91C1C] hover:bg-[#A01818]">
            <Link href={`/profile?tab=certificates&course=${courseId}`}>
              <Award className="h-4 w-4 mr-2" /> Download Certificate
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}>
              <Linkedin className="h-4 w-4 mr-2" /> Share on LinkedIn
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/courses"><Compass className="h-4 w-4 mr-2" /> Browse next-level courses</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
