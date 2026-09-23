"use client";

import {IconMoon,IconSun} from "@tabler/icons-react";
import {useTheme} from "./theme-provider";

export function ThemeToggle({className="",placement="header"}:{className?:string;placement?:"header"|"access"}){
  const {theme,toggleTheme}=useTheme();
  const next=theme==="dark"?"light":"dark";
  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle-${placement}${className?` ${className}`:""}`}
      onClick={toggleTheme}
      aria-label={next==="light"?"Switch to light mode":"Switch to dark mode"}
      title={next==="light"?"Light mode":"Dark mode"}
    >
      {theme==="dark"?<IconSun size={20} stroke={1.75} aria-hidden="true"/>:<IconMoon size={20} stroke={1.75} aria-hidden="true"/>}
    </button>
  );
}
