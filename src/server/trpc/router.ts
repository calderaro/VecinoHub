import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { groupsRouter } from "./routers/groups";
import { pollsRouter } from "./routers/polls";
import { fundraisingRouter } from "./routers/fundraising";
import { eventsRouter } from "./routers/events";
import { postsRouter } from "./routers/posts";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  groups: groupsRouter,
  polls: pollsRouter,
  fundraising: fundraisingRouter,
  events: eventsRouter,
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;
