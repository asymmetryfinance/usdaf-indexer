// Import all event handlers - they register themselves with ponder when imported
import "./handlers/prices";
import "./handlers/stabilityPool";
import "./handlers/liquidation";
import "./handlers/convex";
import "./handlers/usdafLpBalance";
import "./handlers/afcvxLpBalance";
import "./handlers/afcvxBalance";
import "./handlers/susdafBalance";
import "./handlers/veasfLocks";
import "./handlers/dsaLpBalance";
import "./handlers/pendleLpBalances";
import "./handlers/eulerFrontierBalance";

// Re-export utility functions for use in other modules if needed
export { getStartOfDayUTC } from "./utils/dateUtils";
