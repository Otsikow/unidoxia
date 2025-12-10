import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { studentRecordQueryKey } from '@/hooks/useStudentRecord';

interface ProfileInfoTabProps {
  profile: any;
  roleData: any;
}

const ProfileInfoTab = ({ profile, roleData }: ProfileInfoTabProps) => {
  const { toast } = useToast();
  const { refreshProfile, user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<
    | {
        type: 'success' | 'error';
        title: string;
        description: string;
      }
    | null
  >(null);

  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    country: profile.country || '',
  });

  useEffect(() => {
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      country: profile.country || '',
    });
  }, [profile.country, profile.full_name, profile.phone]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // Delete old photo if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-photos')
            .remove([`${profile.id}/${oldPath}`]);
        }
      }

      // Upload new photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({
        title: 'Success',
        description: 'Profile photo updated successfully',
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload profile photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setSaveStatus(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          country: formData.country,
        })
        .eq('id', profile.id)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single();

      if (error) throw error;

      setFormData({
        full_name: data?.full_name ?? formData.full_name,
        phone: data?.phone ?? formData.phone,
        country: data?.country ?? formData.country,
      });

      await Promise.all([
        refreshProfile(),
        queryClient.invalidateQueries({
          queryKey: ['roleData', profile?.id],
        }),
        profile?.role === 'student'
          ? queryClient.invalidateQueries({
              queryKey: studentRecordQueryKey(user?.id),
            })
          : Promise.resolve(),
      ]);

      const successState = {
        type: 'success' as const,
        title: 'Profile saved',
        description: 'Your profile details were updated successfully.',
      };
      setSaveStatus(successState);
      toast({
        title: successState.title,
        description: successState.description,
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const failureState = {
        type: 'error' as const,
        title: 'Update failed',
        description: error.message || 'Failed to update profile. Please try again.',
      };
      setSaveStatus(failureState);
      toast({
        title: failureState.title,
        description: failureState.description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information and profile photo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {saveStatus && (
            <Alert variant={saveStatus.type === 'error' ? 'destructive' : 'default'}>
              <AlertTitle>{saveStatus.title}</AlertTitle>
              <AlertDescription>{saveStatus.description}</AlertDescription>
            </Alert>
          )}

          {/* Profile Photo Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} />
                <AvatarFallback className="text-xl">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                onClick={handleProfilePhotoClick}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <h3 className="font-semibold">{profile.full_name}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                Role: {profile.role}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="Enter your country"
              />
            </div>
          </div>

          {/* Role-specific information (read-only) */}
          {roleData?.type === 'agent' && roleData.data && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Agent Information</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Company Name</Label>
                  <Input
                    value={roleData.data.company_name || 'Not set'}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Verification Status</Label>
                  <Input
                    value={roleData.data.verification_status || 'pending'}
                    disabled
                    className="bg-muted capitalize"
                  />
                </div>
              </div>
            </div>
          )}

          {roleData?.type === 'student' && roleData.data && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Student Information</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Nationality</Label>
                  <Input
                    value={roleData.data.nationality || 'Not set'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileInfoTab;
