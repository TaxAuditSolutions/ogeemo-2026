import { z } from "zod";

export const STRONG_PASSWORD_HELP_TEXT =
    "Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character.";

export const strongPasswordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number.")
    .regex(/[^A-Za-z0-9\s]/, "Password must include a special character.");

export const passwordConfirmationSchema = z
    .object({
        password: strongPasswordSchema,
        confirmPassword: z.string().min(1, "Please confirm your password."),
    })
    .refine((values) => values.password === values.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });