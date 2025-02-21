// @refresh skip
// TODO rename to lazyRoute.ts?
/// <reference types="vinxi/types/client" />
import { createComponent, lazy, onCleanup, type Component, type JSX } from "solid-js";
import { appendStyles, cleanupStyles, preloadStyles, updateStyles } from "vinxi/css";

import { renderAsset } from "../server/renderAsset";
import { Asset } from "../server/types";

export default function lazyRoute<T>(component: any, clientManifest: any, serverManifest: any, exported = "default") {
  return lazy(async () => {
    if (import.meta.env.DEV) {
      let manifest = import.meta.env.SSR ? serverManifest : clientManifest;

      const mod = await manifest.inputs[component.src].import();
      if (!mod[exported]) console.error(`Module ${component.src} does not export ${exported}`);
      const Component = mod[exported];
      let assets = await clientManifest.inputs?.[component.src].assets();
      const styles = assets.filter((asset: Asset) => asset.tag === "style");

      if (typeof window !== "undefined" && import.meta.hot) {
        import.meta.hot.on("css-update", data => {
          updateStyles(styles, data);
        });
      }

      const Comp: Component<T> = props => {
        if (typeof window !== "undefined") {
          appendStyles(styles);
        }

        onCleanup(() => {
          if (typeof window !== "undefined") {
            // remove style tags added by vite when a CSS file is imported
            cleanupStyles(styles);
          }
        });
        return [...assets.map((asset: Asset) => renderAsset(asset)), createComponent(Component, props)];
      };
      return { default: Comp };
    } else {
      const mod = await component.import();
      const Component = mod[exported];
      let assets = await clientManifest.inputs?.[component.src].assets();
      const styles = assets.filter(
        (asset: Asset) => asset.tag === "style" || (asset.attrs as JSX.LinkHTMLAttributes<HTMLLinkElement>).rel === "stylesheet"
      );
      if (typeof window !== "undefined") {
        preloadStyles(styles);
      }
      const Comp: Component<T> = props => {
        return [...styles.map((asset: Asset) => renderAsset(asset)), createComponent(Component, props)];
      };
      return { default: Comp };
    }
  });
}
