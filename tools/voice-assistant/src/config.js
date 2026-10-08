export const BUSINESSES = {
  unidoxia: {
    name: "UniDoxia",
    baseUrl: process.env.UNIDOXIA_BASE_URL || "https://unidoxia.com",
    routes: {
      adminHome: "/admin/overview",
      students: "/admin/students",
      applications: "/dashboard/applications",
      notifications: "/admin/notifications",
      messages: "/admin/chat",
    },
  },
};

export const RISK = {
  GREEN: "green",
  AMBER: "amber",
  RED: "red",
};

export const APPROVED_COMMANDS = {
  open_admin_home: {
    business: "unidoxia",
    risk: RISK.GREEN,
    phrases: ["open unidoxia", "open unidoxia admin", "show unidoxia dashboard"],
    action: { type: "navigate", route: "adminHome" },
  },
  show_students: {
    business: "unidoxia",
    risk: RISK.GREEN,
    phrases: ["show students", "open students", "show unidoxia students"],
    action: { type: "navigate", route: "students" },
  },
  show_applications: {
    business: "unidoxia",
    risk: RISK.GREEN,
    phrases: ["show applications", "open applications", "check new student applications"],
    action: { type: "navigate", route: "applications" },
  },
  show_notifications: {
    business: "unidoxia",
    risk: RISK.GREEN,
    phrases: ["show notifications", "open notifications"],
    action: { type: "navigate", route: "notifications" },
  },
  type_text: {
    business: "unidoxia",
    risk: RISK.AMBER,
    phrases: ["type", "enter", "write"],
    action: { type: "type" },
  },
  send_or_submit: {
    business: "unidoxia",
    risk: RISK.RED,
    phrases: ["send", "submit", "approve", "reject", "delete", "pay", "publish"],
    action: { type: "destructive" },
    requiresConfirmation: true,
  },
};

export function routeUrl(commandKey) {
  const command = APPROVED_COMMANDS[commandKey];
  if (!command || command.action.type !== "navigate") return null;
  const business = BUSINESSES[command.business];
  return new URL(business.routes[command.action.route], business.baseUrl).toString();
}

export function requiresConfirmation(commandKey) {
  return APPROVED_COMMANDS[commandKey]?.risk === RISK.RED;
}
