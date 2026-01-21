export type ServiceUser = {
  id: string;
  role: "user" | "admin";
};

export type ServiceContext = {
  user: ServiceUser;
};
