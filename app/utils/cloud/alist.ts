import { SyncStore } from "@/app/store/sync";

export type AListConfig = SyncStore["alist"];
export type AListClient = ReturnType<typeof createAListClient>;

let cacheToken = "";

export function createAListClient(store: SyncStore) {
  const fileName = "backup.json";
  const config = store.alist;

  return {
    async check() {
      try {
        const res = await fetch(this.path("/api/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: config.username,
            password: config.password,
          }),
        });
        console.log("[AList] check", res.status, res.statusText);
        const json = await res.json();
        cacheToken = json.data.token;
        return [201, 200, 404, 301, 302, 307, 308].includes(res.status);
      } catch (e) {
        console.error("[AList] failed to check", e);
        cacheToken = "";
      }

      return false;
    },

    async get(key: string) {
      const uri = new URL(config.endpoint);
      const path = "/p" + uri.pathname + "/" + fileName;
      const res = await fetch(this.path(path), {
        method: "GET",
      });

      console.log("[AList] get key = ", key, res.status, res.statusText);

      return await res.text();
    },

    async set(key: string, value: string) {
      if (!cacheToken) {
        if (!(await this.check())) {
          console.log("[AList] failed to set cause check failed");
          return;
        }
      }

      const res = await fetch(this.path("/api/fs/put"), {
        method: "PUT",
        headers: {
          Authorization: cacheToken,
          "Content-Type": "application/json",
          "File-Path": new URL(config.endpoint).pathname + "/" + fileName,
        },
        body: value,
        redirect: "follow",
      });

      console.log("[AList] set key = ", key, res.status, res.statusText);
    },

    path(path: string) {
      let url = new URL(config.endpoint).origin;

      if (!url.endsWith("/")) {
        url += "/";
      }

      if (path.startsWith("/")) {
        path = path.slice(1);
      }

      return url + path;
    },
  };
}
