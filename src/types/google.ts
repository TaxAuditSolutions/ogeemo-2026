
import { z } from 'zod';

// Schema for the parts of a Google Contact we care about
export const GoogleContactSchema = z.object({
  resourceName: z.string(),
  names: z
    .array(
      z.object({
        displayName: z.string().optional(),
      })
    )
    .optional(),
  emailAddresses: z
    .array(
      z.object({
        value: z.string().optional(),
      })
    )
    .optional(),
  phoneNumbers: z
    .array(
      z.object({
        value: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .optional(),
});
export type GoogleContact = z.infer<typeof GoogleContactSchema>;

export const GetGoogleContactsOutputSchema = z.object({
  contacts: z.array(GoogleContactSchema),
});
export type GetGoogleContactsOutput = z.infer<
  typeof GetGoogleContactsOutputSchema
>;
