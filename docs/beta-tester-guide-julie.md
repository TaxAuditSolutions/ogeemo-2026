# Ogeemo beta testing: what changed and what to try

**For:** Julie
**From:** Dan
**Code version:** `cf3d5080`. Section 6 explains when each part reaches the live site.

## 1. Why you are getting this

Recently we audited Ogeemo module by module: accounting, contacts, time and activities, documents, user permissions and the Co-Pilot. We fixed what we found and added automatic checks so it stays fixed.

We also wrote down, for each module, how Ogeemo is meant to behave. That written record is now a **knowledge base**, and the Co-Pilot reads part of it. It is also your answer key: if Ogeemo does something different from what is written here, that is worth reporting.

## 2. What to know before you start

- **Use a test workspace, not real business data.** Some of the checks below add or delete things. Start any record you create with "Zz Test" so it is easy to find and remove afterwards.
- **Your role matters.** A Viewer can read but not change anything. An Editor can create and change business records. An Admin can also manage the team. The Super Admin is the owner and cannot be changed or removed. If something is greyed out or refused, check your role before reporting it as a bug.
- **Some actions are permanent**: deleting a contact, merging two contacts, deleting a project, deleting an archive file. Ogeemo asks you to confirm each one.

## 3. What to try

Each line is something we fixed. Try it, and tell us whether the result matched.

### Contacts (Contacts Hub, `/contacts`)
| Try this | You should see |
|---|---|
| Create a contact with the same name or email as an existing one | A warning that asks whether to save anyway. It never blocks you |
| Delete a contact that has a task or invoice on it | Refused. A list shows what uses it, with an offer to merge instead. Nothing is deleted |
| Select several contacts, including one in use, and delete | All or nothing: none are deleted |
| Delete a folder that holds contacts | The contacts move up one level, to Miscellaneous if it was a top-level folder. Nothing is lost |
| Try to rename or delete a system folder (Clients, Workers, Miscellaneous...) | Not allowed |
| Search with two words, or a phone number typed any way | The contact is found |
| Merge a duplicate contact into another | Its tasks, invoices and time logs move across, then the duplicate is deleted. **This cannot be undone**, so use test contacts |

### Time and activities (Activity Manager `/event-manager`, Time Log `/reports/time-log`)
| Try this | You should see |
|---|---|
| Put a time log on an invoice, then try to delete it or change its hours, client or rate | Refused, with a message saying which thing you tried to change. Notes and title can still be edited |
| Try to delete a project that holds an invoiced activity | Refused |
| Start a timer, then move between pages | It keeps counting and shows as an indicator. It lives in your browser, so it does **not** follow you to another browser |
| Archive a task, then restore it from the File Manager | It comes back with its notes, schedule, client and time sessions, and the archive file is removed |
| Try to archive or delete a task that is on an invoice | Refused |

### Documents (`/document-manager`)
- Delete a folder that has files in it: the files move up, they are not stranded.
- The 14 protected system folders cannot be renamed, moved or deleted.
- A file link has to be a plain `http` or `https` web address. Anything else is refused.

### People and roles (Settings, Team & Authority)
| Try this | You should see |
|---|---|
| As an Admin, lower someone's role or remove them, then watch their screen | Their access ends right away, not an hour later |
| Try to change your own role | Not allowed |
| Try to give someone a role equal to or above your own | Not allowed |
| Invite a new team member | They get an email with a one-time link to set their own password |

## 4. The Co-Pilot

The Co-Pilot is the assistant in the side panel and on its own page. You must be signed in to use it. It knows who you are, which workspace you are in and your role from your sign-in, and it only ever works inside your own workspace.

### What it can do
- **Answer how-to questions** about Ogeemo, using the knowledge base. Ask "How do I add a contact?" or "Where do I find time logs?" and it should give the real steps and screen names.
- **Search** your contacts and projects by name, company, email or phone.
- **Create a task.** A to-do, or a task with a date. It works out "tomorrow" from your own clock and time zone, and asks if the time is unclear.
- **Book an appointment.** This is new. Say "book a meeting with Dana tomorrow at 3pm for 30 minutes" and it saves an appointment on your Calendar.
- **Read your calendar.** Ask "what is on tomorrow?" or "am I free at 3?" and it answers from your own calendar.
- **Add a contact.** This is new. Say "add a contact named Jane Doe, jane@acme.com" and it saves the contact straight away.

