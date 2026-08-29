import { router } from "../trpc";
import { beastsRouter } from "./beasts";
import { listingsRouter } from "./listings";
import { walletsRouter } from "./wallets";
import { activityRouter } from "./activity";
import { analyticsRouter } from "./analytics";

export const appRouter = router({
  beasts: beastsRouter,
  listings: listingsRouter,
  wallets: walletsRouter,
  activity: activityRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
