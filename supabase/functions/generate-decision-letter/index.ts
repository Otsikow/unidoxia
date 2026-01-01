import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { applicationId, offerId } = await req.json()

    if (!applicationId || !offerId) {
      throw new Error('Missing applicationId or offerId')
    }

    // Fetch Application, Student, and University details
    const { data: application, error: appError } = await supabaseClient
      .from('applications')
      .select(`
        *,
        student:students(
            *,
            profile:profiles(*)
        ),
        program:programs(
            *,
            university:universities(*)
        )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) throw new Error('Application not found')

    const { data: offer, error: offerError } = await supabaseClient
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single()

    if (offerError || !offer) throw new Error('Offer not found')

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const fontSize = 12
    const lineHeight = fontSize * 1.5

    let y = height - 50

    // Logo (Placeholder if not available)
    // if (application.program.university.logo_url) { ... }

    // Header
    page.drawText(application.program.university.name, {
      x: 50,
      y,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    })
    y -= 40

    // Date
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y,
      size: 10,
      font: font,
    })
    y -= 30

    // Recipient
    const studentName = application.student.legal_name || `${application.student.first_name} ${application.student.last_name}`
    page.drawText(`Dear ${studentName},`, {
      x: 50,
      y,
      size: fontSize,
      font: font,
    })
    y -= lineHeight * 2

    // Title
    const title = offer.offer_type === 'conditional' ? 'CONDITIONAL OFFER OF ADMISSION' : 'UNCONDITIONAL OFFER OF ADMISSION'
    page.drawText(title, {
      x: 50,
      y,
      size: 14,
      font: boldFont,
    })
    y -= lineHeight * 2

    // Content
    const content = `We are pleased to offer you a place in the ${application.program.name} program at ${application.program.university.name}.`
    page.drawText(content, {
      x: 50,
      y,
      size: fontSize,
      font: font,
      maxWidth: width - 100,
    })
    y -= lineHeight * 3

    // Conditions
    if (offer.offer_type === 'conditional') {
      page.drawText('Conditions of Offer:', {
        x: 50,
        y,
        size: fontSize,
        font: boldFont,
      })
      y -= lineHeight

      const conditions = offer.conditions_summary || 'Please refer to the portal for detailed conditions.'
      page.drawText(conditions, {
        x: 50,
        y,
        size: fontSize,
        font: font,
        maxWidth: width - 100,
      })
      y -= lineHeight * 3
    }

    // Fees and Next Steps
    // You would typically fetch this from the program or offer details
    page.drawText('Next Steps:', {
        x: 50,
        y,
        size: fontSize,
        font: boldFont,
    })
    y -= lineHeight

    const nextSteps = [
        `1. Accept this offer in your student dashboard.`,
        `2. Pay any required deposit fees.`,
        `3. Upload required documents for CAS/I-20 issuance.`,
        `4. Apply for your visa.`
    ]

    for (const step of nextSteps) {
        page.drawText(step, {
            x: 50,
            y,
            size: fontSize,
            font: font,
            maxWidth: width - 100,
        })
        y -= lineHeight
    }

    y -= lineHeight * 2

    page.drawText('Congratulations on your achievement!', {
        x: 50,
        y,
        size: fontSize,
        font: font
    })

    // Footer
    page.drawText('This document is electronically generated and does not require a signature.', {
        x: 50,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
    })

    const pdfBytes = await pdfDoc.save()

    // Upload to Storage
    const fileName = `${applicationId}/${offerId}_${offer.offer_type}_offer.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('application-documents')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Update Offer with URL
    const { error: updateError } = await supabaseClient
      .from('offers')
      .update({
        letter_url: fileName, // Store the storage path
        status: 'issued'
      })
      .eq('id', offerId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, message: 'Decision letter generated', url: fileName }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
