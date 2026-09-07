'use client';

/**
 * Google Drive sync for personal notes — each note is exported as a PDF into
 * an "Ogeemo Notes" folder in the user's own Google Drive. Uses the
 * drive.file access token captured at sign-in (least privilege: only files
 * this app creates are touched). The app remains the source of truth; Drive
 * holds dated PDF snapshots (one revision per save).
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const NOTES_FOLDER_NAME = 'Ogeemo Notes';

export interface DriveSaveResult {
    fileId: string;
    webViewLink: string;
}

export function driveFileLink(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
}

function sanitizeFileName(subject: string): string {
    const cleaned = subject
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    return `${(cleaned || 'Untitled Note').slice(0, 100)}.pdf`;
}

/** Finds or creates the "Ogeemo Notes" folder. Returns its Drive file id. */
export async function ensureNotesFolder(accessToken: string): Promise<string> {
    const params = new URLSearchParams({
        q: `name='${NOTES_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });
    const listRes = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listRes.ok) throw new Error(`Drive folder lookup failed (${listRes.status}).`);
    const listData = await listRes.json();
    if (Array.isArray(listData.files) && listData.files.length > 0) {
        return listData.files[0].id as string;
    }

    const createRes = await fetch(`${DRIVE_API}/files?fields=id`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: NOTES_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    });
    if (!createRes.ok) throw new Error(`Drive folder creation failed (${createRes.status}).`);
    const created = await createRes.json();
    return created.id as string;
}

/** Generates the note's PDF — the same layout the Print button produces. */
export async function generateNotePdf(subject: string, content: string, metaLine: string): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 54;
    const maxWidth = pageWidth - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const subjectLines: string[] = doc.splitTextToSize(subject, maxWidth);
    doc.text(subjectLines, margin, 64);
    let y = 64 + subjectLines.length * 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(metaLine, margin, y);
    y += 26;

    doc.setFontSize(11);
    doc.setTextColor(20);
    const bodyLines: string[] = doc.splitTextToSize(content || '(This note is empty.)', maxWidth);
    const lineHeight = 14;
    for (const line of bodyLines) {
        if (y + lineHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
    }
    return doc.output('blob');
}

/** Creates or updates the note's PDF in the user's Drive. Returns the link. */
export async function saveNoteToDrive(
    accessToken: string,
    subject: string,
    content: string,
    existingFileId?: string
): Promise<DriveSaveResult> {
    const folderId = await ensureNotesFolder(accessToken);
    const fileName = sanitizeFileName(subject);
    const metaLine = `Saved to Google Drive ${new Date().toLocaleString()}`;
    const pdfBlob = await generateNotePdf(subject, content, metaLine);

    const metadata = {
        name: fileName,
        mimeType: 'application/pdf',
        ...(existingFileId ? {} : { parents: [folderId] }),
    };
    const boundary = `ogeemo-notes-${Date.now()}`;
    const prefix = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
    const suffix = `\r\n--${boundary}--`;
    const body = new Blob([prefix, pdfBlob, suffix], { type: `multipart/related; boundary=${boundary}` });

    const isUpdate = !!existingFileId;
    const url = isUpdate
        ? `${DRIVE_UPLOAD_API}/files/${existingFileId}?uploadType=multipart&fields=id,webViewLink`
        : `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`;
    const res = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
    });
    if (res.status === 404 && isUpdate) {
        // The Drive copy was deleted by the user — recreate it.
        return saveNoteToDrive(accessToken, subject, content, undefined);
    }
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Google Drive upload failed (${res.status}). ${detail.slice(0, 120)}`);
    }
    const fileData = await res.json();
    const fileId = fileData.id as string;
    return { fileId, webViewLink: (fileData.webViewLink as string) || driveFileLink(fileId) };
}