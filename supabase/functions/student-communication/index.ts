import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.2";
import { createStudentCommunicationHandler } from "../_shared/studentCommunicationHandler.ts";
Deno.serve(
  createStudentCommunicationHandler({
    createClient,
    env: (key) => Deno.env.get(key),
    fetch,
  }),
);
