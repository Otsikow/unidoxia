-- Fix notification coverage for admin registration and payment success
-- Add admin notifications on new user registrations and payment confirmations
-- Enhance student application status notifications with reference and next-action details

-- ============================================
-- 1. ADMIN REGISTRATION NOTIFICATIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_user_role TEXT;
  v_full_name TEXT;
  v_user_email TEXT;
  v_registered_at TIMESTAMPTZ;
BEGIN
  v_user_role := NEW.role::TEXT;

  IF v_user_role NOT IN ('student', 'agent', 'partner', 'university') THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(NEW.full_name, 'New user');
  v_user_email := COALESCE(NEW.email, '');
  v_registered_at := COALESCE(NEW.created_at, NOW());

  FOR v_admin IN
    SELECT id, tenant_id
    FROM public.profiles
    WHERE role = 'admin'
  LOOP
    PERFORM public.create_notification(
      v_admin.tenant_id,
      v_admin.id,
      'signup',
      'New user registration',
      v_full_name || ' registered as ' || v_user_role ||
      CASE WHEN v_user_email <> '' THEN ' (' || v_user_email || ')' ELSE '' END ||
      '. Registered at ' || TO_CHAR(v_registered_at, 'YYYY-MM-DD HH24:MI:SS TZ') || '.',
      jsonb_build_object(
        'category', 'new_signups',
        'type', 'registration',
        'user_id', NEW.id,
        'user_name', v_full_name,
        'user_role', v_user_role,
        'email', v_user_email,
        'registered_at', v_registered_at
      ),
      '/admin/users'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_user ON public.profiles;
CREATE TRIGGER trg_notify_admin_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_user();

-- ============================================
-- 2. ADMIN PAYMENT SUCCESS NOTIFICATIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_admin_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_student_id UUID;
  v_profile_id UUID;
  v_user_name TEXT;
  v_user_role TEXT;
  v_plan_code TEXT;
  v_plan_label TEXT;
  v_amount NUMERIC;
  v_currency TEXT;
  v_payment_time TIMESTAMPTZ;
BEGIN
  IF NEW.status IS DISTINCT FROM 'succeeded' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'succeeded' THEN
    RETURN NEW;
  END IF;

  v_payment_time := COALESCE(NEW.updated_at, NEW.created_at, NOW());
  v_currency := COALESCE(NEW.currency, 'USD');
  v_amount := COALESCE(NEW.amount_cents, 0) / 100.0;
  v_plan_code := COALESCE(NEW.metadata->>'plan_code', NEW.metadata->>'plan', '');
  v_student_id := NULLIF(NEW.metadata->>'student_id', '')::UUID;

  IF v_student_id IS NOT NULL THEN
    SELECT s.profile_id,
           COALESCE(s.legal_name, s.preferred_name, p.full_name, 'Student'),
           COALESCE(p.role::TEXT, 'student')
    INTO v_profile_id, v_user_name, v_user_role
    FROM public.students s
    LEFT JOIN public.profiles p ON s.profile_id = p.id
    WHERE s.id = v_student_id;
  ELSIF NEW.application_id IS NOT NULL THEN
    SELECT s.profile_id,
           COALESCE(s.legal_name, s.preferred_name, p.full_name, 'Student'),
           COALESCE(p.role::TEXT, 'student')
    INTO v_profile_id, v_user_name, v_user_role
    FROM public.applications a
    JOIN public.students s ON a.student_id = s.id
    LEFT JOIN public.profiles p ON s.profile_id = p.id
    WHERE a.id = NEW.application_id;
  END IF;

  v_user_name := COALESCE(v_user_name, 'A user');
  v_user_role := COALESCE(v_user_role, 'student');

  v_plan_label := CASE
    WHEN v_plan_code = 'self_service' THEN '$49'
    WHEN v_plan_code = 'agent_supported' THEN '$200'
    WHEN v_plan_code = 'free' THEN '$0'
    WHEN v_amount = 0 THEN '$0'
    ELSE '$' || TRIM(TO_CHAR(v_amount, 'FM999999990.00'))
  END;

  FOR v_admin IN
    SELECT id, tenant_id
    FROM public.profiles
    WHERE role = 'admin'
  LOOP
    PERFORM public.create_notification(
      v_admin.tenant_id,
      v_admin.id,
      'payment',
      'Payment confirmed',
      v_user_name || ' (' || v_user_role || ') completed a ' || v_plan_label || ' payment of ' ||
      v_currency || ' ' || TRIM(TO_CHAR(v_amount, 'FM999999990.00')) ||
      ' on ' || TO_CHAR(v_payment_time, 'YYYY-MM-DD HH24:MI:SS TZ') || '.',
      jsonb_build_object(
        'category', 'payment_events',
        'type', 'payment',
        'user_name', v_user_name,
        'user_role', v_user_role,
        'plan', v_plan_label,
        'amount', v_amount,
        'currency', v_currency,
        'payment_id', NEW.id,
        'paid_at', v_payment_time
      ),
      '/admin/payments'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_payment_success ON public.payments;
CREATE TRIGGER trg_notify_admin_payment_success
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_payment_success();

-- ============================================
-- 3. ENHANCE STUDENT APPLICATION STATUS NOTIFICATIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_profile_id UUID;
  v_agent_profile_id UUID;
  v_program_name TEXT;
  v_university_name TEXT;
  v_tenant_id UUID;
  v_status_message TEXT;
  v_next_action TEXT;
BEGIN
  SELECT
    s.profile_id,
    ag.profile_id,
    p.name,
    u.name,
    apps.tenant_id
  INTO
    v_student_profile_id,
    v_agent_profile_id,
    v_program_name,
    v_university_name,
    v_tenant_id
  FROM public.applications apps
  JOIN public.students s ON apps.student_id = s.id
  LEFT JOIN public.agents ag ON apps.agent_id = ag.id
  JOIN public.programs p ON apps.program_id = p.id
  JOIN public.universities u ON p.university_id = u.id
  WHERE apps.id = NEW.id;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_status_message := CASE NEW.status
      WHEN 'draft' THEN 'saved as a draft'
      WHEN 'submitted' THEN 'has been submitted successfully'
      WHEN 'under_review' THEN 'is now under review by the university'
      WHEN 'documents_required' THEN 'requires additional documents'
      WHEN 'conditional_offer' THEN 'has received a conditional offer'
      WHEN 'unconditional_offer' THEN 'has received an unconditional offer'
      WHEN 'offer_accepted' THEN 'offer has been accepted'
      WHEN 'cas_issued' THEN 'CAS has been issued'
      WHEN 'visa_applied' THEN 'visa application submitted'
      WHEN 'visa_granted' THEN 'visa has been granted'
      WHEN 'enrolled' THEN 'enrollment is complete'
      WHEN 'rejected' THEN 'was not successful this time'
      WHEN 'withdrawn' THEN 'has been withdrawn'
      ELSE 'status has been updated to ' || NEW.status
    END;

    v_next_action := CASE NEW.status
      WHEN 'documents_required' THEN 'Upload the requested documents in your dashboard.'
      WHEN 'conditional_offer' THEN 'Review the offer conditions and respond in your dashboard.'
      WHEN 'unconditional_offer' THEN 'Accept your offer in the dashboard when ready.'
      WHEN 'offer_accepted' THEN 'Prepare your visa documentation and next steps.'
      WHEN 'cas_issued' THEN 'Use your CAS to apply for a visa.'
      WHEN 'visa_applied' THEN 'Await the visa decision and monitor updates.'
      WHEN 'visa_granted' THEN 'Complete enrollment and travel preparations.'
      WHEN 'rejected' THEN 'Review your options and contact support if needed.'
      WHEN 'withdrawn' THEN 'Contact your advisor if you want to reapply.'
      ELSE NULL
    END;

    IF v_student_profile_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_tenant_id,
        v_student_profile_id,
        'application_status',
        CASE NEW.status
          WHEN 'conditional_offer' THEN '🎉 Congratulations! Offer Received'
          WHEN 'unconditional_offer' THEN '🎉 Congratulations! Offer Received'
          WHEN 'cas_issued' THEN '📄 CAS Issued'
          WHEN 'visa_granted' THEN '🎉 Visa Granted!'
          WHEN 'enrolled' THEN '🎓 Enrolled Successfully!'
          WHEN 'rejected' THEN 'Application Update'
          WHEN 'documents_required' THEN '📋 Documents Required'
          ELSE 'Application Status Updated'
        END,
        'Reference ' || NEW.id || ': Your application to ' || v_program_name || ' at ' || v_university_name ||
        ' ' || v_status_message ||
        CASE WHEN v_next_action IS NOT NULL THEN ' Next action: ' || v_next_action ELSE '' END || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'application_reference', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'program_name', v_program_name,
          'university_name', v_university_name,
          'next_action', v_next_action,
          'updated_at', NOW()
        ),
        '/student/applications/' || NEW.id
      );
    END IF;

    IF v_agent_profile_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_tenant_id,
        v_agent_profile_id,
        'application_status',
        'Application Status Updated',
        'Reference ' || NEW.id || ': Application to ' || v_program_name || ' at ' || v_university_name ||
        ' ' || v_status_message || '.',
        jsonb_build_object(
          'application_id', NEW.id,
          'application_reference', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'program_name', v_program_name,
          'university_name', v_university_name,
          'updated_at', NOW()
        ),
        '/dashboard/applications'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_status_change ON public.applications;
CREATE TRIGGER trg_application_status_change
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();
