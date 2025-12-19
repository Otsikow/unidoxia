student_documents: {
  Row: {
    id: string
    student_id: string

    document_type: string
    file_name: string
    file_size: number
    mime_type: string
    storage_path: string

    status: Database["public"]["Enums"]["student_document_status"]

    admin_review_status: string | null
    admin_review_notes: string | null
    admin_reviewed_at: string | null
    admin_reviewed_by: string | null

    verified_status: string | null
    verified_at: string | null
    verified_by: string | null
    verification_notes: string | null

    university_access_approved: boolean | null
    university_access_approved_at: string | null
    university_access_approved_by: string | null

    checksum: string | null
    created_at: string | null
    updated_at: string | null
  }

  Insert: {
    id?: string
    student_id: string

    document_type: string
    file_name: string
    file_size: number
    mime_type: string
    storage_path: string

    status?: Database["public"]["Enums"]["student_document_status"]

    admin_review_status?: string | null
    admin_review_notes?: string | null
    admin_reviewed_at?: string | null
    admin_reviewed_by?: string | null

    verified_status?: string | null
    verified_at?: string | null
    verified_by?: string | null
    verification_notes?: string | null

    university_access_approved?: boolean | null
    university_access_approved_at?: string | null
    university_access_approved_by?: string | null

    checksum?: string | null
    created_at?: string | null
    updated_at?: string | null
  }

  Update: {
    id?: string
    student_id?: string

    document_type?: string
    file_name?: string
    file_size?: number
    mime_type?: string
    storage_path?: string

    status?: Database["public"]["Enums"]["student_document_status"]

    admin_review_status?: string | null
    admin_review_notes?: string | null
    admin_reviewed_at?: string | null
    admin_reviewed_by?: string | null

    verified_status?: string | null
    verified_at?: string | null
    verified_by?: string | null
    verification_notes?: string | null

    university_access_approved?: boolean | null
    university_access_approved_at?: string | null
    university_access_approved_by?: string | null

    checksum?: string | null
    created_at?: string | null
    updated_at?: string | null
  }

  Relationships: [
    {
      foreignKeyName: "student_documents_student_id_fkey"
      columns: ["student_id"]
      isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "student_documents_verified_by_fkey"
      columns: ["verified_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "student_documents_verified_by_fkey"
      columns: ["verified_by"]
      isOneToOne: false
      referencedRelation: "staff_profiles"
      referencedColumns: ["id"]
    }
  ]
}
