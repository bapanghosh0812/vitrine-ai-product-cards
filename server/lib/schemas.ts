import { z } from 'zod';
import {
  CATEGORY_IDS,
  CURRENCIES,
  LANGUAGE_IDS,
  LIMITS,
  TONE_IDS,
} from '../../shared/constants';
import { cleanMultiline, cleanText } from './sanitize';

/** A trimmed, sanitised single-line string with length bounds. */
const line = (max: number, min = 0) =>
  z
    .string()
    .max(max * 2) // raw cap before cleaning, protects the regexes below
    .transform((v) => cleanText(v))
    .pipe(z.string().min(min).max(max));

/** Multi-line text (keeps line breaks), sanitised, with length bounds. */
const multiline = (max: number, min = 0) =>
  z
    .string()
    .max(max * 2)
    .transform((v) => cleanMultiline(v))
    .pipe(z.string().min(min).max(max));

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const brandKitSchema = z
  .object({
    brandName: line(LIMITS.brandNameMax).optional(),
    voice: line(LIMITS.brandVoiceMax).optional(),
    avoid: line(LIMITS.brandAvoidMax).optional(),
    colours: z.array(hex).max(LIMITS.brandColoursMax).optional(),
  })
  .strict();

export const productCopySchema = z
  .object({
    title: z.string().min(3).max(LIMITS.titleMax),
    description: z.string().min(LIMITS.descriptionMin).max(LIMITS.descriptionMax),
    keywords: z
      .array(z.string().min(2).max(LIMITS.keywordMax))
      .min(LIMITS.keywordsMin)
      .max(LIMITS.keywordsMax),
  })
  .strict();

/** Looser shape for the "current" card a user sends back for single-field regeneration. */
const currentCopySchema = z
  .object({
    title: line(LIMITS.titleMax),
    description: line(LIMITS.descriptionMax),
    keywords: z.array(line(LIMITS.keywordMax)).max(LIMITS.keywordsMax),
  })
  .strict();

export const generateRequestSchema = z
  .object({
    name: line(LIMITS.nameMax, LIMITS.nameMin),
    category: z.enum(CATEGORY_IDS as [string, ...string[]]),
    audience: line(LIMITS.audienceMax).optional(),
    tone: z.enum(TONE_IDS as [string, ...string[]]).optional(),
    features: z.array(line(LIMITS.featureMax)).max(LIMITS.featuresMaxCount).optional(),
    brief: multiline(LIMITS.briefMax).optional(),
    price: z
      .string()
      .max(LIMITS.priceMax)
      .regex(/^\d{1,9}(\.\d{1,2})?$/, 'Price must be a number')
      .optional()
      .or(z.literal('')),
    currency: z.enum(CURRENCIES).optional(),
    language: z.enum(LANGUAGE_IDS as [string, ...string[]]).optional(),
    variations: z.union([z.literal(1), z.literal(3)]).optional(),
    field: z.enum(['title', 'description', 'keywords']).optional(),
    current: currentCopySchema.optional(),
    instruction: multiline(LIMITS.instructionMax, 3).optional(),
    brandKit: brandKitSchema.optional(),
    creativity: z.enum(['precise', 'balanced', 'creative']).optional(),
    provider: z.enum(['auto', 'groq', 'gemini']).optional(),
  })
  .strict()
  .refine((v) => !v.field || !!v.current, { message: 'current copy is required when regenerating a field', path: ['current'] })
  .refine((v) => !v.instruction || !!v.current, { message: 'current copy is required when refining', path: ['current'] })
  .refine((v) => !(v.instruction && v.field), { message: 'send either field or instruction, not both', path: ['instruction'] });

export type GenerateInput = z.infer<typeof generateRequestSchema>;

export const supportRequestSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().min(1).max(LIMITS.supportMessageMax * 3),
          })
          .strict(),
      )
      .min(1)
      .max(LIMITS.supportHistoryMax * 2),
    page: z.string().max(80).regex(/^\/[a-z0-9\-/]*$/i).optional(),
  })
  .strict()
  .refine((v) => v.messages[v.messages.length - 1]?.role === 'user', { message: 'last message must be from the user' })
  .refine((v) => (v.messages[v.messages.length - 1]?.content.length ?? 0) <= LIMITS.supportMessageMax, {
    message: `message must be at most ${LIMITS.supportMessageMax} characters`,
  });

export type SupportInput = z.infer<typeof supportRequestSchema>;


export const ticketRequestSchema = z
  .object({
    name: line(LIMITS.ticketNameMax, 2),
    /** Required for guests; signed-in users always use the verified email from their token. */
    email: z.string().trim().toLowerCase().max(120).email().optional(),
    phone: z
      .string()
      .trim()
      .max(LIMITS.ticketPhoneMax)
      .regex(/^\+?[0-9][0-9 ()-]{6,18}$/, 'Phone must be digits, spaces, +, ( ) or -')
      .optional()
      .or(z.literal('')),
    subject: line(LIMITS.ticketSubjectMax, 3),
    message: multiline(LIMITS.ticketMessageMax, 10),
    transcript: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1_200).transform((v) => cleanMultiline(v).slice(0, 600)) }).strict())
      .max(8)
      .optional(),
    page: z.string().max(80).regex(/^\/[a-z0-9\-/]*$/i).optional(),
    /** Honeypot: real users never see or fill this field. */
    website: z.string().max(200).optional(),
  })
  .strict();

export type TicketInput = z.infer<typeof ticketRequestSchema>;
