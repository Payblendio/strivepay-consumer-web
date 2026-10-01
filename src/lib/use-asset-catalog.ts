"use client";

import {useEffect,useState} from "react";
import {assetCatalogSnapshot,loadAssetCatalog,subscribeAssetCatalog,type CatalogAsset} from "./asset-catalog";

export function useAssetCatalog():CatalogAsset[]{
  const [assets,setAssets]=useState<CatalogAsset[]>(assetCatalogSnapshot);
  useEffect(()=>{
    const unsubscribe=subscribeAssetCatalog(setAssets);
    void loadAssetCatalog();
    return unsubscribe;
  },[]);
  return assets;
}
