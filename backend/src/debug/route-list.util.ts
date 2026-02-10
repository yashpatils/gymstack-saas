type ExpressRouteLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
};

export function getRegisteredRoutes(server: unknown): string[] {
  const router = (server as any)?._events?.request?._router;

  if (!router?.stack) {
    return [];
  }

  return (router.stack as ExpressRouteLayer[])
    .filter((layer) => layer.route)
    .map((layer) => {
      const path = layer.route!.path;
      const methods = Object.keys(layer.route!.methods)
        .filter((method) => layer.route!.methods[method])
        .map((method) => method.toUpperCase())
        .join(',');

      return `${methods} ${path}`;
    });
}
