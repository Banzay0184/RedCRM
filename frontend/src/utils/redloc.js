// Переход в REDLOC (каталог локаций). Общий бэкенд и JWT с RedCRM,
// поэтому изнутри передаём токен в hash — REDLOC откроется уже с входом.
export const REDLOC_URL = (import.meta.env.VITE_REDLOC_URL || "https://redloc-nine.vercel.app").replace(/\/$/, "");

export const redlocLoginUrl = () => `${REDLOC_URL}/login`;

export const openRedloc = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const url = token ? `${REDLOC_URL}/login#sso=${encodeURIComponent(token)}` : redlocLoginUrl();
    window.open(url, "_blank", "noopener");
};
