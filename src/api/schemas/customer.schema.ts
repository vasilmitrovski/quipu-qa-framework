import { z } from 'zod';

export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
});

export const CustomerSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: AddressSchema,
  phoneNumber: z.string(),
  ssn: z.string(),
});

export type Customer = z.infer<typeof CustomerSchema>;
