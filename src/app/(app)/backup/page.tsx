
import { BackupManagerView } from '@/components/backup/backup-manager-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Backup Manager | Ogeemo',
  description: 'Manage your database backups and exports.',
};

export default function BackupPage() {
  return (
    <div className="h-full w-full">
      <BackupManagerView />
    </div>
  );
}
