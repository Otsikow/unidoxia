-- ============================================
-- FIX OFFER LETTERS, DOCUMENT REQUESTS & STUDENT VISIBILITY
-- Master migration for end-to-end visibility fix
-- ============================================

-- ============================================
-- 1. ENHANCE OFFERS TABLE - Single Source of Truth
-- ============================================

-- Add missing columns to offers table
DO $$
BEGIN
  -- Add student_id column (denormalized for faster queries)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'offers' 
                 AND column_name = 'student_id') THEN
    ALTER TABLE public.offers ADD COLUMN student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;

  -- Add university_id column (denormalized for faster queries)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'offers' 
                 AND column_name = 'university_id') THEN
    ALTER TABLE public.offers ADD COLUMN university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE;
  END IF;

  -- Add status column for offer lifecycle tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'offers' 
                 AND column_name = 'status') THEN
    ALTER TABLE public.offers ADD COLUMN status TEXT DEFAULT 'issued' 
      CHECK (status IN ('issued', 'viewed', 'accepted', 'declined'));
  END IF;

  -- Add conditions_summary for human-readable conditions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'offers' 
                 AND column_name = 'conditions_summary') THEN
    ALTER TABLE public.offers ADD COLUMN conditions_summary TEXT;
  END IF;

  -- Add tenant_id for multi-tenant filtering
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'offers' 
                 AND column_name = 'tenant_id') THEN
    ALTER TABLE public.offers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_student_id ON public.offers(student_id);
CREATE INDEX IF NOT EXISTS idx_offers_university_id ON public.offers(university_id);
CREATE INDEX IF NOT EXISTS idx_offers_application_id ON public.offers(application_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_tenant_id ON public.offers(tenant_id);

-- Backfill student_id, university_id, tenant_id from applications
UPDATE public.offers o
SET 
  student_id = a.student_id,
  university_id = p.university_id,
  tenant_id = u.tenant_id
FROM public.applications a
JOIN public.programs p ON a.program_id = p.id
JOIN public.universities u ON p.university_id = u.id
WHERE o.application_id = a.id
  AND (o.student_id IS NULL OR o.university_id IS NULL OR o.tenant_id IS NULL);

-- ============================================
-- 2. ENHANCE DOCUMENT_REQUESTS TABLE
-- ============================================

-- Add application_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'document_requests' 
                 AND column_name = 'application_id') THEN
    ALTER TABLE public.document_requests ADD COLUMN application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE;
  END IF;

  -- Add message_to_student for clear communication
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'document_requests' 
                 AND column_name = 'message_to_student') THEN
    ALTER TABLE public.document_requests ADD COLUMN message_to_student TEXT;
  END IF;

  -- Add requested_by_role to track who requested it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'document_requests' 
                 AND column_name = 'requested_by_role') THEN
    ALTER TABLE public.document_requests ADD COLUMN requested_by_role TEXT DEFAULT 'university'
      CHECK (requested_by_role IN ('university', 'admin', 'agent'));
  END IF;

  -- Add university_id for direct queries
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'document_requests' 
                 AND column_name = 'university_id') THEN
    ALTER TABLE public.document_requests ADD COLUMN university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE;
  END IF;
  
  -- Rename requested_at to created_at if it exists (some schemas use requested_at)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'document_requests' 
             AND column_name = 'requested_at') THEN
    -- Keep requested_at but ensure created_at also exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'document_requests' 
                   AND column_name = 'created_at') THEN
      ALTER TABLE public.document_requests ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_requests_application_id ON public.document_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_university_id ON public.document_requests(university_id);

-- ============================================
-- 3. RLS POLICIES FOR STUDENT VISIBILITY
-- ============================================

-- Enable RLS on offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Students can view their offers" ON public.offers;
DROP POLICY IF EXISTS "Universities can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can manage all offers" ON public.offers;
DROP POLICY IF EXISTS "Agents can view assigned student offers" ON public.offers;

