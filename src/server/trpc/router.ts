import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { groupsRouter } from "./routers/groups";
import { pollsRouter } from "./routers/polls";
import { paymentsRouter } from "./routers/payments";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  groups: groupsRouter,
  polls: pollsRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;
