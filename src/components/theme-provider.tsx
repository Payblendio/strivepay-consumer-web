"use client";

import {createContext,useCallback,useContext,useEffect,useMemo,useSyncExternalStore,type ReactNode} from "react";
import {applyTheme,DEFAULT_THEME,persistTheme,readStoredTheme,type AppTheme} from "@/lib/theme";

type ThemeContextValue={
  theme:AppTheme;
  setTheme:(theme:AppTheme)=>void;
  toggleTheme:()=>void;
};

const ThemeContext=createContext<ThemeContextValue|null>(null);

function subscribeTheme(listener:()=>void){
  window.addEventListener("storage",listener);
  window.addEventListener("strivepay-theme",listener);
  return()=>{
    window.removeEventListener("storage",listener);
    window.removeEventListener("strivepay-theme",listener);
  };
}

function getThemeSnapshot(){
  return document.documentElement.getAttribute("data-theme")==="light"?"light":"dark";
}

function getServerSnapshot():AppTheme{
  return DEFAULT_THEME;
}

export function ThemeProvider({children}:{children:ReactNode}){
  const theme=useSyncExternalStore(subscribeTheme,getThemeSnapshot,getServerSnapshot);

  useEffect(()=>{
    applyTheme(readStoredTheme());
  },[]);

  const setTheme=useCallback((next:AppTheme)=>{
    applyTheme(next);
    persistTheme(next);
    window.dispatchEvent(new Event("strivepay-theme"));
  },[]);

  const toggleTheme=useCallback(()=>{
    setTheme(theme==="dark"?"light":"dark");
  },[setTheme,theme]);

  const value=useMemo(()=>({theme,setTheme,toggleTheme}),[theme,setTheme,toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(){
  const context=useContext(ThemeContext);
  if(!context)throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
