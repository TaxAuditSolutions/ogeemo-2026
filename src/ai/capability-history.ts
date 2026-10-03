import { ASSISTANT_DESTINATIONS, parseAssistantMessageAction, type AssistantMessageAction } from './assistant-actions';

const MASKED_DRAFT_FIELDS = new Set([
    'sin', 'workerType', 'payType', 'payRate', 'hireDate', 'startDate',
    'emergencyContactName', 'emergencyContactPhone', 'hasContract', 'specialNeeds',
]);

function describeFields(fields: Record<string, unknown>): string {
    return Object.entries(fields)
        .map(([key, value]) => `${key}=${MASKED_DRAFT_FIELDS.has(key) ? '***' : String(value)}`)
        .join(', ');
}

/** One-line record of what the client actually executed, so the model sees it next turn. */
function describeActionForHistory(action: AssistantMessageAction): string | undefined {
    switch (action.type) {
        case 'update_contact_draft':
            return `[form updated: ${describeFields(action.patch)}]`;
        case 'open_contact_form':
            return `[contact form opened with: ${describeFields(action.draft)}]`;
        case 'open_contact':
            return `[contact ${action.contactId} opened for editing${action.patch ? ` with: ${describeFields(action.patch)}` : ''}]`;
        case 'submit_contact_form':
            return `[form submit requested${action.patch ? ` with: ${describeFields(action.patch)}` : ''}]`;
        case 'dispatch':
            return action.target === ASSISTANT_DESTINATIONS.new_contact.target ? '[New Contact form opened]' : undefined;
        default:
            return undefined;
    }
}

export function buildScrubbedMessages(
    history: any[] | undefined,
    message: string,
    options: { annotateActions?: boolean } = {},
): any[] {
    const scrubbedMessages: any[] = (history || []).map(msg => {
        const rawRole = (msg.role || 'user').toLowerCase();
        const role = rawRole === 'model' || rawRole === 'assistant' || rawRole === 'bot' ? 'model' : 'user';

        let scrubbedContent: Array<{ text: string }> = [];
        if (typeof msg.content === 'string') {
            scrubbedContent = [{ text: msg.content }];
        } else if (Array.isArray(msg.content)) {
            scrubbedContent = msg.content.map((c: any) => ({ text: c.text || c.toString() }));
        } else {
            scrubbedContent = [{ text: msg.message || JSON.stringify(msg) }];
        }

        if (options.annotateActions && role === 'model') {
            const action = parseAssistantMessageAction(msg.action);
            const note = action ? describeActionForHistory(action) : undefined;
            if (note) scrubbedContent = [...scrubbedContent, { text: `\n${note}` }];
        }

        return { role, content: scrubbedContent };
    });

    // Gemini rejects request contents that do not start with a user turn
    // ("First content should be with role 'user', got model"). Truncation or
    // odd thread states can put a model turn first, so strip leading non-user
    // messages until the conversation starts with the user.
    while (scrubbedMessages.length > 0 && scrubbedMessages[0].role !== 'user') {
        scrubbedMessages.shift();
    }

    const lastMessage = scrubbedMessages[scrubbedMessages.length - 1];
    const lastText = lastMessage?.content?.map((part: any) => part.text || '').join('').trim();
    if (lastMessage?.role !== 'user' || lastText !== message.trim()) {
        scrubbedMessages.push({ role: 'user', content: [{ text: message }] });
    }
    return scrubbedMessages;
}
