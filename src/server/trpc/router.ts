import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { groupsRouter } from "./routers/groups";
import { groupAccessRequestsRouter } from "./routers/group-access-requests";
import { groupInvitesRouter } from "./routers/group-invites";
import { pollsRouter } from "./routers/polls";
import { fundraisingRouter } from "./routers/fundraising";
import { fundsRouter } from "./routers/funds";
import { eventsRouter } from "./routers/events";
import { postsRouter } from "./routers/posts";
import { neighborhoodsRouter } from "./routers/neighborhoods";
import { resourcesRouter } from "./routers/resources";
import { helpRouter } from "./routers/help";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  groups: groupsRouter,
  groupAccessRequests: groupAccessRequestsRouter,
  groupInvites: groupInvitesRouter,
  polls: pollsRouter,
  fundraising: fundraisingRouter,
  funds: fundsRouter,
  events: eventsRouter,
  posts: postsRouter,
  resources: resourcesRouter,
  neighborhoods: neighborhoodsRouter,
  help: helpRouter,
});

export type AppRouter = typeof appRouter;
