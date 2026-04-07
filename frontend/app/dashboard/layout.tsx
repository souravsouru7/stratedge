import { constructNoIndexMeta } from "../../config/seo";

export const metadata = constructNoIndexMeta("Dashboard");

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
