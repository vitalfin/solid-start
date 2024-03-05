import { createRouter } from "radix3";
import fileRoutes from "vinxi/routes";

interface Route {
  path: string;
  id: string;
  children?: Route[];
  $component?: any;
  $GET?: any;
  $POST?: any;
  $PUT?: any;
  $PATCH?: any;
  $DELETE?: any;
}

declare module "vinxi/routes" {
  export interface Register {
    route: {
      path: string;
      children?: Route[];
    };
  }
}

export const pageRoutes = defineRoutes(
  (fileRoutes as unknown as Route[]).filter(o => o.$component)
);

function defineRoutes(fileRoutes: Route[]) {
  function processRoute(routes: Route[], route: Route, id: string, full: string) {
    const parentRoute = Object.values(routes).find(o => {
      return id.startsWith(o.id + "/");
    });

    if (!parentRoute) {
      routes.push({ ...route, id, path: id.replace(/\/\([^)/]+\)/g, "") });
      return routes;
    }
    processRoute(
      parentRoute.children || (parentRoute.children = []),
      route,
      id.slice(parentRoute.id.length),
      full
    );

    return routes;
  }

  return fileRoutes
    .sort((a, b) => a.path.length - b.path.length)
    .reduce((prevRoutes: Route[], route) => {
      return processRoute(prevRoutes, route, route.path, route.path);
    }, []);
}

export function matchAPIRoute(path: string, method: string) {
  const match = router.lookup(path);
  if (match) {
    const handler = match.route[`$${method}`];
    if (handler === undefined) return;
    return {
      handler,
      params: match.params
    };
  }
}

function containsHTTP(route: Route) {
  return route["$GET"] || route["$POST"] || route["$PUT"] || route["$PATCH"] || route["$DELETE"];
}

const router = createRouter({
  routes: (fileRoutes as unknown as Route[]).reduce((memo, route) => {
    if (!containsHTTP(route)) return memo;
    let path = route.path.replace(/\(.*\)\/?/g, "").replace(/\*([^/]*)/g, (_, m) => `**:${m}`);
    if (/:[^/]*\?/g.test(path)) {
      throw new Error(`Optional parameters are not supported in API routes: ${path}`);
    }
    if (memo[path]) {
      throw new Error(
        `Duplicate API routes for "${path}" found at "${memo[path]!.route.path}" and "${route.path}"`
      );
    }
    memo[path] = { route };
    return memo;
  }, {} as Record<string, { route: Route }>)
});
