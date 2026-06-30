import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'
import { supabaseAdmin, ATTACHMENTS_BUCKET } from '@/lib/supabase-admin'
import { getMembershipAndPermissions } from '@/lib/permissions'

// POST /api/attachments — upload file for an expense
export async function POST(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const expenseId = formData.get('expenseId') as string | null

    if (!file || !expenseId) {
      return NextResponse.json({ error: 'file and expenseId are required' }, { status: 400 })
    }

    // Verify expense exists and user is member of that family
    const expense = await db.expense.findUnique({ where: { id: expenseId } })
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const access = await getMembershipAndPermissions(expense.familyId, auth.userId)
    if (!access) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }
    if (!access.permissions.canUploadAttachment) {
      return NextResponse.json({ error: 'You do not have permission to upload attachments' }, { status: 403 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only images and PDFs are allowed' }, { status: 400 })
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
    }

    // Build storage path: familyId/expenseId/timestamp_filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${expense.familyId}/${expenseId}/${Date.now()}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(ATTACHMENTS_BUCKET)
      .getPublicUrl(storagePath)

    const fileUrl = urlData.publicUrl

    // Save attachment record to DB
    const attachment = await db.attachment.create({
      data: {
        expenseId,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: auth.userId,
      },
    })

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (error) {
    console.error('Attachment POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/attachments?id=xxx — delete attachment
export async function DELETE(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const attachment = await db.attachment.findUnique({
      where: { id },
      include: { expense: true },
    })
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: attachment.expense.familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const isAdmin = membership.role === 'admin'
    const isUploader = attachment.uploadedBy === auth.userId
    if (!isAdmin && !isUploader) {
      return NextResponse.json({ error: 'Only the uploader or an admin can delete this' }, { status: 403 })
    }

    // Extract storage path from URL
    const url = new URL(attachment.fileUrl)
    const storagePathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/expense-attachments\/(.+)/)
    if (storagePathMatch) {
      const storagePath = storagePathMatch[1]
      await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([storagePath])
    }

    await db.attachment.delete({ where: { id } })

    return NextResponse.json({ message: 'Attachment deleted' })
  } catch (error) {
    console.error('Attachment DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
