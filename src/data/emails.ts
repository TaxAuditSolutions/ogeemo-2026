
export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  text: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'archive' | 'trash';
}

export const mockEmails: Email[] = [
  {
    id: '2',
    from: 'John Doe',
    fromEmail: 'john.doe@example.com',
    subject: 'Project Phoenix - Weekly Update',
    text: `<p>Hello team,</p><p>Here is the weekly update for Project Phoenix. We have made significant progress on the frontend components and are on track to meet our Q3 goals.</p><p>Please review the attached documents and provide your feedback by EOD Friday.</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    starred: false,
    folder: 'inbox',
  },
  {
    id: '3',
    from: 'Jane Smith',
    fromEmail: 'jane.smith@designco.com',
    subject: 'New Design Mockups for Review',
    text: `<p>Hi team,</p><p>I've attached the latest design mockups for the new dashboard. I'm really excited about the direction this is heading. Looking forward to your thoughts!</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    read: false,
    starred: true,
    folder: 'inbox',
  },
  {
    id: '4',
    from: 'Cloud Services',
    fromEmail: 'no-reply@cloud.com',
    subject: 'Your monthly invoice is ready',
    text: `<p>Your invoice for the month of May is now available. Total amount due: $42.50.</p><p>Thank you for using our services.</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    read: true,
    starred: false,
    folder: 'inbox',
  },
  {
    id: 'sent-1',
    from: 'You',
    fromEmail: 'you@ogeemo.com',
    subject: 'Re: Project Phoenix - Weekly Update',
    text: `<p>Thanks John, looks great.</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    read: true,
    starred: false,
    folder: 'sent',
  },
  {
    id: 'archive-1',
    from: 'Old Project Newsletter',
    fromEmail: 'newsletter@archive.com',
    subject: 'Final project report',
    text: `<p>This project is now archived.</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    read: true,
    starred: false,
    folder: 'archive',
  },
  {
    id: 'trash-1',
    from: 'Spam Co',
    fromEmail: 'spam@spam.com',
    subject: 'You have won!',
    text: `<p>Click here to claim your prize!</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: true,
    starred: false,
    folder: 'trash',
  },
];
