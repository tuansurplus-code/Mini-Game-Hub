import HomepageManager from "./HomepageManager";
import { requirePlatformAdmin } from "../../../lib/platform-auth";

export default async function Page() {
  await requirePlatformAdmin();
  return <HomepageManager />;
}
