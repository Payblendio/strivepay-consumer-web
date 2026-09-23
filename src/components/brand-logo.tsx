"use client";

import Image from "next/image";
import {useTheme} from "./theme-provider";

/** Wordmark that flips with the active theme (light mark on dark surfaces). */
export function BrandLogo({
  width=148,
  height=36,
  priority=false,
  force,
  className,
}:{
  width?:number;
  height?:number;
  priority?:boolean;
  /** Pin a logo regardless of theme (e.g. always-light mark on a dark story panel). */
  force?:"light"|"dark";
  className?:string;
}){
  const {theme}=useTheme();
  const surface=force??theme;
  const src=surface==="light"?"/branding/strivepay-logo-dark.svg":"/branding/strivepay-logo-light.svg";
  return (
    <Image
      className={className}
      src={src}
      alt="StrivePay"
      width={width}
      height={height}
      priority={priority}
    />
  );
}
