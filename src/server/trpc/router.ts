import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { groupsRouter } from "./routers/groups";
import { groupInvitesRouter } from "./routers/group-invites";
import { pollsRouter } from "./routers/polls";
import { fundraisingRouter } from "./routers/fundraising";
import { fundsRouter } from "./routers/funds";
import { eventsRouter } from "./routers/events";
import { postsRouter } from "./routers/posts";
import { neighborhoodsRouter } from "./routers/neighborhoods";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  groups: groupsRouter,
  groupInvites: groupInvitesRouter,
  polls: pollsRouter,
  fundraising: fundraisingRouter,
  funds: fundsRouter,
  events: eventsRouter,
  posts: postsRouter,
  neighborhoods: neighborhoodsRouter,
});

export type AppRouter = typeof appRouter;
