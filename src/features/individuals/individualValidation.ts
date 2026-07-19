import { z } from "zod";

const datePrecisionSchema = z.enum(["day", "month", "year", "unknown"]);

export const individualFormSchema = z.object({
  fullName: z.string().trim().min(1, "Họ tên là bắt buộc"),
  alias: z.string().trim().max(200).optional(),
  gender: z.enum(["male", "female", "unknown"]),
  birthDatePrecision: datePrecisionSchema,
  birthDateValue: z.string().optional(),
  isDeceased: z.boolean(),
  deathDatePrecision: datePrecisionSchema,
  deathDateValue: z.string().optional(),
  notes: z.string().max(100, "Ghi chú tối đa 100 ký tự").optional(),
  siblingOrder: z
    .string()
    .optional()
    .refine(
      (value) => !value || (/^\d+$/.test(value) && Number(value) >= 2),
      "Số thứ tự phải từ 2 trở đi (theo cách gọi người Việt, không có thứ nhất)",
    ),
});

export type IndividualFormValues = z.infer<typeof individualFormSchema>;
