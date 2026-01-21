import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/better-auth";

const handler = toNextJsHandler(auth);

export const { GET, POST, PUT, PATCH, DELETE } = handler;