### How adding a contact should behave
| Say this | You should see |
|---|---|
| "Add a contact named Zz Test One, email zz.test1@example.com" | Added to the Miscellaneous folder (the default), and it appears in Contacts Hub |
| The same request again | **Nothing added.** It tells you a contact with that name or email exists and asks whether to add another anyway |
| "Yes, add it anyway" | Added |
| "Add Zz Test Two in Clients" | Added to Clients |
| "Add Zz Test Three in a folder called Nope" | Refused. It lists the real folders to choose from |
| "Add Zz Test Four as an employee" | It sends you to the Workers page (`/workers`). Employees and Contractors need pay and document setup, so it will not add them |
| As a **Viewer**: "add a contact" | Refused. It says an editor or administrator must do it |
| Give it a SIN or pay rate | It will not take them. Enter those yourself in Contacts Hub |

Two things to watch for: it should say "added" **only** when the contact really appears in Contacts Hub, and it should never invent a contact that is not there.

### How booking an appointment should behave
| Say this | You should see |
|---|---|
| "Book an appointment called Zz Test Meeting tomorrow at 3pm for 30 minutes" | It says it is booked, with the day and time **in your own time zone**, and it appears on your Calendar at that time |
| Ask for the same hour again, or a time that overlaps (for example 3:15pm) | **Nothing is booked.** It names what it overlaps and suggests the next free time |
| "Book it anyway" | Booked over the top |
| "Book Zz Test NoTime tomorrow" (no time of day) | It asks what time. It does not guess |
| "Book Zz Test Past yesterday at 9am" | Refused: that time has passed |
| "Book a meeting with Dana tomorrow at 2pm" (Dana is one of your contacts) | Booked, and the reply names Dana |
| "What is on my calendar tomorrow?" | Lists your events for that day, with times, and nothing else |
| As a **Viewer**: "book an appointment" | Refused. It says an editor or administrator must do it |

Things to look for: the time on your Calendar must match the time it told you (this is the most likely thing to go wrong, so check it every time), it should say "booked" **only** when the appointment really appears on the Calendar, and it must never show or book into anyone else's calendar.

### What it cannot do yet
It will tell you plainly if you ask. This is on purpose:
- It cannot read your time logs, invoices, unbilled totals or payroll. It points you to the right report instead.
- It cannot move, change, cancel or delete an existing task, event or appointment. It points you to the Calendar, where you can drag an event to move it or delete it from its three-dot menu.
- It reads only **your own** calendar, never anyone else's, and it does not invite or notify other people.
- It cannot create invoices, quotes or payroll.
- Editing an existing contact still opens the contact form for you to save.
- It cannot send emails or change settings or users.
- "Sync receipts" says Google Drive is not connected yet.

If it claims to have done one of these, that is a bug. Please report it.

## 5. How to report what you find

Please send one report per problem, with:
1. **What you did**, step by step, and which screen you were on.
2. **What you expected** to happen.
3. **What happened instead**, with a screenshot if you can.
4. **Your role and workspace**, and the time it happened.
5. For the Co-Pilot, the **exact words** you typed and the **exact reply**.

Use the **Feedback** screen in Ogeemo (`/feedback`) or message me directly. A bug that blocks you from working is more urgent than wording or layout, so please mark those.

## 6. Known limits, and when the new version arrives

- **The Co-Pilot's add-a-contact and appointment features are ready in the code but only reach the live site when I start the update.** I will tell you when it is live. Until then the Co-Pilot may still work the older way, walking you through the contact form, and the "how adding a contact should behave" and "how booking an appointment should behave" tables above will not match. Ask me which version you are on before you start that part.
- The Co-Pilot answers from a short set of reference files. If it gives a vague or wrong how-to answer, report it with the question you asked. That tells us which entry to improve.
- Ogeemo does not upload files into the Document Manager. It registers links to files that already live in Google Drive.
- The Co-Pilot and Knowledge Base are limited to about 30 messages a minute per person. If you hit it, wait a few seconds.

Thank you for testing. The more specific your reports are, the faster we can fix things.
