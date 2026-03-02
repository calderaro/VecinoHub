export type ServiceUser = {
  id: string;
  role: "user" | "admin" | "platform_admin";
  activeNeighborhoodId?: string | null;
};

export type ServiceContext = {
  user: ServiceUser;
};
