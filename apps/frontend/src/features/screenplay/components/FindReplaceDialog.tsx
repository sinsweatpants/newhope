import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface FindReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (term: string) => void;
  onReplace: (term: string, replacement: string) => void;
  onReplaceAll: (term: string, replacement: string) => void;
}

const FindReplaceDialog: React.FC<FindReplaceDialogProps> = ({
  isOpen,
  onClose,
  onFind,
  onReplace,
  onReplaceAll,
}) => {
  const [findTerm, setFindTerm] = React.useState('');
  const [replaceTerm, setReplaceTerm] = React.useState('');

  const handleFind = () => {
    if (findTerm) onFind(findTerm);
  };

  const handleReplace = () => {
    if (findTerm) onReplace(findTerm, replaceTerm);
  };

  const handleReplaceAll = () => {
    if (findTerm) onReplaceAll(findTerm, replaceTerm);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Find and Replace</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="find" className="text-right">
              Find
            </Label>
            <Input
              id="find"
              value={findTerm}
              onChange={(e) => setFindTerm(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="replace" className="text-right">
              Replace
            </Label>
            <Input
              id="replace"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleFind}>Find Next</Button>
          <Button onClick={handleReplace}>Replace</Button>
          <Button onClick={handleReplaceAll}>Replace All</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FindReplaceDialog;
