import { z } from "zod";

const FieldsSchema = z.object({
  mainTitle: z.string().default("PROPOSAL"),
  subOne: z.string().default("Confidential"),
  subTwo: z.string().default("Finance Memorandum"),
  headline: z.string().default("Construction Finance"),
  projectName: z.string().default("Project Name Here"),
  loanAmount: z.string().default("$0"),
  dateText: z.string().default("13 January 2026"),
  referenceNumber: z.string().default("REF-0001"),
  companyLine: z.string().default("Company Details Line"),
  footerLine: z.string().default("Confidential — For intended recipient only")
}).passthrough();

export function validateFields(raw) {
  return FieldsSchema.parse(raw || {});
}
