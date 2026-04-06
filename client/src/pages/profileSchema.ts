import { z } from "zod";
import { updateUserProfileSchema } from "@shared/schema";

export const profileFormSchema = updateUserProfileSchema.extend({
  currentWeight: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? null : val,
    z.coerce.number({ invalid_type_error: "Must be a valid number" }).nullable().optional()
  ),
  targetWeight: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? null : val,
    z.coerce.number({ invalid_type_error: "Must be a valid number" }).nullable().optional()
  ),
  height: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? null : val,
    z.coerce.number({ invalid_type_error: "Must be a valid number" }).nullable().optional()
  ),
});

export type ProfileFormData = z.infer<typeof updateUserProfileSchema>;
