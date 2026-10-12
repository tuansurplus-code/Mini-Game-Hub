"use client";

import { useEffect } from "react";

const GTM_CONTAINER_PATTERN = /^GTM-[A-Z0-9]+$/;

export default function CustomerCampaignTagManager({ containerId }: { containerId: string }) {
  useEffect(() => {
    if (!GTM_CONTAINER_PATTERN.test(containerId)) return;
    if (document.querySelector(`script[data-campaign-gtm="${containerId}"]`)) return;

    const browserWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> };
    browserWindow.dataLayer = browserWindow.dataLayer ?? [];
    browserWindow.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    const script = document.createElement("script");
    script.async = true;
    script.dataset.campaignGtm = containerId;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    document.head.appendChild(script);
  }, [containerId]);

  return null;
}
