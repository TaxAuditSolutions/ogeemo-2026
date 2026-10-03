# Contact Management

Ogeemo Co-Pilot can either explain contact creation or assist the user by preparing the existing contact form.

## Contacts Hub Operations

Contacts Hub is the home for people and organizations. From the hub the user can browse contacts, filter them by folder, search for a record, open a contact to view or edit it, and create a new contact with **New Contact**.

Contact folders act as categories. Selecting a folder filters the list, and every new contact is filed into one folder.

**New Contact** is the correct function whenever the user wants to add someone who is not already in the system. Co-Pilot never navigates on the user's behalf. It explains the step and offers a clickable control, such as **New Contact** or **Contacts Hub**, that the user chooses to click.

## Instructions

To create a contact manually, open Contacts Hub, select the appropriate contact folder, choose **New Contact**, complete the form, and submit it. Creating contacts requires Editor, Organization Administrator, or Super Administrator access.

## Updating Existing Contacts

To update or add an email address (or other profile details) to an existing contact manually:
1. Open **Contacts Hub** from the navigation menu (`/contacts`).
2. Search or browse the contact directory table and locate the target contact record.
3. Click the contact row or click the action menu to select **Edit Contact** to open the contact form.
4. In the **Core Profile** section, locate the **Email Identity** field and enter or update the email address.
5. Review any other details and click **Save Changes** at the bottom of the form to commit the update.

Editing existing contacts requires Editor, Organization Administrator, or Super Administrator access.

## Assisted Creation & Editing

When the user requests assistance with creating or editing a contact:
- For creation, Co-Pilot gathers the minimum required information (full name and category folder), opens the form with pre-filled details, and creates the contact directly once the details are ready, sending feedback that the contact has been created. It does not pause to ask for confirmation.
- For editing (such as adding or updating an email address, phone number, or company name), Co-Pilot identifies the existing contact in the directory, opens the record for editing, prompts for any missing field values if not already provided, updates the form, and saves the changes directly, confirming that the update has been performed. It does not pause to ask for confirmation.
- The user can choose either step-by-step instructions or direct AI assistance. When direct assistance is selected, Co-Pilot performs the workflow seamlessly.

Before preparing a new contact, Co-Pilot checks for likely existing contacts by name or email. If it finds a likely match, it offers to open that record or continue with a new contact. It does not prepare a duplicate until the user explicitly chooses to continue.

Co-Pilot opens the contact form with the gathered information. The contact is not created until the user reviews the form and selects **Create Identity**. Closing or cancelling the form creates nothing.

## Confidential Information

Assistant chat history is saved. Before requesting or accepting confidential HR or payroll information such as a SIN, pay rate, employment dates, or emergency-contact information, Co-Pilot warns the user that the information will be retained in chat history and obtains explicit consent. Without consent, these fields remain blank for direct entry in the form.

Co-Pilot never chooses tenant identifiers, audit metadata, document-folder identifiers, or other server-controlled contact fields.