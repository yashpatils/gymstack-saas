export type AppSearchParams = Record<string, string | string[] | undefined>;

export type SlugPageProps = {
  params: { slug: string };
  searchParams?: AppSearchParams;
};

export type HostPageProps = {
  params: { host: string };
  searchParams?: AppSearchParams;
};
