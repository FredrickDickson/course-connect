import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Shield, Users, AlertCircle, CheckCircle } from "lucide-react";

interface CommunityGuidelinesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommunityGuidelinesModal({ open, onOpenChange }: CommunityGuidelinesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-6 w-6" />
            Community Guidelines
          </DialogTitle>
          <DialogDescription>
            Please read and follow these guidelines to maintain a positive and respectful community.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            <section>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                Be Respectful
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Treat all community members with respect and courtesy</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Avoid personal attacks, insults, or derogatory language</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Respect different opinions and perspectives</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                Be Helpful and Constructive
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Provide helpful and accurate information</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Share your knowledge and experiences to help others</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Give constructive feedback when appropriate</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                Stay On Topic
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Post in the appropriate forum category</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Keep discussions relevant to the thread topic</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Avoid spamming or self-promotion</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                Protect Privacy
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Do not share personal information about yourself or others</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Respect the privacy of all community members</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Report any privacy violations to moderators</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                Prohibited Content
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Hate speech, discrimination, or harassment</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Violent or threatening content</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Illegal activities or content</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Malicious links or malware</span>
                </li>
              </ul>
            </section>

            <section className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Consequences</h3>
              <p className="text-sm text-muted-foreground">
                Violation of these guidelines may result in warnings, temporary suspensions, or permanent bans from the community. 
                Serious violations may be reported to relevant authorities.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
