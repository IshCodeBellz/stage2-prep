/* POST /api/logout */

import { redirect, clearCookies } from "./_lib/auth.js";

export async function POST() {
  return redirect("/", clearCookies());
}