-- Students can view offers for their applications
CREATE POLICY "Students can view their offers" ON public.offers
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

-- Universities can manage offers for their programs
CREATE POLICY "Universities can manage their offers" ON public.offers
  FOR ALL
  USING (
    university_id IN (
      SELECT u.id FROM public.universities u
      JOIN public.profiles p ON p.tenant_id = u.tenant_id
      WHERE p.id = auth.uid() AND p.role = 'partner'
    )
  )
  WITH CHECK (
    university_id IN (
      SELECT u.id FROM public.universities u
      JOIN public.profiles p ON p.tenant_id = u.tenant_id
      WHERE p.id = auth.uid() AND p.role = 'partner'
    )
  );

-- Admins can manage all offers
CREATE POLICY "Admins can manage all offers" ON public.offers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Agents can view offers for their assigned students
CREATE POLICY "Agents can view assigned student offers" ON public.offers
  FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.agents ag ON a.agent_id = ag.id
      WHERE ag.profile_id = auth.uid()
    )
  );

-- ============================================
-- 4. DOCUMENT REQUESTS RLS POLICIES
-- ============================================

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Students can view their document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Staff can manage document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Universities can manage document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Agents can view assigned student document requests" ON public.document_requests;

-- Students can view their own document requests
CREATE POLICY "Students can view their document requests" ON public.document_requests
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

-- Students can update their own document requests (e.g., upload documents)
CREATE POLICY "Students can update their document requests" ON public.document_requests
  FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

-- Staff can manage document requests
CREATE POLICY "Staff can manage document requests" ON public.document_requests
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Universities can manage their document requests
CREATE POLICY "Universities can manage document requests" ON public.document_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.universities u ON p.tenant_id = u.tenant_id
      WHERE p.id = auth.uid() 
        AND p.role = 'partner'
        AND (
          public.document_requests.university_id = u.id 
          OR public.document_requests.tenant_id = p.tenant_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.universities u ON p.tenant_id = u.tenant_id
      WHERE p.id = auth.uid() 
        AND p.role = 'partner'
        AND (
          public.document_requests.university_id = u.id 
          OR public.document_requests.tenant_id = p.tenant_id
        )
    )
  );

-- Agents can view document requests for assigned students
CREATE POLICY "Agents can view assigned student document requests" ON public.document_requests
  FOR SELECT
  USING (
    student_id IN (
      SELECT a.student_id FROM public.applications a
      JOIN public.agents ag ON a.agent_id = ag.id
      WHERE ag.profile_id = auth.uid()
    )
  );

-- ============================================
-- 5. OFFER_ISSUED EVENT TRIGGER - NOTIFICATIONS
-- ============================================

CREATE OR REPLACE FUNCTION notify_offer_issued()
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
  v_offer_type TEXT;
