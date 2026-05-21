'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: 'destructive' | 'warning';
}

export function ConfirmDialog({ open, onOpenChange, title, message, onConfirm, loading, variant = 'destructive' }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === 'warning' ? (
              <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">!</span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm">&times;</span>
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{message}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">{message}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button variant={variant === 'warning' ? 'outline' : 'destructive'} onClick={onConfirm} disabled={loading} className={variant === 'warning' ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : ''}>
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
