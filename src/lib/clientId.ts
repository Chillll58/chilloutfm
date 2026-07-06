export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("chillout_client_id");
  if (!id) {
    id =
      "c_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);
    localStorage.setItem("chillout_client_id", id);
  }
  return id;
}