BEGIN
  -- Get student profile ID, agent, program, and university details
  SELECT 
    s.profile_id,
    ag.profile_id,
    p.name,
    u.name,
    u.tenant_id
  INTO 
    v_student_profile_id,
    v_agent_profile_id,
    v_program_name,
    v_university_name,
    v_tenant_id
  FROM public.applications a
  JOIN public.students s ON a.student_id = s.id
  LEFT JOIN public.agents ag ON a.agent_id = ag.id
  JOIN public.programs p ON a.program_id = p.id
  JOIN public.universities u ON p.university_id = u.id
  WHERE a.id = NEW.application_id;

  v_offer_type := CASE 
    WHEN NEW.offer_type = 'unconditional' THEN 'Unconditional'
    WHEN NEW.offer_type = 'conditional' THEN 'Conditional'
    ELSE 'Offer'
  END;

  -- Notify student
  IF v_student_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      type,
      title,
      content,
      metadata,
      action_url,
      read,
      created_at
    ) VALUES (
      v_tenant_id,
      v_student_profile_id,
      'offer_issued',
      v_offer_type || ' Offer Received! 🎉',
      'Congratulations! ' || v_university_name || ' has issued you a ' || LOWER(v_offer_type) || ' offer for ' || v_program_name || '. View your offer letter now.',
      jsonb_build_object(
        'offer_id', NEW.id,
        'application_id', NEW.application_id,
        'offer_type', NEW.offer_type,
        'program_name', v_program_name,
        'university_name', v_university_name,
        'letter_url', NEW.letter_url
      ),
      '/student/applications/' || NEW.application_id,
      false,
      NOW()
    );
  END IF;

  -- Notify agent if assigned
  IF v_agent_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      type,
      title,
      content,
      metadata,
      action_url,
      read,
      created_at
    ) VALUES (
      v_tenant_id,
      v_agent_profile_id,
      'offer_issued',
      'Student Received ' || v_offer_type || ' Offer',
      v_university_name || ' has issued a ' || LOWER(v_offer_type) || ' offer to your student for ' || v_program_name || '.',
      jsonb_build_object(
        'offer_id', NEW.id,
        'application_id', NEW.application_id,
        'offer_type', NEW.offer_type,
        'program_name', v_program_name,
        'university_name', v_university_name
      ),
      '/dashboard/applications',
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for offer insertions
DROP TRIGGER IF EXISTS trg_offer_issued ON public.offers;
CREATE TRIGGER trg_offer_issued
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_offer_issued();

-- Also notify on offer updates (e.g., status change, new letter uploaded)
CREATE OR REPLACE FUNCTION notify_offer_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_profile_id UUID;
  v_program_name TEXT;
  v_university_name TEXT;
  v_tenant_id UUID;
BEGIN
  -- Only notify if letter_url changes (new letter uploaded) or offer_type changes
  IF NEW.letter_url IS DISTINCT FROM OLD.letter_url OR NEW.offer_type IS DISTINCT FROM OLD.offer_type THEN
    SELECT 
      s.profile_id,
      p.name,
      u.name,
      u.tenant_id
    INTO 
      v_student_profile_id,
      v_program_name,
      v_university_name,
      v_tenant_id
    FROM public.applications a
    JOIN public.students s ON a.student_id = s.id
    JOIN public.programs p ON a.program_id = p.id
    JOIN public.universities u ON p.university_id = u.id
    WHERE a.id = NEW.application_id;

    IF v_student_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        tenant_id,
        user_id,
        type,
        title,
        content,
        metadata,
        action_url,
        read,
        created_at
      ) VALUES (
        v_tenant_id,
        v_student_profile_id,
        'offer_updated',
        'Offer Updated',
        v_university_name || ' has updated your offer for ' || v_program_name || '. Please review the changes.',
        jsonb_build_object(
          'offer_id', NEW.id,
          'application_id', NEW.application_id,
          'offer_type', NEW.offer_type,
          'program_name', v_program_name,
          'university_name', v_university_name
        ),
        '/student/applications/' || NEW.application_id,
        false,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_offer_updated ON public.offers;
CREATE TRIGGER trg_offer_updated
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_offer_updated();

-- ============================================
-- 6. DOCUMENT_REQUESTED EVENT TRIGGER
-- ============================================

-- Enhance the existing notify_document_request_change function
CREATE OR REPLACE FUNCTION notify_document_request_created()
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
  v_document_type TEXT;
BEGIN
  -- Get student profile ID
  SELECT s.profile_id, NEW.tenant_id
  INTO v_student_profile_id, v_tenant_id
  FROM public.students s
  WHERE s.id = NEW.student_id;

  -- Try to get application-related info if application_id is set
  IF NEW.application_id IS NOT NULL THEN
    SELECT 
      ag.profile_id,
      p.name,
      u.name
    INTO 
      v_agent_profile_id,
      v_program_name,
      v_university_name
    FROM public.applications a
    LEFT JOIN public.agents ag ON a.agent_id = ag.id
    JOIN public.programs p ON a.program_id = p.id
    JOIN public.universities u ON p.university_id = u.id
    WHERE a.id = NEW.application_id;
  END IF;

  v_document_type := COALESCE(NEW.document_type, 'Document');

  -- Notify student
  IF v_student_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      type,
      title,
      content,
      metadata,
      action_url,
      read,
      created_at
    ) VALUES (
      v_tenant_id,
      v_student_profile_id,
      'document_requested',
      'Document Requested',
      COALESCE(v_university_name, 'A university') || ' has requested you to upload a ' || 
        REPLACE(v_document_type, '_', ' ') || 
        CASE WHEN v_program_name IS NOT NULL THEN ' for your application to ' || v_program_name ELSE '' END || '.',
      jsonb_build_object(
        'request_id', NEW.id,
        'document_type', v_document_type,
        'application_id', NEW.application_id,
        'program_name', v_program_name,
        'university_name', v_university_name,
        'notes', NEW.notes,
        'message', NEW.message_to_student
      ),
      '/student/documents',
      false,
      NOW()
    );
  END IF;

  -- Notify agent if assigned
  IF v_agent_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      type,
      title,
      content,
      metadata,
      action_url,
      read,
      created_at
    ) VALUES (
      v_tenant_id,
      v_agent_profile_id,
      'document_requested',
      'Document Requested for Student',
      COALESCE(v_university_name, 'A university') || ' has requested a ' || 
        REPLACE(v_document_type, '_', ' ') || ' from your student.',
      jsonb_build_object(
        'request_id', NEW.id,
        'document_type', v_document_type,
        'application_id', NEW.application_id
      ),
      '/dashboard/applications',
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_request_created ON public.document_requests;
CREATE TRIGGER trg_document_request_created
  AFTER INSERT ON public.document_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_request_created();

-- ============================================
-- 7. APPLICATION STATUS CHANGE TO OFFER TRIGGER
-- ============================================

-- When application status changes to conditional_offer or unconditional_offer,
-- ensure an offer record exists
CREATE OR REPLACE FUNCTION ensure_offer_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_type TEXT;
  v_student_id UUID;
  v_university_id UUID;
  v_tenant_id UUID;
  v_existing_offer_id UUID;
BEGIN
  -- Only process when status changes to offer statuses
  IF NEW.status IN ('conditional_offer', 'unconditional_offer') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('conditional_offer', 'unconditional_offer') OR OLD.status != NEW.status) THEN
    
    v_offer_type := CASE 
      WHEN NEW.status = 'conditional_offer' THEN 'conditional'
      WHEN NEW.status = 'unconditional_offer' THEN 'unconditional'
    END;

    -- Get required IDs
    SELECT 
      NEW.student_id,
      p.university_id,
      u.tenant_id
    INTO 
      v_student_id,
      v_university_id,
      v_tenant_id
    FROM public.programs p
    JOIN public.universities u ON p.university_id = u.id
    WHERE p.id = NEW.program_id;

    -- Check if offer already exists
    SELECT id INTO v_existing_offer_id
    FROM public.offers
    WHERE application_id = NEW.id
    LIMIT 1;

    IF v_existing_offer_id IS NULL THEN
      -- Create offer record (letter_url can be updated later)
      INSERT INTO public.offers (
        application_id,
        student_id,
        university_id,
        tenant_id,
        offer_type,
        status,
        letter_url,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        v_student_id,
        v_university_id,
        v_tenant_id,
        v_offer_type,
        'issued',
        '', -- Will be updated when university uploads letter
        NOW(),
        NOW()
      );
    ELSE
      -- Update existing offer
      UPDATE public.offers
      SET 
        offer_type = v_offer_type,
        status = 'issued',
        updated_at = NOW()
      WHERE id = v_existing_offer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_offer_on_status ON public.applications;
