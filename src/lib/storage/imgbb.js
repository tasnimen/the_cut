import "server-only";

function trustedDeleteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_provider_delete_url");
  }
  if (url.protocol !== "https:" || url.hostname !== "ibb.co" || !/^\/[A-Za-z0-9]+\/[A-Fa-f0-9]{32}$/.test(url.pathname) || url.search || url.hash) {
    throw new Error("invalid_provider_delete_url");
  }
  return url;
}

function safeImageUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "i.ibb.co" || url.username || url.password) {
    throw new Error("invalid_provider_image_url");
  }
  return url.toString();
}

async function requestWithRetry(fetchImpl, url, init) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(15000) });
      if (response.status < 500 || attempt === 2) return response;
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
  }
  throw new Error("imgbb_request_failed");
}

export function createImgBBStorage({ apiKey, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("missing_imgbb_api_key");

  return Object.freeze({
    async upload({ bytes, filename, mimeType = "image/webp" }) {
      const url = new URL("https://api.imgbb.com/1/upload");
      url.searchParams.set("key", apiKey);
      const payload = new FormData();
      payload.append("image", new Blob([bytes], { type: mimeType }), filename);
      payload.append("name", filename.replace(/\.[a-z0-9]+$/i, ""));
      const response = await requestWithRetry(fetchImpl, url, { method: "POST", body: payload, redirect: "error" });
      if (!response.ok) throw new Error("imgbb_upload_failed");
      const result = await response.json();
      if (!result?.success || !result?.data?.image?.url) throw new Error("imgbb_upload_failed");
      return Object.freeze({
        url: safeImageUrl(result.data.image.url),
        displayUrl: safeImageUrl(result.data.display_url || result.data.image.url),
        thumbUrl: safeImageUrl(result.data.thumb?.url || result.data.display_url || result.data.image.url),
        deleteUrl: trustedDeleteUrl(result.data.delete_url).toString(),
        width: Number(result.data.width),
        height: Number(result.data.height),
      });
    },

    async delete({ deleteUrl }) {
      const url = trustedDeleteUrl(deleteUrl);
      const response = await requestWithRetry(fetchImpl, url, { method: "GET", redirect: "error" });
      if (!response.ok) throw new Error("imgbb_delete_failed");
      return true;
    },
  });
}
