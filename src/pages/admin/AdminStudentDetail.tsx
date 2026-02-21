const handleArchiveStudent = async () => {
  if (!student || !profile?.id) return;

  setActionLoading(true);

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("students")
      .update({
        archived_at: now,
        archived_by: profile.id,
        archive_reason: actionReason || null,
        status: "deleted", // optional if you track deleted status
        status_reason: actionReason || "Archived by admin",
        status_changed_at: now,
        status_changed_by: profile.id,
        updated_at: now,
      } as any)
      .eq("id", student.id);

    if (error) throw error;

    await logSecurityEvent({
      eventType: "custom",
      description: `Admin archived student account: ${studentName}`,
      severity: "medium",
      metadata: {
        studentId: student.id,
        studentName,
        reason: actionReason,
      },
      alert: false,
    });

    toast({
      title: "Student archived",
      description: `${studentName}'s account has been archived. You can restore it anytime.`,
    });

    setDeleteDialogOpen(false);
    setActionReason("");
    navigate("/admin/students");
  } catch (e: any) {
    console.error(e);

    toast({
      title: "Error",
      description: e?.message || "Failed to archive student account",
      variant: "destructive",
    });
  } finally {
    setActionLoading(false);
  }
};