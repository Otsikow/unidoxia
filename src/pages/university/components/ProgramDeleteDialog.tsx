import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ProgramDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function ProgramDeleteDialog({
  open,
  onClose,
  onConfirm,
  isDeleting,
}: ProgramDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="border border-border bg-background text-card-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>Archive course</AlertDialogTitle>
          <AlertDialogDescription>
            This hides the course from public search while retaining its history and links to existing applications.
            It can be reviewed or restored later.
            <br />
            <strong>Confirm that the course should no longer be publicly active.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            className="bg-red-500 text-white hover:bg-red-400"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Archiving..." : "Archive course"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