CREATE TRIGGER trg_ensure_offer_on_status
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION ensure_offer_on_status_change();

-- ============================================
-- 8. HELPER FUNCTION TO GET STUDENT OFFERS
-- ============================================

CREATE OR REPLACE FUNCTION get_student_offers(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  application_id UUID,
  offer_type TEXT,
  status TEXT,
  letter_url TEXT,
  conditions JSONB,
  conditions_summary TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  program_name TEXT,
  university_name TEXT,
  university_logo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.application_id,
    o.offer_type::TEXT,
    o.status::TEXT,
    o.letter_url,
    o.conditions,
    o.conditions_summary,
    o.expiry_date,
    o.created_at,
    o.updated_at,
    p.name AS program_name,
    u.name AS university_name,
    u.logo_url AS university_logo_url
  FROM public.offers o
  JOIN public.applications a ON o.application_id = a.id
  JOIN public.programs p ON a.program_id = p.id
  JOIN public.universities u ON p.university_id = u.id
  WHERE o.student_id = p_student_id
    OR a.student_id = p_student_id
  ORDER BY o.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_offers(UUID) TO authenticated;

-- ============================================
-- 9. HELPER FUNCTION TO GET STUDENT DOCUMENT REQUESTS
-- ============================================

CREATE OR REPLACE FUNCTION get_student_document_requests(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  application_id UUID,
  document_type TEXT,
  status TEXT,
  notes TEXT,
  message_to_student TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  program_name TEXT,
  university_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.id,
    dr.application_id,
    dr.document_type,
    dr.status,
    dr.notes,
    dr.message_to_student,
    dr.due_date,
    COALESCE(dr.created_at, dr.requested_at) AS created_at,
    p.name AS program_name,
    u.name AS university_name
  FROM public.document_requests dr
  LEFT JOIN public.applications a ON dr.application_id = a.id
  LEFT JOIN public.programs p ON a.program_id = p.id
  LEFT JOIN public.universities u ON p.university_id = u.id
  WHERE dr.student_id = p_student_id
  ORDER BY COALESCE(dr.created_at, dr.requested_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_document_requests(UUID) TO authenticated;

-- ============================================
-- 10. ADD UNIQUE CONSTRAINT TO OFFERS
-- ============================================

-- Ensure one offer per application (can be updated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'offers_application_id_key' AND conrelid = 'public.offers'::regclass
  ) THEN
    -- Remove duplicates first (keep the latest)
    DELETE FROM public.offers o1
    USING public.offers o2
    WHERE o1.application_id = o2.application_id 
      AND o1.created_at < o2.created_at;
    
    -- Add unique constraint
    ALTER TABLE public.offers ADD CONSTRAINT offers_application_id_key UNIQUE (application_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already exist or there may be duplicates we couldn't remove
  RAISE NOTICE 'Could not add unique constraint on offers.application_id: %', SQLERRM;
END $$;

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION notify_offer_issued() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_offer_updated() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_document_request_created() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_offer_on_status_change() TO authenticated;

-- ============================================
-- 12. ADD REALTIME SUPPORT
-- ============================================

-- Enable realtime for offers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;

-- Enable realtime for document_requests (if not already)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;
EXCEPTION WHEN OTHERS THEN
  -- Already added
  RAISE NOTICE 'document_requests already in realtime publication';
END $$;

-- ============================================
-- SUMMARY
-- ============================================
-- This migration:
-- 1. Enhanced offers table with student_id, university_id, status, conditions_summary
-- 2. Enhanced document_requests table with application_id, message_to_student, requested_by_role
-- 3. Added RLS policies for students to view their offers and document requests
-- 4. Added RLS policies for agents to view assigned student data
-- 5. Created OFFER_ISSUED notification trigger
-- 6. Created DOCUMENT_REQUESTED notification trigger
-- 7. Created trigger to auto-create offer when application status changes
-- 8. Added helper functions for student dashboard queries
-- 9. Enabled realtime subscriptions for offers and document_requests
