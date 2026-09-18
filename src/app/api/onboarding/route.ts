import {NextRequest} from "next/server";
import {forwardOnboarding} from "./forward";

export async function GET(request:NextRequest){
  return forwardOnboarding(request);
}
