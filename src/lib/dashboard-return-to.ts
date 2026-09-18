import {safeReturnTo} from "./auth-access";

export const DASHBOARD_RETURN_TO_HEADER="x-strivepay-dashboard-return-to";

/** Defense in depth: only dashboard destinations may come from the proxy header. */
export function dashboardReturnTo(value:string|null|undefined,fallback="/dashboard"){
  const candidate=safeReturnTo(value??undefined);
  const pathname=new URL(candidate,"https://return.invalid").pathname;
  return value&&candidate===value&&(pathname==="/dashboard"||pathname.startsWith("/dashboard/"))?candidate:safeReturnTo(fallback);
}
