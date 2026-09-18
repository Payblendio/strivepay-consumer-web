import {NextRequest} from "next/server";
import {forwardOnboarding} from "../forward";

async function forward(request:NextRequest,context:{params:Promise<{path?:string[]}>}){
  return forwardOnboarding(request,(await context.params).path??[]);
}

export const GET=forward;
export const POST=forward;
export const PATCH=forward;
export const PUT=forward;
