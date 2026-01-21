import { getSession } from "../auth";

export async function createTRPCContext() {
  const session = await getSession();

  return { session };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
