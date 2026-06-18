export const ALL_PLUGIN_IDS = [
    "gmail",
    "googlecalendar",
    "outlook",
    "tavily",
] as const;

export type PluginId = (typeof ALL_PLUGIN_IDS)[number];

export const CONNECT_PLUGIN_IDS = ["gmail", "googlecalendar"] as const;

export type ConnectPluginId = (typeof CONNECT_PLUGIN_IDS)[number];

type ConnectPluginConfig = {
    title: string;
    description: string;
    connectPath: string;
    storageKey: string;
};

export const CONNECT_PLUGINS: Record<ConnectPluginId, ConnectPluginConfig> = {
    gmail: {
        title: "Gmail",
        description: "Read, compose, and send emails",
        connectPath: "/api/connect?plugin=gmail",
        storageKey: "connections:gmail",
    },
    googlecalendar: {
        title: "Google Calendar",
        description: "View, create, and update events",
        connectPath: "/api/connect?plugin=googlecalendar",
        storageKey: "connections:googlecalendar",
    },
};
