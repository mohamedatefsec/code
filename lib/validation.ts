export const attendanceSessionUpdateSchema = z.object({
  sessionDate: z.string().min(1, "اختر تاريخ"), // "YYYY-MM-DD"
  sessionLabel: z.string().max(80).optional().nullable(),
});
