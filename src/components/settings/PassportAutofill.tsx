import { useRef, useState } from "react";
import { CheckCircle2, FileScan, Loader2, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabaseEdgeFunctions";

type Extraction = {
  full_name: string | null; given_names: string | null; surname: string | null;
  date_of_birth: string | null; passport_number: string | null; passport_expiry: string | null;
  nationality: string | null; sex: string | null; issuing_country: string | null;
  confidence: number; needs_review: boolean;
};

export function PassportAutofill({ profile, roleData, onSaved }: { profile: any; roleData: any; onSaved?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const extract = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const base64 = await toBase64(file);
      const { data, error } = await invokeEdgeFunction<{ extraction: Extraction }>("passport-ocr", {
        body: { mimeType: file.type, imageBase64: base64 },
        accessToken: (await supabase.auth.getSession()).data.session?.access_token,
      });
      if (error) throw error;
      setExtraction(data?.extraction ?? null);
      if (!data?.extraction) throw new Error("No passport details were detected.");
    } catch (error: any) {
      toast({ title: "Passport could not be read", description: error.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!extraction || !roleData?.data?.id) return;
    setBusy(true);
    try {
      const profileUpdate: Record<string, string> = {};
      if (extraction.full_name) profileUpdate.full_name = extraction.full_name;
      if (extraction.nationality) profileUpdate.country = extraction.nationality;
      if (Object.keys(profileUpdate).length) {
        const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", profile.id);
        if (error) throw error;
      }
      const studentUpdate = {
        legal_name: extraction.full_name,
        nationality: extraction.nationality,
        date_of_birth: extraction.date_of_birth,
        passport_number: extraction.passport_number,
        passport_expiry: extraction.passport_expiry,
        passport_ocr_status: extraction.needs_review ? "needs_review" : "confirmed",
        passport_ocr_confidence: extraction.confidence,
        passport_ocr_processed_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("students").update(studentUpdate).eq("id", roleData.data.id);
      if (error) throw error;
      toast({ title: "Passport details saved", description: "Please still compare every field with the passport before submitting an application." });
      setFile(null); setExtraction(null); if (inputRef.current) inputRef.current.value = ""; onSaved?.();
    } catch (error: any) {
      toast({ title: "Could not save passport details", description: error.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
    <div><h3 className="flex items-center gap-2 font-semibold"><FileScan className="h-4 w-4" />Passport autofill</h3>
      <p className="text-sm text-muted-foreground mt-1">Upload the passport photo page and we will extract the details for your review.</p></div>
    <div className="flex flex-wrap items-center gap-3">
      <Input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={busy} />
      <Button type="button" variant="outline" onClick={extract} disabled={!file || busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{busy ? "Reading passport..." : "Read passport"}</Button>
    </div>
    <p className="text-xs text-muted-foreground">JPG, PNG or WEBP only, maximum 8 MB. Do not upload a visa, national ID, or another person's passport.</p>
    {extraction && <div className="space-y-3 rounded-md border bg-background p-3">
      <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>Review before saving</AlertTitle><AlertDescription>OCR can make mistakes. Correct any field in your profile after saving.</AlertDescription></Alert>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        {([["Full name", extraction.full_name], ["Date of birth", extraction.date_of_birth], ["Passport number", extraction.passport_number], ["Passport expiry", extraction.passport_expiry], ["Nationality", extraction.nationality], ["Issuing country", extraction.issuing_country]] as const).map(([label, value]) => <div key={label}><Label>{label}</Label><p className="font-medium">{value || "Not detected"}</p></div>)}
      </div>
      <Button type="button" onClick={confirm} disabled={busy}>Confirm and fill profile</Button>
    </div>}
  </div>;
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
