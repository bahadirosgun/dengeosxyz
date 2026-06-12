import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SignupInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(6).max(128),
});

export const createConfirmedUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignupInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already") ||
        error.message.toLowerCase().includes("registered")
      ) {
        throw new Error("Bu e-posta zaten kayıtlı. Giriş yapmayı dene.");
      }
      throw error;
    }

    return { ok: true };
  });
