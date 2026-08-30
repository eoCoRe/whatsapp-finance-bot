import { google } from 'googleapis';

function getDriveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

// Cria uma cópia da planilha no Drive da Service Account (backup fora da VM).
// Se GOOGLE_BACKUP_SHARE_EMAIL estiver definido, compartilha a cópia com essa
// conta pra ficar visível no Google Drive do usuário.
export async function backupPlanilha(): Promise<void> {
  const drive = getDriveClient();
  const fileId = process.env.GOOGLE_SPREADSHEET_ID!;

  const original = await drive.files.get({ fileId, fields: 'name, parents' });
  const dataStr = new Date().toLocaleDateString('pt-BR');
  const nomeBackup = `[Backup ${dataStr}] ${original.data.name ?? 'Planilha'}`;

  const copy = await drive.files.copy({
    fileId,
    requestBody: {
      name: nomeBackup,
      parents: original.data.parents ?? undefined,
    },
  });

  const shareEmail = process.env.GOOGLE_BACKUP_SHARE_EMAIL;
  if (shareEmail && copy.data.id) {
    await drive.permissions.create({
      fileId: copy.data.id,
      requestBody: { type: 'user', role: 'reader', emailAddress: shareEmail },
    });
  }
}
