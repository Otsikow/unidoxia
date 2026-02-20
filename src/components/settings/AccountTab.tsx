import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  AlertTriangle,
  UserX,
  Trash2,
  Shield,
  Info,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface AccountTabProps {
  profile: any;
}

const AccountTab = ({ profile }: AccountTabProps) => {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDeactivateAccount = async () => {
    setIsDeactivating(true);

    try {
      // Update profile to inactive
      const { error } = await supabase
        .from('profiles')
        .update({ active: false })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Account deactivated',
        description: 'Your account has been deactivated successfully',
      });

      // Sign out user
      setTimeout(() => {
        signOut();
      }, 2000);
    } catch (error: any) {
      console.error('Error deactivating account:', error);
      toast({
        title: 'Deactivation failed',
        description: error.message || 'Failed to deactivate account',
        variant: 'destructive',
      });
    } finally {
      setIsDeactivating(false);
      setDeactivateDialogOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      toast({
        title: 'Confirmation required',
        description: 'Please type DELETE to confirm account deletion',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: profile.id },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted',
      });

      setTimeout(() => {
        signOut();
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Deletion failed',
        description: error.message || 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setConfirmText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>View your current account status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account Status</p>
              <p className="text-sm text-muted-foreground">Your account is currently active</p>
            </div>
            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              {profile.active ? 'Active' : 'Inactive'}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="font-medium">Account Details</p>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono">{profile.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since:</span>
                <span>{new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account type:</span>
                <span className="capitalize">{profile.role}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Account */}
      <Card className="border-yellow-200 dark:border-yellow-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
            <UserX className="h-5 w-5" />
            Deactivate Account
          </CardTitle>
          <CardDescription>
            Temporarily disable your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Deactivating your account will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Hide your profile from other users</li>
                <li>Prevent you from logging in</li>
                <li>Preserve all your data for reactivation</li>
              </ul>
              <p className="mt-2">
                You can reactivate your account at any time by contacting support.
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button
              variant="outline"
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-500 dark:hover:bg-yellow-950"
              onClick={() => setDeactivateDialogOpen(true)}
            >
              <UserX className="mr-2 h-4 w-4" />
              Deactivate Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting your account is permanent and cannot be undone.
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All your personal data will be permanently deleted</li>
                <li>All your applications will be removed</li>
                <li>All your uploaded documents will be deleted</li>
                <li>You will lose access to all services</li>
              </ul>
              <p className="mt-2 font-semibold">
                This action cannot be reversed!
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Deactivate Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate your account? You can reactivate it later by
              contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateAccount}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isDeactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove
              all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmDelete" className="text-sm font-medium">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </Label>
            <Input
              id="confirmDelete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'DELETE'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountTab;
